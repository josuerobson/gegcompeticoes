import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock, Target, Trophy, CheckCircle2, AlertTriangle, X,
  Loader2, ArrowLeft, ShieldCheck, ChevronRight, CheckSquare, Square
} from 'lucide-react';
import { User, Weapon, Modality, ClubCheckin, TrainingSession, Championship, Stage, Registration } from '../types';
import { normalizeSearchText, resolveWeaponSerial } from '../utils/textSearch';

interface LinkedCompetitionItem {
  id: string;
  championshipId: string;
  stageId?: string;
  modalityId: string;
  weaponId?: string;
  championshipTitle?: string;
  stageTitle?: string;
  stageNum?: number;
  modalityName?: string;
  weaponModel?: string;
  weaponCaliber?: string;
  totalPoints?: number;
  paymentStatus?: string;
  completionStatus?: string;
  registeredAt?: string;
  checkinId?: string;
}

interface CheckoutActivityModalProps {
  currentUser: User | null;
  activeCheckin: ClubCheckin;
  weapons?: Weapon[];
  modalities?: Modality[];
  championships?: Championship[];
  stages?: Stage[];
  registrations?: Registration[];
  staySeconds: number;
  onClose: () => void;
  onCheckoutComplete: () => void;
}

export default function CheckoutActivityModal({
  currentUser,
  activeCheckin,
  weapons = [],
  modalities = [],
  championships = [],
  stages = [],
  staySeconds,
  onClose,
  onCheckoutComplete,
}: CheckoutActivityModalProps) {
  // Step: 'activities' | 'add_training' | 'competition'
  const [step, setStep] = useState<'activities' | 'add_training' | 'competition'>('activities');

  // Linked trainings for this check-in
  const [sessionTrainings, setSessionTrainings] = useState<TrainingSession[]>([]);
  const [loadingSessionTrainings, setLoadingSessionTrainings] = useState(false);

  // Linked and unlinked competition registrations for this check-in
  const [linkedRegistrations, setLinkedRegistrations] = useState<LinkedCompetitionItem[]>([]);
  const [unlinkedRegistrations, setUnlinkedRegistrations] = useState<LinkedCompetitionItem[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [selectedRegIds, setSelectedRegIds] = useState<string[]>([]);
  const [savingCompLinks, setSavingCompLinks] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [compError, setCompError] = useState('');

  // Optional manual competition notes
  const [manualCompNote, setManualCompNote] = useState('');

  // Training Form State
  const [trainingForm, setTrainingForm] = useState({
    dateTime: new Date().toISOString().slice(0, 16),
    weaponSearchQuery: '',
    selectedWeapon: null as Weapon | null,
    weaponName: '',
    weaponCaliber: '',
    weaponOwnerType: 'propria' as 'propria' | 'clube',
    ownAmmoShots: '',
    clubAmmoShots: '',
    clubAmmoType: 'recarga' as 'nova' | 'recarga',
    modality: 'Treino Livre',
    score: 0,
    notes: '',
  });

  const [savingTraining, setSavingTraining] = useState(false);
  const [trainingError, setTrainingError] = useState('');
  const [isWeaponDropdownOpen, setIsWeaponDropdownOpen] = useState(false);

  // Final Checkout submission
  const [submittingCheckout, setSubmittingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  // Format stay time (e.g. 01h 24m)
  const formatStay = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    if (h > 0) return `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
    return `${pad(m)}m ${pad(s)}s`;
  };

  // Fetch trainings already linked to this checkin
  const fetchSessionTrainings = async () => {
    setLoadingSessionTrainings(true);
    try {
      const res = await fetch(`/api/checkins/${activeCheckin.id}/trainings`, {
        headers: { 'x-user-id': currentUser?.id || '' },
      });
      if (res.ok) {
        const data = await res.json();
        setSessionTrainings(data.trainings || []);
      }
    } catch (err) {
      console.error('Fetch session trainings error:', err);
    } finally {
      setLoadingSessionTrainings(false);
    }
  };

  // Fetch registrations: both already linked to this check-in and unlinked available
  const fetchRegistrations = async () => {
    setLoadingRegistrations(true);
    setCompError('');
    try {
      const [linkedRes, unlinkedRes] = await Promise.all([
        fetch(`/api/checkins/${activeCheckin.id}/registrations`, {
          headers: { 'x-user-id': currentUser?.id || '' },
        }),
        fetch('/api/registrations/unlinked-checkin', {
          headers: { 'x-user-id': currentUser?.id || '' },
        }),
      ]);

      let linkedList: LinkedCompetitionItem[] = [];
      let unlinkedList: LinkedCompetitionItem[] = [];

      if (linkedRes.ok) {
        const linkedData = await linkedRes.json();
        linkedList = linkedData.registrations || [];
      }
      if (unlinkedRes.ok) {
        const unlinkedData = await unlinkedRes.json();
        unlinkedList = unlinkedData.registrations || [];
      }

      setLinkedRegistrations(linkedList);
      setUnlinkedRegistrations(unlinkedList);

      // Selected IDs for new vinculations starts empty
      setSelectedRegIds([]);
    } catch (err) {
      console.error('Fetch registrations error:', err);
      setCompError('Erro ao carregar inscrições de campeonatos.');
    } finally {
      setLoadingRegistrations(false);
    }
  };

  useEffect(() => {
    fetchSessionTrainings();
    fetchRegistrations();
  }, [activeCheckin.id]);

  // Exibir estritamente inscricoes a partir de novembro de 2026 E que ainda NAO foram vinculadas
  const eligibleRegistrations = useMemo(() => {
    return unlinkedRegistrations.filter((r) => {
      // 1. Nao exibe as que ja foram vinculadas
      if (r.checkinId && r.checkinId.trim() !== '') return false;
      // 2. Nao exibe inscricoes anteriores a novembro de 2026 (a partir de 2026-11-01)
      const dateStr =
        (r as any).dataExecucao ||
        (r as any).stageDate ||
        (r.registeredAt ? r.registeredAt.slice(0, 10) : '');
      if (dateStr && dateStr < '2026-11-01') return false;
      return true;
    });
  }, [unlinkedRegistrations]);

  // Toggle registration selection
  const handleToggleRegistration = (regId: string) => {
    setSelectedRegIds((prev) =>
      prev.includes(regId) ? prev.filter((id) => id !== regId) : [...prev, regId]
    );
  };

  // Desvincular inscricao individual deste check-in
  const handleUnlinkRegistration = async (regId: string) => {
    setUnlinkingId(regId);
    try {
      const res = await fetch(`/api/checkins/${activeCheckin.id}/unlink-registration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || '',
        },
        body: JSON.stringify({ registrationId: regId }),
      });
      if (res.ok) {
        await fetchRegistrations();
      }
    } catch (err) {
      console.error('Error unlinking registration:', err);
    } finally {
      setUnlinkingId(null);
    }
  };

  // Save competition links
  const handleSaveCompetitionLinks = async () => {
    if (selectedRegIds.length === 0) {
      setStep('activities');
      return;
    }
    setSavingCompLinks(true);
    setCompError('');
    try {
      const res = await fetch(`/api/checkins/${activeCheckin.id}/link-registrations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || '',
        },
        body: JSON.stringify({
          registrationIds: selectedRegIds,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao vincular inscrições ao check-in.');
      }

      setSelectedRegIds([]);
      // Refresh list and return to activities
      await fetchRegistrations();
      setStep('activities');
    } catch (err: any) {
      setCompError(err.message || 'Erro ao salvar vínculo de competições.');
    } finally {
      setSavingCompLinks(false);
    }
  };

  // Weapons filter for autocomplete
  const searchFilteredWeapons = useMemo(() => {
    const q = normalizeSearchText(trainingForm.weaponSearchQuery.trim());
    if (q.length < 2) return [];
    return weapons.filter((w) => {
      const isOwner = w.ownerId === currentUser?.id;
      const isClubWeapon = w.ownerId === activeCheckin.clubId || w.ownerId === currentUser?.clubId;
      if (!isOwner && !isClubWeapon) return false;

      const model = normalizeSearchText(w.model || '');
      const fab = normalizeSearchText(w.manufacturer || '');
      const num = normalizeSearchText(w.weaponNumber || '');
      const serial = normalizeSearchText(resolveWeaponSerial(w));
      const sigma = normalizeSearchText(w.sigmaNumber || '');
      const caliber = normalizeSearchText(w.caliber || '');

      return model.includes(q) || fab.includes(q) || num.includes(q) || serial.includes(q) || sigma.includes(q) || caliber.includes(q);
    });
  }, [trainingForm.weaponSearchQuery, weapons, currentUser?.id, activeCheckin.clubId, currentUser?.clubId]);

  // Handle Training Save
  const handleSaveTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrainingError('');

    const weaponNameToSave =
      trainingForm.weaponName.trim() ||
      (trainingForm.selectedWeapon
        ? `${trainingForm.selectedWeapon.manufacturer || ''} ${trainingForm.selectedWeapon.model || ''}`.trim()
        : trainingForm.weaponSearchQuery.trim());

    if (!weaponNameToSave) {
      setTrainingError('Selecione ou informe a arma utilizada no treinamento.');
      return;
    }

    const own = Math.max(0, Number(trainingForm.ownAmmoShots) || 0);
    const club = Math.max(0, Number(trainingForm.clubAmmoShots) || 0);
    if (own === 0 && club === 0) {
      setTrainingError('Informe a quantidade de tiros com munição própria ou do clube.');
      return;
    }

    setSavingTraining(true);
    try {
      const payload = {
        dateTime: trainingForm.dateTime,
        weaponId: trainingForm.selectedWeapon?.id,
        weaponName: weaponNameToSave,
        weaponCaliber: trainingForm.weaponCaliber || trainingForm.selectedWeapon?.caliber || '',
        weaponOwnerType: trainingForm.weaponOwnerType,
        ownAmmoShots: own,
        clubAmmoShots: club,
        clubAmmoType: trainingForm.clubAmmoType,
        modality: trainingForm.modality || 'Treino Livre',
        score: Number(trainingForm.score) || 0,
        notes: trainingForm.notes,
        checkinId: activeCheckin.id,
      };

      const res = await fetch('/api/trainings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || '',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao registrar treinamento.');
      }

      // Reset form
      setTrainingForm({
        dateTime: new Date().toISOString().slice(0, 16),
        weaponSearchQuery: '',
        selectedWeapon: null,
        weaponName: '',
        weaponCaliber: '',
        weaponOwnerType: 'propria',
        ownAmmoShots: '',
        clubAmmoShots: '',
        clubAmmoType: 'recarga',
        modality: 'Treino Livre',
        score: 0,
        notes: '',
      });

      await fetchSessionTrainings();
      setStep('activities');
    } catch (err: any) {
      setTrainingError(err.message || 'Erro ao registrar treinamento.');
    } finally {
      setSavingTraining(false);
    }
  };

  // Finalize Check-out
  const handleFinalizeCheckout = async () => {
    setSubmittingCheckout(true);
    setCheckoutError('');

    try {
      const notesParts: string[] = [];
      if (sessionTrainings.length > 0) {
        notesParts.push(
          `${sessionTrainings.length} treinamento(s): ` +
            sessionTrainings.map((t) => `${t.weaponName} (${t.totalShots} tiros)`).join(', ')
        );
      }
      if (linkedRegistrations.length > 0) {
        notesParts.push(
          `${linkedRegistrations.length} competição(ões): ` +
            linkedRegistrations.map((r) => r.championshipTitle || 'Campeonato').join(', ')
        );
      }
      if (manualCompNote.trim()) {
        notesParts.push(`Obs: ${manualCompNote.trim()}`);
      }
      if (notesParts.length === 0) {
        notesParts.push('Saída registrada sem disparos informados (visita/reunião).');
      }

      const res = await fetch(`/api/checkins/${activeCheckin.id}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || '',
        },
        body: JSON.stringify({
          notes: notesParts.join(' | '),
          registrationIds: selectedRegIds,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Falha ao registrar check-out.');
      }

      onCheckoutComplete();
    } catch (err: any) {
      setCheckoutError(err.message || 'Erro ao registrar check-out.');
    } finally {
      setSubmittingCheckout(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] text-slate-800 text-xs">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-5 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-md">
              <Clock className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">Check-out no Clube</h3>
              <p className="text-[11px] text-amber-100 flex items-center gap-1.5 mt-0.5">
                <span>{activeCheckin.clubName}</span>
                <span>•</span>
                <span className="font-mono bg-black/20 px-2 py-0.2 rounded-md font-bold">
                  ⏱️ {formatStay(staySeconds)}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition flex items-center justify-center cursor-pointer text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* STEP 1: ACTIVITIES OVERVIEW */}
          {step === 'activities' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-1">
                <h4 className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  Relacionar Atividades Praticadas
                </h4>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Antes de registrar sua saída, informe quais atividades você praticou no clube. Treinamentos e competições vinculados a este check-in contam com comprovação de presença biométrica e GPS para seu relatório de habitualidade.
                </p>
              </div>

              {/* List of Registered Trainings in this Session */}
              {sessionTrainings.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-blue-600" />
                      Treinamentos Registrados ({sessionTrainings.length})
                    </span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                      Vinculados ao Check-in
                    </span>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {sessionTrainings.map((t, idx) => (
                      <div
                        key={t.id || idx}
                        className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 text-[11px]"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">
                            {idx + 1}. {t.weaponName}
                          </p>
                          <p className="text-slate-500 font-mono text-[10px] mt-0.5">
                            {t.weaponCaliber ? `${t.weaponCaliber} • ` : ''}
                            {t.totalShots} tiros ({t.ownAmmoShots > 0 ? `${t.ownAmmoShots} próprios` : ''}
                            {t.clubAmmoShots > 0 ? ` + ${t.clubAmmoShots} clube` : ''}) • {t.modality || 'Treino Livre'}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 font-mono font-bold px-2 py-0.5 rounded text-[10px]">
                            {t.score ? `${t.score} pts` : 'Registrado'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* List of Linked Competition Registrations */}
              {linkedRegistrations.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-600" />
                      Competições Vinculadas ({linkedRegistrations.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setStep('competition')}
                      className="text-[10px] text-amber-700 hover:text-amber-900 font-bold underline cursor-pointer"
                    >
                      Alterar Seleção
                    </button>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {linkedRegistrations.map((reg, idx) => (
                      <div
                        key={reg.id || idx}
                        className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-3 text-[11px]"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">
                            {reg.championshipTitle || 'Campeonato'}
                          </p>
                          <p className="text-slate-600 text-[10px] mt-0.5">
                            {reg.stageTitle || (reg.stageNum ? `Etapa ${reg.stageNum}` : 'Etapa')} • {reg.modalityName || 'Modalidade'}
                            {reg.weaponModel ? ` • ${reg.weaponModel}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2 py-0.5 rounded-full text-[9px]">
                            Check-in Validado
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUnlinkRegistration(reg.id)}
                            disabled={unlinkingId === reg.id}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition text-[10px] font-bold cursor-pointer"
                            title="Desvincular esta inscrição deste check-in"
                          >
                            {unlinkingId === reg.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity Action Buttons */}
              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setTrainingError('');
                    setStep('add_training');
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-bold text-xs transition flex items-center justify-between shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                      <Target className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold leading-tight">
                        {sessionTrainings.length > 0 ? '+ Registrar Novo Treinamento' : 'Registrar Treinamentos'}
                      </div>
                      <div className="text-[10px] text-blue-100 font-normal">
                        Vincular série de disparos, arma e quantidade de munições
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setStep('competition')}
                  className={`w-full p-3 rounded-xl font-bold text-xs transition flex items-center justify-between cursor-pointer border ${
                    linkedRegistrations.length > 0
                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold leading-tight">
                        {linkedRegistrations.length > 0
                          ? `Competições Vinculadas (${linkedRegistrations.length}) - Gerenciar`
                          : 'Vincular Competição / Etapas Disputadas'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-normal">
                        Marcar por checkbox inscrições realizadas nesta sessão
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {checkoutError && (
                <div className="bg-red-50 text-red-700 p-2.5 rounded-xl text-[11px] font-semibold border border-red-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{checkoutError}</span>
                </div>
              )}

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <button
                  type="button"
                  onClick={handleFinalizeCheckout}
                  disabled={submittingCheckout}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-xs transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submittingCheckout ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Registrando Saída...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      {sessionTrainings.length > 0 || linkedRegistrations.length > 0
                        ? `Finalizar Check-out (${sessionTrainings.length} treino(s) e ${linkedRegistrations.length} prova(s))`
                        : 'Finalizar Check-out e Registrar Saída'}
                    </>
                  )}
                </button>

                {sessionTrainings.length === 0 && linkedRegistrations.length === 0 && (
                  <button
                    type="button"
                    onClick={handleFinalizeCheckout}
                    disabled={submittingCheckout}
                    className="w-full text-slate-400 hover:text-slate-600 text-[10px] text-center font-medium transition cursor-pointer"
                  >
                    Sair sem registrar disparos (visita/reunião)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: ADD TRAINING FORM */}
          {step === 'add_training' && (
            <form onSubmit={handleSaveTraining} className="space-y-3.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <button
                  type="button"
                  onClick={() => setStep('activities')}
                  className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-bold text-xs cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Voltar
                </button>
                <span className="font-bold text-slate-800 text-xs">Registrar Treinamento na Visita</span>
              </div>

              {trainingError && (
                <div className="bg-red-50 text-red-700 p-2.5 rounded-xl text-[11px] font-semibold border border-red-200">
                  {trainingError}
                </div>
              )}

              {/* Data e Hora */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Data e Hora *</label>
                <input
                  type="datetime-local"
                  value={trainingForm.dateTime}
                  onChange={(e) => setTrainingForm({ ...trainingForm, dateTime: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-blue-500 outline-none transition font-mono"
                  required
                />
              </div>

              {/* Origem da Arma */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Origem da Arma *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setTrainingForm({
                        ...trainingForm,
                        weaponOwnerType: 'propria',
                        selectedWeapon: null,
                        weaponSearchQuery: '',
                      })
                    }
                    className={`py-2 px-3 rounded-xl border font-bold text-xs transition cursor-pointer ${
                      trainingForm.weaponOwnerType === 'propria'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Arma Própria
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setTrainingForm({
                        ...trainingForm,
                        weaponOwnerType: 'clube',
                        selectedWeapon: null,
                        weaponSearchQuery: '',
                      })
                    }
                    className={`py-2 px-3 rounded-xl border font-bold text-xs transition cursor-pointer ${
                      trainingForm.weaponOwnerType === 'clube'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Arma do Clube
                  </button>
                </div>
              </div>

              {/* Busca / Seleção de Arma */}
              <div className="relative">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Arma Utilizada *
                  <span className="text-[10px] text-slate-400 font-normal ml-1">
                    ({trainingForm.weaponOwnerType === 'propria' ? 'do atleta' : 'do clube'})
                  </span>
                </label>

                {trainingForm.selectedWeapon ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-blue-900 text-xs">
                        {trainingForm.selectedWeapon.manufacturer} {trainingForm.selectedWeapon.model}
                      </p>
                      <p className="text-[10px] text-blue-700 font-mono">
                        Calibre: {trainingForm.selectedWeapon.caliber} • Série:{' '}
                        {resolveWeaponSerial(trainingForm.selectedWeapon) || 'S/N'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setTrainingForm({
                          ...trainingForm,
                          selectedWeapon: null,
                          weaponSearchQuery: '',
                          weaponName: '',
                          weaponCaliber: '',
                        })
                      }
                      className="text-blue-600 hover:text-blue-800 text-xs font-bold px-2 py-1"
                    >
                      Trocar
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      placeholder="Digite modelo, calibre ou fabricante..."
                      value={trainingForm.weaponSearchQuery}
                      onChange={(e) => {
                        setTrainingForm({
                          ...trainingForm,
                          weaponSearchQuery: e.target.value,
                          weaponName: e.target.value,
                        });
                        setIsWeaponDropdownOpen(true);
                      }}
                      onFocus={() => setIsWeaponDropdownOpen(true)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-blue-500 outline-none transition"
                    />

                    {isWeaponDropdownOpen && searchFilteredWeapons.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {searchFilteredWeapons.map((w) => (
                          <button
                            key={w.id}
                            type="button"
                            onClick={() => {
                              setTrainingForm({
                                ...trainingForm,
                                selectedWeapon: w,
                                weaponSearchQuery: `${w.manufacturer || ''} ${w.model || ''}`.trim(),
                                weaponName: `${w.manufacturer || ''} ${w.model || ''}`.trim(),
                                weaponCaliber: w.caliber || '',
                              });
                              setIsWeaponDropdownOpen(false);
                            }}
                            className="w-full text-left p-2.5 hover:bg-blue-50 transition flex items-center justify-between cursor-pointer"
                          >
                            <div>
                              <p className="font-bold text-slate-800 text-xs">
                                {w.manufacturer} {w.model}
                              </p>
                              <p className="text-[10px] text-slate-500 font-mono">
                                Cal: {w.caliber} • Nº: {resolveWeaponSerial(w) || 'S/N'}
                              </p>
                            </div>
                            <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-semibold">
                              {w.ownerId === currentUser?.id ? 'Minha' : 'Clube'}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quantidade de Tiros */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Tiros Munição Própria</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={trainingForm.ownAmmoShots}
                    onChange={(e) => setTrainingForm({ ...trainingForm, ownAmmoShots: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-blue-500 outline-none transition font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Tiros Munição Clube</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={trainingForm.clubAmmoShots}
                    onChange={(e) => setTrainingForm({ ...trainingForm, clubAmmoShots: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-blue-500 outline-none transition font-mono"
                  />
                </div>
              </div>

              {/* Modalidade e Pontuação */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Modalidade</label>
                  <input
                    type="text"
                    placeholder="Ex: Treino Livre, IPSC..."
                    value={trainingForm.modality}
                    onChange={(e) => setTrainingForm({ ...trainingForm, modality: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-blue-500 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Pontos (Opcional)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={trainingForm.score || ''}
                    onChange={(e) => setTrainingForm({ ...trainingForm, score: Number(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-blue-500 outline-none transition font-mono"
                  />
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Observações (Opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Detalhes adicionais da sessão..."
                  value={trainingForm.notes}
                  onChange={(e) => setTrainingForm({ ...trainingForm, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:bg-white focus:border-blue-500 outline-none transition resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep('activities')}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingTraining}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-xl font-bold transition shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {savingTraining ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Salvar Treinamento
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: COMPETITION SELECTION (CHECKBOX LIST) */}
          {step === 'competition' && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <button
                  type="button"
                  onClick={() => setStep('activities')}
                  className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-bold text-xs cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Voltar
                </button>
                <span className="font-bold text-slate-800 text-xs">Vincular Inscrições de Competições</span>
              </div>

              {eligibleRegistrations.length > 0 && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 space-y-1">
                  <p className="font-bold text-amber-950 flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-amber-600" />
                    Selecione as etapas que você disputou nesta visita ao clube
                  </p>
                  <p className="text-amber-850">
                    Exibindo inscrições em aberto a partir de novembro de 2026. Inscrições já vinculadas a um check-in não são exibidas.
                  </p>
                </div>
              )}

              {compError && (
                <div className="bg-red-50 text-red-700 p-2.5 rounded-xl text-[11px] font-semibold border border-red-200">
                  {compError}
                </div>
              )}

              {loadingRegistrations ? (
                <div className="py-8 text-center text-slate-400 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-600" />
                  <p className="text-xs">Buscando suas inscrições...</p>
                </div>
              ) : eligibleRegistrations.length === 0 ? (
                <div className="py-7 px-4 text-center bg-blue-50/70 rounded-2xl border border-blue-200/80 space-y-3.5">
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-2xs">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-sm font-bold text-slate-800">
                      Nenhuma inscrição ativa no momento
                    </h4>
                    <p className="text-xs font-bold text-blue-800 max-w-md mx-auto leading-relaxed">
                      As participações nos campeonatos serão vinculadas automaticamente após o lançamento dos resultados.
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-normal">
                    Se você disputou uma prova nesta visita e sua inscrição ainda não consta ou foi lançada pelo clube, não se preocupe: o gestor vinculará seu check-in diretamente na homologação da súmula.
                  </p>
                  <div className="pt-1.5">
                    <button
                      type="button"
                      onClick={() => setStep('activities')}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-md shadow-blue-500/20 cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Voltar para Atividades
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                    <span>
                      {selectedRegIds.length} de {eligibleRegistrations.length} selecionada(s)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedRegIds.length === eligibleRegistrations.length) {
                          setSelectedRegIds([]);
                        } else {
                          setSelectedRegIds(eligibleRegistrations.map((r) => r.id));
                        }
                      }}
                      className="text-amber-700 hover:text-amber-900 font-bold underline cursor-pointer"
                    >
                      {selectedRegIds.length === eligibleRegistrations.length
                        ? 'Desmarcar todas'
                        : 'Selecionar todas'}
                    </button>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {eligibleRegistrations.map((reg) => {
                      const isSelected = selectedRegIds.includes(reg.id);
                      return (
                        <div
                          key={reg.id}
                          onClick={() => handleToggleRegistration(reg.id)}
                          className={`p-3 rounded-xl border transition cursor-pointer flex items-start gap-3 select-none ${
                            isSelected
                              ? 'bg-amber-50/70 border-amber-400 shadow-xs'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="mt-0.5 shrink-0 text-amber-600">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-amber-600 fill-amber-50" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs text-slate-900 truncate">
                                {reg.championshipTitle || 'Campeonato'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-600 font-medium mt-0.5 flex flex-wrap gap-x-2">
                              <span className="text-amber-800 font-bold">
                                {reg.stageTitle || (reg.stageNum ? `Etapa ${reg.stageNum}` : 'Etapa')}
                              </span>
                              <span>•</span>
                              <span>{reg.modalityName || 'Modalidade Oficial'}</span>
                              {reg.weaponModel && (
                                <>
                                  <span>•</span>
                                  <span className="text-slate-500 font-mono">
                                    {reg.weaponModel} ({reg.weaponCaliber || 'N/A'})
                                  </span>
                                </>
                              )}
                            </div>
                            {reg.registeredAt && (
                              <p className="text-[10px] text-slate-450 mt-1 font-mono">
                                Inscrito em: {new Date(reg.registeredAt).toLocaleDateString('pt-BR')}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Botões de Ação */}
              {eligibleRegistrations.length > 0 && (
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setStep('activities')}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold transition cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCompetitionLinks}
                    disabled={savingCompLinks}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white py-2.5 rounded-xl font-bold transition shadow-md shadow-amber-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {savingCompLinks ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Salvar e Vincular ({selectedRegIds.length})
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
