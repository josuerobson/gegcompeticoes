import React, { useState } from 'react';
import { Championship, User, Registration, StageScore, RankingItem, Modality, Stage, Weapon } from '../types';
import { Trophy, Calendar, DollarSign, Target, CheckCircle, Shield, Award, Printer, Copy, CreditCard, ChevronRight, Download, Medal, PlusCircle } from 'lucide-react';
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
    if (q.trim().length < 2) {
      setWeaponSearchResults([]);
      return;
    }
    setSearchingWeapon(true);
    try {
      const r = await fetch(`/api/weapons/search?q=${encodeURIComponent(q)}`, {
        headers: { 'x-user-id': currentUser?.id || '' }
      });
      const data = await r.json();
      setWeaponSearchResults(data.weapons || []);
    } catch {
      setWeaponSearchResults([]);
    } finally {
      setSearchingWeapon(false);
    }
  };

  const modalityName = (id: string) => modalities.find(m => m.id === id)?.name || id;
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
        : (selectedChampReg.valorInscricaoIndividual ?? selectedChampReg.registrationFee))
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
    if (!selectedChampReg || !selectedModalityId || !selectedStageId || !selectedWeaponId || !crInput) return;

    setRegisterError('');
    setPaymentStep('processing');

    // Simulate payment response delay
    setTimeout(async () => {
      try {
        await onRegister(selectedChampReg.id, selectedModalityId, selectedStageId, selectedWeaponId, crInput, paymentMethod);
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
            /* TOURNAMENTS LIST & ENTRANCE MODALITIES              */
            /* ==================================================== */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {championships.map((champ) => {
                const isFinished = champ.status === 'completed';
                const isMyRegsList = registrations.filter(r => r.championshipId === champ.id && r.userId === currentUser?.id);
                const isRegistered = isMyRegsList.length > 0;

                return (
                  <div key={champ.id} className="bg-white rounded-2xl smooth-shadow border border-slate-100 overflow-hidden flex flex-col">
                    
                    {/* Banner Image */}
                    <div className="h-44 bg-slate-100 relative">
                      <img
                        src={champ.bannerUrl || defaultImage}
                        alt={champ.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          if (defaultImage) e.currentTarget.src = defaultImage;
                        }}
                      />
                      <div className="absolute top-3 left-3 flex gap-2">
                        {isFinished ? (
                          <span className="bg-slate-900/80 backdrop-blur-md text-white text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Finalizado
                          </span>
                        ) : (
                          <span className="bg-emerald-600 text-white text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" /> Inscrições Abertas
                          </span>
                        )}
                        
                        {isRegistered && (
                          <span className="bg-blue-600 text-white text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                            Inscrito ({isMyRegsList.length} Cat)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <h3 className="font-display font-bold text-lg text-slate-950 leading-snug">{champ.title}</h3>
                        <p className="text-slate-500 text-xs leading-relaxed">{champ.description}</p>
                      </div>

                      {/* Info grid */}
                      <div className="grid grid-cols-3 gap-2 border-t border-b border-slate-50 py-3 text-[11px] font-mono text-slate-600">
                        <div>
                          <span className="text-[9px] text-slate-400 block uppercase font-sans">Período</span>
                          <span className="font-semibold">{new Date(champ.startDate).toLocaleDateString('pt-BR', {month: 'numeric', day: 'numeric'})} - {new Date(champ.endDate).toLocaleDateString('pt-BR', {month: 'numeric', day: 'numeric'})}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block uppercase font-sans">Etapas</span>
                          <span className="font-semibold font-sans">{champ.stagesCount} Stages</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block uppercase font-sans">Inscrição</span>
                          <span className="text-blue-600 font-bold font-sans">R$ {champ.registrationFee}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1">
                          {champ.modalities.map((mod, i) => (
                            <span key={i} className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">
                              {modalityName(mod)}
                            </span>
                          ))}
                        </div>

                        {/* Action CTA */}
                        {isFinished ? (
                          <button
                            onClick={() => setActiveTab('rankings')}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs py-3 rounded-xl font-bold transition flex items-center justify-center gap-2"
                          >
                            <Trophy className="w-4 h-4 text-amber-500" />
                            Ver Histórico dos Campeões
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (currentUser && !currentUser.isProfileComplete) {
                                setShowProfileIncompleteNotice(true);
                                return;
                              }
                              setSelectedChampReg(champ);
                              setSelectedModalityId(champ.modalities[0]);
                              const firstStage = stages.find(s => s.championshipId === champ.id);
                              setSelectedStageId(firstStage?.id || '');
                              setSelectedWeaponId('');
                            }}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-3 rounded-xl font-bold shadow-md shadow-blue-100 transition flex items-center justify-center gap-2"
                          >
                            <Target className="w-4 h-4" />
                            Inscrever-se neste Campeonato
                          </button>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
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
                        <th className="py-3 px-4 text-center">Etapa 1</th>
                        <th className="py-3 px-4 text-center">Etapa 2</th>
                        <th className="py-3 px-4 text-center">Etapa 3</th>
                        <th className="py-3 px-4 text-center">Etapa 4</th>
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
          <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white max-w-lg w-full rounded-2xl smooth-shadow overflow-hidden"
            >
              <div className="bg-blue-900 text-white p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <span className="font-display font-semibold text-sm">Ficha de Inscrição Oficial</span>
                </div>
                <button
                  onClick={closeRegModal}
                  className="text-white/70 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {paymentStep === 'form' && (
                <form onSubmit={handleRegisterSubmit} className="p-5 space-y-4">
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
                      {selectedChampReg.modalities.map((modId, i) => (
                        <option key={i} value={modId}>{modalityName(modId)}</option>
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

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase block font-semibold">Arma a ser utilizada</label>
                    {!showAddWeapon && (
                      <div className="space-y-2">
                        {eligibleWeapons.length > 0 ? (
                          <select
                            value={selectedWeaponId}
                            onChange={(e) => setSelectedWeaponId(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700 font-semibold"
                          >
                            <option value="">Selecione a arma</option>
                            {eligibleWeapons.map(w => (
                              <option key={w.id} value={w.id}>{w.manufacturer} {w.model} — {w.caliber} {w.sigmaNumber ? `(Sigma ${w.sigmaNumber})` : ''}</option>
                            ))}
                            {selectedWeaponId && !eligibleWeapons.some(w => w.id === selectedWeaponId) && (
                              <option value={selectedWeaponId}>Arma selecionada via busca</option>
                            )}
                          </select>
                        ) : (
                          <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2">
                            Nenhuma arma vinculada automaticamente. Use a busca abaixo ou cadastre uma nova.
                          </p>
                        )}

                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Ou busque pelo número Sigma/Série..."
                            value={weaponSearchQuery}
                            onChange={(e) => handleSearchWeapon(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700 font-mono"
                          />
                          {searchingWeapon && <span className="absolute right-3 top-3 text-[9px] text-slate-400 font-semibold">Buscando...</span>}
                          
                          {weaponSearchResults.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-40 overflow-y-auto divide-y divide-slate-100">
                              {weaponSearchResults.map(w => (
                                <button
                                  key={w.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedWeaponId(w.id);
                                    setWeaponSearchResults([]);
                                    setWeaponSearchQuery(`${w.manufacturer} ${w.model} (Sigma: ${w.sigmaNumber || 'N/A'})`);
                                  }}
                                  className="w-full text-left px-3 py-2 text-[11px] text-slate-700 hover:bg-blue-50 font-mono"
                                >
                                  {w.manufacturer} {w.model} {w.caliber} - Sigma: {w.sigmaNumber || 'N/A'} (Série: {w.serialNumber})
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {!showAddWeapon && (
                      <button
                        type="button"
                        onClick={() => setShowAddWeapon(true)}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 mt-1"
                      >
                        <PlusCircle className="w-3 h-3" /> Adicionar nova arma
                      </button>
                    )}
                    {showAddWeapon && (
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input type="text" placeholder="Fabricante" value={newWeapon.manufacturer} onChange={(e) => setNewWeapon({ ...newWeapon, manufacturer: e.target.value })} className="bg-white border border-slate-200 p-2 rounded-lg text-xs" />
                          <input type="text" placeholder="Modelo" value={newWeapon.model} onChange={(e) => setNewWeapon({ ...newWeapon, model: e.target.value })} className="bg-white border border-slate-200 p-2 rounded-lg text-xs" />
                          <input type="text" placeholder="Calibre" value={newWeapon.caliber} onChange={(e) => setNewWeapon({ ...newWeapon, caliber: e.target.value })} className="bg-white border border-slate-200 p-2 rounded-lg text-xs" />
                          <input type="text" placeholder="Número de série" value={newWeapon.serialNumber} onChange={(e) => setNewWeapon({ ...newWeapon, serialNumber: e.target.value })} className="bg-white border border-slate-200 p-2 rounded-lg text-xs" />
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setShowAddWeapon(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2 rounded-lg text-[11px] font-semibold">Cancelar</button>
                          <button type="button" disabled={savingWeapon} onClick={handleSaveNewWeapon} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2 rounded-lg text-[11px] font-semibold">
                            {savingWeapon ? 'Salvando...' : 'Salvar Arma'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase block font-semibold">
                      Seu Documento CR (EXÉRCITO BRASILEIRO)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: CR-102938-DF"
                      value={crInput}
                      onChange={(e) => setCrInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700 font-mono focus:ring-1 focus:ring-blue-500"
                      required
                    />
                    <span className="text-[9px] text-slate-400 block pt-0.5">Obrigatório para registro de atleta em torneio homologado SFPC.</span>
                  </div>

                  {/* Payment selection */}
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 uppercase block font-semibold">Meio de Homologação / Pagamento</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('pix')}
                        className={`p-3 border rounded-xl flex flex-col items-center justify-center gap-1 transition ${paymentMethod === 'pix' ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                      >
                        <Copy className="w-5 h-5" />
                        <span className="text-xs font-bold leading-none">PIX</span>
                        <span className="text-[9px] text-slate-400 font-sans">Aprovação imediata</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('credit_card')}
                        className={`p-3 border rounded-xl flex flex-col items-center justify-center gap-1 transition ${paymentMethod === 'credit_card' ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                      >
                        <CreditCard className="w-5 h-5" />
                        <span className="text-xs font-bold leading-none">Cartão</span>
                        <span className="text-[9px] text-slate-400 font-sans">Crédito parcelado</span>
                      </button>
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
                <div className="p-8 text-center space-y-4">
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
                <div className="p-6 text-center space-y-4">
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

    </div>
  );
}
