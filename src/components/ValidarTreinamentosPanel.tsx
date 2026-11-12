import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CheckCircle2, XCircle, Clock, Search, Calendar, User as UserIcon,
  Crosshair, ShieldCheck, AlertTriangle, RefreshCw, Filter, MessageSquare,
  ChevronDown, ArrowRight, Eye, Check, X, ShieldAlert
} from 'lucide-react';
import { User, Club, TrainingSession, Weapon } from '../types';

interface ValidarTreinamentosPanelProps {
  currentUser: User | null;
  clubs: Club[];
  users?: User[];
  weapons?: Weapon[];
  onRefreshData?: () => void;
}

export default function ValidarTreinamentosPanel({
  currentUser,
  clubs,
  users = [],
  weapons = [],
  onRefreshData
}: ValidarTreinamentosPanelProps) {
  const isMaster = currentUser?.role === 'admin' || currentUser?.role === 'master_admin';
  const [selectedClubId, setSelectedClubId] = useState<string>(
    isMaster ? '' : (currentUser?.clubId || '')
  );

  const [trainings, setTrainings] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<'pendente' | 'aprovado' | 'reprovado' | 'todos'>('pendente');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal de Ação de Validação (Aprovar / Reprovar com campo de observação/justificativa)
  const [actionModalTarget, setActionModalTarget] = useState<TrainingSession | null>(null);
  const [actionType, setActionType] = useState<'aprovado' | 'reprovado'>('aprovado');
  const [validationNotes, setValidationNotes] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState('');

  // Clube atual para escopo
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

  // Carregar treinamentos da API
  const loadTrainings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let url = `/api/trainings?all=true`;
      if (effectiveClubId) {
        url += `&clubId=${encodeURIComponent(effectiveClubId)}`;
      }
      const res = await fetch(url, {
        headers: currentUser?.id ? { 'x-user-id': currentUser.id } : undefined
      });
      if (!res.ok) {
        throw new Error('Erro ao buscar lista de treinamentos.');
      }
      const data = await res.json();
      setTrainings(data.trainings || []);
    } catch (err: any) {
      console.error('Error fetching trainings to validate:', err);
      setError(err.message || 'Falha ao carregar treinamentos.');
    } finally {
      setLoading(false);
    }
  }, [effectiveClubId, currentUser]);

  useEffect(() => {
    loadTrainings();
  }, [loadTrainings]);

  // Contagens para os cards de métricas
  const counts = useMemo(() => {
    const pendentes = trainings.filter(t => !t.status || t.status === 'pendente').length;
    const aprovados = trainings.filter(t => t.status === 'aprovado').length;
    const reprovados = trainings.filter(t => t.status === 'reprovado').length;
    return { pendentes, aprovados, reprovados, total: trainings.length };
  }, [trainings]);

  // Lista filtrada na tela
  const filteredTrainings = useMemo(() => {
    return trainings.filter(t => {
      const currentStatus = t.status || 'pendente';
      if (statusFilter !== 'todos' && currentStatus !== statusFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const athlete = (t.athleteName || '').toLowerCase();
        const cpf = (t.athleteCpf || '').toLowerCase();
        const cr = (t.athleteCr || '').toLowerCase();
        const weapon = (t.weaponName || '').toLowerCase();
        const modality = (t.modality || '').toLowerCase();
        const match = athlete.includes(q) || cpf.includes(q) || cr.includes(q) || weapon.includes(q) || modality.includes(q);
        if (!match) return false;
      }

      if (startDate) {
        const tDate = (t.dateTime || '').slice(0, 10);
        if (tDate && tDate < startDate) return false;
      }

      if (endDate) {
        const tDate = (t.dateTime || '').slice(0, 10);
        if (tDate && tDate > endDate) return false;
      }

      return true;
    });
  }, [trainings, statusFilter, searchQuery, startDate, endDate]);

  // Abrir modal de aprovação ou reprovação
  const openActionModal = (training: TrainingSession, type: 'aprovado' | 'reprovado') => {
    setActionModalTarget(training);
    setActionType(type);
    setValidationNotes(training.validationNotes || '');
    setActionError('');
  };

  // Submeter validação
  const handleSubmitValidation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionModalTarget) return;

    if (actionType === 'reprovado' && !validationNotes.trim()) {
      setActionError('Por favor, informe a justificativa da reprovação para ciência do atleta.');
      return;
    }

    setSubmittingAction(true);
    setActionError('');

    try {
      const res = await fetch(`/api/trainings/${actionModalTarget.id}/validate`, {
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
        throw new Error(errData.error || 'Erro ao salvar validação do treinamento.');
      }

      const data = await res.json();
      const updatedTraining = data.training;

      // Atualizar localmente
      setTrainings(prev => prev.map(t => t.id === updatedTraining.id ? updatedTraining : t));

      setSuccessMessage(
        actionType === 'aprovado'
          ? `Treinamento de ${actionModalTarget.athleteName || 'Atleta'} aprovado com sucesso!`
          : `Treinamento de ${actionModalTarget.athleteName || 'Atleta'} reprovado.`
      );
      setTimeout(() => setSuccessMessage(''), 4000);

      setActionModalTarget(null);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      console.error('Error submitting training validation:', err);
      setActionError(err.message || 'Falha ao processar validação.');
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Validar Treinamentos</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Validação e homologação oficial das passagens de treinamento dos atletas vinculados ao clube.
              </p>
            </div>
          </div>

          {/* Seletor de Clube para Master Admin ou Identificação do Clube */}
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
            <p className="text-[10px] text-amber-700/80 mt-0.5">Treinos a revisar</p>
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
            <p className="text-[10px] text-emerald-700/80 mt-0.5">Homologados no estande</p>
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
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Geral</span>
              <Crosshair className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-slate-900">{counts.total}</div>
            <p className="text-[10px] text-slate-500 mt-0.5">Registros no sistema</p>
          </button>
        </div>
      </div>

      {/* Filtros e Barra de Ações */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Busca textual */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por atirador, CPF, CR, arma, calibre ou modalidade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filtro por Datas */}
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
              onClick={loadTrainings}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-xl transition"
              title="Recarregar dados"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Abas de Status */}
        <div className="flex border-b border-slate-100 gap-2 pt-1 overflow-x-auto">
          {[
            { id: 'pendente', label: 'Pendentes de Aprovação', count: counts.pendentes, color: 'text-amber-600 border-amber-500' },
            { id: 'aprovado', label: 'Aprovados', count: counts.aprovados, color: 'text-emerald-600 border-emerald-500' },
            { id: 'reprovado', label: 'Reprovados', count: counts.reprovados, color: 'text-rose-600 border-rose-500' },
            { id: 'todos', label: 'Todos os Registros', count: counts.total, color: 'text-blue-600 border-blue-500' }
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

      {/* Listagem de Treinamentos */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
            <p className="text-xs font-semibold">Carregando treinamentos para validação...</p>
          </div>
        ) : filteredTrainings.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Crosshair className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">Nenhum treinamento encontrado com os filtros selecionados.</p>
            <p className="text-xs text-slate-400 mt-1">Alterne o filtro de status ou limpe a busca.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTrainings.map((t) => {
              const currentStatus = t.status || 'pendente';
              const formattedDate = t.dateTime
                ? new Date(t.dateTime).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                : 'Data não informada';
              const isClubWeapon = t.weaponOwnerType === 'clube';

              return (
                <div
                  key={t.id}
                  className={`p-5 transition hover:bg-slate-50/60 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                    currentStatus === 'pendente' ? 'bg-amber-50/20' : ''
                  }`}
                >
                  {/* Dados do Atirador e do Treino */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-sm">{t.athleteName || 'Atleta não identificado'}</h4>
                      {t.athleteCpf && (
                        <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          CPF: {t.athleteCpf}
                        </span>
                      )}
                      {t.athleteCr && (
                        <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          CR: {t.athleteCr}
                        </span>
                      )}

                      {/* Badge de Status Atual */}
                      {currentStatus === 'pendente' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3" /> Pendente de Aprovação
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

                      {/* Vínculo com Check-in */}
                      {t.checkinId && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200" title="Presença registrada com biometria facial e GPS no estande">
                          <ShieldCheck className="w-3 h-3" /> Check-in Validado
                        </span>
                      )}
                    </div>

                    {/* Detalhes Técnicos do Treino */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600 pt-1">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold uppercase">Data e Hora</span>
                        <span className="font-semibold text-slate-800">{formattedDate}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold uppercase">Arma Utilizada</span>
                        <span className="font-semibold text-slate-800">{t.weaponName}</span>
                        {t.weaponCaliber && <span className="text-slate-400"> ({t.weaponCaliber})</span>}
                        <span className={`text-[9px] font-bold block mt-0.5 ${isClubWeapon ? 'text-amber-600' : 'text-blue-600'}`}>
                          {isClubWeapon ? '🏛️ Arma do Clube' : '🎯 Arma Própria'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold uppercase">Disparos / Tiros</span>
                        <span className="font-semibold text-slate-800">{t.totalShots} disparos</span>
                        <span className="text-[10px] text-slate-400 block">
                          Próprios: {t.ownAmmoShots} • Clube: {t.clubAmmoShots}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold uppercase">Modalidade</span>
                        <span className="font-semibold text-slate-800">{t.modality || 'Treino Livre'}</span>
                        {t.score ? <span className="text-[10px] text-slate-500 block">Pontos: {t.score}</span> : null}
                      </div>
                    </div>

                    {/* Observações do Atleta */}
                    {t.notes && (
                      <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 mt-2">
                        <span className="font-bold text-slate-600">Observações do atleta: </span>
                        {t.notes}
                      </div>
                    )}

                    {/* Dados da Validação Registrada */}
                    {currentStatus !== 'pendente' && (
                      <div className={`text-[11px] p-2.5 rounded-xl border mt-2 ${
                        currentStatus === 'aprovado'
                          ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                          : 'bg-rose-50/50 border-rose-200 text-rose-900'
                      }`}>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
                          <span>{currentStatus === 'aprovado' ? '✅ Homologado' : '❌ Reprovado'} por: <strong>{t.validatorName || 'Gestor do Clube'}</strong></span>
                          {t.validatedAt && (
                            <span className="text-[10px] opacity-75">
                              em {new Date(t.validatedAt).toLocaleString('pt-BR')}
                            </span>
                          )}
                        </div>
                        {t.validationNotes && (
                          <div className="mt-1 text-xs">
                            <span className="font-bold">Motivo/Observação: </span>
                            {t.validationNotes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Botões de Ação com Campo para Aprovar e Reprovar */}
                  <div className="flex sm:flex-col items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <button
                      onClick={() => openActionModal(t, 'aprovado')}
                      className={`w-full px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                        currentStatus === 'aprovado'
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                      title="Aprovar este treinamento de habitualidade"
                    >
                      <Check className="w-4 h-4" />
                      {currentStatus === 'aprovado' ? 'Editar Aprovação' : 'Aprovar'}
                    </button>

                    <button
                      onClick={() => openActionModal(t, 'reprovado')}
                      className={`w-full px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        currentStatus === 'reprovado'
                          ? 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                          : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                      }`}
                      title="Reprovar este treinamento"
                    >
                      <X className="w-4 h-4" />
                      {currentStatus === 'reprovado' ? 'Editar Reprovação' : 'Reprovar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal com Campo para Aprovar ou Reprovar */}
      {actionModalTarget && (
        <div
          onClick={() => setActionModalTarget(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col"
          >
            {/* Header do Modal */}
            <div className={`px-6 py-4 flex items-center justify-between text-white ${
              actionType === 'aprovado'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700'
                : 'bg-gradient-to-r from-rose-600 to-red-700'
            }`}>
              <div className="flex items-center gap-2">
                {actionType === 'aprovado' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                <h3 className="font-bold text-base">
                  {actionType === 'aprovado' ? 'Aprovar Treinamento de Habitualidade' : 'Reprovar Treinamento'}
                </h3>
              </div>
              <button
                onClick={() => setActionModalTarget(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo e Formulário */}
            <form onSubmit={handleSubmitValidation} className="p-6 space-y-4">
              {actionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {actionError}
                </div>
              )}

              {/* Resumo do Atleta e Sessão */}
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
                  <span className="text-slate-500">Data do Treino:</span>
                  <span className="font-semibold text-slate-800">
                    {actionModalTarget.dateTime ? new Date(actionModalTarget.dateTime).toLocaleString('pt-BR') : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Arma:</span>
                  <span className="font-semibold text-slate-800">{actionModalTarget.weaponName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Disparos:</span>
                  <span className="font-semibold text-slate-800">{actionModalTarget.totalShots} tiros</span>
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
                      ? 'Ex: Presença conferida pelo instrutor de plantão no estande.'
                      : 'Ex: Disparos não conferem com o estande / Arma sem guia de tráfego apresentada.'
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-400">
                  {actionType === 'aprovado'
                    ? 'Esta observação ficará registrada no histórico da habitualidade do atirador.'
                    : 'A justificativa ficará visível para o atirador no perfil dele e na emissão de declarações.'}
                </p>
              </div>

              {/* Botões do Rodapé */}
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
    </div>
  );
}
