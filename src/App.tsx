import React, { useState, useEffect } from 'react';
import { User, Post, Championship, Registration, StageScore, RankingItem, ShootingResult } from './types';
import FeedView from './components/FeedView';
import ChampionshipsView from './components/ChampionshipsView';
import AdminPanel from './components/AdminPanel';
import MemberProfile from './components/MemberProfile';
import { Target, Trophy, ShieldCheck, User as UserIcon, Home, Zap, Loader2, Sparkles, CheckCircle2, Sun, Moon } from 'lucide-react';
import { motion } from 'motion/react';
import shootingDarkBg from '@/assets/shooting_dark_bg.png';
import shootingBanner from '@/assets/shooting_banner.png';
import logoGgCompeticoes from '@/assets/logo_gg_competicoes.png';

export default function App() {
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('gg_theme') as 'light' | 'dark') || 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('gg_theme', theme);
  }, [theme]);

  // Global App States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [stageScores, setStageScores] = useState<StageScore[]>([]);
  const [globalRankings, setGlobalRankings] = useState<RankingItem[]>([]);
  const [selectedRankingModality, setSelectedRankingModality] = useState('');

  // UI States
  const [activeTab, setActiveTab] = useState<'feed' | 'championships' | 'admin' | 'profile'>('feed');
  const [selectedProfileUser, setSelectedProfileUser] = useState<User | null>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [booting, setBooting] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Estados adicionais da Landing Page
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginModalMessage, setLoginModalMessage] = useState('');

  const triggerLoginModal = (message: string = '') => {
    setLoginModalMessage(message);
    setShowLoginModal(true);
  };

  // Load backend session and DB contents
  const syncWithBackend = async (userIdForHeader?: string) => {
    setIsSyncing(true);
    const authHeaders: HeadersInit = { 'Content-Type': 'application/json' };
    const targetUserId = userIdForHeader || currentUser?.id || localStorage.getItem('gg_user_id');
    
    if (targetUserId) {
      authHeaders['x-user-id'] = targetUserId;
    }

    try {
      // 1. Fetch current session
      const meRes = await fetch('/api/auth/me', { headers: authHeaders });
      const meData = await meRes.json();
      if (meData.user) {
        setCurrentUser(meData.user);
        localStorage.setItem('gg_user_id', meData.user.id);
      } else {
        setCurrentUser(null);
        localStorage.removeItem('gg_user_id');
      }

      // 2. Fetch system users
      const usersRes = await fetch('/api/users', { headers: authHeaders });
      const usersData = await usersRes.json();
      setUsers(usersData.users || []);

      // 3. Fetch social posts
      const postsRes = await fetch('/api/posts', { headers: authHeaders });
      const postsData = await postsRes.json();
      setPosts(postsData.posts || []);

      // 4. Fetch Tournaments
      const champRes = await fetch('/api/championships', { headers: authHeaders });
      const champData = await champRes.json();
      setChampionships(champData.championships || []);

      // 5. Fetch Registrations
      if (targetUserId) {
        const regRes = await fetch('/api/registrations', { headers: authHeaders });
        const regData = await regRes.json();
        setRegistrations(regData.registrations || []);
      } else {
        setRegistrations([]);
      }

      // 6. Fetch Stage Scores
      const scoresRes = await fetch('/api/scores', { headers: authHeaders });
      const scoresData = await scoresRes.json();
      setStageScores(scoresData.stageScores || []);

      // Initialize selected modality for rankings if empty
      if (champData.championships && champData.championships.length > 0 && !selectedRankingModality) {
        setSelectedRankingModality(champData.championships[0].modalities[0]);
      }

    } catch (err) {
      console.error('REST api syncing failed, running in clean sandbox local memory state.', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Run on start
  useEffect(() => {
    const initApp = async () => {
      await syncWithBackend();
      setBooting(false);
    };
    initApp();
  }, []);

  // Recalculate rankings locally or from API whenever scores or registrations change
  useEffect(() => {
    if (championships.length > 0 && selectedRankingModality) {
      calculateRankings(selectedRankingModality);
    }
  }, [stageScores, selectedRankingModality, championships]);

  const calculateRankings = async (modality: string) => {
    try {
      const res = await fetch(`/api/rankings?modality=${encodeURIComponent(modality)}`);
      const data = await res.json();
      if (data.rankings) {
        setGlobalRankings(data.rankings);
      }
    } catch (err) {
      console.error('Failed to load rankings from backend:', err);
    }
  };

  // API Mutating Actions
  const handleLogin = async (username: string) => {
    if (!username || !username.trim()) return;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      const data = await res.json();
      if (data.user) {
        setCurrentUser(data.user);
        localStorage.setItem('gg_user_id', data.user.id);
        await syncWithBackend(data.user.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('gg_user_id');
    setSelectedProfileUser(null);
    setActiveTab('feed');
  };

  const handleAddPost = async (content: string, imageUrl?: string, targetScore?: ShootingResult) => {
    const authHeaders: HeadersInit = { 'Content-Type': 'application/json' };
    if (currentUser) {
      authHeaders['x-user-id'] = currentUser.id;
    }

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ content, imageUrl, targetScore })
      });
      if (res.ok) {
        await syncWithBackend();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLikePost = async (postId: string) => {
    const authHeaders: HeadersInit = { 'Content-Type': 'application/json' };
    if (currentUser) {
      authHeaders['x-user-id'] = currentUser.id;
    }

    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: authHeaders
      });
      if (res.ok) {
        // Optimistic UI update or quick re-sync
        await syncWithBackend();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCommentPost = async (postId: string, content: string) => {
    const authHeaders: HeadersInit = { 'Content-Type': 'application/json' };
    if (currentUser) {
      authHeaders['x-user-id'] = currentUser.id;
    }

    try {
      const res = await fetch(`/api/posts/${postId}/comment`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ content })
      });
      if (res.ok) {
        await syncWithBackend();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleFollow = async (userId: string) => {
    const authHeaders: HeadersInit = { 'Content-Type': 'application/json' };
    if (currentUser) {
      authHeaders['x-user-id'] = currentUser.id;
    }

    try {
      const res = await fetch(`/api/users/${userId}/follow`, {
        method: 'POST',
        headers: authHeaders
      });
      if (res.ok) {
        await syncWithBackend();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegisterChamp = async (championshipId: string, modality: string, crNumber: string, paymentMethod: 'pix' | 'credit_card') => {
    const authHeaders: HeadersInit = { 'Content-Type': 'application/json' };
    if (currentUser) {
      authHeaders['x-user-id'] = currentUser.id;
    }

    try {
      const res = await fetch(`/api/championships/${championshipId}/register`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ modality, crNumber, paymentMethod })
      });
      if (res.ok) {
        await syncWithBackend();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateChampionshipAdmin = async (data: {
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    registrationFee: number;
    modalities: string[];
    stagesCount: number;
    bannerUrl?: string;
  }) => {
    const authHeaders: HeadersInit = { 'Content-Type': 'application/json' };
    if (currentUser) {
      authHeaders['x-user-id'] = currentUser.id;
    }

    try {
      const res = await fetch('/api/championships', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(data)
      });
      if (res.ok) {
        await syncWithBackend();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateChampionshipAdmin = async (id: string, data: {
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    registrationFee: number;
    modalities: string[];
    stagesCount: number;
    bannerUrl?: string;
  }) => {
    const authHeaders: HeadersInit = { 'Content-Type': 'application/json' };
    if (currentUser) {
      authHeaders['x-user-id'] = currentUser.id;
    }

    try {
      const res = await fetch(`/api/championships/${id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(data)
      });
      if (res.ok) {
        await syncWithBackend();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecordScoreAdmin = async (data: {
    championshipId: string;
    registrationId: string;
    stageNum: number;
    score: number;
    timeSeconds?: number;
  }) => {
    const authHeaders: HeadersInit = { 'Content-Type': 'application/json' };
    if (currentUser) {
      authHeaders['x-user-id'] = currentUser.id;
    }

    try {
      const res = await fetch(`/api/championships/${data.championshipId}/scores`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(data)
      });
      if (res.ok) {
        await syncWithBackend();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePaySignature = async () => {
    const authHeaders: HeadersInit = { 'Content-Type': 'application/json' };
    if (currentUser) {
      authHeaders['x-user-id'] = currentUser.id;
    }

    try {
      const res = await fetch('/api/users/signature', {
        method: 'POST',
        headers: authHeaders
      });
      if (res.ok) {
        await syncWithBackend();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Demo admin simulator trigger
  const handleToggleAdminDemo = async () => {
    if (!currentUser) return;
    const targetUsername = currentUser.role === 'admin' ? 'roberto_ipsc' : 'guilherme_gg';
    await handleLogin(targetUsername);
  };

  // Navigations routing
  const navigateToProfile = (user: User) => {
    setSelectedProfileUser(user);
    setActiveTab('profile');
  };

  if (booting) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center text-white p-6 font-sans">
        <Target className="w-16 h-16 text-blue-500 animate-spin mb-6" />
        <img src={logoGgCompeticoes} alt="G&G Competições" className="h-16 w-auto object-contain mb-2" />
        <p className="text-xs text-slate-400 font-mono">Conectando atiradores federados de alta precisão...</p>
      </div>
    );
  }

  /* ==================================================== */
  /* GUEST/LOGIN GATE SCREEN                              */
  /* ==================================================== */
  if (!currentUser) {
    // Filter open/active championships
    const activeChamps = championships.filter(c => c.status === 'open');
    
    // Filter posts that have an image URL to showcase recent photos
    const recentPhotosPosts = posts.filter(p => p.imageUrl).slice(0, 6);

    return (
      <div 
        className={`min-h-screen font-sans relative overflow-x-hidden transition-colors duration-300 ${theme === 'dark' ? 'text-white' : 'text-slate-900 bg-slate-50'}`}
        style={{
          backgroundImage: theme === 'dark'
            ? `linear-gradient(rgba(9, 15, 29, 0.93), rgba(9, 15, 29, 0.97)), url(${shootingDarkBg})`
            : `linear-gradient(rgba(248, 250, 252, 0.95), rgba(248, 250, 252, 0.98)), url(${shootingDarkBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Background mesh/grid effects */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e3a8a_1px,transparent_1px)] [background-size:20px_20px] opacity-10 pointer-events-none"></div>
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header Navbar */}
        <header className={`h-20 border-b px-4 sm:px-8 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950/80 border-slate-900 shadow-none' : 'bg-white/95 border-slate-200 shadow-sm'}`}>
          <div className="flex items-center select-none">
            <img src={logoGgCompeticoes} alt="G&G Competições" className="h-10 sm:h-12 w-auto object-contain" />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={`p-2.5 rounded-full border transition cursor-pointer flex items-center justify-center ${theme === 'dark' ? 'border-slate-800 text-amber-400 bg-slate-900/60 hover:bg-slate-900' : 'border-slate-200 text-slate-600 bg-slate-100 hover:bg-slate-200'}`}
              title={theme === 'dark' ? 'Ativar Modo Claro' : 'Ativar Modo Escuro'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => triggerLoginModal('')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-full transition shadow-lg shadow-blue-500/10 flex items-center gap-2 cursor-pointer"
            >
              Entrar / Cadastrar
            </button>
          </div>
        </header>

        {/* Banner de Destaque Superior */}
        <div className="max-w-6xl mx-auto px-4 pt-8">
          <div 
            className="w-full h-[300px] sm:h-[400px] rounded-3xl overflow-hidden relative border border-slate-800 smooth-shadow flex flex-col justify-end p-6 sm:p-12 group cursor-pointer"
            style={{
              backgroundImage: `linear-gradient(to right, rgba(9, 15, 29, 0.95) 30%, rgba(9, 15, 29, 0.3) 70%, rgba(9, 15, 29, 0.1)), url(${shootingBanner})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              border: '1px solid rgba(255, 255, 255, 0.03)'
            }}
            onClick={() => triggerLoginModal('Faça login ou cadastre-se para se inscrever no campeonato em destaque.')}
          >
            {/* Tag/Badge */}
            <div className="absolute top-6 left-6 sm:top-8 sm:left-8 bg-blue-600/10 border border-blue-500/20 text-blue-400 font-extrabold text-[9px] uppercase px-3.5 py-1.5 rounded-full tracking-wider flex items-center gap-1.5 z-20">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              Destaque Principal
            </div>

            {/* Banner details */}
            <div className="max-w-lg space-y-3 relative z-10 text-left">
              <span className="text-[10px] text-amber-500 font-black uppercase tracking-wider block">Inscrições abertas • Copa de Inverno G&G</span>
              <h3 className="font-display font-black text-2xl sm:text-4xl leading-none tracking-tight text-white group-hover:text-blue-400 transition duration-300">
                Campeonato IPSC Copa de Inverno 2026
              </h3>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed hidden sm:block">
                Prepare-se para o maior confronto de IPSC Handgun do Centro-Oeste! Pistas dinâmicas que testam velocidade, precisão e potência (DVC).
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] sm:text-xs px-6 py-3 rounded-full transition shadow-lg shadow-blue-500/10 uppercase tracking-wider flex items-center gap-2 cursor-pointer"
                >
                  Garantir Minha Vaga
                  <Zap className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-4 pt-16 pb-20 text-center space-y-8 relative">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-1.5 rounded-full text-xs text-blue-400 font-bold tracking-wide uppercase select-none">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            Estande e Federação de Alta Precisão
          </div>

          <h2 className={`font-display font-black text-4xl sm:text-6xl tracking-tight leading-none max-w-4xl mx-auto text-transparent bg-clip-text ${theme === 'dark' ? 'bg-gradient-to-b from-white to-slate-300' : 'bg-gradient-to-b from-slate-900 to-slate-700'}`}>
            A Pista de Encontro dos Atletas Federados
          </h2>

          <p className={`text-sm sm:text-base max-w-2xl mx-auto leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Monitore resultados de etapas em tempo real, acompanhe rankings do clube, interaja na rede social de tiro e garanta sua inscrição oficial nos principais campeonatos de tiro prático e de precisão de Brasília.
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <button
              type="button"
              onClick={() => triggerLoginModal('Cadastre-se ou faça login para ter acesso total ao feed de atletas e resultados do clube.')}
              className="bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white font-extrabold text-xs px-8 py-4 rounded-full transition shadow-lg shadow-blue-500/20 uppercase tracking-wider cursor-pointer"
            >
              Começar Agora
            </button>
            <a
              href="#championships"
              className={`font-bold text-xs px-8 py-4 rounded-full transition uppercase tracking-wider flex items-center justify-center cursor-pointer ${theme === 'dark' ? 'bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 hover:border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-sm'}`}
            >
              Ver Campeonatos
            </a>
          </div>
        </section>

        {/* Stats Section */}
        <section className={`border-y py-12 transition-colors duration-300 ${theme === 'dark' ? 'border-slate-900 bg-slate-900/20' : 'border-slate-200 bg-slate-100/40'}`}>
          <div className="max-w-5xl mx-auto px-4 grid grid-cols-3 gap-6 text-center">
            <div className="space-y-1">
              <span className="block font-display font-black text-2xl sm:text-4xl text-blue-500">100+</span>
              <span className={`block text-[10px] sm:text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Atletas Elite</span>
            </div>
            <div className={`space-y-1 border-x ${theme === 'dark' ? 'border-slate-900' : 'border-slate-200'}`}>
              <span className="block font-display font-black text-2xl sm:text-4xl text-sky-400">10k+</span>
              <span className={`block text-[10px] sm:text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Disparos Registrados</span>
            </div>
            <div className="space-y-1">
              <span className="block font-display font-black text-2xl sm:text-4xl text-amber-500">5+</span>
              <span className={`block text-[10px] sm:text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Etapas Ativas</span>
            </div>
          </div>
        </section>

        {/* Championships Highlights Section */}
        <section id="championships" className="max-w-6xl mx-auto px-4 py-20 space-y-10">
          <div className="text-center space-y-2">
            <Trophy className="w-8 h-8 text-amber-500 mx-auto" />
            <h3 className="font-display font-black text-2xl sm:text-3xl tracking-tight uppercase">
              Campeonatos em Andamento
            </h3>
            <p className="text-slate-400 text-xs sm:text-sm max-w-lg mx-auto">
              Inscrições abertas para as pistas e divisões oficiais do estande. Garanta sua vaga!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            {activeChamps.length === 0 ? (
              <div className={`col-span-2 text-center py-12 text-sm rounded-3xl border ${theme === 'dark' ? 'text-slate-600 bg-slate-900/20 border-slate-900' : 'text-slate-500 bg-slate-100/40 border-slate-200'}`}>
                Nenhum campeonato com inscrições abertas no momento.
              </div>
            ) : (
              activeChamps.map(champ => (
                <div
                  key={champ.id}
                  onClick={() => triggerLoginModal(`Faça login ou cadastre-se para ver os detalhes completos, etapas e se inscrever no ${champ.title}.`)}
                  className={`rounded-3xl border overflow-hidden cursor-pointer group transition duration-300 transform hover:-translate-y-1 shadow-xl flex flex-col justify-between ${theme === 'dark' ? 'bg-slate-900 border-slate-805 hover:border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950' : 'bg-white border-slate-200 hover:border-slate-300 bg-gradient-to-b from-white to-slate-50 text-slate-900'}`}
                  style={{ border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.03)' : '1px solid rgba(0, 0, 0, 0.04)' }}
                >
                  <div>
                    {/* Banner */}
                    <div className="h-48 w-full overflow-hidden relative">
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent z-10"></div>
                      <img
                        src={champ.bannerUrl}
                        alt={champ.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                      <span className="absolute top-4 right-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-[9px] uppercase px-3 py-1 rounded-full z-20 tracking-wider">
                        Inscrições Abertas
                      </span>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-3">
                      <h4 className={`font-display font-bold text-lg leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                        {champ.title}
                      </h4>
                      <p className={`text-xs line-clamp-3 leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        {champ.description}
                      </p>
                    </div>
                  </div>

                  {/* Modalities Preview and Footer */}
                  <div className="px-6 pb-6 pt-2 space-y-4">
                    <div className="flex flex-wrap gap-1.5">
                      {champ.modalities.map((m, idx) => (
                        <span key={idx} className={`text-[9px] px-2 py-1 rounded-md border ${theme === 'dark' ? 'bg-slate-950 border-slate-900 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                          {m}
                        </span>
                      ))}
                    </div>
                    <div className={`flex items-center justify-between border-t pt-4 text-xs ${theme === 'dark' ? 'border-slate-900/80' : 'border-slate-100'}`}>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase font-bold">Taxa de Inscrição</span>
                        <span className="text-amber-500 font-extrabold text-sm">
                          R$ {champ.registrationFee.toFixed(2)}
                        </span>
                      </div>
                      <span className="text-blue-600 dark:text-blue-500 font-bold transition flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                        Ver Etapas e Inscrever
                        <Zap className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Photos Preview Section */}
        <section className={`max-w-6xl mx-auto px-4 py-20 space-y-10 border-t ${theme === 'dark' ? 'border-slate-900/60' : 'border-slate-200'}`}>
          <div className="text-center space-y-2">
            <Home className="w-8 h-8 text-blue-500 mx-auto" />
            <h3 className="font-display font-black text-2xl sm:text-3xl tracking-tight uppercase">
              Mural de Fotos Recentes
            </h3>
            <p className={`text-xs sm:text-sm max-w-lg mx-auto ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              Veja registros e agrupamentos reais compartilhados pelos atiradores federados no clube.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4">
            {recentPhotosPosts.length === 0 ? (
              <div className={`col-span-3 text-center py-12 text-sm rounded-3xl border ${theme === 'dark' ? 'text-slate-600 bg-slate-900/20 border-slate-900' : 'text-slate-500 bg-slate-100/40 border-slate-200'}`}>
                Nenhuma foto compartilhada recentemente.
              </div>
            ) : (
              recentPhotosPosts.map(post => (
                <div
                  key={post.id}
                  onClick={() => triggerLoginModal('Faça login ou cadastre-se para ver a publicação completa, curtir os agrupamentos e conversar com os atiradores.')}
                  className={`group relative h-64 rounded-2xl overflow-hidden cursor-pointer shadow-lg shadow-black/30 border ${theme === 'dark' ? 'border-slate-900' : 'border-slate-200'}`}
                >
                  <img
                    src={post.imageUrl}
                    alt={post.content}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  {/* Subtle dark overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex flex-col justify-end p-4 z-10">
                    <span className="text-[10px] text-blue-400 block font-bold">@{post.username}</span>
                    <p className="text-[11px] text-slate-200 line-clamp-2 leading-relaxed mt-1">
                      {post.content}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400 font-bold">
                      <span>❤️ {post.likes.length} Curtidas</span>
                      <span>💬 {post.comments.length} Comentários</span>
                    </div>
                  </div>
                  {/* Small tag icon for visual premium hint */}
                  <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md text-[9px] text-slate-300 font-bold z-20 group-hover:hidden transition">
                    @{post.username}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className={`border-t py-12 text-center text-slate-600 text-xs font-mono space-y-4 ${theme === 'dark' ? 'border-slate-900 bg-slate-950' : 'border-slate-200 bg-slate-100'}`}>
          <div className="max-w-md mx-auto flex justify-center gap-6 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
            <a href="#championships" className="hover:text-blue-500 transition">Campeonatos</a>
            <span>•</span>
            <span className="cursor-pointer hover:text-blue-500 transition" onClick={() => triggerLoginModal('')}>Entrar</span>
            <span>•</span>
            <a href="#" className="hover:text-blue-500 transition" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Topo</a>
          </div>
          <p>© G&G COMPETIÇÕES DE TIRO PRÁTICO - BRASÍLIA / DF</p>
        </footer>

        {/* Shared Login Modal (Overlay dialog) */}
        {showLoginModal && (
          <div
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in transition-colors duration-300 ${theme === 'dark' ? 'bg-black/85 backdrop-blur-sm' : 'bg-slate-900/60 backdrop-blur-sm'}`}
            onClick={() => { setShowLoginModal(false); setLoginModalMessage(''); }}
          >
            <div
              className={`max-w-md w-full p-6 sm:p-8 rounded-3xl space-y-6 relative shadow-2xl animate-scale-up transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-900 border border-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-800'}`}
              style={{ border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.05)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => { setShowLoginModal(false); setLoginModalMessage(''); }}
                className={`absolute top-4 right-4 transition cursor-pointer text-sm font-bold ${theme === 'dark' ? 'text-slate-500 hover:text-slate-200' : 'text-slate-400 hover:text-slate-800'}`}
              >
                ✕
              </button>

              {/* Logo Header */}
              <div className="text-center space-y-2">
                <div className="inline-flex justify-center items-center">
                  <img src={logoGgCompeticoes} alt="G&G Competições" className="h-16 w-auto object-contain" />
                </div>
                <h3 className={`font-display font-black text-xl tracking-wider bg-gradient-to-r bg-clip-text text-transparent uppercase mt-4 ${theme === 'dark' ? 'from-blue-100 to-sky-400' : 'from-blue-700 to-sky-600'}`}>
                  Entrar no Clube G&G
                </h3>
                {loginModalMessage ? (
                  <p className={`text-[11px] leading-normal max-w-xs mx-auto p-2.5 rounded-xl border ${theme === 'dark' ? 'text-amber-400 bg-amber-500/5 border-amber-500/10' : 'text-amber-600 bg-amber-50/50 border-amber-200'}`}>
                    ⚠️ {loginModalMessage}
                  </p>
                ) : (
                  <p className={`text-xs leading-normal max-w-xs mx-auto ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    Faça login para se inscrever nos campeonatos e interagir na rede social.
                  </p>
                )}
              </div>

              {/* Quick Member presets selector */}
              <div className={`p-4 rounded-2xl border space-y-3 ${theme === 'dark' ? 'bg-slate-950/60 border-slate-850' : 'bg-slate-50 border-slate-200'}`}>
                <span className={`text-[10px] font-bold block uppercase tracking-wider text-center flex items-center justify-center gap-1 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>
                  <Sparkles className="w-3.5 h-3.5" />
                  Entrar como Atleta Demonstrativo
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => { handleLogin('guilherme_gg'); setShowLoginModal(false); }}
                    className={`p-2.5 rounded-xl border transition flex items-center gap-2 text-left cursor-pointer ${theme === 'dark' ? 'bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-slate-700 text-white' : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-800'}`}
                  >
                    <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&auto=format&fit=crop&q=80" alt="Guilherme" className="w-6 h-6 rounded-full object-cover" />
                    <div>
                      <span className="font-bold block text-[11px]">Guilherme</span>
                      <span className={`text-[9px] block uppercase font-bold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>Diretor/Admin</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { handleLogin('ana_precision'); setShowLoginModal(false); }}
                    className={`p-2.5 rounded-xl border transition flex items-center gap-2 text-left cursor-pointer ${theme === 'dark' ? 'bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-slate-700 text-white' : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-800'}`}
                  >
                    <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&auto=format&fit=crop&q=80" alt="Ana" className="w-6 h-6 rounded-full object-cover" />
                    <div>
                      <span className="font-bold block text-[11px]">Ana Clara</span>
                      <span className={`text-[9px] block uppercase font-bold ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>Atleta Elite</span>
                    </div>
                  </button>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className={`w-full border-t ${theme === 'dark' ? 'border-slate-800/80' : 'border-slate-200'}`}></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className={`px-3 text-[10px] font-bold font-mono ${theme === 'dark' ? 'bg-slate-900 text-slate-500' : 'bg-white text-slate-400'}`}>OU INFORME USUÁRIO DE CADASTRO</span>
                </div>
              </div>

              {/* Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleLogin(loginUsername);
                  setShowLoginModal(false);
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className={`text-[10px] font-bold uppercase tracking-wider block ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Nome Usuário (Para o Feed)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: @roberto_ipsc, carlotacabral"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    className={`w-full border outline-none px-4 py-3 rounded-2xl text-xs font-semibold focus:ring-1 transition ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-blue-600 focus:ring-blue-600' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500'}`}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl text-xs transition uppercase shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2 cursor-pointer"
                >
                  Iniciar Sessão Atleta
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Filter posts or championships based on search string
  const filteredPostsForFeed = posts.filter(post => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const matchesUser = post.username.toLowerCase().includes(query);
    const matchesContent = post.content.toLowerCase().includes(query);
    const matchesDiscipline = post.targetScore?.discipline.toLowerCase().includes(query) || false;
    const matchesGun = post.targetScore?.gunModel.toLowerCase().includes(query) || false;
    return matchesUser || matchesContent || matchesDiscipline || matchesGun;
  });

  const filteredChampionshipsList = championships.filter(champ => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const matchesTitle = champ.title.toLowerCase().includes(query);
    const matchesDesc = champ.description.toLowerCase().includes(query);
    const matchesModalities = champ.modalities.some(m => m.toLowerCase().includes(query));
    return matchesTitle || matchesDesc || matchesModalities;
  });

  /* ==================================================== */
  /* AUTHENTICATED ATHLETES MAIN PLATFORM LAYOUT          */
  /* ==================================================== */
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Dynamic Sync Status bar */}
      {isSyncing && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white py-1 px-4 text-center text-[10px] font-bold tracking-widest uppercase flex items-center justify-center gap-1">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          SINCRONIZANDO BANCO G&G EM TEMPO REAL...
        </div>
      )}

      {/* Main Container Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shadow-sm sticky top-0 z-40 no-print">
        <div className="flex items-center cursor-pointer group select-none" onClick={() => { setActiveTab('feed'); setSelectedProfileUser(null); }}>
          <img src={logoGgCompeticoes} alt="G&G Competições" className="h-9 sm:h-11 w-auto object-contain" />
        </div>

        {/* Dynamic Live Search component */}
        <div className="flex-1 max-w-sm sm:max-w-md mx-2 sm:mx-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar atiradores, modalidades ou etapas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 border-none rounded-full py-1.5 pl-10 pr-4 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 text-slate-800 outline-none"
            />
          </div>
        </div>

        {/* Right side user menu */}
        <div className="flex items-center gap-3 sm:gap-6 text-slate-600">
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 font-mono bg-slate-100 px-3 py-1.5 rounded-full select-none">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Estande: DF - Ativo
          </div>

          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`p-2.5 rounded-full border transition cursor-pointer flex items-center justify-center ${theme === 'dark' ? 'border-slate-800 text-amber-400 bg-slate-900/60 hover:bg-slate-900' : 'border-slate-200 text-slate-600 bg-slate-100 hover:bg-slate-200'}`}
            title={theme === 'dark' ? 'Ativar Modo Claro' : 'Ativar Modo Escuro'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          
          <div
            onClick={() => navigateToProfile(currentUser)}
            className="flex items-center gap-2 cursor-pointer hover:opacity-85 transition select-none"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 border-2 border-blue-600 flex items-center justify-center font-bold text-blue-800 text-xs shadow-inner overflow-hidden">
              {currentUser.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt={currentUser.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                'RD'
              )}
            </div>
            <div className="hidden md:block leading-none text-left">
              <span className="font-bold text-slate-800 text-xs">{currentUser.fullName.split(' ')[0]}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">@{currentUser.username}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main layout container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 mb-16 md:mb-4">
        
        {/* Modern App content viewport based on current routing state */}
        <div className="min-h-[70vh]">
          {activeTab === 'feed' && (
            <FeedView
              posts={filteredPostsForFeed}
              currentUser={currentUser}
              users={users}
              onAddPost={handleAddPost}
              onLikePost={handleLikePost}
              onCommentPost={handleCommentPost}
              onToggleFollow={handleToggleFollow}
            />
          )}

          {activeTab === 'championships' && (
            <ChampionshipsView
              championships={filteredChampionshipsList}
              registrations={registrations}
              stageScores={stageScores}
              currentUser={currentUser}
              onRegister={handleRegisterChamp}
              globalRankings={globalRankings}
              onSelectModalityRanking={setSelectedRankingModality}
              selectedRankingModality={selectedRankingModality}
            />
          )}

          {activeTab === 'admin' && (
            <AdminPanel
              currentUser={currentUser}
              championships={championships}
              registrations={registrations}
              stageScores={stageScores}
              users={users}
              onCreateChampionship={handleCreateChampionshipAdmin}
              onUpdateChampionship={handleUpdateChampionshipAdmin}
              onRecordScore={handleRecordScoreAdmin}
              onToggleAdminDemo={handleToggleAdminDemo}
            />
          )}

          {activeTab === 'profile' && (
            <MemberProfile
              currentUser={currentUser}
              selectedUser={selectedProfileUser || currentUser}
              posts={posts}
              registrations={registrations}
              stageScores={stageScores}
              championships={championships}
              onToggleFollow={handleToggleFollow}
              onPaySignature={handlePaySignature}
              onLogout={handleLogout}
              onAddPost={handleAddPost}
            />
          )}
        </div>

      </main>

      {/* Persistent App bottom navigation dock (Mobile-first, standard overlay Instagram index) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 smooth-shadow py-2.5 px-6 flex justify-around items-center z-40 no-print">
        
        <button
          onClick={() => { setActiveTab('feed'); setSelectedProfileUser(null); }}
          className={`flex flex-col items-center gap-1 transition ${activeTab === 'feed' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Feed</span>
        </button>

        <button
          onClick={() => { setActiveTab('championships'); setSelectedProfileUser(null); }}
          className={`flex flex-col items-center gap-1 transition ${activeTab === 'championships' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Trophy className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Campeonatos</span>
        </button>

        <button
          onClick={() => { setActiveTab('admin'); setSelectedProfileUser(null); }}
          className={`flex flex-col items-center gap-1 transition ${activeTab === 'admin' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <ShieldCheck className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Painel Diretor</span>
        </button>

        <button
          onClick={() => navigateToProfile(currentUser)}
          className={`flex flex-col items-center gap-1 transition ${activeTab === 'profile' && selectedProfileUser?.id === currentUser.id ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <UserIcon className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Perfil</span>
        </button>

      </div>

    </div>
  );
}
