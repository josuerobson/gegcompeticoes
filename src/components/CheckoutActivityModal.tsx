import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock, Target, Trophy, CheckCircle2, AlertTriangle, X,
  Plus, RefreshCw, Loader2, ArrowLeft, ShieldCheck, ChevronRight
} from 'lucide-react';
import { User, Weapon, Modality, ClubCheckin, TrainingSession } from '../types';
import { normalizeSearchText, resolveWeaponSerial, formatWeaponLabel } from '../utils/textSearch';

interface CheckoutActivityModalProps {
  currentUser: User | null;
  activeCheckin: ClubCheckin;
  weapons?: Weapon[];
  modalities?: Modality[];
  staySeconds: number;
  onClose: () => void;
  onCheckoutComplete: () => void;
}

export default function CheckoutActivityModal({
  currentUser,
  activeCheckin,
  weapons = [],
  modalities = [],
  staySeconds,
  onClose,
  onCheckoutComplete,
}: CheckoutActivityModalProps) {
  // Step: 'activities' | 'add_training' | 'competition'
  const [step, setStep] = useState<'activities' | 'add_training' | 'competition'>('activities');

  // Linked trainings for this check-in
  const [sessionTrainings, setSessionTrainings] = useState<TrainingSession[]>([]);
  const [loadingSessionTrainings, setLoadingSessionTrainings] = useState(false);

  // Competition notes or stage
  const [competitionParticipation, setCompetitionParticipation] = useState<{
    eventName: string;
    stageName?: string;
    weaponName?: string;
  } | null>(null);

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

  // Competition Form State
  const [compForm, setCompForm] = useState({
    eventName: '',
    modality: '',
    notes: '',
  });

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

  useEffect(() => {
    fetchSessionTrainings();
  }, [activeCheckin.id]);

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
        checkinId: activeCheckin.id, // Vínculo explícito com o check-in!
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

      // Refresh session trainings and return to activities overview
      await fetchSessionTrainings();
      setStep('activities');
    } catch (err: any) {
      setTrainingError(err.message || 'Erro ao registrar treinamento.');
    } finally {
      setSavingTraining(false);
    }
  };

  // Handle Competition Confirm
  const handleSaveCompetition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!compForm.eventName.trim()) {
      return;
    }
    setCompetitionParticipation({
      eventName: compForm.eventName.trim(),
      stageName: compForm.modality.trim() || undefined,
    });
    setStep('activities');
  };

  // Finalize Check-out
  const handleFinalizeCheckout = async () => {
    setSubmittingCheckout(true);
    setCheckoutError('');

    try {
      // Build activities note summary
      const notesParts: string[] = [];
      if (sessionTrainings.length > 0) {
        notesParts.push(
          `${sessionTrainings.length} treinamento(s) registrado(s): ` +
            sessionTrainings.map((t) => `${t.weaponName} (${t.totalShots} tiros)`).join(', ')
        );
      }
      if (competitionParticipation) {
        notesParts.push(`Competição: ${competitionParticipation.eventName}`);
      }
      if (notesParts.length === 0) {
        notesParts.push('Saída registrada sem atividade de disparo informada.');
      }

      const res = await fetch(`/api/checkins/${activeCheckin.id}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || '',
        },
        body: JSON.stringify({
          notes: notesParts.join(' | '),
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
                  Antes de registrar sua saída, informe quais atividades você praticou no clube. Os treinamentos registrados ficarão vinculados ao seu check-in e constarão no seu relatório oficial de habitualidade para o Exército Brasileiro (SFPC).
                </p>
              </div>

              {/* List of Registered Trainings in this Session */}
              {sessionTrainings.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-blue-600" />
                      Treinamentos Registrados nesta Visita ({sessionTrainings.length})
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

              {/* Competition Card if marked */}
              {competitionParticipation && (
                <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-600" />
                    <div>
                      <p className="font-bold text-slate-900">{competitionParticipation.eventName}</p>
                      {competitionParticipation.stageName && (
                        <p className="text-slate-500 text-[10px]">{competitionParticipation.stageName}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setCompetitionParticipation(null)}
                    className="text-red-500 hover:text-red-700 text-[10px] font-bold"
                  >
                    Remover
                  </button>
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

                {!competitionParticipation && (
                  <button
                    type="button"
                    onClick={() => {
                      setCompForm({ eventName: '', modality: '', notes: '' });
                      setStep('competition');
                    }}
                    className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 p-3 rounded-xl font-bold text-xs transition flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                        <Trophy className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold leading-tight">Participação em Competição</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          Indicar que a presença foi para etapa de campeonato
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
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
                      {sessionTrainings.length > 0
                        ? `Finalizar Check-out (${sessionTrainings.length} treino(s) vinculado(s))`
                        : 'Finalizar Check-out e Registrar Saída'}
                    </>
                  )}
                </button>

                {sessionTrainings.length === 0 && !competitionParticipation && (
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

              {/* Tipo de Arma: Própria vs Clube */}
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
                        weaponCaliber: '',
                      })
                    }
                    className={`py-2 px-3 rounded-xl font-bold text-xs border transition cursor-pointer ${
                      trainingForm.weaponOwnerType === 'propria'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
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
                        weaponCaliber: '',
                      })
                    }
                    className={`py-2 px-3 rounded-xl font-bold text-xs border transition cursor-pointer ${
                      trainingForm.weaponOwnerType === 'clube'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Arma do Clube
                  </button>
                </div>
              </div>

              {/* Seleção / Busca de Arma */}
              <div className="relative">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Arma Utilizada *
                </label>
                <input
                  type="text"
                  placeholder="Buscar arma por modelo, série, sigma ou calibre..."
                  value={trainingForm.weaponSearchQuery}
                  onFocus={() => setIsWeaponDropdownOpen(true)}
                  onChange={(e) => {
                    setTrainingForm({
                      ...trainingForm,
                      weaponSearchQuery: e.target.value,
                      weaponName: e.target.value,
                      selectedWeapon: null,
                    });
                    setIsWeaponDropdownOpen(true);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-blue-500 outline-none transition"
                  required
                />

                {/* Dropdown Results */}
                {isWeaponDropdownOpen && searchFilteredWeapons.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-20 divide-y divide-slate-100">
                    {searchFilteredWeapons.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => {
                          setTrainingForm({
                            ...trainingForm,
                            selectedWeapon: w,
                            weaponName: `${w.manufacturer || ''} ${w.model || ''}`.trim(),
                            weaponCaliber: w.caliber || '',
                            weaponSearchQuery: formatWeaponLabel(w),
                          });
                          setIsWeaponDropdownOpen(false);
                        }}
                        className="w-full text-left p-2.5 hover:bg-blue-50 text-xs transition flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{formatWeaponLabel(w)}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {w.caliber ? `Calibre: ${w.caliber} • ` : ''}
                            {w.ownerId === currentUser?.id ? 'Arma Própria' : 'Acervo do Clube'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Calibre */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Calibre</label>
                <input
                  type="text"
                  placeholder="Ex: 9mm, .40, .380, .45 ACP..."
                  value={trainingForm.weaponCaliber}
                  onChange={(e) => setTrainingForm({ ...trainingForm, weaponCaliber: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-blue-500 outline-none transition"
                />
              </div>

              {/* Tiros Munição Própria vs Clube */}
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

              {/* Modalidade */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Modalidade</label>
                <input
                  type="text"
                  placeholder="Ex: Treino Livre, Precisão 25m, IPSC, IDSC..."
                  value={trainingForm.modality}
                  onChange={(e) => setTrainingForm({ ...trainingForm, modality: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-blue-500 outline-none transition"
                />
              </div>

              {/* Botões do Formulário de Treinamento */}
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

          {/* STEP 3: COMPETITION PARTICIPATION */}
          {step === 'competition' && (
            <form onSubmit={handleSaveCompetition} className="space-y-3.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <button
                  type="button"
                  onClick={() => setStep('activities')}
                  className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-bold text-xs cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Voltar
                </button>
                <span className="font-bold text-slate-800 text-xs">Participação em Competição</span>
              </div>

              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800">
                Indique o nome da prova ou campeonato que você disputou durante sua permanência no clube.
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nome do Campeonato / Prova *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Campeonato Mineiro de Silhuetas Metálicas, Copa G&G..."
                  value={compForm.eventName}
                  onChange={(e) => setCompForm({ ...compForm, eventName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-amber-500 outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Etapa / Modalidade</label>
                <input
                  type="text"
                  placeholder="Ex: Etapa 1 - Pistola Maior..."
                  value={compForm.modality}
                  onChange={(e) => setCompForm({ ...compForm, modality: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-amber-500 outline-none transition"
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
                  disabled={!compForm.eventName.trim()}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white py-2.5 rounded-xl font-bold transition shadow-md shadow-amber-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar Participação
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
