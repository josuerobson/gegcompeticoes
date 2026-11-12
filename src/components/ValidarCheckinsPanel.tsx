import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldCheck, CheckCircle2, XCircle, Clock, MapPin, Search, Calendar,
  User as UserIcon, RefreshCw, AlertTriangle, Eye, Check, X, LogOut,
  ExternalLink, Navigation, Camera
} from 'lucide-react';
import { User, Club, ClubCheckin } from '../types';

interface ValidarCheckinsPanelProps {
  currentUser: User | null;
  clubs: Club[];
  users?: User[];
  onRefreshData?: () => void;
}

export default function ValidarCheckinsPanel({
  currentUser,
  clubs,
  users = [],
  onRefreshData
}: ValidarCheckinsPanelProps) {
  const isMaster = currentUser?.role === 'admin' || currentUser?.role === 'master_admin';
  const [selectedClubId, setSelectedClubId] = useState<string>(
    isMaster ? '' : (currentUser?.clubId || '')
  );

  const [checkins, setCheckins] = useState<ClubCheckin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<'pendente' | 'aprovado' | 'reprovado' | 'todos'>('pendente');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal de Ação de Validação (Aprovar / Reprovar com campo de observação/justificativa)
  const [actionModalTarget, setActionModalTarget] = useState<ClubCheckin | null>(null);
  const [actionType, setActionType] = useState<'aprovado' | 'reprovado'>('aprovado');
  const [validationNotes, setValidationNotes] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState('');

  // Modal de Zoom da Foto
  const [photoModalTarget, setPhotoModalTarget] = useState<ClubCheckin | null>(null);

  const activeClub = useMemo(() => {
    if (selectedClubId) {
      return clubs.find(c => c.id === selectedClubId) || null;
    }
    if (currentUser?.clubId) {
      return clubs.find(c => c.id === currentUser.clubId) || null;
    }
    return clubs[0] || null;
  }, [selectedClubId, currentUser, clubs]);

  const effectiveClubId = isMaster ? selectedClubId : (currentUser?.clubId || '');

  // Carregar check-ins da API
  const loadCheckins = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let url = `/api/checkins?`;
      const params = new URLSearchParams();
      if (effectiveClubId) {
        params.append('clubId', effectiveClubId);
      }
      if (searchQuery.trim()) {
        params.append('athleteQuery', searchQuery.trim());
      }
      if (startDate) {
        params.append('startDate', startDate);
      }
      if (endDate) {
        params.append('endDate', endDate);
      }

      const res = await fetch(`${url}${params.toString()}`, {
        headers: currentUser?.id ? { 'x-user-id': currentUser.id } : undefined
      });
      if (!res.ok) {
        throw new Error('Erro ao buscar lista de check-ins.');
      }
      const data = await res.json();
      setCheckins(data.checkins || []);
    } catch (err: any) {
      console.error('Error fetching checkins to validate:', err);
      setError(err.message || 'Falha ao carregar check-ins.');
    } finally {
      setLoading(false);
    }
  }, [effectiveClubId, searchQuery, startDate, endDate, currentUser]);

  useEffect(() => {
    loadCheckins();
  }, [loadCheckins]);

  // Normalização de status de checkin para contagem
  const getNormalizedStatus = (chk: ClubCheckin): 'pendente' | 'aprovado' | 'reprovado' => {
    const s = (chk.status || '').toLowerCase();
    if (s === 'aprovado' || s === 'confirmed') return 'aprovado';
    if (s === 'reprovado' || s === 'rejected') return 'reprovado';
    return 'pendente';
  };

  // Contagens para os cards
  const counts = useMemo(() => {
    let pendentes = 0;
    let aprovados = 0;
    let reprovados = 0;
    let noEstande = 0;

    checkins.forEach(c => {
      const s = getNormalizedStatus(c);
      if (s === 'pendente') pendentes++;
      else if (s === 'aprovado') aprovados++;
      else if (s === 'reprovado') reprovados++;

      if (!c.checkoutAt) noEstande++;
    });

    return { pendentes, aprovados, reprovados, noEstande, total: checkins.length };
  }, [checkins]);

  // Lista filtrada
  const filteredCheckins = useMemo(() => {
    return checkins.filter(c => {
      const s = getNormalizedStatus(c);
      if (statusFilter !== 'todos' && s !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [checkins, statusFilter]);

  // Abrir modal de validação
  const openActionModal = (chk: ClubCheckin, type: 'aprovado' | 'reprovado') => {
    setActionModalTarget(chk);
    setActionType(type);
    setValidationNotes(chk.validationNotes || '');
    setActionError('');
  };

  // Submeter validação
  const handleSubmitValidation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionModalTarget) return;

    if (actionType === 'reprovado' && !validationNotes.trim()) {
      setActionError('Por favor, informe a justificativa da reprovação do check-in.');
      return;
    }

    setSubmittingAction(true);
    setActionError('');

    try {
      const res = await fetch(`/api/checkins/${actionModalTarget.id}/validate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(currentUser?.id ? { 'x-user-id': currentUser.id } : {})
        },
        body: JSON.stringify({
          status: actionType,
          validationNotes: validationNotes.trim() || undefined
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Erro ao salvar validação do check-in.');
      }

      const data = await res.json();
      const updatedCheckin = data.checkin;

      setCheckins(prev => prev.map(c => c.id === updatedCheckin.id ? updatedCheckin : c));

      setSuccessMessage(
        actionType === 'aprovado'
          ? `Check-in de ${actionModalTarget.athleteName || 'Atleta'} aprovado com sucesso!`
          : `Check-in de ${actionModalTarget.athleteName || 'Atleta'} reprovado.`
      );
      setTimeout(() => setSuccessMessage(''), 4000);

      setActionModalTarget(null);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      console.error('Error submitting checkin validation:', err);
      setActionError(err.message || 'Falha ao processar validação do check-in.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Formatador de duração
  const formatDuration = (mins?: number) => {
    if (mins == null) return '—';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m} min`;
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Validar Check-ins</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Homologação e validação de presença no estande com biometria facial e satélite GPS.
              </p>
            </div>
          </div>

          {/* Seletor de Clube ou Identificação do Clube */}
          {isMaster ? (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Filtrar por Clube:</label>
              <select
                value={selectedClubId}
                onChange={(e) => setSelectedClubId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os Clubes</option>
                {clubs.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.fantasyName || c.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-blue-50/70 border border-blue-200/60 rounded-xl px-3 py-1.5 self-start md:self-auto">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-blue-800">
                {activeClub?.fantasyName || activeClub?.name || 'Seu Clube de Tiro'}
              </span>
            </div>
          )}
        </div>

        {/* Feedback Messages */}
        {successMessage && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-800 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            {successMessage}
          </div>
        )}
        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-rose-800 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            {error}
          </div>
        )}

        {/* Cards de Métricas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <button
            onClick={() => setStatusFilter('pendente')}
            className={`p-4 rounded-xl border text-left transition ${
              statusFilter === 'pendente'
                ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/30'
                : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
            }`}
          >
            <div className="flex items-center justify-between text-amber-600 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Aguardando Validação</span>
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-amber-900">{counts.pendentes}</div>
            <p className="text-[10px] text-amber-700/80 mt-0.5">Check-ins a homologar</p>
          </button>

          <button
            onClick={() => setStatusFilter('aprovado')}
            className={`p-4 rounded-xl border text-left transition ${
              statusFilter === 'aprovado'
                ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400/30'
                : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
            }`}
          >
            <div className="flex items-center justify-between text-emerald-600 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Aprovados</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-emerald-900">{counts.aprovados}</div>
            <p className="text-[10px] text-emerald-700/80 mt-0.5">Presenças confirmadas</p>
          </button>

          <button
            onClick={() => setStatusFilter('reprovado')}
            className={`p-4 rounded-xl border text-left transition ${
              statusFilter === 'reprovado'
                ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-400/30'
                : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
            }`}
          >
            <div className="flex items-center justify-between text-rose-600 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Reprovados</span>
              <XCircle className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-rose-900">{counts.reprovados}</div>
            <p className="text-[10px] text-rose-700/80 mt-0.5">Recusados com motivo</p>
          </button>

          <button
            onClick={() => setStatusFilter('todos')}
            className={`p-4 rounded-xl border text-left transition ${
              statusFilter === 'todos'
                ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-400/30'
                : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
            }`}
          >
            <div className="flex items-center justify-between text-blue-600 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">No Estande Agora</span>
              <MapPin className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-slate-900">{counts.noEstande}</div>
            <p className="text-[10px] text-slate-500 mt-0.5">Atletas com presença aberta</p>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar atirador por nome, CPF ou CR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-xs text-slate-700 outline-hidden"
                title="Data inicial"
              />
            </div>
            <span className="text-xs text-slate-400">até</span>
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-xs text-slate-700 outline-hidden"
                title="Data final"
              />
            </div>

            <button
              onClick={loadCheckins}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-xl transition"
              title="Recarregar dados"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Abas */}
        <div className="flex border-b border-slate-100 gap-2 pt-1 overflow-x-auto">
          {[
            { id: 'pendente', label: 'Pendentes de Validação', count: counts.pendentes, color: 'text-amber-600 border-amber-500' },
            { id: 'aprovado', label: 'Aprovados', count: counts.aprovados, color: 'text-emerald-600 border-emerald-500' },
            { id: 'reprovado', label: 'Reprovados', count: counts.reprovados, color: 'text-rose-600 border-rose-500' },
            { id: 'todos', label: 'Todos os Check-ins', count: counts.total, color: 'text-blue-600 border-blue-500' }
          ].map(tab => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-bold transition border-b-2 whitespace-nowrap cursor-pointer ${
                  active ? `${tab.color}` : 'text-slate-500 border-transparent hover:text-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabela de Check-ins */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
            <p className="text-xs font-semibold">Carregando check-ins para validação...</p>
          </div>
        ) : filteredCheckins.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <ShieldCheck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">Nenhum check-in encontrado com os filtros selecionados.</p>
            <p className="text-xs text-slate-400 mt-1">Alterne o filtro de status ou selecione outro período.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredCheckins.map((chk) => {
              const currentStatus = getNormalizedStatus(chk);
              const isOpen = !chk.checkoutAt;

              return (
                <div
                  key={chk.id}
                  className={`p-5 transition hover:bg-slate-50/60 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                    currentStatus === 'pendente' ? 'bg-amber-50/20' : ''
                  }`}
                >
                  {/* Foto do Check-in + Dados do Atleta */}
                  <div className="flex items-start gap-4 flex-1">
                    {/* Selfie Biométrica Thumbnail */}
                    <div className="relative shrink-0">
                      {chk.photoData ? (
                        <div
                          onClick={() => setPhotoModalTarget(chk)}
                          className="w-14 h-14 rounded-xl overflow-hidden border-2 border-slate-200 hover:border-blue-500 transition cursor-pointer relative group shadow-xs"
                          title="Clique para ampliar a foto do check-in"
                        >
                          <img
                            src={chk.photoData}
                            alt="Selfie Check-in"
                            className="w-full h-full object-cover group-hover:scale-105 transition"
                          />
                          <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                            <Eye className="w-4 h-4" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                          <Camera className="w-6 h-6" />
                        </div>
                      )}
                      {chk.facialMatchScore != null && (
                        <span
                          className={`absolute -bottom-1 -right-1 text-[8px] font-black px-1 py-0.2 rounded-md shadow-xs ${
                            chk.facialMatchStatus === 'confirmed'
                              ? 'bg-blue-600 text-white'
                              : 'bg-amber-500 text-white'
                          }`}
                          title={`Score de reconhecimento facial: ${Math.round(chk.facialMatchScore)}%`}
                        >
                          {Math.round(chk.facialMatchScore)}%
                        </span>
                      )}
                    </div>

                    {/* Informações Textuais */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm">{chk.athleteName || 'Atleta não identificado'}</h4>
                        {chk.athleteCpf && (
                          <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            CPF: {chk.athleteCpf}
                          </span>
                        )}
                        {chk.athleteCr && (
                          <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            CR: {chk.athleteCr}
                          </span>
                        )}

                        {/* Status Badge */}
                        {currentStatus === 'pendente' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3" /> Pendente de Validação
                          </span>
                        )}
                        {currentStatus === 'aprovado' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Aprovado pelo Clube
                          </span>
                        )}
                        {currentStatus === 'reprovado' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                            <XCircle className="w-3 h-3" /> Reprovado pelo Clube
                          </span>
                        )}

                        {/* Presença Aberta */}
                        {isOpen ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            🟢 No Estande Agora
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            Saída Registrada ({formatDuration(chk.durationMinutes)})
                          </span>
                        )}
                      </div>

                      {/* Dados Técnicos: GPS e Horários */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600 pt-1">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold uppercase">Entrada</span>
                          <span className="font-semibold text-slate-800">
                            {new Date(chk.checkinAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold uppercase">Saída</span>
                          <span className="font-semibold text-slate-800">
                            {chk.checkoutAt
                              ? new Date(chk.checkoutAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                              : 'No estande'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold uppercase">Geolocalização GPS</span>
                          <div className="flex items-center gap-1">
                            <span className={`inline-block px-1.5 py-0.2 rounded font-bold text-[10px] ${
                              chk.isWithinRadius ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              📍 {chk.distanceToClubMeters != null ? `${chk.distanceToClubMeters}m do estande` : 'No estande'}
                            </span>
                            {chk.latitude && chk.longitude && (
                              <a
                                href={`https://www.google.com/maps?q=${chk.latitude},${chk.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-[10px] flex items-center gap-0.5"
                                title="Ver no Google Maps"
                              >
                                Mapa <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold uppercase">Reconhecimento Facial</span>
                          <span className="font-semibold text-slate-800">
                            {chk.facialMatchScore != null ? `${Math.round(chk.facialMatchScore)}% compatível` : 'Capturada'}
                          </span>
                        </div>
                      </div>

                      {/* Dados de Validação Salvos */}
                      {currentStatus !== 'pendente' && (
                        <div className={`text-[11px] p-2.5 rounded-xl border mt-2 ${
                          currentStatus === 'aprovado'
                            ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                            : 'bg-rose-50/50 border-rose-200 text-rose-900'
                        }`}>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
                            <span>{currentStatus === 'aprovado' ? '✅ Homologado' : '❌ Reprovado'} por: <strong>{chk.validatorName || 'Gestor do Clube'}</strong></span>
                            {chk.validatedAt && (
                              <span className="text-[10px] opacity-75">
                                em {new Date(chk.validatedAt).toLocaleString('pt-BR')}
                              </span>
                            )}
                          </div>
                          {chk.validationNotes && (
                            <div className="mt-1 text-xs">
                              <span className="font-bold">Motivo/Observação: </span>
                              {chk.validationNotes}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ações com Campo para Aprovar e Reprovar */}
                  <div className="flex sm:flex-col items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <button
                      onClick={() => openActionModal(chk, 'aprovado')}
                      className={`w-full px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                        currentStatus === 'aprovado'
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                      title="Aprovar este check-in de presença"
                    >
                      <Check className="w-4 h-4" />
                      {currentStatus === 'aprovado' ? 'Editar Aprovação' : 'Aprovar'}
                    </button>

                    <button
                      onClick={() => openActionModal(chk, 'reprovado')}
                      className={`w-full px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        currentStatus === 'reprovado'
                          ? 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                          : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                      }`}
                      title="Reprovar este check-in"
                    >
                      <X className="w-4 h-4" />
                      {currentStatus === 'reprovado' ? 'Editar Reprovação' : 'Reprovar'}
                    </button>

                    <button
                      onClick={() => setPhotoModalTarget(chk)}
                      className="w-full px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                      title="Visualizar foto completa e auditoria GPS"
                    >
                      <Eye className="w-3.5 h-3.5" /> Ver Detalhes
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal com Campo para Aprovar ou Reprovar Check-in */}
      {actionModalTarget && (
        <div
          onClick={() => setActionModalTarget(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className={`px-6 py-4 flex items-center justify-between text-white ${
              actionType === 'aprovado'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700'
                : 'bg-gradient-to-r from-rose-600 to-red-700'
            }`}>
              <div className="flex items-center gap-2">
                {actionType === 'aprovado' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                <h3 className="font-bold text-base">
                  {actionType === 'aprovado' ? 'Aprovar Check-in de Presença' : 'Reprovar Check-in'}
                </h3>
              </div>
              <button
                onClick={() => setActionModalTarget(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário com Campo de Aprovação / Reprovação */}
            <form onSubmit={handleSubmitValidation} className="p-6 space-y-4">
              {actionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {actionError}
                </div>
              )}

              {/* Resumo */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Atleta:</span>
                  <span className="font-bold text-slate-800">{actionModalTarget.athleteName}</span>
                </div>
                {actionModalTarget.athleteCpf && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">CPF:</span>
                    <span className="font-mono text-slate-700">{actionModalTarget.athleteCpf}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Horário Check-in:</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(actionModalTarget.checkinAt).toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Distância do Estande:</span>
                  <span className="font-semibold text-slate-800">
                    {actionModalTarget.distanceToClubMeters != null ? `${actionModalTarget.distanceToClubMeters} metros` : 'No estande'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Reconhecimento Facial:</span>
                  <span className="font-semibold text-slate-800">
                    {actionModalTarget.facialMatchScore != null ? `${Math.round(actionModalTarget.facialMatchScore)}% compatível` : 'Capturado'}
                  </span>
                </div>
              </div>

              {/* Campo para Aprovar e Reprovar: Observações / Justificativa */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>
                    {actionType === 'aprovado' ? 'Observações da Aprovação (Opcional):' : 'Justificativa da Reprovação (Obrigatória):'}
                  </span>
                  {actionType === 'reprovado' && (
                    <span className="text-[10px] text-rose-600 font-bold uppercase">* Obrigatório</span>
                  )}
                </label>
                <textarea
                  rows={3}
                  value={validationNotes}
                  onChange={(e) => setValidationNotes(e.target.value)}
                  placeholder={
                    actionType === 'aprovado'
                      ? 'Ex: Presença física conferida na portaria do clube.'
                      : 'Ex: Foto selfie não corresponde à face do atirador / GPS fora da área autorizada.'
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-400">
                  {actionType === 'aprovado'
                    ? 'Esta homologação valida a presença oficial do atirador no estande para auditoria do Exército Brasileiro.'
                    : 'A justificativa ficará registrada no livro de presença e auditoria do SFPC.'}
                </p>
              </div>

              {/* Rodapé */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActionModalTarget(null)}
                  disabled={submittingAction}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className={`px-5 py-2 text-xs font-bold text-white rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer ${
                    actionType === 'aprovado'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {submittingAction ? (
                    <>Salvando...</>
                  ) : actionType === 'aprovado' ? (
                    <>
                      <Check className="w-4 h-4" /> Confirmar Aprovação
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4" /> Confirmar Reprovação
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Zoom da Foto */}
      {photoModalTarget && (
        <div
          onClick={() => setPhotoModalTarget(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col"
          >
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm">Foto de Presença Oficial (Check-in)</h3>
              </div>
              <button
                onClick={() => setPhotoModalTarget(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {photoModalTarget.photoData ? (
                <div className="rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-950 flex items-center justify-center max-h-[55vh]">
                  <img
                    src={photoModalTarget.photoData}
                    alt="Selfie Check-in"
                    className="max-h-[55vh] w-auto object-contain"
                  />
                </div>
              ) : (
                <div className="h-48 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-xs">
                  Sem foto disponível
                </div>
              )}

              <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Atirador:</span>
                  <span className="font-bold text-slate-800">{photoModalTarget.athleteName}</span>
                </div>
                {photoModalTarget.athleteCpf && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">CPF:</span>
                    <span className="font-mono text-slate-700">{photoModalTarget.athleteCpf}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Coordenadas GPS:</span>
                  <span className="font-mono text-slate-700">
                    {photoModalTarget.latitude && photoModalTarget.longitude
                      ? `${photoModalTarget.latitude.toFixed(6)}, ${photoModalTarget.longitude.toFixed(6)}`
                      : 'Não registradas'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status Validação:</span>
                  <span className={`font-bold uppercase ${
                    getNormalizedStatus(photoModalTarget) === 'aprovado'
                      ? 'text-emerald-700'
                      : getNormalizedStatus(photoModalTarget) === 'reprovado'
                      ? 'text-rose-700'
                      : 'text-amber-700'
                  }`}>
                    {getNormalizedStatus(photoModalTarget)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPhotoModalTarget(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
