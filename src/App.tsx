import React, { useState, useEffect } from 'react';
import { User, Post, Championship, Registration, StageScore, RankingItem, ShootingResult } from './types';
import FeedView from './components/FeedView';
import ChampionshipsView from './components/ChampionshipsView';
import AdminPanel from './components/AdminPanel';
import MemberProfile from './components/MemberProfile';
import { Target, Trophy, ShieldCheck, User as UserIcon, Home, Zap, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
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
      const regRes = await fetch('/api/registrations', { headers: authHeaders });
      const regData = await regRes.json();
      setRegistrations(regData.registrations || []);

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
        <Target className="w-16 h-16 text-blue-500 animate-spin mb-4" />
        <h2 className="font-display font-bold text-xl tracking-wide select-none">G&G Competições</h2>
        <p className="text-xs text-slate-400 mt-1 font-mono">Conectando atiradores federados de alta precisão...</p>
      </div>
    );
  }

  /* ==================================================== */
  /* GUEST/LOGIN GATE SCREEN                              */
  /* ==================================================== */
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e3a8a_1px,transparent_1px)] [background-size:16px_16px] opacity-10"></div>
        
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 smooth-shadow p-6 sm:p-8 rounded-3xl relative z-10 text-white space-y-6">
          {/* Logo Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex bg-gradient-to-tr from-blue-600 to-sky-400 p-4 rounded-3xl shadow-lg shadow-blue-500/20">
              <Target className="w-10 h-10 text-white animate-pulse" />
            </div>
            <h1 className="font-display font-black text-2xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-100 to-sky-400 uppercase mt-4">
              G&G Competições
            </h1>
            <p className="text-xs text-slate-400 leading-normal max-w-xs mx-auto">
              Plataforma fiduciária de tiro prático e precisão com integração social.
            </p>
          </div>

          {/* Quick Member presets selector */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-3">
            <span className="text-[10px] text-amber-400 font-bold block uppercase tracking-wider text-center flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Entrar como Atleta Demonstrativo
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleLogin('guilherme_gg')}
                className="bg-slate-900 hover:bg-slate-850 p-2.5 rounded-xl border border-slate-800 hover:border-slate-700 transition flex items-center gap-2 text-left"
              >
                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&auto=format&fit=crop&q=80" alt="Guilherme" className="w-6 h-6 rounded-full object-cover" />
                <div>
                  <span className="font-bold block text-[11px]">Guilherme</span>
                  <span className="text-[9px] text-blue-400 block uppercase">Diretor/Admin</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleLogin('ana_precision')}
                className="bg-slate-900 hover:bg-slate-850 p-2.5 rounded-xl border border-slate-800 hover:border-slate-700 transition flex items-center gap-2 text-left"
              >
                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&auto=format&fit=crop&q=80" alt="Ana" className="w-6 h-6 rounded-full object-cover" />
                <div>
                  <span className="font-bold block text-[11px]">Ana Clara</span>
                  <span className="text-[9px] text-amber-405 block uppercase text-amber-400">Atleta Elite</span>
                </div>
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900 px-3 text-[10px] text-slate-500 font-bold font-mono">OU FAÇA CADASTRO OFICIAL</span>
            </div>
          </div>

          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin(loginUsername);
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nome Usuário (Para o Feed)</label>
              <input
                type="text"
                required
                placeholder="Ex: @roberto_ipsc, carlotacabral"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white outline-none px-4 py-3 rounded-2xl focus:border-blue-600 text-xs font-semibold placeholder:text-slate-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl text-xs transition uppercase shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2"
            >
              Iniciar Sessão Federado
            </button>
          </form>

          {/* Institutional Stamp */}
          <div className="text-center pt-2 text-[10px] text-slate-500 font-mono">
            <span>© G&G COMPETIÇÕES DE TIRO PRÁTICO - BRASÍLIA / DF</span>
          </div>

        </div>
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
        <div className="flex items-center gap-3 cursor-pointer group select-none" onClick={() => { setActiveTab('feed'); setSelectedProfileUser(null); }}>
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm shrink-0">
            <span className="text-white font-black italic text-lg font-display">GG</span>
          </div>
          <h1 className="text-slate-800 font-bold text-[15px] sm:text-lg tracking-tight font-display">
            G&G <span className="text-blue-600">COMPETIÇÕES</span>
          </h1>
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
              onToggleFollow={handleToggleFollow}
              onPaySignature={handlePaySignature}
              onLogout={handleLogout}
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
