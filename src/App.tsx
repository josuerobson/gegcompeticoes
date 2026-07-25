import React, { useState, useEffect, useRef } from 'react';
import { User, Post, Championship, ChampionshipInput, Registration, StageScore, RankingItem, ShootingResult, Club, Modality, Stage, StageInput, Weapon, WeaponLookupOption, SharedPostInfo } from './types';
import FeedView from './components/FeedView';
import ChampionshipsView from './components/ChampionshipsView';
import AdminPanel from './components/AdminPanel';
import MemberProfile from './components/MemberProfile';
import { Target, Trophy, ShieldCheck, User as UserIcon, Home, Zap, Loader2, Sparkles, CheckCircle2, Sun, Moon, ChevronDown, LogOut } from 'lucide-react';
import { motion } from 'motion/react';
import shootingDarkBg from '@/assets/shooting_dark_bg.png';
import shootingBanner from '@/assets/shooting_banner.png';
import logoGgCompeticoes from '@/assets/logo_gg_competicoes.png';

// Small reusable labeled input for the long Membro/Clube registration forms — avoids
// repeating the same theme-aware className/label markup for ~25 near-identical fields.
function AuthField({ label, theme, required, ...inputProps }: {
  label: string;
  theme: 'light' | 'dark';
  required?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <label className={`text-[10px] font-bold uppercase tracking-wider block ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
        {label}{required && ' *'}
      </label>
      <input
        required={required}
        className={`w-full border outline-none px-4 py-3 rounded-2xl text-xs font-semibold focus:ring-1 transition ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-blue-600 focus:ring-blue-600' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500'}`}
        {...inputProps}
      />
    </div>
  );
}

function AuthSelect({ label, theme, required, value, onChange, options }: {
  label: string;
  theme: 'light' | 'dark';
  required?: boolean;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <label className={`text-[10px] font-bold uppercase tracking-wider block ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
        {label}{required && ' *'}
      </label>
      <select
        required={required}
        value={value}
        onChange={onChange}
        className={`w-full border outline-none px-4 py-3 rounded-2xl text-xs font-semibold focus:ring-1 transition ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-600 focus:ring-blue-600' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500 focus:ring-blue-500'}`}
      >
        <option value="">Selecione...</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}


// Labeled file input for the document upload steps of the Membro/Clube registration
// forms (RG/CNH, CR, Declaração de filiação, Cartão CNPJ, Alvará) — enforces the 1MB
// limit client-side to match the server's multer config and the legacy system's own limit.
function FileField({ label, theme, hint, onFileChange }: {
  label: string;
  theme: 'light' | 'dark';
  hint?: string;
  onFileChange: (file: File | null) => void;
}) {
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  return (
    <div className="space-y-1.5">
      <label className={`text-[10px] font-bold uppercase tracking-wider block ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
        {label}
      </label>
      <input
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        onChange={(e) => {
          const file = e.target.files?.[0] || null;
          if (file && file.size > 1024 * 1024) {
            setError('Arquivo maior que 1MB.');
            setFileName('');
            onFileChange(null);
            e.target.value = '';
            return;
          }
          setError('');
          setFileName(file?.name || '');
          onFileChange(file);
        }}
        className={`w-full border outline-none px-4 py-2.5 rounded-2xl text-[11px] font-semibold file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:uppercase transition ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-300 file:bg-blue-600 file:text-white' : 'bg-slate-50 border-slate-200 text-slate-600 file:bg-blue-100 file:text-blue-700'}`}
      />
      {error ? (
        <p className="text-[10px] text-red-500">{error}</p>
      ) : fileName ? (
        <p className={`text-[10px] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{fileName}</p>
      ) : hint ? (
        <p className={`text-[10px] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{hint}</p>
      ) : null}
    </div>
  );
}

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
  const [clubs, setClubs] = useState<Club[]>([]);
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [weaponLookupOptions, setWeaponLookupOptions] = useState<WeaponLookupOption[]>([]);
  const [globalRankings, setGlobalRankings] = useState<RankingItem[]>([]);
  const [selectedRankingModality, setSelectedRankingModality] = useState('');
  const [settings, setSettings] = useState<{ [key: string]: string }>({
    default_image: 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=800&auto=format&fit=crop&q=80'
  });

  // UI States
  const [activeTab, setActiveTab] = useState<'feed' | 'championships' | 'admin' | 'profile'>('feed');
  const [selectedProfileUser, setSelectedProfileUser] = useState<User | null>(null);
  const [loginCpf, setLoginCpf] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authView, setAuthView] = useState<'login' | 'membro' | 'clube'>('login');
  const [membroForm, setMembroForm] = useState({
    fullName: '', birthDate: '', sex: '', rg: '', rgIssuer: '', rgIssueDate: '',
    fatherName: '', motherName: '', crNumber: '', crValidity: '', militaryRegion: '', nationality: 'Brasileira',
    phone: '', email: '', cep: '', address: '', addressNumber: '', complement: '', neighborhood: '', city: '', state: '',
    cpf: '', password: '', confirmPassword: '', clubId: '', termsAccepted: false
  });
  const [clubeForm, setClubeForm] = useState({
    name: '', crNumber: '', responsibleName: '', phone: '', email: '',
    cep: '', address: '', addressNumber: '', complement: '', neighborhood: '', city: '', state: '',
    cnpj: '', password: '', confirmPassword: '', termsAccepted: false
  });
  const [membroFiles, setMembroFiles] = useState<{ rgCnh: File | null; cr: File | null; declaracao: File | null }>({ rgCnh: null, cr: null, declaracao: null });
  const [clubeFiles, setClubeFiles] = useState<{ cnpjCard: File | null; cr: File | null; alvara: File | null }>({ cnpjCard: null, cr: null, alvara: null });
  const [registerSubmitting, setRegisterSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [booting, setBooting] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Estados adicionais da Landing Page
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginModalMessage, setLoginModalMessage] = useState('');

  // Top header user profile dropdown menu state
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const triggerLoginModal = (message: string = '') => {
    setLoginModalMessage(message);
    setShowLoginModal(true);
  };

  // Load backend session and DB contents in parallel
  const syncWithBackend = async (userIdForHeader?: string) => {
    setIsSyncing(true);
    const authHeaders: HeadersInit = { 'Content-Type': 'application/json' };
    const targetUserId = userIdForHeader || currentUser?.id || localStorage.getItem('gg_user_id');
    
    if (targetUserId) {
      authHeaders['x-user-id'] = targetUserId;
    }

    try {
      // 1. Fetch current session first
      try {
        const meRes = await fetch('/api/auth/me', { headers: authHeaders });
        const meData = await meRes.json();
        if (meData.user) {
          setCurrentUser(meData.user);
          localStorage.setItem('gg_user_id', meData.user.id);
        } else {
          setCurrentUser(null);
          localStorage.removeItem('gg_user_id');
        }
      } catch (err) {
        console.error('Error fetching /api/auth/me', err);
      }

      // 2. Fetch all system data concurrently in a single parallel batch
      const [
        usersResult,
        postsResult,
        champResult,
        regResult,
        scoresResult,
        clubsResult,
        modalitiesResult,
        stagesResult,
        weaponsResult,
        weaponLookupsResult,
        settingsResult
      ] = await Promise.allSettled([
        fetch('/api/users', { headers: authHeaders }).then(r => r.json()),
        fetch('/api/posts', { headers: authHeaders }).then(r => r.json()),
        fetch('/api/championships', { headers: authHeaders }).then(r => r.json()),
        targetUserId ? fetch('/api/registrations', { headers: authHeaders }).then(r => r.json()) : Promise.resolve({ registrations: [] }),
        fetch('/api/scores', { headers: authHeaders }).then(r => r.json()),
        fetch('/api/clubs', { headers: authHeaders }).then(r => r.json()),
        fetch('/api/modalities', { headers: authHeaders }).then(r => r.json()),
        fetch('/api/stages', { headers: authHeaders }).then(r => r.json()),
        fetch('/api/weapons', { headers: authHeaders }).then(r => r.json()),
        fetch('/api/weapon-lookups', { headers: authHeaders }).then(r => r.json()),
        fetch('/api/settings', { headers: authHeaders }).then(r => r.json())
      ]);

      if (usersResult.status === 'fulfilled' && usersResult.value?.users) {
        setUsers(usersResult.value.users);
      }
      if (postsResult.status === 'fulfilled' && postsResult.value?.posts) {
        setPosts(postsResult.value.posts);
      }
      
      let fetchedChamps: Championship[] = [];
      if (champResult.status === 'fulfilled' && champResult.value?.championships) {
        fetchedChamps = champResult.value.championships;
        setChampionships(fetchedChamps);
      }

      if (regResult.status === 'fulfilled' && regResult.value?.registrations) {
        setRegistrations(regResult.value.registrations);
      } else {
        setRegistrations([]);
      }

      if (scoresResult.status === 'fulfilled' && scoresResult.value?.stageScores) {
        setStageScores(scoresResult.value.stageScores);
      }

      if (clubsResult.status === 'fulfilled' && clubsResult.value?.clubs) {
        setClubs(clubsResult.value.clubs);
      }

      let fetchedModalities: Modality[] = [];
      if (modalitiesResult.status === 'fulfilled' && modalitiesResult.value?.modalities) {
        fetchedModalities = modalitiesResult.value.modalities;
        setModalities(fetchedModalities);
      }

      if (stagesResult.status === 'fulfilled' && stagesResult.value?.stages) {
        setStages(stagesResult.value.stages);
      }

      if (weaponsResult.status === 'fulfilled' && weaponsResult.value?.weapons) {
        setWeapons(weaponsResult.value.weapons);
      }

      if (weaponLookupsResult.status === 'fulfilled' && weaponLookupsResult.value?.options) {
        setWeaponLookupOptions(weaponLookupsResult.value.options);
      }

      if (settingsResult.status === 'fulfilled' && settingsResult.value?.settings) {
        setSettings(settingsResult.value.settings);
      }

      if (fetchedChamps.length > 0 && !selectedRankingModality) {
        const firstModalityId = fetchedChamps[0].modalities[0];
        const firstModalityName = fetchedModalities.find((m: Modality) => m.id === firstModalityId)?.name || firstModalityId;
        setSelectedRankingModality(firstModalityName);
      }

    } catch (err) {
      console.error('REST api syncing failed', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Sincronização automática do estado com a URL do navegador e Título de SEO
  useEffect(() => {
    if (booting) return;
    
    if (!currentUser) {
      document.title = showLoginModal ? 'G&G Competições - Entrar na Plataforma' : 'G&G Competições - Estande e Tiro Esportivo';
      const targetPath = showLoginModal ? '/login' : '/';
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, '', targetPath);
      }
      return;
    }

    // Usuário autenticado
    let targetPath = '/campeonatos';
    if (activeTab === 'feed') {
      targetPath = '/feed';
      document.title = 'G&G Competições - Feed Social';
    } else if (activeTab === 'championships') {
      targetPath = '/campeonatos';
      document.title = 'G&G Competições - Campeonatos e Rankings';
    } else if (activeTab === 'admin') {
      targetPath = '/admin';
      document.title = 'G&G Competições - Painel Diretor';
    } else if (activeTab === 'profile') {
      const isSelf = !selectedProfileUser || selectedProfileUser.id === currentUser.id;
      if (isSelf) {
        targetPath = '/perfil';
        document.title = 'G&G Competições - Meu Perfil';
      } else {
        targetPath = `/perfil/${selectedProfileUser.username}`;
        document.title = `G&G Competições - Perfil de ${selectedProfileUser.fullName} (@${selectedProfileUser.username})`;
      }
    }

    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  }, [activeTab, selectedProfileUser, currentUser, showLoginModal, booting]);

  // Handler para processar a rota da URL e setar os estados
  const handleRouteNavigation = (pathname: string) => {
    const cleanPath = pathname.replace(/\/$/, '') || '/';
    
    if (!currentUser) {
      if (cleanPath === '/login') {
        setShowLoginModal(true);
      } else {
        setShowLoginModal(false);
      }
      return;
    }

    // Roteamento de usuário autenticado
    if (cleanPath === '/' || cleanPath === '/login') {
      setActiveTab('championships');
      setSelectedProfileUser(null);
    } else if (cleanPath === '/feed') {
      setActiveTab('feed');
      setSelectedProfileUser(null);
    } else if (cleanPath === '/campeonatos') {
      setActiveTab('championships');
      setSelectedProfileUser(null);
    } else if (cleanPath === '/admin') {
      if (currentUser.role === 'admin' || currentUser.role === 'master_admin' || currentUser.role === 'club_admin') {
        setActiveTab('admin');
        setSelectedProfileUser(null);
      } else {
        setActiveTab('championships');
        setSelectedProfileUser(null);
      }
    } else if (cleanPath === '/perfil') {
      setActiveTab('profile');
      setSelectedProfileUser(currentUser);
    } else if (cleanPath.startsWith('/perfil/')) {
      const username = cleanPath.split('/perfil/')[1];
      const targetUser = users.find(u => u.username === username);
      if (targetUser) {
        setActiveTab('profile');
        setSelectedProfileUser(targetUser);
      } else {
        setActiveTab('profile');
        setSelectedProfileUser(currentUser);
      }
    } else {
      setActiveTab('championships');
      setSelectedProfileUser(null);
    }
  };

  // Escuta o evento 'popstate' do navegador (botão voltar/avançar)
  useEffect(() => {
    const onPopState = () => {
      handleRouteNavigation(window.location.pathname);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [currentUser, users]);

  // Inicialização do App: Sincroniza do banco de dados e analisa a rota inicial
  useEffect(() => {
    let isSubscribed = true;

    // Safety fallback: Force booting = false after 3 seconds max so initial screen never hangs
    const bootTimer = setTimeout(() => {
      if (isSubscribed) {
        setBooting(false);
      }
    }, 3000);

    const initApp = async () => {
      await syncWithBackend();
      const userId = localStorage.getItem('gg_user_id');
      if (!userId) {
        const cleanPath = window.location.pathname.replace(/\/$/, '') || '/';
        if (cleanPath === '/login') {
          setShowLoginModal(true);
        } else {
          setShowLoginModal(false);
          if (cleanPath !== '/') {
            window.history.replaceState(null, '', '/');
          }
        }
      }
      if (isSubscribed) {
        clearTimeout(bootTimer);
        setBooting(false);
      }
    };

    initApp();

    return () => {
      isSubscribed = false;
      clearTimeout(bootTimer);
    };
  }, []);

  // Analisa rota caso o currentUser mude (e.g. após o login ou restauração de sessão)
  useEffect(() => {
    if (!booting) {
      handleRouteNavigation(window.location.pathname);
    }
  }, [booting, currentUser, users]);

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
  const handleLogin = async (cpf: string, password: string): Promise<boolean> => {
    if (!cpf.trim() || !password) return false;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf, password })
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setCurrentUser(data.user);
        localStorage.setItem('gg_user_id', data.user.id);
        setActiveTab('championships');
        await syncWithBackend(data.user.id);
        return true;
      }
      setLoginModalMessage(data.error || 'CPF ou senha inválidos.');
      return false;
    } catch (err) {
      console.error(err);
      setLoginModalMessage('Erro ao tentar entrar. Tente novamente.');
      return false;
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('gg_user_id');
    setSelectedProfileUser(null);
    setActiveTab('feed');
  };

  const uploadDocumentFile = async (userId: string, kind: string, file: File, target: 'user' | 'club'): Promise<boolean> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('kind', kind);
    formData.append('target', target);
    try {
      const res = await fetch('/api/uploads', {
        method: 'POST',
        headers: { 'x-user-id': userId },
        body: formData
      });
      return res.ok;
    } catch (err) {
      console.error(`Erro ao enviar documento (${kind}):`, err);
      return false;
    }
  };

  const handleUploadChampionshipDocument = async (championshipId: string, kind: string, file: File): Promise<boolean> => {
    if (!currentUser) return false;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('kind', kind);
    formData.append('target', 'championship');
    formData.append('targetChampionshipId', championshipId);
    try {
      const res = await fetch('/api/uploads', {
        method: 'POST',
        headers: { 'x-user-id': currentUser.id },
        body: formData
      });
      if (res.ok) await syncWithBackend();
      return res.ok;
    } catch (err) {
      console.error(`Erro ao enviar documento do campeonato (${kind}):`, err);
      return false;
    }
  };

  const handleRegister = async (payload: Record<string, unknown>, docs?: { kind: string; file: File }[]): Promise<boolean> => {
    setRegisterSubmitting(true);
    setLoginModalMessage('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.user) {
        if (docs && docs.length > 0) {
          const target = payload.type === 'clube' ? 'club' : 'user';
          await Promise.all(docs.map(d => uploadDocumentFile(data.user.id, d.kind, d.file, target)));
        }
        setCurrentUser(data.user);
        localStorage.setItem('gg_user_id', data.user.id);
        setActiveTab('championships');
        await syncWithBackend(data.user.id);
        return true;
      }
      setLoginModalMessage(data.error || 'Erro ao realizar cadastro.');
      return false;
    } catch (err) {
      console.error(err);
      setLoginModalMessage('Erro ao tentar cadastrar. Tente novamente.');
      return false;
    } finally {
      setRegisterSubmitting(false);
    }
  };

  const handleUpdateProfile = async (fields: Record<string, unknown>): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const res = await fetch('/api/users/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
        body: JSON.stringify(fields)
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setCurrentUser(data.user);
        await syncWithBackend(data.user.id);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Erro ao salvar cadastro:', err);
      return false;
    }
  };

  const handleUpdateClub = async (clubId: string, fields: Record<string, unknown>): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const res = await fetch(`/api/clubs/${clubId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
        body: JSON.stringify(fields)
      });
      if (res.ok) {
        await syncWithBackend();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Erro ao salvar dados do clube:', err);
      return false;
    }
  };

  const handleUploadDocument = async (kind: string, file: File, target: 'user' | 'club'): Promise<boolean> => {
    if (!currentUser) return false;
    const ok = await uploadDocumentFile(currentUser.id, kind, file, target);
    if (ok) await syncWithBackend();
    return ok;
  };

  // Club-admin "Cadastrar Membros" flow — creating and progressively
  // completing a member's profile on their behalf, without logging the admin
  // in as that member.
  const handleCreateMember = async (fields: { fullName: string; cpf: string; email: string; password: string }): Promise<{ user?: User; error?: string }> => {
    if (!currentUser) return { error: 'Não autenticado.' };
    try {
      const res = await fetch('/api/admin/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
        body: JSON.stringify(fields)
      });
      const data = await res.json();
      if (res.ok && data.user) {
        await syncWithBackend();
        return { user: data.user };
      }
      return { error: data.error || 'Erro ao cadastrar membro.' };
    } catch (err) {
      console.error('Erro ao cadastrar membro:', err);
      return { error: 'Erro ao cadastrar membro.' };
    }
  };

  const handleCreateClub = async (fields: { name: string; cnpj: string; responsibleName: string; email: string; password: string; phone?: string; crNumber?: string; city?: string; state?: string }): Promise<{ club?: Club; error?: string }> => {
    if (!currentUser) return { error: 'Não autenticado.' };
    try {
      const res = await fetch('/api/admin/clubs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
        body: JSON.stringify(fields)
      });
      const data = await res.json();
      if (res.ok && data.club) {
        await syncWithBackend();
        return { club: data.club };
      }
      return { error: data.error || 'Erro ao cadastrar clube.' };
    } catch (err) {
      console.error('Erro ao cadastrar clube:', err);
      return { error: 'Erro ao cadastrar clube.' };
    }
  };

  const handleUpdateMemberProfile = async (memberId: string, fields: Record<string, unknown>): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const res = await fetch(`/api/admin/members/${memberId}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
        body: JSON.stringify(fields)
      });
      if (res.ok) {
        await syncWithBackend();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Erro ao salvar cadastro do membro:', err);
      return false;
    }
  };

  const handleUploadMemberDocument = async (memberId: string, kind: string, file: File): Promise<boolean> => {
    if (!currentUser) return false;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('kind', kind);
    formData.append('targetUserId', memberId);
    try {
      const res = await fetch('/api/uploads', {
        method: 'POST',
        headers: { 'x-user-id': currentUser.id },
        body: formData
      });
      if (res.ok) await syncWithBackend();
      return res.ok;
    } catch (err) {
      console.error(`Erro ao enviar documento do membro (${kind}):`, err);
      return false;
    }
  };

  const handleAddPost = async (content: string, imageUrl?: string, targetScore?: ShootingResult, imageUrls?: string[], sharedPost?: SharedPostInfo) => {
    const authHeaders: HeadersInit = { 'Content-Type': 'application/json' };
    if (currentUser) {
      authHeaders['x-user-id'] = currentUser.id;
    }

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ content, imageUrl, targetScore, imageUrls, sharedPost })
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

  const handleRegisterChamp = async (championshipId: string, modalityId: string, stageId: string, weaponId: string, crNumber: string, paymentMethod: 'pix' | 'credit_card') => {
    const authHeaders: HeadersInit = { 'Content-Type': 'application/json' };
    if (currentUser) {
      authHeaders['x-user-id'] = currentUser.id;
    }

    try {
      const res = await fetch(`/api/championships/${championshipId}/register`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ modalityId, stageId, weaponId, crNumber, paymentMethod })
      });
      if (res.ok) {
        await syncWithBackend();
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erro ao realizar inscrição.');
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleAddWeapon = async (weapon: { ownerId?: string; manufacturer: string; model: string; caliber: string; serialNumber?: string; weaponNumber?: string; sigmaNumber?: string; weaponClass?: string; permissionStatus?: string; registrySystem?: string }) => {
    const authHeaders: HeadersInit = { 'Content-Type': 'application/json' };
    if (currentUser) {
      authHeaders['x-user-id'] = currentUser.id;
    }

    const res = await fetch('/api/weapons', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(weapon)
    });
    if (res.ok) {
      await syncWithBackend();
    } else {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Erro ao cadastrar arma.');
    }
  };

  const handleAddWeaponLookup = async (kind: string, label: string): Promise<{ error?: string }> => {
    const authHeaders: HeadersInit = { 'Content-Type': 'application/json' };
    if (currentUser) {
      authHeaders['x-user-id'] = currentUser.id;
    }

    try {
      const res = await fetch('/api/weapon-lookups', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ kind, label })
      });
      if (res.ok) {
        await syncWithBackend();
        return {};
      }
      const data = await res.json().catch(() => ({}));
      return { error: data.error || 'Erro ao cadastrar item.' };
    } catch (err) {
      console.error(err);
      return { error: 'Erro ao cadastrar item.' };
    }
  };

  const handleUpdateWeaponLookup = async (id: string, label: string): Promise<{ error?: string }> => {
    const authHeaders: HeadersInit = { 'Content-Type': 'application/json' };
    if (currentUser) {
      authHeaders['x-user-id'] = currentUser.id;
    }

    try {
      const res = await fetch(`/api/weapon-lookups/${id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ label })
      });
      if (res.ok) {
        await syncWithBackend();
        return {};
      }
      const data = await res.json().catch(() => ({}));
      return { error: data.error || 'Erro ao atualizar item.' };
    } catch (err) {
      console.error(err);
      return { error: 'Erro ao atualizar item.' };
    }
  };

  const handleRemoveWeaponLookup = async (id: string): Promise<{ error?: string }> => {
    const authHeaders: HeadersInit = { 'Content-Type': 'application/json' };
    if (currentUser) {
      authHeaders['x-user-id'] = currentUser.id;
    }

    try {
      const res = await fetch(`/api/weapon-lookups/${id}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      if (res.ok) {
        await syncWithBackend();
        return {};
      }
      const data = await res.json().catch(() => ({}));
      return { error: data.error || 'Erro ao remover item.' };
    } catch (err) {
      console.error(err);
      return { error: 'Erro ao remover item.' };
    }
  };

  const handleRemoveWeapon = async (weaponId: string) => {
    const authHeaders: HeadersInit = { 'Content-Type': 'application/json' };
    if (currentUser) {
      authHeaders['x-user-id'] = currentUser.id;
    }

    const res = await fetch(`/api/weapons/${weaponId}`, {
      method: 'DELETE',
      headers: authHeaders
    });
    if (res.ok) {
      await syncWithBackend();
    }
  };

  const handleUpdateWeapon = async (weaponId: string, updates: {
    manufacturer?: string; model?: string; caliber?: string;
    weaponNumber?: string; sigmaNumber?: string; weaponClass?: string;
    permissionStatus?: string; registrySystem?: string;
  }): Promise<{ error?: string }> => {
    const authHeaders: HeadersInit = { 'Content-Type': 'application/json' };
    if (currentUser) authHeaders['x-user-id'] = currentUser.id;
    try {
      const res = await fetch(`/api/weapons/${weaponId}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        await syncWithBackend();
        return {};
      }
      const data = await res.json().catch(() => ({}));
      return { error: data.error || 'Erro ao atualizar arma.' };
    } catch {
      return { error: 'Erro ao atualizar arma.' };
    }
  };



  const handleAddStage = async (data: StageInput): Promise<{ stage?: Stage; error?: string }> => {
    const authHeaders: HeadersInit = { 'Content-Type': 'application/json' };
    if (currentUser) {
      authHeaders['x-user-id'] = currentUser.id;
    }

    try {
      const res = await fetch('/api/stages', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(data)
      });
      const resData = await res.json().catch(() => ({}));
      if (res.ok && resData.stage) {
        await syncWithBackend();
        return { stage: resData.stage };
      }
      return { error: resData.error || 'Erro ao cadastrar etapa.' };
    } catch (err) {
      console.error(err);
      return { error: 'Erro ao cadastrar etapa.' };
    }
  };

  const handleUpdateStage = async (id: string, data: StageInput): Promise<{ stage?: Stage; error?: string }> => {
    const authHeaders: HeadersInit = { 'Content-Type': 'application/json' };
    if (currentUser) {
      authHeaders['x-user-id'] = currentUser.id;
    }

    try {
      const res = await fetch(`/api/stages/${id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(data)
      });
      const resData = await res.json().catch(() => ({}));
      if (res.ok && resData.stage) {
        await syncWithBackend();
        return { stage: resData.stage };
      }
      return { error: resData.error || 'Erro ao atualizar etapa.' };
    } catch (err) {
      console.error(err);
      return { error: 'Erro ao atualizar etapa.' };
    }
  };

  const handleRemoveStage = async (stageId: string): Promise<{ error?: string }> => {
    const authHeaders: HeadersInit = { 'Content-Type': 'application/json' };
    if (currentUser) {
      authHeaders['x-user-id'] = currentUser.id;
    }

    try {
      const res = await fetch(`/api/stages/${stageId}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      if (res.ok) {
        await syncWithBackend();
        return {};
      }
      const data = await res.json().catch(() => ({}));
      return { error: data.error || 'Erro ao remover etapa.' };
    } catch (err) {
      console.error(err);
      return { error: 'Erro ao remover etapa.' };
    }
  };

  const handleAddModality = async (modality: { name: string; seriesCount?: number; shotsPerSeries?: number; timePerSeriesMinutes?: number; evaluationType?: string }) => {
    const authHeaders: HeadersInit = { 'Content-Type': 'application/json' };
    if (currentUser) {
      authHeaders['x-user-id'] = currentUser.id;
    }

    const res = await fetch('/api/modalities', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(modality)
    });
    if (res.ok) {
      await syncWithBackend();
    } else {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Erro ao cadastrar modalidade.');
    }
  };

  const handleRemoveModality = async (modalityId: string) => {
    const authHeaders: HeadersInit = { 'Content-Type': 'application/json' };
    if (currentUser) {
      authHeaders['x-user-id'] = currentUser.id;
    }

    const res = await fetch(`/api/modalities/${modalityId}`, {
      method: 'DELETE',
      headers: authHeaders
    });
    if (res.ok) {
      await syncWithBackend();
    } else {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Erro ao remover modalidade.');
    }
  };

  const handleRemoveChampionship = async (championshipId: string) => {
    const authHeaders: HeadersInit = { 'Content-Type': 'application/json' };
    if (currentUser) {
      authHeaders['x-user-id'] = currentUser.id;
    }

    const res = await fetch(`/api/championships/${championshipId}`, {
      method: 'DELETE',
      headers: authHeaders
    });
    if (res.ok) {
      await syncWithBackend();
    } else {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Erro ao remover campeonato.');
    }
  };

  const handleCreateChampionshipAdmin = async (data: ChampionshipInput): Promise<{ championship?: Championship; error?: string }> => {
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
      const resData = await res.json().catch(() => ({}));
      if (res.ok && resData.championship) {
        await syncWithBackend();
        return { championship: resData.championship };
      }
      return { error: resData.error || 'Erro ao criar campeonato.' };
    } catch (err) {
      console.error(err);
      return { error: 'Erro ao criar campeonato.' };
    }
  };

  const handleUpdateChampionshipAdmin = async (id: string, data: ChampionshipInput): Promise<{ championship?: Championship; error?: string }> => {
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
      const resData = await res.json().catch(() => ({}));
      if (res.ok && resData.championship) {
        await syncWithBackend();
        return { championship: resData.championship };
      }
      return { error: resData.error || 'Erro ao atualizar campeonato.' };
    } catch (err) {
      console.error(err);
      return { error: 'Erro ao atualizar campeonato.' };
    }
  };

  const handleSaveSetting = async (key: string, value: string) => {
    const authHeaders: HeadersInit = { 'Content-Type': 'application/json' };
    if (currentUser) {
      authHeaders['x-user-id'] = currentUser.id;
    }

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ key, value })
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
    const isCurrentlyAdmin = currentUser.role === 'admin' || currentUser.role === 'master_admin' || currentUser.role === 'club_admin';
    const targetUsername = isCurrentlyAdmin ? 'roberto_ipsc' : 'guilherme_gg';
    const targetUser = users.find(u => u.username === targetUsername);
    if (!targetUser?.cpf) return;
    await handleLogin(targetUser.cpf, '123456');
  };

  // Navigations routing
  const navigateToProfile = (user: User) => {
    setSelectedProfileUser(user);
    setActiveTab('profile');
  };

  const handleViewProfile = (username: string) => {
    const targetUser = users.find(u => u.username === username);
    if (targetUser) {
      navigateToProfile(targetUser);
    }
  };

  if (booting) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-white p-6 font-sans relative overflow-hidden select-none">
        {/* Ambient Glowing Background */}
        <div className="absolute w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse pointer-events-none" />
        <div className="absolute w-64 h-64 bg-amber-500/10 rounded-full blur-2xl animate-pulse pointer-events-none delay-700" />

        {/* Central Animated Target Core with Radar & Pulsing Rings */}
        <div className="relative mb-8 flex items-center justify-center">
          {/* Spinning dashed outer radar ring */}
          <div className="w-28 h-28 border-2 border-dashed border-blue-500/40 rounded-full animate-spin [animation-duration:8s] absolute" />
          {/* Pulsing ripple aura */}
          <div className="w-36 h-36 border border-blue-400/20 rounded-full animate-ping absolute [animation-duration:3s]" />
          
          {/* Pulsing Target Core */}
          <motion.div
            animate={{ scale: [0.92, 1.12, 0.92], rotate: [0, 90, 180, 270, 360] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="p-5 bg-gradient-to-br from-slate-900 to-blue-950 border border-blue-500/40 rounded-2xl shadow-[0_0_30px_rgba(59,130,246,0.35)] backdrop-blur-xs relative z-10"
          >
            <Target className="w-12 h-12 text-blue-400" />
          </motion.div>
        </div>

        {/* G&G Competições Logo */}
        <motion.img
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          src={logoGgCompeticoes}
          alt="G&G Competições"
          className="h-14 w-auto object-contain mb-5 filter drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]"
        />

        {/* Glowing Dynamic Shimmer Progress Bar */}
        <div className="w-64 h-1.5 bg-slate-900 rounded-full overflow-hidden mb-6 relative border border-slate-800 shadow-inner">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-600 via-sky-400 to-amber-400 rounded-full w-full"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
          />
        </div>

        {/* Dynamic Status Text with Animated Spinner */}
        <div className="flex items-center gap-2 text-xs text-blue-300 font-mono tracking-wide">
          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
          <span>Conectando atiradores federados de alta precisão...</span>
        </div>
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
                      {champ.description && champ.description.trim() !== '' && champ.description.trim().toLowerCase() !== champ.title.trim().toLowerCase() && (
                        <p className={`text-xs line-clamp-3 leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                          {champ.description}
                        </p>
                      )}
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
              className={`${authView === 'login' ? 'max-w-md' : 'max-w-2xl'} w-full p-6 sm:p-8 rounded-3xl space-y-6 relative shadow-2xl animate-scale-up transition-colors duration-300 max-h-[85vh] overflow-y-auto ${theme === 'dark' ? 'bg-slate-900 border border-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-800'}`}
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
                  {authView === 'login' ? 'Entrar no Clube G&G' : authView === 'membro' ? 'Cadastro de Membro' : 'Cadastro de Clube'}
                </h3>
                {loginModalMessage ? (
                  <p className={`text-[11px] leading-normal max-w-xs mx-auto p-2.5 rounded-xl border ${theme === 'dark' ? 'text-amber-400 bg-amber-500/5 border-amber-500/10' : 'text-amber-600 bg-amber-50/50 border-amber-200'}`}>
                    ⚠️ {loginModalMessage}
                  </p>
                ) : (
                  <p className={`text-xs leading-normal max-w-xs mx-auto ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    {authView === 'login' ? 'Faça login para se inscrever nos campeonatos e interagir na rede social.' : 'Preencha seus dados para se cadastrar no clube.'}
                  </p>
                )}
              </div>

              {/* Auth view toggle */}
              <div className={`flex rounded-2xl p-1 text-[10px] font-bold uppercase ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-100'}`}>
                {([
                  ['login', 'Já tenho cadastro'],
                  ['membro', 'Novo cadastro'],
                  ['clube', 'Cadastrar Clube'],
                ] as const).map(([view, label]) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => { setAuthView(view); setLoginModalMessage(''); }}
                    className={`flex-1 py-2 rounded-xl transition ${authView === view ? 'bg-blue-600 text-white shadow' : theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {authView === 'login' && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const ok = await handleLogin(loginCpf, loginPassword);
                    if (ok) {
                      setShowLoginModal(false);
                      setLoginCpf('');
                      setLoginPassword('');
                    }
                  }}
                  className="space-y-4"
                >
                  <AuthField label="CPF" theme={theme} required type="text" placeholder="Ex: 000.000.000-00" value={loginCpf} onChange={(e) => setLoginCpf(e.target.value)} />
                  <AuthField label="Senha" theme={theme} required type="password" placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl text-xs transition uppercase shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Iniciar Sessão Atleta
                  </button>
                </form>
              )}

              {authView === 'membro' && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (membroForm.password !== membroForm.confirmPassword) {
                      setLoginModalMessage('As senhas não coincidem.');
                      return;
                    }
                    if (!membroForm.termsAccepted) {
                      setLoginModalMessage('É necessário aceitar os termos e condições.');
                      return;
                    }
                    const { confirmPassword, termsAccepted, ...payload } = membroForm;
                    const docs = [
                      membroFiles.rgCnh && { kind: 'rg_cnh', file: membroFiles.rgCnh },
                      membroFiles.cr && { kind: 'cr', file: membroFiles.cr },
                      membroFiles.declaracao && { kind: 'declaracao_filiacao', file: membroFiles.declaracao },
                    ].filter(Boolean) as { kind: string; file: File }[];
                    const ok = await handleRegister({ type: 'membro', ...payload }, docs);
                    if (ok) setShowLoginModal(false);
                  }}
                  className="space-y-4"
                >
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Dados Cadastrais</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2"><AuthField label="Nome completo" theme={theme} required value={membroForm.fullName} onChange={(e) => setMembroForm({ ...membroForm, fullName: e.target.value })} /></div>
                    <AuthField label="Data de nascimento" theme={theme} type="date" value={membroForm.birthDate} onChange={(e) => setMembroForm({ ...membroForm, birthDate: e.target.value })} />
                    <AuthSelect
                      label="Sexo"
                      theme={theme}
                      value={membroForm.sex}
                      onChange={(e) => setMembroForm({ ...membroForm, sex: e.target.value })}
                      options={[
                        { value: 'masculino', label: 'Masculino' },
                        { value: 'feminino', label: 'Feminino' }
                      ]}
                     />
                    <AuthField label="RG" theme={theme} value={membroForm.rg} onChange={(e) => setMembroForm({ ...membroForm, rg: e.target.value })} />
                    <AuthField label="Órgão emissor RG" theme={theme} value={membroForm.rgIssuer} onChange={(e) => setMembroForm({ ...membroForm, rgIssuer: e.target.value })} />
                    <AuthField label="Data emissão RG" theme={theme} type="date" value={membroForm.rgIssueDate} onChange={(e) => setMembroForm({ ...membroForm, rgIssueDate: e.target.value })} />
                    <AuthField label="Nome do pai" theme={theme} value={membroForm.fatherName} onChange={(e) => setMembroForm({ ...membroForm, fatherName: e.target.value })} />
                    <AuthField label="Nome da mãe" theme={theme} value={membroForm.motherName} onChange={(e) => setMembroForm({ ...membroForm, motherName: e.target.value })} />
                    <AuthField label="CR" theme={theme} placeholder="Ex: CR-102938-DF" value={membroForm.crNumber} onChange={(e) => setMembroForm({ ...membroForm, crNumber: e.target.value })} />
                    <AuthField label="Validade CR" theme={theme} type="date" value={membroForm.crValidity} onChange={(e) => setMembroForm({ ...membroForm, crValidity: e.target.value })} />
                    <AuthField label="Região Militar" theme={theme} value={membroForm.militaryRegion} onChange={(e) => setMembroForm({ ...membroForm, militaryRegion: e.target.value })} />
                    <AuthField label="Nacionalidade" theme={theme} value={membroForm.nationality} onChange={(e) => setMembroForm({ ...membroForm, nationality: e.target.value })} />
                  </div>

                  <p className={`text-[10px] font-bold uppercase tracking-wider pt-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Dados de Contato</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <AuthField label="Celular" theme={theme} required type="tel" value={membroForm.phone} onChange={(e) => setMembroForm({ ...membroForm, phone: e.target.value })} />
                    <AuthField label="E-mail" theme={theme} required type="email" value={membroForm.email} onChange={(e) => setMembroForm({ ...membroForm, email: e.target.value })} />
                  </div>

                  <p className={`text-[10px] font-bold uppercase tracking-wider pt-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Endereço</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <AuthField label="CEP" theme={theme} value={membroForm.cep} onChange={(e) => setMembroForm({ ...membroForm, cep: e.target.value })} />
                    <AuthField label="Endereço" theme={theme} value={membroForm.address} onChange={(e) => setMembroForm({ ...membroForm, address: e.target.value })} />
                    <AuthField label="Número" theme={theme} value={membroForm.addressNumber} onChange={(e) => setMembroForm({ ...membroForm, addressNumber: e.target.value })} />
                    <AuthField label="Complemento" theme={theme} value={membroForm.complement} onChange={(e) => setMembroForm({ ...membroForm, complement: e.target.value })} />
                    <AuthField label="Bairro" theme={theme} value={membroForm.neighborhood} onChange={(e) => setMembroForm({ ...membroForm, neighborhood: e.target.value })} />
                    <AuthField label="Cidade" theme={theme} value={membroForm.city} onChange={(e) => setMembroForm({ ...membroForm, city: e.target.value })} />
                    <AuthField label="Estado" theme={theme} value={membroForm.state} onChange={(e) => setMembroForm({ ...membroForm, state: e.target.value })} />
                  </div>

                  <p className={`text-[10px] font-bold uppercase tracking-wider pt-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Vínculo e Acesso</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className={`text-[10px] font-bold uppercase tracking-wider block ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Clube *</label>
                      <select
                        required
                        value={membroForm.clubId}
                        onChange={(e) => setMembroForm({ ...membroForm, clubId: e.target.value })}
                        className={`w-full border outline-none px-4 py-3 rounded-2xl text-xs font-semibold focus:ring-1 transition ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-600 focus:ring-blue-600' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500 focus:ring-blue-500'}`}
                      >
                        <option value="">Selecione seu clube</option>
                        {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <AuthField label="CPF" theme={theme} required placeholder="Ex: 000.000.000-00" value={membroForm.cpf} onChange={(e) => setMembroForm({ ...membroForm, cpf: e.target.value })} />
                    <div />
                    <AuthField label="Senha" theme={theme} required type="password" value={membroForm.password} onChange={(e) => setMembroForm({ ...membroForm, password: e.target.value })} />
                    <AuthField label="Repita a senha" theme={theme} required type="password" value={membroForm.confirmPassword} onChange={(e) => setMembroForm({ ...membroForm, confirmPassword: e.target.value })} />
                  </div>

                  <p className={`text-[10px] font-bold uppercase tracking-wider pt-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Documentos (opcional, PDF/JPG/PNG até 1MB)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FileField label="RG ou CNH" theme={theme} onFileChange={(f) => setMembroFiles({ ...membroFiles, rgCnh: f })} />
                    <FileField label="CR" theme={theme} onFileChange={(f) => setMembroFiles({ ...membroFiles, cr: f })} />
                    <div className="sm:col-span-2"><FileField label="Declaração de filiação" theme={theme} onFileChange={(f) => setMembroFiles({ ...membroFiles, declaracao: f })} /></div>
                  </div>

                  <label className={`flex items-center gap-2 text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    <input type="checkbox" checked={membroForm.termsAccepted} onChange={(e) => setMembroForm({ ...membroForm, termsAccepted: e.target.checked })} />
                    Eu aceito os termos e condições
                  </label>

                  <button
                    type="submit"
                    disabled={registerSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-2xl text-xs transition uppercase shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {registerSubmitting ? 'Salvando...' : 'Concluir Cadastro'}
                  </button>
                </form>
              )}

              {authView === 'clube' && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (clubeForm.password !== clubeForm.confirmPassword) {
                      setLoginModalMessage('As senhas não coincidem.');
                      return;
                    }
                    if (!clubeForm.termsAccepted) {
                      setLoginModalMessage('É necessário aceitar os termos e condições.');
                      return;
                    }
                    const { confirmPassword, termsAccepted, ...payload } = clubeForm;
                    const docs = [
                      clubeFiles.cnpjCard && { kind: 'cnpj_card', file: clubeFiles.cnpjCard },
                      clubeFiles.cr && { kind: 'cr', file: clubeFiles.cr },
                      clubeFiles.alvara && { kind: 'alvara', file: clubeFiles.alvara },
                    ].filter(Boolean) as { kind: string; file: File }[];
                    const ok = await handleRegister({ type: 'clube', ...payload }, docs);
                    if (ok) setShowLoginModal(false);
                  }}
                  className="space-y-4"
                >
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Dados Cadastrais</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2"><AuthField label="Razão Social" theme={theme} required value={clubeForm.name} onChange={(e) => setClubeForm({ ...clubeForm, name: e.target.value })} /></div>
                    <AuthField label="CR" theme={theme} value={clubeForm.crNumber} onChange={(e) => setClubeForm({ ...clubeForm, crNumber: e.target.value })} />
                    <AuthField label="Nome do responsável" theme={theme} required value={clubeForm.responsibleName} onChange={(e) => setClubeForm({ ...clubeForm, responsibleName: e.target.value })} />
                  </div>

                  <p className={`text-[10px] font-bold uppercase tracking-wider pt-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Dados de Contato</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <AuthField label="Telefone" theme={theme} type="tel" value={clubeForm.phone} onChange={(e) => setClubeForm({ ...clubeForm, phone: e.target.value })} />
                    <AuthField label="E-mail" theme={theme} required type="email" value={clubeForm.email} onChange={(e) => setClubeForm({ ...clubeForm, email: e.target.value })} />
                  </div>

                  <p className={`text-[10px] font-bold uppercase tracking-wider pt-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Endereço</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <AuthField label="CEP" theme={theme} value={clubeForm.cep} onChange={(e) => setClubeForm({ ...clubeForm, cep: e.target.value })} />
                    <AuthField label="Endereço" theme={theme} value={clubeForm.address} onChange={(e) => setClubeForm({ ...clubeForm, address: e.target.value })} />
                    <AuthField label="Número" theme={theme} value={clubeForm.addressNumber} onChange={(e) => setClubeForm({ ...clubeForm, addressNumber: e.target.value })} />
                    <AuthField label="Complemento" theme={theme} value={clubeForm.complement} onChange={(e) => setClubeForm({ ...clubeForm, complement: e.target.value })} />
                    <AuthField label="Bairro" theme={theme} value={clubeForm.neighborhood} onChange={(e) => setClubeForm({ ...clubeForm, neighborhood: e.target.value })} />
                    <AuthField label="Cidade" theme={theme} value={clubeForm.city} onChange={(e) => setClubeForm({ ...clubeForm, city: e.target.value })} />
                    <AuthField label="Estado" theme={theme} value={clubeForm.state} onChange={(e) => setClubeForm({ ...clubeForm, state: e.target.value })} />
                  </div>

                  <p className={`text-[10px] font-bold uppercase tracking-wider pt-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Dados de Acesso</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <AuthField label="CNPJ" theme={theme} required placeholder="Ex: 00.000.000/0000-00" value={clubeForm.cnpj} onChange={(e) => setClubeForm({ ...clubeForm, cnpj: e.target.value })} />
                    <div />
                    <AuthField label="Senha" theme={theme} required type="password" value={clubeForm.password} onChange={(e) => setClubeForm({ ...clubeForm, password: e.target.value })} />
                    <AuthField label="Repita a senha" theme={theme} required type="password" value={clubeForm.confirmPassword} onChange={(e) => setClubeForm({ ...clubeForm, confirmPassword: e.target.value })} />
                  </div>

                  <p className={`text-[10px] font-bold uppercase tracking-wider pt-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Documentos (opcional, PDF/JPG/PNG até 1MB)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FileField label="Cartão CNPJ" theme={theme} onFileChange={(f) => setClubeFiles({ ...clubeFiles, cnpjCard: f })} />
                    <FileField label="CR" theme={theme} onFileChange={(f) => setClubeFiles({ ...clubeFiles, cr: f })} />
                    <div className="sm:col-span-2"><FileField label="Alvará de funcionamento" theme={theme} onFileChange={(f) => setClubeFiles({ ...clubeFiles, alvara: f })} /></div>
                  </div>

                  <label className={`flex items-center gap-2 text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    <input type="checkbox" checked={clubeForm.termsAccepted} onChange={(e) => setClubeForm({ ...clubeForm, termsAccepted: e.target.checked })} />
                    Eu aceito os termos e condições
                  </label>

                  <button
                    type="submit"
                    disabled={registerSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-2xl text-xs transition uppercase shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {registerSubmitting ? 'Salvando...' : 'Cadastrar Clube'}
                  </button>
                </form>
              )}
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
          
          {/* Profile Dropdown Menu */}
          <div className="relative" ref={profileDropdownRef}>
            <button
              type="button"
              onClick={() => setProfileDropdownOpen(prev => !prev)}
              className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1.5 rounded-2xl transition select-none outline-none group"
              title="Menu do Perfil"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 border-2 border-blue-600 flex items-center justify-center font-bold text-blue-800 text-xs shadow-xs overflow-hidden shrink-0">
                {currentUser.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt={currentUser.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  currentUser.fullName.slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="hidden md:block leading-none text-left">
                <span className="font-bold text-slate-800 text-xs flex items-center gap-1">
                  {currentUser.fullName.split(' ')[0]}
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180 text-blue-600' : ''}`} />
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">@{currentUser.username}</span>
              </div>
            </button>

            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-150 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
                  <p className="text-xs font-bold text-slate-900 truncate">{currentUser.fullName}</p>
                  <p className="text-[10px] text-slate-500 font-mono truncate">@{currentUser.username}</p>
                </div>

                <div className="p-1 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      navigateToProfile(currentUser);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl flex items-center gap-2.5 font-bold transition cursor-pointer"
                  >
                    <UserIcon className="w-4 h-4 text-blue-600" />
                    Ver perfil
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-orange-600 hover:bg-orange-50 rounded-xl flex items-center gap-2.5 font-bold transition cursor-pointer border-t border-slate-100 mt-1 pt-2"
                  >
                    <LogOut className="w-4 h-4 text-orange-600" />
                    Sair
                  </button>
                </div>
              </div>
            )}
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
              defaultImage={settings.default_image}
              onViewProfile={handleViewProfile}
            />
          )}

          {activeTab === 'championships' && (
            <ChampionshipsView
              championships={filteredChampionshipsList}
              registrations={registrations}
              stageScores={stageScores}
              currentUser={currentUser}
              modalities={modalities}
              stages={stages}
              weapons={weapons}
              onRegister={handleRegisterChamp}
              onAddWeapon={handleAddWeapon}
              globalRankings={globalRankings}
              onSelectModalityRanking={setSelectedRankingModality}
              selectedRankingModality={selectedRankingModality}
              defaultImage={settings.default_image}
              onViewProfile={handleViewProfile}
            />
          )}

          {activeTab === 'admin' && (
            <AdminPanel
              currentUser={currentUser}
              championships={championships}
              registrations={registrations}
              stageScores={stageScores}
              stages={stages}
              users={users}
              weapons={weapons}
              weaponLookupOptions={weaponLookupOptions}
              modalities={modalities}
              onRefreshData={syncWithBackend}
              onCreateChampionship={handleCreateChampionshipAdmin}
              onUpdateChampionship={handleUpdateChampionshipAdmin}
              onRemoveChampionship={handleRemoveChampionship}
              onUploadChampionshipDocument={handleUploadChampionshipDocument}
              onAddStage={handleAddStage}
              onUpdateStage={handleUpdateStage}
              onRemoveStage={handleRemoveStage}
              onRecordScore={handleRecordScoreAdmin}
              onToggleAdminDemo={handleToggleAdminDemo}
              onAddWeapon={handleAddWeapon}
              onRemoveWeapon={handleRemoveWeapon}
              onUpdateWeapon={handleUpdateWeapon}
              onAddWeaponLookup={handleAddWeaponLookup}
              onUpdateWeaponLookup={handleUpdateWeaponLookup}
              onRemoveWeaponLookup={handleRemoveWeaponLookup}
              onAddModality={handleAddModality}
              onRemoveModality={handleRemoveModality}
              settings={settings}
              onSaveSetting={handleSaveSetting}
              onCreateMember={handleCreateMember}
              onUpdateMemberProfile={handleUpdateMemberProfile}
              onUploadMemberDocument={handleUploadMemberDocument}
              clubs={clubs}
              onCreateClub={handleCreateClub}
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
              modalities={modalities}
              clubs={clubs}
              stages={stages}
              users={users}
              onToggleFollow={handleToggleFollow}
              onPaySignature={handlePaySignature}
              onLogout={handleLogout}
              onAddPost={handleAddPost}
              onNavigateToChampionships={() => setActiveTab('championships')}
              onUpdateProfile={handleUpdateProfile}
              onUpdateClub={handleUpdateClub}
              onUploadDocument={handleUploadDocument}
              defaultImage={settings.default_image}
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
