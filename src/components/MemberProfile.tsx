import React, { useState, useEffect } from 'react';
import { User, Post, Registration, StageScore, Championship } from '../types';
import {
  ShieldCheck, HelpCircle, Activity, Award, Grid, Target, CheckCircle2,
  DollarSign, Calendar, CreditCard, Copy, LogOut, FileText, Trophy,
  Disc, Printer, Plus, Trash2, ShieldAlert, ChevronRight, Info, PlusCircle, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MemberProfileProps {
  currentUser: User | null;
  selectedUser: User;
  posts: Post[];
  registrations: Registration[];
  stageScores: StageScore[];
  championships: Championship[];
  onToggleFollow: (userId: string) => Promise<void>;
  onPaySignature: () => Promise<void>;
  onLogout: () => void;
  onAddPost: (content: string, imageUrl?: string) => Promise<void>;
}

interface TrainingSession {
  id: string;
  date: string;
  discipline: string;
  gunModel: string;
  caliber: string;
  shots: number;
  distance: number;
  score: number;
  notes?: string;
}

interface AmmoPurchase {
  id: string;
  date: string;
  caliber: string;
  quantity: number;
  invoiceNumber: string;
  notes?: string;
}

const DEFAULT_TRAININGS: TrainingSession[] = [
  {
    id: 't1',
    date: '2026-05-15',
    discipline: 'IPSC Handgun',
    gunModel: 'Taurus TS9',
    caliber: '9mm',
    shots: 150,
    distance: 15,
    score: 138,
    notes: 'Treino focado em transição de alvos múltiplos e saque rápido.'
  },
  {
    id: 't2',
    date: '2026-05-28',
    discipline: 'Saque Rápido',
    gunModel: 'Glock G25',
    caliber: '.380',
    shots: 100,
    distance: 10,
    score: 92,
    notes: 'Treino de controle de recuo e trigger reset seco.'
  },
  {
    id: 't3',
    date: '2026-06-05',
    discipline: 'IPSC Handgun',
    gunModel: 'Taurus TS9',
    caliber: '9mm',
    shots: 200,
    distance: 20,
    score: 184,
    notes: 'Simulado de pista de IPSC com deslocamento lateral.'
  }
];

const DEFAULT_AMMO_PURCHASES: AmmoPurchase[] = [
  {
    id: 'a1',
    date: '2026-01-10',
    caliber: '9mm',
    quantity: 1000,
    invoiceNumber: 'NFe-00004512',
    notes: 'Lote de munições originais CBC para competições.'
  },
  {
    id: 'a2',
    date: '2026-03-22',
    caliber: '.380',
    quantity: 500,
    invoiceNumber: 'NFe-00005987',
    notes: 'Munições de treino para Glock G25.'
  },
  {
    id: 'a3',
    date: '2026-05-10',
    caliber: '9mm',
    quantity: 1000,
    invoiceNumber: 'NFe-00007812',
    notes: 'Compra de munição autorizada pelo SFPC.'
  }
];

export default function MemberProfile({
  currentUser,
  selectedUser,
  posts,
  registrations,
  stageScores,
  championships,
  onToggleFollow,
  onPaySignature,
  onLogout,
  onAddPost
}: MemberProfileProps) {
  // Tabs expanded
  type ProfileTabType = 'posts' | 'championships' | 'multi_championships' | 'my_registrations' | 'results' | 'certificates' | 'club_card' | 'gg_card' | 'trainings' | 'declarations' | 'ammo';
  const [profileTab, setProfileTab] = useState<ProfileTabType>('posts');

  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [payingSign, setPayingSign] = useState(false);
  const [paidSignDone, setPaidSignDone] = useState(false);
  const [selectedExpandPost, setSelectedExpandPost] = useState<Post | null>(null);

  // Local registration states
  const [selectedChampRegLocal, setSelectedChampRegLocal] = useState<Championship | null>(null);
  const [selectedModalityLocal, setSelectedModalityLocal] = useState('');
  const [crInputLocal, setCrInputLocal] = useState(currentUser?.crNumber || '');
  const [paymentMethodLocal, setPaymentMethodLocal] = useState<'pix' | 'credit_card'>('pix');
  const [paymentStepLocal, setPaymentStepLocal] = useState<'form' | 'processing' | 'done'>('form');

  // Local receipt states
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  // New features local states
  const [trainings, setTrainings] = useState<TrainingSession[]>([]);
  const [ammoPurchases, setAmmoPurchases] = useState<AmmoPurchase[]>([]);
  const [printMode, setPrintMode] = useState<'certificate' | 'club_card' | 'gg_card' | 'declaration_filiacao' | 'declaration_habitualidade' | null>(null);
  const [printData, setPrintData] = useState<any>(null);

  // Form states
  const [showAddTraining, setShowAddTraining] = useState(false);
  const [trainingForm, setTrainingForm] = useState({
    date: new Date().toISOString().split('T')[0],
    discipline: 'IPSC Handgun',
    gunModel: '',
    caliber: '9mm',
    shots: 50,
    distance: 15,
    score: 0,
    notes: ''
  });

  const [showAddAmmo, setShowAddAmmo] = useState(false);
  const [ammoForm, setAmmoForm] = useState({
    date: new Date().toISOString().split('T')[0],
    caliber: '9mm',
    quantity: 250,
    invoiceNumber: '',
    notes: ''
  });

  // Profile post states
  const [profilePostContent, setProfilePostContent] = useState('');
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string>('');
  const [isPostingProfilePost, setIsPostingProfilePost] = useState(false);

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateProfilePost = async () => {
    if (!profilePostContent.trim()) return;
    setIsPostingProfilePost(true);
    try {
      await onAddPost(profilePostContent, profileImagePreview || undefined);
      setProfilePostContent('');
      setProfileImageFile(null);
      setProfileImagePreview('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsPostingProfilePost(false);
    }
  };

  const isMe = currentUser?.id === selectedUser.id;
  const isFollowing = currentUser?.following.includes(selectedUser.id) || false;

  // Filter posts created by this selected user
  const userPosts = posts.filter(p => p.userId === selectedUser.id);
  const userTargetPosts = userPosts.filter(p => !!p.targetScore);
  const userScores = stageScores.filter(s => s.userId === selectedUser.id);
  const approvedRegs = registrations.filter(r => r.userId === selectedUser.id && r.paymentStatus === 'approved');

  // Load trainings and ammo
  useEffect(() => {
    const savedTrainings = localStorage.getItem(`gg_trainings_${selectedUser.id}`);
    if (savedTrainings) {
      try { setTrainings(JSON.parse(savedTrainings)); } catch (e) { setTrainings(DEFAULT_TRAININGS); }
    } else {
      setTrainings(DEFAULT_TRAININGS);
    }

    const savedAmmo = localStorage.getItem(`gg_ammo_${selectedUser.id}`);
    if (savedAmmo) {
      try { setAmmoPurchases(JSON.parse(savedAmmo)); } catch (e) { setAmmoPurchases(DEFAULT_AMMO_PURCHASES); }
    } else {
      setAmmoPurchases(DEFAULT_AMMO_PURCHASES);
    }
  }, [selectedUser.id]);

  // Save changes
  const saveTrainings = (newTrainings: TrainingSession[]) => {
    setTrainings(newTrainings);
    localStorage.setItem(`gg_trainings_${selectedUser.id}`, JSON.stringify(newTrainings));
  };

  const saveAmmo = (newAmmo: AmmoPurchase[]) => {
    setAmmoPurchases(newAmmo);
    localStorage.setItem(`gg_ammo_${selectedUser.id}`, JSON.stringify(newAmmo));
  };

  const handlePaySignatureSubmit = () => {
    setPayingSign(true);
    setTimeout(async () => {
      try {
        await onPaySignature();
        setPayingSign(false);
        setPaidSignDone(true);
        setTimeout(() => {
          setPaidSignDone(false);
          setIsSignModalOpen(false);
        }, 2200);
      } catch (err) {
        console.error(err);
        setPayingSign(false);
      }
    }, 1800);
  };

  // Add training handler
  const handleAddTrainingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainingForm.gunModel) return;
    const newSession: TrainingSession = {
      id: 't_' + Date.now(),
      ...trainingForm
    };
    saveTrainings([newSession, ...trainings]);
    setShowAddTraining(false);
    setTrainingForm({
      date: new Date().toISOString().split('T')[0],
      discipline: 'IPSC Handgun',
      gunModel: '',
      caliber: '9mm',
      shots: 50,
      distance: 15,
      score: 0,
      notes: ''
    });
  };

  // Add ammo handler
  const handleAddAmmoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ammoForm.invoiceNumber) return;
    const newPurchase: AmmoPurchase = {
      id: 'a_' + Date.now(),
      ...ammoForm
    };
    saveAmmo([newPurchase, ...ammoPurchases]);
    setShowAddAmmo(false);
    setAmmoForm({
      date: new Date().toISOString().split('T')[0],
      caliber: '9mm',
      quantity: 250,
      invoiceNumber: '',
      notes: ''
    });
  };

  const handleRegisterSubmitLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChampRegLocal || !selectedModalityLocal || !crInputLocal) return;

    setPaymentStepLocal('processing');
    
    setTimeout(async () => {
      try {
        const authHeaders: HeadersInit = { 'Content-Type': 'application/json' };
        if (currentUser) {
          authHeaders['x-user-id'] = currentUser.id;
        }
        const res = await fetch(`/api/championships/${selectedChampRegLocal.id}/register`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            modality: selectedModalityLocal,
            crNumber: crInputLocal,
            paymentMethod: paymentMethodLocal
          })
        });
        if (res.ok) {
          setPaymentStepLocal('done');
        } else {
          const data = await res.json();
          alert(data.error || 'Erro ao realizar inscrição.');
          setPaymentStepLocal('form');
        }
      } catch (err) {
        console.error(err);
        setPaymentStepLocal('form');
      }
    }, 1800);
  };

  const deleteTraining = (id: string) => {
    saveTrainings(trainings.filter(t => t.id !== id));
  };

  const deleteAmmo = (id: string) => {
    saveAmmo(ammoPurchases.filter(a => a.id !== id));
  };

  // Aggregate achievements/habits
  const combinedHabitualities = [
    ...userScores.map(s => ({
      date: s.createdAt.split('T')[0],
      caliber: s.modality.includes('380') ? '.380 ACP' : '9mm Luger',
      shots: 50,
      activity: `Etapa Oficial - ${s.modality}`,
      location: 'Stand de Tiro G&G'
    })),
    ...trainings.map(t => ({
      date: t.date,
      caliber: t.caliber === '.380' ? '.380 ACP' : t.caliber === '9mm' ? '9mm Luger' : t.caliber,
      shots: t.shots,
      activity: `Treino - ${t.discipline}`,
      location: 'Stand de Tiro G&G'
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Ammo Quota Calculations
  const ammoLimits: { [key: string]: number } = {
    '9mm': 5000,
    '.380': 5000,
    '.22 LR': 5000,
    '12 GA': 5000
  };

  const getPurchasedAmmoSum = (caliber: string) => {
    return ammoPurchases
      .filter(a => a.caliber === caliber)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  const getChampionshipName = (id: string) => {
    const champ = championships.find(c => c.id === id);
    return champ ? champ.title : 'Campeonato G&G Competições';
  };

  // Define sidebar menu items (only active for user's own profile)
  const menuItems = [
    { id: 'posts', label: 'Fotos Publicadas', icon: Grid, count: userPosts.length, public: true },
    { id: 'championships', label: 'Campeonatos', icon: Trophy, public: true },
    { id: 'multi_championships', label: 'Multi-Campeonatos', icon: Activity, public: true },
    { id: 'my_registrations', label: 'Minhas Inscrições', icon: CheckCircle2, count: approvedRegs.length, public: false },
    { id: 'results', label: 'Resultados', icon: Trophy, count: userScores.length, public: true },
    { id: 'certificates', label: 'Certificados', icon: Award, count: approvedRegs.length, public: false },
    { id: 'club_card', label: 'Carteirinha Clube', icon: CreditCard, public: false },
    { id: 'gg_card', label: 'Carteirinha G&G', icon: CreditCard, public: false },
    { id: 'trainings', label: 'Treinamentos', icon: PlusCircle, count: trainings.length, public: false },
    { id: 'declarations', label: 'Declarações', icon: FileText, public: false },
    { id: 'ammo', label: 'Controle Munição', icon: Disc, public: false },
  ];

  const filteredMenuItems = menuItems.filter(item => isMe || item.public);

  return (
    <div className="py-6 space-y-6">
      
      {/* Top Banner mock decoration */}
      <div className="h-32 bg-gradient-to-r from-blue-900 via-blue-950 to-slate-900 rounded-2xl relative overflow-hidden flex items-end p-4">
        <div className="absolute right-4 top-4 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-white font-mono uppercase font-bold tracking-wider">
          G&G FILIADO nº {selectedUser.isClubMember ? '918' : 'MOD'}
        </div>
      </div>

      {/* Main layout container */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        
        {/* Left Column: Profile Card & Navigation */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col items-center text-center relative mt-[-64px] z-10">
            {/* Avatar */}
            <div className="relative w-28 h-28 rounded-full bg-slate-50 p-[4px] border border-slate-200 shadow-sm">
              <img
                src={selectedUser.avatarUrl}
                alt={selectedUser.username}
                className="w-full h-full object-cover rounded-full"
                referrerPolicy="no-referrer"
              />
              {selectedUser.role === 'admin' && (
                <div className="absolute bottom-1 right-1 bg-amber-500 text-white p-1 rounded-full border-2 border-white shadow-md">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              )}
            </div>

            <div className="mt-4 leading-tight">
              <h3 className="font-display font-extrabold text-lg text-slate-900">{selectedUser.fullName}</h3>
              <span className="text-xs text-slate-400 font-mono">@{selectedUser.username}</span>
            </div>

            {/* Counts */}
            <div className="grid grid-cols-3 gap-6 py-4 w-full border-b border-t border-slate-100 mt-4 text-xs font-mono text-slate-600">
              <div>
                <span className="font-extrabold text-slate-900 block text-sm">{userPosts.length}</span>
                <span className="text-[10px] text-slate-500 block font-sans">Posts</span>
              </div>
              <div>
                <span className="font-extrabold text-slate-900 block text-sm">{selectedUser.followers?.length || 0}</span>
                <span className="text-[10px] text-slate-500 block font-sans">Seguidores</span>
              </div>
              <div>
                <span className="font-extrabold text-slate-900 block text-sm">{selectedUser.following?.length || 0}</span>
                <span className="text-[10px] text-slate-500 block font-sans">Seguindo</span>
              </div>
            </div>

            {/* Bio */}
            <p className="text-xs text-slate-600 leading-relaxed py-4 italic whitespace-pre-wrap">
              "{selectedUser.bio}"
            </p>

            {/* Action buttons */}
            <div className="w-full space-y-2 pt-2">
              {isMe ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsSignModalOpen(true)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-50 cursor-pointer"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    Anuidade
                  </button>
                  <button
                    onClick={onLogout}
                    className="text-red-600 hover:bg-red-50 hover:text-red-800 border border-red-105 p-2.5 rounded-xl transition flex items-center justify-center cursor-pointer"
                    title="Sair da Conta"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onToggleFollow(selectedUser.id)}
                  className={`w-full text-xs py-2.5 rounded-xl font-bold transition duration-200 cursor-pointer ${isFollowing ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-50'}`}
                >
                  {isFollowing ? 'Seguindo' : 'Seguir Atleta'}
                </button>
              )}
            </div>
          </div>

          {/* SIDEBAR NAVIGATION CARD (Visible on Desktop) */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-1">
            <h4 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider px-3 mb-2">Painel de Serviços</h4>
            <div className="space-y-1">
              {filteredMenuItems.map((item) => {
                const Icon = item.icon;
                const active = profileTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setProfileTab(item.id as ProfileTabType)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition duration-150 cursor-pointer text-left ${active ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600' : 'text-slate-650 hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.count !== undefined && (
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${active ? 'bg-blue-200 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Affiliation status Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div>
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Situação Associativa G&G</h4>
              <p className="text-[10px] text-slate-450 mt-0.5">Vínculo fiduciário oficial do clube de tiro.</p>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-slate-450 font-sans text-[11px]">Militares / CR Defesa</span>
                <span className="font-bold text-slate-800">{selectedUser.crNumber || 'Emitindo...'}</span>
              </div>

              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-slate-450 font-sans text-[11px]">Contribuição Anuidade</span>
                {selectedUser.hasPaidSignature ? (
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> REGULAR
                  </span>
                ) : (
                  <span className="font-bold text-rose-500">PENDENTE</span>
                )}
              </div>

              {selectedUser.hasPaidSignature && selectedUser.signatureExpiry && (
                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-slate-450 font-sans text-[11px]">Validade do Certificado</span>
                  <span className="font-bold text-slate-600">{new Date(selectedUser.signatureExpiry).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {isMe && !selectedUser.hasPaidSignature && (
              <button
                onClick={() => setIsSignModalOpen(true)}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white text-xs py-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-100 cursor-pointer"
              >
                Regularizar Anuidade de Atleta
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Content viewport based on current tab */}
        <div className="space-y-6 md:col-span-2">
          
          {/* MOBILE TAB CAROUSEL / HORIZONTAL SCROLL (Visible on Mobile) */}
          <div className="md:hidden flex gap-2 overflow-x-auto pb-2 border-b border-slate-200 no-scrollbar">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const active = profileTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setProfileTab(item.id as ProfileTabType)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition duration-150 cursor-pointer ${active ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label.split(' ')[0]}</span>
                  {item.count !== undefined && (
                    <span className={`text-[9px] font-mono px-1 rounded ${active ? 'bg-blue-800 text-blue-100' : 'bg-slate-100 text-slate-500'}`}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 1. Posts Grid (Original tab) */}
          {profileTab === 'posts' && (
            <div className="space-y-4">
              {isMe && (
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col gap-3">
                  <h4 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider">Publicar Nova Foto</h4>
                  <div className="flex gap-2">
                    <textarea
                      rows={2}
                      placeholder="Escreva uma legenda para sua foto de tiro..."
                      value={profilePostContent}
                      onChange={e => setProfilePostContent(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-1 focus:ring-blue-500 text-xs text-slate-800 resize-none"
                    />
                  </div>
                  
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex flex-col gap-1 w-full sm:w-auto">
                      <label className="text-[10px] text-slate-400 font-bold uppercase">Foto do Computador</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfileImageChange}
                        className="text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                      />
                    </div>
                    
                    {profileImagePreview && (
                      <div className="relative w-12 h-12 rounded border border-slate-200 overflow-hidden flex-shrink-0 bg-slate-50">
                        <img src={profileImagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setProfileImageFile(null);
                            setProfileImagePreview('');
                          }}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow hover:bg-red-650 flex items-center justify-center cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <button
                      onClick={handleCreateProfilePost}
                      disabled={isPostingProfilePost || !profilePostContent.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition self-end sm:self-center cursor-pointer shadow-md shadow-blue-50 flex items-center gap-1"
                    >
                      {isPostingProfilePost ? 'Publicando...' : 'Publicar'}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {userPosts.length === 0 ? (
                  <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-2xl smooth-shadow border border-slate-100">
                    <Grid className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    <p className="font-medium text-sm">Nenhuma foto publicada ainda.</p>
                  </div>
                ) : (
                  userPosts.map((post) => (
                    <motion.div
                      key={post.id}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setSelectedExpandPost(post)}
                      className="aspect-square bg-slate-100 rounded-xl overflow-hidden cursor-pointer smooth-shadow border border-slate-200 relative group"
                    >
                      <img
                        src={post.imageUrl || "https://picsum.photos/seed/shoot/600/600"}
                        alt="Thumbnail"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-blue-900/40 opacity-0 group-hover:opacity-100 transition duration-150 flex items-center justify-center gap-4 text-white text-xs font-bold font-mono">
                        <span>❤ {post.likes.length}</span>
                        <span>💬 {post.comments.length}</span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Campeonatos tab */}
          {profileTab === 'championships' && (
            <div className="bg-white rounded-2xl smooth-shadow border border-slate-100 p-6 space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="font-display font-bold text-slate-800 text-sm uppercase">Campeonatos do Clube</h4>
                <Trophy className="w-5 h-5 text-blue-600" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {championships.map((champ) => {
                  const isFinished = champ.status === 'completed';
                  const userRegs = registrations.filter(r => r.championshipId === champ.id && r.userId === selectedUser.id);
                  const isRegistered = userRegs.length > 0;

                  return (
                    <div key={champ.id} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 flex flex-col justify-between">
                      <div className="h-32 bg-slate-200 relative">
                        <img src={champ.bannerUrl} alt={champ.title} className="w-full h-full object-cover" />
                        <div className="absolute top-2 left-2 flex gap-1">
                          {isFinished ? (
                            <span className="bg-slate-900/80 text-white text-[9px] px-2 py-0.5 rounded font-bold uppercase">Finalizado</span>
                          ) : (
                            <span className="bg-emerald-600 text-white text-[9px] px-2 py-0.5 rounded font-bold uppercase">Aberto</span>
                          )}
                          {isRegistered && (
                            <span className="bg-blue-600 text-white text-[9px] px-2 py-0.5 rounded font-bold uppercase">Inscrito</span>
                          )}
                        </div>
                      </div>
                      <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                        <div>
                          <h5 className="font-bold text-slate-900 text-xs">{champ.title}</h5>
                          <p className="text-[10px] text-slate-500 line-clamp-2 mt-1">{champ.description}</p>
                        </div>
                        <div className="border-t border-slate-100 pt-2 mt-2 text-[10px] text-slate-650 space-y-1 font-mono">
                          <div>Taxa: R$ {champ.registrationFee}</div>
                          <div>Etapas: {champ.stagesCount}</div>
                          <div className="flex flex-wrap gap-1 pt-1">
                            {champ.modalities.slice(0, 3).map((m, idx) => (
                              <span key={idx} className="bg-slate-200 text-slate-700 text-[8px] px-1.5 py-0.5 rounded font-bold uppercase">{m}</span>
                            ))}
                          </div>
                        </div>
                        {isMe && !isFinished && (
                          <button
                            onClick={() => {
                              setSelectedChampRegLocal(champ);
                              setSelectedModalityLocal(champ.modalities[0]);
                            }}
                            className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white text-[11px] py-2 rounded-lg font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Target className="w-3.5 h-3.5" />
                            Inscrever-se
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Multi-Campeonatos tab */}
          {profileTab === 'multi_championships' && (
            <div className="bg-white rounded-2xl smooth-shadow border border-slate-100 p-6 space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-display font-bold text-slate-800 text-sm uppercase">Painel Multi-Campeonatos</h4>
                  <p className="text-[10px] text-slate-400">Visão consolidada do atleta em todas as competições federadas.</p>
                </div>
                <Activity className="w-5 h-5 text-blue-600 animate-pulse" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-center">
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <span className="text-[10px] text-slate-500 block font-sans">Média Geral de Pontos</span>
                  <span className="font-bold text-lg text-blue-700">
                    {userScores.length > 0
                      ? (userScores.reduce((sum, s) => sum + s.score, 0) / userScores.length).toFixed(2)
                      : '0.00'}
                  </span>
                </div>
                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                  <span className="text-[10px] text-slate-500 block font-sans">Aproveitamento Técnico</span>
                  <span className="font-bold text-lg text-emerald-700">
                    {userScores.length > 0
                      ? `${Math.min(100, (userScores.reduce((sum, s) => sum + s.score, 0) / (userScores.length * 150)) * 100).toFixed(1)}%`
                      : '0.0%'}
                  </span>
                </div>
                <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                  <span className="text-[10px] text-slate-500 block font-sans">Presença nas Etapas</span>
                  <span className="font-bold text-lg text-amber-700">
                    {championships.length > 0 && approvedRegs.length > 0
                      ? `${((userScores.length / (approvedRegs.length * 4)) * 100).toFixed(0)}%`
                      : '0%'}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <h5 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider">Desempenho por Campeonato</h5>
                {approvedRegs.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl">
                    <Activity className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-xs">O atleta ainda não está inscrito em nenhum campeonato ativo.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {approvedRegs.map((reg) => {
                      const champ = championships.find(c => c.id === reg.championshipId);
                      if (!champ) return null;

                      const scoresForChamp = userScores.filter(s => s.championshipId === reg.championshipId && s.modality === reg.modality);
                      const totalPoints = scoresForChamp.reduce((sum, s) => sum + s.score, 0);
                      const progressPercent = Math.min(100, (scoresForChamp.length / champ.stagesCount) * 100);

                      return (
                        <div key={reg.id} className="border border-slate-150 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h6 className="font-bold text-slate-800 text-xs">{champ.title}</h6>
                              <span className="text-[10px] text-slate-400 block font-mono">{reg.modality}</span>
                            </div>
                            <span className="text-[10px] bg-blue-100 text-blue-800 font-mono font-bold px-2 py-0.5 rounded">
                              {scoresForChamp.length} / {champ.stagesCount} Etapas
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] text-slate-400">
                              <span>Progresso das Etapas</span>
                              <span>{progressPercent.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                              <div className="bg-blue-600 h-full rounded-full" style={{ width: `${progressPercent}%` }}></div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-500 pt-1">
                            <div>Pontuação: <span className="font-bold text-slate-700">{totalPoints.toFixed(2)} pts</span></div>
                            <div>Média/Etapa: <span className="font-bold text-slate-700">{scoresForChamp.length > 0 ? (totalPoints / scoresForChamp.length).toFixed(2) : '0.00'} pts</span></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Minhas Inscrições tab */}
          {profileTab === 'my_registrations' && (
            <div className="bg-white rounded-2xl smooth-shadow border border-slate-100 p-6 space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="font-display font-bold text-slate-800 text-sm uppercase">Minhas Inscrições Homologadas</h4>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>

              {registrations.filter(r => r.userId === selectedUser.id).length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl">
                  <CheckCircle2 className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs">Nenhuma inscrição encontrada para este atleta.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {registrations.filter(r => r.userId === selectedUser.id).map((reg) => {
                    const champ = championships.find(c => c.id === reg.championshipId);
                    return (
                      <div key={reg.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${reg.paymentStatus === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                              {reg.paymentStatus === 'approved' ? 'HOMOLOGADA' : 'PENDENTE'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {reg.id.slice(0, 8).toUpperCase()}</span>
                          </div>
                          <h5 className="font-bold text-slate-800 text-xs mt-1">{champ ? champ.title : 'Campeonato G&G'}</h5>
                          <div className="text-[10px] text-slate-550 space-y-0.5 font-mono leading-tight">
                            <div>Modalidade: <span className="font-bold text-slate-700">{reg.modality}</span></div>
                            <div>Documento CR: <span className="font-bold text-slate-700">{reg.crNumber}</span></div>
                            <div>Data Registro: {new Date(reg.registeredAt).toLocaleDateString()}</div>
                            {reg.txId && <div className="truncate max-w-[280px]">TxID: {reg.txId}</div>}
                          </div>
                        </div>
                        
                        <button
                          onClick={() => {
                            setReceiptData({
                              regId: reg.id,
                              champTitle: champ ? champ.title : 'Campeonato G&G',
                              modality: reg.modality,
                              crNumber: reg.crNumber,
                              registeredAt: reg.registeredAt,
                              paymentMethod: reg.paymentMethod,
                              paymentStatus: reg.paymentStatus,
                              txId: reg.txId,
                              athleteName: selectedUser.fullName,
                              athleteUsername: selectedUser.username
                            });
                            setIsReceiptOpen(true);
                          }}
                          className="self-end sm:self-center bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-800 text-xs px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer border border-blue-100"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Ver Comprovante
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 4. Resultados (NEW tab) */}
          {profileTab === 'results' && (
            <div className="bg-white rounded-2xl smooth-shadow border border-slate-100 p-6 space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="font-display font-bold text-slate-800 text-sm uppercase">Histórico de Resultados em Competições</h4>
                <Trophy className="w-5 h-5 text-amber-500" />
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-4 font-mono text-center">
                <div className="bg-slate-50 p-3 rounded-lg">
                  <span className="text-[10px] text-slate-450 block font-sans">Etapas Disputadas</span>
                  <span className="font-bold text-base text-slate-800">{userScores.length}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <span className="text-[10px] text-slate-450 block font-sans">Pontos Acumulados</span>
                  <span className="font-bold text-base text-blue-600">
                    {userScores.reduce((sum, s) => sum + s.score, 0).toFixed(2)}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <span className="text-[10px] text-slate-450 block font-sans">Melhor Fator</span>
                  <span className="font-bold text-base text-emerald-600">
                    {userScores.length > 0 ? Math.max(...userScores.map(s => s.hitFactor || 0)).toFixed(3) : '0.000'}
                  </span>
                </div>
              </div>

              {userScores.length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl">
                  <Trophy className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs">Nenhum resultado homologado encontrado para este atleta.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-450 uppercase font-mono tracking-wider">
                        <th className="py-3 px-2">Campeonato</th>
                        <th className="py-3 px-2">Modalidade</th>
                        <th className="py-3 px-2 text-center">Etapa</th>
                        <th className="py-3 px-2 text-right">Tempo</th>
                        <th className="py-3 px-2 text-right">Pontos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {userScores.map((score) => (
                        <tr key={score.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-2 font-semibold text-slate-800">{getChampionshipName(score.championshipId)}</td>
                          <td className="py-3 px-2 text-slate-600">{score.modality}</td>
                          <td className="py-3 px-2 text-center font-bold text-blue-600 font-mono">#{score.stageNum}</td>
                          <td className="py-3 px-2 text-right font-mono text-slate-550">{score.timeSeconds ? `${score.timeSeconds}s` : '-'}</td>
                          <td className="py-3 px-2 text-right font-bold font-mono text-slate-800">{score.score.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 5. Certificados (NEW tab) */}
          {profileTab === 'certificates' && (
            <div className="bg-white rounded-2xl smooth-shadow border border-slate-100 p-6 space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="font-display font-bold text-slate-800 text-sm uppercase">Certificados de Competição</h4>
                <Award className="w-5 h-5 text-blue-600" />
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Aqui são listados os certificados oficiais de participação referentes aos campeonatos nos quais você realizou inscrição e concluiu etapas regulamentadas.
              </p>

              {approvedRegs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl">
                  <Award className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs">Nenhum certificado disponível. Inscreva-se em um campeonato e conclua suas etapas.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {approvedRegs.map((reg) => {
                    const champName = getChampionshipName(reg.championshipId);
                    const scoresForChamp = userScores.filter(s => s.championshipId === reg.championshipId);
                    const totalPoints = scoresForChamp.reduce((sum, s) => sum + s.score, 0);
                    return (
                      <div key={reg.id} className="border border-slate-100 rounded-xl p-4 flex flex-col justify-between bg-slate-50/50 hover:bg-slate-50 transition">
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">
                            HOMOLOGADO
                          </span>
                          <h5 className="font-bold text-slate-800 text-xs mt-1.5">{champName}</h5>
                          <div className="text-[10px] text-slate-450 font-mono">
                            <div>Mod: {reg.modality}</div>
                            <div>Etapas: {scoresForChamp.length} concluídas</div>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => {
                            setPrintData({
                              fullName: selectedUser.fullName,
                              crNumber: selectedUser.crNumber || 'Emitindo...',
                              championshipTitle: champName,
                              modality: reg.modality,
                              score: totalPoints,
                              date: new Date(reg.registeredAt).toISOString().split('T')[0],
                              hash: `GG-CERT-${reg.id.slice(0, 8).toUpperCase()}`
                            });
                            setPrintMode('certificate');
                          }}
                          className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 rounded-lg font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Gerar Certificado
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 6. Carteirinha Clube (NEW tab) */}
          {profileTab === 'club_card' && (
            <div className="bg-white rounded-2xl smooth-shadow border border-slate-100 p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                <h4 className="font-display font-bold text-slate-800 text-sm uppercase">Carteira de Membro do Clube</h4>
                <CreditCard className="w-5 h-5 text-blue-600" />
              </div>

              <div className="flex flex-col lg:flex-row gap-6 items-center justify-center py-4">
                
                {/* Front Preview */}
                <div style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }} className="w-[340px] h-[210px] rounded-xl p-4 flex flex-col justify-between relative shadow-lg overflow-hidden border border-slate-800 select-none">
                  {/* Background decoration */}
                  <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
                    <Target className="w-44 h-44 text-white translate-x-10 translate-y-10" />
                  </div>
                  
                  {/* Header */}
                  <div className="flex justify-between items-start border-b border-slate-800 pb-1.5">
                    <div>
                      <span className="font-display font-extrabold text-[12px] tracking-wider text-amber-400 block">G&G CLUBE DE TIRO</span>
                      <span className="text-[8px] font-sans text-slate-400 tracking-widest block mt-0.5">FILIADO OFICIAL</span>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-[8px] font-bold text-emerald-400 uppercase tracking-widest">
                      ATIVO
                    </div>
                  </div>

                  {/* Body info */}
                  <div className="flex gap-3 items-center my-2">
                    <img
                      src={selectedUser.avatarUrl}
                      alt={selectedUser.username}
                      className="w-14 h-14 rounded-lg object-cover border border-slate-700 bg-slate-900"
                    />
                    <div className="text-[10px] space-y-0.5 leading-tight">
                      <div className="font-bold text-white text-[11px] truncate w-[190px]">{selectedUser.fullName}</div>
                      <div><span className="text-slate-450 font-mono">CR nº:</span> <span className="text-white font-mono font-bold">{selectedUser.crNumber || 'EMISSÃO...'}</span></div>
                      <div><span className="text-slate-450">Categoria:</span> <span className="text-amber-300 font-bold">Sócio Contribuinte</span></div>
                      <div><span className="text-slate-450">Emissão:</span> <span className="text-slate-300 font-mono">01/02/2026</span></div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex justify-between items-center text-[8px] font-mono text-slate-400 border-t border-slate-800 pt-1.5">
                    <span>REG: GG-MEM-{selectedUser.id.slice(0, 6).toUpperCase()}</span>
                    <span>Val: {selectedUser.signatureExpiry ? new Date(selectedUser.signatureExpiry).toLocaleDateString() : '01/02/2027'}</span>
                  </div>
                </div>

                {/* Back Preview */}
                <div style={{ backgroundColor: '#ffffff', color: '#1e293b' }} className="w-[340px] h-[210px] rounded-xl p-4 flex flex-col justify-between relative shadow-lg overflow-hidden border border-slate-200 select-none text-slate-750">
                  <div className="text-[7.5px] leading-tight space-y-1">
                    <p className="font-bold border-b border-slate-100 pb-1 uppercase tracking-wider text-slate-900">Regras de Segurança & Conduta</p>
                    <p>1. O portador deste documento compromete-se a cumprir rigorosamente as normas de segurança do G&G Clube de Tiro.</p>
                    <p>2. A circulação com armamento nas dependências do clube deve obedecer às diretrizes do SFPC.</p>
                    <p>3. Este documento é pessoal, intransferível e comprova vínculo social regularizado.</p>
                  </div>

                  <div className="flex justify-between items-end mt-2 pt-2 border-t border-slate-100">
                    <div className="space-y-1 text-left">
                      <span className="text-[8px] block font-mono font-bold text-slate-800">CNPJ: 45.981.042/0001-12</span>
                      <div className="h-4 bg-slate-900 w-28 flex items-center justify-center text-[7px] text-white tracking-widest font-mono">
                        ||||||| | ||||| | |||
                      </div>
                    </div>
                    <div className="text-[8px] text-right font-mono flex flex-col items-end">
                      <div className="w-10 h-10 bg-slate-100 border border-slate-200 rounded flex items-center justify-center text-[7px]">
                        [QR-CODE]
                      </div>
                      <span className="mt-1 text-[6.5px] text-slate-400">Assinatura Eletrônica G&G</span>
                    </div>
                  </div>
                </div>

              </div>

              <button
                onClick={() => {
                  setPrintData({
                    fullName: selectedUser.fullName,
                    crNumber: selectedUser.crNumber || 'Emitindo...',
                    regId: `GG-MEM-${selectedUser.id.slice(0, 6).toUpperCase()}`,
                    valDate: selectedUser.signatureExpiry ? new Date(selectedUser.signatureExpiry).toLocaleDateString() : '01/02/2027'
                  });
                  setPrintMode('club_card');
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Imprimir Carteirinha do Clube
              </button>
            </div>
          )}

          {/* 7. Carteirinha G&G Federal (NEW tab) */}
          {profileTab === 'gg_card' && (
            <div className="bg-white rounded-2xl smooth-shadow border border-slate-100 p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                <h4 className="font-display font-bold text-slate-800 text-sm uppercase">Carteira de Atleta Federal G&G</h4>
                <Award className="w-5 h-5 text-amber-500" />
              </div>

              <div className="flex flex-col lg:flex-row gap-6 items-center justify-center py-4">
                
                {/* Front Preview */}
                <div style={{ backgroundColor: '#090d16', color: '#f8fafc', borderColor: '#d97706' }} className="w-[340px] h-[210px] rounded-xl p-4 flex flex-col justify-between relative shadow-lg overflow-hidden border-2 select-none">
                  {/* Pattern lines inside card */}
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(0,0,0,0.1)_25%,transparent_25%,transparent_50%,rgba(0,0,0,0.1)_50%,rgba(0,0,0,0.1)_75%,transparent_75%,transparent)] bg-[size:10px_10px] opacity-10 pointer-events-none"></div>
                  
                  {/* Header */}
                  <div className="flex justify-between items-start border-b border-amber-600/30 pb-1.5">
                    <div>
                      <span className="font-display font-extrabold text-[11px] tracking-wider text-amber-500 block">G&G COMPETIÇÕES</span>
                      <span className="text-[8px] font-sans text-slate-450 tracking-widest block mt-0.5">CIRCUITO NACIONAL DE ATLETAS</span>
                    </div>
                    <div className="bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">
                      FEDERADO
                    </div>
                  </div>

                  {/* Body info */}
                  <div className="flex gap-3 items-center my-2">
                    <img
                      src={selectedUser.avatarUrl}
                      alt={selectedUser.username}
                      className="w-14 h-14 rounded-lg object-cover border-2 border-amber-500/40 bg-slate-900"
                    />
                    <div className="text-[10px] space-y-0.5 leading-tight">
                      <div className="font-bold text-white text-[11px] truncate w-[190px]">{selectedUser.fullName}</div>
                      <div><span className="text-slate-400 font-mono">CR nº:</span> <span className="text-white font-mono font-bold">{selectedUser.crNumber || 'EMISSÃO...'}</span></div>
                      <div><span className="text-slate-450">Categoria:</span> <span className="text-amber-400 font-bold">Classe A - Pistola</span></div>
                      <div><span className="text-slate-450 font-mono">ID Fed:</span> <span className="text-slate-300 font-mono font-bold">GG-FED-{selectedUser.id.slice(0, 6).toUpperCase()}</span></div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex justify-between items-center text-[7.5px] font-mono text-slate-400 border-t border-amber-600/30 pt-1.5">
                    <span>FEDERAÇÃO FILIADA G&G BRASIL</span>
                    <span className="text-amber-500 font-bold">VAL: 12/2026</span>
                  </div>
                </div>

                {/* Back Preview */}
                <div style={{ backgroundColor: '#ffffff', color: '#1e293b' }} className="w-[340px] h-[210px] rounded-xl p-4 flex flex-col justify-between relative shadow-lg overflow-hidden border border-slate-200 select-none text-slate-750">
                  <div className="text-[7.5px] leading-tight space-y-1">
                    <p className="font-bold border-b border-slate-100 pb-1 uppercase tracking-wider text-slate-900">Amparo Legal & Transporte</p>
                    <p className="italic font-sans text-slate-500">"Resguardada a prerrogativa de Porte de Trânsito para atiradores desportivos com guia de tráfego, conforme Lei Geral do Esporte nº 14.597/23."</p>
                    <p>Contatos em caso de emergência ou validação cadastral: suporte@gegpistol.online</p>
                  </div>

                  <div className="flex justify-between items-end mt-2 pt-2 border-t border-slate-100">
                    <div className="space-y-1 text-left">
                      <span className="text-[7.5px] block font-semibold text-slate-800">Circuito Esportivo Homologado</span>
                      <div className="h-4 bg-slate-900 w-28 flex items-center justify-center text-[7px] text-white tracking-widest font-mono">
                        *FED-{selectedUser.id.slice(0, 6).toUpperCase()}*
                      </div>
                    </div>
                    <div className="text-[8px] text-right font-mono flex flex-col items-end">
                      <div className="w-10 h-10 bg-slate-100 border border-slate-200 rounded flex items-center justify-center text-[7px]">
                        [VALID-QR]
                      </div>
                      <span className="mt-1 text-[6px] text-slate-400">G&G Competitions Board</span>
                    </div>
                  </div>
                </div>

              </div>

              <button
                onClick={() => {
                  setPrintData({
                    fullName: selectedUser.fullName,
                    crNumber: selectedUser.crNumber || 'Emitindo...',
                    fedId: `GG-FED-${selectedUser.id.slice(0, 6).toUpperCase()}`
                  });
                  setPrintMode('gg_card');
                }}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs py-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Imprimir Carteirinha G&G
              </button>
            </div>
          )}

          {/* 8. Treinamentos (NEW tab) */}
          {profileTab === 'trainings' && (
            <div className="bg-white rounded-2xl smooth-shadow border border-slate-100 p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                <h4 className="font-display font-bold text-slate-800 text-sm uppercase">Diário de Treinamentos</h4>
                <button
                  onClick={() => setShowAddTraining(!showAddTraining)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  {showAddTraining ? 'Cancelar' : (
                    <>
                      <Plus className="w-4 h-4" />
                      Registrar Treino
                    </>
                  )}
                </button>
              </div>

              {/* Training Form */}
              <AnimatePresence>
                {showAddTraining && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={handleAddTrainingSubmit}
                    className="bg-slate-50 p-4 rounded-xl space-y-3 overflow-hidden text-xs text-slate-700 border border-slate-100"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-slate-450 font-bold uppercase mb-1">Data</label>
                        <input
                          type="date"
                          required
                          value={trainingForm.date}
                          onChange={e => setTrainingForm({ ...trainingForm, date: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-450 font-bold uppercase mb-1">Disciplina</label>
                        <select
                          value={trainingForm.discipline}
                          onChange={e => setTrainingForm({ ...trainingForm, discipline: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-blue-500 text-slate-850"
                        >
                          <option>IPSC Handgun</option>
                          <option>Saque Rápido</option>
                          <option>Fogo Central</option>
                          <option>Trap Americano</option>
                          <option>Carabina Mira Aberta 10m</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-slate-450 font-bold uppercase mb-1">Modelo de Arma</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Taurus TS9"
                          value={trainingForm.gunModel}
                          onChange={e => setTrainingForm({ ...trainingForm, gunModel: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-450 font-bold uppercase mb-1">Calibre</label>
                        <select
                          value={trainingForm.caliber}
                          onChange={e => setTrainingForm({ ...trainingForm, caliber: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-blue-500 text-slate-850"
                        >
                          <option value="9mm">9mm Luger</option>
                          <option value=".380">.380 ACP</option>
                          <option value=".22 LR">.22 LR</option>
                          <option value="12 GA">12 Gauge</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] text-slate-450 font-bold uppercase mb-1">Disparos</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={trainingForm.shots}
                          onChange={e => setTrainingForm({ ...trainingForm, shots: parseInt(e.target.value) || 0 })}
                          className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-450 font-bold uppercase mb-1">Distância (m)</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={trainingForm.distance}
                          onChange={e => setTrainingForm({ ...trainingForm, distance: parseInt(e.target.value) || 0 })}
                          className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-450 font-bold uppercase mb-1">Pontos (0-150)</label>
                        <input
                          type="number"
                          min="0"
                          max="150"
                          required
                          value={trainingForm.score}
                          onChange={e => setTrainingForm({ ...trainingForm, score: parseInt(e.target.value) || 0 })}
                          className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-450 font-bold uppercase mb-1">Notas de Observação</label>
                      <textarea
                        rows={2}
                        placeholder="Ex: Foco no acionamento do gatilho..."
                        value={trainingForm.notes}
                        onChange={e => setTrainingForm({ ...trainingForm, notes: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-bold transition cursor-pointer"
                    >
                      Salvar Treinamento no Diário
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Stats panel */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center font-mono">
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                  <span className="text-[9px] text-slate-450 uppercase block font-sans">Total Sessões</span>
                  <span className="text-base font-bold text-slate-800">{trainings.length}</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                  <span className="text-[9px] text-slate-450 uppercase block font-sans">Munição Disparada</span>
                  <span className="text-base font-bold text-blue-600">
                    {trainings.reduce((sum, t) => sum + t.shots, 0)} cartuchos
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100 col-span-2 sm:col-span-1">
                  <span className="text-[9px] text-slate-450 uppercase block font-sans">Precisão Recorde</span>
                  <span className="text-base font-bold text-emerald-600">
                    {trainings.length > 0 ? Math.max(...trainings.map(t => t.score)) : 0} pts
                  </span>
                </div>
              </div>

              {/* List */}
              {trainings.length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Activity className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs">Nenhum treinamento registrado ainda. Clique em "Registrar Treino".</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {trainings.map(t => (
                    <div key={t.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50/30 relative hover:border-slate-200 transition">
                      <button
                        onClick={() => deleteTraining(t.id)}
                        className="absolute right-4 top-4 text-slate-400 hover:text-red-500 transition p-1 cursor-pointer"
                        title="Deletar registro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      
                      <div className="flex justify-between items-start border-b border-slate-100 pb-2 mb-2 pr-6">
                        <div>
                          <span className="text-[10px] text-slate-450 font-mono font-bold block">{t.date}</span>
                          <span className="font-bold text-xs text-slate-800 block mt-0.5">{t.discipline}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10.5px] font-bold text-blue-600 block">{t.gunModel} ({t.caliber})</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 font-mono text-[10.5px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-50">
                        <div>Disparos: <span className="font-bold text-slate-800">{t.shots}</span></div>
                        <div>Alvo: <span className="font-bold text-slate-800">{t.distance}m</span></div>
                        <div>Score: <span className="font-bold text-emerald-600">{t.score} pts</span></div>
                      </div>

                      {t.notes && (
                        <p className="text-[10.5px] text-slate-500 italic mt-2 font-sans pl-1.5 border-l-2 border-slate-200">
                          "{t.notes}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 9. Declarações (NEW tab) */}
          {profileTab === 'declarations' && (
            <div className="bg-white rounded-2xl smooth-shadow border border-slate-100 p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                <h4 className="font-display font-bold text-slate-800 text-sm uppercase">Emissão de Declarações Oficiais</h4>
                <FileText className="w-5 h-5 text-blue-600" />
              </div>

              <div className="space-y-4">
                
                {/* 1. Declaração de Filiação */}
                <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-md">
                    <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Declaração de Filiação do Clube</h5>
                    <p className="text-[10.5px] text-slate-500 leading-relaxed">
                      Certifica que você é associado ativo do G&G Clube de Tiro, estando com suas anuidades regularizadas. Documento exigido para processos no Exército Brasileiro (SFPC).
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setPrintData({
                        fullName: selectedUser.fullName,
                        crNumber: selectedUser.crNumber || 'Emitindo...',
                        date: new Date().toISOString().split('T')[0],
                        hash: `GG-FIL-${selectedUser.id.slice(0, 8).toUpperCase()}`
                      });
                      setPrintMode('declaration_filiacao');
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 self-start sm:self-center transition cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Gerar Declaração
                  </button>
                </div>

                {/* 2. Declaração de Habitualidade */}
                <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1 max-w-md">
                      <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Declaração de Habitualidade (Frequência)</h5>
                      <p className="text-[10.5px] text-slate-500 leading-relaxed">
                        Documento comprobatório de habitualidade esportiva de tiro contendo histórico detalhado dos seus treinamentos e etapas oficiais nos calibres registrados.
                      </p>
                    </div>
                    
                    <button
                      disabled={combinedHabitualities.length < 8}
                      onClick={() => {
                        setPrintData({
                          fullName: selectedUser.fullName,
                          crNumber: selectedUser.crNumber || 'Emitindo...',
                          activities: combinedHabitualities,
                          date: new Date().toISOString().split('T')[0],
                          hash: `GG-HAB-${selectedUser.id.slice(0, 8).toUpperCase()}`
                        });
                        setPrintMode('declaration_habitualidade');
                      }}
                      className={`text-xs font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 self-start sm:self-center transition cursor-pointer ${combinedHabitualities.length >= 8 ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Gerar Habitualidade
                    </button>
                  </div>

                  {/* Habitualities status indicator */}
                  <div className="bg-white p-3 rounded-lg border border-slate-100 flex items-center justify-between text-[11px] font-sans">
                    <div className="flex items-center gap-2">
                      {combinedHabitualities.length >= 8 ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0" />
                      )}
                      <div>
                        <span className="font-bold text-slate-800">
                          Frequência Cadastrada: {combinedHabitualities.length} de 8 obrigatórias
                        </span>
                        <p className="text-[10px] text-slate-450 mt-0.5">
                          {combinedHabitualities.length >= 8
                            ? 'Requisito legal do Exército Brasileiro atendido! Emissão disponível.'
                            : `Faltam ${8 - combinedHabitualities.length} registros (treinos ou competições) para liberar o documento.`}
                        </p>
                      </div>
                    </div>
                    
                    <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden flex-shrink-0">
                      <div
                        className={`h-full rounded-full ${combinedHabitualities.length >= 8 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        style={{ width: `${Math.min((combinedHabitualities.length / 8) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Small collapsed activities summary */}
                  {combinedHabitualities.length > 0 && (
                    <div className="text-[9.5px] font-mono text-slate-500 bg-white p-2.5 rounded-lg border border-slate-100 max-h-28 overflow-y-auto space-y-1">
                      <div className="font-sans font-bold text-[8.5px] text-slate-400 uppercase tracking-wider mb-1">Últimos Registros no Histórico</div>
                      {combinedHabitualities.map((item, idx) => (
                        <div key={idx} className="flex justify-between border-b border-slate-50 pb-0.5">
                          <span>{item.date} - {item.activity}</span>
                          <span className="font-bold text-slate-700">{item.caliber} ({item.shots} tir.)</span>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}

          {/* 10. Munição (NEW tab) */}
          {profileTab === 'ammo' && (
            <div className="bg-white rounded-2xl smooth-shadow border border-slate-100 p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                <h4 className="font-display font-bold text-slate-800 text-sm uppercase">Controle de Cotas de Munição</h4>
                <button
                  onClick={() => setShowAddAmmo(!showAddAmmo)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  {showAddAmmo ? 'Cancelar' : (
                    <>
                      <Plus className="w-4 h-4" />
                      Registrar Compra
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Gerenciamento de cotas de insumos e munições. O limite anual brasileiro para caçadores, atiradores e colecionadores (CACs) regulados pelo SIGMA é de 5.000 munições por ano para cada calibre registrado.
              </p>

              {/* Ammo purchase registration form */}
              <AnimatePresence>
                {showAddAmmo && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={handleAddAmmoSubmit}
                    className="bg-slate-50 p-4 rounded-xl space-y-3 overflow-hidden text-xs text-slate-700 border border-slate-100"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-slate-450 font-bold uppercase mb-1">Data da Aquisição</label>
                        <input
                          type="date"
                          required
                          value={ammoForm.date}
                          onChange={e => setAmmoForm({ ...ammoForm, date: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-450 font-bold uppercase mb-1">Calibre</label>
                        <select
                          value={ammoForm.caliber}
                          onChange={e => setAmmoForm({ ...ammoForm, caliber: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-blue-500 text-slate-850"
                        >
                          <option value="9mm">9mm Luger</option>
                          <option value=".380">.380 ACP</option>
                          <option value=".22 LR">.22 LR</option>
                          <option value="12 GA">12 Gauge</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-slate-450 font-bold uppercase mb-1">Quantidade Adquirida</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={ammoForm.quantity}
                          onChange={e => setAmmoForm({ ...ammoForm, quantity: parseInt(e.target.value) || 0 })}
                          className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-450 font-bold uppercase mb-1">Número da Nota Fiscal (NFe)</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: NFe-000284"
                          value={ammoForm.invoiceNumber}
                          onChange={e => setAmmoForm({ ...ammoForm, invoiceNumber: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-450 font-bold uppercase mb-1">Observações / Fornecedor</label>
                      <input
                        type="text"
                        placeholder="Ex: Compra direta CBC ou Estande G&G..."
                        value={ammoForm.notes}
                        onChange={e => setAmmoForm({ ...ammoForm, notes: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-blue-500 text-slate-850"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-bold transition cursor-pointer"
                    >
                      Salvar Registro de Aquisição
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Progress bars / caliber quotas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.keys(ammoLimits).map((caliber) => {
                  const purchased = getPurchasedAmmoSum(caliber);
                  const limit = ammoLimits[caliber];
                  const pct = Math.min((purchased / limit) * 100, 100);
                  
                  return (
                    <div key={caliber} className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                      <div className="flex justify-between items-center text-xs font-mono font-bold text-slate-800 mb-1.5">
                        <span className="font-sans text-sm text-slate-900">{caliber}</span>
                        <span>{purchased.toLocaleString()} / {limit.toLocaleString()}</span>
                      </div>
                      
                      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>

                      <div className="flex justify-between text-[9px] text-slate-450 mt-1.5">
                        <span>Restam {(limit - purchased).toLocaleString()} un.</span>
                        <span className="font-mono">{pct.toFixed(0)}% Utilizado</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Purchase history table */}
              <div className="space-y-2">
                <h5 className="font-bold text-slate-700 text-xs">Histórico de Compras Registradas</h5>
                {ammoPurchases.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 bg-slate-50 rounded-xl">
                    <p className="text-xs">Nenhuma compra registrada.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-sans text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-450 uppercase font-mono tracking-wider text-[10px]">
                          <th className="py-2 px-1">Data</th>
                          <th className="py-2 px-1">Calibre</th>
                          <th className="py-2 px-1 text-center">Quant.</th>
                          <th className="py-2 px-1">Nota Fiscal</th>
                          <th className="py-2 px-1 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {ammoPurchases.map(a => (
                          <tr key={a.id} className="hover:bg-slate-50/50">
                            <td className="py-2 px-1 text-slate-600 font-mono">{a.date}</td>
                            <td className="py-2 px-1 font-bold text-slate-800">{a.caliber}</td>
                            <td className="py-2 px-1 text-center font-bold text-blue-600 font-mono">{a.quantity}</td>
                            <td className="py-2 px-1 text-slate-500 font-mono">{a.invoiceNumber}</td>
                            <td className="py-2 px-1 text-right">
                              <button
                                onClick={() => deleteAmmo(a.id)}
                                className="text-slate-400 hover:text-red-500 transition p-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* FULL EXPAND POST MODAL */}
      <AnimatePresence>
        {selectedExpandPost && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white max-w-2xl w-full rounded-2xl smooth-shadow overflow-hidden max-h-[85vh] flex flex-col sm:flex-row"
            >
              <div className="sm:w-1/2 bg-slate-900 flex items-center justify-center">
                <img
                  src={selectedExpandPost.imageUrl || "https://picsum.photos/seed/shoot/600/600"}
                  alt="Expanded target"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="p-4 sm:w-1/2 flex flex-col justify-between max-h-[85vh] overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                    <img src={selectedExpandPost.userAvatar} alt="user" className="w-9 h-9 rounded-full object-cover" referrerPolicy="no-referrer" />
                    <span className="font-bold text-slate-900 text-xs">@{selectedExpandPost.username}</span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedExpandPost.content}</p>

                  {selectedExpandPost.targetScore && (
                    <div className="bg-slate-900 text-white p-3 rounded-lg font-mono text-[11px] space-y-1">
                      <div className="font-bold text-amber-400 uppercase">RESULTADO INDIVIDUAL</div>
                      <div>Distância: {selectedExpandPost.targetScore.distance}m</div>
                      <div>Pontos: {selectedExpandPost.targetScore.score} pts</div>
                      <div>Calibre: {selectedExpandPost.targetScore.caliber} ({selectedExpandPost.targetScore.gunModel})</div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setSelectedExpandPost(null)}
                  className="mt-6 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Fechar Visualização
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ANUIDADE MODAL */}
      <AnimatePresence>
        {isSignModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white max-w-md w-full rounded-2xl smooth-shadow overflow-hidden"
            >
              <div className="bg-blue-900 text-white p-4 flex justify-between items-center">
                <span className="font-display font-semibold text-sm">Regularização Filiação G&G</span>
                <button onClick={() => setIsSignModalOpen(false)} className="text-white/70 hover:text-white cursor-pointer">✕</button>
              </div>

              {!paidSignDone ? (
                <div className="p-5 space-y-4 text-xs select-none">
                  <div className="bg-blue-50 p-4 rounded-xl text-blue-900 leading-relaxed">
                    <h4 className="font-bold font-display text-sm text-blue-950 mb-1">Anuidade Federal G&G Competições</h4>
                    <p className="text-[11px]">Associe-se anualmente para poder concorrer no ranking das etapas oficiais do clube e emitir certificados homologados.</p>
                  </div>

                  <div className="flex justify-between items-center font-bold font-mono border-b border-t border-slate-50 py-3 text-slate-700">
                    <span className="font-sans font-semibold">Valor Anuidade</span>
                    <span className="text-blue-600 text-sm">R$ 290,00 /ano</span>
                  </div>

                  <p className="text-[10px] text-slate-400">Ao assinar, você recebe o selo REGULAR de atirador desportivo nas consultas cadastrais internas de campeonatos.</p>

                  <div className="bg-slate-50 p-3 rounded-lg space-y-2 font-mono">
                    <span className="text-[9px] text-slate-400 block uppercase font-bold text-center">PIX CNPJ DE AFILIAÇÃO</span>
                    <div className="bg-white p-2 text-center rounded border border-slate-200 truncate">
                      anuidade.gegpistol.online.producao445582
                    </div>
                  </div>

                  <div className="flex gap-3 pt-3">
                    <button
                      onClick={() => setIsSignModalOpen(false)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-semibold transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handlePaySignatureSubmit}
                      disabled={payingSign}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold shadow-md shadow-blue-150 transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {payingSign ? 'Processando...' : 'Fazer Homologação'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center space-y-4">
                  <div className="bg-emerald-50 text-emerald-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto shadow-md">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900 text-sm">Filiação Ativada com Sucesso!</h4>
                    <p className="text-xs text-slate-500">Sua anuidade está regular perante o clube G&G Competições pelos próximos 12 meses.</p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FULL SCREEN WEB PRINT VIEW OVERLAY */}
      <AnimatePresence>
        {printMode && printData && (
          <div className="fixed inset-0 z-[9999] bg-slate-900 overflow-y-auto p-4 md:p-8 flex flex-col items-center justify-start print:p-0 print:bg-white print:absolute print:inset-0 select-none">
            
            {/* Control bar - Hidden during paper print */}
            <div className="no-print w-full max-w-4xl bg-slate-800 text-white rounded-xl p-4 mb-6 flex justify-between items-center shadow-lg border border-slate-700">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-400" />
                <span className="font-bold text-sm font-display">Pré-visualização do Documento</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir / Salvar PDF
                </button>
                <button
                  onClick={() => setPrintMode(null)}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>

            {/* Document sheet */}
            <div
              style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
              className={`print-content ${printMode.includes('card') ? 'max-w-[360px] min-h-auto p-6 rounded-2xl shadow-2xl border border-slate-200 flex flex-col gap-6 items-center justify-center' : 'max-w-4xl min-h-[297mm] p-[20mm] rounded-2xl shadow-2xl flex flex-col justify-between border border-slate-150'} font-sans relative print:shadow-none print:rounded-none print:p-0 print:border-none print:w-full`}
            >
              
              {/* CERTIFICATE LAYOUT */}
              {printMode === 'certificate' && (
                <div className="w-full flex-1 flex flex-col justify-between border-8 border-double border-amber-600/70 p-6 sm:p-10 bg-amber-50/10 min-h-[230mm]">
                  
                  {/* Decorative corner target icons */}
                  <div className="flex justify-between items-center text-amber-700">
                    <Target className="w-8 h-8 opacity-50" />
                    <span className="font-display font-extrabold text-xs tracking-widest text-slate-500">G&G COMPETIÇÕES</span>
                    <Target className="w-8 h-8 opacity-50" />
                  </div>

                  {/* Title */}
                  <div className="text-center my-6 space-y-2">
                    <Award className="w-16 h-16 text-amber-600 mx-auto mb-2 opacity-90" />
                    <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-wide uppercase">
                      Certificado de Desempenho
                    </h1>
                    <div className="h-0.5 bg-amber-600 w-24 mx-auto"></div>
                  </div>

                  {/* Body text */}
                  <div className="text-center text-sm sm:text-base text-slate-700 leading-loose max-w-2xl mx-auto space-y-6">
                    <p>
                      Certificamos que o(a) atleta desportivo(a) <span className="font-extrabold text-slate-900 text-lg underline font-display">{printData.fullName}</span>, devidamente registrado(a) sob o CR militar nº <span className="font-bold text-slate-900 font-mono">{printData.crNumber}</span>, participou das competições do campeonato oficial:
                    </p>
                    <p className="font-display font-bold text-blue-900 text-lg sm:text-xl uppercase tracking-wide bg-blue-50 py-3 px-6 rounded-xl border border-blue-100">
                      {printData.championshipTitle}
                    </p>
                    <p>
                      Disputando na modalidade de <span className="font-bold text-slate-900">{printData.modality}</span> e atingindo o resultado acumulado de <span className="font-black text-amber-600 text-lg font-mono">{printData.score.toFixed(2)} pontos</span> nas etapas oficiais homologadas.
                    </p>
                  </div>

                  {/* Signatures & Verification */}
                  <div className="mt-8 border-t border-slate-100 pt-6">
                    <div className="grid grid-cols-2 gap-8 text-center text-[10px] sm:text-xs">
                      <div className="space-y-1">
                        <div className="h-10 border-b border-slate-300 w-36 mx-auto flex items-end justify-center italic text-slate-400 font-mono select-none">
                          Josué Robson
                        </div>
                        <span className="font-bold text-slate-800 block">Josué Robson</span>
                        <span className="text-slate-450 block">Diretor de Competições G&G</span>
                      </div>
                      <div className="space-y-1">
                        <div className="h-10 border-b border-slate-300 w-36 mx-auto flex items-end justify-center select-none text-[10px] text-emerald-600 font-bold bg-emerald-50 rounded p-1 border border-dashed border-emerald-300">
                          SELO HOMOLOGADO
                        </div>
                        <span className="font-bold text-slate-800 block">Federação G&G Brasil</span>
                        <span className="text-slate-450 block">Selo de Autenticidade Digital</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[9px] text-slate-400 font-mono mt-8 border-t border-slate-100 pt-4">
                      <span>CÓD: {printData.hash}</span>
                      <span>Emissão: {new Date(printData.date).toLocaleDateString()}</span>
                    </div>
                  </div>

                </div>
              )}

              {/* CARTEIRINHA CLUBE PRINT LAYOUT */}
              {printMode === 'club_card' && (
                <div className="flex flex-col gap-6 items-center justify-center p-4">
                  {/* Front card body */}
                  <div style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }} className="w-[325px] h-[200px] rounded-xl p-4 flex flex-col justify-between relative border border-slate-800 shadow-md">
                    <div className="flex justify-between items-start border-b border-slate-800 pb-1">
                      <div>
                        <span className="font-display font-extrabold text-[11px] tracking-wider text-amber-400 block">G&G CLUBE DE TIRO</span>
                        <span className="text-[7.5px] font-sans text-slate-400 tracking-widest block mt-0.5">FILIADO OFICIAL</span>
                      </div>
                      <div className="bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-[8px] font-bold text-emerald-400 uppercase">
                        ATIVO
                      </div>
                    </div>

                    <div className="flex gap-3 items-center my-1">
                      <img src={selectedUser.avatarUrl} alt="avatar" className="w-12 h-12 rounded object-cover border border-slate-700 bg-slate-900" />
                      <div className="text-[9.5px] space-y-0.5 leading-tight">
                        <div className="font-bold text-white text-[10.5px] truncate w-[180px]">{printData.fullName}</div>
                        <div><span className="text-slate-450">CR nº:</span> <span className="text-white font-mono font-bold">{printData.crNumber}</span></div>
                        <div><span className="text-slate-450">Categoria:</span> <span className="text-amber-300 font-bold">Sócio Contribuinte</span></div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[7.5px] font-mono text-slate-400 border-t border-slate-800 pt-1">
                      <span>REG: {printData.regId}</span>
                      <span>Validade: {printData.valDate}</span>
                    </div>
                  </div>

                  {/* Back card body */}
                  <div style={{ backgroundColor: '#ffffff', color: '#1e293b' }} className="w-[325px] h-[200px] rounded-xl p-4 flex flex-col justify-between relative border border-slate-350 shadow-md text-slate-850">
                    <div className="text-[7px] leading-tight space-y-1 text-slate-700">
                      <p className="font-bold border-b border-slate-100 pb-0.5 uppercase tracking-wider text-slate-900 text-[7.5px]">Normas G&G Clube de Tiro</p>
                      <p>1. Respeite todas as regras de segurança descritas na portaria.</p>
                      <p>2. Armas frias e desmuniciadas devem transitar sempre em coldre ou maleta.</p>
                      <p>3. Este documento é pessoal e intransferível.</p>
                    </div>

                    <div className="flex justify-between items-end mt-2 pt-2 border-t border-slate-100">
                      <div className="space-y-1">
                        <span className="text-[7.5px] block font-mono text-slate-800 font-bold">CNPJ: 45.981.042/0001-12</span>
                        <div className="h-4 bg-slate-900 w-24 flex items-center justify-center text-[7px] text-white tracking-widest font-mono">
                          ||||||| | ||||| | |||
                        </div>
                      </div>
                      <div className="text-[7px] text-right font-mono flex flex-col items-end">
                        <div className="w-8 h-8 bg-slate-100 border border-slate-200 rounded flex items-center justify-center">
                          [QR]
                        </div>
                        <span className="mt-0.5 text-[6px] text-slate-400 font-sans">Presidente G&G</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CARTEIRINHA FEDERAL G&G PRINT LAYOUT */}
              {printMode === 'gg_card' && (
                <div className="flex flex-col gap-6 items-center justify-center p-4">
                  {/* Front card body */}
                  <div style={{ backgroundColor: '#090d16', color: '#f8fafc', borderColor: '#d97706' }} className="w-[325px] h-[200px] rounded-xl p-4 flex flex-col justify-between relative border-2 shadow-md">
                    <div className="flex justify-between items-start border-b border-amber-600/30 pb-1">
                      <div>
                        <span className="font-display font-extrabold text-[10px] tracking-wider text-amber-500 block">G&G COMPETIÇÕES</span>
                        <span className="text-[7.5px] font-sans text-slate-400 tracking-widest block mt-0.5">CIRCUITO NACIONAL DE ATLETAS</span>
                      </div>
                      <div className="bg-amber-500 text-slate-950 px-1 py-0.5 rounded text-[7.5px] font-black uppercase">
                        FEDERADO
                      </div>
                    </div>

                    <div className="flex gap-3 items-center my-1">
                      <img src={selectedUser.avatarUrl} alt="avatar" className="w-12 h-12 rounded object-cover border-2 border-amber-500/40 bg-slate-900" />
                      <div className="text-[9.5px] space-y-0.5 leading-tight">
                        <div className="font-bold text-white text-[10.5px] truncate w-[180px]">{printData.fullName}</div>
                        <div><span className="text-slate-400">CR nº:</span> <span className="text-white font-mono font-bold">{printData.crNumber}</span></div>
                        <div><span className="text-slate-450">Categoria:</span> <span className="text-amber-400 font-bold">Classe A - Pistola</span></div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[7px] font-mono text-slate-400 border-t border-amber-600/30 pt-1">
                      <span>FEDERAÇÃO FILIADA G&G</span>
                      <span className="text-amber-500 font-bold">REG: {printData.fedId}</span>
                    </div>
                  </div>

                  {/* Back card body */}
                  <div style={{ backgroundColor: '#ffffff', color: '#1e293b' }} className="w-[325px] h-[200px] rounded-xl p-4 flex flex-col justify-between relative border border-slate-350 shadow-md text-slate-850">
                    <div className="text-[7.5px] leading-tight space-y-1 text-slate-700">
                      <p className="font-bold border-b border-slate-100 pb-0.5 uppercase tracking-wider text-slate-900 text-[8px]">Amparo Legal de Atleta</p>
                      <p className="italic font-sans text-[7px] text-slate-500">"Resguardada a prerrogativa de Porte de Trânsito para atiradores desportivos com guia de tráfego, conforme Lei Geral do Esporte nº 14.597/23."</p>
                      <p>Contato oficial G&G Competições: suporte@gegpistol.online</p>
                    </div>

                    <div className="flex justify-between items-end mt-2 pt-2 border-t border-slate-100">
                      <div className="space-y-1">
                        <span className="text-[7.5px] block font-mono text-slate-800 font-bold">CNPJ: 45.981.042/0001-12</span>
                        <div className="h-4 bg-slate-900 w-24 flex items-center justify-center text-[7px] text-white tracking-widest font-mono">
                          ||||||| | ||||| | |||
                        </div>
                      </div>
                      <div className="text-[7px] text-right font-mono flex flex-col items-end">
                        <div className="w-8 h-8 bg-slate-100 border border-slate-200 rounded flex items-center justify-center">
                          [QR]
                        </div>
                        <span className="mt-0.5 text-[6px] text-slate-400 font-sans">Presidente G&G</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* DECLARAÇÃO DE FILIAÇÃO TIMBRADA */}
              {printMode === 'declaration_filiacao' && (
                <div className="w-full flex-1 flex flex-col justify-between min-h-[250mm] font-serif p-4">
                  {/* Timbre Header */}
                  <div className="text-center border-b-2 border-slate-900 pb-4">
                    <h2 className="font-display font-extrabold text-xl text-slate-900 tracking-wider">G&G CLUBE DE TIRO E COMPETIÇÕES</h2>
                    <p className="text-[10px] font-sans text-slate-500 uppercase tracking-widest mt-1">
                      Filiado ao SFPC/11ª RM - Registro de Entidade nº 9410 - CNPJ: 45.981.042/0001-12
                    </p>
                    <p className="text-[9px] font-sans text-slate-400">
                      Setor de Clubes Esportivos Sul, Trecho 3, Lote 45, Brasília - DF | contato@gegpistol.online
                    </p>
                  </div>

                  {/* Title */}
                  <div className="text-center my-12">
                    <h1 className="text-lg font-bold uppercase underline tracking-wider text-slate-900">
                      Declaração de Filiação e Regularidade
                    </h1>
                  </div>

                  {/* Text body */}
                  <div className="text-justify text-sm text-slate-800 leading-relaxed space-y-6 flex-1 px-4">
                    <p>
                      Declaramos para os devidos fins de direito, em especial perante o <strong>Exército Brasileiro</strong> e ao <strong>Serviço de Fiscalização de Produtos Controlados (SFPC)</strong>, que o(a) atirador(a) desportivo(a) <span className="font-bold text-slate-900 text-base">{printData.fullName}</span>, inscrito(a) no CPF sob o nº <span className="font-mono text-slate-900 font-bold">***.918.451-**</span>, é devidamente filiado(a) ativo(a) desta entidade esportiva sob o registro cadastral interno nº <span className="font-bold text-slate-900 font-mono">{printData.crNumber}</span>.
                    </p>
                    <p>
                      Atestamos adicionalmente que o(a) referido(a) atleta encontra-se plenamente <strong>REGULAR</strong> e em dia com todas as suas obrigações estatutárias, cadastrais e financeiras perante este clube de tiro, tendo efetuado o recolhimento regular da sua taxa de anuidade federativa oficial G&G Competições.
                    </p>
                    <p>
                      Esta declaração destina-se a instruir processos de renovação de Certificado de Registro (CR), emissão de guias de tráfego (GT) ou aquisições de insumos/armas de fogo junto aos órgãos fiscalizadores competentes.
                    </p>
                    <p>
                      A presente declaração possui validade legal de <strong>90 (noventa) dias</strong> a contar de sua emissão oficial.
                    </p>
                  </div>

                  {/* Footer & Signature */}
                  <div className="mt-16 space-y-12">
                    <div className="text-center text-slate-800 text-xs">
                      <p>Brasília - DF, {new Date(printData.date).toLocaleDateString('pt-BR')}.</p>
                    </div>

                    <div className="text-center text-xs space-y-1">
                      <div className="h-0.5 bg-slate-400 w-64 mx-auto"></div>
                      <span className="font-bold text-slate-900 block mt-1">Josué Robson</span>
                      <span className="text-slate-500 block">Diretor Executivo - G&G Clube de Tiro</span>
                      <span className="text-slate-400 font-mono text-[9px] block">Autenticação: {printData.hash}</span>
                    </div>
                  </div>

                </div>
              )}

              {/* DECLARAÇÃO DE HABITUALIDADE (TABELA) */}
              {printMode === 'declaration_habitualidade' && (
                <div className="w-full flex-1 flex flex-col justify-between min-h-[250mm] font-serif p-4">
                  {/* Timbre Header */}
                  <div className="text-center border-b-2 border-slate-900 pb-4">
                    <h2 className="font-display font-extrabold text-xl text-slate-900 tracking-wider">G&G CLUBE DE TIRO E COMPETIÇÕES</h2>
                    <p className="text-[10px] font-sans text-slate-500 uppercase tracking-widest mt-1">
                      Filiado ao SFPC/11ª RM - Registro de Entidade nº 9410 - CNPJ: 45.981.042/0001-12
                    </p>
                  </div>

                  {/* Title */}
                  <div className="text-center my-6">
                    <h1 className="text-base font-bold uppercase underline tracking-wider text-slate-900">
                      Declaração de Habitualidade e Treinamentos
                    </h1>
                  </div>

                  {/* Intro */}
                  <div className="text-justify text-xs text-slate-800 leading-relaxed mb-6 px-2">
                    <p>
                      Declaramos, sob as penas da lei e em cumprimento às diretrizes legais estabelecidas pelo Exército Brasileiro para fins de manutenção, revalidação ou aquisição de armamentos desportivos, que o(a) atleta <strong>{printData.fullName}</strong>, titular do CR de atirador desportivo nº <strong>{printData.crNumber}</strong>, realizou treinamentos e/ou participou de etapas oficiais neste estabelecimento desportivo de tiro no decorrer dos últimos 12 meses, conforme os registros oficiais consolidados abaixo descritos:
                    </p>
                  </div>

                  {/* Consolidated habituality table */}
                  <div className="flex-1 overflow-x-auto px-2">
                    <table className="w-full text-left font-sans text-[10px] border-collapse border border-slate-200">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 uppercase font-mono font-bold border-b border-slate-300">
                          <th className="py-2 px-2 border-r border-slate-200">Nº</th>
                          <th className="py-2 px-2 border-r border-slate-200">Data</th>
                          <th className="py-2 px-2 border-r border-slate-200">Atividade / Prova</th>
                          <th className="py-2 px-2 border-r border-slate-200">Calibre</th>
                          <th className="py-2 px-2 border-r border-slate-200 text-center">Disparos</th>
                          <th className="py-2 px-2">Local</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {printData.activities.map((act: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-2 border-r border-slate-200 font-mono text-center">{idx + 1}</td>
                            <td className="py-2 px-2 border-r border-slate-200 font-mono">{act.date}</td>
                            <td className="py-2 px-2 border-r border-slate-200 font-semibold">{act.activity}</td>
                            <td className="py-2 px-2 border-r border-slate-200 font-mono">{act.caliber}</td>
                            <td className="py-2 px-2 border-r border-slate-200 font-mono text-center font-bold text-slate-800">{act.shots}</td>
                            <td className="py-2 px-2 text-slate-600">{act.location}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Signatures */}
                  <div className="mt-8 space-y-10">
                    <div className="text-center text-slate-800 text-[11px]">
                      <p>Atestamos a veracidade e exatidão dos registros listados no estande de tiro.</p>
                      <p className="mt-1">Brasília - DF, {new Date(printData.date).toLocaleDateString('pt-BR')}.</p>
                    </div>

                    <div className="text-center text-[10px] space-y-1">
                      <div className="h-0.5 bg-slate-400 w-52 mx-auto"></div>
                      <span className="font-bold text-slate-900 block mt-1">Oficial de Segurança de Estande</span>
                      <span className="text-slate-500 block">Controle e Homologação de Frequência G&G</span>
                      <span className="text-slate-400 font-mono text-[8px] block">Registro de Autenticidade: {printData.hash}</span>
                    </div>
                  </div>

                </div>
              )}

            </div>
          </div>
        )}
      </AnimatePresence>

      {/* LOCAL REGISTRATION MODAL */}
      <AnimatePresence>
        {selectedChampRegLocal && (
          <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white max-w-lg w-full rounded-2xl smooth-shadow overflow-hidden text-slate-800"
            >
              <div className="bg-blue-900 text-white p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <span className="font-display font-semibold text-sm">Ficha de Inscrição</span>
                </div>
                <button
                  onClick={() => setSelectedChampRegLocal(null)}
                  className="text-white/70 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {paymentStepLocal === 'form' && (
                <form onSubmit={handleRegisterSubmitLocal} className="p-5 space-y-4">
                  <div className="bg-blue-50 p-3 rounded-lg flex items-center justify-between text-xs text-blue-900 font-semibold">
                    <span>{selectedChampRegLocal.title}</span>
                    <span className="text-blue-600 font-bold">R$ {selectedChampRegLocal.registrationFee}</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase block font-semibold">Modalidade de Disputa</label>
                    <select
                      value={selectedModalityLocal}
                      onChange={(e) => setSelectedModalityLocal(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700 font-semibold"
                    >
                      {selectedChampRegLocal.modalities.map((mod, i) => (
                        <option key={i} value={mod}>{mod}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase block font-semibold">Seu Documento CR</label>
                    <input
                      type="text"
                      placeholder="Ex: CR-102938-DF"
                      value={crInputLocal}
                      onChange={(e) => setCrInputLocal(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-750 font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 uppercase block font-semibold">Meio de Pagamento</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentMethodLocal('pix')}
                        className={`p-3 border rounded-xl flex flex-col items-center justify-center gap-1 transition ${paymentMethodLocal === 'pix' ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-200 bg-slate-50 text-slate-650'}`}
                      >
                        <Copy className="w-5 h-5" />
                        <span className="text-xs font-bold leading-none">PIX</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethodLocal('credit_card')}
                        className={`p-3 border rounded-xl flex flex-col items-center justify-center gap-1 transition ${paymentMethodLocal === 'credit_card' ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-200 bg-slate-50 text-slate-650'}`}
                      >
                        <CreditCard className="w-5 h-5" />
                        <span className="text-xs font-bold leading-none">Cartão</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setSelectedChampRegLocal(null)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-semibold text-xs transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold text-xs shadow-md transition"
                    >
                      Confirmar e Pagar
                    </button>
                  </div>
                </form>
              )}

              {paymentStepLocal === 'processing' && (
                <div className="p-8 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full border-4 border-slate-200 animate-spin border-t-blue-600 mx-auto"></div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Processando Pagamento...</h4>
                    <p className="text-xs text-slate-400">Aguardando confirmação bancária.</p>
                  </div>
                </div>
              )}

              {paymentStepLocal === 'done' && (
                <div className="p-6 text-center space-y-4">
                  <div className="bg-emerald-50 text-emerald-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto shadow-md">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Inscrição Homologada!</h4>
                    <p className="text-xs text-slate-500">Seu comprovante está disponível na aba "Minhas Inscrições".</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedChampRegLocal(null);
                      window.location.reload();
                    }}
                    className="w-full bg-slate-950 hover:bg-slate-900 text-white py-3 rounded-xl font-semibold text-xs transition"
                  >
                    Fechar e Atualizar
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RECEIPT MODAL */}
      <AnimatePresence>
        {isReceiptOpen && receiptData && (
          <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white max-w-md w-full rounded-2xl smooth-shadow overflow-hidden p-6 space-y-6 relative text-slate-805"
            >
              <button
                onClick={() => setIsReceiptOpen(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-slate-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>

              <div id="printable-receipt" className="space-y-4 border border-dashed border-slate-300 p-4 rounded-xl font-mono text-xs text-slate-800 bg-slate-50">
                <div className="text-center border-b border-dashed border-slate-200 pb-3 space-y-1">
                  <h4 className="font-bold tracking-wider">COMPROVANTE DE INSCRIÇÃO</h4>
                  <p className="text-[10px] text-slate-500">G&G COMPETIÇÕES • BRASÍLIA-DF</p>
                </div>
                
                <div className="space-y-2 leading-relaxed">
                  <div><strong>Atleta:</strong> {receiptData.athleteName} (@{receiptData.athleteUsername})</div>
                  <div><strong>CR Militar/Defesa:</strong> {receiptData.crNumber}</div>
                  <div><strong>Campeonato:</strong> {receiptData.champTitle}</div>
                  <div><strong>Modalidade:</strong> {receiptData.modality}</div>
                  <div><strong>Registro:</strong> {new Date(receiptData.registeredAt).toLocaleString('pt-BR')}</div>
                  <div><strong>Pagamento:</strong> {receiptData.paymentMethod.toUpperCase()} ({receiptData.paymentStatus === 'approved' ? 'APROVADO' : 'PENDENTE'})</div>
                  {receiptData.txId && (
                    <div className="break-all"><strong>TxID:</strong> {receiptData.txId}</div>
                  )}
                </div>

                <div className="border-t border-dashed border-slate-200 pt-3 text-center text-[9px] text-slate-500 space-y-1">
                  <p>VAGA CONFIRMADA E HOMOLOGADA PELO SFPC</p>
                  <p>Código Verificador: GG-REG-{receiptData.regId.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsReceiptOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-semibold text-xs transition cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  onClick={() => {
                    const printContent = document.getElementById('printable-receipt')?.innerHTML;
                    const originalContent = document.body.innerHTML;
                    if (printContent) {
                      document.body.innerHTML = `<div style="font-family: monospace; padding: 20px; max-width: 400px; margin: auto;">${printContent}</div>`;
                      window.print();
                      document.body.innerHTML = originalContent;
                      window.location.reload();
                    }
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

