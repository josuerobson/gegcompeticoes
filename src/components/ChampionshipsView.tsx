import React, { useState, useEffect } from 'react';
import { Championship, User, Registration, StageScore, RankingItem, Modality, Stage, Weapon, WeaponLookupOption, MultiChampionship, ClubBulkRegistrationPrefill, IdscChampionship, IdscStage, IdscCourse } from '../types';
import { Trophy, Calendar, DollarSign, Target, CheckCircle, Shield, CreditCard, ChevronRight, Download, Medal, PlusCircle, X, Search, Layers, Zap, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChampionshipsProps {
  championships: Championship[];
  registrations: Registration[];
  stageScores: StageScore[];
  currentUser: User | null;
  modalities: Modality[];
  stages: Stage[];
  weapons: Weapon[];
  weaponLookupOptions?: WeaponLookupOption[];
  onRegister: (championshipId: string, modalityId: string, stageId: string, weaponId: string, crNumber: string, paymentMethod: 'pix' | 'credit_card') => Promise<{ initPoint?: string }>;
  onAddWeapon: (weapon: { ownerId?: string; manufacturer: string; model: string; caliber: string; serialNumber?: string; weaponNumber?: string; sigmaNumber?: string; weaponClass?: string; permissionStatus?: string; registrySystem?: string; weaponType?: string }) => Promise<void>;
  globalRankings: RankingItem[];
  onSelectModalityRanking: (modality: string) => void;
  selectedRankingModality: string;
  defaultImage?: string;
  onViewProfile?: (username: string) => void;
  multiChampionships?: MultiChampionship[];
  onRefreshData?: () => Promise<void>;
  onClubBulkRegister?: (prefill: ClubBulkRegistrationPrefill) => void;
}

export default function ChampionshipsView({
  championships,
  registrations,
  stageScores,
  currentUser,
  modalities,
  stages,
  weapons,
  weaponLookupOptions = [],
  onRegister,
  onAddWeapon,
  globalRankings,
  onSelectModalityRanking,
  selectedRankingModality,
  defaultImage,
  onViewProfile,
  multiChampionships = [],
  onRefreshData,
  onClubBulkRegister
}: ChampionshipsProps) {
  // Navigation states
  const [activeTab, setActiveTab] = useState<'tournaments' | 'multicampeonatos' | 'idsc'>('tournaments');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>(() => String(new Date().getFullYear()));
  const [viewingChampionship, setViewingChampionship] = useState<Championship | null>(null);
  const [selectedPremiacaoModal, setSelectedPremiacaoModal] = useState<{ champ: Championship; modality: Modality } | null>(null);
  const [selectedPremiacaoStageId, setSelectedPremiacaoStageId] = useState<string>('');

  // Multi-championship registration modal states
  const [selectedMultiReg, setSelectedMultiReg] = useState<MultiChampionship | null>(null);
  const [multiStageId, setMultiStageId] = useState('');
  const [multiModalityId, setMultiModalityId] = useState('');
  const [multiWeaponId, setMultiWeaponId] = useState('');
  const [multiCrInput, setMultiCrInput] = useState(currentUser?.crNumber || '');
  const [multiPaymentMethod, setMultiPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
  const [multiSubmitting, setMultiSubmitting] = useState(false);
  const [multiError, setMultiError] = useState('');

  const handleRegisterMultiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMultiReg) return;
    const hasItems = selectedMultiReg.items && selectedMultiReg.items.length > 0;
    if (!hasItems && !multiStageId) {
      setMultiError('Selecione a etapa das competições.');
      return;
    }
    if (!multiModalityId) {
      setMultiError('Selecione a modalidade/divisão.');
      return;
    }
    if (!multiWeaponId) {
      setMultiError('Selecione a arma a ser utilizada pesquisando no mínimo 3 caracteres.');
      return;
    }

    setMultiError('');
    setMultiSubmitting(true);

    try {
      const res = await fetch(`/api/multi-championships/${selectedMultiReg.id}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || ''
        },
        body: JSON.stringify({
          stageId: multiStageId || undefined,
          modalityId: multiModalityId,
          weaponId: multiWeaponId,
          crNumber: currentUser?.crNumber || multiCrInput || 'CR-SIMULADO',
          paymentMethod: multiPaymentMethod
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao realizar inscrição no multicampeonato.');
      if (!data.initPoint) throw new Error('Não foi possível gerar o link de pagamento.');

      // A inscrição fica pendente até o pagamento ser confirmado — o
      // checkout do Mercado Pago é a próxima etapa, não uma confirmação.
      window.location.href = data.initPoint;
    } catch (err: any) {
      setMultiError(err.message);
      setMultiSubmitting(false);
    }
  };

  const closeMultiRegModal = () => {
    setSelectedMultiReg(null);
    setMultiStageId('');
    setMultiModalityId('');
    setMultiWeaponId('');
    setSelectedWeaponId('');
    setWeaponSearchQuery('');
    setWeaponSearchResults([]);
    setSearchingWeapon(false);
    setMultiError('');
    setMultiSubmitting(false);
    setShowAddWeapon(false);
  };

  // Registration and payment popup state
  const [selectedChampReg, setSelectedChampReg] = useState<Championship | null>(null);
  const [selectedModalityId, setSelectedModalityId] = useState('');
  const [selectedStageId, setSelectedStageId] = useState('');
  const [selectedWeaponId, setSelectedWeaponId] = useState('');
  const [crInput, setCrInput] = useState(currentUser?.crNumber || '');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
  const [paymentStep, setPaymentStep] = useState<'form' | 'processing'>('form');
  const [registerError, setRegisterError] = useState('');
  const [showAddWeapon, setShowAddWeapon] = useState(false);
  const [newWeaponData, setNewWeaponData] = useState({
    weaponNumber: '',
    sigmaNumber: '',
    weaponClass: '',
    model: '',
    caliber: '',
    manufacturer: '',
    registrySystem: '',
    permissionStatus: ''
  });
  const [savingWeapon, setSavingWeapon] = useState(false);
  const [showProfileIncompleteNotice, setShowProfileIncompleteNotice] = useState(false);
  const isClubAccount = currentUser?.role === 'club_admin' || currentUser?.role === 'master_admin';

  const weaponLookup = (kind: string) => weaponLookupOptions.filter(o => o.kind === kind);

  // Weapon search states
  const [weaponSearchQuery, setWeaponSearchQuery] = useState('');
  const [weaponSearchResults, setWeaponSearchResults] = useState<Weapon[]>([]);
  const [searchingWeapon, setSearchingWeapon] = useState(false);

  const handleSearchWeapon = async (q: string) => {
    setWeaponSearchQuery(q);
    if (q.trim().length < 3) {
      setWeaponSearchResults([]);
      return;
    }
    setSearchingWeapon(true);
    try {
      const authHeaders = currentUser ? { 'x-user-id': currentUser.id } : {};
      const r = await fetch(`/api/weapons/search?q=${encodeURIComponent(q)}`, { headers: authHeaders });
      let results: Weapon[] = [];
      if (r.ok) {
        const data = await r.json();
        results = data.weapons || [];
      }
      if (results.length === 0) {
        const all = weapons || [];
        const term = q.trim().toLowerCase();
        results = all.filter(w => 
          `${w.manufacturer || ''} ${w.model || ''} ${w.caliber || ''} ${w.sigmaNumber || ''} ${w.serialNumber || ''}`.toLowerCase().includes(term)
        );
      }
      setWeaponSearchResults(results);
    } catch {
      const all = weapons || [];
      const term = q.trim().toLowerCase();
      const matches = all.filter(w => 
        `${w.manufacturer || ''} ${w.model || ''} ${w.caliber || ''} ${w.sigmaNumber || ''} ${w.serialNumber || ''}`.toLowerCase().includes(term)
      );
      setWeaponSearchResults(matches);
    } finally {
      setSearchingWeapon(false);
    }
  };

  const handleSaveNewWeapon = async (e: React.FormEvent) => {
    e.preventDefault();
    const manufacturer = newWeaponData.manufacturer.trim();
    const model = newWeaponData.model.trim();
    const caliber = newWeaponData.caliber.trim();

    if (!manufacturer || !model || !caliber) {
      alert('Preencha os campos obrigatórios: Fabricante, Modelo e Calibre.');
      return;
    }
    setSavingWeapon(true);
    try {
      await onAddWeapon({
        ownerId: currentUser?.id,
        manufacturer,
        model,
        caliber,
        weaponNumber: newWeaponData.weaponNumber.trim() || undefined,
        sigmaNumber: newWeaponData.sigmaNumber.trim() || undefined,
        serialNumber: newWeaponData.sigmaNumber.trim() || newWeaponData.weaponNumber.trim() || undefined,
        weaponClass: newWeaponData.weaponClass || undefined,
        registrySystem: newWeaponData.registrySystem || undefined,
        permissionStatus: newWeaponData.permissionStatus || undefined,
      });

      const label = `${manufacturer} ${model} (${caliber}) - Sigma: ${newWeaponData.sigmaNumber.trim() || 'N/A'}`;
      setWeaponSearchQuery(label);

      // Auto fetch the newly registered weapon to select it
      const r = await fetch(`/api/weapons/search?q=${encodeURIComponent(model)}`, {
        headers: currentUser ? { 'x-user-id': currentUser.id } : {}
      });
      if (r.ok) {
        const data = await r.json();
        if (data.weapons && data.weapons.length > 0) {
          const matched = data.weapons.find((w: Weapon) => w.manufacturer === manufacturer && w.model === model) || data.weapons[0];
          setSelectedWeaponId(matched.id);
          setMultiWeaponId(matched.id);
        }
      }

      setNewWeaponData({
        weaponNumber: '',
        sigmaNumber: '',
        weaponClass: '',
        model: '',
        caliber: '',
        manufacturer: '',
        registrySystem: '',
        permissionStatus: ''
      });
      setShowAddWeapon(false);
      setWeaponSearchResults([]);
    } catch (err: any) {
      alert(err.message || 'Erro ao cadastrar arma.');
    } finally {
      setSavingWeapon(false);
    }
  };

  const modalityName = (id: string) => {
    const m = modalities.find(mod => mod.id === id || mod.name === id);
    if (m) return m.name;
    if (id && (id.startsWith('MOD_') || id.startsWith('mod_'))) return '';
    return id;
  };

  const getValidChampModalities = (champModArray?: string[]) => {
    if (!Array.isArray(champModArray)) return [];
    return champModArray
      .map(modId => modalities.find(m => m.id === modId || m.name === modId))
      .filter((mod): mod is Modality => Boolean(mod));
  };
  const eligibleWeapons = weapons.filter(w => w.ownerId === currentUser?.id || (currentUser?.clubId && w.ownerId === currentUser.clubId));

  const isAlreadyRegistered = registrations.some(
    r => r.userId === currentUser?.id &&
         r.championshipId === selectedChampReg?.id &&
         r.stageId === selectedStageId &&
         r.modalityId === selectedModalityId
  );

  const registrationPrice = selectedChampReg 
    ? (isAlreadyRegistered 
        ? (selectedChampReg.valorReinscricao ?? selectedChampReg.registrationFee)
        : (currentUser?.role === 'club_admin'
            ? (selectedChampReg.valorInscricaoClube ?? selectedChampReg.registrationFee)
            : (selectedChampReg.valorInscricaoIndividual ?? selectedChampReg.registrationFee)))
    : 0;

  // IDSC tab navigation & data
  const [idscChampionships, setIdscChampionships] = useState<IdscChampionship[]>([]);
  const [idscStagesForChamp, setIdscStagesForChamp] = useState<IdscStage[]>([]);
  const [viewingIdscChampionship, setViewingIdscChampionship] = useState<IdscChampionship | null>(null);

  // IDSC registration modal
  const [selectedIdscCourse, setSelectedIdscCourse] = useState<{ champ: IdscChampionship; stage: IdscStage; course: IdscCourse } | null>(null);
  const [idscCrInput, setIdscCrInput] = useState(currentUser?.crNumber || '');
  const [idscSubmitting, setIdscSubmitting] = useState(false);
  const [idscError, setIdscError] = useState('');
  const [idscAlreadyRegistered, setIdscAlreadyRegistered] = useState(false);

  useEffect(() => {
    if (activeTab !== 'idsc') return;
    fetch('/api/idsc/championships', { headers: currentUser ? { 'x-user-id': currentUser.id } : {} })
      .then(r => r.json())
      .then(d => setIdscChampionships(d.idscChampionships || []))
      .catch(() => setIdscChampionships([]));
  }, [activeTab, currentUser]);

  useEffect(() => {
    if (!viewingIdscChampionship) { setIdscStagesForChamp([]); return; }
    fetch(`/api/idsc/stages?championshipId=${viewingIdscChampionship.id}`, { headers: currentUser ? { 'x-user-id': currentUser.id } : {} })
      .then(r => r.json())
      .then(d => setIdscStagesForChamp(d.idscStages || []))
      .catch(() => setIdscStagesForChamp([]));
  }, [viewingIdscChampionship, currentUser]);

  const openIdscRegistration = async (champ: IdscChampionship, stage: IdscStage, course: IdscCourse) => {
    if (isClubAccount) {
      onClubBulkRegister?.({ mode: 'idsc', championshipId: champ.id, stageId: stage.id, courseId: course.id });
      return;
    }
    if (currentUser && !currentUser.isProfileComplete) {
      setShowProfileIncompleteNotice(true);
      return;
    }
    setSelectedIdscCourse({ champ, stage, course });
    setSelectedWeaponId('');
    setWeaponSearchQuery('');
    setWeaponSearchResults([]);
    setSearchingWeapon(false);
    setIdscCrInput(currentUser?.crNumber || '');
    setIdscError('');
    setIdscSubmitting(false);
    setIdscAlreadyRegistered(false);
    setShowAddWeapon(false);

    try {
      const r = await fetch(`/api/idsc/registrations?courseId=${course.id}`, { headers: currentUser ? { 'x-user-id': currentUser.id } : {} });
      if (r.ok) {
        const data = await r.json();
        const mine = (data.idscRegistrations || []).some((reg: any) => reg.userId === currentUser?.id);
        setIdscAlreadyRegistered(mine);
      }
    } catch {
      // Não bloqueia a inscrição se a checagem de reinscrição falhar.
    }
  };

  const closeIdscRegModal = () => {
    setSelectedIdscCourse(null);
    setSelectedWeaponId('');
    setWeaponSearchQuery('');
    setWeaponSearchResults([]);
    setSearchingWeapon(false);
    setIdscError('');
    setIdscSubmitting(false);
    setShowAddWeapon(false);
  };

  const handleIdscRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIdscCourse || !selectedWeaponId) {
      setIdscError('Selecione a arma a ser utilizada pesquisando no mínimo 3 caracteres.');
      return;
    }
    setIdscError('');
    setIdscSubmitting(true);
    try {
      const res = await fetch(`/api/idsc/courses/${selectedIdscCourse.course.id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id || '' },
        body: JSON.stringify({ weaponId: selectedWeaponId, crNumber: idscCrInput || currentUser?.crNumber || 'N/A', paymentMethod: 'pix' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao realizar inscrição IDSC.');
      if (!data.initPoint) throw new Error('Não foi possível gerar o link de pagamento.');
      window.location.href = data.initPoint;
    } catch (err: any) {
      setIdscError(err.message);
      setIdscSubmitting(false);
    }
  };

  // Available unique modalities (by display name) in the database for the rankings dropdown/selector
  const allModalities = Array.from(new Set(
    championships.flatMap(c => c.modalities).map(modalityName)
  ));

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCr = currentUser?.crNumber || 'CR-SIMULADO';
    if (!selectedChampReg || !selectedModalityId || !selectedStageId || !selectedWeaponId) {
      setRegisterError('Selecione a arma a ser utilizada pesquisando no mínimo 3 caracteres.');
      return;
    }

    setRegisterError('');
    setPaymentStep('processing');

    try {
      const { initPoint } = await onRegister(selectedChampReg.id, selectedModalityId, selectedStageId, selectedWeaponId, finalCr, 'pix');
      if (!initPoint) throw new Error('Não foi possível gerar o link de pagamento.');
      window.location.href = initPoint;
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : 'Erro ao realizar inscrição.');
      setPaymentStep('form');
    }
  };


  const closeRegModal = () => {
    setSelectedChampReg(null);
    setSelectedModalityId('');
    setSelectedStageId('');
    setSelectedWeaponId('');
    setWeaponSearchQuery('');
    setWeaponSearchResults([]);
    setSearchingWeapon(false);
    setPaymentStep('form');
    setPaymentMethod('pix');
    setRegisterError('');
    setShowAddWeapon(false);
  };

  return (
    <div className="py-6 space-y-6">
      
      {/* Title & Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-[14.5px] sm:text-xl md:text-2xl font-display font-bold text-slate-900 tracking-tight flex items-center gap-1.5 whitespace-nowrap">
            <Trophy className="w-4.5 h-4.5 sm:w-6 sm:h-6 text-blue-600 shrink-0" />
            Arena de Campeonatos e Rankings
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            G&G Competições - Inscreva-se nas etapas oficiais, consulte os rankings e emita seus certificados homologados.
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl self-start">
          <button
            onClick={() => setActiveTab('tournaments')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition duration-200 ${activeTab === 'tournaments' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Campeonatos
          </button>
          <button
            onClick={() => setActiveTab('multicampeonatos')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition duration-200 ${activeTab === 'multicampeonatos' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Multicampeonatos
          </button>
          <button
            onClick={() => setActiveTab('idsc')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition duration-200 ${activeTab === 'idsc' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            IDSC
          </button>
        </div>
      </div>

      <>
          {activeTab === 'tournaments' && (
            /* ==================================================== */
            /* TOURNAMENTS LIST & DETAIL VIEW                       */
            /* ==================================================== */
            viewingChampionship ? (
              <div className="bg-white rounded-2xl smooth-shadow border border-slate-100 p-3.5 sm:p-6 space-y-4 sm:space-y-8 text-slate-800">
                {/* Header & Navigation */}
                <div className="space-y-2 sm:space-y-3 border-b border-slate-100 pb-3 sm:pb-4">
                  <button
                    onClick={() => setViewingChampionship(null)}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    ← Voltar para Campeonatos
                  </button>
                  <div className="pt-1 sm:pt-2">
                    <span className="text-[10px] sm:text-[11px] font-semibold text-slate-450 uppercase tracking-wider block">Dados da competição</span>
                    <h2 className="font-display font-black text-xl sm:text-3xl text-blue-950 uppercase tracking-tight mt-0.5">
                      {viewingChampionship.title}
                    </h2>
                    {viewingChampionship.description && viewingChampionship.description.trim() !== '' && viewingChampionship.description.trim().toLowerCase() !== viewingChampionship.title.trim().toLowerCase() && (
                      <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">{viewingChampionship.description}</p>
                    )}
                  </div>
                </div>

                {/* Download Document Buttons (Side-by-side) */}
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <button
                    onClick={() => {
                      window.open(`/api/championships/${viewingChampionship.id}/documents/regulamento`, '_blank');
                    }}
                    className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] sm:text-sm font-bold px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Download className="w-4 h-4 shrink-0" />
                    Baixar Regulamento
                  </button>

                  <button
                    onClick={() => {
                      window.open(`/api/championships/${viewingChampionship.id}/documents/sumula`, '_blank');
                    }}
                    className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] sm:text-sm font-bold px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Download className="w-4 h-4 shrink-0" />
                    Baixar Súmula
                  </button>
                </div>

                {/* Section: Modalidades */}
                <div className="space-y-2 sm:space-y-3">
                  <h3 className="font-display font-bold text-slate-900 text-sm sm:text-lg">Modalidades</h3>
                  {(() => {
                    const validMods = getValidChampModalities(viewingChampionship.modalities);
                    if (validMods.length === 0) {
                      return <p className="text-xs text-slate-400">Nenhuma modalidade cadastrada vinculada a este campeonato.</p>;
                    }
                    return (
                      <div className="space-y-1.5 sm:space-y-2">
                        {validMods.map((mod) => (
                          <div
                            key={mod.id}
                            className="bg-white border border-slate-200 rounded-xl p-2.5 sm:p-4 flex justify-between items-center hover:border-blue-400 hover:shadow-md transition shadow-xs cursor-pointer group"
                            onClick={() => {
                              setSelectedPremiacaoModal({ champ: viewingChampionship, modality: mod });
                              setSelectedPremiacaoStageId('');
                            }}
                            title="Clique para ver os dados de premiação desta modalidade"
                          >
                            <div>
                              <h4 className="font-bold text-slate-800 text-xs sm:text-sm uppercase tracking-wide group-hover:text-blue-600 transition-colors">{mod.name}</h4>
                              <p className="text-[10px] sm:text-[11px] text-slate-500 font-mono mt-0.5">
                                {mod.seriesCount || 0} séries × {mod.shotsPerSeries || 0} tiros • Avaliação: {mod.evaluationType === 'pontuacao' ? 'Pontos' : mod.evaluationType === 'tempo' ? 'Tempo' : 'Fator (Pontos/Tempo)'}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Section: Participar das etapas */}
                <div className="space-y-2.5 sm:space-y-4 pt-1 sm:pt-2">
                  <h3 className="font-display font-bold text-slate-900 text-sm sm:text-lg">Participar das etapas:</h3>
                  {(() => {
                    const champStages = stages.filter(s => s.championshipId === viewingChampionship.id);
                    if (champStages.length === 0) {
                      return (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 sm:p-8 text-center text-slate-400 text-xs">
                          Nenhuma etapa cadastrada para este campeonato ainda.
                        </div>
                      );
                    }
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4">
                        {champStages.map((stage) => {
                          const stageDateStr = new Date(stage.date).toLocaleDateString('pt-BR');
                          return (
                            <div
                              key={stage.id}
                              className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-5 text-center shadow-xs flex flex-col justify-between space-y-2.5 sm:space-y-4 hover:border-indigo-300 transition"
                            >
                              <div className="space-y-1">
                                <h4 className="font-display font-bold text-slate-900 text-xs sm:text-sm uppercase">
                                  {stage.title || `${stage.stageNum}ª ETAPA`}
                                </h4>
                                <p className="text-[11px] sm:text-xs text-slate-500 font-mono">{stageDateStr}</p>
                                {stage.description && (
                                  <p className="text-[10px] sm:text-[11px] text-slate-400 line-clamp-2 mt-0.5">{stage.description}</p>
                                )}
                              </div>

                              <button
                                onClick={() => {
                                  if (isClubAccount) {
                                    onClubBulkRegister?.({ mode: 'individual', championshipId: viewingChampionship.id, stageId: stage.id });
                                    return;
                                  }
                                  if (currentUser && !currentUser.isProfileComplete) {
                                    setShowProfileIncompleteNotice(true);
                                    return;
                                  }
                                  setSelectedChampReg(viewingChampionship);
                                  setSelectedStageId(stage.id);
                                  setSelectedModalityId(viewingChampionship.modalities[0] || '');
                                  setSelectedWeaponId('');
                                  setWeaponSearchQuery('');
                                  setWeaponSearchResults([]);
                                  setSearchingWeapon(false);
                                  setPaymentStep('form');
                                  setPaymentMethod('pix');
                                  setRegisterError('');
                                  setShowAddWeapon(false);
                                }}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 sm:py-2.5 rounded-xl shadow-xs transition cursor-pointer"
                              >
                                Participar
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : (() => {
              const availableYears = Array.from(
                new Set(championships.map(c => new Date(c.startDate).getFullYear()).filter(y => !isNaN(y)))
              ).sort((a, b) => b - a);
              const yearFilteredChampionships = selectedYearFilter === 'todos'
                ? championships
                : championships.filter(c => new Date(c.startDate).getFullYear().toString() === selectedYearFilter);

              return (
                <div className="space-y-3 sm:space-y-4">
                  {/* Filtro por ano */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    <button
                      onClick={() => setSelectedYearFilter('todos')}
                      className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${selectedYearFilter === 'todos' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      Todos
                    </button>
                    {availableYears.map(year => (
                      <button
                        key={year}
                        onClick={() => setSelectedYearFilter(year.toString())}
                        className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${selectedYearFilter === year.toString() ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        {year}
                      </button>
                    ))}
                  </div>

                  {yearFilteredChampionships.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs">
                      Nenhum campeonato encontrado {selectedYearFilter !== 'todos' ? `em ${selectedYearFilter}` : ''}.
                    </div>
                  ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-5">
                {yearFilteredChampionships.map((champ) => {
                  const isFinished = champ.status === 'completed';
                  const isMyRegsList = registrations.filter(r => r.championshipId === champ.id && r.userId === currentUser?.id);
                  const isRegistered = isMyRegsList.length > 0;

                  return (
                    <div
                      key={champ.id}
                      onClick={() => setViewingChampionship(champ)}
                      className="bg-white dark:bg-slate-900 rounded-2xl smooth-shadow border border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:shadow-md transition duration-200 cursor-pointer overflow-hidden flex flex-col justify-between p-2.5 sm:p-4 space-y-2 sm:space-y-3 group"
                    >
                      {/* Top Info: Status badges & Title */}
                      <div className="space-y-2">
                        {/* Status Badges */}
                        <div className="flex flex-wrap items-center gap-1">
                          {isFinished ? (
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-slate-500" /> Finalizado
                            </span>
                          ) : (
                            <span className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-emerald-500" /> Abertas
                            </span>
                          )}
                          
                          {isRegistered && (
                            <span className="bg-blue-600 text-white text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider">
                              Inscrito ({isMyRegsList.length})
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="font-display font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition line-clamp-2">
                          {champ.title}
                        </h3>

                        {champ.description && champ.description.trim() !== '' && champ.description.trim().toLowerCase() !== champ.title.trim().toLowerCase() && (
                          <p className="text-slate-500 dark:text-slate-400 text-[10.5px] leading-relaxed line-clamp-2">{champ.description}</p>
                        )}
                      </div>

                      {/* Bottom Info Grid & Action */}
                      <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                        <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-slate-600 dark:text-slate-300">
                          <div>
                            <span className="text-[8.5px] text-slate-400 uppercase block font-sans font-bold">Etapas</span>
                            <span className="font-semibold font-sans">{champ.stagesCount}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[8.5px] text-slate-400 uppercase block font-sans font-bold">Inscrição</span>
                            <span className="text-blue-600 dark:text-blue-400 font-bold font-sans">
                              R$ {currentUser?.role === 'club_admin'
                                ? (champ.valorInscricaoClube ?? champ.registrationFee ?? 0)
                                : (champ.valorInscricaoIndividual ?? champ.registrationFee ?? 0)}
                            </span>
                          </div>
                        </div>

                        {/* Action Button */}
                        {isFinished ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingChampionship(champ);
                            }}
                            className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10.5px] font-bold py-2 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            Ver e Participar
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingChampionship(champ);
                            }}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[10.5px] font-bold py-2 rounded-xl transition flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                          >
                            Ver Etapas
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
                  )}
                </div>
              );
            })()
          )}

          {activeTab === 'multicampeonatos' && (
            /* ==================================================== */
            /* MULTICAMPEONATOS TAB FOR ATHLETES                    */
            /* ==================================================== */
            <div className="bg-white rounded-2xl smooth-shadow border border-slate-100 p-5 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-display font-bold text-slate-900 text-base flex items-center gap-2">
                    <Layers className="w-5 h-5 text-blue-600" /> Multi-campeonatos G&G
                  </h3>
                  <p className="text-xs text-slate-400">
                    Inscreva-se em pacotes promocionais de campeonatos com valor único de inscrição.
                  </p>
                </div>
              </div>

              {multiChampionships.filter(m => m.status === 'active').length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl">
                  <Trophy className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 font-medium text-sm">Nenhum multicampeonato disponível para inscrição no momento.</p>
                  <p className="text-xs text-slate-400">Novos pacotes de campeonatos serão publicados em breve pela direção.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {multiChampionships.filter(m => m.status === 'active').map(multi => {
                    const includedChamps = championships.filter(c => multi.championshipIds.includes(c.id));
                    return (
                      <div key={multi.id} className="bg-slate-50/50 border border-slate-200 rounded-2xl p-5 space-y-4 flex flex-col justify-between hover:shadow-md transition">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <span className="text-[10px] font-extrabold uppercase bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                                Pacote Promocional
                              </span>
                              <h4 className="font-display font-bold text-slate-900 text-lg mt-1">{multi.title}</h4>
                            </div>
                            <div className="text-right">
                              <span className="text-xs text-slate-400 block font-semibold">Valor Único</span>
                              <span className="text-xl font-extrabold text-blue-600">R$ {Number(multi.registrationFee).toFixed(2)}</span>
                            </div>
                          </div>

                          {multi.description && (
                            <p className="text-xs text-slate-600 leading-relaxed bg-white/60 p-3 rounded-xl border border-slate-100">
                              {multi.description}
                            </p>
                          )}

                          <div className="space-y-2 pt-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Campeonatos e Etapas Incluídos ({multi.items && multi.items.length > 0 ? multi.items.length : includedChamps.length}):
                            </span>
                            <div className="space-y-1.5">
                              {multi.items && multi.items.length > 0 ? (
                                multi.items.map(it => {
                                  const ic = championships.find(c => c.id === it.championshipId);
                                  const st = stages.find(s => s.id === it.stageId);
                                  return (
                                    <div key={it.championshipId} className="bg-white border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between text-xs">
                                      <div className="flex items-center gap-2 font-bold text-slate-800">
                                        <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                                        <div>
                                          <span>{ic?.title || 'Campeonato'}</span>
                                          <span className="block text-[11px] font-semibold text-blue-700">
                                            {st?.title || 'Etapa'} {st?.date ? `(${st.date.split('T')[0]})` : ''}
                                          </span>
                                        </div>
                                      </div>
                                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 shrink-0">
                                        Incluso
                                      </span>
                                    </div>
                                  );
                                })
                              ) : (
                                includedChamps.map(ic => (
                                  <div key={ic.id} className="bg-white border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2 font-bold text-slate-800">
                                      <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                                      <span>{ic.title}</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                      Incluso
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-200/80">
                          <button
                            onClick={() => {
                              if (!currentUser) {
                                alert('Faça login para se inscrever no multicampeonato.');
                                return;
                              }
                              if (isClubAccount) {
                                onClubBulkRegister?.({ mode: 'multi', multiChampionshipId: multi.id });
                                return;
                              }
                              setSelectedMultiReg(multi);
                              setMultiStageId(stages.length > 0 ? stages[0].id : '');
                              setMultiModalityId(modalities.length > 0 ? modalities[0].id : '');
                              setMultiWeaponId('');
                              setSelectedWeaponId('');
                              setWeaponSearchQuery('');
                              setWeaponSearchResults([]);
                              setSearchingWeapon(false);
                              setMultiError('');
                              setMultiSubmitting(false);
                              setShowAddWeapon(false);
                            }}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 rounded-xl transition shadow-md shadow-blue-100 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Target className="w-4 h-4" /> Inscrever-se neste Multicampeonato
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'idsc' && (
            /* ==================================================== */
            /* IDSC TAB — CAMPEONATOS DE TIRO DINÂMICO POR TEMPO    */
            /* ==================================================== */
            viewingIdscChampionship ? (
              <div className="bg-white rounded-2xl smooth-shadow border border-slate-100 p-3.5 sm:p-6 space-y-4 sm:space-y-8 text-slate-800">
                <div className="space-y-2 sm:space-y-3 border-b border-slate-100 pb-3 sm:pb-4">
                  <button
                    onClick={() => setViewingIdscChampionship(null)}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    ← Voltar para IDSC
                  </button>
                  <div className="pt-1 sm:pt-2">
                    <span className="text-[10px] sm:text-[11px] font-semibold text-slate-450 uppercase tracking-wider block">Campeonato IDSC</span>
                    <h2 className="font-display font-black text-xl sm:text-3xl text-blue-950 uppercase tracking-tight mt-0.5">
                      {viewingIdscChampionship.title}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed font-mono">
                      Inscrição individual: R$ {Number(viewingIdscChampionship.individualRegistrationFee || 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 sm:space-y-4">
                  <h3 className="font-display font-bold text-slate-900 text-sm sm:text-lg">Etapas e Pistas</h3>
                  {idscStagesForChamp.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 sm:p-8 text-center text-slate-400 text-xs">
                      Nenhuma etapa cadastrada para este campeonato ainda.
                    </div>
                  ) : (
                    <div className="space-y-4 sm:space-y-6">
                      {idscStagesForChamp.map(stage => (
                        <div key={stage.id} className="space-y-2">
                          <h4 className="font-display font-bold text-slate-800 text-xs sm:text-sm uppercase tracking-wide flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-blue-500" />
                            {stage.title}
                            {stage.startDate && (
                              <span className="text-[10px] text-slate-400 font-mono normal-case">
                                ({new Date(stage.startDate).toLocaleDateString('pt-BR')})
                              </span>
                            )}
                          </h4>
                          {stage.description && <p className="text-[10px] sm:text-[11px] text-slate-400">{stage.description}</p>}
                          {(stage.courses || []).length === 0 ? (
                            <p className="text-[10px] text-slate-400 italic">Nenhuma pista cadastrada nesta etapa.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4">
                              {(stage.courses || []).map(course => (
                                <div
                                  key={course.id}
                                  className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-5 text-center shadow-xs flex flex-col justify-between space-y-2.5 sm:space-y-4 hover:border-indigo-300 transition"
                                >
                                  <div className="space-y-1">
                                    <h5 className="font-display font-bold text-slate-900 text-xs sm:text-sm uppercase flex items-center justify-center gap-1.5">
                                      <Zap className="w-3.5 h-3.5 text-amber-500" /> {course.name}
                                    </h5>
                                    <p className="text-[10.5px] sm:text-xs text-slate-500 font-mono">
                                      {course.targetCount} alvos × {course.shotsPerTarget} tiros
                                      {course.timeLimitSeconds ? ` · limite ${course.timeLimitSeconds}s` : ''}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => openIdscRegistration(viewingIdscChampionship, stage, course)}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 sm:py-2.5 rounded-xl shadow-xs transition cursor-pointer"
                                  >
                                    Participar
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {idscChampionships.filter(c => c.status === 'active').length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs">
                    Nenhum campeonato IDSC disponível no momento.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-5">
                    {idscChampionships.filter(c => c.status === 'active').map(champ => (
                      <div
                        key={champ.id}
                        onClick={() => setViewingIdscChampionship(champ)}
                        className="bg-white dark:bg-slate-900 rounded-2xl smooth-shadow border border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:shadow-md transition duration-200 cursor-pointer overflow-hidden flex flex-col justify-between p-2.5 sm:p-4 space-y-2 sm:space-y-3 group"
                      >
                        <div className="space-y-2">
                          <span className="bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider flex items-center gap-1 w-fit">
                            <Zap className="w-3 h-3 text-amber-500" /> IDSC
                          </span>
                          <h3 className="font-display font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition line-clamp-2">
                            {champ.title}
                          </h3>
                        </div>

                        <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                          <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-slate-600 dark:text-slate-300">
                            <div>
                              <span className="text-[8.5px] text-slate-400 uppercase block font-sans font-bold">Tipo</span>
                              <span className="font-semibold font-sans">{champ.championshipType === 'clubes' ? 'Clubes' : 'Individual'}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[8.5px] text-slate-400 uppercase block font-sans font-bold">Inscrição</span>
                              <span className="text-blue-600 dark:text-blue-400 font-bold font-sans">
                                R$ {currentUser?.role === 'club_admin' ? Number(champ.clubRegistrationFee || 0) : Number(champ.individualRegistrationFee || 0)}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={(e) => { e.stopPropagation(); setViewingIdscChampionship(champ); }}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[10.5px] font-bold py-2 rounded-xl transition flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                          >
                            Ver Etapas
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          )}
        </>

      {/* REGISTRATION & PAYMENT MODAL WINDOW */}
      <AnimatePresence>
        {selectedChampReg && (
          <div
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeRegModal();
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white max-w-lg w-full rounded-2xl smooth-shadow overflow-hidden max-h-[90vh] flex flex-col my-auto"
            >
              <div className="bg-blue-900 text-white p-4 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <span className="font-display font-semibold text-sm">Ficha de Inscrição Oficial</span>
                </div>
                <button
                  type="button"
                  onClick={closeRegModal}
                  className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer text-base leading-none font-bold"
                  title="Fechar janela"
                >
                  ✕
                </button>
              </div>

              {paymentStep === 'form' && (
                <form onSubmit={handleRegisterSubmit} className="p-5 space-y-4 flex-1 overflow-y-auto">
                  <div className="bg-blue-50 p-3 rounded-lg flex flex-col gap-1 text-xs">
                    <div className="flex items-center justify-between text-blue-900">
                      <span className="font-semibold">{selectedChampReg.title}</span>
                      <span className="font-bold">R$ {registrationPrice.toFixed(2)}</span>
                    </div>
                    {isAlreadyRegistered && (
                      <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block mt-0.5">
                        ✨ Reinscrição (Tarifa Promocional)
                      </span>
                    )}
                  </div>

                  {registerError && (
                    <div className="bg-red-50 border border-red-100 text-red-700 text-xs p-2.5 rounded-lg font-medium">
                      {registerError}
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase block font-semibold">Escolha a Modalidade de Disputa</label>
                    <select
                      value={selectedModalityId}
                      onChange={(e) => {
                        setSelectedModalityId(e.target.value);
                        setSelectedWeaponId('');
                        setWeaponSearchQuery('');
                        setWeaponSearchResults([]);
                        setSearchingWeapon(false);
                        setRegisterError('');
                      }}
                      className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700 font-semibold"
                    >
                      {getValidChampModalities(selectedChampReg.modalities).map((mod) => (
                        <option key={mod.id} value={mod.id}>{mod.name}</option>
                      ))}
                    </select>
                    {(() => {
                      const mod = modalities.find(m => m.id === selectedModalityId);
                      if (!mod || (!mod.seriesCount && !mod.shotsPerSeries && !mod.timePerSeriesMinutes)) return null;
                      return (
                        <div className="text-[10px] text-slate-500 bg-slate-50 border border-slate-100 rounded-lg p-2 font-mono flex flex-wrap gap-x-3 gap-y-0.5">
                          {mod.seriesCount && <span>Séries: <b>{mod.seriesCount}</b></span>}
                          {mod.shotsPerSeries && <span>Tiros/série: <b>{mod.shotsPerSeries}</b></span>}
                          {mod.timePerSeriesMinutes && <span>Tempo: <b>{mod.timePerSeriesMinutes} min</b></span>}
                          {mod.evaluationType && <span>Avaliação: <b>{mod.evaluationType === 'pontuacao' ? 'Pontuação' : mod.evaluationType === 'tempo' ? 'Tempo' : 'Pontuação + Tempo'}</b></span>}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase block font-semibold">Etapa</label>
                    <select
                      value={selectedStageId}
                      onChange={(e) => {
                        setSelectedStageId(e.target.value);
                        setSelectedWeaponId('');
                        setWeaponSearchQuery('');
                        setWeaponSearchResults([]);
                        setSearchingWeapon(false);
                        setRegisterError('');
                      }}
                      className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700 font-semibold"
                    >
                      <option value="">Selecione a etapa</option>
                      {stages.filter(s => {
                        if (s.championshipId !== selectedChampReg.id) return false;
                        if (!currentUser) return true;
                        const stageSex = s.sexo || 'misto';
                        if (stageSex === 'misto') return true;
                        const userSex = (currentUser.sex || '').toLowerCase();
                        return userSex === stageSex.toLowerCase();
                      }).map(s => (
                        <option key={s.id} value={s.id}>
                          {s.title} — {new Date(s.date).toLocaleDateString('pt-BR')} {s.sexo && s.sexo !== 'misto' ? `(${s.sexo === 'feminino' ? 'Feminino 👩' : 'Masculino 👨'})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 3. Seleção de Arma via Pesquisa + Cadastrar Nova Arma */}
                  <div className="space-y-1 relative">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[10px] text-slate-500 uppercase block font-semibold">
                        Arma a ser utilizada <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAddWeapon(true)}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        + Cadastrar Nova Arma
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Digite fabricante, modelo, calibre ou número Sigma..."
                        value={weaponSearchQuery}
                        onChange={(e) => handleSearchWeapon(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-800 font-medium pl-9 shadow-xs"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                      {searchingWeapon && <span className="absolute right-3 top-3.5 text-[10px] text-blue-600 font-bold">Buscando...</span>}
                    </div>

                    {weaponSearchQuery.length > 0 && weaponSearchQuery.length < 3 && (
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-[10.5px] text-amber-600 font-medium">
                          Digite mais {3 - weaponSearchQuery.length} caractere(s) para pesquisar...
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setNewWeaponData(prev => ({ ...prev, model: weaponSearchQuery }));
                            setShowAddWeapon(true);
                          }}
                          className="text-[10.5px] font-bold text-blue-600 hover:underline cursor-pointer"
                        >
                          + Cadastrar Nova Arma
                        </button>
                      </div>
                    )}

                    {/* Weapon Search Results Dropdown */}
                    {weaponSearchQuery.length >= 3 && (
                      <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                        {weaponSearchResults.length === 0 ? (
                          <div className="p-4 text-center space-y-2">
                            <p className="text-slate-500 text-xs">Nenhuma arma encontrada para "{weaponSearchQuery}".</p>
                            <button
                              type="button"
                              onClick={() => {
                                setNewWeaponData(prev => ({ ...prev, model: weaponSearchQuery }));
                                setShowAddWeapon(true);
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 mx-auto cursor-pointer shadow-xs"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              Cadastrar Nova Arma Agora
                            </button>
                          </div>
                        ) : (
                          <>
                            {weaponSearchResults.map(w => (
                              <button
                                key={w.id}
                                type="button"
                                onClick={() => {
                                  setSelectedWeaponId(w.id);
                                  setWeaponSearchQuery(`${w.manufacturer || ''} ${w.model || ''} (${w.caliber || 'Sem calibre'}) - Sigma: ${w.sigmaNumber || 'N/A'}`.trim());
                                  setWeaponSearchResults([]);
                                }}
                                className="w-full text-left p-3 hover:bg-blue-50 transition flex items-center justify-between cursor-pointer"
                              >
                                <div>
                                  <div className="font-bold text-slate-900 text-xs">
                                    {w.manufacturer} {w.model} <span className="text-blue-600 font-mono text-[11px]">({w.caliber})</span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                    Sigma: {w.sigmaNumber || 'N/A'} | Série: {w.serialNumber || 'N/A'}
                                  </div>
                                </div>
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                  Selecionar
                                </span>
                              </button>
                            ))}
                            <div className="p-2.5 bg-slate-50 text-center">
                              <button
                                type="button"
                                onClick={() => setShowAddWeapon(true)}
                                className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
                              >
                                <PlusCircle className="w-3.5 h-3.5" />
                                Sua arma não está na lista? Cadastrar Nova Arma
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Selected Weapon Badge Confirmation */}
                    {selectedWeaponId && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between mt-2 text-xs">
                        <div className="flex items-center gap-2 truncate pr-2">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="font-bold text-emerald-950 truncate">Arma: {weaponSearchQuery}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedWeaponId('');
                            setWeaponSearchQuery('');
                            setWeaponSearchResults([]);
                          }}
                          className="text-[10px] text-slate-500 hover:text-red-600 font-bold underline cursor-pointer shrink-0"
                        >
                          Trocar
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Payment Info: Exclusivamente PIX */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[10px] text-slate-500 uppercase block font-semibold">Forma de Pagamento</label>
                    <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                        PIX
                      </div>
                      <div>
                        <span className="font-bold text-blue-950 text-xs block">Pagamento via PIX</span>
                        <span className="text-[10px] text-blue-700">Aprovação e homologação imediata da inscrição</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-3">
                    <button
                      type="button"
                      onClick={closeRegModal}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-semibold text-xs transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold text-xs shadow-md shadow-blue-100 transition"
                    >
                      Confirmar e Pagar
                    </button>
                  </div>
                </form>
              )}

              {paymentStep === 'processing' && (
                <div className="p-8 text-center space-y-4 flex-1 overflow-y-auto">
                  <div className="relative w-12 h-12 mx-auto">
                    <div className="w-12 h-12 rounded-full border-4 border-slate-200 animate-spin border-t-blue-600"></div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-800 text-sm">Redirecionando para o Mercado Pago...</h4>
                    <p className="text-xs text-slate-400">Você vai concluir o pagamento no checkout seguro do Mercado Pago.</p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile incomplete notice */}
      <AnimatePresence>
        {showProfileIncompleteNotice && (
          <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white max-w-sm w-full rounded-2xl smooth-shadow overflow-hidden text-slate-800 p-6 text-center space-y-4"
            >
              <div className="bg-amber-50 text-amber-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Cadastro incompleto</h4>
                <p className="text-xs text-slate-500 mt-1">Complete seu cadastro para se inscrever em campeonatos. Saia da conta e finalize o cadastro na tela de entrada.</p>
              </div>
              <button
                onClick={() => setShowProfileIncompleteNotice(false)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-semibold text-xs transition"
              >
                Entendi
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sub-modal: Cadastrar Nova Arma na Inscrição */}
      <AnimatePresence>
        {showAddWeapon && (
          <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white max-w-md w-full rounded-2xl smooth-shadow overflow-hidden text-slate-800 p-6 space-y-4 text-left"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-blue-600" />
                  <h4 className="font-bold text-slate-900 text-sm">Cadastrar Nova Arma</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddWeapon(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveNewWeapon} className="space-y-3 text-xs">
                {/* Número da arma & Número Sigma */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Número da arma</label>
                    <input
                      type="text"
                      placeholder="Número da arma"
                      value={newWeaponData.weaponNumber}
                      onChange={(e) => setNewWeaponData(prev => ({ ...prev, weaponNumber: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl focus:border-blue-500 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Número Sigma</label>
                    <input
                      type="text"
                      placeholder="Número Sigma"
                      value={newWeaponData.sigmaNumber}
                      onChange={(e) => setNewWeaponData(prev => ({ ...prev, sigmaNumber: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl focus:border-blue-500 text-xs font-medium"
                    />
                  </div>
                </div>

                {/* Classe */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Classe</label>
                  <select
                    value={newWeaponData.weaponClass}
                    onChange={(e) => setNewWeaponData(prev => ({ ...prev, weaponClass: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl focus:border-blue-500 text-xs font-medium cursor-pointer"
                  >
                    <option value="">Classe...</option>
                    {weaponLookup('classe').map(o => <option key={o.id} value={o.label}>{o.label}</option>)}
                    {!weaponLookup('classe').some(o => o.label === 'Pistola') && <option value="Pistola">Pistola</option>}
                    {!weaponLookup('classe').some(o => o.label === 'Revólver') && <option value="Revólver">Revólver</option>}
                    {!weaponLookup('classe').some(o => o.label === 'Espingarda') && <option value="Espingarda">Espingarda</option>}
                    {!weaponLookup('classe').some(o => o.label === 'Fuzil') && <option value="Fuzil">Fuzil</option>}
                    {!weaponLookup('classe').some(o => o.label === 'Carabina') && <option value="Carabina">Carabina</option>}
                  </select>
                </div>

                {/* Modelo & Calibre */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Modelo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Digite ou selecione..."
                      list="weapon-model-list"
                      value={newWeaponData.model}
                      onChange={(e) => setNewWeaponData(prev => ({ ...prev, model: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl focus:border-blue-500 text-xs font-medium"
                    />
                    <datalist id="weapon-model-list">
                      {weaponLookup('modelo').map(o => <option key={o.id} value={o.label} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Calibre *</label>
                    <input
                      type="text"
                      required
                      placeholder="Digite ou selecione..."
                      list="weapon-caliber-list"
                      value={newWeaponData.caliber}
                      onChange={(e) => setNewWeaponData(prev => ({ ...prev, caliber: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl focus:border-blue-500 text-xs font-medium"
                    />
                    <datalist id="weapon-caliber-list">
                      {weaponLookup('calibre').map(o => <option key={o.id} value={o.label} />)}
                    </datalist>
                  </div>
                </div>

                {/* Fabricante */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Fabricante *</label>
                  <input
                    type="text"
                    required
                    placeholder="Digite ou selecione fabricante..."
                    list="weapon-manufacturer-list"
                    value={newWeaponData.manufacturer}
                    onChange={(e) => setNewWeaponData(prev => ({ ...prev, manufacturer: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl focus:border-blue-500 text-xs font-medium"
                  />
                  <datalist id="weapon-manufacturer-list">
                    {weaponLookup('fabricante').map(o => <option key={o.id} value={o.label} />)}
                  </datalist>
                </div>

                {/* Arma é... & Status de permissão... */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Arma é...</label>
                    <select
                      value={newWeaponData.registrySystem}
                      onChange={(e) => setNewWeaponData(prev => ({ ...prev, registrySystem: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl focus:border-blue-500 text-xs font-medium cursor-pointer"
                    >
                      <option value="">Arma é...</option>
                      {weaponLookup('tipo_arma').map(o => <option key={o.id} value={o.label}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Status de permissão...</label>
                    <select
                      value={newWeaponData.permissionStatus}
                      onChange={(e) => setNewWeaponData(prev => ({ ...prev, permissionStatus: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl focus:border-blue-500 text-xs font-medium cursor-pointer"
                    >
                      <option value="">Status de permissão...</option>
                      {weaponLookup('permissao_arma').map(o => <option key={o.id} value={o.label}>{o.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddWeapon(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingWeapon}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    {savingWeapon ? 'Cadastrando...' : 'Salvar e Selecionar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* IDSC REGISTRATION MODAL */}
      <AnimatePresence>
        {selectedIdscCourse && (
          <div
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeIdscRegModal();
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white max-w-lg w-full rounded-2xl smooth-shadow overflow-hidden max-h-[90vh] flex flex-col my-auto"
            >
              <div className="bg-blue-900 text-white p-4 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <span className="font-display font-semibold text-sm">Inscrição IDSC — {selectedIdscCourse.course.name}</span>
                </div>
                <button
                  type="button"
                  onClick={closeIdscRegModal}
                  className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer text-base leading-none font-bold"
                  title="Fechar janela"
                >
                  ✕
                </button>
              </div>

                <form onSubmit={handleIdscRegisterSubmit} className="p-5 space-y-4 flex-1 overflow-y-auto">
                  <div className="bg-blue-50 p-3 rounded-lg flex flex-col gap-1 text-xs">
                    <div className="flex items-center justify-between text-blue-900">
                      <span className="font-semibold">{selectedIdscCourse.champ.title} · {selectedIdscCourse.stage.title}</span>
                      <span className="font-bold">R$ {Number(selectedIdscCourse.champ.individualRegistrationFee || 0).toFixed(2)}</span>
                    </div>
                    <span className="text-[10px] text-blue-700 font-mono">
                      {selectedIdscCourse.course.name} · {selectedIdscCourse.course.targetCount} alvos × {selectedIdscCourse.course.shotsPerTarget} tiros
                    </span>
                    {idscAlreadyRegistered && (
                      <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block mt-0.5">
                        ✨ Você já está inscrito nesta pista — esta será uma reinscrição
                      </span>
                    )}
                  </div>

                  {idscError && (
                    <div className="bg-red-50 border border-red-100 text-red-700 text-xs p-2.5 rounded-lg font-medium">
                      {idscError}
                    </div>
                  )}

                  {/* Seleção de Arma via Pesquisa + Cadastrar Nova Arma */}
                  <div className="space-y-1 relative">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[10px] text-slate-500 uppercase block font-semibold">
                        Arma a ser utilizada <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAddWeapon(true)}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        + Cadastrar Nova Arma
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Digite fabricante, modelo, calibre ou número Sigma..."
                        value={weaponSearchQuery}
                        onChange={(e) => handleSearchWeapon(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-800 font-medium pl-9 shadow-xs"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                      {searchingWeapon && <span className="absolute right-3 top-3.5 text-[10px] text-blue-600 font-bold">Buscando...</span>}
                    </div>

                    {weaponSearchQuery.length > 0 && weaponSearchQuery.length < 3 && (
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-[10.5px] text-amber-600 font-medium">
                          Digite mais {3 - weaponSearchQuery.length} caractere(s) para pesquisar...
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setNewWeaponData(prev => ({ ...prev, model: weaponSearchQuery }));
                            setShowAddWeapon(true);
                          }}
                          className="text-[10.5px] font-bold text-blue-600 hover:underline cursor-pointer"
                        >
                          + Cadastrar Nova Arma
                        </button>
                      </div>
                    )}

                    {weaponSearchQuery.length >= 3 && (
                      <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                        {weaponSearchResults.length === 0 ? (
                          <div className="p-4 text-center space-y-2">
                            <p className="text-slate-500 text-xs">Nenhuma arma encontrada para "{weaponSearchQuery}".</p>
                            <button
                              type="button"
                              onClick={() => {
                                setNewWeaponData(prev => ({ ...prev, model: weaponSearchQuery }));
                                setShowAddWeapon(true);
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 mx-auto cursor-pointer shadow-xs"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              Cadastrar Nova Arma Agora
                            </button>
                          </div>
                        ) : (
                          <>
                            {weaponSearchResults.map(w => (
                              <button
                                key={w.id}
                                type="button"
                                onClick={() => {
                                  setSelectedWeaponId(w.id);
                                  setWeaponSearchQuery(`${w.manufacturer || ''} ${w.model || ''} (${w.caliber || 'Sem calibre'}) - Sigma: ${w.sigmaNumber || 'N/A'}`.trim());
                                  setWeaponSearchResults([]);
                                }}
                                className="w-full text-left p-3 hover:bg-blue-50 transition flex items-center justify-between cursor-pointer"
                              >
                                <div>
                                  <div className="font-bold text-slate-900 text-xs">
                                    {w.manufacturer} {w.model} <span className="text-blue-600 font-mono text-[11px]">({w.caliber})</span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                    Sigma: {w.sigmaNumber || 'N/A'} | Série: {w.serialNumber || 'N/A'}
                                  </div>
                                </div>
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                  Selecionar
                                </span>
                              </button>
                            ))}
                            <div className="p-2.5 bg-slate-50 text-center">
                              <button
                                type="button"
                                onClick={() => setShowAddWeapon(true)}
                                className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
                              >
                                <PlusCircle className="w-3.5 h-3.5" />
                                Sua arma não está na lista? Cadastrar Nova Arma
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {selectedWeaponId && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between mt-2 text-xs">
                        <div className="flex items-center gap-2 truncate pr-2">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="font-bold text-emerald-950 truncate">Arma: {weaponSearchQuery}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedWeaponId('');
                            setWeaponSearchQuery('');
                            setWeaponSearchResults([]);
                          }}
                          className="text-[10px] text-slate-500 hover:text-red-600 font-bold underline cursor-pointer shrink-0"
                        >
                          Trocar
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase block font-semibold">Número do CR</label>
                    <input
                      type="text"
                      value={idscCrInput}
                      onChange={(e) => setIdscCrInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700 font-semibold"
                      placeholder="Ex: 123456"
                    />
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <label className="text-[10px] text-slate-500 uppercase block font-semibold">Forma de Pagamento</label>
                    <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                        PIX
                      </div>
                      <div>
                        <span className="font-bold text-blue-950 text-xs block">Pagamento via PIX</span>
                        <span className="text-[10px] text-blue-700">Aprovação e homologação imediata da inscrição</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-3">
                    <button
                      type="button"
                      onClick={closeIdscRegModal}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-semibold text-xs transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={idscSubmitting}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold text-xs shadow-md shadow-blue-100 transition disabled:opacity-60"
                    >
                      {idscSubmitting ? 'Enviando...' : 'Confirmar e Pagar'}
                    </button>
                  </div>
                </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: DADOS DA PREMIAÇÃO */}
      {selectedPremiacaoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedPremiacaoModal(null);
          }}
        >
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-2xl overflow-hidden shadow-2xl text-slate-800 flex flex-col max-h-[90vh] text-left">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-base sm:text-lg">
                  Dados da Premiação
                </h3>
                <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider mt-0.5">
                  {selectedPremiacaoModal.modality.name}
                </p>
              </div>
              <button
                onClick={() => setSelectedPremiacaoModal(null)}
                className="text-slate-400 hover:text-slate-650 transition cursor-pointer p-1 rounded-lg hover:bg-slate-100"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {(() => {
                const champ = selectedPremiacaoModal.champ;
                const modality = selectedPremiacaoModal.modality;
                const champStages = stages.filter(s => s.championshipId === champ.id);
                
                const hasMasculino = champStages.some(s => (s.sexo || 'misto') === 'masculino');
                const hasFeminino = champStages.some(s => (s.sexo || 'misto') === 'feminino');
                const hasMisto = champStages.some(s => (s.sexo || 'misto') === 'misto');

                let currentStageId = selectedPremiacaoStageId;
                const defaultAll = hasMasculino ? 'all_masculino' : hasFeminino ? 'all_feminino' : hasMisto ? 'all_misto' : 'all';
                if (!currentStageId || currentStageId === 'all') {
                  currentStageId = defaultAll;
                }

                let targetStages: Stage[] = [];
                if (currentStageId === 'all_masculino') {
                  targetStages = champStages.filter(s => (s.sexo || 'misto') === 'masculino');
                } else if (currentStageId === 'all_feminino') {
                  targetStages = champStages.filter(s => (s.sexo || 'misto') === 'feminino');
                } else if (currentStageId === 'all_misto') {
                  targetStages = champStages.filter(s => (s.sexo || 'misto') === 'misto');
                } else if (currentStageId === 'all') {
                  targetStages = champStages;
                } else {
                  targetStages = champStages.filter(s => s.id === currentStageId);
                }

                const targetStageIds = targetStages.map(s => s.id);

                // Filter registrations for stage(s) and modality
                const stageModRegs = registrations.filter(
                  r => r.championshipId === champ.id && r.modalityId === modality.id && targetStageIds.includes(r.stageId)
                );

                const totalCount = stageModRegs.length;
                const totalReinscricoes = stageModRegs.filter(r => r.registrationType === 'reinscrição').length;
                const totalInscricoes = totalCount - totalReinscricoes;

                // Compute total revenue for this stage / all stages + modality
                const totalArrecadado = stageModRegs.reduce((acc, r) => {
                  if (r.valorPago && r.valorPago > 0 && r.valorPago !== 120) return acc + r.valorPago;
                  if (r.registrationType === 'reinscrição') {
                    return acc + (champ.valorReinscricao ?? champ.registrationFee ?? 0);
                  }
                  const isClub = Boolean(r.registeredByUserId && r.registeredByUserId !== r.userId);
                  if (isClub) {
                    return acc + (champ.valorInscricaoClube ?? champ.registrationFee ?? 0);
                  }
                  return acc + (champ.valorInscricaoIndividual ?? champ.registrationFee ?? 0);
                }, 0);

                // Percentages (with defaults matching system design)
                const pTributos = champ.percentualTributos ?? 0;
                const pOrganizacao = champ.percentualOrganizacao ?? 0;
                const pClubes = champ.percentualClubes ?? champ.percentualClube ?? 30;
                const pPremiacaoAtleta = champ.percentualPremiacaoAtleta ?? 30;
                const pPremiacaoClube = champ.percentualPremiacaoClube ?? 0;

                const vAdicionalTodasEtapas = champ.premiacaoAdicionalTodasEtapas ?? 0;

                // Monetary values for division of total revenue
                const vTributos = totalArrecadado * (pTributos / 100);
                const vOrganizacao = totalArrecadado * (pOrganizacao / 100);
                const vClubes = totalArrecadado * (pClubes / 100);
                const vPremiacaoAtleta = totalArrecadado * (pPremiacaoAtleta / 100);
                const vPremiacaoEquipes = totalArrecadado * (pPremiacaoClube / 100);

                // Medal Pools for Individual Athletes
                const pOuro = champ.percentualOuro ?? 50;
                const pPrata = champ.percentualPrata ?? 30;
                const pBronze = champ.percentualBronze ?? 20;

                const vOuroPool = vPremiacaoAtleta * (pOuro / 100);
                const vPrataPool = vPremiacaoAtleta * (pPrata / 100);
                const vBronzePool = vPremiacaoAtleta * (pBronze / 100);

                // Medal Pools for Teams (Clubes)
                const vEquipesOuroPool = vPremiacaoEquipes * (pOuro / 100);
                const vEquipesPrataPool = vPremiacaoEquipes * (pPrata / 100);
                const vEquipesBronzePool = vPremiacaoEquipes * (pBronze / 100);

                // Position Percentages for Individual Stages (Medal breakdown)
                const pPos = [
                  champ.percentualPos1Medalha ?? 40,
                  champ.percentualPos2Medalha ?? 30,
                  champ.percentualPos3Medalha ?? 15,
                  champ.percentualPos4Medalha ?? 0,
                  champ.percentualPos5Medalha ?? 0
                ];

                // Position Percentages for Todas as Etapas (1º ao 5º lugar)
                const pPosTodas = [
                  champ.percentualPos1TodasEtapas ?? 40,
                  champ.percentualPos2TodasEtapas ?? 25,
                  champ.percentualPos3TodasEtapas ?? 15,
                  champ.percentualPos4TodasEtapas ?? 12,
                  champ.percentualPos5TodasEtapas ?? 8
                ];

                const pTodasEtapasSlice = champ.percentualPremiacaoTodasEtapas ?? 30;
                const vPoolTodasEtapas = (vPremiacaoAtleta * (pTodasEtapasSlice / 100)) + vAdicionalTodasEtapas;

                const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

                return (
                  <>
                    {/* Stage selector dropdown */}
                    <div className="space-y-1.5 pb-2 border-b border-slate-100">
                      <label className="text-[11px] font-bold text-slate-500 uppercase block">
                        Selecione a Etapa:
                      </label>
                      <select
                        value={currentStageId}
                        onChange={(e) => setSelectedPremiacaoStageId(e.target.value)}
                        className="w-full sm:w-64 bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl text-xs font-semibold text-slate-800 focus:border-blue-500 cursor-pointer"
                      >
                        {hasMasculino && <option value="all_masculino">Todas as etapas Masculinas</option>}
                        {hasFeminino && <option value="all_feminino">Todas as etapas Femininas</option>}
                        {hasMisto && <option value="all_misto">Todas as etapas Mistas</option>}
                        {!hasMasculino && !hasFeminino && !hasMisto && <option value="all">Todas as etapas</option>}
                        {champStages.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.title || `${s.stageNum}ª ETAPA`} ({new Date(s.date).toLocaleDateString('pt-BR')}) {s.sexo && s.sexo !== 'misto' ? `[${s.sexo === 'feminino' ? 'Feminino' : 'Masculino'}]` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Stats Summary */}
                    <div className="space-y-1 font-semibold text-slate-700">
                      <div>Total de Inscrições: <span className="font-bold text-slate-900">{totalInscricoes}</span></div>
                      <div>Total de reinscrições: <span className="font-bold text-slate-900">{totalReinscricoes}</span></div>
                      <div>Total arrecadado: <span className="font-bold text-emerald-600">{fmt(totalArrecadado)}</span></div>
                    </div>

                    {/* Section 1: Divisão dos valores arrecadados */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <h4 className="font-bold text-slate-900 text-xs">Divisão dos valores arrecadados</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-900 font-bold">
                              <th className="py-2 pr-2">Tributos</th>
                              <th className="py-2 px-2">Organização</th>
                              <th className="py-2 px-2">Clubes</th>
                              <th className="py-2 px-2">Premiação Atletas</th>
                              <th className="py-2 pl-2">Premiação Clubes</th>
                            </tr>
                          </thead>
                          <tbody className="text-slate-700 font-medium">
                            <tr>
                              <td className="py-2 pr-2">{fmt(vTributos)}</td>
                              <td className="py-2 px-2">{fmt(vOrganizacao)}</td>
                              <td className="py-2 px-2">{fmt(vClubes)}</td>
                              <td className="py-2 px-2">{fmt(vPremiacaoAtleta)}</td>
                              <td className="py-2 pl-2">{fmt(vPremiacaoEquipes)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Section 2: Premiação atletas (Todas as Etapas vs Etapa Individual) */}
                    {currentStageId.startsWith('all') ? (
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <div className="flex justify-between items-center">
                          <h4 className="font-bold text-slate-900 text-xs">
                            Premiações Todas as Etapas {currentStageId === 'all_masculino' ? 'Masculinas' : currentStageId === 'all_feminino' ? 'Femininas' : currentStageId === 'all_misto' ? 'Mistas' : ''}
                          </h4>
                          <span className="text-xs font-bold text-emerald-600 font-mono">
                            Total Premiação Geral: {fmt(vPoolTodasEtapas)}
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200 text-slate-900 font-bold uppercase">
                                <th className="py-2">Colocação</th>
                                <th className="py-2 text-center">% Premiação</th>
                                <th className="py-2 text-right">Valor Premiação</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                              {[0, 1, 2, 3, 4].map((idx) => {
                                const perc = pPosTodas[idx];
                                const val = vPoolTodasEtapas * (perc / 100);
                                return (
                                  <tr key={idx}>
                                    <td className="py-2 font-bold text-slate-800">{idx + 1}º Lugar</td>
                                    <td className="py-2 text-center font-mono">{perc}%</td>
                                    <td className="py-2 text-right font-bold font-mono text-emerald-600">{fmt(val)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <h4 className="font-bold text-slate-900 text-xs">Premiação atletas Individual</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200 text-slate-900 font-bold uppercase">
                                <th className="py-2 w-1/3">OURO</th>
                                <th className="py-2 w-1/3">PRATA</th>
                                <th className="py-2 w-1/3">BRONZE</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                              <tr className="font-bold text-slate-900">
                                <td className="py-2">{fmt(vOuroPool)}</td>
                                <td className="py-2">{fmt(vPrataPool)}</td>
                                <td className="py-2">{fmt(vBronzePool)}</td>
                              </tr>
                              {[0, 1, 2, 3, 4].map((idx) => (
                                <tr key={idx}>
                                  <td className="py-1.5">{idx + 1}º {fmt(vOuroPool * (pPos[idx] / 100))}</td>
                                  <td className="py-1.5">{idx + 1}º {fmt(vPrataPool * (pPos[idx] / 100))}</td>
                                  <td className="py-1.5">{idx + 1}º {fmt(vBronzePool * (pPos[idx] / 100))}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Section 3: Premiação Equipes Clubes (apenas se houver pontuação mínima de equipe configurada) */}
                    {Boolean(
                      (champ.pontuacaoMinimaEquipeOuro && champ.pontuacaoMinimaEquipeOuro > 0) ||
                      (champ.pontuacaoMinimaEquipePrata && champ.pontuacaoMinimaEquipePrata > 0) ||
                      (champ.pontuacaoMinimaEquipeBronze && champ.pontuacaoMinimaEquipeBronze > 0)
                    ) && (
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <h4 className="font-bold text-slate-900 text-xs">Premiação Equipes Clubes</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200 text-slate-900 font-bold uppercase">
                                <th className="py-2 w-1/3">OURO</th>
                                <th className="py-2 w-1/3">PRATA</th>
                                <th className="py-2 w-1/3">BRONZE</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                              <tr className="font-bold text-slate-900">
                                <td className="py-2">{fmt(vEquipesOuroPool)}</td>
                                <td className="py-2">{fmt(vEquipesPrataPool)}</td>
                                <td className="py-2">{fmt(vEquipesBronzePool)}</td>
                              </tr>
                              {[0, 1, 2, 3, 4].map((idx) => (
                                <tr key={idx}>
                                  <td className="py-1.5">{idx + 1}º {fmt(vEquipesOuroPool * (pPos[idx] / 100))}</td>
                                  <td className="py-1.5">{idx + 1}º {fmt(vEquipesPrataPool * (pPos[idx] / 100))}</td>
                                  <td className="py-1.5">{idx + 1}º {fmt(vEquipesBronzePool * (pPos[idx] / 100))}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => setSelectedPremiacaoModal(null)}
                className="bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Inscrição em Multicampeonato */}
      {selectedMultiReg && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-100 my-8 text-slate-800"
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Inscrição Unificada</span>
                <h3 className="font-display font-bold text-slate-900 text-lg mt-1">{selectedMultiReg.title}</h3>
              </div>
              <button onClick={closeMultiRegModal} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterMultiSubmit} className="space-y-4">
                {multiError && (
                  <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-semibold">{multiError}</div>
                )}

                <div className="bg-slate-50 p-3 rounded-xl text-xs text-slate-600 space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>Valor Total da Inscrição:</span>
                    <span className="text-blue-700 font-extrabold text-sm">R$ {Number(selectedMultiReg.registrationFee).toFixed(2)}</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Esta taxa única garante sua inscrição em todos os {selectedMultiReg.championshipIds?.length || 0} campeonatos do pacote.</p>
                </div>

                <div className="space-y-3">
                  {selectedMultiReg.items && selectedMultiReg.items.length > 0 ? (
                    <div className="space-y-1.5 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                      <label className="text-[10px] font-bold text-blue-900 uppercase block tracking-wider">
                        Etapas Vinculadas à Oferta ({selectedMultiReg.items.length})
                      </label>
                      <div className="space-y-1">
                        {selectedMultiReg.items.map(it => {
                          const c = championships.find(champ => champ.id === it.championshipId);
                          const s = stages.find(st => st.id === it.stageId);
                          return (
                            <div key={it.championshipId} className="flex justify-between items-center text-xs bg-white p-2 rounded-lg border border-blue-150 shadow-2xs">
                              <span className="font-bold text-slate-800 truncate pr-2">{c?.title || 'Campeonato'}</span>
                              <span className="text-[11px] font-semibold text-blue-700 shrink-0">
                                {s?.title || 'Etapa'} {s?.date ? `(${s.date.split('T')[0]})` : ''}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Etapa Única das Competições</label>
                      <select
                        value={multiStageId}
                        onChange={e => {
                          setMultiStageId(e.target.value);
                          setMultiWeaponId('');
                          setSelectedWeaponId('');
                          setWeaponSearchQuery('');
                          setWeaponSearchResults([]);
                          setSearchingWeapon(false);
                          setMultiError('');
                        }}
                        className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl text-xs font-semibold text-slate-700"
                      >
                        <option value="">Selecione a etapa...</option>
                        {stages.map(s => (
                          <option key={s.id} value={s.id}>{s.title || `Etapa ${s.stageNum}`} ({s.date.split('T')[0]})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {(() => {
                    // So faz sentido oferecer uma modalidade se ela existe em TODOS os
                    // campeonatos do pacote — a inscricao unificada usa uma unica
                    // modalidade para todos eles de uma vez.
                    const packageChampIds = selectedMultiReg.items && selectedMultiReg.items.length > 0
                      ? selectedMultiReg.items.map(it => it.championshipId)
                      : (selectedMultiReg.championshipIds || []);
                    const packageChamps = packageChampIds
                      .map(id => championships.find(c => c.id === id))
                      .filter((c): c is Championship => Boolean(c));
                    const commonModalityIds = packageChamps.length > 0
                      ? packageChamps.reduce<string[]>(
                          (acc, c) => acc.filter(id => (c.modalities || []).includes(id)),
                          packageChamps[0].modalities || []
                        )
                      : [];
                    const availableModalities = modalities.filter(m => commonModalityIds.includes(m.id));

                    return (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Modalidade / Divisão</label>
                        <select
                          value={multiModalityId}
                          onChange={e => {
                            setMultiModalityId(e.target.value);
                            setMultiWeaponId('');
                            setSelectedWeaponId('');
                            setWeaponSearchQuery('');
                            setWeaponSearchResults([]);
                            setSearchingWeapon(false);
                            setMultiError('');
                          }}
                          className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl text-xs font-semibold text-slate-700"
                        >
                          <option value="">Selecione a modalidade...</option>
                          {availableModalities.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                        {availableModalities.length === 0 && (
                          <p className="text-[10px] text-amber-600 font-semibold">Nenhuma modalidade em comum entre os campeonatos deste pacote.</p>
                        )}
                      </div>
                    );
                  })()}

                  {/* Seleção de Arma via Pesquisa + Cadastrar Nova Arma */}
                  <div className="space-y-1 relative">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[10px] text-slate-500 uppercase block font-semibold">
                        Arma a ser utilizada <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAddWeapon(true)}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        + Cadastrar Nova Arma
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Digite fabricante, modelo, calibre ou número Sigma..."
                        value={weaponSearchQuery}
                        onChange={(e) => handleSearchWeapon(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-800 font-medium pl-9 shadow-xs"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                      {searchingWeapon && <span className="absolute right-3 top-3.5 text-[10px] text-blue-600 font-bold">Buscando...</span>}
                    </div>

                    {weaponSearchQuery.length > 0 && weaponSearchQuery.length < 3 && (
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-[10.5px] text-amber-600 font-medium">
                          Digite mais {3 - weaponSearchQuery.length} caractere(s) para pesquisar...
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setNewWeaponData(prev => ({ ...prev, model: weaponSearchQuery }));
                            setShowAddWeapon(true);
                          }}
                          className="text-[10.5px] font-bold text-blue-600 hover:underline cursor-pointer"
                        >
                          + Cadastrar Nova Arma
                        </button>
                      </div>
                    )}

                    {/* Weapon Search Results Dropdown */}
                    {weaponSearchQuery.length >= 3 && (
                      <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                        {weaponSearchResults.length === 0 ? (
                          <div className="p-4 text-center space-y-2">
                            <p className="text-slate-500 text-xs">Nenhuma arma encontrada para "{weaponSearchQuery}".</p>
                            <button
                              type="button"
                              onClick={() => {
                                setNewWeaponData(prev => ({ ...prev, model: weaponSearchQuery }));
                                setShowAddWeapon(true);
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 mx-auto cursor-pointer shadow-xs"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              Cadastrar Nova Arma Agora
                            </button>
                          </div>
                        ) : (
                          <>
                            {weaponSearchResults.map(w => (
                              <button
                                key={w.id}
                                type="button"
                                onClick={() => {
                                  setMultiWeaponId(w.id);
                                  setSelectedWeaponId(w.id);
                                  setWeaponSearchQuery(`${w.manufacturer || ''} ${w.model || ''} (${w.caliber || 'Sem calibre'}) - Sigma: ${w.sigmaNumber || 'N/A'}`.trim());
                                  setWeaponSearchResults([]);
                                }}
                                className="w-full text-left p-3 hover:bg-blue-50 transition flex items-center justify-between cursor-pointer"
                              >
                                <div>
                                  <div className="font-bold text-slate-900 text-xs">
                                    {w.manufacturer} {w.model} <span className="text-blue-600 font-mono text-[11px]">({w.caliber})</span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                    Sigma: {w.sigmaNumber || 'N/A'} | Série: {w.serialNumber || 'N/A'}
                                  </div>
                                </div>
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                  Selecionar
                                </span>
                              </button>
                            ))}
                            <div className="p-2.5 bg-slate-50 text-center">
                              <button
                                type="button"
                                onClick={() => setShowAddWeapon(true)}
                                className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
                              >
                                <PlusCircle className="w-3.5 h-3.5" />
                                Sua arma não está na lista? Cadastrar Nova Arma
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Selected Weapon Badge Confirmation */}
                    {multiWeaponId && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between mt-2 text-xs">
                        <div className="flex items-center gap-2 truncate pr-2">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="font-bold text-emerald-950 truncate">Arma: {weaponSearchQuery}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setMultiWeaponId('');
                            setSelectedWeaponId('');
                            setWeaponSearchQuery('');
                            setWeaponSearchResults([]);
                          }}
                          className="text-[10px] text-slate-500 hover:text-red-600 font-bold underline cursor-pointer shrink-0"
                        >
                          Trocar
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Número do CR</label>
                    <input
                      type="text"
                      value={multiCrInput}
                      onChange={e => setMultiCrInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl text-xs font-semibold text-slate-700"
                      placeholder="Ex: 123456"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Forma de Pagamento</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setMultiPaymentMethod('pix')}
                        className={`p-2.5 border rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${multiPaymentMethod === 'pix' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-200 text-slate-600'}`}
                      >
                        <Zap className="w-4 h-4" /> PIX Instantâneo
                      </button>
                      <button
                        type="button"
                        onClick={() => setMultiPaymentMethod('credit_card')}
                        className={`p-2.5 border rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${multiPaymentMethod === 'credit_card' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-200 text-slate-600'}`}
                      >
                        <CreditCard className="w-4 h-4" /> Cartão de Crédito
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={closeMultiRegModal}
                    className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={multiSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition shadow-sm cursor-pointer"
                  >
                    {multiSubmitting ? 'Inscrito...' : 'Confirmar e Pagar'}
                  </button>
                </div>
              </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
