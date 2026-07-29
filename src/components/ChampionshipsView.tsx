import React, { useState } from 'react';
import { Championship, User, Registration, StageScore, RankingItem, Modality, Stage, Weapon } from '../types';
import { Trophy, Calendar, DollarSign, Target, CheckCircle, Shield, Award, Printer, Copy, CreditCard, ChevronRight, Download, Medal, PlusCircle, X, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChampionshipsProps {
  championships: Championship[];
  registrations: Registration[];
  stageScores: StageScore[];
  currentUser: User | null;
  modalities: Modality[];
  stages: Stage[];
  weapons: Weapon[];
  onRegister: (championshipId: string, modalityId: string, stageId: string, weaponId: string, crNumber: string, paymentMethod: 'pix' | 'credit_card') => Promise<void>;
  onAddWeapon: (weapon: { manufacturer: string; model: string; caliber: string; serialNumber: string; weaponType: string }) => Promise<void>;
  globalRankings: RankingItem[];
  onSelectModalityRanking: (modality: string) => void;
  selectedRankingModality: string;
  defaultImage?: string;
  onViewProfile?: (username: string) => void;
}

export default function ChampionshipsView({
  championships,
  registrations,
  stageScores,
  currentUser,
  modalities,
  stages,
  weapons,
  onRegister,
  onAddWeapon,
  globalRankings,
  onSelectModalityRanking,
  selectedRankingModality,
  defaultImage,
  onViewProfile
}: ChampionshipsProps) {
  // Navigation states
  const [activeTab, setActiveTab] = useState<'tournaments' | 'rankings' | 'certificates'>('tournaments');
  const [viewingChampionship, setViewingChampionship] = useState<Championship | null>(null);
  const [selectedPremiacaoModal, setSelectedPremiacaoModal] = useState<{ champ: Championship; modality: Modality } | null>(null);
  const [selectedPremiacaoStageId, setSelectedPremiacaoStageId] = useState<string>('');

  // Registration and payment popup state
  const [selectedChampReg, setSelectedChampReg] = useState<Championship | null>(null);
  const [selectedModalityId, setSelectedModalityId] = useState('');
  const [selectedStageId, setSelectedStageId] = useState('');
  const [selectedWeaponId, setSelectedWeaponId] = useState('');
  const [crInput, setCrInput] = useState(currentUser?.crNumber || '');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
  const [paymentStep, setPaymentStep] = useState<'form' | 'processing' | 'done'>('form');
  const [pixCopied, setPixCopied] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [showAddWeapon, setShowAddWeapon] = useState(false);
  const [newWeapon, setNewWeapon] = useState({ manufacturer: '', model: '', caliber: '', serialNumber: '', weaponType: 'Pistola' });
  const [savingWeapon, setSavingWeapon] = useState(false);
  const [showProfileIncompleteNotice, setShowProfileIncompleteNotice] = useState(false);

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

  // Selected Certificate to show print preview
  const [activeCertificate, setActiveCertificate] = useState<{
    championship: Championship;
    registration: Registration;
    finalScore?: number;
    position?: number;
  } | null>(null);

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

    // Simulate payment response delay
    setTimeout(async () => {
      try {
        await onRegister(selectedChampReg.id, selectedModalityId, selectedStageId, selectedWeaponId, finalCr, 'pix');
        setPaymentStep('done');
      } catch (err) {
        setRegisterError(err instanceof Error ? err.message : 'Erro ao realizar inscrição.');
        setPaymentStep('form');
      }
    }, 1800);
  };

  const handleSaveNewWeapon = async () => {
    if (!newWeapon.manufacturer || !newWeapon.model || !newWeapon.caliber || !newWeapon.serialNumber) return;
    setSavingWeapon(true);
    try {
      await onAddWeapon(newWeapon);
      setShowAddWeapon(false);
      setNewWeapon({ manufacturer: '', model: '', caliber: '', serialNumber: '', weaponType: 'Pistola' });
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : 'Erro ao cadastrar arma.');
    } finally {
      setSavingWeapon(false);
    }
  };

  const closeRegModal = () => {
    setSelectedChampReg(null);
    setSelectedModalityId('');
    setSelectedStageId('');
    setSelectedWeaponId('');
    setPaymentStep('form');
    setPaymentMethod('pix');
    setRegisterError('');
    setShowAddWeapon(false);
  };

  // Find users approved registrations for certificate retrieval
  const userApprovedRegistrations = registrations.filter(
    r => r.userId === currentUser?.id && r.paymentStatus === 'approved'
  );

  // Copy pix key simulation
  const handleCopyPix = () => {
    navigator.clipboard.writeText("pix.copiaecola.gegpistol.online.producao1029384756");
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 2000);
  };

  return (
    <div className="py-6 space-y-6">
      
      {/* Title & Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Trophy className="w-6 h-6 text-blue-600" />
            Arena de Campeonatos e Rankings
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            G&G Competições - Inscreva-se nas etapas oficiais, consulte os rankings e emita seus certificados homologados.
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl self-start">
          <button
            onClick={() => { setActiveTab('tournaments'); setActiveCertificate(null); }}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition duration-200 ${activeTab === 'tournaments' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Campeonatos
          </button>
          <button
            onClick={() => { setActiveTab('rankings'); setActiveCertificate(null); }}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition duration-200 ${activeTab === 'rankings' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Líderes e Rankings
          </button>
          <button
            onClick={() => { setActiveTab('certificates'); }}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition duration-200 ${activeTab === 'certificates' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Certificados
          </button>
        </div>
      </div>

      {activeCertificate ? (
        /* ==================================================== */
        /* ELEGANT CERTIFICATE PREVIEW AND PRINT STYLING PANEL */
        /* ==================================================== */
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl smooth-shadow border border-slate-200 p-6 space-y-6"
        >
          <div className="flex justify-between items-center no-print">
            <button
              onClick={() => setActiveCertificate(null)}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl transition font-medium"
            >
              ← Voltar aos Certificados
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition flex items-center gap-1.5 font-semibold"
              >
                <Printer className="w-4 h-4" />
                Imprimir Certificado
              </button>
            </div>
          </div>

          {/* Certificate Design Viewport */}
          <div className="border-[14px] border-double border-blue-950 p-8 sm:p-14 bg-slate-50 text-slate-900 relative overflow-hidden font-sans smooth-shadow max-w-4xl mx-auto rounded-lg">
            
            {/* Watermark decorations */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] flex items-center justify-center">
              <Trophy className="w-[500px] h-[500px] text-slate-950" />
            </div>

            {/* Header Logos */}
            <div className="text-center space-y-2 relative">
              <div className="flex justify-center items-center gap-2">
                <Target className="w-8 h-8 text-blue-900" />
                <span className="font-display font-black text-2xl tracking-widest text-blue-950">G&G COMPETIÇÕES</span>
              </div>
              <p className="text-[10px] tracking-widest text-amber-600 font-bold uppercase">Clube e Escola de Tiro Credenciado</p>
              <div className="w-24 h-0.5 bg-blue-900 mx-auto mt-2"></div>
            </div>

            {/* Cert Body */}
            <div className="text-center mt-10 space-y-6 relative">
              <h3 className="font-display font-medium text-amber-600 tracking-wider text-sm uppercase">Certificado de Participação Homologado</h3>

              <p className="text-slate-600 leading-relaxed text-sm sm:text-base max-w-xl mx-auto">
                Certificamos para fins de comprovação junto ao Comando do Exército (SFPC) e demais órgãos de controle que o atleta desportista federado:
              </p>

              <div className="py-2">
                <h2 className="font-display font-bold text-2xl sm:text-3xl text-blue-950 tracking-tight underline decoration-amber-500/50 decoration-2">
                  {currentUser?.fullName}
                </h2>
                <div className="flex justify-center gap-4 text-xs font-mono text-slate-500 mt-2">
                  <span>CR: {activeCertificate.registration.crNumber}</span>
                  <span>ID: {currentUser?.id}</span>
                </div>
              </div>

              <p className="text-slate-600 leading-relaxed text-sm sm:text-base max-w-xl mx-auto">
                participou e concluiu com aproveitamento técnico o campeonato <strong className="text-slate-900">{activeCertificate.championship.title}</strong>, concorrendo na modalidade esportiva oficial <strong className="text-slate-900">{modalityName(activeCertificate.registration.modalityId)}</strong>.
              </p>

              {activeCertificate.finalScore ? (
                <div className="inline-block bg-blue-950 text-white font-mono rounded-lg px-6 py-3 border border-amber-500/20 shadow-md">
                  <div className="text-[10px] text-slate-400">DESEMPENHO FINAL</div>
                  <div className="text-lg font-bold text-amber-400 mt-0.5">Pontos: {activeCertificate.finalScore}</div>
                  {activeCertificate.position && (
                    <div className="text-xs text-sky-300 font-sans">Colocação no Ranking: {activeCertificate.position}º Lugar</div>
                  )}
                </div>
              ) : (
                <div className="inline-block bg-slate-200 text-slate-700 font-mono rounded-lg px-6 py-2">
                  Participação Registrada e Homologada
                </div>
              )}
            </div>

            {/* Certificate Signatures block */}
            <div className="grid grid-cols-2 gap-8 mt-14 pt-8 border-t border-slate-200/60 relative text-center text-xs">
              <div>
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=85"
                  alt="Founder signature placeholder"
                  className="w-10 h-10 object-cover rounded-full mx-auto opacity-75 ring-2 ring-slate-100 mb-2"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80";
                  }}
                />
                <div className="w-40 h-px bg-slate-300 mx-auto mt-2"></div>
                <p className="font-bold text-slate-800 mt-1">Guilherme Guedes</p>
                <p className="text-[10px] text-slate-400">Diretoria Fiscal - G&G</p>
              </div>
              
              <div>
                <img
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&auto=format&fit=crop&q=85"
                  alt="Founder signature placeholder"
                  className="w-10 h-10 object-cover rounded-full mx-auto opacity-75 ring-2 ring-slate-100 mb-2"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80";
                  }}
                />
                <div className="w-40 h-px bg-slate-300 mx-auto mt-2"></div>
                <p className="font-bold text-slate-800 mt-1">Gabriel G&G</p>
                <p className="text-[10px] text-slate-400">Instrutor Chefe - G&G</p>
              </div>
            </div>

            {/* Bottom metadata */}
            <div className="flex flex-col sm:flex-row justify-between items-center mt-12 text-[10px] text-slate-400 font-mono pt-4 border-t border-slate-100">
              <span>Brasília - DF, {new Date(activeCertificate.registration.registeredAt).toLocaleDateString()}</span>
              <span>Chave Autenticidade: {activeCertificate.registration.txId || 'GEN-GG-AUT'}</span>
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-amber-500" />
                Clube G&G Homologado
              </span>
            </div>

          </div>
        </motion.div>
      ) : (
        <>
          {activeTab === 'tournaments' && (
            /* ==================================================== */
            /* TOURNAMENTS LIST & DETAIL VIEW                       */
            /* ==================================================== */
            viewingChampionship ? (
              <div className="bg-white rounded-2xl smooth-shadow border border-slate-100 p-6 space-y-8 text-slate-800">
                {/* Header & Navigation */}
                <div className="space-y-3 border-b border-slate-100 pb-4">
                  <button
                    onClick={() => setViewingChampionship(null)}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-1.5 rounded-lg transition font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    ← Voltar para Campeonatos
                  </button>
                  <div className="pt-2">
                    <span className="text-[11px] font-semibold text-slate-450 uppercase tracking-wider block">Dados da competição</span>
                    <h2 className="font-display font-black text-2xl sm:text-3xl text-blue-950 uppercase tracking-tight mt-0.5">
                      {viewingChampionship.title}
                    </h2>
                    {viewingChampionship.description && (
                      <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">{viewingChampionship.description}</p>
                    )}
                  </div>
                </div>

                {/* Download Document Buttons */}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      window.open(`/api/championships/${viewingChampionship.id}/documents/regulamento`, '_blank');
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Baixar Regulamento
                  </button>

                  <button
                    onClick={() => {
                      window.open(`/api/championships/${viewingChampionship.id}/documents/sumula`, '_blank');
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Baixar Súmula
                  </button>
                </div>

                {/* Section: Modalidades */}
                <div className="space-y-3">
                  <h3 className="font-display font-bold text-slate-900 text-base sm:text-lg">Modalidades</h3>
                  {(() => {
                    const validMods = getValidChampModalities(viewingChampionship.modalities);
                    if (validMods.length === 0) {
                      return <p className="text-xs text-slate-400">Nenhuma modalidade cadastrada vinculada a este campeonato.</p>;
                    }
                    return (
                      <div className="space-y-2">
                        {validMods.map((mod) => (
                          <div
                            key={mod.id}
                            className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center hover:border-blue-400 hover:shadow-md transition shadow-xs cursor-pointer group"
                            onClick={() => {
                              setSelectedPremiacaoModal({ champ: viewingChampionship, modality: mod });
                              setSelectedPremiacaoStageId('');
                            }}
                            title="Clique para ver os dados de premiação desta modalidade"
                          >
                            <div>
                              <h4 className="font-bold text-slate-800 text-xs sm:text-sm uppercase tracking-wide group-hover:text-blue-600 transition-colors">{mod.name}</h4>
                              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                                {mod.seriesCount || 0} séries × {mod.shotsPerSeries || 0} tiros • Avaliação: {mod.evaluationType === 'pontuacao' ? 'Pontos' : mod.evaluationType === 'tempo' ? 'Tempo' : 'Fator (Pontos/Tempo)'}
                              </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Section: Participar das etapas */}
                <div className="space-y-4 pt-2">
                  <h3 className="font-display font-bold text-slate-900 text-base sm:text-lg">Participar das etapas:</h3>
                  {(() => {
                    const champStages = stages.filter(s => s.championshipId === viewingChampionship.id);
                    if (champStages.length === 0) {
                      return (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs">
                          Nenhuma etapa cadastrada para este campeonato ainda.
                        </div>
                      );
                    }
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {champStages.map((stage) => {
                          const stageDateStr = new Date(stage.date).toLocaleDateString('pt-BR');
                          return (
                            <div
                              key={stage.id}
                              className="bg-white border border-slate-200 rounded-2xl p-5 text-center shadow-xs flex flex-col justify-between space-y-4 hover:border-indigo-300 transition"
                            >
                              <div className="space-y-1">
                                <h4 className="font-display font-bold text-slate-900 text-sm uppercase">
                                  {stage.title || `${stage.stageNum}ª ETAPA`}
                                </h4>
                                <p className="text-xs text-slate-500 font-mono">{stageDateStr}</p>
                                {stage.description && (
                                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{stage.description}</p>
                                )}
                              </div>

                              <button
                                onClick={() => {
                                  if (currentUser && !currentUser.isProfileComplete) {
                                    setShowProfileIncompleteNotice(true);
                                    return;
                                  }
                                  setSelectedChampReg(viewingChampionship);
                                  setSelectedStageId(stage.id);
                                  setSelectedModalityId(viewingChampionship.modalities[0] || '');
                                  setSelectedWeaponId('');
                                }}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-xs transition cursor-pointer"
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
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
                {championships.map((champ) => {
                  const isFinished = champ.status === 'completed';
                  const isMyRegsList = registrations.filter(r => r.championshipId === champ.id && r.userId === currentUser?.id);
                  const isRegistered = isMyRegsList.length > 0;

                  return (
                    <div
                      key={champ.id}
                      onClick={() => setViewingChampionship(champ)}
                      className="bg-white dark:bg-slate-900 rounded-2xl smooth-shadow border border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:shadow-md transition duration-200 cursor-pointer overflow-hidden flex flex-col justify-between p-3.5 sm:p-4 space-y-3 group"
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
                            <span className="font-semibold font-sans">{champ.stagesCount} Stages</span>
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

                        <div className="flex flex-wrap gap-1">
                          {getValidChampModalities(champ.modalities).slice(0, 2).map((mod) => (
                            <span key={mod.id} className="text-[8.5px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-bold uppercase truncate max-w-full">
                              {mod.name}
                            </span>
                          ))}
                          {getValidChampModalities(champ.modalities).length > 2 && (
                            <span className="text-[8.5px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-bold">
                              +{getValidChampModalities(champ.modalities).length - 2}
                            </span>
                          )}
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
                            Ver Resultados
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
            )
          )}

          {activeTab === 'rankings' && (
            /* ==================================================== */
            /* LEADERBOARDS AND RESULTS SCREEN                      */
            /* ==================================================== */
            <div className="bg-white rounded-2xl smooth-shadow border border-slate-100 p-5 space-y-6">
              
              {/* Modality selectors */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h3 className="font-display font-semibold text-slate-900 text-sm uppercase tracking-wider">Tabela Geral do Campeonato</h3>
                  <p className="text-xs text-slate-400">Classificação oficial calculada pelas somas dos estágios de competição.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Modalidade:</span>
                  <select
                    value={selectedRankingModality}
                    onChange={(e) => onSelectModalityRanking(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-xs px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 text-slate-700 font-semibold"
                  >
                    {allModalities.map((mod, i) => (
                      <option key={i} value={mod}>{mod}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Leaderboard list table */}
              <div className="overflow-x-auto text-sm">
                {globalRankings.length === 0 ? (
                  <div className="text-center py-10">
                    <Medal className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 font-medium">Nenhum placar homologado nesta categoria ainda.</p>
                    <p className="text-xs text-slate-400">A equipe diretiva começará a postar as notas das etapas em breve.</p>
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-bold font-mono tracking-wider">
                        <th className="py-3 px-2">Colocação</th>
                        <th className="py-3 px-4">Atleta G&G</th>
                        {stages.length > 0 ? (
                          stages.map((s, idx) => (
                            <th key={s.id || idx} className="py-3 px-4 text-center">{s.title || `Etapa ${s.stageNum || idx + 1}`}</th>
                          ))
                        ) : (
                          <>
                            <th className="py-3 px-4 text-center">Etapa 1</th>
                            <th className="py-3 px-4 text-center">Etapa 2</th>
                            <th className="py-3 px-4 text-center">Etapa 3</th>
                            <th className="py-3 px-4 text-center">Etapa 4</th>
                          </>
                        )}
                        <th className="py-3 px-4 text-right">Resultado Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {globalRankings.map((ranking, index) => {
                        const position = index + 1;
                        let medalColor = '';
                        if (position === 1) medalColor = 'bg-amber-100 text-amber-700 border-amber-300';
                        else if (position === 2) medalColor = 'bg-slate-100 text-slate-700 border-slate-300';
                        else if (position === 3) medalColor = 'bg-orange-100 text-orange-700 border-orange-300';

                        return (
                          <tr key={ranking.userId} className="hover:bg-slate-50/50 transition">
                            <td className="py-3 px-2 font-mono font-bold">
                              {position <= 3 ? (
                                <div className={`w-6 h-6 rounded-full border text-center flex items-center justify-center text-xs font-bold leading-none ${medalColor}`}>
                                  {position}
                                </div>
                              ) : (
                                <span className="text-slate-500 pl-2">#{position}</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3 cursor-pointer hover:opacity-85 transition" onClick={() => onViewProfile && onViewProfile(ranking.username)}>
                                <img
                                  src={ranking.avatarUrl}
                                  alt={ranking.username}
                                  className="w-8 h-8 rounded-full object-cover border border-slate-200"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80";
                                  }}
                                />
                                <div>
                                  <span className="font-semibold text-slate-900 block text-xs">{ranking.fullName}</span>
                                  <span className="text-[10px] text-slate-400">@{ranking.username}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-xs text-slate-600">
                              {ranking.stageScores[1] !== undefined ? ranking.stageScores[1] : '-'}
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-xs text-slate-600">
                              {ranking.stageScores[2] !== undefined ? ranking.stageScores[2] : '-'}
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-xs text-slate-600">
                              {ranking.stageScores[3] !== undefined ? ranking.stageScores[3] : '-'}
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-xs text-slate-600">
                              {ranking.stageScores[4] !== undefined ? ranking.stageScores[4] : '-'}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-extrabold text-blue-700 text-xs">
                              {ranking.totalScore} pts
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {activeTab === 'certificates' && (
            /* ==================================================== */
            /* CERTIFICATES DISCOVERY TAB                           */
            /* ==================================================== */
            <div className="bg-white rounded-2xl smooth-shadow border border-slate-100 p-5 space-y-4">
              <div>
                <h3 className="font-display font-semibold text-slate-900 text-sm uppercase tracking-wider">Seus Certificados Registrados</h3>
                <p className="text-xs text-slate-400">Gere e imprima documentos oficiais de filiação e participação homologados.</p>
              </div>

              {!currentUser ? (
                <p className="text-xs text-red-500 font-medium">Faça login com seu usuário para visualizar seus certificados.</p>
              ) : userApprovedRegistrations.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl">
                  <Award className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm font-medium">Nenhum certificado elegível.</p>
                  <p className="text-xs text-slate-400">Inscreva-se em um campeonato e compita para poder gerar certificados de participação.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userApprovedRegistrations.map((reg) => {
                    const champ = championships.find(c => c.id === reg.championshipId);
                    if (!champ) return null;

                    // Compute score if available
                    const regModalityName = modalityName(reg.modalityId);
                    const score = globalRankings.find(r => r.userId === currentUser.id && r.modality === regModalityName);
                    const positionInMod = globalRankings.findIndex(r => r.userId === currentUser.id && r.modality === regModalityName) + 1;

                    return (
                      <div key={reg.id} className="border border-slate-100 rounded-xl p-4 flex items-center justify-between hover:bg-slate-50/50 transition">
                        <div className="space-y-1">
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold uppercase font-mono">
                            CERTIFICADO ELEGÍVEL
                          </span>
                          <h4 className="font-bold text-slate-900 font-display text-sm truncate max-w-[240px]">{champ.title}</h4>
                          <span className="text-xs text-slate-400 block">{regModalityName}</span>
                          <span className="text-[10px] text-slate-400 font-mono block">Liberação: {new Date(reg.registeredAt).toLocaleDateString()}</span>
                        </div>
                        
                        <button
                          onClick={() => {
                            setActiveCertificate({
                              championship: champ,
                              registration: reg,
                              finalScore: score?.totalScore,
                              position: positionInMod > 0 ? positionInMod : undefined
                            });
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 transition leading-none shadow-md shadow-blue-50"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Emitir
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

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
                      onChange={(e) => setSelectedModalityId(e.target.value)}
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
                      onChange={(e) => setSelectedStageId(e.target.value)}
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

                  {/* 3. Seleção de Arma via Pesquisa (Mínimo 3 Caracteres) */}
                  <div className="space-y-1 relative">
                    <label className="text-[10px] text-slate-500 uppercase block font-semibold">
                      Arma a ser utilizada <span className="text-red-500">*</span> (Pesquise digitando no mínimo 3 caracteres)
                    </label>
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
                      <p className="text-[10.5px] text-amber-600 font-medium mt-1">
                        Digite mais {3 - weaponSearchQuery.length} caractere(s) para pesquisar nas armas cadastradas...
                      </p>
                    )}

                    {/* Weapon Search Results Dropdown */}
                    {weaponSearchQuery.length >= 3 && (
                      <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {weaponSearchResults.length === 0 ? (
                          <div className="p-3 text-center text-slate-500 text-xs">
                            Nenhuma arma encontrada para "{weaponSearchQuery}".
                          </div>
                        ) : (
                          weaponSearchResults.map(w => (
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
                          ))
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
                    <h4 className="font-bold text-slate-800 text-sm">Gerando Chave de Homologação...</h4>
                    <p className="text-xs text-slate-400">Verificando dados federativos de atirador desportivo G&G.</p>
                  </div>
                </div>
              )}

              {paymentStep === 'done' && (
                <div className="p-6 text-center space-y-4 flex-1 overflow-y-auto">
                  <div className="bg-emerald-50 text-emerald-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto shadow-md">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900 text-sm">Ficha Homologada com Sucesso!</h4>
                    <p className="text-xs text-slate-500">Parabéns! Sua vaga foi reservada na modalidade oficial.</p>
                  </div>

                  {/* PIX instructions if selected */}
                  {paymentMethod === 'pix' ? (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-left space-y-2 text-xs font-mono">
                      <span className="text-[10px] text-slate-400 font-sans block text-center uppercase font-bold">FAÇA O PIX DO VALOR DE R$ {registrationPrice.toFixed(2)}</span>
                      
                      {/* Dynamic Mock QR Code */}
                      <div className="w-28 h-28 mx-auto bg-white border border-slate-200 p-1 rounded-lg">
                        <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900">
                          <rect width="100" height="100" fill="white" />
                          {/* Simulated QR Code patterns */}
                          <rect x="10" y="10" width="20" height="20" fill="currentColor" />
                          <rect x="70" y="10" width="20" height="20" fill="currentColor" />
                          <rect x="10" y="70" width="20" height="20" fill="currentColor" />
                          <rect x="40" y="40" width="20" height="20" fill="currentColor" />
                          <rect x="15" y="15" width="10" height="10" fill="white" />
                          <rect x="75" y="15" width="10" height="10" fill="white" />
                          <rect x="15" y="75" width="10" height="10" fill="white" />
                          <rect x="45" y="45" width="10" height="10" fill="white" />
                          <rect x="18" y="18" width="4" height="4" fill="currentColor" />
                          <rect x="78" y="18" width="4" height="4" fill="currentColor" />
                          <rect x="18" y="78" width="4" height="4" fill="currentColor" />
                          <rect x="48" y="48" width="4" height="4" fill="currentColor" />
                          {/* Noise blocks */}
                          <rect x="40" y="15" width="5" height="12" fill="currentColor" />
                          <rect x="55" y="20" width="8" height="5" fill="currentColor" />
                          <rect x="12" y="45" width="15" height="4" fill="currentColor" />
                          <rect x="75" y="45" width="10" height="15" fill="currentColor" />
                          <rect x="50" y="70" width="15" height="8" fill="currentColor" />
                        </svg>
                      </div>

                      <button
                        type="button"
                        onClick={handleCopyPix}
                        className="w-full bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-800 py-2.5 rounded-lg transition text-xs font-semibold flex items-center justify-center gap-1.5 font-sans mb-1"
                      >
                        {pixCopied ? 'Chave Copiada!' : 'Copiar Código Pix Copia e Cola'}
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">Cartão de Crédito aprovado e transação confirmada na fatura.</p>
                  )}

                  <button
                    onClick={closeRegModal}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-semibold text-xs transition"
                  >
                    Fechar Ficha e Voltar
                  </button>
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

    </div>
  );
}
