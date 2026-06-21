import React, { useState } from 'react';
import { Championship, Registration, User, StageScore } from '../types';
import { 
  ShieldAlert, PlusCircle, Award, Target, Save, CheckCircle, Calendar, Trophy, AlertCircle, Sparkles,
  DollarSign, CreditCard, FileText, Users, Disc, Globe, Activity, ChevronDown, ChevronUp, Printer,
  UserPlus, FileCheck, Layers, Landmark, Briefcase, FileSignature, Database, Settings, ShieldCheck,
  Eye, Check, Trash2
} from 'lucide-react';
import { motion } from 'motion/react';

const GALLERY_IMAGES = [
  { id: 'ipsc_range', label: 'Estande IPSC', url: "https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=800&auto=format&fit=crop&q=80" },
  { id: 'precision_rifle', label: 'Carabina Precisão', url: "https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?w=800&auto=format&fit=crop&q=80" },
  { id: 'paper_target', label: 'Alvo de Papel', url: "https://images.unsplash.com/photo-1605330372990-281b504cc2c4?w=800&auto=format&fit=crop&q=80" },
  { id: 'pistol_grip', label: 'Empunhadura', url: "https://images.unsplash.com/photo-1569584312214-362c37aed31c?w=800&auto=format&fit=crop&q=80" },
  { id: 'clay_trap', label: 'Tiro ao Prato', url: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=800&auto=format&fit=crop&q=80" },
  { id: 'trophies', label: 'Troféus G&G', url: "https://images.unsplash.com/photo-1578269174936-2709b5a5c0e5?w=800&auto=format&fit=crop&q=80" },
  { id: 'range_glasses', label: 'Equipamentos', url: "https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=800&auto=format&fit=crop&q=80" }
];

interface AdminPanelProps {
  currentUser: User | null;
  championships: Championship[];
  registrations: Registration[];
  stageScores: StageScore[];
  users: User[];
  onCreateChampionship: (data: {
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    registrationFee: number;
    modalities: string[];
    stagesCount: number;
    bannerUrl?: string;
  }) => Promise<void>;
  onUpdateChampionship?: (id: string, data: {
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    registrationFee: number;
    modalities: string[];
    stagesCount: number;
    bannerUrl?: string;
  }) => Promise<void>;
  onRecordScore: (data: {
    championshipId: string;
    registrationId: string;
    stageNum: number;
    score: number;
    timeSeconds?: number;
  }) => Promise<void>;
  onToggleAdminDemo: () => void;
  settings?: { [key: string]: string };
  onSaveSetting?: (key: string, value: string) => Promise<void>;
}

export default function AdminPanel({
  currentUser,
  championships,
  registrations,
  stageScores,
  users,
  onCreateChampionship,
  onUpdateChampionship,
  onRecordScore,
  onToggleAdminDemo,
  settings = {},
  onSaveSetting
}: AdminPanelProps) {
  // Main tabs: 'clube' | 'plataforma' | 'master'
  const [mainTab, setMainTab] = useState<'clube' | 'plataforma' | 'master'>('clube');

  // Sidebar Menu selection for Clube
  const [clubeMenu, setClubeMenu] = useState<string>('campeonatos');

  // Sidebar Menu selection for Plataforma
  const [plataformaMenu, setPlataformaMenu] = useState<string>('novo_campeonato');

  // Sidebar Menu selection for Master
  const [masterMenu, setMasterMenu] = useState<string>('gerenciar_clubes');

  // Master mock states
  const [masterClubs, setMasterClubs] = useState([
    { id: '1', name: 'Unidade Sede (Brasília)', location: 'Brasília - DF', shootersCount: 142, status: 'Ativo', president: 'Guilherme Guedes' },
    { id: '2', name: 'G&G Sobradinho', location: 'Sobradinho - DF', shootersCount: 68, status: 'Ativo', president: 'Gabriel Guedes' },
    { id: '3', name: 'G&G Taguatinga', location: 'Taguatinga - DF', shootersCount: 54, status: 'Ativo', president: 'Carlos Souza' },
    { id: '4', name: 'Estande Alvo Certo (Pendente)', location: 'Goiânia - GO', shootersCount: 0, status: 'Pendente', president: 'Roberto Silva' },
  ]);

  const [billingList, setBillingList] = useState([
    { id: 'bill-1', target: 'G&G Sobradinho', type: 'Franquia (15%)', amount: 6765, dueDate: '2026-06-30', status: 'Pendente' },
    { id: 'bill-2', target: 'G&G Taguatinga', type: 'Franquia (15%)', amount: 4875, dueDate: '2026-06-30', status: 'Pago' },
    { id: 'bill-3', target: 'Ana Clara', type: 'Anuidade Atleta', amount: 350, dueDate: '2026-06-25', status: 'Pendente' },
    { id: 'bill-4', target: 'Marcos Oliveira', type: 'Anuidade Atleta', amount: 350, dueDate: '2026-06-20', status: 'Pago' },
    { id: 'bill-5', target: 'Estande Alvo Certo', type: 'Taxa Adesão Filiação', amount: 2500, dueDate: '2026-07-05', status: 'Pendente' },
  ]);

  const [billingSuccessMsg, setBillingSuccessMsg] = useState('');

  const handleToggleClubStatus = (clubId: string) => {
    setMasterClubs(prev => prev.map(c => {
      if (c.id === clubId) {
        const newStatus = c.status === 'Ativo' ? 'Suspenso' : 'Ativo';
        return { ...c, status: newStatus };
      }
      return c;
    }));
  };

  const handleApproveClub = (clubId: string) => {
    setMasterClubs(prev => prev.map(c => {
      if (c.id === clubId) {
        return { ...c, status: 'Ativo' };
      }
      return c;
    }));
  };

  const handleSendBillingReminder = (billId: string) => {
    setBillingSuccessMsg(`Lembrete de cobrança enviado com sucesso para ${billingList.find(b => b.id === billId)?.target}!`);
    setTimeout(() => setBillingSuccessMsg(''), 3000);
  };

  // Plataforma sidebar collapsible sections (accordions)
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    clubes: true,
    campeonatos: true,
    adm: false,
    idsc: false,
    site: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Create championship state (functional)
  const [champTitle, setChampTitle] = useState('');
  const [champDesc, setChampDesc] = useState('');
  const [champStart, setChampStart] = useState('2026-07-01');
  const [champEnd, setChampEnd] = useState('2026-09-15');
  const [champFee, setChampFee] = useState(120);
  const [selectedMods, setSelectedMods] = useState<string[]>(['IPSC Handgun Standard']);
  const [champStages, setChampStages] = useState(4);
  const [champBanner, setChampBanner] = useState('');
  const [champImageSourceMode, setChampImageSourceMode] = useState<'url' | 'upload' | 'gallery'>('gallery');
  const [createSuccess, setCreateSuccess] = useState(false);

  // Edit championship state (functional)
  const [editingChampId, setEditingChampId] = useState<string | null>(null);
  const [editChampTitle, setEditChampTitle] = useState('');
  const [editChampDesc, setEditChampDesc] = useState('');
  const [editChampStart, setEditChampStart] = useState('');
  const [editChampEnd, setEditChampEnd] = useState('');
  const [editChampFee, setEditChampFee] = useState(120);
  const [editSelectedMods, setEditSelectedMods] = useState<string[]>([]);
  const [editChampStages, setEditChampStages] = useState(4);
  const [editChampBanner, setEditChampBanner] = useState('');
  const [editChampImageSourceMode, setEditChampImageSourceMode] = useState<'url' | 'upload' | 'gallery'>('gallery');
  const [editSuccess, setEditSuccess] = useState(false);

  // Default image settings state (functional)
  const [defaultImageSourceMode, setDefaultImageSourceMode] = useState<'url' | 'upload' | 'gallery'>('gallery');
  const [newDefaultImage, setNewDefaultImage] = useState(settings.default_image || '');
  const [defaultImageSuccess, setDefaultImageSuccess] = useState(false);

  React.useEffect(() => {
    if (settings.default_image) {
      setNewDefaultImage(settings.default_image);
    }
  }, [settings.default_image]);

  // Score recording state (functional)
  const [selectedChampId, setSelectedChampId] = useState(championships[0]?.id || '');
  const [selectedRegId, setSelectedRegId] = useState('');
  const [selectedStageNum, setSelectedStageNum] = useState(1);
  const [scoreInput, setScoreInput] = useState('');
  const [timeInput, setTimeInput] = useState('');
  const [scoreSuccess, setScoreSuccess] = useState(false);

  // MOCK states for new features
  // Member signup
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberUser, setNewMemberUser] = useState('');
  const [newMemberCR, setNewMemberCR] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [memberSuccess, setMemberSuccess] = useState(false);

  // Weapon Concession
  const [cessaoAtletaName, setCessaoAtletaName] = useState('');
  const [cessaoArmaModel, setCessaoArmaModel] = useState('');
  const [cessaoCaliber, setCessaoCaliber] = useState('9mm');
  const [cessaoSigma, setCessaoSigma] = useState('');
  const [cessaoOwner, setCessaoOwner] = useState('G&G Escola de Tiro');
  const [cessaoDurationDays, setCessaoDurationDays] = useState(1);
  const [isCessaoPrintOpen, setIsCessaoPrintOpen] = useState(false);

  // Declarations
  const [decAthleteId, setDecAthleteId] = useState('');
  const [decType, setDecType] = useState('filiacao');
  const [isDecPreviewOpen, setIsDecPreviewOpen] = useState(false);

  // Site Banners mockup
  const [bannerSuccess, setBannerSuccess] = useState(false);

  // Filter registrations for score inputs
  const filteredRegs = registrations.filter(
    (r) => r.championshipId === selectedChampId && r.paymentStatus === 'approved'
  );

  const handleCreateChamp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!champTitle || !champDesc || selectedMods.length === 0) return;

    await onCreateChampionship({
      title: champTitle,
      description: champDesc,
      startDate: champStart,
      endDate: champEnd,
      registrationFee: Number(champFee),
      modalities: selectedMods,
      stagesCount: Number(champStages),
      bannerUrl: champBanner || undefined
    });

    setCreateSuccess(true);
    setChampTitle('');
    setChampDesc('');
    setChampBanner('');
    setTimeout(() => setCreateSuccess(false), 3000);
  };

  const handleUpdateChamp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChampId || !editChampTitle || !editChampDesc || editSelectedMods.length === 0 || !onUpdateChampionship) return;

    await onUpdateChampionship(editingChampId, {
      title: editChampTitle,
      description: editChampDesc,
      startDate: editChampStart,
      endDate: editChampEnd,
      registrationFee: Number(editChampFee),
      modalities: editSelectedMods,
      stagesCount: Number(editChampStages),
      bannerUrl: editChampBanner || undefined
    });

    setEditSuccess(true);
    setEditingChampId(null);
    setEditChampBanner('');
    setTimeout(() => setEditSuccess(false), 3000);
  };

  const handleSaveDefaultImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDefaultImage || !onSaveSetting) return;

    await onSaveSetting('default_image', newDefaultImage);
    setDefaultImageSuccess(true);
    setTimeout(() => setDefaultImageSuccess(false), 3000);
  };


  const startEditingChamp = (champ: Championship) => {
    setEditingChampId(champ.id);
    setEditChampTitle(champ.title);
    setEditChampDesc(champ.description);
    setEditChampStart(champ.startDate.split('T')[0]);
    setEditChampEnd(champ.endDate.split('T')[0]);
    setEditChampFee(champ.registrationFee);
    setEditSelectedMods(champ.modalities);
    setEditChampStages(champ.stagesCount);
    setEditChampBanner(champ.bannerUrl || '');
  };

  const handleRecordScoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChampId || !selectedRegId || !scoreInput) return;

    await onRecordScore({
      championshipId: selectedChampId,
      registrationId: selectedRegId,
      stageNum: Number(selectedStageNum),
      score: Number(scoreInput),
      timeSeconds: timeInput ? Number(timeInput) : undefined
    });

    setScoreSuccess(true);
    setScoreInput('');
    setTimeInput('');
    setTimeout(() => setScoreSuccess(false), 3000);
  };

  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    setMemberSuccess(true);
    setTimeout(() => {
      setMemberSuccess(false);
      setNewMemberName('');
      setNewMemberUser('');
      setNewMemberCR('');
      setNewMemberEmail('');
    }, 2500);
  };

  const isAdmin = currentUser?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="py-10 max-w-xl mx-auto text-center space-y-6">
        <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 space-y-4">
          <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
          <h3 className="font-display font-bold text-slate-900 text-lg">Acesso Restrito ao Diretor</h3>
          <p className="text-xs text-slate-550 leading-relaxed">
            O painel de gerenciamento de campeonatos, controle financeiro, homologação de notas fiduciárias e emissão de declarações é de uso restrito da diretoria G&G.
          </p>
          <div className="bg-blue-50 p-4 rounded-xl space-y-3">
            <span className="text-[10px] text-blue-700 font-bold block uppercase tracking-wider">MODO TESTE DISPONÍVEL</span>
            <p className="text-[11px] text-slate-650">Deseja simular as credenciais de administrador da diretoria fiscal para testar as abas?</p>
            <button
              onClick={onToggleAdminDemo}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2.5 rounded-lg font-bold transition inline-flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Ativar Modo Diretor (Admin)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // CLUBE TAB CONTENT RENDERING
  // ==========================================
  const renderClubeContent = () => {
    switch (clubeMenu) {
      case 'campeonatos':
        return (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-base">Campeonatos do Estande</h3>
                <p className="text-xs text-slate-400">Relação completa de competições esportivas sob gestão do clube.</p>
              </div>
              <Trophy className="w-5 h-5 text-blue-600" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-mono text-[10px] uppercase">
                    <th className="py-3 px-2">Campeonato</th>
                    <th className="py-3 px-2">Período</th>
                    <th className="py-3 px-2 text-center">Etapas</th>
                    <th className="py-3 px-2 text-right">Inscrição</th>
                    <th className="py-3 px-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {championships.map((champ) => {
                    const isCompleted = champ.status === 'completed';
                    return (
                      <tr key={champ.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-2">
                          <span className="font-bold text-slate-800 block">{champ.title}</span>
                          <span className="text-[10px] text-slate-450 block truncate max-w-[280px]">{champ.description}</span>
                        </td>
                        <td className="py-3 px-2 font-mono text-slate-600">
                          {new Date(champ.startDate).toLocaleDateString()} - {new Date(champ.endDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-2 text-center font-bold font-mono">{champ.stagesCount}</td>
                        <td className="py-3 px-2 text-right font-bold font-mono text-slate-800">R$ {champ.registrationFee}</td>
                        <td className="py-3 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${isCompleted ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-800'}`}>
                            {isCompleted ? 'Finalizado' : 'Aberto'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'multi_championships':
        return (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-base">Dashboard Multi-Campeonatos</h3>
                <p className="text-xs text-slate-400">Acompanhamento consolidado de atiradores em múltiplas divisões.</p>
              </div>
              <Layers className="w-5 h-5 text-blue-600" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {users.slice(0, 4).map((user) => {
                const userRegs = registrations.filter(r => r.userId === user.id && r.paymentStatus === 'approved');
                const userScores = stageScores.filter(s => s.userId === user.id);
                if (userRegs.length <= 1) return null;

                return (
                  <div key={user.id} className="border border-slate-150 rounded-xl p-4 bg-slate-50/50 space-y-3">
                    <div className="flex items-center gap-3">
                      <img src={user.avatarUrl} alt={user.username} className="w-8 h-8 rounded-full object-cover" />
                      <div>
                        <h4 className="font-bold text-xs text-slate-800">{user.fullName}</h4>
                        <span className="text-[10px] text-slate-450 block font-mono">@{user.username}</span>
                      </div>
                    </div>
                    <div className="border-t border-slate-200/60 pt-2 grid grid-cols-3 gap-2 text-[10px] font-mono text-center text-slate-600">
                      <div>
                        <span className="block text-[8px] text-slate-400 font-sans uppercase">Inscrições</span>
                        <span className="font-bold text-slate-800">{userRegs.length} Categorias</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-slate-400 font-sans uppercase">Total Pontos</span>
                        <span className="font-bold text-blue-600">{userScores.reduce((sum, s) => sum + s.score, 0).toFixed(1)}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-slate-400 font-sans uppercase">Etapas</span>
                        <span className="font-bold text-emerald-600">{userScores.length} Disputadas</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'resultados':
        return (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-base">Notas e Resultados Homologados</h3>
                <p className="text-xs text-slate-400">Logs de passagens de pista e tempos homologados pelo Diretor.</p>
              </div>
              <Target className="w-5 h-5 text-blue-600" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-mono text-[10px] uppercase">
                    <th className="py-3 px-2">Atleta</th>
                    <th className="py-3 px-2">Modalidade</th>
                    <th className="py-3 px-2 text-center">Etapa</th>
                    <th className="py-3 px-2 text-right">Tempo</th>
                    <th className="py-3 px-2 text-right">Pontos</th>
                    <th className="py-3 px-2 text-right">Fator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {stageScores.slice().reverse().map((score) => (
                    <tr key={score.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-2 font-bold text-slate-800">{score.shooterName}</td>
                      <td className="py-3 px-2 text-slate-500">{score.modality}</td>
                      <td className="py-3 px-2 text-center font-bold text-blue-600">Etapa {score.stageNum}</td>
                      <td className="py-3 px-2 text-right font-mono">{score.timeSeconds ? `${score.timeSeconds}s` : '-'}</td>
                      <td className="py-3 px-2 text-right font-bold font-mono text-slate-850">{score.score}</td>
                      <td className="py-3 px-2 text-right font-bold font-mono text-emerald-600">{score.hitFactor ? score.hitFactor.toFixed(3) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'financeiro':
        const confirmedRegs = registrations.filter(r => r.paymentStatus === 'approved');
        const totalFees = confirmedRegs.reduce((sum, r) => {
          const fee = championships.find(c => c.id === r.championshipId)?.registrationFee || 0;
          return sum + fee;
        }, 0);
        const signedUsersCount = users.filter(u => u.hasPaidSignature).length;

        return (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-base">Demonstrativo Financeiro do Estande</h3>
                <p className="text-xs text-slate-400">Balanço simplificado de recebíveis de inscrições e anuidades.</p>
              </div>
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-center">
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 text-emerald-800">
                <span className="text-[10px] text-slate-500 block font-sans">Inscrições de Torneio</span>
                <span className="font-bold text-lg">R$ {totalFees.toFixed(2)}</span>
              </div>
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-blue-800">
                <span className="text-[10px] text-slate-500 block font-sans">Anuidades de Membros</span>
                <span className="font-bold text-lg">R$ {(signedUsersCount * 360).toFixed(2)}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-700">
                <span className="text-[10px] text-slate-500 block font-sans">Faturamento Bruto</span>
                <span className="font-bold text-lg">R$ {(totalFees + (signedUsersCount * 360)).toFixed(2)}</span>
              </div>
            </div>

            {/* Recent payments table */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Histórico de Transações Recentes</h4>
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-mono uppercase">
                      <th className="py-2">Data</th>
                      <th className="py-2">Referência</th>
                      <th className="py-2">Atleta</th>
                      <th className="py-2">Meio</th>
                      <th className="py-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-600">
                    {confirmedRegs.slice(0, 5).map((reg) => {
                      const athleteName = users.find(u => u.id === reg.userId)?.fullName || 'Filiado G&G';
                      const champFee = championships.find(c => c.id === reg.championshipId)?.registrationFee || 0;
                      return (
                        <tr key={reg.id}>
                          <td className="py-2 font-mono">{new Date(reg.registeredAt).toLocaleDateString()}</td>
                          <td className="py-2 font-semibold text-slate-800">Inscrição Campeonato</td>
                          <td className="py-2">{athleteName}</td>
                          <td className="py-2 font-mono uppercase">{reg.paymentMethod}</td>
                          <td className="py-2 text-right font-mono font-bold text-slate-800">R$ {champFee.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'cadastrar_resultados':
        return (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-base">Lançar Notas e Homologar Tempos</h3>
                <p className="text-xs text-slate-400">Inserir pontuação de passagem de pista oficial no banco de dados.</p>
              </div>
              <PlusCircle className="w-5 h-5 text-blue-600" />
            </div>

            {scoreSuccess && (
              <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl flex items-center gap-2 mb-4 text-xs font-semibold">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                Pontuação gravada, calculada e sincronizada no feed esportivo do clube!
              </div>
            )}

            <form onSubmit={handleRecordScoreSubmit} className="space-y-4 text-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Select championship */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Selecione o Campeonato</label>
                  <select
                    value={selectedChampId}
                    onChange={(e) => {
                      setSelectedChampId(e.target.value);
                      setSelectedRegId('');
                    }}
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700 font-semibold"
                  >
                    <option value="" disabled>Selecione...</option>
                    {championships.map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>

                {/* Select Stage */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block font-sans">Etapa Correspondente</label>
                  <select
                    value={selectedStageNum}
                    onChange={(e) => setSelectedStageNum(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700 font-semibold"
                  >
                    {[1, 2, 3, 4].map(num => (
                      <option key={num} value={num}>Etapa {num}</option>
                    ))}
                  </select>
                </div>

                {/* Select Athlete / Registration */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Atleta Inscrito / Matrícula Regulamentar</label>
                  <select
                    value={selectedRegId}
                    onChange={(e) => setSelectedRegId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700"
                    required
                  >
                    <option value="">Selecione o Atleta do Clube...</option>
                    {filteredRegs.map((reg) => {
                      const athlete = users.find(u => u.id === reg.userId);
                      return (
                        <option key={reg.id} value={reg.id}>
                          {athlete?.fullName} | CR: {reg.crNumber} ({reg.modality})
                        </option>
                      );
                    })}
                  </select>
                  {filteredRegs.length === 0 && (
                    <span className="text-[10px] text-red-500 font-semibold block pt-1">
                      Nenhum atleta homologado (pago) para este torneio no momento.
                    </span>
                  )}
                </div>

                {/* Score Input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Pontos brutos do cartão</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Ex: 95.50"
                    value={scoreInput}
                    onChange={(e) => setScoreInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700 font-mono"
                  />
                </div>

                {/* Time Input for dynamic factor (IPSC) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block font-sans">Tempo de Pista em Segundos (Opcional)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 15.42 (Deixe vazio para tiro de precisão)"
                    value={timeInput}
                    onChange={(e) => setTimeInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700 font-mono"
                  />
                </div>

              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={filteredRegs.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs px-6 py-3 rounded-xl font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Salvar e Homologar Pontos
                </button>
              </div>

            </form>
          </div>
        );

      case 'certificados':
        return (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-base">Homologação de Certificados</h3>
                <p className="text-xs text-slate-400">Verificar atletas que concluíram etapas e estão aptos para receber certificação.</p>
              </div>
              <Award className="w-5 h-5 text-blue-600" />
            </div>

            <div className="grid grid-cols-1 gap-3">
              {registrations.filter(r => r.paymentStatus === 'approved').map((reg) => {
                const athlete = users.find(u => u.id === reg.userId);
                const champ = championships.find(c => c.id === reg.championshipId);
                return (
                  <div key={reg.id} className="border border-slate-100 rounded-xl p-4 flex items-center justify-between bg-slate-50/50">
                    <div>
                      <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded font-mono">IDSC / IPSC OFICIAL</span>
                      <h4 className="font-bold text-slate-800 text-xs mt-1.5">{athlete?.fullName}</h4>
                      <p className="text-[10px] text-slate-500">{champ?.title} - {reg.modality}</p>
                    </div>
                    <span className="text-emerald-600 text-[10px] font-bold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> ELEGÍVEL
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'cadastrar_membros':
        return (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-base">Cadastrar Novo Sócio / Atleta</h3>
                <p className="text-xs text-slate-400">Adicionar registro regulamentar de filiado G&G.</p>
              </div>
              <UserPlus className="w-5 h-5 text-blue-600" />
            </div>

            {memberSuccess && (
              <div className="bg-emerald-50 text-emerald-805 p-3 rounded-xl flex items-center gap-2 mb-4 text-xs font-semibold">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                Atleta desportivo cadastrado e regularizado no sistema com sucesso!
              </div>
            )}

            <form onSubmit={handleCreateMember} className="space-y-4 text-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Nome Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Cabral"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Username / Apelido</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: carlota_ipsc"
                    value={newMemberUser}
                    onChange={(e) => setNewMemberUser(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Certificado de Registro (CR)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: CR-873918-DF"
                    value={newMemberCR}
                    onChange={(e) => setNewMemberCR(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-750 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">E-mail de Contato</label>
                  <input
                    type="email"
                    required
                    placeholder="carlos@cabal.com"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-6 py-3 rounded-xl font-bold transition shadow-lg shadow-blue-100 cursor-pointer"
                >
                  Salvar Registro de Atleta
                </button>
              </div>
            </form>
          </div>
        );

      case 'cessao_armas':
        return (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-base">Termo de Cessão de Uso de Armamento</h3>
                <p className="text-xs text-slate-400">Emissão de termo de empréstimo de arma de fogo para competições/treinos regulamentares.</p>
              </div>
              <FileSignature className="w-5 h-5 text-blue-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Form Input */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Nome do Atleta Recebedor</label>
                  <select
                    value={cessaoAtletaName}
                    onChange={(e) => setCessaoAtletaName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700 font-semibold"
                  >
                    <option value="">Selecione o Atleta...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.fullName}>{u.fullName}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Arma Cedida</label>
                  <input
                    type="text"
                    placeholder="Ex: Pistola Glock G25"
                    value={cessaoArmaModel}
                    onChange={(e) => setCessaoArmaModel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Calibre</label>
                    <select
                      value={cessaoCaliber}
                      onChange={(e) => setCessaoCaliber(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700 font-semibold"
                    >
                      <option value="9mm">9mm Luger</option>
                      <option value=".380 ACP">.380 ACP</option>
                      <option value=".22 LR">.22 LR</option>
                      <option value="12 GA">12 GA</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Número Sigma / Registro</label>
                    <input
                      type="text"
                      placeholder="Ex: SIGMA-10293847"
                      value={cessaoSigma}
                      onChange={(e) => setCessaoSigma(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-750 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Proprietário Cedente</label>
                    <input
                      type="text"
                      value={cessaoOwner}
                      onChange={(e) => setCessaoOwner(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Validade em Dias</label>
                    <input
                      type="number"
                      value={cessaoDurationDays}
                      onChange={(e) => setCessaoDurationDays(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700 font-mono"
                    />
                  </div>
                </div>

                <button
                  onClick={() => setIsCessaoPrintOpen(true)}
                  disabled={!cessaoAtletaName || !cessaoArmaModel || !cessaoSigma}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white text-xs py-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-blue-50"
                >
                  <Printer className="w-4 h-4" />
                  Gerar e Visualizar Documento
                </button>
              </div>

              {/* Concession Document Preview */}
              {cessaoAtletaName && cessaoArmaModel && cessaoSigma && (
                <div className="border border-slate-250 p-6 rounded-xl bg-slate-50 font-mono text-[10px] text-slate-700 space-y-4">
                  <div className="text-center font-bold border-b border-slate-200 pb-2">
                    <p>TERMO DE CESSÃO DE USO TEMPORÁRIO DE ARMA DE FOGO</p>
                    <p className="text-[8px] font-normal text-slate-500">HOMOLOGADO SFPC / COMANDO DO EXÉRCITO BRASILEIRO</p>
                  </div>
                  <div className="space-y-2 leading-relaxed">
                    <p>
                      Eu, <strong>{cessaoOwner}</strong>, na qualidade de proprietário legítimo e registrado, cedo o uso temporário do seguinte armamento:
                    </p>
                    <div className="bg-white p-2 border border-slate-200 space-y-1">
                      <div><strong>Espécie/Modelo:</strong> {cessaoArmaModel}</div>
                      <div><strong>Calibre:</strong> {cessaoCaliber}</div>
                      <div><strong>Nº Registro Sigma:</strong> {cessaoSigma}</div>
                    </div>
                    <p>
                      Para uso exclusivo em treinamentos e competições oficiais do clube, pelo atirador federado desportivo:
                    </p>
                    <div className="bg-white p-2 border border-slate-200">
                      <strong>Atleta:</strong> {cessaoAtletaName}
                    </div>
                    <p>
                      Este termo é válido pelo período improrrogável de <strong>{cessaoDurationDays} dia(s)</strong> a contar da data de sua assinatura física.
                    </p>
                  </div>
                  <div className="pt-4 border-t border-slate-250 flex justify-between items-end">
                    <div>
                      <p>Brasília-DF, {new Date().toLocaleDateString()}</p>
                    </div>
                    <div className="text-center w-28">
                      <div className="h-0.5 bg-slate-400 w-full mb-1"></div>
                      Assinatura Cedente
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'relatorios_declaracoes':
        return (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-base">Relatórios & Declarações Regulamentares</h3>
                <p className="text-xs text-slate-400">Emissão de atestados de filiação ativa e habitualidade esportiva para o Exército.</p>
              </div>
              <FileText className="w-5 h-5 text-blue-600" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Selecione o Atleta</label>
                  <select
                    value={decAthleteId}
                    onChange={(e) => setDecAthleteId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700 font-semibold"
                  >
                    <option value="">Selecione o Atleta...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.fullName}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Tipo de Declaração</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setDecType('filiacao')}
                      className={`p-3 border rounded-xl flex flex-col items-center justify-center gap-1 font-bold text-xs transition ${decType === 'filiacao' ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                    >
                      <Landmark className="w-4 h-4" />
                      Filiação
                    </button>
                    <button
                      onClick={() => setDecType('habitualidade')}
                      className={`p-3 border rounded-xl flex flex-col items-center justify-center gap-1 font-bold text-xs transition ${decType === 'habitualidade' ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                    >
                      <Activity className="w-4 h-4" />
                      Habitualidade
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setIsDecPreviewOpen(true)}
                  disabled={!decAthleteId}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white text-xs py-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  Emitir e Visualizar Declaração
                </button>
              </div>

              {/* Declaration Document Preview */}
              {decAthleteId && (
                <div className="border border-slate-250 p-6 rounded-xl bg-slate-50 font-serif text-[10px] text-slate-800 space-y-6">
                  <div className="text-center space-y-1">
                    <h4 className="font-bold text-xs">DECLARAÇÃO DE TIRO ESPORTIVO REGULAR</h4>
                    <p className="text-[8px] font-sans text-slate-500">FEDERAÇÃO E CLUBE G&G COMPETIÇÕES • BRASÍLIA/DF</p>
                  </div>

                  {decType === 'filiacao' ? (
                    <p className="leading-relaxed">
                      Declaramos, para os devidos fins de direito junto ao Sistema de Fiscalização de Produtos Controlados (SFPC) do Exército Brasileiro, que o atleta desportista desfruta de filiação ativa regular sob o registro nº 918 no Clube G&G, estando adimplente e habilitado com as normas reguladoras de segurança vigentes.
                    </p>
                  ) : (
                    <p className="leading-relaxed">
                      Declaramos para os devidos fins de aquisição de insumos, renovação de registro e importação regulamentar de munições que o atleta possui habitualidade esportiva regular no estande G&G, registrando participações oficiais de pistas nas etapas federais.
                    </p>
                  )}

                  <div className="space-y-1 font-mono text-[9px] bg-white p-3 border border-slate-200 rounded-lg">
                    <div><strong>Atleta:</strong> {users.find(u => u.id === decAthleteId)?.fullName}</div>
                    <div><strong>CR Cadastrado:</strong> {users.find(u => u.id === decAthleteId)?.crNumber || 'Emissão pendente...'}</div>
                    <div><strong>Associação:</strong> {users.find(u => u.id === decAthleteId)?.isClubMember ? 'Regularizada' : 'Convidado'}</div>
                  </div>

                  <div className="pt-6 border-t border-slate-200/80 flex justify-between items-end text-center font-sans text-[8px]">
                    <div>
                      <p>Brasília-DF, {new Date().toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className="w-28 space-y-1">
                      <div className="h-0.5 bg-slate-400 w-full"></div>
                      <span className="font-bold block">Secretaria Geral G&G</span>
                      <span className="text-slate-400 block font-mono">REG-GG-DEC-{decAthleteId.slice(0, 5).toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ==========================================
  // PLATAFORMA TAB CONTENT RENDERING
  // ==========================================
  const renderPlataformaContent = () => {
    switch (plataformaMenu) {
      case 'novo_clube':
        return (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-base">Cadastrar Novo Clube Filiado</h3>
                <p className="text-xs text-slate-400">Adicionar uma nova unidade ou clube filiado na rede nacional G&G.</p>
              </div>
              <Landmark className="w-5 h-5 text-blue-600" />
            </div>

            {memberSuccess && (
              <div className="bg-emerald-50 text-emerald-805 p-3 rounded-xl flex items-center gap-2 mb-4 text-xs font-semibold">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                Unidade filiada integrada ao sistema nacional G&G!
              </div>
            )}

            <form onSubmit={handleCreateMember} className="space-y-4 text-slate-805">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Nome do Estande/Clube</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: G&G Sobradinho Estande de Precisão"
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">CNPJ Entidade</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 45.981.042/0002-99"
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Cidade / UF</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Sobradinho - DF"
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Diretor Presidente Responsável</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Gabriel Guedes"
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-6 py-3 rounded-xl font-bold transition shadow-lg shadow-blue-100 cursor-pointer"
                >
                  Registrar Unidade
                </button>
              </div>
            </form>
          </div>
        );

      case 'relatorio_financeiro':
        return (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-base">Consolidado Financeiro Nacional</h3>
                <p className="text-xs text-slate-400">Comparativo financeiro mensal consolidado por unidade regional.</p>
              </div>
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>

            <div className="overflow-x-auto text-xs text-slate-700">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 font-mono text-[10px] text-slate-400 uppercase">
                    <th className="py-3 px-2">Unidade</th>
                    <th className="py-3 px-2 text-right">Faturamento Anual</th>
                    <th className="py-3 px-2 text-right">Repasse Franquia (15%)</th>
                    <th className="py-3 px-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="font-mono">
                    <td className="py-3 px-2 font-sans font-bold text-slate-800">Unidade Sede (Brasília)</td>
                    <td className="py-3 px-2 text-right">R$ 184.200,00</td>
                    <td className="py-3 px-2 text-right text-slate-500">-</td>
                    <td className="py-3 px-2 text-center"><span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-sans font-bold text-[9px]">ISENTO</span></td>
                  </tr>
                  <tr className="font-mono">
                    <td className="py-3 px-2 font-sans font-bold text-slate-800">G&G Sobradinho</td>
                    <td className="py-3 px-2 text-right">R$ 45.100,00</td>
                    <td className="py-3 px-2 text-right text-blue-600">R$ 6.765,00</td>
                    <td className="py-3 px-2 text-center"><span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-sans font-bold text-[9px]">PAGO</span></td>
                  </tr>
                  <tr className="font-mono">
                    <td className="py-3 px-2 font-sans font-bold text-slate-800">G&G Taguatinga</td>
                    <td className="py-3 px-2 text-right">R$ 32.500,00</td>
                    <td className="py-3 px-2 text-right text-blue-600">R$ 4.875,00</td>
                    <td className="py-3 px-2 text-center"><span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-sans font-bold text-[9px]">PAGO</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'novo_campeonato':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs text-slate-800">
              {editingChampId ? (
                <>
                  <h3 className="font-display font-bold text-slate-900 text-lg mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-amber-500 animate-spin-slow" />
                    Editar Campeonato: <span className="text-blue-600">{editChampTitle}</span>
                  </h3>

                  {editSuccess && (
                    <div className="bg-emerald-50 text-emerald-805 p-3 rounded-xl flex items-center gap-2 mb-4 text-xs font-semibold">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                      Campeonato atualizado com sucesso no banco de dados!
                    </div>
                  )}

                  <form onSubmit={handleUpdateChamp} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Nome do Circuito / Competição</label>
                        <input
                          type="text"
                          required
                          value={editChampTitle}
                          onChange={(e) => setEditChampTitle(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700 font-semibold"
                        />
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Regras & Descrição Oficial do Torneio</label>
                        <textarea
                          rows={3}
                          required
                          value={editChampDesc}
                          onChange={(e) => setEditChampDesc(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Data Inicial</label>
                        <input
                          type="date"
                          required
                          value={editChampStart}
                          onChange={(e) => setEditChampStart(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Data Limite / Final</label>
                        <input
                          type="date"
                          required
                          value={editChampEnd}
                          onChange={(e) => setEditChampEnd(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Taxa de Homologação (R$)</label>
                        <input
                          type="number"
                          required
                          value={editChampFee}
                          onChange={(e) => setEditChampFee(Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700 font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Quantidade Estágios (Stages)</label>
                        <input
                          type="number"
                          required
                          min={1}
                          max={10}
                          value={editChampStages}
                          onChange={(e) => setEditChampStages(Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700"
                        />
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Injetar Estágio / Modalidade Ativa</label>
                        <div className="flex flex-wrap gap-2">
                          {['IPSC Handgun Standard', 'IPSC Handgun Production', 'Carabina Mira Aberta 10m', 'Trap Americano Sênior'].map((dis, i) => {
                            const isSel = editSelectedMods.includes(dis);
                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={() => {
                                  if (isSel) {
                                    setEditSelectedMods(editSelectedMods.filter(m => m !== dis));
                                  } else {
                                    setEditSelectedMods([...editSelectedMods, dis]);
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition ${isSel ? 'bg-blue-600 border-blue-600 text-white shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-650'}`}
                              >
                                {dis}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2 sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Imagem de Capa (Banner)</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <button
                            type="button"
                            onClick={() => setEditChampImageSourceMode('gallery')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${editChampImageSourceMode === 'gallery' ? 'bg-blue-600 border-blue-600 text-white shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'}`}
                          >
                            Galeria G&G
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditChampImageSourceMode('upload')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${editChampImageSourceMode === 'upload' ? 'bg-blue-600 border-blue-600 text-white shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'}`}
                          >
                            Upload de Imagem
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditChampImageSourceMode('url')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${editChampImageSourceMode === 'url' ? 'bg-blue-600 border-blue-600 text-white shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'}`}
                          >
                            URL Externa
                          </button>
                        </div>

                        {editChampImageSourceMode === 'gallery' && (
                          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-3">
                            {GALLERY_IMAGES.map((img) => (
                              <button
                                key={img.id}
                                type="button"
                                onClick={() => setEditChampBanner(img.url)}
                                className={`relative rounded-lg overflow-hidden border-2 h-14 bg-slate-100 transition cursor-pointer ${editChampBanner === img.url ? 'border-blue-600 scale-95 shadow-xs' : 'border-transparent hover:border-slate-300'}`}
                              >
                                <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                                <span className="absolute bottom-0 inset-x-0 bg-slate-900/60 text-white text-[7px] truncate px-1 py-0.5 text-center font-semibold">
                                  {img.label}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}

                        {editChampImageSourceMode === 'upload' && (
                          <div className="mb-3">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setEditChampBanner(reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                            />
                          </div>
                        )}

                        {editChampImageSourceMode === 'url' && (
                          <input
                            type="text"
                            value={editChampBanner}
                            onChange={(e) => setEditChampBanner(e.target.value)}
                            placeholder="Ex: https://images.unsplash.com/photo-..."
                            className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700"
                          />
                        )}

                        {editChampBanner && (
                          <div className="mt-2 relative rounded-xl overflow-hidden border border-slate-200 h-28 bg-slate-50">
                            <img
                              src={editChampBanner}
                              alt="Pré-visualização do Banner"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=800&auto=format&fit=crop&q=80';
                              }}
                            />
                            <div className="absolute top-2 left-2 bg-slate-905/70 text-white text-[8px] px-1.5 py-0.5 rounded font-bold uppercase font-sans">
                              Imagem do Campeonato
                            </div>
                          </div>
                        )}
                      </div>

                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingChampId(null)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-5 py-3 rounded-xl font-bold transition cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="bg-amber-500 hover:bg-amber-600 text-white text-xs px-6 py-3 rounded-xl font-bold transition shadow-lg cursor-pointer"
                      >
                        Salvar Alterações
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  <h3 className="font-display font-bold text-slate-900 text-lg mb-4 flex items-center gap-2">
                    <PlusCircle className="w-5 h-5 text-blue-600" />
                    Configurar Novo Campeonato
                  </h3>

                  {createSuccess && (
                    <div className="bg-emerald-50 text-emerald-805 p-3 rounded-xl flex items-center gap-2 mb-4 text-xs font-semibold">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                      Campeonato anunciado com sucesso no clube G&G Competições!
                    </div>
                  )}

                  {editSuccess && (
                    <div className="bg-emerald-50 text-emerald-805 p-3 rounded-xl flex items-center gap-2 mb-4 text-xs font-semibold">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                      Campeonato atualizado com sucesso!
                    </div>
                  )}

                  <form onSubmit={handleCreateChamp} className="space-y-4 text-slate-850">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Nome do Circuito / Competição</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: II Torneio G&G de Precisão e Canos Longos"
                          value={champTitle}
                          onChange={(e) => setChampTitle(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700"
                        />
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Regras & Descrição Oficial do Torneio</label>
                        <textarea
                          rows={3}
                          required
                          placeholder="Especifique as categorias permitidas, as premiações das etapas e os critérios de desempate técnicos..."
                          value={champDesc}
                          onChange={(e) => setChampDesc(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Data Inicial</label>
                        <input
                          type="date"
                          required
                          value={champStart}
                          onChange={(e) => setChampStart(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Data Limite / Final</label>
                        <input
                          type="date"
                          required
                          value={champEnd}
                          onChange={(e) => setChampEnd(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Taxa de Homologação (R$)</label>
                        <input
                          type="number"
                          required
                          value={champFee}
                          onChange={(e) => setChampFee(Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700 font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Quantidade Estágios (Stages)</label>
                        <input
                          type="number"
                          required
                          min={1}
                          max={10}
                          value={champStages}
                          onChange={(e) => setChampStages(Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700"
                        />
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Injetar Estágio / Modalidade Ativa</label>
                        <div className="flex flex-wrap gap-2">
                          {['IPSC Handgun Standard', 'IPSC Handgun Production', 'Carabina Mira Aberta 10m', 'Trap Americano Sênior'].map((dis, i) => {
                            const isSel = selectedMods.includes(dis);
                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={() => {
                                  if (isSel) {
                                    setSelectedMods(selectedMods.filter(m => m !== dis));
                                  } else {
                                    setSelectedMods([...selectedMods, dis]);
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition ${isSel ? 'bg-blue-600 border-blue-600 text-white shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-650'}`}
                              >
                                {dis}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2 sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Imagem de Capa (Banner)</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <button
                            type="button"
                            onClick={() => setChampImageSourceMode('gallery')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${champImageSourceMode === 'gallery' ? 'bg-blue-600 border-blue-600 text-white shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'}`}
                          >
                            Galeria G&G
                          </button>
                          <button
                            type="button"
                            onClick={() => setChampImageSourceMode('upload')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${champImageSourceMode === 'upload' ? 'bg-blue-600 border-blue-600 text-white shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'}`}
                          >
                            Upload de Imagem
                          </button>
                          <button
                            type="button"
                            onClick={() => setChampImageSourceMode('url')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${champImageSourceMode === 'url' ? 'bg-blue-600 border-blue-600 text-white shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'}`}
                          >
                            URL Externa
                          </button>
                        </div>

                        {champImageSourceMode === 'gallery' && (
                          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-3">
                            {GALLERY_IMAGES.map((img) => (
                              <button
                                key={img.id}
                                type="button"
                                onClick={() => setChampBanner(img.url)}
                                className={`relative rounded-lg overflow-hidden border-2 h-14 bg-slate-100 transition cursor-pointer ${champBanner === img.url ? 'border-blue-600 scale-95 shadow-xs' : 'border-transparent hover:border-slate-300'}`}
                              >
                                <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                                <span className="absolute bottom-0 inset-x-0 bg-slate-900/60 text-white text-[7px] truncate px-1 py-0.5 text-center font-semibold">
                                  {img.label}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}

                        {champImageSourceMode === 'upload' && (
                          <div className="mb-3">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setChampBanner(reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                            />
                          </div>
                        )}

                        {champImageSourceMode === 'url' && (
                          <input
                            type="text"
                            value={champBanner}
                            onChange={(e) => setChampBanner(e.target.value)}
                            placeholder="Ex: https://images.unsplash.com/photo-..."
                            className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700"
                          />
                        )}

                        {champBanner && (
                          <div className="mt-2 relative rounded-xl overflow-hidden border border-slate-200 h-28 bg-slate-50">
                            <img
                              src={champBanner}
                              alt="Pré-visualização do Banner"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=800&auto=format&fit=crop&q=80';
                              }}
                            />
                            <div className="absolute top-2 left-2 bg-slate-905/70 text-white text-[8px] px-1.5 py-0.5 rounded font-bold uppercase font-sans">
                              Imagem do Campeonato
                            </div>
                          </div>
                        )}
                      </div>

                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-6 py-3 rounded-xl font-bold transition shadow-lg cursor-pointer"
                      >
                        Publicar Campeonato
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>

            {/* List of Championships to select for Edit */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs text-slate-800">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="font-display font-bold text-slate-900 text-base">Campeonatos Cadastrados para Edição</h3>
                  <p className="text-xs text-slate-400">Gerencie e altere dados das competições abaixo.</p>
                </div>
                <Trophy className="w-5 h-5 text-blue-600" />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-mono text-[10px] uppercase">
                      <th className="py-3 px-2">Campeonato</th>
                      <th className="py-3 px-2">Período</th>
                      <th className="py-3 px-2 text-center">Etapas</th>
                      <th className="py-3 px-2 text-right">Inscrição</th>
                      <th className="py-3 px-2 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {championships.map((champ) => (
                      <tr key={champ.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-2 flex items-center gap-3">
                          <img
                            src={champ.bannerUrl}
                            alt=""
                            className="w-12 h-8 rounded-lg object-cover border border-slate-200"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=800&auto=format&fit=crop&q=80';
                            }}
                          />
                          <div>
                            <span className="font-bold text-slate-800 block">{champ.title}</span>
                            <span className="text-[10px] text-slate-450 block truncate max-w-[200px]">{champ.description}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 font-mono text-slate-600">
                          {new Date(champ.startDate).toLocaleDateString()} - {new Date(champ.endDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-2 text-center font-bold font-mono">{champ.stagesCount}</td>
                        <td className="py-3 px-2 text-right font-bold font-mono text-slate-850">R$ {champ.registrationFee}</td>
                        <td className="py-3 px-2 text-center">
                          <button
                            onClick={() => startEditingChamp(champ)}
                            className="bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-[10px] px-3 py-1.5 rounded-xl transition inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Settings className="w-3.5 h-3.5" />
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'etapas':
        return (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <h3 className="font-display font-bold text-slate-900 text-base">Controle de Etapas do Circuito</h3>
            <p className="text-xs text-slate-500">Permite abrir e finalizar etapas ativas nos torneios oficiais do clube.</p>
            <div className="space-y-3 pt-2">
              {championships.map(c => (
                <div key={c.id} className="border border-slate-100 rounded-xl p-4 flex justify-between items-center bg-slate-50/50">
                  <div>
                    <h4 className="font-bold text-slate-805 text-xs">{c.title}</h4>
                    <span className="text-[10px] text-slate-400 font-mono">Etapa Ativa: {c.currentStage}ª Etapa</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-[10px] px-3 py-1.5 rounded transition">Avançar Etapa</button>
                    <button className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] px-3 py-1.5 rounded transition">Encerrar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'modalidades':
        return (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs text-slate-800">
            <h3 className="font-display font-bold text-slate-900 text-base">Gerenciamento de Modalidades de Tiro</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Add category mock */}
              <div className="border border-slate-100 p-4 rounded-xl bg-slate-50/50 space-y-3">
                <h4 className="font-bold text-xs">Nova Disciplina</h4>
                <div className="space-y-2">
                  <input type="text" placeholder="Nome: Ex: IPSC Rifle Open" className="w-full bg-white border border-slate-200 p-2.5 rounded-lg text-xs" />
                  <input type="text" placeholder="Categoria: Ex: Fuzil" className="w-full bg-white border border-slate-200 p-2.5 rounded-lg text-xs" />
                </div>
                <button className="w-full bg-blue-600 text-white text-xs py-2 rounded-lg font-bold">Adicionar</button>
              </div>

              {/* List */}
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {['IPSC Handgun Standard', 'IPSC Handgun Production', 'Carabina Mira Aberta 10m', 'Trap Americano'].map((m, i) => (
                  <div key={i} className="flex justify-between items-center bg-slate-100/50 p-2.5 rounded-lg text-xs font-semibold">
                    <span>{m}</span>
                    <button className="text-red-500 hover:text-red-700">Excluir</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'consulta_inscricoes':
        return (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
            <h3 className="font-display font-bold text-slate-900 text-base">Consulta Geral de Inscrições</h3>
            
            <div className="overflow-x-auto text-xs text-slate-700">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 font-mono text-[10px] text-slate-400 uppercase">
                    <th className="py-2">Atleta</th>
                    <th className="py-2">Campeonato</th>
                    <th className="py-2">Divisão / Mod</th>
                    <th className="py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {registrations.map((reg) => {
                    const athlete = users.find(u => u.id === reg.userId);
                    const champ = championships.find(c => c.id === reg.championshipId);
                    return (
                      <tr key={reg.id}>
                        <td className="py-2.5 font-bold text-slate-800">{athlete?.fullName}</td>
                        <td className="py-2.5 text-slate-500">{champ?.title}</td>
                        <td className="py-2.5 font-mono">{reg.modality}</td>
                        <td className="py-2.5 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${reg.paymentStatus === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {reg.paymentStatus === 'approved' ? 'HOMOLOGADA' : 'PENDENTE'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'cadastro_armas':
        return (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs text-slate-805">
            <h3 className="font-display font-bold text-slate-900 text-base">Controle de Acervo de Material Bélico</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-xl space-y-3">
                <h4 className="font-bold text-xs">Registrar Arma no Estande</h4>
                <div className="space-y-2">
                  <input type="text" placeholder="Espécie/Modelo: Ex: Glock G17 Gen 5" className="w-full bg-white border border-slate-200 p-2.5 rounded-lg text-xs" />
                  <input type="text" placeholder="Registro SIGMA/SINARM" className="w-full bg-white border border-slate-200 p-2.5 rounded-lg text-xs" />
                </div>
                <button className="w-full bg-blue-600 text-white text-xs py-2 rounded-lg font-bold">Salvar Arma</button>
              </div>

              {/* Weapons list */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                {[
                  { m: 'Taurus TS9 9mm', s: 'SIGMA-910293' },
                  { m: 'Glock G25 .380', s: 'SIGMA-451298' },
                  { m: 'Imbel GC .40', s: 'SIGMA-783912' }
                ].map((item, idx) => (
                  <div key={idx} className="bg-slate-100/50 p-2.5 rounded-lg text-xs flex justify-between items-center leading-tight">
                    <div>
                      <span className="font-bold text-slate-800 block">{item.m}</span>
                      <span className="text-[10px] text-slate-450 font-mono">Registro: {item.s}</span>
                    </div>
                    <button className="text-red-500 hover:text-red-700">Remover</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'municoes':
        return (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs text-slate-800">
            <h3 className="font-display font-bold text-slate-900 text-base">Controle de Estoque de Munições</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { c: '9mm Luger', qty: 4500, max: 10000, color: 'bg-blue-600' },
                { c: '.380 ACP', qty: 2800, max: 5000, color: 'bg-emerald-600' },
                { c: '.22 LR', qty: 8500, max: 15000, color: 'bg-amber-600' },
                { c: '12 GA', qty: 950, max: 2000, color: 'bg-red-500' }
              ].map((item, idx) => {
                const percent = (item.qty / item.max) * 100;
                return (
                  <div key={idx} className="border border-slate-100 p-3 rounded-xl bg-slate-50/50 space-y-2">
                    <div className="flex justify-between font-bold text-xs">
                      <span>Calibre: {item.c}</span>
                      <span className="font-mono text-slate-500">{item.qty} / {item.max}</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${item.color}`} style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'validar_treinamentos':
        return (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <h3 className="font-display font-bold text-slate-900 text-base">Validar Treinamentos de Habitualidade</h3>
            <p className="text-xs text-slate-500">Homologar passagens de treino inseridas pelos atiradores para contagem de habitualidades no Exército.</p>

            <div className="space-y-3 pt-2">
              {[
                { u: 'Guilherme Guedes', c: '9mm', s: 150, d: '15/05/2026', dp: 'IPSC Handgun' },
                { u: 'Ana Clara', c: '9mm', s: 200, d: '05/06/2026', dp: 'Precisão 25m' }
              ].map((t, idx) => (
                <div key={idx} className="border border-slate-100 rounded-xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-50/50">
                  <div className="text-xs leading-normal leading-tight">
                    <h4 className="font-bold text-slate-800">{t.u}</h4>
                    <p className="text-slate-500">Atividade: {t.dp} • Calibre: {t.c} • Tiros: {t.s}</p>
                    <span className="text-[10px] text-slate-450 font-mono">Realizado em: {t.d}</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] px-3.5 py-2 rounded-xl transition">Homologar</button>
                    <button className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] px-3.5 py-2 rounded-xl transition">Recusar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      // site, idsc, and other menus placeholders
      case 'banner_home':
        return (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <h3 className="font-display font-bold text-slate-900 text-base">Banners em Destaque da Home</h3>
            {bannerSuccess && (
              <div className="bg-emerald-50 text-emerald-805 p-3 rounded-xl flex items-center gap-2 mb-4 text-xs font-semibold">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                Banner atualizado no portal público!
              </div>
            )}
            <div className="space-y-3">
              <div className="h-32 border border-dashed border-slate-300 rounded-xl bg-slate-50 flex items-center justify-center text-xs text-slate-400">
                Selecione ou arraste a imagem do banner principal (1200 x 400px)
              </div>
              <button onClick={() => { setBannerSuccess(true); setTimeout(() => setBannerSuccess(false), 2000); }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition">Salvar Alterações</button>
            </div>
          </div>
        );

      case 'videos_destaque':
        return (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs text-slate-800">
            <h3 className="font-display font-bold text-slate-900 text-base">Vídeos em Destaque no Portal</h3>
            <div className="space-y-2">
              <input type="text" placeholder="Título do Vídeo: Ex: Melhores momentos IPSC" className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-xs" />
              <input type="text" placeholder="URL do YouTube: Ex: https://youtube.com/..." className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-xs" />
              <button className="bg-blue-600 text-white text-xs py-2 px-4 rounded-lg font-bold">Salvar Vídeo</button>
            </div>
          </div>
        );

      case 'imagem_padrao':
        return (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs text-slate-800">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-base">Configurar Imagem Padrão</h3>
                <p className="text-xs text-slate-400">Esta imagem será exibida em posts, campeonatos e outros conteúdos que não possuírem imagem ou quando o link da imagem estiver quebrado.</p>
              </div>
              <Settings className="w-5 h-5 text-blue-600 animate-spin-slow" />
            </div>

            {defaultImageSuccess && (
              <div className="bg-emerald-50 text-emerald-805 p-3 rounded-xl flex items-center gap-2 mb-4 text-xs font-semibold">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                Imagem padrão atualizada com sucesso no banco de dados!
              </div>
            )}

            <form onSubmit={handleSaveDefaultImage} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Origem da Imagem Padrão</label>
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setDefaultImageSourceMode('gallery')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${defaultImageSourceMode === 'gallery' ? 'bg-blue-600 border-blue-600 text-white shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'}`}
                  >
                    Galeria G&G
                  </button>
                  <button
                    type="button"
                    onClick={() => setDefaultImageSourceMode('upload')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${defaultImageSourceMode === 'upload' ? 'bg-blue-600 border-blue-600 text-white shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'}`}
                  >
                    Upload de Imagem
                  </button>
                  <button
                    type="button"
                    onClick={() => setDefaultImageSourceMode('url')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${defaultImageSourceMode === 'url' ? 'bg-blue-600 border-blue-600 text-white shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'}`}
                  >
                    URL Externa
                  </button>
                </div>

                {defaultImageSourceMode === 'gallery' && (
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-3">
                    {GALLERY_IMAGES.map((img) => (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => setNewDefaultImage(img.url)}
                        className={`relative rounded-lg overflow-hidden border-2 h-14 bg-slate-100 transition cursor-pointer ${newDefaultImage === img.url ? 'border-blue-600 scale-95 shadow-xs' : 'border-transparent hover:border-slate-300'}`}
                      >
                        <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                        <span className="absolute bottom-0 inset-x-0 bg-slate-900/60 text-white text-[7px] truncate px-1 py-0.5 text-center font-semibold">
                          {img.label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {defaultImageSourceMode === 'upload' && (
                  <div className="mb-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setNewDefaultImage(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                  </div>
                )}

                {defaultImageSourceMode === 'url' && (
                  <input
                    type="url"
                    value={newDefaultImage}
                    onChange={(e) => setNewDefaultImage(e.target.value)}
                    placeholder="Cole a URL direta da imagem padrão (ex: https://images.unsplash.com/...)"
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700 font-mono"
                  />
                )}
              </div>

              {newDefaultImage && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Pré-visualização</label>
                  <div className="relative h-44 bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                    <img
                      src={newDefaultImage}
                      alt="Pré-visualização da imagem padrão"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-6 py-3 rounded-xl font-bold transition shadow-lg shadow-blue-100 cursor-pointer"
                >
                  Salvar Imagem Padrão
                </button>
              </div>
            </form>
          </div>
        );


      default:
        return (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 shadow-xs">
            <Settings className="w-12 h-12 text-slate-200 mx-auto mb-2 animate-spin-slow" />
            <p className="font-medium text-sm">Seção Administrativa em Configuração</p>
            <p className="text-xs mt-1">Essa funcionalidade de gerenciamento de recursos está sendo estruturada para o seu perfil master.</p>
          </div>
        );
    }
  };

  const renderMasterContent = () => {
    switch (masterMenu) {
      case 'gerenciar_clubes':
        return (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs text-slate-800 text-left">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-base">Gerenciar Clubes Filiados</h3>
                <p className="text-xs text-slate-400">Ativação, suspensão e homologação de estandes de tiro integrados à rede G&G.</p>
              </div>
              <Landmark className="w-5 h-5 text-blue-600 animate-pulse" />
            </div>

            {/* Club List */}
            <div className="space-y-4">
              <h4 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider">Unidades e Estandes Credenciados</h4>
              
              <div className="grid grid-cols-1 gap-4">
                {masterClubs.map((club) => {
                  const isPending = club.status === 'Pendente';
                  const isSuspended = club.status === 'Suspenso';
                  return (
                    <div key={club.id} className="border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-50/50 hover:border-slate-350 transition">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">{club.name}</h4>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            club.status === 'Ativo' ? 'bg-emerald-100 text-emerald-800' :
                            club.status === 'Suspenso' ? 'bg-rose-100 text-rose-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {club.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{club.location} • Diretor: {club.president}</p>
                        <p className="text-[10px] text-slate-400 font-mono">Total de Atiradores: {club.shootersCount} federados</p>
                      </div>
                      
                      <div className="flex gap-2">
                        {isPending ? (
                          <>
                            <button
                              onClick={() => handleApproveClub(club.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10.5px] px-3.5 py-2 rounded-xl transition cursor-pointer"
                            >
                              Homologar
                            </button>
                            <button
                              onClick={() => setMasterClubs(prev => prev.filter(c => c.id !== club.id))}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10.5px] px-3.5 py-2 rounded-xl transition cursor-pointer"
                            >
                              Recusar
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleToggleClubStatus(club.id)}
                            className={`font-bold text-[10.5px] px-3.5 py-2 rounded-xl transition cursor-pointer ${
                              isSuspended ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700' : 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                            }`}
                          >
                            {isSuspended ? 'Reativar Estande' : 'Suspender Estande'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 'gestao_cobrancas':
        return (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs text-slate-800 text-left">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-base">Gestão de Cobranças & Faturamento</h3>
                <p className="text-xs text-slate-400">Controle financeiro de royalties de franquias e anuidades de assinaturas.</p>
              </div>
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>

            {billingSuccessMsg && (
              <div className="bg-emerald-50 text-emerald-805 p-3 rounded-xl flex items-center gap-2 text-xs font-semibold">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                {billingSuccessMsg}
              </div>
            )}

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block uppercase font-sans font-bold">Faturamento Master</span>
                <span className="text-lg font-bold text-slate-900 font-mono">R$ 11.640,00</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block uppercase font-sans font-bold">Pendências em Aberto</span>
                <span className="text-lg font-bold text-amber-600 font-mono">R$ 9.615,00</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block uppercase font-sans font-bold">Taxa Adimplência</span>
                <span className="text-lg font-bold text-emerald-600 font-mono">92.4%</span>
              </div>
            </div>

            {/* Billing List */}
            <div className="space-y-3">
              <h4 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider">Faturas & Títulos a Receber</h4>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] text-slate-450 uppercase font-mono">
                      <th className="py-2.5 px-2">Devedor</th>
                      <th className="py-2.5 px-2">Tipo Cobrança</th>
                      <th className="py-2.5 px-2 text-right">Valor</th>
                      <th className="py-2.5 px-2">Vencimento</th>
                      <th className="py-2.5 px-2 text-center">Status</th>
                      <th className="py-2.5 px-2 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {billingList.map((bill) => {
                      const isPending = bill.status === 'Pendente';
                      return (
                        <tr key={bill.id} className="hover:bg-slate-50/30 transition">
                          <td className="py-3 px-2 font-bold text-slate-800">{bill.target}</td>
                          <td className="py-3 px-2 text-slate-500">{bill.type}</td>
                          <td className="py-3 px-2 text-right font-mono font-bold text-slate-900">R$ {bill.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="py-3 px-2 font-mono text-slate-500">{new Date(bill.dueDate).toLocaleDateString('pt-BR')}</td>
                          <td className="py-3 px-2 text-center">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                              isPending ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {bill.status}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            {isPending ? (
                              <button
                                onClick={() => handleSendBillingReminder(bill.id)}
                                className="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white font-bold text-[9px] px-2 py-1 rounded transition cursor-pointer"
                              >
                                Notificar
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="py-6 space-y-6">
      
      {/* Admin Title info block */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-950 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-15">
          <Trophy className="w-48 h-48 text-white -mr-10 -mt-10" />
        </div>
        <div className="space-y-1 relative text-left">
          <div className="flex items-center gap-2">
            <span className="bg-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">Painel Diretor</span>
            <span className="text-amber-400 text-xs font-semibold flex items-center gap-1 font-mono">
              ★ Diretoria G&G Competições
            </span>
          </div>
          <h2 className="font-display font-bold text-xl">Diretoria Fiscal & Plataforma Nacional</h2>
          <p className="text-[11px] text-slate-300">Controle integrado de filiados, termos de segurança, anuidades e divisões de IPSC/IDSC.</p>
        </div>

        <button
          onClick={onToggleAdminDemo}
          className="bg-white/10 hover:bg-white/20 text-white text-xs px-4 py-2.5 rounded-xl font-bold transition relative self-start sm:self-center cursor-pointer"
        >
          Desativar Admin
        </button>
      </div>

      {/* Main Tabs Selection (Top navigation) */}
      <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setMainTab('clube')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-lg transition duration-200 cursor-pointer ${mainTab === 'clube' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-655 hover:text-slate-900'}`}
        >
          Gerenciamento Clube
        </button>
        <button
          onClick={() => setMainTab('plataforma')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-lg transition duration-200 cursor-pointer ${mainTab === 'plataforma' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-655 hover:text-slate-900'}`}
        >
          Gerenciamento Plataforma
        </button>
        <button
          onClick={() => setMainTab('master')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-lg transition duration-200 cursor-pointer ${mainTab === 'master' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-655 hover:text-slate-900'}`}
        >
          Administrador master
        </button>
      </div>

      {/* Main Layout Area */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
        
        {/* Sidebar Nav Area */}
        <div className="md:col-span-1 bg-white rounded-2xl border border-slate-200 p-4 space-y-1 shadow-xs">
          
          {mainTab === 'clube' && (
            /* ==================================================== */
            /* CLUBE SIDEBAR MENUS                                  */
            /* ==================================================== */
            <div className="space-y-1 text-left">
              <h4 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider px-3 mb-2">Menus Clube</h4>
              {[
                { id: 'campeonatos', label: 'Campeonatos', icon: Trophy },
                { id: 'multi_championships', label: 'Multi-Campeonatos', icon: Layers },
                { id: 'resultados', label: 'Resultados', icon: Target },
                { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
                { id: 'cadastrar_resultados', label: 'Cadastrar Resultados', icon: PlusCircle },
                { id: 'certificados', label: 'Certificados', icon: Award },
                { id: 'cadastrar_membros', label: 'Cadastrar Membros', icon: UserPlus },
                { id: 'cessao_armas', label: 'Cessão de Armas', icon: FileSignature },
                { id: 'relatorios_declaracoes', label: 'Relatórios e Declarações', icon: FileText }
              ].map((item) => {
                const Icon = item.icon;
                const active = clubeMenu === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setClubeMenu(item.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition duration-150 cursor-pointer ${active ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600' : 'text-slate-650 hover:bg-slate-50'}`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {mainTab === 'plataforma' && (
            /* ==================================================== */
            /* PLATAFORMA SIDEBAR COLLAPSIBLE ACCORDIONS            */
            /* ==================================================== */
            <div className="space-y-3 text-left">
              <h4 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider px-3 mb-1">Estrutura Plataforma</h4>
              
              {/* 1. Section: Clubes */}
              <div className="space-y-1">
                <button
                  onClick={() => toggleSection('clubes')}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-450 hover:text-slate-700 cursor-pointer"
                >
                  <span>Clubes</span>
                  {expandedSections.clubes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {expandedSections.clubes && (
                  <div className="pl-3 border-l border-slate-100 space-y-0.5 mt-1">
                    <button onClick={() => setPlataformaMenu('novo_clube')} className={`w-full text-left px-3 py-2 rounded text-[11px] font-semibold transition ${plataformaMenu === 'novo_clube' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-650 hover:bg-slate-50'}`}>Novo Clube</button>
                    <button onClick={() => setPlataformaMenu('relatorio_financeiro')} className={`w-full text-left px-3 py-2 rounded text-[11px] font-semibold transition ${plataformaMenu === 'relatorio_financeiro' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-650 hover:bg-slate-50'}`}>Relatorio Financeiro</button>
                  </div>
                )}
              </div>

              {/* 2. Section: Campeonatos */}
              <div className="space-y-1">
                <button
                  onClick={() => toggleSection('campeonatos')}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-450 hover:text-slate-700 cursor-pointer"
                >
                  <span>Campeonatos</span>
                  {expandedSections.campeonatos ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {expandedSections.campeonatos && (
                  <div className="pl-3 border-l border-slate-100 space-y-0.5 mt-1">
                    <button onClick={() => setPlataformaMenu('novo_campeonato')} className={`w-full text-left px-3 py-2 rounded text-[11px] font-semibold transition ${plataformaMenu === 'novo_campeonato' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-650 hover:bg-slate-50'}`}>Novo Campeonato</button>
                    <button onClick={() => setPlataformaMenu('etapas')} className={`w-full text-left px-3 py-2 rounded text-[11px] font-semibold transition ${plataformaMenu === 'etapas' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-650 hover:bg-slate-50'}`}>Etapas</button>
                    <button onClick={() => setPlataformaMenu('modalidades')} className={`w-full text-left px-3 py-2 rounded text-[11px] font-semibold transition ${plataformaMenu === 'modalidades' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-650 hover:bg-slate-50'}`}>Modalidades</button>
                    <button onClick={() => setPlataformaMenu('cadastrar_resultados')} className={`w-full text-left px-3 py-2 rounded text-[11px] font-semibold transition ${plataformaMenu === 'cadastrar_resultados' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-650 hover:bg-slate-50'}`}>Cadastrar Resultados</button>
                    <button onClick={() => setPlataformaMenu('multi_campeonatos')} className={`w-full text-left px-3 py-2 rounded text-[11px] font-semibold transition ${plataformaMenu === 'multi_campeonatos' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-650 hover:bg-slate-50'}`}>Multi-campeonatos</button>
                    <button onClick={() => setPlataformaMenu('equipes_interclubes')} className={`w-full text-left px-3 py-2 rounded text-[11px] font-semibold transition ${plataformaMenu === 'equipes_interclubes' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-650 hover:bg-slate-50'}`}>Equipes Interclubes</button>
                  </div>
                )}
              </div>

              {/* 3. Section: ADM */}
              <div className="space-y-1">
                <button
                  onClick={() => toggleSection('adm')}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-450 hover:text-slate-700 cursor-pointer"
                >
                  <span>ADM</span>
                  {expandedSections.adm ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {expandedSections.adm && (
                  <div className="pl-3 border-l border-slate-100 space-y-0.5 mt-1">
                    <button onClick={() => setPlataformaMenu('cadastro_armas')} className={`w-full text-left px-3 py-2 rounded text-[11px] font-semibold transition ${plataformaMenu === 'cadastro_armas' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-650 hover:bg-slate-50'}`}>Cadastro de armas</button>
                    <button onClick={() => setPlataformaMenu('municoes')} className={`w-full text-left px-3 py-2 rounded text-[11px] font-semibold transition ${plataformaMenu === 'municoes' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-655'}`}>Munições</button>
                    <button onClick={() => setPlataformaMenu('filtro_resultados')} className={`w-full text-left px-3 py-2 rounded text-[11px] font-semibold transition ${plataformaMenu === 'filtro_resultados' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-650 hover:bg-slate-50'}`}>Filtro Resultados</button>
                    <button onClick={() => setPlataformaMenu('consulta_inscricoes')} className={`w-full text-left px-3 py-2 rounded text-[11px] font-semibold transition ${plataformaMenu === 'consulta_inscricoes' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-650 hover:bg-slate-50'}`}>Consulta Inscrições</button>
                    <button onClick={() => setPlataformaMenu('relatorios_declaracoes')} className={`w-full text-left px-3 py-2 rounded text-[11px] font-semibold transition ${plataformaMenu === 'relatorios_declaracoes' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-650 hover:bg-slate-50'}`}>Relatórios e declarações</button>
                    <button onClick={() => setPlataformaMenu('treinamentos_competicoes')} className={`w-full text-left px-3 py-2 rounded text-[11px] font-semibold transition ${plataformaMenu === 'treinamentos_competicoes' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-655'}`}>Treinamento/competições</button>
                    <button onClick={() => setPlataformaMenu('validar_treinamentos')} className={`w-full text-left px-3 py-2 rounded text-[11px] font-semibold transition ${plataformaMenu === 'validar_treinamentos' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-650 hover:bg-slate-50'}`}>Validar treinamentos</button>
                  </div>
                )}
              </div>

              {/* 4. Section: IDSC */}
              <div className="space-y-1">
                <button
                  onClick={() => toggleSection('idsc')}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-450 hover:text-slate-700 cursor-pointer"
                >
                  <span>IDSC</span>
                  {expandedSections.idsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {expandedSections.idsc && (
                  <div className="pl-3 border-l border-slate-100 space-y-0.5 mt-1">
                    <button onClick={() => setPlataformaMenu('idsc_campeonatos')} className={`w-full text-left px-3 py-2 rounded text-[11px] font-semibold transition ${plataformaMenu === 'idsc_campeonatos' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-650 hover:bg-slate-50'}`}>Campeonatos</button>
                    <button onClick={() => setPlataformaMenu('idsc_etapas')} className={`w-full text-left px-3 py-2 rounded text-[11px] font-semibold transition ${plataformaMenu === 'idsc_etapas' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-650 hover:bg-slate-50'}`}>Etapas</button>
                    <button onClick={() => setPlataformaMenu('idsc_inscricao')} className={`w-full text-left px-3 py-2 rounded text-[11px] font-semibold transition ${plataformaMenu === 'idsc_inscricao' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-650 hover:bg-slate-50'}`}>Inscrição</button>
                    <button onClick={() => setPlataformaMenu('idsc_resultados')} className={`w-full text-left px-3 py-2 rounded text-[11px] font-semibold transition ${plataformaMenu === 'idsc_resultados' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-655'}`}>Resultados</button>
                  </div>
                )}
              </div>

              {/* 5. Section: Site */}
              <div className="space-y-1">
                <button
                  onClick={() => toggleSection('site')}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-450 hover:text-slate-700 cursor-pointer"
                >
                  <span>Site</span>
                  {expandedSections.site ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {expandedSections.site && (
                  <div className="pl-3 border-l border-slate-100 space-y-0.5 mt-1">
                    <button onClick={() => setPlataformaMenu('banner_home')} className={`w-full text-left px-3 py-2 rounded text-[11px] font-semibold transition ${plataformaMenu === 'banner_home' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-650 hover:bg-slate-50'}`}>Banner Home</button>
                    <button onClick={() => setPlataformaMenu('banners_paginas')} className={`w-full text-left px-3 py-2 rounded text-[11px] font-semibold transition ${plataformaMenu === 'banners_paginas' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-650 hover:bg-slate-50'}`}>Banners Paginas</button>
                    <button onClick={() => setPlataformaMenu('patrocinadores')} className={`w-full text-left px-3 py-2 rounded text-[11px] font-semibold transition ${plataformaMenu === 'patrocinadores' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-650 hover:bg-slate-50'}`}>Patrocinadores</button>
                    <button onClick={() => setPlataformaMenu('videos_destaque')} className={`w-full text-left px-3 py-2 rounded text-[11px] font-semibold transition ${plataformaMenu === 'videos_destaque' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-650 hover:bg-slate-50'}`}>Vídeos Destaque</button>
                    <button onClick={() => setPlataformaMenu('imagem_padrao')} className={`w-full text-left px-3 py-2 rounded text-[11px] font-semibold transition ${plataformaMenu === 'imagem_padrao' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-650 hover:bg-slate-50'}`}>Imagem padrão</button>
                  </div>
                )}
              </div>

            </div>
          )}

          {mainTab === 'master' && (
            /* ==================================================== */
            /* MASTER SIDEBAR MENUS                                 */
            /* ==================================================== */
            <div className="space-y-1 text-left">
              <h4 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider px-3 mb-2">Menus Master</h4>
              {[
                { id: 'gerenciar_clubes', label: 'Gerenciar Clubes', icon: Landmark },
                { id: 'gestao_cobrancas', label: 'Gestão de Cobranças', icon: CreditCard }
              ].map((item) => {
                const Icon = item.icon;
                const active = masterMenu === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setMasterMenu(item.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition duration-150 cursor-pointer ${active ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600' : 'text-slate-655 hover:bg-slate-50'}`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}

        </div>

        {/* Dynamic content viewport column */}
        <div className="md:col-span-3 space-y-6">
          {mainTab === 'clube' && renderClubeContent()}
          {mainTab === 'plataforma' && renderPlataformaContent()}
          {mainTab === 'master' && renderMasterContent()}
        </div>

      </div>

    </div>
  );
}
