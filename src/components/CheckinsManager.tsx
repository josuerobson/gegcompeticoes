import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock, MapPin, Search, Calendar, User, ShieldCheck, AlertTriangle,
  CheckCircle2, LogOut, Trash2, RefreshCw, Filter, Eye, X, Loader2,
  ChevronLeft, ChevronRight, Navigation
} from 'lucide-react';
import { User as UserType, Club, ClubCheckin } from '../types';

interface CheckinsManagerProps {
  currentUser: UserType | null;
  clubs: Club[];
}

export default function CheckinsManager({ currentUser, clubs }: CheckinsManagerProps) {
  // Filters State
  const [athleteQuery, setAthleteQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [openOnly, setOpenOnly] = useState(false);
  const [selectedClubId, setSelectedClubId] = useState(
    currentUser?.role === 'master_admin' || currentUser?.role === 'admin' ? '' : (currentUser?.clubId || '')
  );

  // Data State
  const [checkins, setCheckins] = useState<ClubCheckin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Manual Checkout Modal
  const [checkoutTarget, setCheckoutTarget] = useState<ClubCheckin | null>(null);
  const [checkoutDateTime, setCheckoutDateTime] = useState('');
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [savingCheckout, setSavingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  // Photo Zoom Modal
  const [photoModalTarget, setPhotoModalTarget] = useState<ClubCheckin | null>(null);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Helper to format ISO to datetime-local
  const toLocalDatetimeInput = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  // Helper to format minutes to "Xh Ym"
  const formatDuration = (minutes?: number) => {
    if (minutes == null || minutes < 0) return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} min`;
    return `${h}h ${m}m`;
  };

  // Calculate live elapsed minutes for open check-ins
  const calculateLiveDuration = (checkinAtStr: string) => {
    const diffMs = Date.now() - new Date(checkinAtStr).getTime();
    const mins = Math.max(0, Math.floor(diffMs / 60000));
    return formatDuration(mins);
  };

  // Load checkins
  const fetchCheckins = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (athleteQuery.trim()) params.append('athleteQuery', athleteQuery.trim());
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (openOnly) params.append('isOpen', 'true');
      if (selectedClubId) params.append('clubId', selectedClubId);

      const res = await fetch(`/api/checkins?${params.toString()}`, {
        headers: { 'x-user-id': currentUser?.id || '' },
      });

      if (!res.ok) {
        throw new Error('Falha ao carregar check-ins.');
      }

      const data = await res.json();
      setCheckins(data.checkins || []);
    } catch (err: any) {
      console.error('Fetch checkins error:', err);
      setError(err.message || 'Erro ao buscar check-ins.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCheckins();
  }, [openOnly, selectedClubId]);

  // Debounced search on athlete text or dates
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCheckins();
    }, 350);
    return () => clearTimeout(timer);
  }, [athleteQuery, startDate, endDate]);

  // KPIs
  const stats = useMemo(() => {
    const total = checkins.length;
    const active = checkins.filter((c) => !c.checkoutAt).length;
    const completed = checkins.filter((c) => c.durationMinutes != null && c.durationMinutes > 0);
    const avgMinutes = completed.length > 0
      ? Math.round(completed.reduce((acc, cur) => acc + (cur.durationMinutes || 0), 0) / completed.length)
      : 0;

    return { total, active, avgMinutes };
  }, [checkins]);

  // Open manual checkout modal
  const startManualCheckout = (chk: ClubCheckin) => {
    setCheckoutTarget(chk);
    setCheckoutDateTime(toLocalDatetimeInput(new Date()));
    setCheckoutNotes('Baixa manual de saída realizada pela administração do clube.');
    setCheckoutError('');
  };

  // Submit manual checkout
  const handleConfirmCheckout = async () => {
    if (!checkoutTarget) return;
    setSavingCheckout(true);
    setCheckoutError('');

    try {
      const res = await fetch(`/api/checkins/${checkoutTarget.id}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || '',
        },
        body: JSON.stringify({
          checkoutAt: checkoutDateTime ? new Date(checkoutDateTime).toISOString() : new Date().toISOString(),
          notes: checkoutNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erro ao dar checkout.');
      }

      setCheckoutTarget(null);
      fetchCheckins();
    } catch (err: any) {
      setCheckoutError(err.message || 'Falha ao registrar saída.');
    } finally {
      setSavingCheckout(false);
    }
  };

  // Delete checkin
  const handleDeleteCheckin = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este registro de check-in?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/checkins/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': currentUser?.id || '' },
      });
      if (res.ok) {
        setCheckins((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.error('Delete checkin error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const clearFilters = () => {
    setAthleteQuery('');
    setStartDate('');
    setEndDate('');
    setOpenOnly(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-blue-600" />
            Gerenciamento de Check-ins e Presenças
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Controle de fluxo de entrada e saída, tempo de permanência no estande e auditoria biométrica facial.
          </p>
        </div>

        <button
          onClick={fetchCheckins}
          disabled={loading}
          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar Lista
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Atletas no Estande Agora */}
        <div
          onClick={() => setOpenOnly(!openOnly)}
          className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
            openOnly
              ? 'bg-emerald-500/10 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-emerald-300 shadow-sm'
          }`}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">No Estande Agora</span>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-1">{stats.active}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Atletas com permanência em aberto</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Total de Check-ins */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total de Registros</span>
            <p className="text-2xl font-black text-slate-900 mt-1">{stats.total}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Check-ins no período selecionado</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Média de Permanência */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Média de Permanência</span>
            <p className="text-2xl font-black text-slate-900 mt-1">{formatDuration(stats.avgMinutes)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Duração média por treino/estadia</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <Navigation className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
            <Filter className="w-3.5 h-3.5 text-blue-600" /> Filtros de Pesquisa
          </span>
          {(athleteQuery || startDate || endDate || openOnly) && (
            <button
              onClick={clearFilters}
              className="text-[11px] font-semibold text-red-600 hover:text-red-700 transition cursor-pointer"
            >
              Limpar Filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Athlete Search */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Buscar Atleta</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Nome, CPF ou CR..."
                value={athleteQuery}
                onChange={(e) => setAthleteQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs focus:bg-white focus:border-blue-500 outline-none transition"
              />
            </div>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Data Inicial (Entrada)</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-blue-500 outline-none transition"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Data Final (Saída)</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-blue-500 outline-none transition"
            />
          </div>

          {/* Status Filter (Em Aberto) */}
          <div className="flex flex-col justify-end">
            <button
              type="button"
              onClick={() => setOpenOnly(!openOnly)}
              className={`w-full py-2 px-3 rounded-xl font-bold text-xs border transition flex items-center justify-center gap-2 cursor-pointer ${
                openOnly
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              {openOnly ? 'Exibindo: Apenas em Aberto' : 'Filtrar: Apenas em Aberto'}
            </button>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Atleta</th>
                <th className="px-4 py-3">Clube</th>
                <th className="px-4 py-3">Entrada (Check-in)</th>
                <th className="px-4 py-3">Saída (Check-out)</th>
                <th className="px-4 py-3">Permanência</th>
                <th className="px-4 py-3">GPS / Distância</th>
                <th className="px-4 py-3">Biometria</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && checkins.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    Carregando check-ins...
                  </td>
                </tr>
              ) : checkins.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    Nenhum registro de check-in encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                checkins.map((chk) => {
                  const isOpen = !chk.checkoutAt;

                  return (
                    <tr key={chk.id} className="hover:bg-slate-50/80 transition">
                      {/* Atleta */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {chk.photoData ? (
                            <img
                              src={chk.photoData}
                              alt="Selfie"
                              onClick={() => setPhotoModalTarget(chk)}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-500 transition"
                              title="Clique para ampliar foto"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs shrink-0">
                              <User className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">{chk.athleteName || 'Atleta'}</p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              CPF: {chk.athleteCpf || '—'} {chk.athleteCr ? `• CR: ${chk.athleteCr}` : ''}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Clube */}
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-800 text-[11px] truncate block max-w-[140px]">
                          {chk.clubName || 'Clube de Tiro'}
                        </span>
                      </td>

                      {/* Entrada */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-mono font-semibold text-slate-800 text-[11px]">
                          {new Date(chk.checkinAt).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="font-mono text-slate-500 text-[10px]">
                          {new Date(chk.checkinAt).toLocaleTimeString('pt-BR')}
                        </p>
                      </td>

                      {/* Saída */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {chk.checkoutAt ? (
                          <>
                            <p className="font-mono font-semibold text-slate-800 text-[11px]">
                              {new Date(chk.checkoutAt).toLocaleDateString('pt-BR')}
                            </p>
                            <p className="font-mono text-slate-500 text-[10px]">
                              {new Date(chk.checkoutAt).toLocaleTimeString('pt-BR')}
                            </p>
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            No Estande
                          </span>
                        )}
                      </td>

                      {/* Tempo de Permanência */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isOpen ? (
                          <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                            {calculateLiveDuration(chk.checkinAt)}
                          </span>
                        ) : (
                          <span className="font-mono font-medium text-slate-700 text-[11px]">
                            {formatDuration(chk.durationMinutes)}
                          </span>
                        )}
                      </td>

                      {/* GPS / Distância */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {chk.distanceToClubMeters != null ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              chk.isWithinRadius
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            📍 {chk.distanceToClubMeters}m
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Coordenadas OK</span>
                        )}
                      </td>

                      {/* Biometria */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            chk.facialMatchStatus === 'confirmed'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {chk.facialMatchScore != null ? `${Math.round(chk.facialMatchScore)}%` : 'Salva'}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {isOpen && (
                            <button
                              onClick={() => startManualCheckout(chk)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow-sm cursor-pointer"
                              title="Dar Check-out Manual (registrar saída do atleta)"
                            >
                              <LogOut className="w-3 h-3" /> Dar Checkout
                            </button>
                          )}

                          <button
                            onClick={() => setPhotoModalTarget(chk)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="Ver Foto do Check-in"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteCheckin(chk.id)}
                            disabled={deletingId === chk.id}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title="Excluir Registro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Manual Checkout */}
      {checkoutTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LogOut className="w-5 h-5 text-emerald-200" />
                <h3 className="font-bold text-sm">Dar Check-out Manual</h3>
              </div>
              <button
                onClick={() => setCheckoutTarget(null)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 transition flex items-center justify-center cursor-pointer text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-800">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Atleta:</span>
                  <span className="font-bold text-slate-900">{checkoutTarget.athleteName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Entrada Registrada:</span>
                  <span className="font-mono font-semibold text-slate-700">
                    {new Date(checkoutTarget.checkinAt).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Data e Hora da Saída (Check-out) *
                </label>
                <input
                  type="datetime-local"
                  value={checkoutDateTime}
                  onChange={(e) => setCheckoutDateTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-emerald-500 outline-none transition font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Se o atleta esqueceu de dar saída ao deixar o estande, informe o horário estimado.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Observação do Gestor</label>
                <textarea
                  rows={2}
                  value={checkoutNotes}
                  onChange={(e) => setCheckoutNotes(e.target.value)}
                  placeholder="Ex: Saída manual registrada pela secretaria..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-emerald-500 outline-none transition"
                />
              </div>

              {checkoutError && (
                <div className="bg-red-50 text-red-700 p-2.5 rounded-xl text-[11px] font-semibold border border-red-200">
                  {checkoutError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCheckoutTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCheckout}
                  disabled={savingCheckout || !checkoutDateTime}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl font-bold transition shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
                >
                  {savingCheckout ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Registrando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar Saída
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Photo Zoom */}
      {photoModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden text-center">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <span className="font-bold text-xs truncate">{photoModalTarget.athleteName}</span>
              <button
                onClick={() => setPhotoModalTarget(null)}
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 transition flex items-center justify-center cursor-pointer text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {photoModalTarget.photoData && (
              <img
                src={photoModalTarget.photoData}
                alt="Selfie Check-in"
                className="w-full aspect-square object-cover"
              />
            )}
            <div className="p-4 bg-slate-50 text-left text-xs space-y-1 text-slate-700">
              <p>
                <strong>Entrada:</strong> {new Date(photoModalTarget.checkinAt).toLocaleString('pt-BR')}
              </p>
              {photoModalTarget.checkoutAt && (
                <p>
                  <strong>Saída:</strong> {new Date(photoModalTarget.checkoutAt).toLocaleString('pt-BR')}
                </p>
              )}
              {photoModalTarget.facialMatchScore != null && (
                <p>
                  <strong>Score Facial:</strong> {Math.round(photoModalTarget.facialMatchScore)}% de similaridade
                </p>
              )}
              {photoModalTarget.distanceToClubMeters != null && (
                <p>
                  <strong>Distância GPS:</strong> {photoModalTarget.distanceToClubMeters} metros do estande
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
