import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CheckCircle2, XCircle, Clock, Search, Calendar, User as UserIcon,
  Crosshair, ShieldCheck, AlertTriangle, RefreshCw, Filter, MessageSquare,
  ChevronDown, ArrowRight, Eye, Check, X, ShieldAlert, CheckSquare, Square,
  Layers, Info
} from 'lucide-react';
import { User, Club, TrainingSession, Weapon } from '../types';
import { formatDisplayDateTime } from '../utils/dateUtils';

interface ValidarTreinamentosPanelProps {
  currentUser: User | null;
  clubs: Club[];
  users?: User[];
  weapons?: Weapon[];
  onRefreshData?: () => void;
}

// Verifica se a data é estritamente superior a 01/10/2026
function isPostOct2026(val?: string | null): boolean {
  if (!val) return false;
  const str = String(val).trim();

  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const ymd = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    return ymd > '2026-10-01';
  }

  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (brMatch) {
    const ymd = `${brMatch[3]}-${brMatch[2].padStart(2, '0')}-${brMatch[1].padStart(2, '0')}`;
    return ymd > '2026-10-01';
  }

  return false;
}

// Obter status efetivo considerando regra de isenção pré-01/10/2026
function getEffectiveTrainingStatus(t: TrainingSession): 'pendente' | 'aprovado' | 'reprovado' {
  if (t.status === 'aprovado') return 'aprovado';
  if (t.status === 'reprovado') return 'reprovado';
  // Datas <= 01/10/2026 não exigem validação (são auto-aprovadas/isentas)
  if (!isPostOct2026(t.dateTime)) return 'aprovado';
  return 'pendente';
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

  // Seleção em lote (Bulk Selection)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal de Ação de Validação Individual
  const [actionModalTarget, setActionModalTarget] = useState<TrainingSession | null>(null);
  const [actionType, setActionType] = useState<'aprovado' | 'reprovado'>('aprovado');
  const [validationNotes, setValidationNotes] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState('');

  // Modal de Validação em Lote (Batch)
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchActionType, setBatchActionType] = useState<'aprovado' | 'reprovado'>('aprovado');
  const [batchNotes, setBatchNotes] = useState('');
  const [submittingBatch, setSubmittingBatch] = useState(false);
  const [batchError, setBatchError] = useState('');

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

  // Limpar seleção ao mudar filtros
  useEffect(() => {
    setSelectedIds(new Set());
  }, [statusFilter, effectiveClubId]);

  // Contagens para os cards de métricas considerando a regra pós-01/10/2026
  const counts = useMemo(() => {
    let pendentes = 0;
    let aprovados = 0;
    let reprovados = 0;

    trainings.forEach(t => {
      const st = getEffectiveTrainingStatus(t);
      if (st === 'pendente') pendentes++;
      else if (st === 'aprovado') aprovados++;
      else if (st === 'reprovado') reprovados++;
    });

    return { pendentes, aprovados, reprovados, total: trainings.length };
  }, [trainings]);

  // Lista filtrada na tela
  const filteredTrainings = useMemo(() => {
    return trainings.filter(t => {
      const currentStatus = getEffectiveTrainingStatus(t);
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

  // Gerenciamento de Seleção em Massa
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isAllSelected = useMemo(() => {
    if (filteredTrainings.length === 0) return false;
    return filteredTrainings.every(t => selectedIds.has(t.id));
  }, [filteredTrainings, selectedIds]);

  const isIndeterminate = useMemo(() => {
    if (filteredTrainings.length === 0) return false;
    const someSelected = filteredTrainings.some(t => selectedIds.has(t.id));
    return someSelected && !isAllSelected;
  }, [filteredTrainings, selectedIds, isAllSelected]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      const next = new Set(selectedIds);
      filteredTrainings.forEach(t => next.add(t.id));
      setSelectedIds(next);
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // Abrir modal de validação individual
  const openActionModal = (training: TrainingSession, type: 'aprovado' | 'reprovado') => {
    setActionModalTarget(training);
    setActionType(type);
    setValidationNotes(training.validationNotes || '');
    setActionError('');
  };

  // Abrir modal de validação em lote
  const openBatchModal = (type: 'aprovado' | 'reprovado') => {
    if (selectedIds.size === 0) return;
    setBatchActionType(type);
    setBatchNotes('');
    setBatchError('');
    setBatchModalOpen(true);
  };

  // Submeter validação individual
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

  // Submeter validação em lote
  const handleSubmitBatchValidation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.size === 0) return;

    if (batchActionType === 'reprovado' && !batchNotes.trim()) {
      setBatchError('Por favor, informe a justificativa da reprovação para os itens selecionados.');
      return;
    }

    setSubmittingBatch(true);
    setBatchError('');

    try {
      const idsArray = Array.from(selectedIds);
      const res = await fetch('/api/trainings/validate-batch', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(currentUser?.id ? { 'x-user-id': currentUser.id } : {})
        },
        body: JSON.stringify({
          ids: idsArray,
          status: batchActionType,
          validationNotes: batchNotes.trim() || undefined
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Erro ao processar validação em lote.');
      }

      const data = await res.json();
      const affectedIds = new Set<string>(data.updatedIds || idsArray);

      setTrainings(prev => prev.map(t => {
        if (affectedIds.has(t.id)) {
          return {
            ...t,
            status: batchActionType,
            validationNotes: batchNotes.trim() || t.validationNotes
          };
        }
        return t;
      }));

      setSuccessMessage(
        data.message || `${idsArray.length} treinamento(s) ${batchActionType === 'aprovado' ? 'aprovado(s)' : 'reprovado(s)'} em lote!`
      );
      setTimeout(() => setSuccessMessage(''), 4500);

      setSelectedIds(new Set());
      setBatchModalOpen(false);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      console.error('Error submitting batch training validation:', err);
      setBatchError(err.message || 'Falha ao processar validação em lote.');
    } finally {
      setSubmittingBatch(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Validar Treinamentos</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                  Validação em Massa
                </span>
              </div>
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

        {/* Informação sobre a regra de corte de 01/10/2026 */}
        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 text-xs text-slate-600">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <strong>Regra de Validação:</strong> Apenas treinamentos com data <strong>superior a 01/10/2026</strong> necessitam de validação pelo estande. Registros históricos de 01/10/2026 e anteriores foram homologados automaticamente e dispensam validação pendente.
          </p>
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
            className={`p-4 rounded-xl border text-left transition cursor-pointer ${
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
            <p className="text-[10px] text-amber-700/80 mt-0.5">Treinos pós 01/10/2026</p>
          </button>

          <button
            onClick={() => setStatusFilter('aprovado')}
            className={`p-4 rounded-xl border text-left transition cursor-pointer ${
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
            className={`p-4 rounded-xl border text-left transition cursor-pointer ${
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
            className={`p-4 rounded-xl border text-left transition cursor-pointer ${
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
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-xl transition cursor-pointer"
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

        {/* Barra de Seleção em Massa Superior */}
        {filteredTrainings.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={el => {
                    if (el) el.indeterminate = isIndeterminate;
                  }}
                  onChange={handleToggleSelectAll}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
                <span>Selecionar todos ({filteredTrainings.length})</span>
              </label>

              {selectedIds.size > 0 && (
                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  {selectedIds.size} selecionado(s)
                </span>
              )}
            </div>

            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-xs text-slate-500 hover:text-slate-800 underline px-1 cursor-pointer"
                >
                  Desmarcar
                </button>
                <button
                  type="button"
                  onClick={() => openBatchModal('aprovado')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar Selecionados ({selectedIds.size})
                </button>
                <button
                  type="button"
                  onClick={() => openBatchModal('reprovado')}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" /> Reprovar Selecionados ({selectedIds.size})
                </button>
              </div>
            )}
          </div>
        )}
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
              const currentStatus = getEffectiveTrainingStatus(t);
              const formattedDate = formatDisplayDateTime(t.dateTime);
              const isClubWeapon = t.weaponOwnerType === 'clube';
              const isSelected = selectedIds.has(t.id);
              const isHistoricalApproved = (!t.status || t.status === 'pendente') && !isPostOct2026(t.dateTime);

              return (
                <div
                  key={t.id}
                  className={`p-5 transition hover:bg-slate-50/70 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                    isSelected ? 'bg-blue-50/40 border-l-4 border-l-blue-500' : currentStatus === 'pendente' ? 'bg-amber-50/20' : ''
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-1">
                    {/* Checkbox de Seleção */}
                    <div className="pt-1 shrink-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(t.id)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                        title="Selecionar para ação em massa"
                      />
                    </div>

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

                        {/* Badge de Status */}
                        {currentStatus === 'pendente' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3" /> Pendente de Aprovação
                          </span>
                        )}
                        {currentStatus === 'aprovado' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> {isHistoricalApproved ? 'Aprovado (Histórico <= 01/10/2026)' : 'Aprovado pelo Clube'}
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
                            <ShieldCheck className="w-3 h-3 text-blue-600" /> Check-in Vinculado
                          </span>
                        )}
                      </div>

                      {/* Grade de Detalhes do Treino */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white/70 p-3 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Data e Hora</span>
                          <span className="font-semibold text-slate-800">{formattedDate}</span>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Arma Utilizada</span>
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-slate-800">
                              {t.weaponName || 'Arma informada'}
                              {t.caliber ? ` (${t.caliber})` : ''}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            {isClubWeapon ? '🏛️ Arma do Clube' : '👤 Arma Própria do Atleta'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Disparos / Tiros</span>
                          <span className="font-bold text-blue-900">{t.shotsCount ?? 0} disparos</span>
                          <span className="text-[10px] text-slate-400 block">
                            Próprios: {t.roundsOwn ?? 0} • Clube: {t.roundsClub ?? 0}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Modalidade</span>
                          <span className="font-semibold text-slate-800">{t.modality || 'Treino Livre'}</span>
                        </div>
                      </div>

                      {/* Observações de Validação (se houver) */}
                      {t.validationNotes && (
                        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 flex items-start gap-2">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-[11px] text-slate-600">Observação da Validação: </span>
                            <span className="text-[11px]">{t.validationNotes}</span>
                            {t.validatedAt && (
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                Em {formatDisplayDateTime(t.validatedAt)}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Botões de Ação Individual */}
                  <div className="flex sm:flex-col lg:flex-row items-center gap-2 shrink-0">
                    {currentStatus !== 'aprovado' && (
                      <button
                        onClick={() => openActionModal(t, 'aprovado')}
                        className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
                        title="Aprovar e homologar o treinamento do atirador"
                      >
                        <Check className="w-4 h-4" /> Aprovar
                      </button>
                    )}

                    {currentStatus !== 'reprovado' && (
                      <button
                        onClick={() => openActionModal(t, 'reprovado')}
                        className="flex-1 sm:flex-initial px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                        title="Reprovar o treinamento com justificativa"
                      >
                        <X className="w-4 h-4" /> Reprovar
                      </button>
                    )}

                    {currentStatus === 'aprovado' && (
                      <button
                        onClick={() => openActionModal(t, 'reprovado')}
                        className="px-3 py-1.5 text-[11px] text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-lg transition cursor-pointer"
                        title="Revogar aprovação"
                      >
                        Revogar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Bar quando houver itens selecionados */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md text-white border border-slate-700 px-5 py-3 rounded-2xl shadow-2xl flex flex-wrap items-center gap-4 animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xs font-bold">
              {selectedIds.size} treinamento(s) selecionado(s)
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700 hidden sm:block" />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearSelection}
              className="px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => openBatchModal('aprovado')}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" /> Aprovar em Lote ({selectedIds.size})
            </button>
            <button
              type="button"
              onClick={() => openBatchModal('reprovado')}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
            >
              <XCircle className="w-4 h-4" /> Reprovar em Lote ({selectedIds.size})
            </button>
          </div>
        </div>
      )}

      {/* Modal de Validação Individual */}
      {actionModalTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  actionType === 'aprovado' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  {actionType === 'aprovado' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {actionType === 'aprovado' ? 'Homologar Treinamento' : 'Reprovar Treinamento'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {actionModalTarget.athleteName || 'Atleta'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActionModalTarget(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitValidation} className="space-y-4 mt-4">
              {actionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  {actionError}
                </div>
              )}

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Data do Treinamento:</span>
                  <strong className="text-slate-900">{formatDisplayDateTime(actionModalTarget.dateTime)}</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Arma & Calibre:</span>
                  <strong className="text-slate-900">
                    {actionModalTarget.weaponName || 'Arma'} {actionModalTarget.caliber ? `(${actionModalTarget.caliber})` : ''}
                  </strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Disparos:</span>
                  <strong className="text-blue-900">{actionModalTarget.shotsCount ?? 0} tiros</strong>
                </div>
              </div>

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

      {/* Modal de Validação em Lote */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  batchActionType === 'aprovado' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {batchActionType === 'aprovado' ? 'Aprovação em Lote' : 'Reprovação em Lote'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Processando <strong>{selectedIds.size}</strong> treinamento(s) selecionado(s)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBatchModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitBatchValidation} className="space-y-4 mt-4">
              {batchError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  {batchError}
                </div>
              )}

              <div className="p-3.5 bg-blue-50/70 border border-blue-200/70 rounded-xl text-xs text-blue-900">
                <p>
                  Você está prestes a <strong>{batchActionType === 'aprovado' ? 'APROVAR' : 'REPROVAR'}</strong> {selectedIds.size} registros de treinamento de uma só vez.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>
                    {batchActionType === 'aprovado' ? 'Observações em Lote (Opcional):' : 'Justificativa da Reprovação (Obrigatória):'}
                  </span>
                  {batchActionType === 'reprovado' && (
                    <span className="text-[10px] text-rose-600 font-bold uppercase">* Obrigatório</span>
                  )}
                </label>
                <textarea
                  rows={3}
                  value={batchNotes}
                  onChange={(e) => setBatchNotes(e.target.value)}
                  placeholder={
                    batchActionType === 'aprovado'
                      ? 'Ex: Passagens de treino homologadas pelo estande do clube em lote.'
                      : 'Ex: Documentação de habitualidade inconsistente.'
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Botões do Rodapé */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBatchModalOpen(false)}
                  disabled={submittingBatch}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingBatch}
                  className={`px-5 py-2 text-xs font-bold text-white rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer ${
                    batchActionType === 'aprovado'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {submittingBatch ? (
                    <>Processando em lote...</>
                  ) : batchActionType === 'aprovado' ? (
                    <>
                      <Check className="w-4 h-4" /> Confirmar Aprovação de {selectedIds.size}
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4" /> Confirmar Reprovação de {selectedIds.size}
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
