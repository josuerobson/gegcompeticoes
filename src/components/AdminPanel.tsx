import React, { useState, useEffect } from 'react';
import { Championship, ChampionshipInput, Registration, User, StageScore, Stage, StageInput, Weapon, WeaponLookupOption, Modality, Club, Post, MultiChampionship, HomeBanner, AmmoCaliberStock, AmmoInvoice, AmmoProduction, AmmoRecycled, AmmoAthleteAllocation, AmmoAthleteBalance, TrainingSession } from '../types';
import { CompetitionResultsViewer } from './CompetitionResultsViewer';
import { ClubTemplatesManager } from './ClubTemplatesManager';
import { ClubCertificatesViewer } from './ClubCertificatesViewer';
import { SicoobPixManager } from './SicoobPixManager';
import { 
  ShieldAlert, PlusCircle, Award, Target, Save, CheckCircle, Calendar, Trophy, AlertCircle, Sparkles,
  DollarSign, CreditCard, FileText, Users, Disc, Globe, Activity, ChevronDown, ChevronUp, Printer,
  UserPlus, FileCheck, Layers, Landmark, Briefcase, FileSignature, Database, Settings, ShieldCheck,
  Eye, Check, Trash2, Search, X, Pencil, ArrowLeft, RotateCcw, Package, Loader2, Plus
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
  stages: Stage[];
  users: User[];
  posts?: Post[];
  weapons: Weapon[];
  weaponLookupOptions: WeaponLookupOption[];
  modalities: Modality[];
  onRefreshData?: () => Promise<void>;
  onAddWeapon: (weapon: { ownerId?: string; manufacturer: string; model: string; caliber: string; weaponNumber?: string; sigmaNumber?: string; weaponClass?: string; permissionStatus?: string; registrySystem?: string }) => Promise<void>;
  onRemoveWeapon: (weaponId: string) => Promise<void>;
  onUpdateWeapon: (weaponId: string, updates: { manufacturer?: string; model?: string; caliber?: string; weaponNumber?: string; sigmaNumber?: string; weaponClass?: string; permissionStatus?: string; registrySystem?: string }) => Promise<{ error?: string }>;
  onAddWeaponLookup: (kind: string, label: string) => Promise<{ error?: string }>;
  onUpdateWeaponLookup: (id: string, label: string) => Promise<{ error?: string }>;
  onRemoveWeaponLookup: (id: string) => Promise<{ error?: string }>;
  onAddModality: (modality: { name: string; seriesCount?: number; shotsPerSeries?: number; timePerSeriesMinutes?: number; evaluationType?: string }) => Promise<void>;
  onRemoveModality: (modalityId: string) => Promise<void>;
  onCreateChampionship: (data: ChampionshipInput) => Promise<{ championship?: Championship; error?: string }>;
  onUpdateChampionship?: (id: string, data: ChampionshipInput) => Promise<{ championship?: Championship; error?: string }>;
  onRemoveChampionship: (id: string) => Promise<void>;
  onUploadChampionshipDocument: (championshipId: string, kind: string, file: File) => Promise<boolean>;
  onAddStage: (data: StageInput) => Promise<{ stage?: Stage; error?: string }>;
  onUpdateStage: (id: string, data: StageInput) => Promise<{ stage?: Stage; error?: string }>;
  onRemoveStage: (stageId: string) => Promise<{ error?: string }>;
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
  onCreateMember: (fields: { fullName: string; cpf: string; email: string; password: string }) => Promise<{ user?: User; error?: string }>;
  onUpdateMemberProfile: (memberId: string, fields: Record<string, unknown>) => Promise<boolean>;
  onUploadMemberDocument: (memberId: string, kind: string, file: File) => Promise<boolean>;
  clubs: Club[];
  onCreateClub: (fields: { name: string; cnpj: string; responsibleName: string; email: string; password: string; phone?: string; crNumber?: string; city?: string; state?: string; cep?: string; address?: string; addressNumber?: string; complement?: string; neighborhood?: string }) => Promise<{ club?: Club; error?: string }>;
  onUpdateClub?: (clubId: string, fields: Record<string, unknown>) => Promise<boolean>;
  multiChampionships?: MultiChampionship[];
}

// Labeled input matching this panel's existing form style (see the
// decorative cadastrar_membros/cadastro_armas inputs this mirrors).
function MemberField({ label, value, onChange, type = 'text', placeholder }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-slate-500 uppercase block">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700"
      />
    </div>
  );
}

function MemberSelect({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-slate-500 uppercase block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700"
      >
        <option value="">Selecione...</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}


// A section of the member's profile that saves independently — the director
// fills in whatever part they have on hand and comes back later for the rest,
// same progressive pattern as the athlete's own "Meu Cadastro".
function MemberSection({ title, children, onSave, saving, saved }: {
  title: string;
  children: React.ReactNode;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}) {
  return (
    <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-xl space-y-3">
      <h4 className="font-bold text-xs text-slate-700">{title}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {children}
      </div>
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold px-4 py-2 rounded-lg transition cursor-pointer"
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
        {saved && (
          <span className="text-emerald-600 text-[11px] font-bold flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> Salvo
          </span>
        )}
      </div>
    </div>
  );
}

// Labeled file input for the member document-completion section.
function MemberFileField({ label, onUpload }: { label: string; onUpload: (file: File) => Promise<void> }) {
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-slate-500 uppercase block">{label}</label>
      <input
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        disabled={uploading}
        onChange={async (e) => {
          const file = e.target.files?.[0] || null;
          if (!file) return;
          if (file.size > 1024 * 1024) {
            setError('Arquivo maior que 1MB.');
            e.target.value = '';
            return;
          }
          setError('');
          setUploading(true);
          await onUpload(file);
          setFileName(file.name);
          setUploading(false);
          e.target.value = '';
        }}
        className="w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
      />
      {error ? (
        <p className="text-[10px] text-red-500 mt-1">{error}</p>
      ) : uploading ? (
        <p className="text-[10px] text-slate-400 mt-1">Enviando...</p>
      ) : fileName ? (
        <p className="text-[10px] text-emerald-600 mt-1">Enviado: {fileName}</p>
      ) : null}
    </div>
  );
}

// Cadastro completo de campeonato — every field beyond the "quick create" basics
// (title/description/dates/fee/modalities/stagesCount/banner), shared by both the
// create and edit forms so the ~40 fields aren't declared/rendered twice.
interface ChampExtraState {
  type: 'individual' | 'clube';
  valorX: string;
  valorInscricaoClube: string;
  valorInscricaoIndividual: string;
  percentualClube: string;
  valorReinscricao: string;
  tipoPix: string;
  chavePix: string;
  nomeExibidoPix: string;
  whatsappComprovante: string;
  formatoPagamento: string;
  limiteEquipesClube: string;
  qtdAtletasPorEquipe: string;
  formatoInsercao: string;
  alcanceCampeonato: string;
  nivelCampeonato: string;
  percentualTributos: string;
  percentualOrganizacao: string;
  percentualClubes: string;
  percentualPremiacaoAtleta: string;
  percentualPremiacaoClube: string;
  percentualPremiacaoTodasEtapas: string;
  premiacaoAdicionalTodasEtapas: string;
  qtdEtapasConsideradas: string;
  qtdPioresDescartar: string;
  qtdMelhoresDescartar: string;
  percentualPos1TodasEtapas: string;
  percentualPos2TodasEtapas: string;
  percentualPos3TodasEtapas: string;
  percentualPos4TodasEtapas: string;
  percentualPos5TodasEtapas: string;
  percentualOuro: string;
  percentualPrata: string;
  percentualBronze: string;
  percentualPos1Medalha: string;
  percentualPos2Medalha: string;
  percentualPos3Medalha: string;
  percentualPos4Medalha: string;
  percentualPos5Medalha: string;
  pontuacaoMinimaAtletaOuro: string;
  pontuacaoMinimaAtletaPrata: string;
  pontuacaoMinimaAtletaBronze: string;
  pontuacaoMinimaEquipeOuro: string;
  pontuacaoMinimaEquipePrata: string;
  pontuacaoMinimaEquipeBronze: string;
  ordemExibicao: string;
  abertoOutrosClubes: 'sim' | 'nao';
}

const DEFAULT_CHAMP_EXTRA: ChampExtraState = {
  type: 'individual', valorX: '', valorInscricaoClube: '', valorInscricaoIndividual: '', percentualClube: '',
  valorReinscricao: '', tipoPix: '', chavePix: '', nomeExibidoPix: '', whatsappComprovante: '',
  formatoPagamento: '', limiteEquipesClube: '', qtdAtletasPorEquipe: '', formatoInsercao: '',
  alcanceCampeonato: '', nivelCampeonato: '', percentualTributos: '', percentualOrganizacao: '',
  percentualClubes: '', percentualPremiacaoAtleta: '', percentualPremiacaoClube: '',
  percentualPremiacaoTodasEtapas: '', premiacaoAdicionalTodasEtapas: '', qtdEtapasConsideradas: '',
  qtdPioresDescartar: '', qtdMelhoresDescartar: '', percentualPos1TodasEtapas: '', percentualPos2TodasEtapas: '',
  percentualPos3TodasEtapas: '', percentualPos4TodasEtapas: '', percentualPos5TodasEtapas: '',
  percentualOuro: '', percentualPrata: '', percentualBronze: '', percentualPos1Medalha: '', percentualPos2Medalha: '',
  percentualPos3Medalha: '', percentualPos4Medalha: '', percentualPos5Medalha: '',
  pontuacaoMinimaAtletaOuro: '', pontuacaoMinimaAtletaPrata: '', pontuacaoMinimaAtletaBronze: '',
  pontuacaoMinimaEquipeOuro: '', pontuacaoMinimaEquipePrata: '', pontuacaoMinimaEquipeBronze: '',
  ordemExibicao: '', abertoOutrosClubes: 'sim'
};

function championshipToExtraState(c: Championship): ChampExtraState {
  const n = (v?: number) => (v === undefined || v === null ? '' : String(v));
  return {
    type: c.type,
    valorX: n(c.valorX),
    valorInscricaoClube: n(c.valorInscricaoClube),
    valorInscricaoIndividual: n(c.valorInscricaoIndividual),
    percentualClube: n(c.percentualClube),
    valorReinscricao: n(c.valorReinscricao),
    tipoPix: c.tipoPix || '',
    chavePix: c.chavePix || '',
    nomeExibidoPix: c.nomeExibidoPix || '',
    whatsappComprovante: c.whatsappComprovante || '',
    formatoPagamento: c.formatoPagamento || '',
    limiteEquipesClube: n(c.limiteEquipesClube),
    qtdAtletasPorEquipe: n(c.qtdAtletasPorEquipe),
    formatoInsercao: c.formatoInsercao || '',
    alcanceCampeonato: c.alcanceCampeonato || '',
    nivelCampeonato: n(c.nivelCampeonato),
    percentualTributos: n(c.percentualTributos),
    percentualOrganizacao: n(c.percentualOrganizacao),
    percentualClubes: n(c.percentualClubes),
    percentualPremiacaoAtleta: n(c.percentualPremiacaoAtleta),
    percentualPremiacaoClube: n(c.percentualPremiacaoClube),
    percentualPremiacaoTodasEtapas: n(c.percentualPremiacaoTodasEtapas),
    premiacaoAdicionalTodasEtapas: n(c.premiacaoAdicionalTodasEtapas),
    qtdEtapasConsideradas: n(c.qtdEtapasConsideradas),
    qtdPioresDescartar: n(c.qtdPioresDescartar),
    qtdMelhoresDescartar: n(c.qtdMelhoresDescartar),
    percentualPos1TodasEtapas: n(c.percentualPos1TodasEtapas),
    percentualPos2TodasEtapas: n(c.percentualPos2TodasEtapas),
    percentualPos3TodasEtapas: n(c.percentualPos3TodasEtapas),
    percentualPos4TodasEtapas: n(c.percentualPos4TodasEtapas),
    percentualPos5TodasEtapas: n(c.percentualPos5TodasEtapas),
    percentualOuro: n(c.percentualOuro),
    percentualPrata: n(c.percentualPrata),
    percentualBronze: n(c.percentualBronze),
    percentualPos1Medalha: n(c.percentualPos1Medalha),
    percentualPos2Medalha: n(c.percentualPos2Medalha),
    percentualPos3Medalha: n(c.percentualPos3Medalha),
    percentualPos4Medalha: n(c.percentualPos4Medalha),
    percentualPos5Medalha: n(c.percentualPos5Medalha),
    pontuacaoMinimaAtletaOuro: n(c.pontuacaoMinimaAtletaOuro),
    pontuacaoMinimaAtletaPrata: n(c.pontuacaoMinimaAtletaPrata),
    pontuacaoMinimaAtletaBronze: n(c.pontuacaoMinimaAtletaBronze),
    pontuacaoMinimaEquipeOuro: n(c.pontuacaoMinimaEquipeOuro),
    pontuacaoMinimaEquipePrata: n(c.pontuacaoMinimaEquipePrata),
    pontuacaoMinimaEquipeBronze: n(c.pontuacaoMinimaEquipeBronze),
    ordemExibicao: n(c.ordemExibicao),
    abertoOutrosClubes: c.abertoOutrosClubes || 'sim',
  };
}

function extraStateToPayload(e: ChampExtraState): Partial<ChampionshipInput> {
  const num = (v: string) => (v === '' ? undefined : Number(v));
  return {
    type: e.type,
    valorX: num(e.valorX),
    valorInscricaoClube: num(e.valorInscricaoClube),
    valorInscricaoIndividual: num(e.valorInscricaoIndividual),
    percentualClube: num(e.percentualClube),
    valorReinscricao: num(e.valorReinscricao),
    tipoPix: e.tipoPix || undefined,
    chavePix: e.chavePix || undefined,
    nomeExibidoPix: e.nomeExibidoPix || undefined,
    whatsappComprovante: e.whatsappComprovante || undefined,
    formatoPagamento: (e.formatoPagamento || undefined) as ChampionshipInput['formatoPagamento'],
    limiteEquipesClube: num(e.limiteEquipesClube),
    qtdAtletasPorEquipe: num(e.qtdAtletasPorEquipe),
    formatoInsercao: (e.formatoInsercao || undefined) as ChampionshipInput['formatoInsercao'],
    alcanceCampeonato: (e.alcanceCampeonato || undefined) as ChampionshipInput['alcanceCampeonato'],
    nivelCampeonato: num(e.nivelCampeonato),
    percentualTributos: num(e.percentualTributos),
    percentualOrganizacao: num(e.percentualOrganizacao),
    percentualClubes: num(e.percentualClubes),
    percentualPremiacaoAtleta: num(e.percentualPremiacaoAtleta),
    percentualPremiacaoClube: num(e.percentualPremiacaoClube),
    percentualPremiacaoTodasEtapas: num(e.percentualPremiacaoTodasEtapas),
    premiacaoAdicionalTodasEtapas: num(e.premiacaoAdicionalTodasEtapas),
    qtdEtapasConsideradas: num(e.qtdEtapasConsideradas),
    qtdPioresDescartar: num(e.qtdPioresDescartar),
    qtdMelhoresDescartar: num(e.qtdMelhoresDescartar),
    percentualPos1TodasEtapas: num(e.percentualPos1TodasEtapas),
    percentualPos2TodasEtapas: num(e.percentualPos2TodasEtapas),
    percentualPos3TodasEtapas: num(e.percentualPos3TodasEtapas),
    percentualPos4TodasEtapas: num(e.percentualPos4TodasEtapas),
    percentualPos5TodasEtapas: num(e.percentualPos5TodasEtapas),
    percentualOuro: num(e.percentualOuro),
    percentualPrata: num(e.percentualPrata),
    percentualBronze: num(e.percentualBronze),
    percentualPos1Medalha: num(e.percentualPos1Medalha),
    percentualPos2Medalha: num(e.percentualPos2Medalha),
    percentualPos3Medalha: num(e.percentualPos3Medalha),
    percentualPos4Medalha: num(e.percentualPos4Medalha),
    percentualPos5Medalha: num(e.percentualPos5Medalha),
    pontuacaoMinimaAtletaOuro: num(e.pontuacaoMinimaAtletaOuro),
    pontuacaoMinimaAtletaPrata: num(e.pontuacaoMinimaAtletaPrata),
    pontuacaoMinimaAtletaBronze: num(e.pontuacaoMinimaAtletaBronze),
    pontuacaoMinimaEquipeOuro: num(e.pontuacaoMinimaEquipeOuro),
    pontuacaoMinimaEquipePrata: num(e.pontuacaoMinimaEquipePrata),
    pontuacaoMinimaEquipeBronze: num(e.pontuacaoMinimaEquipeBronze),
    ordemExibicao: num(e.ordemExibicao),
    abertoOutrosClubes: e.abertoOutrosClubes,
  };
}

// Small helper for the percentage-group subtotal hints (e.g. "100% ✓" / "92% (falta 8%)").
function PercentSumHint({ label, values }: { label: string; values: string[] }) {
  const total = values.reduce((sum, v) => sum + (v === '' ? 0 : Number(v)), 0);
  const hasAny = values.some(v => v !== '');
  if (!hasAny) return null;
  const isComplete = Math.abs(total - 100) < 0.01;
  return (
    <p className={`text-[10px] font-bold sm:col-span-2 ${isComplete ? 'text-emerald-600' : 'text-amber-600'}`}>
      {label}: {total}% {isComplete ? '✓' : `(deveria somar 100%)`}
    </p>
  );
}

function ChampField({ label, value, onChange, type = 'text', placeholder }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-slate-500 uppercase block">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl focus:border-blue-500 text-xs text-slate-700"
      />
    </div>
  );
}

function ChampSelect({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-slate-500 uppercase block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl focus:border-blue-500 text-xs text-slate-700"
      >
        <option value="">Selecione...</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function ChampExtraFields({ values, onChange }: { values: ChampExtraState; onChange: (patch: Partial<ChampExtraState>) => void }) {
  return (
    <>
      <div className="sm:col-span-2 pt-2 border-t border-slate-100">
        <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Valores de Inscrição por Modalidade</h4>
      </div>
      <ChampField label="Valor Inscrição Clube (R$)" type="number" value={values.valorInscricaoClube} onChange={v => onChange({ valorInscricaoClube: v })} />
      <ChampField label="Valor Inscrição Individual (R$)" type="number" value={values.valorInscricaoIndividual} onChange={v => onChange({ valorInscricaoIndividual: v })} />
      <ChampField label="Percentual Clube (%)" type="number" value={values.percentualClube} onChange={v => onChange({ percentualClube: v })} />
      <ChampField label="Valor Re-inscrição (R$)" type="number" value={values.valorReinscricao} onChange={v => onChange({ valorReinscricao: v })} placeholder="Cobrado quando o atleta se inscreve de novo na mesma etapa/modalidade" />

      <div className="sm:col-span-2 pt-2 border-t border-slate-100">
        <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Dados para Pagamento</h4>
      </div>
      <ChampSelect label="Tipo de PIX" value={values.tipoPix} onChange={v => onChange({ tipoPix: v })} options={[
        { value: 'celular', label: 'Celular' }, { value: 'cpf', label: 'CPF' }, { value: 'cnpj', label: 'CNPJ' }, { value: 'aleatoria', label: 'Chave Aleatória' }
      ]} />
      <ChampField label="Chave PIX" value={values.chavePix} onChange={v => onChange({ chavePix: v })} />
      <ChampField label="Nome Exibido" value={values.nomeExibidoPix} onChange={v => onChange({ nomeExibidoPix: v })} />
      <ChampField label="Whatsapp Comprovante (ddd+número)" value={values.whatsappComprovante} onChange={v => onChange({ whatsappComprovante: v })} placeholder="Ex: 61991234567" />

      <div className="sm:col-span-2 pt-2 border-t border-slate-100">
        <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Tipo de Campeonato</h4>
      </div>
      <ChampSelect label="Tipo de campeonato" value={values.type} onChange={v => onChange({ type: (v || 'individual') as 'individual' | 'clube' })} options={[
        { value: 'clube', label: 'Clubes' }, { value: 'individual', label: 'Individual' }
      ]} />
      <ChampSelect label="Formato de pagamento" value={values.formatoPagamento} onChange={v => onChange({ formatoPagamento: v })} options={[
        { value: 'campeonato', label: 'Pagamento para o campeonato' }, { value: 'etapa', label: 'Pagamento por etapa' }
      ]} />
      {values.type === 'clube' && (
        <>
          <ChampField label="Limite de equipes por clube" type="number" value={values.limiteEquipesClube} onChange={v => onChange({ limiteEquipesClube: v })} />
          <ChampField label="Quantidade de atletas por equipe" type="number" value={values.qtdAtletasPorEquipe} onChange={v => onChange({ qtdAtletasPorEquipe: v })} />
        </>
      )}
      <ChampSelect label="Formato de Inscrição" value={values.formatoInsercao} onChange={v => onChange({ formatoInsercao: v })} options={[
        { value: 'por_etapa', label: 'Inscrição por etapa' }, { value: 'todas_etapas', label: 'Inscrição para todas as etapas' }
      ]} />
      <ChampSelect label="Alcance do campeonato" value={values.alcanceCampeonato} onChange={v => onChange({ alcanceCampeonato: v })} options={[
        { value: 'local_distrital', label: 'Local/Distrital' }, { value: 'regional', label: 'Regional' }, { value: 'estadual', label: 'Estadual' }, { value: 'nacional', label: 'Nacional' }
      ]} />
      <ChampSelect label="Nível do campeonato" value={values.nivelCampeonato} onChange={v => onChange({ nivelCampeonato: v })} options={[
        { value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' }
      ]} />

      <div className="sm:col-span-2 pt-2 border-t border-slate-100">
        <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Definições de Valores</h4>
      </div>
      <ChampField label="% Tributos" type="number" value={values.percentualTributos} onChange={v => onChange({ percentualTributos: v })} />
      <ChampField label="% Organização" type="number" value={values.percentualOrganizacao} onChange={v => onChange({ percentualOrganizacao: v })} />
      <ChampField label="% Clubes" type="number" value={values.percentualClubes} onChange={v => onChange({ percentualClubes: v })} />
      <ChampField label="% Premiação Atleta" type="number" value={values.percentualPremiacaoAtleta} onChange={v => onChange({ percentualPremiacaoAtleta: v })} />
      <ChampField label="% Premiação Clube" type="number" value={values.percentualPremiacaoClube} onChange={v => onChange({ percentualPremiacaoClube: v })} />
      <PercentSumHint label="Soma dos 5 percentuais" values={[values.percentualTributos, values.percentualOrganizacao, values.percentualClubes, values.percentualPremiacaoAtleta, values.percentualPremiacaoClube]} />

      <div className="sm:col-span-2 pt-2 border-t border-slate-100">
        <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Premiações Todas as Etapas</h4>
        <p className="text-[10px] text-slate-400">Fatia (dentro do % Premiação Atleta) reservada ao ranking somado de todas as etapas.</p>
      </div>
      <ChampField label="% Premiação Atleta Todas as Etapas" type="number" value={values.percentualPremiacaoTodasEtapas} onChange={v => onChange({ percentualPremiacaoTodasEtapas: v })} />
      <ChampField label="Premiação Adicional Todas as Etapas (R$)" type="number" value={values.premiacaoAdicionalTodasEtapas} onChange={v => onChange({ premiacaoAdicionalTodasEtapas: v })} />
      <ChampField label="Quantidade de Etapas" type="number" value={values.qtdEtapasConsideradas} onChange={v => onChange({ qtdEtapasConsideradas: v })} />
      <ChampField label="Qtd. Piores Resultados a Não Computar" type="number" value={values.qtdPioresDescartar} onChange={v => onChange({ qtdPioresDescartar: v })} />
      <ChampField label="Qtd. Melhores Resultados a Não Computar" type="number" value={values.qtdMelhoresDescartar} onChange={v => onChange({ qtdMelhoresDescartar: v })} />
      <ChampField label="% 1º lugar" type="number" value={values.percentualPos1TodasEtapas} onChange={v => onChange({ percentualPos1TodasEtapas: v })} />
      <ChampField label="% 2º lugar" type="number" value={values.percentualPos2TodasEtapas} onChange={v => onChange({ percentualPos2TodasEtapas: v })} />
      <ChampField label="% 3º lugar" type="number" value={values.percentualPos3TodasEtapas} onChange={v => onChange({ percentualPos3TodasEtapas: v })} />
      <ChampField label="% 4º lugar" type="number" value={values.percentualPos4TodasEtapas} onChange={v => onChange({ percentualPos4TodasEtapas: v })} />
      <ChampField label="% 5º lugar" type="number" value={values.percentualPos5TodasEtapas} onChange={v => onChange({ percentualPos5TodasEtapas: v })} />
      <PercentSumHint label="Soma 1º ao 5º (Todas as Etapas)" values={[values.percentualPos1TodasEtapas, values.percentualPos2TodasEtapas, values.percentualPos3TodasEtapas, values.percentualPos4TodasEtapas, values.percentualPos5TodasEtapas]} />

      <div className="sm:col-span-2 pt-2 border-t border-slate-100">
        <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Premiações Atleta / Clube</h4>
        <p className="text-[10px] text-slate-400">Restante do % Premiação Atleta, dividido em Ouro/Prata/Bronze. A curva 1º-5º abaixo é reaplicada dentro de cada uma das três.</p>
      </div>
      <ChampField label="% Ouro" type="number" value={values.percentualOuro} onChange={v => onChange({ percentualOuro: v })} />
      <ChampField label="% Prata" type="number" value={values.percentualPrata} onChange={v => onChange({ percentualPrata: v })} />
      <ChampField label="% Bronze" type="number" value={values.percentualBronze} onChange={v => onChange({ percentualBronze: v })} />
      <PercentSumHint label="Soma Todas Etapas + Ouro + Prata + Bronze" values={[values.percentualPremiacaoTodasEtapas, values.percentualOuro, values.percentualPrata, values.percentualBronze]} />
      <ChampField label="% 1º lugar" type="number" value={values.percentualPos1Medalha} onChange={v => onChange({ percentualPos1Medalha: v })} />
      <ChampField label="% 2º lugar" type="number" value={values.percentualPos2Medalha} onChange={v => onChange({ percentualPos2Medalha: v })} />
      <ChampField label="% 3º lugar" type="number" value={values.percentualPos3Medalha} onChange={v => onChange({ percentualPos3Medalha: v })} />
      <ChampField label="% 4º lugar" type="number" value={values.percentualPos4Medalha} onChange={v => onChange({ percentualPos4Medalha: v })} />
      <ChampField label="% 5º lugar" type="number" value={values.percentualPos5Medalha} onChange={v => onChange({ percentualPos5Medalha: v })} />
      <PercentSumHint label="Soma 1º ao 5º (Ouro/Prata/Bronze)" values={[values.percentualPos1Medalha, values.percentualPos2Medalha, values.percentualPos3Medalha, values.percentualPos4Medalha, values.percentualPos5Medalha]} />

      <div className="sm:col-span-2 pt-2 border-t border-slate-100">
        <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Pontuação Mínima Atleta — Ouro, Prata e Bronze</h4>
      </div>
      <ChampField label="Pontuação Mínima Ouro" type="number" value={values.pontuacaoMinimaAtletaOuro} onChange={v => onChange({ pontuacaoMinimaAtletaOuro: v })} />
      <ChampField label="Pontuação Mínima Prata" type="number" value={values.pontuacaoMinimaAtletaPrata} onChange={v => onChange({ pontuacaoMinimaAtletaPrata: v })} />
      <ChampField label="Pontuação Mínima Bronze" type="number" value={values.pontuacaoMinimaAtletaBronze} onChange={v => onChange({ pontuacaoMinimaAtletaBronze: v })} />

      <div className="sm:col-span-2 pt-2 border-t border-slate-100">
        <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Pontuação Mínima Equipe — Ouro, Prata e Bronze</h4>
      </div>
      <ChampField label="Pontuação Mínima Ouro" type="number" value={values.pontuacaoMinimaEquipeOuro} onChange={v => onChange({ pontuacaoMinimaEquipeOuro: v })} />
      <ChampField label="Pontuação Mínima Prata" type="number" value={values.pontuacaoMinimaEquipePrata} onChange={v => onChange({ pontuacaoMinimaEquipePrata: v })} />
      <ChampField label="Pontuação Mínima Bronze" type="number" value={values.pontuacaoMinimaEquipeBronze} onChange={v => onChange({ pontuacaoMinimaEquipeBronze: v })} />

      <div className="sm:col-span-2 pt-2 border-t border-slate-100">
        <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Ordem de Exibição e Visibilidade</h4>
      </div>
      <ChampField label="Ordem" type="number" value={values.ordemExibicao} onChange={v => onChange({ ordemExibicao: v })} />
      <ChampSelect label="Aberto para outros clubes" value={values.abertoOutrosClubes} onChange={v => onChange({ abertoOutrosClubes: (v || 'sim') as 'sim' | 'nao' })} options={[
        { value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }
      ]} />
    </>
  );
}

// =============================================================================
// InscricaoClubePanel — Inscrição em lote para atletas do clube
// =============================================================================
interface InscricaoClubePanelProps {
  championships: Championship[];
  stages: Stage[];
  modalities: Modality[];
  currentUser: User | null;
}

function InscricaoClubePanel({ championships, stages, modalities, currentUser }: InscricaoClubePanelProps) {
  const [champId, setChampId] = React.useState('');
  const [stageId, setStageId] = React.useState('');
  const [modalityId, setModalityId] = React.useState('');
  const [members, setMembers] = React.useState<User[]>([]);
  const [clubWeapons, setClubWeapons] = React.useState<Weapon[]>([]);
  const [loadingMembers, setLoadingMembers] = React.useState(false);
  const [selectedAthletes, setSelectedAthletes] = React.useState<Record<string, { weaponId: string; checked: boolean }>>({});
  const [searchQueries, setSearchQueries] = React.useState<Record<string, string>>({});
  const [searchResults, setSearchResults] = React.useState<Record<string, Weapon[]>>({});
  const [searchingWeapon, setSearchingWeapon] = React.useState<Record<string, boolean>>({});
  const [saving, setSaving] = React.useState(false);
  const [success, setSuccess] = React.useState<{ userId: string; status: string; message?: string }[] | null>(null);
  const [error, setError] = React.useState('');

  const champStages = stages.filter(s => s.championshipId === champId);
  const currentStage = stages.find(s => s.id === stageId);
  const filteredMembers = React.useMemo(() => {
    if (!currentStage) return members;
    const stageSex = currentStage.sexo || 'misto';
    if (stageSex === 'misto') return members;
    return members.filter(m => {
      const athleteSex = (m.sex || '').toLowerCase();
      return athleteSex === stageSex.toLowerCase();
    });
  }, [members, currentStage]);

  React.useEffect(() => {
    if (!champId || !stageId || !modalityId || !currentUser) return;
    setLoadingMembers(true);
    setError('');
    setSuccess(null);
    setSelectedAthletes({});
    
    const clubId = currentUser.role === 'master_admin' 
      ? championships.find(c => c.id === champId)?.clubId || currentUser.clubId 
      : currentUser.clubId;

    if (!clubId) {
      setError('ID do clube não identificado.');
      setLoadingMembers(false);
      return;
    }

    fetch(`/api/club-members?clubId=${clubId}`, {
      headers: { 'x-user-id': currentUser.id }
    })
      .then(r => {
        if (!r.ok) throw new Error('Falha ao buscar membros');
        return r.json();
      })
      .then(data => {
        setMembers(data.members || []);
        setClubWeapons(data.weapons || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoadingMembers(false));
  }, [champId, stageId, modalityId, currentUser]);

  const handleToggleAthlete = (userId: string) => {
    setSelectedAthletes(prev => {
      const current = prev[userId] || { weaponId: '', checked: false };
      return {
        ...prev,
        [userId]: { ...current, checked: !current.checked }
      };
    });
  };

  const handleSelectWeapon = (userId: string, weaponId: string) => {
    setSelectedAthletes(prev => {
      const current = prev[userId] || { weaponId: '', checked: false };
      return {
        ...prev,
        [userId]: { ...current, weaponId }
      };
    });
  };

  const handleSearchWeapon = async (userId: string, q: string) => {
    setSearchQueries(prev => ({ ...prev, [userId]: q }));
    if (q.trim().length < 2) {
      setSearchResults(prev => ({ ...prev, [userId]: [] }));
      return;
    }
    setSearchingWeapon(prev => ({ ...prev, [userId]: true }));
    try {
      const r = await fetch(`/api/weapons/search?q=${encodeURIComponent(q)}`, {
        headers: { 'x-user-id': currentUser?.id || '' }
      });
      const data = await r.json();
      setSearchResults(prev => ({ ...prev, [userId]: data.weapons || [] }));
    } catch {
      setSearchResults(prev => ({ ...prev, [userId]: [] }));
    } finally {
      setSearchingWeapon(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleRegisterBulk = async () => {
    if (!champId || !stageId || !modalityId || !currentUser) return;
    
    const selectedList = Object.entries(selectedAthletes)
      .filter(([_, data]) => (data as any).checked)
      .map(([userId, data]) => {
        const member = members.find(m => m.id === userId);
        return {
          userId,
          weaponId: (data as any).weaponId,
          crNumber: member?.crNumber || 'N/A'
        };
      });

    if (selectedList.length === 0) {
      setError('Selecione pelo menos um atleta.');
      return;
    }

    const missingWeapon = selectedList.some(item => !item.weaponId);
    if (missingWeapon) {
      setError('Selecione uma arma para cada atleta marcado.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess(null);

    try {
      const res = await fetch(`/api/championships/${champId}/register-bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({
          stageId,
          modalityId,
          athletes: selectedList
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro na inscrição em lote');
      
      setSuccess(data.results || []);
      setSelectedAthletes({});
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs text-slate-800">
      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
        <div>
          <h3 className="font-display font-bold text-slate-900 text-base">Inscrição em Lote (Clube)</h3>
          <p className="text-xs text-slate-400">Inscrever múltiplos atletas do clube de forma rápida.</p>
        </div>
        <Users className="w-5 h-5 text-blue-600" />
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-semibold">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase block">Campeonato</label>
          <select value={champId} onChange={e => { setChampId(e.target.value); setStageId(''); setModalityId(''); }}
            className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl text-xs text-slate-700 font-semibold">
            <option value="">Selecione...</option>
            {championships.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase block">Etapa</label>
          <select value={stageId} onChange={e => setStageId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl text-xs text-slate-700 font-semibold" disabled={!champId}>
            <option value="">Selecione...</option>
            {champStages.map(s => <option key={s.id} value={s.id}>{s.title || `Etapa ${s.stageNum}`}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase block">Modalidade</label>
          <select value={modalityId} onChange={e => setModalityId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl text-xs text-slate-700 font-semibold" disabled={!stageId}>
            <option value="">Selecione...</option>
            {modalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      </div>

      {success && (
        <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl space-y-2 text-xs">
          <h4 className="font-bold flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-600" /> Resultados do Lote:</h4>
          <ul className="list-disc pl-4 space-y-1 font-semibold">
            {success.map((res, i) => {
              const athlete = members.find(m => m.id === res.userId);
              return (
                <li key={i}>
                  {athlete?.fullName}: <span className={res.status === 'erro' ? 'text-red-600' : 'text-emerald-700'}>
                    {res.status === 'inscrito' ? 'Inscrito com sucesso' : res.status === 'reinscrito' ? 'Reinscrição efetuada' : `Erro - ${res.message}`}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {loadingMembers && <p className="text-xs text-slate-400 text-center py-4">Buscando sócios do estande...</p>}

      {!loadingMembers && members.length > 0 && filteredMembers.length === 0 && (
        <div className="text-center py-8 px-4 text-slate-500 text-xs font-semibold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          Nenhum atleta do sexo <span className="text-slate-800 font-extrabold">{currentStage?.sexo === 'feminino' ? 'Feminino 👩' : 'Masculino 👨'}</span> cadastrado no clube está elegível para esta etapa.
        </div>
      )}

      {!loadingMembers && members.length > 0 && filteredMembers.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <p className="text-xs font-semibold text-slate-600">Selecione os atletas para inscrição e defina a arma:</p>
            {currentStage && currentStage.sexo && currentStage.sexo !== 'misto' && (
              <span className="self-start text-[10px] bg-blue-50 text-blue-700 border border-blue-150 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Restrição da Etapa: apenas {currentStage.sexo === 'feminino' ? 'Feminino 👩' : 'Masculino 👨'}
              </span>
            )}
          </div>
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-mono text-[10px] uppercase">
                  <th className="py-2.5 px-3 w-10">Sel</th>
                  <th className="py-2.5 px-3">Atleta</th>
                  <th className="py-2.5 px-3">CR</th>
                  <th className="py-2.5 px-3">Arma do Atleta / Busca por Sigma</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredMembers.map(member => {
                  const state = selectedAthletes[member.id] || { weaponId: '', checked: false };
                  const athleteWeapons = clubWeapons.filter(w => w.ownerId === member.id);
                  const searchInput = searchQueries[member.id] || '';
                  const results = searchResults[member.id] || [];
                  const searching = searchingWeapon[member.id] || false;

                  return (
                    <tr key={member.id} className={state.checked ? 'bg-blue-50/20' : 'hover:bg-slate-50/50'}>
                      <td className="py-3 px-3">
                        <input type="checkbox" checked={state.checked} onChange={() => handleToggleAthlete(member.id)}
                          className="w-4 h-4 text-blue-600 border-slate-350 rounded-sm cursor-pointer" />
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-800 block">{member.fullName}</span>
                        <span className="text-[10px] text-slate-400 font-mono block">CPF: {member.cpf || 'N/A'}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] font-bold text-slate-655">{member.crNumber || 'N/A'}</td>
                      <td className="py-3 px-3">
                        {state.checked ? (
                          <div className="space-y-2 max-w-xs">
                            <select value={state.weaponId} onChange={e => handleSelectWeapon(member.id, e.target.value)}
                              className="w-full bg-white border border-slate-200 p-2 rounded-xl text-xs text-slate-700 font-semibold outline-none focus:border-blue-400">
                              <option value="">Selecione a arma...</option>
                              {athleteWeapons.map(w => (
                                <option key={w.id} value={w.id}>
                                  {w.model} {w.caliber} (Sigma: {w.sigmaNumber || 'N/A'})
                                </option>
                              ))}
                              {state.weaponId && !athleteWeapons.some(w => w.id === state.weaponId) && (
                                <option value={state.weaponId}>
                                  Arma selecionada via busca
                                </option>
                              )}
                            </select>

                            <div className="relative">
                              <input
                                type="text"
                                placeholder="Ou busque por Sigma/Série..."
                                value={searchInput}
                                onChange={e => handleSearchWeapon(member.id, e.target.value)}
                                className="w-full bg-white border border-slate-200 p-2 rounded-xl text-[11px] text-slate-700 outline-none focus:border-blue-400 font-mono"
                              />
                              {searching && <span className="absolute right-3 top-2.5 text-[9px] text-slate-400 font-semibold">Buscando...</span>}
                              
                              {results.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-40 overflow-y-auto divide-y divide-slate-100">
                                  {results.map(w => (
                                    <button
                                      key={w.id}
                                      onClick={() => {
                                        handleSelectWeapon(member.id, w.id);
                                        setSearchResults(prev => ({ ...prev, [member.id]: [] }));
                                        setSearchQueries(prev => ({ ...prev, [member.id]: `${w.model} (Sigma: ${w.sigmaNumber || 'N/A'})` }));
                                      }}
                                      className="w-full text-left px-3 py-2 text-[11px] text-slate-700 hover:bg-blue-50 font-mono"
                                    >
                                      {w.model} {w.caliber} - Sigma: {w.sigmaNumber || 'N/A'} (Série: {w.serialNumber})
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Marque para vincular arma</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleRegisterBulk}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-350 text-white text-xs px-6 py-3 rounded-xl font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <FileCheck className="w-4 h-4" />
              {saving ? 'Registrando lote...' : 'Inscrever Atletas Selecionados'}
            </button>
          </div>
        </div>
      )}

      {!loadingMembers && members.length === 0 && champId && stageId && modalityId && (
        <p className="text-xs text-slate-400 text-center py-6 border border-dashed border-slate-200 rounded-xl">
          Nenhum filiado associado a este estande.
        </p>
      )}
    </div>
  );
}

// =============================================================================
// TreinamentosCompeticoesAdminPanel — Cadastro de treinamento para qualquer atleta
// =============================================================================
interface TreinamentosCompeticoesAdminPanelProps {
  currentUser: User | null;
  users: User[];
  weapons: Weapon[];
  weaponLookupOptions: WeaponLookupOption[];
  onAddWeapon: (weapon: { ownerId?: string; manufacturer: string; model: string; caliber: string; weaponNumber?: string; sigmaNumber?: string; weaponClass?: string; permissionStatus?: string; registrySystem?: string }) => Promise<void>;
  onRefreshData?: () => Promise<void>;
}

function TreinamentosCompeticoesAdminPanel({
  currentUser,
  users,
  weapons,
  weaponLookupOptions,
  onAddWeapon,
  onRefreshData,
}: TreinamentosCompeticoesAdminPanelProps) {
  // Athlete Search State
  const [athleteSearchQuery, setAthleteSearchQuery] = React.useState('');
  const [selectedAthlete, setSelectedAthlete] = React.useState<User | null>(null);
  const [isAthleteDropdownOpen, setIsAthleteDropdownOpen] = React.useState(false);
  const [athleteAmmoBalances, setAthleteAmmoBalances] = React.useState<AmmoAthleteBalance[]>([]);

  // Training Form State
  const [trainingForm, setTrainingForm] = React.useState({
    dateTime: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
    weaponSearchQuery: '',
    selectedWeapon: null as Weapon | null,
    weaponName: '',
    weaponCaliber: '',
    weaponOwnerType: 'propria' as 'propria' | 'clube',
    ownAmmoShots: '',
    clubAmmoShots: '',
    clubAmmoType: 'recarga' as 'nova' | 'recarga',
    modality: 'Treino Livre',
    score: '',
    notes: '',
  });

  const [isWeaponDropdownOpen, setIsWeaponDropdownOpen] = React.useState(false);
  const [savingTraining, setSavingTraining] = React.useState(false);
  const [trainingError, setTrainingError] = React.useState('');
  const [trainingSuccess, setTrainingSuccess] = React.useState('');

  // Add Weapon Modal State
  const [showAddWeaponModal, setShowAddWeaponModal] = React.useState(false);
  const [savingNewWeapon, setSavingNewWeapon] = React.useState(false);
  const [newWeaponData, setNewWeaponData] = React.useState({
    manufacturer: '',
    model: '',
    caliber: '',
    serialNumber: '',
    weaponNumber: '',
    sigmaNumber: '',
    weaponClass: '',
    permissionStatus: '',
    registrySystem: '',
  });

  // Trainings List State
  const [trainingsList, setTrainingsList] = React.useState<TrainingSession[]>([]);
  const [loadingTrainings, setLoadingTrainings] = React.useState(false);
  const [tableSearchQuery, setTableSearchQuery] = React.useState('');
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // Fetch all trainings
  const loadAllTrainings = React.useCallback(async () => {
    if (!currentUser) return;
    setLoadingTrainings(true);
    try {
      const res = await fetch('/api/trainings?all=true', {
        headers: { 'x-user-id': currentUser.id }
      });
      if (res.ok) {
        const data = await res.json();
        setTrainingsList(data.trainings || []);
      }
    } catch (err) {
      console.error('Error fetching trainings list:', err);
    } finally {
      setLoadingTrainings(false);
    }
  }, [currentUser]);

  React.useEffect(() => {
    loadAllTrainings();
  }, [loadAllTrainings]);

  // Fetch athlete ammo balances when selectedAthlete changes
  React.useEffect(() => {
    if (!selectedAthlete || !currentUser) {
      setAthleteAmmoBalances([]);
      return;
    }
    fetch(`/api/ammo/athlete-balances/${selectedAthlete.id}`, {
      headers: { 'x-user-id': currentUser.id }
    })
      .then(r => r.ok ? r.json() : { balances: [] })
      .then(data => setAthleteAmmoBalances(data.balances || []))
      .catch(() => setAthleteAmmoBalances([]));
  }, [selectedAthlete, currentUser]);

  // Filtered Athletes
  const searchFilteredAthletes = React.useMemo(() => {
    const q = athleteSearchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return users.filter(u =>
      (u.fullName || '').toLowerCase().includes(q) ||
      (u.cpf || '').includes(q) ||
      (u.crNumber || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q)
    );
  }, [users, athleteSearchQuery]);

  // Weapons available for the selected athlete (athlete's weapons + club weapons)
  const availableWeapons = React.useMemo(() => {
    if (!selectedAthlete) return weapons;
    return weapons.filter(w =>
      w.ownerId === selectedAthlete.id ||
      w.ownerId === currentUser?.clubId ||
      (w as any).ownerType === 'clube'
    );
  }, [weapons, selectedAthlete, currentUser]);

  // Filtered weapons for autocomplete search
  const searchFilteredWeapons = React.useMemo(() => {
    const q = trainingForm.weaponSearchQuery.trim().toLowerCase();
    if (!q) return availableWeapons;
    return availableWeapons.filter(w =>
      (w.manufacturer || '').toLowerCase().includes(q) ||
      (w.model || '').toLowerCase().includes(q) ||
      (w.caliber || '').toLowerCase().includes(q) ||
      (w.sigmaNumber || '').toLowerCase().includes(q) ||
      (w.weaponNumber || '').toLowerCase().includes(q)
    );
  }, [availableWeapons, trainingForm.weaponSearchQuery]);

  const weaponLookup = (kind: string) => weaponLookupOptions.filter(o => o.kind === kind);

  // Handle Add Weapon for selected athlete
  const handleCreateWeaponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAthlete) return;
    if (!newWeaponData.manufacturer || !newWeaponData.model || !newWeaponData.caliber) {
      alert('Fabricante, Modelo e Calibre são obrigatórios.');
      return;
    }
    setSavingNewWeapon(true);
    try {
      await onAddWeapon({
        ownerId: selectedAthlete.id,
        manufacturer: newWeaponData.manufacturer,
        model: newWeaponData.model,
        caliber: newWeaponData.caliber,
        weaponNumber: newWeaponData.weaponNumber || newWeaponData.serialNumber,
        sigmaNumber: newWeaponData.sigmaNumber,
        weaponClass: newWeaponData.weaponClass,
        permissionStatus: newWeaponData.permissionStatus,
        registrySystem: newWeaponData.registrySystem,
      });

      const createdName = `${newWeaponData.manufacturer} ${newWeaponData.model}`.trim();
      setTrainingForm(prev => ({
        ...prev,
        weaponName: createdName,
        weaponCaliber: newWeaponData.caliber,
        weaponOwnerType: 'propria',
        weaponSearchQuery: `${createdName} (${newWeaponData.caliber})`,
      }));
      setShowAddWeaponModal(false);
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Erro ao cadastrar arma.');
    } finally {
      setSavingNewWeapon(false);
    }
  };

  // Handle Training Submit
  const handleTrainingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrainingError('');
    setTrainingSuccess('');

    if (!selectedAthlete) {
      setTrainingError('Selecione um atleta para registrar o treinamento.');
      return;
    }
    if (!trainingForm.dateTime || !trainingForm.weaponName) {
      setTrainingError('Data/Hora e Arma são obrigatórias.');
      return;
    }

    const own = Math.max(0, Number(trainingForm.ownAmmoShots) || 0);
    const club = Math.max(0, Number(trainingForm.clubAmmoShots) || 0);

    setSavingTraining(true);
    try {
      const res = await fetch('/api/trainings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || ''
        },
        body: JSON.stringify({
          targetUserId: selectedAthlete.id,
          dateTime: trainingForm.dateTime,
          weaponId: trainingForm.selectedWeapon?.id || null,
          weaponName: trainingForm.weaponName,
          weaponCaliber: trainingForm.weaponCaliber || trainingForm.selectedWeapon?.caliber || null,
          weaponOwnerType: trainingForm.weaponOwnerType,
          ownAmmoShots: own,
          clubAmmoShots: club,
          clubAmmoType: trainingForm.clubAmmoType,
          modality: trainingForm.modality || 'Treino Livre',
          score: Number(trainingForm.score) || 0,
          notes: trainingForm.notes || null,
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar treinamento.');

      setTrainingSuccess(`Treinamento registrado com sucesso para o atleta ${selectedAthlete.fullName}!`);
      setTrainingForm(prev => ({
        ...prev,
        ownAmmoShots: '',
        clubAmmoShots: '',
        clubAmmoType: 'recarga',
        score: '',
        notes: '',
      }));

      await loadAllTrainings();

      if (currentUser) {
        const balRes = await fetch(`/api/ammo/athlete-balances/${selectedAthlete.id}`, {
          headers: { 'x-user-id': currentUser.id }
        });
        if (balRes.ok) {
          const balData = await balRes.json();
          setAthleteAmmoBalances(balData.balances || []);
        }
      }

      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      setTrainingError(err.message);
    } finally {
      setSavingTraining(false);
    }
  };

  // Handle Delete Training
  const handleDeleteTraining = async (id: string) => {
    if (!window.confirm('Deseja realmente excluir este registro de treinamento?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/trainings/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': currentUser?.id || '' }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao excluir treinamento.');
      }
      setTrainingsList(prev => prev.filter(t => t.id !== id));
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered trainings for history
  const filteredTrainingsList = React.useMemo(() => {
    const q = tableSearchQuery.trim().toLowerCase();
    if (!q) return trainingsList;
    return trainingsList.filter(t =>
      (t.athleteName || '').toLowerCase().includes(q) ||
      (t.athleteCr || '').toLowerCase().includes(q) ||
      (t.weaponName || '').toLowerCase().includes(q) ||
      (t.modality || '').toLowerCase().includes(q) ||
      (t.notes || '').toLowerCase().includes(q)
    );
  }, [trainingsList, tableSearchQuery]);

  return (
    <div className="space-y-6 text-slate-800">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-display font-bold text-slate-900 text-base flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-600" />
              Lançamento de Treinamentos / Habitualidade (ADM)
            </h3>
            <p className="text-xs text-slate-400">
              Cadastre treinos de habitualidade para qualquer atleta federado da plataforma com abate automático do saldo de munições do clube.
            </p>
          </div>
          <Activity className="w-5 h-5 text-blue-600 animate-pulse" />
        </div>

        {/* 1. SELEÇÃO / PESQUISA DE ATLETA */}
        <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            1. Pesquisa de Atleta <span className="text-red-500">*</span> (Busque por Nome, CPF ou CR)
          </label>

          {!selectedAthlete ? (
            <div className="relative">
              <div className="relative">
                <input
                  type="text"
                  value={athleteSearchQuery}
                  onFocus={() => setIsAthleteDropdownOpen(true)}
                  onChange={(e) => {
                    setAthleteSearchQuery(e.target.value);
                    setIsAthleteDropdownOpen(true);
                  }}
                  placeholder="Digite o nome, CPF ou CR do atirador..."
                  className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-xs font-semibold text-slate-800 shadow-xs"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>

              {athleteSearchQuery.length > 0 && athleteSearchQuery.length < 2 && (
                <p className="text-[10.5px] text-amber-600 mt-1 font-medium">
                  Digite mais {2 - athleteSearchQuery.length} caractere(s) para pesquisar atletas...
                </p>
              )}

              {isAthleteDropdownOpen && athleteSearchQuery.length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {searchFilteredAthletes.length === 0 ? (
                    <div className="p-3 text-center text-slate-500 text-xs">
                      Nenhum atleta encontrado para "{athleteSearchQuery}".
                    </div>
                  ) : (
                    searchFilteredAthletes.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setSelectedAthlete(u);
                          setIsAthleteDropdownOpen(false);
                          setAthleteSearchQuery('');
                          setTrainingError('');
                          setTrainingSuccess('');
                        }}
                        className="w-full text-left p-3 hover:bg-blue-50/70 transition flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                            alt={u.fullName}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200"
                          />
                          <div>
                            <div className="font-bold text-slate-900 text-xs">{u.fullName}</div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              CPF: {u.cpf || 'N/A'} | CR: {u.crNumber || 'N/A'}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                          Selecionar
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Selected Athlete Card */
            <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <img
                  src={selectedAthlete.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                  alt={selectedAthlete.fullName}
                  className="w-12 h-12 rounded-full object-cover border-2 border-blue-500 shadow-xs"
                />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{selectedAthlete.fullName}</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                      Atleta Selecionado
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    CPF: {selectedAthlete.cpf || 'N/A'} • CR: {selectedAthlete.crNumber || 'Não informado'}
                  </div>
                  {/* Ammo balances of selected athlete */}
                  {athleteAmmoBalances.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 font-semibold self-center">Saldos de Munição:</span>
                      {athleteAmmoBalances.map(b => (
                        <span key={b.id} className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                          {b.caliber}: {b.balance} un
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic block pt-0.5">Sem saldo de munições do clube alocado</span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedAthlete(null);
                  setAthleteAmmoBalances([]);
                  setTrainingSuccess('');
                  setTrainingError('');
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer shrink-0"
              >
                Trocar Atleta
              </button>
            </div>
          )}
        </div>

        {/* 2. FORMULÁRIO DE TREINAMENTO (Exibido quando atleta é selecionado) */}
        {selectedAthlete && (
          <form onSubmit={handleTrainingSubmit} className="space-y-4 bg-slate-50/50 p-5 rounded-2xl border border-slate-200 text-xs text-slate-700 shadow-inner">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <span className="font-bold text-slate-800 text-xs uppercase flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600" />
                2. Formulário de Treinamento para {selectedAthlete.fullName}
              </span>
            </div>

            {trainingError && (
              <div className="bg-red-50 text-red-700 p-3 rounded-xl border border-red-200 text-xs font-semibold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
                <span>{trainingError}</span>
              </div>
            )}

            {trainingSuccess && (
              <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl border border-emerald-200 text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{trainingSuccess}</span>
              </div>
            )}

            {/* Data e Hora */}
            <div>
              <label className="block text-[11px] text-slate-600 font-bold uppercase mb-1">
                Data e Hora do Treinamento <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={trainingForm.dateTime}
                onChange={e => setTrainingForm({ ...trainingForm, dateTime: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-medium shadow-xs"
              />
            </div>

            {/* Seleção da Arma com Pesquisa em Tempo Real */}
            <div className="relative">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[11px] text-slate-600 font-bold uppercase">
                  Arma Utilizada <span className="text-red-500">*</span> (Pesquise digitando marca, modelo ou calibre)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setNewWeaponData({
                      manufacturer: '',
                      model: '',
                      caliber: '',
                      serialNumber: '',
                      weaponNumber: '',
                      sigmaNumber: '',
                      weaponClass: '',
                      permissionStatus: '',
                      registrySystem: '',
                    });
                    setShowAddWeaponModal(true);
                  }}
                  className="text-blue-600 hover:text-blue-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Cadastrar Nova Arma para o Atleta
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={trainingForm.weaponSearchQuery}
                  onFocus={() => setIsWeaponDropdownOpen(true)}
                  onChange={e => {
                    const val = e.target.value;
                    setTrainingForm({
                      ...trainingForm,
                      weaponSearchQuery: val,
                      selectedWeapon: null,
                      weaponName: val,
                    });
                    setIsWeaponDropdownOpen(true);
                  }}
                  placeholder="Digite modelo, marca, calibre, sigma ou número da arma..."
                  className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-medium shadow-xs"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>

              {/* Weapon Autocomplete Dropdown */}
              {isWeaponDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {searchFilteredWeapons.length === 0 ? (
                    <div className="p-3 text-center text-slate-500 text-xs">
                      Nenhuma arma cadastrada encontrada para "{trainingForm.weaponSearchQuery}". Você pode continuar digitando o nome da arma livremente.
                    </div>
                  ) : (
                    searchFilteredWeapons.map(w => {
                      const isAthleteOwn = w.ownerId === selectedAthlete.id;
                      return (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => {
                            setTrainingForm(prev => ({
                              ...prev,
                              selectedWeapon: w,
                              weaponName: `${w.manufacturer || ''} ${w.model || ''}`.trim() || w.weaponNumber || 'Arma Cadastrada',
                              weaponCaliber: w.caliber || prev.weaponCaliber,
                              weaponOwnerType: isAthleteOwn ? 'propria' : 'clube',
                              weaponSearchQuery: `${w.manufacturer || ''} ${w.model || ''} (${w.caliber || 'Sem calibre'})`.trim(),
                            }));
                            setIsWeaponDropdownOpen(false);
                          }}
                          className="w-full text-left p-3 hover:bg-blue-50/70 transition flex items-center justify-between cursor-pointer"
                        >
                          <div>
                            <div className="font-bold text-slate-900 text-xs">
                              {w.manufacturer} {w.model} <span className="text-blue-600 font-mono text-[11px]">({w.caliber})</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              Sigma: {w.sigmaNumber || 'N/A'} | Num: {w.weaponNumber || 'N/A'}
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isAthleteOwn ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-purple-100 text-purple-800 border border-purple-200'}`}>
                            {isAthleteOwn ? '🎯 Própria' : '🏛️ Clube'}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Posse / Origem da Arma */}
            <div>
              <label className="block text-[11px] text-slate-600 font-bold uppercase mb-1.5">
                Origem / Posse da Arma
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTrainingForm({ ...trainingForm, weaponOwnerType: 'propria' })}
                  className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    trainingForm.weaponOwnerType === 'propria'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span>🎯</span>
                  <span>Arma Própria</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTrainingForm({ ...trainingForm, weaponOwnerType: 'clube' })}
                  className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    trainingForm.weaponOwnerType === 'clube'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span>🏛️</span>
                  <span>Arma do Clube</span>
                </button>
              </div>
            </div>

            {/* Munições e Tiros */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-800 text-xs uppercase flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-emerald-600" />
                  Contagem de Tiros e Munição Disparada
                </span>
                <span className="text-xs font-bold text-slate-900 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200 font-mono">
                  Total: {(Number(trainingForm.ownAmmoShots) || 0) + (Number(trainingForm.clubAmmoShots) || 0)} tiros
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-600 font-bold uppercase mb-1">
                    Tiros com Munição Própria
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={trainingForm.ownAmmoShots}
                    onChange={e => setTrainingForm({ ...trainingForm, ownAmmoShots: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-600 font-bold uppercase mb-1">
                    Tiros com Munição do Clube
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={trainingForm.clubAmmoShots}
                    onChange={e => setTrainingForm({ ...trainingForm, clubAmmoShots: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-mono font-bold"
                  />
                </div>
              </div>

              {Number(trainingForm.clubAmmoShots) > 0 && (
                <div className="space-y-2 bg-amber-50 p-3 rounded-xl border border-amber-200">
                  <p className="text-[10.5px] text-amber-700 font-medium">
                    ⚠️ <strong>Atenção:</strong> {trainingForm.clubAmmoShots} tiro(s) com munição do clube serão debitados automaticamente do saldo alocado do atleta.
                  </p>

                  <div className="pt-2 border-t border-amber-200/60 space-y-1">
                    <label className="text-[10px] font-bold text-amber-900 uppercase block">Tipo de Munição do Clube Utilizada</label>
                    <div className="flex gap-4 items-center">
                      <label className="flex items-center gap-1.5 text-xs text-amber-900 font-semibold cursor-pointer">
                        <input
                          type="radio"
                          name="adminTrainingClubAmmoType"
                          value="nova"
                          checked={trainingForm.clubAmmoType === 'nova'}
                          onChange={() => setTrainingForm({ ...trainingForm, clubAmmoType: 'nova' })}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        Munição Nova (NF)
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-amber-900 font-semibold cursor-pointer">
                        <input
                          type="radio"
                          name="adminTrainingClubAmmoType"
                          value="recarga"
                          checked={trainingForm.clubAmmoType === 'recarga'}
                          onChange={() => setTrainingForm({ ...trainingForm, clubAmmoType: 'recarga' })}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        Munição Recarga
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modalidade, Pontuação e Observações */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-600 font-bold uppercase mb-1">
                  Modalidade / Atividade
                </label>
                <input
                  type="text"
                  placeholder="Ex: Treino Livre, IPSC Handgun, Precisão 25m"
                  value={trainingForm.modality}
                  onChange={e => setTrainingForm({ ...trainingForm, modality: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 font-bold uppercase mb-1">
                  Pontuação Obtida (Score)
                </label>
                <input
                  type="number"
                  placeholder="Ex: 150"
                  value={trainingForm.score}
                  onChange={e => setTrainingForm({ ...trainingForm, score: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 font-bold uppercase mb-1">
                Observações / Anotações do Estande
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Treino de precisão com alvos a 25m, condições normais de estande."
                value={trainingForm.notes}
                onChange={e => setTrainingForm({ ...trainingForm, notes: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-medium"
              />
            </div>

            {/* Botão Salvar Treinamento */}
            <button
              type="submit"
              disabled={savingTraining}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md text-xs uppercase tracking-wider"
            >
              {savingTraining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando Treinamento...
                </>
              ) : (
                'Confirmar e Registrar Treinamento no Banco de Dados'
              )}
            </button>
          </form>
        )}
      </div>

      {/* 3. SUB-MODAL: CADASTRO DE NOVA ARMA PARA O ATLETA */}
      {showAddWeaponModal && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl overflow-hidden text-slate-800 p-6 space-y-4 text-left">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-blue-600" />
                <h4 className="font-bold text-slate-900 text-sm">
                  Cadastrar Arma para {selectedAthlete?.fullName}
                </h4>
              </div>
              <button onClick={() => setShowAddWeaponModal(false)} className="text-slate-400 hover:text-slate-600 transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWeaponSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Fabricante *</label>
                <select
                  required
                  value={newWeaponData.manufacturer}
                  onChange={e => setNewWeaponData({ ...newWeaponData, manufacturer: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-blue-500 font-semibold"
                >
                  <option value="">Selecione...</option>
                  {weaponLookup('fabricante').map(o => <option key={o.id} value={o.label}>{o.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Modelo *</label>
                  <select
                    required
                    value={newWeaponData.model}
                    onChange={e => setNewWeaponData({ ...newWeaponData, model: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-blue-500 font-semibold"
                  >
                    <option value="">Selecione...</option>
                    {weaponLookup('modelo').map(o => <option key={o.id} value={o.label}>{o.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Calibre *</label>
                  <select
                    required
                    value={newWeaponData.caliber}
                    onChange={e => setNewWeaponData({ ...newWeaponData, caliber: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-blue-500 font-semibold"
                  >
                    <option value="">Selecione...</option>
                    {weaponLookup('calibre').map(o => <option key={o.id} value={o.label}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nº Arma / Série</label>
                  <input
                    type="text"
                    placeholder="Ex: ABC12345"
                    value={newWeaponData.weaponNumber}
                    onChange={e => setNewWeaponData({ ...newWeaponData, weaponNumber: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nº Sigma</label>
                  <input
                    type="text"
                    placeholder="Ex: 123456"
                    value={newWeaponData.sigmaNumber}
                    onChange={e => setNewWeaponData({ ...newWeaponData, sigmaNumber: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddWeaponModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingNewWeapon}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl transition cursor-pointer"
                >
                  {savingNewWeapon ? 'Salvando...' : 'Salvar Arma'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. HISTÓRICO DE TREINAMENTOS REGISTRADOS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-100">
          <div>
            <h4 className="font-display font-bold text-slate-900 text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Histórico Geral de Treinamentos ({filteredTrainingsList.length})
            </h4>
            <p className="text-xs text-slate-400">Visão consolidada de todas as sessões de treinamento registradas no estande.</p>
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Filtrar por atleta, arma, modalidade..."
              value={tableSearchQuery}
              onChange={e => setTableSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 pl-8 pr-3 py-2 rounded-xl text-xs outline-none focus:border-blue-500 font-medium"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        {loadingTrainings ? (
          <div className="py-12 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-xs">Carregando treinamentos...</p>
          </div>
        ) : filteredTrainingsList.length === 0 ? (
          <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Target className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs">Nenhum treinamento encontrado com os critérios de busca.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-mono text-[10px] uppercase">
                  <th className="py-2.5 px-3">Atleta</th>
                  <th className="py-2.5 px-3">Data / Hora</th>
                  <th className="py-2.5 px-3">Arma / Calibre</th>
                  <th className="py-2.5 px-3 text-center">Posse</th>
                  <th className="py-2.5 px-3 text-center">Tiros Próprios</th>
                  <th className="py-2.5 px-3 text-center">Tiros Clube</th>
                  <th className="py-2.5 px-3 text-center">Total Tiros</th>
                  <th className="py-2.5 px-3">Modalidade / Score</th>
                  <th className="py-2.5 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredTrainingsList.map(t => {
                  const formattedDate = t.dateTime ? new Date(t.dateTime).toLocaleString('pt-BR') : '-';
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{t.athleteName || 'Atleta'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">CR: {t.athleteCr || 'N/A'}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] whitespace-nowrap">{formattedDate}</td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{t.weaponName}</div>
                        {t.weaponCaliber && <div className="text-[10px] text-blue-600 font-mono">{t.weaponCaliber}</div>}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          t.weaponOwnerType === 'clube' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {t.weaponOwnerType === 'clube' ? 'Clube' : 'Própria'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold">{t.ownAmmoShots}</td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-purple-700">{t.clubAmmoShots}</td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-900 bg-slate-50">{t.totalShots}</td>
                      <td className="py-3 px-3">
                        <div className="font-medium">{t.modality || 'Treino Livre'}</div>
                        <div className="text-[10px] text-emerald-700 font-mono font-bold">{t.score ?? 0} pts</div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleDeleteTraining(t.id)}
                          disabled={deletingId === t.id}
                          className="text-red-500 hover:text-red-700 transition p-1.5 rounded hover:bg-red-50 cursor-pointer disabled:opacity-40"
                          title="Excluir treinamento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// CadastrarResultadosPanel — Lançamento de resultados com grid de séries × zonas
// =============================================================================
interface CadastrarResultadosPanelProps {
  championships: Championship[];
  stages: Stage[];
  modalities: Modality[];
  currentUser: User | null;
  onRecordScore: (data: {
    championshipId: string;
    registrationId: string;
    stageNum: number;
    score: number;
    timeSeconds?: number;
  }) => Promise<void>;
  onRefreshData?: () => Promise<void>;
  isPlataformaScope?: boolean;
}

type EnrichedRegistration = {
  id: string; userId: string; modalityId: string; stageId: string;
  completionStatus: string; disqualified: boolean;
  athleteName?: string; athleteCr?: string; clubName?: string;
  modalityName?: string; seriesCount?: number; shotsPerSeries?: number;
  evaluationType?: string; weaponModel?: string; weaponSerial?: string;
  weaponNumber?: string; weaponSigma?: string; weaponCaliber?: string;
  totalPoints?: number; dataExecucao?: string; horaExecucao?: string;
  seriesPontos?: any[]; seriesTempos?: any[];
  ownAmmoShots?: number; clubAmmoShots?: number; clubAmmoType?: 'nova' | 'recarga';
};

const ZONES = ['x','p10','p9','p8','p7','p6','p5','p4','p3','p2','p1','p0'] as const;
const ZONE_LABELS: Record<string, string> = { x:'X', p10:'10', p9:'9', p8:'8', p7:'7', p6:'6', p5:'5', p4:'4', p3:'3', p2:'2', p1:'1', p0:'0' };
const ZONE_POINTS: Record<string, number> = { x:10, p10:10, p9:9, p8:8, p7:7, p6:6, p5:5, p4:4, p3:3, p2:2, p1:1, p0:0 };

function calcSeriePts(s: Record<string,number>, xValue: number = 11): number {
  const points: Record<string, number> = { ...ZONE_POINTS, x: xValue };
  return ZONES.reduce((acc, z) => acc + (Number(s[z])||0) * points[z], 0);
}

function CadastrarResultadosPanel({ championships, stages, modalities, currentUser, onRecordScore, onRefreshData, isPlataformaScope }: CadastrarResultadosPanelProps) {
  const [champId, setChampId] = React.useState('');
  const [stageId, setStageId] = React.useState('');
  const [modalityId, setModalityId] = React.useState('');
  const [registrations, setRegistrations] = React.useState<EnrichedRegistration[]>([]);
  const [loadingRegs, setLoadingRegs] = React.useState(false);
  const [selectedReg, setSelectedReg] = React.useState<EnrichedRegistration | null>(null);
  const [dataExec, setDataExec] = React.useState('');
  const [horaExec, setHoraExec] = React.useState('');
  const [penalidade, setPenalidade] = React.useState('0');
  const [ownAmmoShots, setOwnAmmoShots] = React.useState<number | string>('');
  const [clubAmmoShots, setClubAmmoShots] = React.useState<number | string>('');
  const [clubAmmoType, setClubAmmoType] = React.useState<'nova' | 'recarga'>('recarga');
  const [seriesData, setSeriesData] = React.useState<Array<Record<string,string>>>([]);
  const [saving, setSaving] = React.useState(false);
  const [success, setSuccess] = React.useState('');
  const [error, setError] = React.useState('');

  const champStages = stages.filter(s => s.championshipId === champId);

  React.useEffect(() => {
    if (!champId || !stageId) { setRegistrations([]); return; }
    setLoadingRegs(true);
    let url = `/api/admin/registrations?championshipId=${champId}&stageId=${stageId}`;
    if (modalityId) {
      url += `&modalityId=${modalityId}`;
    }
    if (isPlataformaScope) {
      url += `&allClubs=true`;
    }
    fetch(url, {
      headers: { 'x-user-id': currentUser?.id || '' }
    })
      .then(r => r.json())
      .then(d => setRegistrations(d.registrations || []))
      .catch(() => setRegistrations([]))
      .finally(() => setLoadingRegs(false));
  }, [champId, stageId, modalityId, isPlataformaScope]);

  const selectReg = (reg: EnrichedRegistration) => {
    setSelectedReg(reg);
    setError(''); setSuccess('');
    const n = reg.seriesCount || 1;
    if (reg.seriesPontos && reg.seriesPontos.length > 0) {
      setSeriesData(reg.seriesPontos.map((s: any) =>
        Object.fromEntries(ZONES.map(z => [z, String(s[z]||0)]))
      ));
    } else {
      setSeriesData(Array.from({length: n}, () => Object.fromEntries(ZONES.map(z => [z,'0']))));
    }
    setDataExec(reg.dataExecucao || '');
    setHoraExec(reg.horaExecucao || '');

    setOwnAmmoShots(reg.ownAmmoShots ? String(reg.ownAmmoShots) : '');
    setClubAmmoShots(reg.clubAmmoShots ? String(reg.clubAmmoShots) : '');
    setClubAmmoType(reg.clubAmmoType || 'recarga');
  };

  const updateCell = (serieIdx: number, zone: string, val: string) => {
    setSeriesData(prev => prev.map((s, i) => i === serieIdx ? {...s, [zone]: val} : s));
  };

  const currentChamp = championships.find(c => c.id === champId);
  const xValue = (currentChamp && typeof currentChamp.valorX === 'number') ? currentChamp.valorX : 11;

  const serieTotals = seriesData.map(s => calcSeriePts(Object.fromEntries(Object.entries(s).map(([k,v]) => [k, Number(v)||0])), xValue));
  const bestIdx = serieTotals.indexOf(Math.max(...serieTotals));

  const handleSubmit = async (acao: 'salvar'|'nao_participou'|'desclassificar') => {
    if (!selectedReg) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const series = seriesData.map(s => Object.fromEntries(Object.entries(s).map(([k,v]) => [k, Number(v)||0])));
      if (acao === 'salvar') {
        if (!dataExec) {
          throw new Error('A data de execução é obrigatória para salvar o resultado.');
        }
        if (!horaExec) {
          throw new Error('A hora de execução é obrigatória para salvar o resultado.');
        }
        const expectedShots = selectedReg.shotsPerSeries || 0;
        if (expectedShots > 0) {
          for (let i = 0; i < series.length; i++) {
            const sum = ZONES.reduce((acc, z) => acc + (Number(series[i][z]) || 0), 0);
            if (sum !== expectedShots) {
              throw new Error(`A Série ${i + 1} possui ${sum} tiros informados, mas a modalidade exige exatamente ${expectedShots} tiros.`);
            }
          }
        }

        // Validação da soma de munição própria + munição do clube contra o total de tiros em todas as séries
        const totalShotsInSeries = series.reduce((acc, s) => acc + ZONES.reduce((zAcc, z) => zAcc + (Number(s[z]) || 0), 0), 0);
        const own = ownAmmoShots === '' ? 0 : Number(ownAmmoShots);
        const club = clubAmmoShots === '' ? 0 : Number(clubAmmoShots);
        const ammoSum = own + club;

        if (ownAmmoShots === '' && clubAmmoShots === '') {
          throw new Error('Informe a quantidade de tiros com munição própria e/ou do clube.');
        }

        if (ammoSum !== totalShotsInSeries) {
          throw new Error(`A soma dos tiros com munição própria (${own}) e munição do clube (${club}) resulta em ${ammoSum}, mas o total de tiros lançados nas séries é ${totalShotsInSeries}. A soma deve ser exatamente igual a ${totalShotsInSeries}.`);
        }
      }
      const res = await fetch(`/api/championships/${champId}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id || '' },
        body: JSON.stringify({
          registrationId: selectedReg.id,
          acao, dataExecucao: dataExec, horaExecucao: horaExec,
          series, penalidade: Number(penalidade)||0,
          ownAmmoShots: Number(ownAmmoShots)||0,
          clubAmmoShots: Number(clubAmmoShots)||0,
          clubAmmoType,
          stageNum: champStages.find(s => s.id === stageId)?.stageNum || 1
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar');
      const msgs = { salvar: `✅ Resultado gravado! Melhor série: ${data.totalPontos ?? 0} pts`, nao_participou: '✅ Atleta marcado como Não Participou.', desclassificar: '✅ Atleta desclassificado.' };
      setSuccess(msgs[acao]);
      setSelectedReg(null);
      
      let refreshUrl = `/api/admin/registrations?championshipId=${champId}&stageId=${stageId}`;
      if (modalityId) {
        refreshUrl += `&modalityId=${modalityId}`;
      }
      const r2 = await fetch(refreshUrl, { headers: { 'x-user-id': currentUser?.id||'' } });
      const d2 = await r2.json();
      setRegistrations(d2.registrations || []);

      if (onRefreshData) {
        await onRefreshData();
      }
    } catch(e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const statusBadge = (reg: EnrichedRegistration) => {
    if (reg.disqualified) return <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">DQ</span>;
    if (reg.completionStatus === 'completed') return <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{reg.totalPoints ?? 0}pts ✓</span>;
    if (reg.completionStatus === 'absent') return <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">NP</span>;
    return <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Pendente</span>;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs text-slate-800">
      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
        <div>
          <h3 className="font-display font-bold text-slate-900 text-base">Lançar Notas e Homologar Tempos</h3>
          <p className="text-xs text-slate-400">Inserir pontuação por série no banco de dados.</p>
        </div>
        <Target className="w-5 h-5 text-blue-600" />
      </div>

      {success && <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl text-xs font-semibold flex gap-2"><CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />{success}</div>}
      {error && <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-semibold">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase block">Campeonato</label>
          <select value={champId} onChange={e => { setChampId(e.target.value); setStageId(''); setModalityId(''); setSelectedReg(null); }}
            className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl text-xs text-slate-700 font-semibold">
            <option value="">Selecione...</option>
            {championships.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase block">Etapa</label>
          <select value={stageId} onChange={e => { setStageId(e.target.value); setSelectedReg(null); }}
            className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl text-xs text-slate-700 font-semibold" disabled={!champId}>
            <option value="">Selecione...</option>
            {champStages.map(s => <option key={s.id} value={s.id}>{s.title || `Etapa ${s.stageNum}`}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase block">Modalidade</label>
          <select value={modalityId} onChange={e => { setModalityId(e.target.value); setSelectedReg(null); }}
            className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl text-xs text-slate-700 font-semibold" disabled={!stageId}>
            <option value="">Todas as modalidades ({registrations.length})</option>
            {modalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      </div>

      {loadingRegs ? (
        <div className="py-6 text-center text-slate-400 text-xs font-semibold">Carregando inscrições...</div>
      ) : registrations.length === 0 ? (
        <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 font-semibold">
          {champId && stageId ? 'Nenhuma inscrição encontrada para a etapa selecionada.' : 'Selecione o Campeonato e a Etapa acima para carregar a lista de atiradores.'}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase block">Selecione o Atleta / Inscrição ({registrations.length})</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-200 rounded-xl bg-slate-50">
              {registrations.map(r => {
                const isSelected = selectedReg?.id === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => selectReg(r)}
                    className={`p-2.5 rounded-xl text-left border transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs font-semibold'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                        {r.athleteName || 'Atleta'}
                      </div>
                      <div className={`text-[10px] truncate ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                        {r.modalityName}
                      </div>
                    </div>
                    {statusBadge(r)}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedReg && (
            <div className="border border-blue-200 rounded-2xl p-5 bg-blue-50/30 space-y-4 text-slate-800">
              <div className="flex flex-wrap justify-between items-center border-b border-blue-100 pb-3 gap-2">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{selectedReg.athleteName}</h4>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Modalidade: {selectedReg.modalityName} | Arma: {selectedReg.weaponModel || 'N/A'} {selectedReg.weaponCaliber ? `(${selectedReg.weaponCaliber})` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full font-mono">
                    {selectedReg.shotsPerSeries ? `${selectedReg.seriesCount || 1} Série(s) de ${selectedReg.shotsPerSeries} tiros` : 'Pontuação Direta'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Data da Prova</label>
                  <input
                    type="date"
                    value={dataExec}
                    onChange={e => setDataExec(e.target.value)}
                    className="w-full bg-white border border-slate-200 outline-none p-2.5 rounded-xl text-xs text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Hora da Prova</label>
                  <input
                    type="time"
                    value={horaExec}
                    onChange={e => setHoraExec(e.target.value)}
                    className="w-full bg-white border border-slate-200 outline-none p-2.5 rounded-xl text-xs text-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-4">
                {seriesData.map((serie, si) => {
                  const currentShots = ZONES.reduce((acc, z) => acc + (Number(serie[z]) || 0), 0);
                  const expectedShots = selectedReg.shotsPerSeries || 0;
                  const hasExceeded = currentShots > expectedShots;

                  return (
                    <div key={si} className={`rounded-xl border p-3 ${si === bestIdx ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white'} ${hasExceeded ? 'border-red-400 bg-red-50/20' : ''}`}>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center">
                          <span className="text-[10px] font-bold text-slate-600 uppercase font-mono">Série {si+1}</span>
                          <span className={`text-[9px] font-bold ml-3 px-1.5 py-0.5 rounded font-mono ${hasExceeded ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                            Tiros: {currentShots} / {expectedShots}
                          </span>
                        </div>
                        {si === bestIdx && seriesData.length > 1 && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">⭐ Melhor Série</span>
                        )}
                        <span className="text-xs font-mono font-bold text-slate-700">
                          Total: {calcSeriePts(Object.fromEntries(Object.entries(serie).map(([k,v]) => [k, Number(v)||0])), xValue)} pts
                        </span>
                      </div>
                      <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
                        {ZONES.map(z => (
                          <div key={z} className="space-y-0.5 text-center">
                            <label className={`text-[9px] font-bold block ${z === 'x' ? 'text-amber-500' : z === 'p10' ? 'text-blue-500' : 'text-slate-450'}`}>{ZONE_LABELS[z]}</label>
                            <input
                              type="number" min="0" max={selectedReg.shotsPerSeries ?? 60}
                              value={serie[z]}
                              onChange={e => updateCell(si, z, e.target.value)}
                              className="w-full text-center bg-white border border-slate-200 rounded-lg p-1 text-xs font-mono focus:border-blue-400 outline-none"
                            />
                          </div>
                        ))}
                      </div>
                      {hasExceeded && (
                        <div className="mt-2 text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 rounded-lg p-2 flex items-center gap-1.5 animate-pulse">
                          <span>⚠️ Ultrapassou o limite de {expectedShots} tiros estabelecido para a modalidade!</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="bg-slate-100/70 rounded-xl p-4 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                  <Package className="w-4 h-4 text-blue-600" />
                  <span>Origem da Munição e Penalidades</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Penalidade (pts)</label>
                    <input type="number" min="0" value={penalidade} onChange={e => setPenalidade(e.target.value)}
                      className="w-full bg-white border border-slate-200 outline-none p-2.5 rounded-xl text-xs text-slate-700 font-mono" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Tiros com munição própria</label>
                    <input type="number" min="0" value={ownAmmoShots} onChange={e => setOwnAmmoShots(e.target.value)}
                      placeholder="Ex: 10"
                      className="w-full bg-white border border-slate-200 outline-none p-2.5 rounded-xl text-xs text-slate-700 font-mono focus:border-blue-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Tiros com munição do clube</label>
                    <input type="number" min="0" value={clubAmmoShots} onChange={e => setClubAmmoShots(e.target.value)}
                      placeholder="Ex: 0"
                      className="w-full bg-white border border-slate-200 outline-none p-2.5 rounded-xl text-xs text-slate-700 font-mono focus:border-blue-500" />
                  </div>
                </div>

                {Number(clubAmmoShots) > 0 && (
                  <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-600 uppercase block">Tipo de Munição do Clube Utilizada</label>
                    <div className="flex gap-4 items-center">
                      <label className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold cursor-pointer">
                        <input
                          type="radio"
                          name="scoreClubAmmoType"
                          value="nova"
                          checked={clubAmmoType === 'nova'}
                          onChange={() => setClubAmmoType('nova')}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        Munição Nova (NF)
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold cursor-pointer">
                        <input
                          type="radio"
                          name="scoreClubAmmoType"
                          value="recarga"
                          checked={clubAmmoType === 'recarga'}
                          onChange={() => setClubAmmoType('recarga')}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        Munição Recarga
                      </label>
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-slate-450 italic">
                  * A soma dos tiros (munição própria + clube) deve ser exatamente igual ao total de tiros lançados nas séries. Tiros com munição do clube serão automaticamente abatidos do saldo alocado do atleta.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                <button onClick={() => handleSubmit('salvar')} disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-350 text-white text-xs px-5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer">
                  <Save className="w-4 h-4" />{saving ? 'Salvando...' : 'Salvar Resultado'}
                </button>
                <button onClick={() => handleSubmit('nao_participou')} disabled={saving}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer">
                  <AlertCircle className="w-4 h-4 text-amber-500" />Não Participou
                </button>
                <button onClick={() => handleSubmit('desclassificar')} disabled={saving}
                  className="bg-red-50 hover:bg-red-100 text-red-700 text-xs px-5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer">
                  <ShieldAlert className="w-4 h-4" />Desclassificar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MunicoesManagerPanel — Painel do Módulo de Munições (Entrada NF, Estoque, Ponta, Alocar)
// =============================================================================
interface MunicoesManagerPanelProps {
  currentUser: User | null;
  weaponLookupOptions: WeaponLookupOption[];
  onAddWeaponLookup: (kind: string, label: string) => Promise<{ error?: string }>;
  onRefreshData?: () => Promise<void>;
}

function MunicoesManagerPanel({ currentUser, weaponLookupOptions, onAddWeaponLookup, onRefreshData }: MunicoesManagerPanelProps) {
  const [subTab, setSubTab] = useState<'entrada_nf' | 'estoque_recarga' | 'ponta_reciclado' | 'alocar_municoes'>('entrada_nf');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Overview data
  const [caliberStocks, setCaliberStocks] = useState<AmmoCaliberStock[]>([]);
  const [invoices, setInvoices] = useState<AmmoInvoice[]>([]);
  const [productions, setProductions] = useState<AmmoProduction[]>([]);
  const [recycledList, setRecycledList] = useState<AmmoRecycled[]>([]);
  const [recycledMap, setRecycledMap] = useState<Record<string, number>>({});
  const [allocations, setAllocations] = useState<AmmoAthleteAllocation[]>([]);

  // Inline "Cadastrar Novo Calibre" modal
  const [showNewCaliberModal, setShowNewCaliberModal] = useState(false);
  const [newCaliberInput, setNewCaliberInput] = useState('');
  const [savingCaliber, setSavingCaliber] = useState(false);
  const [caliberCallback, setCaliberCallback] = useState<((cal: string) => void) | null>(null);

  // 1. Entrada NF Form State
  const [nfNumber, setNfNumber] = useState('');
  const [nfSupplier, setNfSupplier] = useState('');
  const [nfDate, setNfDate] = useState(new Date().toISOString().split('T')[0]);
  const [nfItems, setNfItems] = useState<Array<{ productType: 'espoleta' | 'polvora' | 'ponta' | 'ponta_nova' | 'ponta_reciclada' | 'municao_nova'; unitMeasure: 'un' | 'kg' | 'g'; caliber: string; quantity: string; unitPrice: string }>>([
    { productType: 'municao_nova', unitMeasure: 'un', caliber: '', quantity: '100', unitPrice: '0.00' }
  ]);
  const [savingNf, setSavingNf] = useState(false);

  // 2. Estoque/Recarga State
  const [initStockCaliber, setInitStockCaliber] = useState('');
  const [initStockQty, setInitStockQty] = useState('');
  const [savingInitStock, setSavingInitStock] = useState(false);

  const [prodCaliber, setProdCaliber] = useState('');
  const [prodQty, setProdQty] = useState('');
  const [prodDate, setProdDate] = useState(new Date().toISOString().split('T')[0]);
  const [savingProd, setSavingProd] = useState(false);

  // 3. Ponta/Reciclado State
  const [recCaliber, setRecCaliber] = useState('');
  const [recQty, setRecQty] = useState('');
  const [recDate, setRecDate] = useState(new Date().toISOString().split('T')[0]);
  const [savingRec, setSavingRec] = useState(false);

  // 4. Atribuir Munições State
  const [athleteQuery, setAthleteQuery] = useState('');
  const [searchingAthletes, setSearchingAthletes] = useState(false);
  const [foundAthletes, setFoundAthletes] = useState<Array<{ id: string; fullName: string; cpf?: string; crNumber?: string; ammoBalances?: Array<{ caliber: string; balance: number }> }>>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<{ id: string; fullName: string; cpf?: string; crNumber?: string; ammoBalances?: Array<{ caliber: string; balance: number }> } | null>(null);
  const [allocDate, setAllocDate] = useState(new Date().toISOString().split('T')[0]);
  const [allocNotes, setAllocNotes] = useState('');
  const [allocItems, setAllocItems] = useState<Array<{ caliber: string; quantity: string }>>([
    { caliber: '', quantity: '50' }
  ]);
  const [savingAlloc, setSavingAlloc] = useState(false);
  const [editingAllocId, setEditingAllocId] = useState<string | null>(null);

  // Fetch overview data
  const loadAmmoOverview = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const r = await fetch('/api/ammo/overview', {
        headers: { 'x-user-id': currentUser.id }
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Erro ao carregar munições');
      setCaliberStocks(data.caliberStocks || []);
      setInvoices(data.invoices || []);
      setProductions(data.productions || []);
      setRecycledList(data.recycledList || []);
      setRecycledMap(data.recycledMap || {});
      setAllocations(data.allocations || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAmmoOverview();
  }, [currentUser]);

  // Available calibers list from weaponLookupOptions
  const calibers = weaponLookupOptions.filter(o => o.kind === 'calibre').map(o => o.label);

  const handleOpenCaliberModal = (onCreated?: (cal: string) => void) => {
    setNewCaliberInput('');
    setCaliberCallback(() => onCreated || null);
    setShowNewCaliberModal(true);
  };

  const handleCreateCaliberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaliberInput.trim()) return;
    setSavingCaliber(true);
    const result = await onAddWeaponLookup('calibre', newCaliberInput.trim());
    setSavingCaliber(false);
    if (result.error) {
      alert(result.error);
    } else {
      const created = newCaliberInput.trim();
      setShowNewCaliberModal(false);
      if (caliberCallback) {
        caliberCallback(created);
      }
      loadAmmoOverview();
    }
  };

  // 1. Submit NF Entry
  const handleNfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (nfItems.some(i => !i.caliber || !i.quantity || Number(i.quantity) <= 0)) {
      setError('Preencha o calibre e a quantidade de todos os produtos da NF.');
      return;
    }
    setSavingNf(true);
    try {
      const r = await fetch('/api/ammo/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id || '' },
        body: JSON.stringify({
          invoiceNumber: nfNumber,
          supplier: nfSupplier,
          date: nfDate,
          items: nfItems.map(i => ({
            productType: i.productType,
            unitMeasure: i.unitMeasure || 'un',
            caliber: i.caliber,
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice) || 0
          }))
        })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Erro ao registrar Nota Fiscal');
      setSuccess(`✅ Nota Fiscal registrada com sucesso! Total: R$ ${data.totalInvoiceAmount.toFixed(2)}.`);
      setNfNumber('');
      setNfSupplier('');
      setNfItems([{ productType: 'municao_nova', unitMeasure: 'un', caliber: '', quantity: '100', unitPrice: '0.00' }]);
      await loadAmmoOverview();
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingNf(false);
    }
  };

  // 2a. Submit Initial Stock
  const handleInitStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!initStockCaliber || !initStockQty) {
      setError('Selecione o calibre e a quantidade inicial.');
      return;
    }
    setSavingInitStock(true);
    try {
      const r = await fetch('/api/ammo/initial-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id || '' },
        body: JSON.stringify({ caliber: initStockCaliber, initialStock: Number(initStockQty) })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Erro ao definir estoque inicial');
      setSuccess(data.message);
      setInitStockCaliber('');
      setInitStockQty('');
      await loadAmmoOverview();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingInitStock(false);
    }
  };

  // 2b. Submit Production/Reloading
  const handleProductionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!prodCaliber || !prodQty || !prodDate) {
      setError('Preencha a data, o calibre e a quantidade produzida.');
      return;
    }
    setSavingProd(true);
    try {
      const r = await fetch('/api/ammo/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id || '' },
        body: JSON.stringify({ caliber: prodCaliber, quantity: Number(prodQty), date: prodDate })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Erro ao registrar produção');
      setSuccess(data.message);
      setProdCaliber('');
      setProdQty('');
      await loadAmmoOverview();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingProd(false);
    }
  };

  // 3. Submit Recycled
  const handleRecycledSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!recCaliber || !recQty || !recDate) {
      setError('Preencha a data, o calibre e a quantidade de pontas recicladas.');
      return;
    }
    setSavingRec(true);
    try {
      const r = await fetch('/api/ammo/recycled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id || '' },
        body: JSON.stringify({ caliber: recCaliber, quantity: Number(recQty), date: recDate })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Erro ao registrar reciclado');
      setSuccess(data.message);
      setRecCaliber('');
      setRecQty('');
      await loadAmmoOverview();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingRec(false);
    }
  };

  // Athlete search for allocation
  const handleSearchAthlete = async (q: string) => {
    setAthleteQuery(q);
    if (!q || q.length < 3) {
      setFoundAthletes([]);
      return;
    }
    setSearchingAthletes(true);
    try {
      const r = await fetch(`/api/members/search?q=${encodeURIComponent(q)}`, {
        headers: { 'x-user-id': currentUser?.id || '' }
      });
      const d = await r.json();
      setFoundAthletes(d.members || []);
    } catch (e) {
      console.error(e);
    } finally {
      setSearchingAthletes(false);
    }
  };

  // 4. Submit / Edit Allocation
  const handleAllocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!selectedAthlete) {
      setError('Selecione o atleta que receberá as munições.');
      return;
    }
    if (allocItems.some(i => !i.caliber || !i.quantity || Number(i.quantity) <= 0)) {
      setError('Preencha o calibre e a quantidade de todas as linhas de munição.');
      return;
    }
    setSavingAlloc(true);
    try {
      const isEditing = Boolean(editingAllocId);
      const url = isEditing ? `/api/ammo/allocations/${editingAllocId}` : '/api/ammo/allocations';
      const method = isEditing ? 'PUT' : 'POST';

      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id || '' },
        body: JSON.stringify({
          userId: selectedAthlete.id,
          date: allocDate,
          notes: allocNotes,
          items: allocItems.map(i => ({ caliber: i.caliber, quantity: Number(i.quantity) }))
        })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Erro ao processar atribuição de munições');
      setSuccess(`✅ ${data.message}`);
      setEditingAllocId(null);
      setSelectedAthlete(null);
      setAthleteQuery('');
      setFoundAthletes([]);
      setAllocNotes('');
      setAllocItems([{ caliber: '', quantity: '50' }]);
      await loadAmmoOverview();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingAlloc(false);
    }
  };

  const handleDeleteAllocation = async (allocId: string, athleteName: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir esta atribuição de munições para ${athleteName}? O saldo do atleta será ajustado.`)) return;
    setError(''); setSuccess('');
    try {
      const r = await fetch(`/api/ammo/allocations/${allocId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': currentUser?.id || '' }
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Erro ao excluir atribuição');
      setSuccess(`✅ ${data.message}`);
      if (editingAllocId === allocId) {
        setEditingAllocId(null);
        setSelectedAthlete(null);
        setAthleteQuery('');
        setAllocItems([{ caliber: '', quantity: '50' }]);
      }
      await loadAmmoOverview();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const startEditingAllocation = (al: AmmoAthleteAllocation) => {
    setEditingAllocId(al.id);
    setSelectedAthlete({ id: al.userId, fullName: al.athleteName || 'Atleta', cpf: al.athleteCpf });
    setAllocDate(al.date ? al.date.split('T')[0] : new Date().toISOString().split('T')[0]);
    setAllocNotes(al.notes || '');
    if (al.items && al.items.length > 0) {
      setAllocItems(al.items.map(i => ({ caliber: i.caliber, quantity: String(i.quantity) })));
    } else {
      setAllocItems([{ caliber: '', quantity: '50' }]);
    }
    setError('');
    setSuccess('');
  };

  const cancelEditingAllocation = () => {
    setEditingAllocId(null);
    setSelectedAthlete(null);
    setAthleteQuery('');
    setFoundAthletes([]);
    setAllocNotes('');
    setAllocItems([{ caliber: '', quantity: '50' }]);
  };

  // Compute invoice total
  const totalNfAmount = nfItems.reduce((acc, item) => {
    const q = Number(item.quantity) || 0;
    const u = Number(item.unitPrice) || 0;
    return acc + (q * u);
  }, 0);

  return (
    <div className="space-y-6 text-slate-800 text-left">
      {/* Module Title Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h3 className="font-display font-bold text-slate-900 text-lg flex items-center gap-2">
            <Disc className="w-5 h-5 text-blue-600" />
            Gestão de Munições & Recarga do Clube
          </h3>
          <p className="text-xs text-slate-400">Controle de Notas Fiscais de insumos, estoque principal, produção de pontas recicladas e alocação para atletas.</p>
        </div>
        <button
          onClick={loadAmmoOverview}
          className="text-xs text-blue-600 font-bold bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 self-start sm:self-center"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Atualizar Dados
        </button>
      </div>

      {/* Subtabs Menu Bar */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl overflow-x-auto gap-1 border border-slate-200">
        <button
          type="button"
          onClick={() => { setSubTab('entrada_nf'); setError(''); setSuccess(''); }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition duration-150 whitespace-nowrap cursor-pointer ${subTab === 'entrada_nf' ? 'bg-white text-blue-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
        >
          📄 Entrada NF
        </button>
        <button
          type="button"
          onClick={() => { setSubTab('estoque_recarga'); setError(''); setSuccess(''); }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition duration-150 whitespace-nowrap cursor-pointer ${subTab === 'estoque_recarga' ? 'bg-white text-blue-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
        >
          📦 Estoque / Recarga
        </button>
        <button
          type="button"
          onClick={() => { setSubTab('ponta_reciclado'); setError(''); setSuccess(''); }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition duration-150 whitespace-nowrap cursor-pointer ${subTab === 'ponta_reciclado' ? 'bg-white text-blue-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
        >
          ♻️ Ponta / Reciclado
        </button>
        <button
          type="button"
          onClick={() => { setSubTab('alocar_municoes'); setError(''); setSuccess(''); }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition duration-150 whitespace-nowrap cursor-pointer ${subTab === 'alocar_municoes' ? 'bg-white text-blue-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
        >
          🎯 Atribuir Munições ao atleta
        </button>
      </div>

      {/* Global Alerts */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          {error}
        </div>
      )}

      {/* Modal: Cadastrar Novo Calibre Inline */}
      {showNewCaliberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h4 className="font-bold text-slate-900 text-sm">Cadastrar Novo Calibre</h4>
              <button onClick={() => setShowNewCaliberModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateCaliberSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Nome do Calibre</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 9mm Luger, 380 Auto, 38 SPL, 12 GA..."
                  value={newCaliberInput}
                  onChange={e => setNewCaliberInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs outline-none focus:border-blue-500 font-semibold"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewCaliberModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCaliber || !newCaliberInput.trim()}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-60 cursor-pointer"
                >
                  {savingCaliber ? 'Salvando...' : 'Salvar Calibre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUBTAB 1: ENTRADA NF */}
      {subTab === 'entrada_nf' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
            <div className="pb-3 border-b border-slate-100">
              <h4 className="font-display font-bold text-slate-900 text-sm">Registro de Entrada de Nota Fiscal (Insumos / Munição Nova)</h4>
              <p className="text-xs text-slate-400">Adicione os produtos constantes na Nota Fiscal. Se o produto for "Munição nova", a quantidade entra automaticamente no estoque principal do clube.</p>
            </div>

            <form onSubmit={handleNfSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Número da NF</label>
                  <input
                    type="text"
                    placeholder="Ex: NF-104928"
                    value={nfNumber}
                    onChange={e => setNfNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Fornecedor / Razão Social</label>
                  <input
                    type="text"
                    placeholder="Ex: CBC / Taurus / Imbel / Ammunition Co"
                    value={nfSupplier}
                    onChange={e => setNfSupplier(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Data da Nota</label>
                  <input
                    type="date"
                    required
                    value={nfDate}
                    onChange={e => setNfDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <h5 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Itens / Produtos da Nota Fiscal</h5>
                  <button
                    type="button"
                    onClick={() => handleOpenCaliberModal()}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    + Cadastrar Novo Calibre
                  </button>
                </div>

                <div className="space-y-3">
                  {nfItems.map((item, idx) => {
                    const rowTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                    return (
                      <div key={idx} className="bg-slate-50 border border-slate-200 p-4 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                        <div className="sm:col-span-3 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase block">Produto</label>
                          <select
                            value={item.productType}
                            onChange={e => {
                              const newItems = [...nfItems];
                              newItems[idx].productType = e.target.value as any;
                              setNfItems(newItems);
                            }}
                            className="w-full bg-white border border-slate-200 p-2.5 rounded-lg text-xs font-semibold outline-none"
                          >
                            <option value="espoleta">Espoleta</option>
                            <option value="polvora">Pólvora</option>
                            <option value="ponta_nova">Ponta / Projétil Nova</option>
                            <option value="ponta_reciclada">Ponta / Projétil Reciclada</option>
                            <option value="municao_nova">Munição nova ⭐ (Soma no estoque)</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase block">Unidade de Medida</label>
                          <select
                            value={item.unitMeasure || 'un'}
                            onChange={e => {
                              const newItems = [...nfItems];
                              newItems[idx].unitMeasure = e.target.value as any;
                              setNfItems(newItems);
                            }}
                            className="w-full bg-white border border-slate-200 p-2.5 rounded-lg text-xs font-semibold outline-none"
                          >
                            <option value="un">Unitário (un)</option>
                            <option value="kg">Kilo (kg)</option>
                            <option value="g">Grama (g)</option>
                          </select>
                        </div>

                        <div className="sm:col-span-3 space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block">Calibre</label>
                          </div>
                          <select
                            value={item.caliber}
                            onChange={e => {
                              const newItems = [...nfItems];
                              newItems[idx].caliber = e.target.value;
                              setNfItems(newItems);
                            }}
                            className="w-full bg-white border border-slate-200 p-2.5 rounded-lg text-xs font-semibold outline-none"
                          >
                            <option value="">Selecione o calibre...</option>
                            {calibers.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>

                        <div className="sm:col-span-2 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase block">Quantidade ({item.unitMeasure || 'un'})</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => {
                              const newItems = [...nfItems];
                              newItems[idx].quantity = e.target.value;
                              setNfItems(newItems);
                            }}
                            className="w-full bg-white border border-slate-200 p-2.5 rounded-lg text-xs font-mono font-semibold text-center outline-none"
                          />
                        </div>

                        <div className="sm:col-span-2 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase block">Valor Unit (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unitPrice}
                            onChange={e => {
                              const newItems = [...nfItems];
                              newItems[idx].unitPrice = e.target.value;
                              setNfItems(newItems);
                            }}
                            className="w-full bg-white border border-slate-200 p-2.5 rounded-lg text-xs font-mono font-semibold text-center outline-none"
                          />
                        </div>

                        <div className="sm:col-span-12 flex items-center justify-between sm:justify-end gap-2 pt-1 border-t border-slate-100">
                          <div className="text-right">
                            <span className="text-[9px] text-slate-400 block uppercase font-mono">Total Linha</span>
                            <span className="text-xs font-bold text-slate-900 font-mono">R$ {rowTotal.toFixed(2)}</span>
                          </div>

                          {nfItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setNfItems(nfItems.filter((_, i) => i !== idx));
                              }}
                              className="p-2 text-slate-400 hover:text-red-500 transition cursor-pointer"
                              title="Remover linha"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNfItems([...nfItems, { productType: 'municao_nova', unitMeasure: 'un', caliber: '', quantity: '100', unitPrice: '0.00' }]);
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-2 rounded-xl transition cursor-pointer"
                  >
                    + Adicionar Outro Produto
                  </button>

                  <div className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-mono text-right shadow-sm">
                    <span className="text-[10px] text-slate-400 uppercase block">Total da Nota Fiscal</span>
                    <span className="text-base font-bold text-emerald-400">R$ {totalNfAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={savingNf}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs px-6 py-3 rounded-xl font-bold transition shadow-lg shadow-blue-100 cursor-pointer"
                >
                  {savingNf ? 'Registrando NF...' : 'Registrar Entrada da Nota Fiscal'}
                </button>
              </div>
            </form>
          </div>

          {/* History of Invoices */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <h4 className="font-display font-bold text-slate-900 text-sm">Histórico de Notas Fiscais Registradas ({invoices.length})</h4>
            {invoices.length === 0 ? (
              <p className="text-xs text-slate-400">Nenhuma Nota Fiscal cadastrada ainda.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {invoices.map(inv => (
                  <div key={inv.id} className="py-3 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{inv.invoiceNumber ? `NF Nº ${inv.invoiceNumber}` : 'Sem nº de NF'}</span>
                        <span className="text-slate-500 ml-2">• Fornecedor: {inv.supplier || 'Não informado'}</span>
                        <span className="text-slate-400 ml-2 font-mono">• {new Date(inv.date).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <span className="font-bold font-mono text-emerald-600">R$ {inv.totalAmount.toFixed(2)}</span>
                    </div>

                    {inv.items && inv.items.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {inv.items.map((it, idx) => {
                          const prodLabel = it.productType === 'espoleta' ? 'Espoleta'
                            : it.productType === 'polvora' ? 'Pólvora'
                            : it.productType === 'ponta_reciclada' ? 'Ponta/Projétil Reciclada'
                            : it.productType === 'ponta_nova' || it.productType === 'ponta' ? 'Ponta/Projétil Nova'
                            : 'Munição nova';
                          const unitLabel = it.unitMeasure || 'un';

                          return (
                            <span key={idx} className={`text-[10px] px-2 py-1 rounded-lg border font-mono ${it.productType === 'municao_nova' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                              {prodLabel}: {it.quantity} {unitLabel} ({it.caliber})
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: ESTOQUE / RECARGA */}
      {subTab === 'estoque_recarga' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <div className="pb-3 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h4 className="font-display font-bold text-slate-900 text-sm">Estoque Principal de Munições do Clube (por Calibre)</h4>
                <p className="text-xs text-slate-400">Saldo atualizado com base no Estoque Inicial + Entrada NF (Munição Nova) + Recargas do Clube - Munições Alocadas para Atletas.</p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenCaliberModal()}
                className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition cursor-pointer"
              >
                + Cadastrar Calibre
              </button>
            </div>

            <div className="overflow-x-auto text-xs text-slate-700">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 font-mono text-[10px] text-slate-400 uppercase">
                    <th className="py-2.5 px-2">Calibre</th>
                    <th className="py-2.5 px-2 text-center">Estoque Inicial</th>
                    <th className="py-2.5 px-2 text-center">Entrada NF (Nova)</th>
                    <th className="py-2.5 px-2 text-center">Produção / Recarga</th>
                    <th className="py-2.5 px-2 text-center">Alocado Atletas</th>
                    <th className="py-2.5 px-2 text-right">Saldo Atual Clube</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {caliberStocks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400 text-xs">Nenhum calibre cadastrado no sistema ainda.</td>
                    </tr>
                  ) : (
                    caliberStocks.map(cs => (
                      <tr key={cs.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-2 font-bold text-slate-900">{cs.caliber}</td>
                        <td className="py-3 px-2 text-center font-mono">
                          {cs.hasInitialStockSet ? (
                            <span className="font-semibold text-slate-700">{cs.initialStock} un</span>
                          ) : (
                            <span className="text-[10px] text-amber-600 bg-amber-50 font-bold px-2 py-0.5 rounded-full">Pendente</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-slate-600">+{cs.totalNfNewAmmo} un</td>
                        <td className="py-3 px-2 text-center font-mono text-slate-600">+{cs.totalProduction} un</td>
                        <td className="py-3 px-2 text-center font-mono text-slate-600">-{cs.totalAllocated} un</td>
                        <td className="py-3 px-2 text-right font-mono">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${cs.currentStock > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
                            {cs.currentStock} un
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Form: Estoque Inicial */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <h4 className="font-display font-bold text-slate-900 text-sm">1. Definir Estoque Inicial (Uma Única Vez)</h4>
              <p className="text-xs text-slate-400">Oferece a opção para cadastrar o estoque inicial daquele calibre no clube.</p>

              <form onSubmit={handleInitStockSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Calibre</label>
                  <select
                    value={initStockCaliber}
                    onChange={e => setInitStockCaliber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold outline-none focus:border-blue-500"
                  >
                    <option value="">Selecione o calibre...</option>
                    {caliberStocks.map(c => (
                      <option key={c.caliber} value={c.caliber}>
                        {c.caliber} {c.hasInitialStockSet ? '(Inicial Já Definito)' : '(Pendente de Inicial)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Quantidade do Estoque Inicial</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 5000"
                    value={initStockQty}
                    onChange={e => setInitStockQty(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-mono font-semibold outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingInitStock}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs py-3 rounded-xl font-bold transition shadow-sm cursor-pointer"
                >
                  {savingInitStock ? 'Salvando...' : 'Cadastrar Estoque Inicial'}
                </button>
              </form>
            </div>

            {/* Form: Produção / Recarga Interna */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <h4 className="font-display font-bold text-slate-900 text-sm">2. Entrada de Produção / Recarga de Munições</h4>
              <p className="text-xs text-slate-400">Registra a quantidade de munição recarregada ou produzida pelo clube para somar ao estoque.</p>

              <form onSubmit={handleProductionSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Data da Produção</label>
                  <input
                    type="date"
                    required
                    value={prodDate}
                    onChange={e => setProdDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Calibre</label>
                    <button type="button" onClick={() => handleOpenCaliberModal(c => setProdCaliber(c))} className="text-[10px] font-bold text-blue-600 cursor-pointer">+ Novo</button>
                  </div>
                  <select
                    value={prodCaliber}
                    onChange={e => setProdCaliber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold outline-none focus:border-blue-500"
                  >
                    <option value="">Selecione o calibre...</option>
                    {calibers.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Quantidade Produzida (unidades)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ex: 1000"
                    value={prodQty}
                    onChange={e => setProdQty(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-mono font-semibold outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingProd}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs py-3 rounded-xl font-bold transition shadow-sm cursor-pointer"
                >
                  {savingProd ? 'Registrando...' : 'Registrar Produção de Munição'}
                </button>
              </form>
            </div>
          </div>

          {/* Productions History */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <h4 className="font-display font-bold text-slate-900 text-sm">Histórico de Produção / Recargas Registradas ({productions.length})</h4>
            {productions.length === 0 ? (
              <p className="text-xs text-slate-400">Nenhum lote de recarga cadastrado ainda.</p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {productions.map(p => (
                  <div key={p.id} className="py-2.5 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-900">{p.caliber}</span>
                      <span className="text-slate-400 ml-2 font-mono">• Data: {new Date(p.date).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <span className="font-bold font-mono text-emerald-600">+{p.quantity} un produzidas</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 3: PONTA / RECICLADO */}
      {subTab === 'ponta_reciclado' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Form */}
            <div className="sm:col-span-1 bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <h4 className="font-display font-bold text-slate-900 text-sm">Registrar Produção de Pontas / Projéteis Reciclados</h4>
              <p className="text-xs text-slate-400">Lance a quantidade de pontas/projéteis reciclados pelo estande.</p>

              <form onSubmit={handleRecycledSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Data</label>
                  <input
                    type="date"
                    required
                    value={recDate}
                    onChange={e => setRecDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Calibre</label>
                    <button type="button" onClick={() => handleOpenCaliberModal(c => setRecCaliber(c))} className="text-[10px] font-bold text-blue-600 cursor-pointer">+ Novo</button>
                  </div>
                  <select
                    value={recCaliber}
                    onChange={e => setRecCaliber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold outline-none focus:border-blue-500"
                  >
                    <option value="">Selecione o calibre...</option>
                    {calibers.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Quantidade Produzida</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ex: 500"
                    value={recQty}
                    onChange={e => setRecQty(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-mono font-semibold outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingRec}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs py-3 rounded-xl font-bold transition shadow-sm cursor-pointer"
                >
                  {savingRec ? 'Salvando...' : 'Salvar Registro de Reciclado'}
                </button>
              </form>
            </div>

            {/* Totals & History */}
            <div className="sm:col-span-2 space-y-6">
              {/* Totals per Caliber cards */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-xs">
                <h4 className="font-display font-bold text-slate-900 text-sm">Consolidado Reciclado por Calibre</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.keys(recycledMap).length === 0 ? (
                    <p className="text-xs text-slate-400 sm:col-span-3">Nenhum registro de ponta reciclada efetuado ainda.</p>
                  ) : (
                    Object.entries(recycledMap).map(([cal, total]) => (
                      <div key={cal} className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">{cal}</span>
                        <span className="text-base font-bold text-slate-900 font-mono">{total} un</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* History table */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
                <h4 className="font-display font-bold text-slate-900 text-sm">Lançamentos Recentes ({recycledList.length})</h4>
                {recycledList.length === 0 ? (
                  <p className="text-xs text-slate-400">Nenhum lançamento.</p>
                ) : (
                  <div className="divide-y divide-slate-100 text-xs">
                    {recycledList.map(r => (
                      <div key={r.id} className="py-2.5 flex justify-between items-center">
                        <div>
                          <span className="font-bold text-slate-900">{r.caliber}</span>
                          <span className="text-slate-400 ml-2 font-mono">• Data: {new Date(r.date).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <span className="font-bold font-mono text-blue-600">+{r.quantity} un</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: ATRIBUIR MUNIÇÕES AO ATLETA */}
      {subTab === 'alocar_municoes' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
            <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-start gap-2">
              <div>
                <h4 className="font-display font-bold text-slate-900 text-sm">
                  {editingAllocId ? 'Editar Atribuição de Munições do Clube' : 'Atribuir Munições do clube para o atleta'}
                </h4>
                <p className="text-xs text-slate-400">Ao salvar, a quantidade é deduzida do estoque principal do clube e transferida para o saldo individual do atleta. Quando o atleta registrar treinos do clube, o saldo diminui automaticamente.</p>
              </div>
              {editingAllocId && (
                <button
                  type="button"
                  onClick={cancelEditingAllocation}
                  className="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl cursor-pointer shrink-0"
                >
                  Cancelar Edição
                </button>
              )}
            </div>

            <form onSubmit={handleAllocationSubmit} className="space-y-6">
              {/* Athlete Selection */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">1. Selecionar Atleta Filiado</label>

                {selectedAthlete ? (
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex justify-between items-center">
                    <div>
                      <span className="font-bold text-xs text-blue-900 block">{selectedAthlete.fullName}</span>
                      <span className="text-[10px] text-blue-700 font-mono block">CPF: {selectedAthlete.cpf || 'Não informado'} | CR: {selectedAthlete.crNumber || 'Sem CR'}</span>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold text-blue-800 uppercase">Saldo Atual:</span>
                        {selectedAthlete.ammoBalances && selectedAthlete.ammoBalances.length > 0 ? (
                          selectedAthlete.ammoBalances.map((b, idx) => (
                            <span key={idx} className="text-[10px] font-mono font-bold bg-white text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                              {b.caliber}: {b.balance} un
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-blue-600 italic font-mono">Sem saldo de munições</span>
                        )}
                      </div>
                    </div>
                    {!editingAllocId && (
                      <button
                        type="button"
                        onClick={() => { setSelectedAthlete(null); setAthleteQuery(''); }}
                        className="text-xs text-blue-700 hover:text-red-600 font-bold cursor-pointer"
                      >
                        Trocar Atleta
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Digite o nome ou CPF do atleta (mínimo 3 caracteres)..."
                      value={athleteQuery}
                      onChange={e => handleSearchAthlete(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold outline-none focus:border-blue-500"
                    />

                    {searchingAthletes && (
                      <p className="text-[10px] text-slate-400 mt-1">Buscando atletas...</p>
                    )}

                    {!searchingAthletes && foundAthletes.length > 0 && (
                      <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto divide-y divide-slate-100">
                        {foundAthletes.map(a => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => {
                              setSelectedAthlete(a);
                              setFoundAthletes([]);
                            }}
                            className="w-full text-left p-3 hover:bg-blue-50 transition flex justify-between items-center cursor-pointer"
                          >
                            <div className="space-y-0.5">
                              <span className="font-bold text-xs text-slate-800 block">{a.fullName}</span>
                              <span className="text-[10px] text-slate-400 font-mono block">CPF: {a.cpf || 'Não informado'}</span>
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="text-[9.5px] font-bold text-slate-500 uppercase font-mono">Saldo Atual:</span>
                                {a.ammoBalances && a.ammoBalances.length > 0 ? (
                                  a.ammoBalances.map((b, idx) => (
                                    <span key={idx} className="text-[9.5px] font-mono font-bold bg-slate-100 text-blue-700 px-1.5 py-0.2 rounded">
                                      {b.caliber}: {b.balance} un
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[9.5px] text-slate-400 italic">Sem saldo</span>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">Selecionar</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Data da Atribuição</label>
                  <input
                    type="date"
                    required
                    value={allocDate}
                    onChange={e => setAllocDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Observações / Motivo (opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: Treino oficial de fim de semana"
                    value={allocNotes}
                    onChange={e => setAllocNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Ammo items to allocate */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">2. Linhas de Munições a Atribuir</label>
                  <button
                    type="button"
                    onClick={() => handleOpenCaliberModal()}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    + Cadastrar Novo Calibre
                  </button>
                </div>

                <div className="space-y-3">
                  {allocItems.map((item, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 p-3 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                      <div className="sm:col-span-6 space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Calibre</label>
                        <select
                          value={item.caliber}
                          onChange={e => {
                            const newItems = [...allocItems];
                            newItems[idx].caliber = e.target.value;
                            setAllocItems(newItems);
                          }}
                          className="w-full bg-white border border-slate-200 p-2.5 rounded-lg text-xs font-semibold outline-none"
                        >
                          <option value="">Selecione o calibre...</option>
                          {caliberStocks.map(cs => (
                            <option key={cs.caliber} value={cs.caliber}>
                              {cs.caliber} (Estoque Clube: {cs.currentStock} un)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-4 space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Quantidade (unidades)</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e => {
                            const newItems = [...allocItems];
                            newItems[idx].quantity = e.target.value;
                            setAllocItems(newItems);
                          }}
                          className="w-full bg-white border border-slate-200 p-2.5 rounded-lg text-xs font-mono font-semibold text-center outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2 flex justify-end">
                        {allocItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setAllocItems(allocItems.filter((_, i) => i !== idx))}
                            className="p-2 text-slate-400 hover:text-red-500 transition cursor-pointer"
                            title="Remover linha"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setAllocItems([...allocItems, { caliber: '', quantity: '50' }])}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-2 rounded-xl transition cursor-pointer"
                >
                  + Adicionar Outro Calibre
                </button>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={savingAlloc}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs px-6 py-3 rounded-xl font-bold transition shadow-lg shadow-emerald-100 cursor-pointer"
                >
                  {savingAlloc ? 'Salvando...' : editingAllocId ? 'Atualizar Atribuição' : 'Salvar Atribuição & Transferir Saldo'}
                </button>
              </div>
            </form>
          </div>

          {/* Allocation History */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <h4 className="font-display font-bold text-slate-900 text-sm">Histórico de Atribuições Realizadas ({allocations.length})</h4>
            {allocations.length === 0 ? (
              <p className="text-xs text-slate-400">Nenhuma atribuição realizada ainda.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {allocations.map(al => (
                  <div key={al.id} className="py-3 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-bold text-slate-900 text-sm">{al.athleteName}</span>
                        <span className="text-slate-500 ml-2 font-mono">({al.athleteCpf || 'Sem CPF'})</span>
                        <span className="text-slate-400 ml-2 font-mono">• Data: {new Date(al.date).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startEditingAllocation(al)}
                          className="text-[11px] text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 font-bold px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
                          title="Editar atribuição"
                        >
                          <Pencil className="w-3 h-3" /> Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAllocation(al.id, al.athleteName || 'Atleta')}
                          className="text-[11px] text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 font-bold px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
                          title="Excluir atribuição"
                        >
                          <Trash2 className="w-3 h-3" /> Excluir
                        </button>
                      </div>
                    </div>

                    {al.notes && <p className="text-[11px] text-slate-500 italic">Obs: {al.notes}</p>}

                    {al.items && al.items.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {al.items.map((it, idx) => (
                          <span key={idx} className="bg-blue-50 text-blue-700 border border-blue-200 font-mono text-[10px] px-2 py-0.5 rounded-md font-bold">
                            {it.caliber}: {it.quantity} un
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MultiChampionshipsManager — Painel CRUD de Multicampeonatos
// =============================================================================
interface MultiChampionshipsManagerProps {
  championships: Championship[];
  multiChampionships?: MultiChampionship[];
  currentUser: User | null;
  onRefreshData?: () => Promise<void>;
}

function MultiChampionshipsManager({ championships, multiChampionships = [], currentUser, onRefreshData }: MultiChampionshipsManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedChampIds, setSelectedChampIds] = useState<string[]>([]);
  const [registrationFee, setRegistrationFee] = useState('');
  const [clubRegistrationFee, setClubRegistrationFee] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [pixType, setPixType] = useState('celular');
  const [pixName, setPixName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSelectedChampIds([]);
    setRegistrationFee('');
    setClubRegistrationFee('');
    setPixKey('');
    setPixType('celular');
    setPixName('');
    setWhatsapp('');
    setStatus('active');
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const handleEdit = (multi: MultiChampionship) => {
    setEditingId(multi.id);
    setTitle(multi.title);
    setDescription(multi.description || '');
    setSelectedChampIds(multi.championshipIds || []);
    setRegistrationFee(String(multi.registrationFee || 0));
    setClubRegistrationFee(multi.clubRegistrationFee ? String(multi.clubRegistrationFee) : '');
    setPixKey(multi.pixKey || '');
    setPixType(multi.pixType || 'celular');
    setPixName(multi.pixName || '');
    setWhatsapp(multi.whatsapp || '');
    setStatus(multi.status || 'active');
    setShowForm(true);
    setError('');
  };

  const handleToggleChamp = (champId: string) => {
    setSelectedChampIds(prev =>
      prev.includes(champId) ? prev.filter(id => id !== champId) : [...prev, champId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Título é obrigatório.'); return; }
    if (selectedChampIds.length === 0) { setError('Selecione pelo menos um campeonato.'); return; }
    if (!registrationFee || Number(registrationFee) <= 0) { setError('Informe o valor da inscrição.'); return; }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const url = editingId ? `/api/multi-championships/${editingId}` : '/api/multi-championships';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || ''
        },
        body: JSON.stringify({
          title,
          description: description || undefined,
          championshipIds: selectedChampIds,
          registrationFee: Number(registrationFee),
          clubRegistrationFee: clubRegistrationFee ? Number(clubRegistrationFee) : undefined,
          pixKey: pixKey || undefined,
          pixType: pixType || undefined,
          pixName: pixName || undefined,
          whatsapp: whatsapp || undefined,
          status
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar multicampeonato.');

      setSuccess(editingId ? 'Multicampeonato atualizado!' : 'Multicampeonato criado com sucesso!');
      resetForm();
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente remover este multicampeonato?')) return;
    try {
      const res = await fetch(`/api/multi-championships/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': currentUser?.id || '' }
      });
      if (!res.ok) throw new Error('Erro ao remover multicampeonato');
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 text-slate-800">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-display font-bold text-slate-900 text-base">Gerenciamento de Multi-campeonatos</h3>
            <p className="text-xs text-slate-400">Crie pacotes de campeonatos com valor único de inscrição.</p>
          </div>
          <button
            onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            {showForm ? <X className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
            {showForm ? 'Cancelar' : 'Novo Multi-campeonato'}
          </button>
        </div>

        {success && <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-1.5"><CheckCircle className="w-4 h-4" />{success}</div>}
        {error && <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-semibold">{error}</div>}

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-slate-50/70 p-5 border border-slate-200 rounded-2xl space-y-4">
            <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
              {editingId ? 'Editar Multi-campeonato' : 'Cadastrar Novo Multi-campeonato'}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <ChampField label="Nome do Multi-campeonato" value={title} onChange={setTitle} placeholder="Ex: Grupo 2026 de Campeonatos" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Descrição / Instruções (Opcional)</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Instruções para o atleta ao se inscrever neste pacote..."
                  className="w-full bg-white border border-slate-200 outline-none p-3 rounded-xl text-xs text-slate-700 h-20"
                />
              </div>

              <div className="sm:col-span-2 space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Selecione os Campeonatos Incluídos ({selectedChampIds.length})</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 bg-white border border-slate-200 rounded-xl">
                  {championships.map(c => {
                    const isChecked = selectedChampIds.includes(c.id);
                    return (
                      <label key={c.id} className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition ${isChecked ? 'bg-blue-50/60 border-blue-200 text-blue-900 font-bold' : 'border-slate-100 hover:bg-slate-50 text-slate-700'}`}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleChamp(c.id)}
                          className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                        />
                        <span>{c.title}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <ChampField label="Valor Inscrição Única Atleta (R$)" type="number" value={registrationFee} onChange={setRegistrationFee} placeholder="150.00" />
              <ChampField label="Valor Inscrição Clube (R$)" type="number" value={clubRegistrationFee} onChange={setClubRegistrationFee} placeholder="Opcional" />

              <div className="sm:col-span-2 pt-2 border-t border-slate-200">
                <h5 className="font-bold text-[11px] text-slate-600 uppercase mb-2">Dados PIX para Pagamento</h5>
              </div>

              <ChampSelect label="Tipo de PIX" value={pixType} onChange={setPixType} options={[
                { value: 'celular', label: 'Celular' }, { value: 'cpf', label: 'CPF' }, { value: 'cnpj', label: 'CNPJ' }, { value: 'aleatoria', label: 'Chave Aleatória' }
              ]} />
              <ChampField label="Chave PIX" value={pixKey} onChange={setPixKey} placeholder="Sua chave PIX" />
              <ChampField label="Nome Exibido no PIX" value={pixName} onChange={setPixName} placeholder="Razão social / Nome" />
              <ChampField label="WhatsApp para Comprovante" value={whatsapp} onChange={setWhatsapp} placeholder="61999998888" />

              <ChampSelect label="Status" value={status} onChange={v => setStatus(v as 'active' | 'inactive')} options={[
                { value: 'active', label: 'Ativo' }, { value: 'inactive', label: 'Inativo' }
              ]} />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition shadow-sm cursor-pointer"
              >
                {saving ? 'Salvando...' : editingId ? 'Atualizar Multi-campeonato' : 'Criar Multi-campeonato'}
              </button>
            </div>
          </form>
        )}

        {/* Multi-championships List */}
        <div className="space-y-4">
          <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Multicampeonatos Cadastrados ({multiChampionships.length})</h4>
          {multiChampionships.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              Nenhum multicampeonato cadastrado ainda. Crie o primeiro clicando no botão acima.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {multiChampionships.map(m => {
                const includedChamps = championships.filter(c => m.championshipIds.includes(c.id));
                return (
                  <div key={m.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 hover:bg-slate-50 transition space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-150 pb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-slate-900 text-sm">{m.title}</h5>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                            {m.status === 'active' ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        {m.description && <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-blue-700 text-sm">R$ {Number(m.registrationFee).toFixed(2)}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(m)}
                            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(m.id)}
                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">Campeonatos Incluídos ({includedChamps.length}):</p>
                      <div className="flex flex-wrap gap-1.5">
                        {includedChamps.map(ic => (
                          <span key={ic.id} className="bg-white border border-slate-200 text-slate-700 text-[11px] font-medium px-2.5 py-1 rounded-md shadow-2xs flex items-center gap-1">
                            <Trophy className="w-3 h-3 text-amber-500" /> {ic.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminPanel({
  currentUser,
  championships,
  registrations,
  stageScores,
  stages,
  users,
  posts = [],
  weapons,
  weaponLookupOptions,
  modalities,
  onAddWeapon,
  onRemoveWeapon,
  onUpdateWeapon,
  onAddWeaponLookup,
  onUpdateWeaponLookup,
  onRemoveWeaponLookup,
  onAddModality,
  onRemoveModality,
  onCreateChampionship,
  onUpdateChampionship,
  onRemoveChampionship,
  onUploadChampionshipDocument,
  onAddStage,
  onUpdateStage,
  onRemoveStage,
  onRecordScore,
  onToggleAdminDemo,
  onRefreshData,
  settings = {},
  onSaveSetting,
  onCreateMember,
  onUpdateMemberProfile,
  onUploadMemberDocument,
  clubs,
  onCreateClub,
  onUpdateClub,
  multiChampionships = []
}: AdminPanelProps) {
  const modalityName = (id: string) => modalities.find(m => m.id === id)?.name || id;

  // User's own photos uploaded/posted in the system
  const myUserPhotos = React.useMemo(() => {
    if (!currentUser || !posts) return [];
    const urls: string[] = [];
    posts.filter(p => p.userId === currentUser.id).forEach(p => {
      if (p.imageUrls && p.imageUrls.length > 0) {
        p.imageUrls.forEach(u => {
          if (u && !urls.includes(u)) urls.push(u);
        });
      } else if (p.imageUrl && !urls.includes(p.imageUrl)) {
        urls.push(p.imageUrl);
      }
    });
    return urls;
  }, [currentUser, posts]);
  const DEFAULT_CLUB_WEAPON = { weaponNumber: '', sigmaNumber: '', weaponClass: '', model: '', caliber: '', manufacturer: '', registrySystem: '', permissionStatus: '' };
  const [newClubWeapon, setNewClubWeapon] = useState(DEFAULT_CLUB_WEAPON);
  const [savingClubWeapon, setSavingClubWeapon] = useState(false);

  const handleSaveClubWeapon = async () => {
    if (!newClubWeapon.manufacturer || !newClubWeapon.model || !newClubWeapon.caliber || !currentUser?.clubId) return;
    setSavingClubWeapon(true);
    try {
      await onAddWeapon({ ownerId: currentUser.clubId, ...newClubWeapon });
      setNewClubWeapon(DEFAULT_CLUB_WEAPON);
    } finally {
      setSavingClubWeapon(false);
    }
  };

  // Weapon edit inline
  const [editingWeaponId, setEditingWeaponId] = useState<string | null>(null);
  const [editWeaponData, setEditWeaponData] = useState(DEFAULT_CLUB_WEAPON);
  const [savingWeaponEdit, setSavingWeaponEdit] = useState(false);
  const [weaponEditError, setWeaponEditError] = useState('');

  const handleSaveWeaponEdit = async () => {
    if (!editingWeaponId) return;
    setSavingWeaponEdit(true);
    setWeaponEditError('');
    const result = await onUpdateWeapon(editingWeaponId, editWeaponData);
    setSavingWeaponEdit(false);
    if (result.error) {
      setWeaponEditError(result.error);
    } else {
      setEditingWeaponId(null);
    }
  };



  const weaponLookup = (kind: string) => weaponLookupOptions.filter(o => o.kind === kind);

  const [newModality, setNewModality] = useState({ name: '', seriesCount: '', shotsPerSeries: '', timePerSeriesMinutes: '', evaluationType: '' });
  const [savingModality, setSavingModality] = useState(false);
  const [modalityError, setModalityError] = useState('');

  const handleSaveModality = async () => {
    if (!newModality.name) return;
    setSavingModality(true);
    setModalityError('');
    try {
      await onAddModality({
        name: newModality.name,
        seriesCount: newModality.seriesCount ? Number(newModality.seriesCount) : undefined,
        shotsPerSeries: newModality.shotsPerSeries ? Number(newModality.shotsPerSeries) : undefined,
        timePerSeriesMinutes: newModality.timePerSeriesMinutes ? Number(newModality.timePerSeriesMinutes) : undefined,
        evaluationType: newModality.evaluationType || undefined
      });
      setNewModality({ name: '', seriesCount: '', shotsPerSeries: '', timePerSeriesMinutes: '', evaluationType: '' });
    } catch (err: any) {
      setModalityError(err.message || 'Erro ao cadastrar modalidade.');
    } finally {
      setSavingModality(false);
    }
  };

  const handleDeleteModality = async (modalityId: string) => {
    setModalityError('');
    try {
      await onRemoveModality(modalityId);
    } catch (err: any) {
      setModalityError(err.message || 'Erro ao remover modalidade.');
    }
  };

  // Cadastro completo de etapas — one form reused for both create and edit
  // (select a stage from the list below to load it back into the form).
  const DEFAULT_STAGE_FORM = {
    championshipId: '', title: '', description: '', date: '', endDate: '', sexo: '',
    homologarResultado: '', abertoParaResultados: '', gerarCertificados: '',
    fatorMultiplicacaoResultados: '1', exibirInscritosPaginaInicial: '', incluirNaSomaPaginaInicial: ''
  };
  const [stageForm, setStageForm] = useState(DEFAULT_STAGE_FORM);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [showCreateStageForm, setShowCreateStageForm] = useState(false);
  const [savingStage, setSavingStage] = useState(false);
  const [stageError, setStageError] = useState('');

  const handleSubmitStage = async (e: React.FormEvent) => {
    e.preventDefault();
    setStageError('');
    if (!stageForm.championshipId || !stageForm.title || !stageForm.date) return;
    setSavingStage(true);
    try {
      const payload = {
        championshipId: stageForm.championshipId,
        title: stageForm.title,
        date: stageForm.date,
        description: stageForm.description || undefined,
        endDate: stageForm.endDate || undefined,
        sexo: (stageForm.sexo || undefined) as any,
        homologarResultado: (stageForm.homologarResultado || undefined) as any,
        abertoParaResultados: (stageForm.abertoParaResultados || undefined) as any,
        gerarCertificados: (stageForm.gerarCertificados || undefined) as any,
        fatorMultiplicacaoResultados: stageForm.fatorMultiplicacaoResultados ? Number(stageForm.fatorMultiplicacaoResultados) : undefined,
        exibirInscritosPaginaInicial: (stageForm.exibirInscritosPaginaInicial || undefined) as any,
        incluirNaSomaPaginaInicial: (stageForm.incluirNaSomaPaginaInicial || undefined) as any,
      };
      const result = editingStageId ? await onUpdateStage(editingStageId, payload) : await onAddStage(payload);
      if (!result.stage) {
        setStageError(result.error || 'Erro ao salvar etapa.');
        return;
      }
      setStageForm(DEFAULT_STAGE_FORM);
      setEditingStageId(null);
      setShowCreateStageForm(false);
    } finally {
      setSavingStage(false);
    }
  };

  const startEditingStage = (s: Stage) => {
    setEditingStageId(s.id);
    setStageForm({
      championshipId: s.championshipId,
      title: s.title,
      description: s.description || '',
      date: s.date.split('T')[0],
      endDate: (s.endDate || '').split('T')[0],
      sexo: s.sexo || '',
      homologarResultado: s.homologarResultado || '',
      abertoParaResultados: s.abertoParaResultados || '',
      gerarCertificados: s.gerarCertificados || '',
      fatorMultiplicacaoResultados: s.fatorMultiplicacaoResultados !== undefined ? String(s.fatorMultiplicacaoResultados) : '1',
      exibirInscritosPaginaInicial: s.exibirInscritosPaginaInicial || '',
      incluirNaSomaPaginaInicial: s.incluirNaSomaPaginaInicial || '',
    });
    setStageError('');
  };

  const cancelEditingStage = () => {
    setEditingStageId(null);
    setShowCreateStageForm(false);
    setStageForm(DEFAULT_STAGE_FORM);
    setStageError('');
  };

  const handleDeleteStage = async (stageId: string) => {
    setStageError('');
    const result = await onRemoveStage(stageId);
    if (result.error) setStageError(result.error);
  };

  // Main tabs: 'clube' | 'plataforma' | 'master'
  const [mainTab, setMainTab] = useState<'clube' | 'plataforma' | 'master'>('clube');

  // Sidebar Menu selection for Clube
  const [clubeMenu, setClubeMenu] = useState<string>('campeonatos');

  // Seleção de filtros para a tela de resultados
  const [selectedResultChampId, setSelectedResultChampId] = useState<string | null>(null);
  const [selectedResultStageId, setSelectedResultStageId] = useState<string | null>(null);
  const [selectedResultModalityId, setSelectedResultModalityId] = useState<string | null>(null);
  const [selectedMedalFilter, setSelectedMedalFilter] = useState<'geral' | 'ouro' | 'prata' | 'bronze'>('geral');

  useEffect(() => {
    if (clubeMenu !== 'resultados') {
      setSelectedResultChampId(null);
      setSelectedResultStageId(null);
      setSelectedResultModalityId(null);
    }
  }, [clubeMenu]);

  useEffect(() => {
    setSelectedMedalFilter('geral');
  }, [selectedResultChampId, selectedResultStageId, selectedResultModalityId]);

  // Sidebar Menu selection for Plataforma
  const [plataformaMenu, setPlataformaMenu] = useState<string>('novo_campeonato');

  useEffect(() => {
    if (plataformaMenu !== 'novo_campeonato') {
      setShowCreateForm(false);
      setEditingChampId(null);
    }
    if (plataformaMenu !== 'etapas') {
      setShowCreateStageForm(false);
      setEditingStageId(null);
    }
  }, [plataformaMenu]);

  // Sidebar Menu selection for Master
  const [masterMenu, setMasterMenu] = useState<string>('gerenciar_clubes');

  // Gerenciar Listas de Armas (Administrador master only)
  const WEAPON_LOOKUP_KINDS: { value: WeaponLookupOption['kind']; label: string }[] = [
    { value: 'classe', label: 'Classe' },
    { value: 'modelo', label: 'Modelo' },
    { value: 'calibre', label: 'Calibre' },
    { value: 'fabricante', label: 'Fabricante' },
    { value: 'tipo_arma', label: 'Arma é' },
    { value: 'permissao_arma', label: 'Status de permissão' },
  ];
  const [lookupKind, setLookupKind] = useState<WeaponLookupOption['kind']>('classe');
  const [newLookupLabel, setNewLookupLabel] = useState('');
  const [savingLookup, setSavingLookup] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [editingLookupId, setEditingLookupId] = useState<string | null>(null);
  const [editingLookupLabel, setEditingLookupLabel] = useState('');

  const handleAddLookupItem = async () => {
    if (!newLookupLabel.trim()) return;
    setSavingLookup(true);
    setLookupError('');
    const result = await onAddWeaponLookup(lookupKind, newLookupLabel.trim());
    setSavingLookup(false);
    if (result.error) {
      setLookupError(result.error);
    } else {
      setNewLookupLabel('');
    }
  };

  const startEditingLookup = (o: WeaponLookupOption) => {
    setEditingLookupId(o.id);
    setEditingLookupLabel(o.label);
    setLookupError('');
  };

  const handleSaveLookupEdit = async () => {
    if (!editingLookupId || !editingLookupLabel.trim()) return;
    const result = await onUpdateWeaponLookup(editingLookupId, editingLookupLabel.trim());
    if (result.error) {
      setLookupError(result.error);
    } else {
      setEditingLookupId(null);
      setEditingLookupLabel('');
    }
  };

  const handleDeleteLookupItem = async (id: string) => {
    setLookupError('');
    const result = await onRemoveWeaponLookup(id);
    if (result.error) setLookupError(result.error);
  };

  // Master mock states
  const [masterClubs, setMasterClubs] = useState([
    { id: '1', name: 'Unidade Sede (Brasília)', location: 'Brasília - DF', shootersCount: 142, status: 'Ativo', president: 'Guilherme Guedes' },
    { id: '2', name: 'G&G Sobradinho', location: 'Sobradinho - DF', shootersCount: 68, status: 'Ativo', president: 'Gabriel Guedes' },
    { id: '3', name: 'G&G Taguatinga', location: 'Taguatinga - DF', shootersCount: 54, status: 'Ativo', president: 'Carlos Souza' },
    { id: '4', name: 'Estande Alvo Certo (Pendente)', location: 'Goiânia - GO', shootersCount: 0, status: 'Pendente', president: 'Roberto Silva' },
  ]);

  // Synchronize masterClubs with real clubs from database
  React.useEffect(() => {
    if (clubs) {
      setMasterClubs(prevMasterClubs => {
        return clubs.map(c => {
          const existing = prevMasterClubs.find(mc => mc.id === c.id);
          const status = existing ? existing.status : (c.isPremium ? 'Ativo' : 'Pendente');
          const location = (c.city && c.state) ? `${c.city} - ${c.state}` : 'Não Informada';
          const shootersCount = users.filter(u => u.clubId === c.id && u.role === 'member').length;
          return {
            id: c.id,
            name: c.name,
            location,
            shootersCount,
            status,
            president: c.responsibleName || 'Não Informado'
          };
        });
      });
    }
  }, [clubs, users]);

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
    site: false,
    integracoes: true
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Create championship state (functional)
  const [champTitle, setChampTitle] = useState('');
  const [champDesc, setChampDesc] = useState('');
  const [champStart, setChampStart] = useState('2026-07-01');
  const [champEnd, setChampEnd] = useState('2026-09-15');
  const [champFee, setChampFee] = useState(100);
  const [selectedMods, setSelectedMods] = useState<string[]>([]);
  const [champStages, setChampStages] = useState(4);
  const [champBanner, setChampBanner] = useState('');
  const [champImageSourceMode, setChampImageSourceMode] = useState<'url' | 'upload' | 'gallery'>('gallery');
  const [createSuccess, setCreateSuccess] = useState(false);
  const [champExtra, setChampExtra] = useState<ChampExtraState>(DEFAULT_CHAMP_EXTRA);
  const [champRegulamentoFile, setChampRegulamentoFile] = useState<File | null>(null);
  const [champSumulaFile, setChampSumulaFile] = useState<File | null>(null);
  const [champError, setChampError] = useState('');

  const [showCreateForm, setShowCreateForm] = useState(false);

  // Edit championship state (functional)
  const [editingChampId, setEditingChampId] = useState<string | null>(null);
  const [editChampTitle, setEditChampTitle] = useState('');
  const [editChampDesc, setEditChampDesc] = useState('');
  const [editChampStart, setEditChampStart] = useState('');
  const [editChampEnd, setEditChampEnd] = useState('');
  const [editChampFee, setEditChampFee] = useState(100);
  const [editSelectedMods, setEditSelectedMods] = useState<string[]>([]);
  const [editChampStages, setEditChampStages] = useState(4);
  const [editChampBanner, setEditChampBanner] = useState('');
  const [editChampImageSourceMode, setEditChampImageSourceMode] = useState<'url' | 'upload' | 'gallery'>('gallery');
  const [editSuccess, setEditSuccess] = useState(false);
  const [editChampExtra, setEditChampExtra] = useState<ChampExtraState>(DEFAULT_CHAMP_EXTRA);
  const [editChampRegulamentoFile, setEditChampRegulamentoFile] = useState<File | null>(null);
  const [editChampSumulaFile, setEditChampSumulaFile] = useState<File | null>(null);
  const [editChampError, setEditChampError] = useState('');

  // View registered athletes popup state
  const [selectedChampForInscritosModal, setSelectedChampForInscritosModal] = useState<Championship | null>(null);
  const [inscritosSearchQuery, setInscritosSearchQuery] = useState('');

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
  // Member signup — "Cadastrar Membros": quick-create a member, then
  // progressively complete their profile the same way "Meu Cadastro" does.
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [createMemberForm, setCreateMemberForm] = useState({ fullName: '', cpf: '', email: '', password: '' });
  const [creatingMember, setCreatingMember] = useState(false);
  const [createMemberError, setCreateMemberError] = useState('');

  const [memberEditForm, setMemberEditForm] = useState({
    fullName: '', birthDate: '', sex: '', rg: '', rgIssuer: '', rgIssueDate: '',
    fatherName: '', motherName: '', crNumber: '', crValidity: '', militaryRegion: '', nationality: '',
    phone: '', cep: '', address: '', addressNumber: '', complement: '', neighborhood: '', city: '', state: '',
    guiaTransitoExpiry: '', signatureExpiry: ''
  });
  const [memberSavingSection, setMemberSavingSection] = useState<string | null>(null);
  const [memberSavedSection, setMemberSavedSection] = useState<string | null>(null);

  const clubMembers = users.filter(u => u.clubId === currentUser?.clubId && u.role === 'member');
  const selectedMember = clubMembers.find(m => m.id === selectedMemberId) || null;

  useEffect(() => {
    if (!selectedMember) return;
    setMemberEditForm({
      fullName: selectedMember.fullName || '',
      birthDate: selectedMember.birthDate || '',
      sex: selectedMember.sex || '',
      rg: selectedMember.rg || '',
      rgIssuer: selectedMember.rgIssuer || '',
      rgIssueDate: selectedMember.rgIssueDate || '',
      fatherName: selectedMember.fatherName || '',
      motherName: selectedMember.motherName || '',
      crNumber: selectedMember.crNumber || '',
      crValidity: selectedMember.crValidity || '',
      militaryRegion: selectedMember.militaryRegion || '',
      nationality: selectedMember.nationality || '',
      phone: selectedMember.phone || '',
      cep: selectedMember.cep || '',
      address: selectedMember.address || '',
      addressNumber: selectedMember.addressNumber || '',
      complement: selectedMember.complement || '',
      neighborhood: selectedMember.neighborhood || '',
      city: selectedMember.city || '',
      state: selectedMember.state || '',
      guiaTransitoExpiry: selectedMember.guiaTransitoExpiry || '',
      signatureExpiry: selectedMember.signatureExpiry ? selectedMember.signatureExpiry.split('T')[0] : ''
    });
  }, [selectedMember?.id]);

  const handleCreateMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateMemberError('');
    setCreatingMember(true);
    const result = await onCreateMember(createMemberForm);
    setCreatingMember(false);
    if (result.user) {
      setCreateMemberForm({ fullName: '', cpf: '', email: '', password: '' });
      setSelectedMemberId(result.user.id);
    } else {
      setCreateMemberError(result.error || 'Erro ao cadastrar membro.');
    }
  };

  // "Novo Clube" (Gerenciamento Plataforma) — quick-create a club plus its
  // club_admin login; the club later completes endereço/documentos itself
  // through the same PATCH /api/clubs/:id used by "Meu Cadastro".
  // "Novo Clube" (Gerenciamento Plataforma) — create & edit clubs
  const [createClubForm, setCreateClubForm] = useState({
    name: '', cnpj: '', responsibleName: '', email: '', password: '', phone: '', crNumber: '',
    cep: '', address: '', addressNumber: '', complement: '', neighborhood: '', city: '', state: ''
  });
  const [creatingClub, setCreatingClub] = useState(false);
  const [createClubError, setCreateClubError] = useState('');
  const [createClubSuccess, setCreateClubSuccess] = useState(false);

  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [editingClubForm, setEditingClubForm] = useState({
    name: '', cnpj: '', crNumber: '', responsibleName: '', email: '', phone: '',
    cep: '', address: '', addressNumber: '', complement: '', neighborhood: '', city: '', state: ''
  });
  const [savingEditClub, setSavingEditClub] = useState(false);
  const [editClubError, setEditClubError] = useState('');
  const [editClubSuccess, setEditClubSuccess] = useState(false);

  const handleCreateClubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateClubError('');
    setCreatingClub(true);
    const result = await onCreateClub(createClubForm);
    setCreatingClub(false);
    if (result.club) {
      setCreateClubForm({ name: '', cnpj: '', responsibleName: '', email: '', password: '', phone: '', crNumber: '', cep: '', address: '', addressNumber: '', complement: '', neighborhood: '', city: '', state: '' });
      setCreateClubSuccess(true);
      setTimeout(() => setCreateClubSuccess(false), 2500);
      if (onRefreshData) await onRefreshData();
    } else {
      setCreateClubError(result.error || 'Erro ao cadastrar clube.');
    }
  };

  const startEditingClub = (club: Club) => {
    setEditingClub(club);
    setEditClubError('');
    setEditClubSuccess(false);
    setEditingClubForm({
      name: club.name || '',
      cnpj: club.cnpj || '',
      crNumber: club.crNumber || '',
      responsibleName: club.responsibleName || '',
      email: club.email || '',
      phone: club.phone || '',
      cep: club.cep || '',
      address: club.address || '',
      addressNumber: club.addressNumber || '',
      complement: club.complement || '',
      neighborhood: club.neighborhood || '',
      city: club.city || '',
      state: club.state || ''
    });
  };

  const handleSaveEditClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClub || !onUpdateClub) return;
    setSavingEditClub(true);
    setEditClubError('');
    setEditClubSuccess(false);
    const ok = await onUpdateClub(editingClub.id, editingClubForm);
    setSavingEditClub(false);
    if (ok) {
      setEditClubSuccess(true);
      setTimeout(() => {
        setEditClubSuccess(false);
        setEditingClub(null);
      }, 1200);
      if (onRefreshData) await onRefreshData();
    } else {
      setEditClubError('Erro ao atualizar cadastro do clube.');
    }
  };

  const saveMemberSection = async (sectionId: string, fields: Record<string, string>) => {
    if (!selectedMemberId) return;
    setMemberSavingSection(sectionId);
    setMemberSavedSection(null);
    const ok = await onUpdateMemberProfile(selectedMemberId, fields);
    setMemberSavingSection(null);
    if (ok) {
      setMemberSavedSection(sectionId);
      setTimeout(() => setMemberSavedSection(null), 2500);
    }
  };

  const uploadMemberDoc = async (kind: string, file: File) => {
    if (!selectedMemberId) return;
    await onUploadMemberDocument(selectedMemberId, kind, file);
  };


  // Weapon Concession — real form
  const [cessaoAtletaQuery, setCessaoAtletaQuery] = useState('');
  const [cessaoAtletaResults, setCessaoAtletaResults] = useState<Array<{id:string;fullName:string;cpf:string;crNumber:string}>>([]);
  const [cessaoAtletaSelecionado, setCessaoAtletaSelecionado] = useState<{id:string;fullName:string;cpf:string;crNumber:string}|null>(null);
  const [cessaoArmaQuery, setCessaoArmaQuery] = useState('');
  const [cessaoArmaResults, setCessaoArmaResults] = useState<any[]>([]);
  const [cessaoArmaSelecionada, setCessaoArmaSelecionada] = useState<any|null>(null);
  const [cessaoDataInicio, setCessaoDataInicio] = useState('');
  const [cessaoDataFim, setCessaoDataFim] = useState('');
  const [cessaoSaving, setCessaoSaving] = useState(false);
  const [cessaoSalva, setCessaoSalva] = useState<any|null>(null);
  const [cessaoError, setCessaoError] = useState('');
  const [cessaoPdfOpen, setCessaoPdfOpen] = useState(false);

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
    setChampError('');
    if (!champTitle || selectedMods.length === 0) return;

    const result = await onCreateChampionship({
      title: champTitle,
      description: champTitle,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      registrationFee: 0,
      modalities: selectedMods,
      stagesCount: Number(champStages),
      bannerUrl: champBanner || undefined,
      ...extraStateToPayload(champExtra)
    });

    if (!result.championship) {
      setChampError(result.error || 'Erro ao criar campeonato.');
      return;
    }

    if (champRegulamentoFile) await onUploadChampionshipDocument(result.championship.id, 'regulamento', champRegulamentoFile);
    if (champSumulaFile) await onUploadChampionshipDocument(result.championship.id, 'sumula', champSumulaFile);

    setCreateSuccess(true);
    setChampTitle('');
    setChampDesc('');
    setChampBanner('');
    setSelectedMods([]);
    setChampExtra(DEFAULT_CHAMP_EXTRA);
    setChampRegulamentoFile(null);
    setChampSumulaFile(null);
    setTimeout(() => setCreateSuccess(false), 3000);
  };

  const handleUpdateChamp = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditChampError('');
    if (!editingChampId || !editChampTitle || editSelectedMods.length === 0 || !onUpdateChampionship) return;

    const result = await onUpdateChampionship(editingChampId, {
      title: editChampTitle,
      description: editChampTitle,
      startDate: editChampStart || new Date().toISOString().split('T')[0],
      endDate: editChampEnd || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      registrationFee: 0,
      modalities: editSelectedMods,
      stagesCount: Number(editChampStages),
      bannerUrl: editChampBanner || undefined,
      ...extraStateToPayload(editChampExtra)
    });

    if (!result.championship) {
      setEditChampError(result.error || 'Erro ao atualizar campeonato.');
      return;
    }

    if (editChampRegulamentoFile) await onUploadChampionshipDocument(editingChampId, 'regulamento', editChampRegulamentoFile);
    if (editChampSumulaFile) await onUploadChampionshipDocument(editingChampId, 'sumula', editChampSumulaFile);

    setEditSuccess(true);
    setEditingChampId(null);
    setEditChampBanner('');
    setEditChampRegulamentoFile(null);
    setEditChampSumulaFile(null);
    setTimeout(() => setEditSuccess(false), 3000);
  };

  const handleSaveDefaultImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDefaultImage || !onSaveSetting) return;

    await onSaveSetting('default_image', newDefaultImage);
    setDefaultImageSuccess(true);
    setTimeout(() => setDefaultImageSuccess(false), 3000);
  };


  const editingChamp = championships.find(c => c.id === editingChampId) || null;

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
    setEditChampExtra(championshipToExtraState(champ));
    setEditChampRegulamentoFile(null);
    setEditChampSumulaFile(null);
    setEditChampError('');
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

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'master_admin' || currentUser?.role === 'club_admin';

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
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs text-slate-800 text-left">
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
                    <th className="py-3 px-2 text-center">Inscritos</th>
                    <th className="py-3 px-2 text-center">Arrecadação</th>
                    <th className="py-3 px-2 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {championships.map((champ) => {
                    const champRegs = registrations.filter(r => r.championshipId === champ.id);
                    const totalArrecadacao = champRegs.reduce((acc, r) => {
                      if (r.valorPago && r.valorPago > 0 && r.valorPago !== 120) return acc + r.valorPago;
                      if (r.registrationType === 'reinscrição') {
                        return acc + (champ.valorReinscricao ?? champ.registrationFee ?? 0);
                      }
                      if (r.registeredByUserId && r.registeredByUserId !== r.userId) {
                        return acc + (champ.valorInscricaoClube ?? champ.registrationFee ?? 0);
                      }
                      return acc + (champ.valorInscricaoIndividual ?? champ.registrationFee ?? 0);
                    }, 0);

                    return (
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
                        <td className="py-3 px-2 text-center font-bold font-mono">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedChampForInscritosModal(champ);
                              setInscritosSearchQuery('');
                            }}
                            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-bold outline-none"
                            title="Ver listagem de inscritos"
                          >
                            {champRegs.length}
                          </button>
                        </td>
                        <td className="py-3 px-2 text-center font-bold font-mono text-emerald-600">
                          R$ {totalArrecadacao.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <div className="flex justify-center items-center gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                if (confirm(`Deseja realmente excluir o campeonato "${champ.title}"?\nEsta ação é irreversível e excluirá as etapas vazias vinculadas.`)) {
                                  try {
                                    await onRemoveChampionship(champ.id);
                                    alert('Campeonato excluído com sucesso!');
                                  } catch (err: any) {
                                    alert(err.message || 'Erro ao excluir campeonato.');
                                  }
                                }
                              }}
                              className="text-red-500 hover:text-red-700 transition p-1.5 hover:bg-red-50 rounded-lg cursor-pointer inline-flex items-center justify-center"
                              title="Excluir Campeonato"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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
          <MultiChampionshipsManager
            championships={championships}
            multiChampionships={multiChampionships}
            currentUser={currentUser}
            onRefreshData={onRefreshData}
          />
        );

      case 'resultados':
        return (
          <CompetitionResultsViewer
            championships={championships}
            stages={stages}
            modalities={modalities}
            registrations={registrations}
            stageScores={stageScores}
            clubs={clubs}
            users={users}
            currentUser={currentUser}
          />
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
        return <CadastrarResultadosPanel
          championships={championships}
          stages={stages}
          modalities={modalities}
          currentUser={currentUser}
          onRecordScore={onRecordScore}
          onRefreshData={onRefreshData}
          isPlataformaScope={false}
        />;

      case 'inscricao_clube':
        return <InscricaoClubePanel
          championships={championships}
          stages={stages}
          modalities={modalities}
          currentUser={currentUser}
        />;


      case 'certificados':
        return (
          <ClubCertificatesViewer
            currentUser={currentUser}
            clubs={clubs}
            users={users}
            registrations={registrations}
            championships={championships}
            stages={stages}
            stageScores={stageScores}
            modalities={modalities}
          />
        );

      case 'cadastrar_membros':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-display font-bold text-slate-900 text-base">
                    {selectedMember ? `Editando: ${selectedMember.fullName}` : 'Cadastrar Novo Sócio / Atleta'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedMember
                      ? 'Complete os dados quando puder — cada seção é salva de forma independente.'
                      : 'Crie o login do atleta; o resto do cadastro pode ser completado depois.'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {selectedMember && (
                    <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1 ${selectedMember.isProfileComplete ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}>
                      {selectedMember.isProfileComplete ? 'Cadastro completo' : 'Cadastro incompleto'}
                    </span>
                  )}
                  <UserPlus className="w-5 h-5 text-blue-600" />
                </div>
              </div>

              {selectedMember ? (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setSelectedMemberId(null)}
                    className="text-blue-600 hover:text-blue-700 text-xs font-bold cursor-pointer"
                  >
                    + Cadastrar outro membro
                  </button>

                  <MemberSection
                    title="Dados Cadastrais"
                    onSave={() => saveMemberSection('member_data', {
                      fullName: memberEditForm.fullName, birthDate: memberEditForm.birthDate, sex: memberEditForm.sex, rg: memberEditForm.rg,
                      rgIssuer: memberEditForm.rgIssuer, rgIssueDate: memberEditForm.rgIssueDate, fatherName: memberEditForm.fatherName,
                      motherName: memberEditForm.motherName, crNumber: memberEditForm.crNumber, crValidity: memberEditForm.crValidity,
                      militaryRegion: memberEditForm.militaryRegion, nationality: memberEditForm.nationality
                    })}
                    saving={memberSavingSection === 'member_data'}
                    saved={memberSavedSection === 'member_data'}
                  >
                    <div className="sm:col-span-2"><MemberField label="Nome completo" value={memberEditForm.fullName} onChange={v => setMemberEditForm({ ...memberEditForm, fullName: v })} /></div>
                    <MemberField label="Data de nascimento" type="date" value={memberEditForm.birthDate} onChange={v => setMemberEditForm({ ...memberEditForm, birthDate: v })} />
                    <MemberSelect
                      label="Sexo"
                      value={memberEditForm.sex || ''}
                      onChange={v => setMemberEditForm({ ...memberEditForm, sex: v })}
                      options={[
                        { value: 'masculino', label: 'Masculino' },
                        { value: 'feminino', label: 'Feminino' }
                      ]}
                    />
                    <MemberField label="RG" value={memberEditForm.rg} onChange={v => setMemberEditForm({ ...memberEditForm, rg: v })} />
                    <MemberField label="Órgão emissor RG" value={memberEditForm.rgIssuer} onChange={v => setMemberEditForm({ ...memberEditForm, rgIssuer: v })} />
                    <MemberField label="Data emissão RG" type="date" value={memberEditForm.rgIssueDate} onChange={v => setMemberEditForm({ ...memberEditForm, rgIssueDate: v })} />
                    <MemberField label="Nome do pai" value={memberEditForm.fatherName} onChange={v => setMemberEditForm({ ...memberEditForm, fatherName: v })} />
                    <MemberField label="Nome da mãe" value={memberEditForm.motherName} onChange={v => setMemberEditForm({ ...memberEditForm, motherName: v })} />
                    <MemberField label="CR" placeholder="Ex: CR-102938-DF" value={memberEditForm.crNumber} onChange={v => setMemberEditForm({ ...memberEditForm, crNumber: v })} />
                    <MemberField label="Validade CR" type="date" value={memberEditForm.crValidity} onChange={v => setMemberEditForm({ ...memberEditForm, crValidity: v })} />
                    <MemberField label="Região Militar" value={memberEditForm.militaryRegion} onChange={v => setMemberEditForm({ ...memberEditForm, militaryRegion: v })} />
                    <MemberField label="Nacionalidade" value={memberEditForm.nationality} onChange={v => setMemberEditForm({ ...memberEditForm, nationality: v })} />
                  </MemberSection>

                  {/* Vencimento Guia de Trânsito e Vencimento Anuidade (Exclusivo Painel Diretor > Gerenciamento Clube > Cadastrar Membros) */}
                  <MemberSection
                    title="Validades do Clube (Exclusivo Diretor)"
                    onSave={() => saveMemberSection('member_club_validities', {
                      guiaTransitoExpiry: memberEditForm.guiaTransitoExpiry,
                      signatureExpiry: memberEditForm.signatureExpiry
                    })}
                    saving={memberSavingSection === 'member_club_validities'}
                    saved={memberSavedSection === 'member_club_validities'}
                  >
                    <MemberField
                      label="Vencimento Guia de Trânsito"
                      type="date"
                      value={memberEditForm.guiaTransitoExpiry}
                      onChange={v => setMemberEditForm({ ...memberEditForm, guiaTransitoExpiry: v })}
                    />
                    <MemberField
                      label="Vencimento Anuidade"
                      type="date"
                      value={memberEditForm.signatureExpiry}
                      onChange={v => setMemberEditForm({ ...memberEditForm, signatureExpiry: v })}
                    />
                  </MemberSection>

                  <MemberSection
                    title="Contato"
                    onSave={() => saveMemberSection('member_contact', { phone: memberEditForm.phone })}
                    saving={memberSavingSection === 'member_contact'}
                    saved={memberSavedSection === 'member_contact'}
                  >
                    <MemberField label="Celular" type="tel" value={memberEditForm.phone} onChange={v => setMemberEditForm({ ...memberEditForm, phone: v })} />
                  </MemberSection>

                  <MemberSection
                    title="Endereço"
                    onSave={() => saveMemberSection('member_address', {
                      cep: memberEditForm.cep, address: memberEditForm.address, addressNumber: memberEditForm.addressNumber,
                      complement: memberEditForm.complement, neighborhood: memberEditForm.neighborhood, city: memberEditForm.city, state: memberEditForm.state
                    })}
                    saving={memberSavingSection === 'member_address'}
                    saved={memberSavedSection === 'member_address'}
                  >
                    <MemberField label="CEP" value={memberEditForm.cep} onChange={v => setMemberEditForm({ ...memberEditForm, cep: v })} />
                    <MemberField label="Endereço" value={memberEditForm.address} onChange={v => setMemberEditForm({ ...memberEditForm, address: v })} />
                    <MemberField label="Número" value={memberEditForm.addressNumber} onChange={v => setMemberEditForm({ ...memberEditForm, addressNumber: v })} />
                    <MemberField label="Complemento" value={memberEditForm.complement} onChange={v => setMemberEditForm({ ...memberEditForm, complement: v })} />
                    <MemberField label="Bairro" value={memberEditForm.neighborhood} onChange={v => setMemberEditForm({ ...memberEditForm, neighborhood: v })} />
                    <MemberField label="Cidade" value={memberEditForm.city} onChange={v => setMemberEditForm({ ...memberEditForm, city: v })} />
                    <MemberField label="Estado" value={memberEditForm.state} onChange={v => setMemberEditForm({ ...memberEditForm, state: v })} />
                  </MemberSection>

                  <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-xl space-y-3">
                    <h4 className="font-bold text-xs text-slate-700">Documentos (PDF/JPG/PNG até 1MB)</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <MemberFileField label="RG ou CNH" onUpload={f => uploadMemberDoc('rg_cnh', f)} />
                      <MemberFileField label="CR" onUpload={f => uploadMemberDoc('cr', f)} />
                      <div className="sm:col-span-2"><MemberFileField label="Declaração de filiação" onUpload={f => uploadMemberDoc('declaracao_filiacao', f)} /></div>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateMemberSubmit} className="space-y-4 text-slate-800">
                  {createMemberError && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-semibold">{createMemberError}</div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2"><MemberField label="Nome completo" value={createMemberForm.fullName} onChange={v => setCreateMemberForm({ ...createMemberForm, fullName: v })} placeholder="Ex: Carlos Cabral" /></div>
                    <MemberField label="CPF" value={createMemberForm.cpf} onChange={v => setCreateMemberForm({ ...createMemberForm, cpf: v })} placeholder="Ex: 000.000.000-00" />
                    <MemberField label="E-mail de contato" type="email" value={createMemberForm.email} onChange={v => setCreateMemberForm({ ...createMemberForm, email: v })} placeholder="carlos@exemplo.com" />
                    <MemberField label="Senha inicial" type="password" value={createMemberForm.password} onChange={v => setCreateMemberForm({ ...createMemberForm, password: v })} />
                  </div>
                  <div className="flex justify-end pt-3 border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={creatingMember}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs px-6 py-3 rounded-xl font-bold transition shadow-lg shadow-blue-100 cursor-pointer"
                    >
                      {creatingMember ? 'Salvando...' : 'Cadastrar Membro'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <h4 className="font-display font-bold text-slate-900 text-sm">Membros do Clube ({clubMembers.length})</h4>
              {clubMembers.length === 0 ? (
                <p className="text-xs text-slate-400">Nenhum membro cadastrado ainda.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {clubMembers.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMemberId(m.id)}
                      className={`w-full flex items-center justify-between py-3 px-2 text-left rounded-lg transition cursor-pointer ${selectedMemberId === m.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800">{m.fullName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{m.cpf || 'CPF não informado'}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${m.isProfileComplete ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}>
                        {m.isProfileComplete ? 'Completo' : 'Incompleto'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'cessao_armas':
        return (
          <div className="space-y-6">
            {/* Form Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-display font-bold text-slate-900 text-base">Termo de Cessão de Uso de Armamento</h3>
                  <p className="text-xs text-slate-400">Registro oficial conforme art. 34 do Decreto nº 11.615/2023 — os dados são salvos no banco de dados.</p>
                </div>
                <FileSignature className="w-5 h-5 text-blue-600" />
              </div>

              {cessaoError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {cessaoError}
                </div>
              )}

              {cessaoSalva && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl px-4 py-3">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  Cessão <strong>Nº {cessaoSalva.concessionNumber}</strong> registrada com sucesso!
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ATLETA */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Atleta Recebedor</label>
                  {cessaoAtletaSelecionado ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                      <div>
                        <p className="text-xs font-bold text-emerald-800">{cessaoAtletaSelecionado.fullName}</p>
                        <p className="text-[10px] text-emerald-600 font-mono">{cessaoAtletaSelecionado.cpf}</p>
                      </div>
                      <button
                        onClick={() => { setCessaoAtletaSelecionado(null); setCessaoAtletaQuery(''); setCessaoSalva(null); }}
                        className="text-emerald-500 hover:text-emerald-700 transition"
                      ><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Digite CPF ou nome do atleta (mín. 3 chars)..."
                        value={cessaoAtletaQuery}
                        onChange={async (e) => {
                          const val = e.target.value;
                          setCessaoAtletaQuery(val);
                          setCessaoSalva(null);
                          if (val.length < 3) { setCessaoAtletaResults([]); return; }
                          try {
                            const r = await fetch(`/api/members/search?q=${encodeURIComponent(val)}`, { headers: { 'x-user-id': currentUser?.id || '' } });
                            const d = await r.json();
                            setCessaoAtletaResults(d.members || []);
                          } catch { setCessaoAtletaResults([]); }
                        }}
                        className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700 pr-8"
                      />
                      <Search className="absolute right-3 top-3 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      {cessaoAtletaResults.length > 0 && (
                        <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                          {cessaoAtletaResults.map(m => (
                            <button
                              key={m.id}
                              onClick={() => { setCessaoAtletaSelecionado(m); setCessaoAtletaResults([]); setCessaoAtletaQuery(''); }}
                              className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition border-b border-slate-100 last:border-0"
                            >
                              <p className="text-xs font-semibold text-slate-800">{m.fullName}</p>
                              <p className="text-[10px] font-mono text-slate-500">{m.cpf}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ARMA */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Arma Cedida (busca por Nº ou SIGMA)</label>
                  {cessaoArmaSelecionada ? (
                    <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                      <div>
                        <p className="text-xs font-bold text-blue-800">{cessaoArmaSelecionada.model} — {cessaoArmaSelecionada.caliber}</p>
                        <p className="text-[10px] font-mono text-blue-600">SIGMA: {cessaoArmaSelecionada.sigmaNumber || cessaoArmaSelecionada.weaponNumber || '—'}</p>
                      </div>
                      <button
                        onClick={() => { setCessaoArmaSelecionada(null); setCessaoArmaQuery(''); setCessaoSalva(null); }}
                        className="text-blue-500 hover:text-blue-700 transition"
                      ><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Digite número da arma ou SIGMA (mín. 3 chars)..."
                        value={cessaoArmaQuery}
                        onChange={async (e) => {
                          const val = e.target.value;
                          setCessaoArmaQuery(val);
                          setCessaoSalva(null);
                          if (val.length < 3) { setCessaoArmaResults([]); return; }
                          try {
                            const r = await fetch(`/api/weapons/search?q=${encodeURIComponent(val)}`, { headers: { 'x-user-id': currentUser?.id || '' } });
                            const d = await r.json();
                            setCessaoArmaResults(d.weapons || []);
                          } catch { setCessaoArmaResults([]); }
                        }}
                        className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700 pr-8"
                      />
                      <Search className="absolute right-3 top-3 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      {cessaoArmaResults.length > 0 && (
                        <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                          {cessaoArmaResults.map((w: any) => (
                            <button
                              key={w.id}
                              onClick={() => { setCessaoArmaSelecionada(w); setCessaoArmaResults([]); setCessaoArmaQuery(''); }}
                              className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition border-b border-slate-100 last:border-0"
                            >
                              <p className="text-xs font-semibold text-slate-800">{w.manufacturer} {w.model} — {w.caliber}</p>
                              <p className="text-[10px] font-mono text-slate-500">SIGMA: {w.sigmaNumber || w.weaponNumber || '—'}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* DATA INÍCIO */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Data de Início da Cessão</label>
                  <input
                    type="date"
                    value={cessaoDataInicio}
                    onChange={(e) => { setCessaoDataInicio(e.target.value); setCessaoSalva(null); }}
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700"
                  />
                </div>

                {/* DATA FIM */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Data de Fim da Cessão</label>
                  <input
                    type="date"
                    value={cessaoDataFim}
                    onChange={(e) => { setCessaoDataFim(e.target.value); setCessaoSalva(null); }}
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700"
                  />
                </div>
              </div>

              {/* ACTIONS */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={async () => {
                    if (!cessaoAtletaSelecionado || !cessaoArmaSelecionada || !cessaoDataInicio || !cessaoDataFim) {
                      setCessaoError('Preencha todos os campos: atleta, arma e datas de início e fim.');
                      return;
                    }
                    if (cessaoDataFim < cessaoDataInicio) {
                      setCessaoError('A data de fim deve ser igual ou posterior à data de início.');
                      return;
                    }
                    setCessaoError('');
                    setCessaoSaving(true);
                    try {
                      const r = await fetch('/api/weapon-concessions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id || '' },
                        body: JSON.stringify({
                          athleteId: cessaoAtletaSelecionado.id,
                          weaponId: cessaoArmaSelecionada.id,
                          startDate: cessaoDataInicio,
                          endDate: cessaoDataFim,
                        }),
                      });
                      const d = await r.json();
                      if (!r.ok) throw new Error(d.error || 'Erro ao registrar.');
                      setCessaoSalva(d.concession);
                      setCessaoPdfOpen(false);
                    } catch (err: any) {
                      setCessaoError(err.message || 'Erro ao registrar cessão.');
                    } finally {
                      setCessaoSaving(false);
                    }
                  }}
                  disabled={cessaoSaving || !cessaoAtletaSelecionado || !cessaoArmaSelecionada || !cessaoDataInicio || !cessaoDataFim}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs py-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-blue-50"
                >
                  {cessaoSaving ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Registrando...</> : <><Save className="w-4 h-4" /> Registrar Cessão</>}
                </button>

                {cessaoSalva && (
                  <button
                    onClick={() => setCessaoPdfOpen(true)}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-3 px-5 rounded-xl font-bold transition shadow-md shadow-emerald-50 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    Gerar PDF
                  </button>
                )}
              </div>
            </div>

            {/* PDF MODAL */}
            {cessaoPdfOpen && cessaoSalva && (
              <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-auto">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
                  {/* Modal header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h4 className="font-bold text-slate-800 text-sm">Pré-visualização — Cessão Nº {cessaoSalva.concessionNumber}</h4>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const el = document.getElementById('cessao-pdf-content');
                          if (!el) return;
                          const w = window.open('', '_blank');
                          if (!w) return;
                          w.document.write(`<!DOCTYPE html><html><head><title>Cessão Nº ${cessaoSalva.concessionNumber}</title><style>body{font-family:Arial,sans-serif;font-size:11px;line-height:1.6;margin:30px}h1,h2,h3{text-align:center}table{width:100%;border-collapse:collapse;margin:8px 0}td,th{border:1px solid #333;padding:6px 10px}hr{margin:16px 0}@media print{button{display:none}}</style></head><body>${el.innerHTML}<script>window.print();<\/script></body></html>`);
                          w.document.close();
                        }}
                        className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition cursor-pointer"
                      ><Printer className="w-3.5 h-3.5" /> Imprimir / Salvar PDF</button>
                      <button onClick={() => setCessaoPdfOpen(false)} className="text-slate-400 hover:text-slate-600 transition"><X className="w-5 h-5" /></button>
                    </div>
                  </div>

                  {/* Document content */}
                  <div className="p-6 overflow-auto max-h-[75vh]">
                    <div id="cessao-pdf-content" className="font-mono text-[10px] text-slate-800 space-y-4 leading-relaxed">
                      <div className="text-center space-y-1 border-b border-slate-300 pb-4">
                        <p className="font-bold text-[11px]">ANEXO N</p>
                        <p className="font-bold text-[11px]">CESSÃO N° {cessaoSalva.concessionNumber}</p>
                        <p className="font-bold text-[11px]">CESSÃO DE ARMAS DE FOGO PARA UTILIZAÇÃO NA PRÁTICA DE TIRO DESPORTIVO</p>
                        <p className="text-[9px]">(art. 34 do Decreto nº 11.615/2023)</p>
                      </div>

                      <div className="space-y-3">
                        <p className="font-bold underline">1. Objeto da cessão</p>
                        <p>Arma da entidade de tiro desportivo cedida para pessoas com idade superior a vinte e cinco anos (inciso II, §2º, art. 34, Decreto nº 11.615/2023).</p>

                        <table className="w-full text-[9px] border-collapse border border-slate-400">
                          <tbody>
                            <tr><td className="border border-slate-400 px-2 py-1 font-bold w-40">Clube Cedente</td><td className="border border-slate-400 px-2 py-1">{cessaoSalva.clubName}</td></tr>
                            <tr><td className="border border-slate-400 px-2 py-1 font-bold">CNPJ</td><td className="border border-slate-400 px-2 py-1">{cessaoSalva.clubCnpj || '—'}</td></tr>
                          </tbody>
                        </table>

                        <p className="font-bold underline">2. Identificação da Arma Cedida</p>
                        <table className="w-full text-[9px] border-collapse border border-slate-400">
                          <tbody>
                            <tr><td className="border border-slate-400 px-2 py-1 font-bold w-40">Fabricante/Espécie</td><td className="border border-slate-400 px-2 py-1">{cessaoSalva.weaponManufacturer || '—'} / {cessaoSalva.weaponModel}</td></tr>
                            <tr><td className="border border-slate-400 px-2 py-1 font-bold">Calibre</td><td className="border border-slate-400 px-2 py-1">{cessaoSalva.weaponCaliber}</td></tr>
                            <tr><td className="border border-slate-400 px-2 py-1 font-bold">Nº SIGMA</td><td className="border border-slate-400 px-2 py-1 font-bold">{cessaoSalva.weaponSigma || cessaoSalva.weaponNumber || '—'}</td></tr>
                          </tbody>
                        </table>

                        <p className="font-bold underline">3. Identificação do Atirador Desportivo</p>
                        <table className="w-full text-[9px] border-collapse border border-slate-400">
                          <tbody>
                            <tr><td className="border border-slate-400 px-2 py-1 font-bold w-40">Nome Completo</td><td className="border border-slate-400 px-2 py-1">{cessaoSalva.athleteName}</td></tr>
                            <tr><td className="border border-slate-400 px-2 py-1 font-bold">CPF</td><td className="border border-slate-400 px-2 py-1">{cessaoSalva.athleteCpf}</td></tr>
                            <tr><td className="border border-slate-400 px-2 py-1 font-bold">Nº CR</td><td className="border border-slate-400 px-2 py-1">{cessaoSalva.athleteCr || '—'}</td></tr>
                          </tbody>
                        </table>

                        <p className="font-bold underline">4. Período de Cessão</p>
                        <table className="w-full text-[9px] border-collapse border border-slate-400">
                          <tbody>
                            <tr>
                              <td className="border border-slate-400 px-2 py-1 font-bold w-40">Data de Início</td>
                              <td className="border border-slate-400 px-2 py-1">{new Date(cessaoSalva.startDate + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                            </tr>
                            <tr>
                              <td className="border border-slate-400 px-2 py-1 font-bold">Data de Término</td>
                              <td className="border border-slate-400 px-2 py-1">{new Date(cessaoSalva.endDate + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                            </tr>
                          </tbody>
                        </table>

                        <p className="font-bold underline">5. Declaração</p>
                        <p>
                          O clube acima identificado declara, para os fins do art. 34 do Decreto nº 11.615/2023, que cede temporariamente o armamento descrito neste termo ao atirador identificado, para uso exclusivo em treinamentos e competições de tiro desportivo, no período indicado.
                        </p>

                        <div className="pt-6 flex justify-between items-end">
                          <p>{cessaoSalva.clubCity || '___________'}, {new Date().toLocaleDateString('pt-BR')}</p>
                          <div className="text-center">
                            <div className="h-px bg-slate-600 w-48 mb-1"></div>
                            <p>Assinatura e Carimbo do Responsável</p>
                            <p className="text-[8px]">{cessaoSalva.clubName}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs text-left">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-display font-bold text-slate-900 text-base">Cadastrar Novo Clube Filiado</h3>
                  <p className="text-xs text-slate-400">Adicionar uma nova unidade ou clube filiado na rede nacional G&G. Cria o clube e o login do administrador local.</p>
                </div>
                <Landmark className="w-5 h-5 text-blue-600" />
              </div>

              {createClubSuccess && (
                <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl flex items-center gap-2 text-xs font-semibold">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  Unidade filiada integrada ao sistema nacional G&G!
                </div>
              )}
              {createClubError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-semibold">{createClubError}</div>
              )}

              <form onSubmit={handleCreateClubSubmit} className="space-y-4 text-slate-800">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">Dados Principais</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <MemberField label="Nome do Estande/Clube" value={createClubForm.name} onChange={v => setCreateClubForm({ ...createClubForm, name: v })} placeholder="Ex: G&G Sobradinho Estande de Precisão" />
                  </div>
                  <MemberField label="CNPJ Entidade" value={createClubForm.cnpj} onChange={v => setCreateClubForm({ ...createClubForm, cnpj: v })} placeholder="Ex: 45.981.042/0002-99" />
                  <MemberField label="Diretor Presidente Responsável" value={createClubForm.responsibleName} onChange={v => setCreateClubForm({ ...createClubForm, responsibleName: v })} placeholder="Ex: Gabriel Guedes" />
                  <MemberField label="E-mail de Contato" type="email" value={createClubForm.email} onChange={v => setCreateClubForm({ ...createClubForm, email: v })} placeholder="contato@clube.com" />
                  <MemberField label="Senha Inicial (Login do Clube)" type="password" value={createClubForm.password} onChange={v => setCreateClubForm({ ...createClubForm, password: v })} />
                  <MemberField label="Telefone" value={createClubForm.phone} onChange={v => setCreateClubForm({ ...createClubForm, phone: v })} placeholder="Ex: (61) 99123-4567" />
                  <MemberField label="CR do Clube" value={createClubForm.crNumber} onChange={v => setCreateClubForm({ ...createClubForm, crNumber: v })} placeholder="Opcional" />
                </div>

                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 pt-2">Endereço da Unidade (Opcional)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <MemberField label="CEP" value={createClubForm.cep} onChange={v => setCreateClubForm({ ...createClubForm, cep: v })} placeholder="70000-000" />
                  <div className="sm:col-span-2">
                    <MemberField label="Endereço / Logradouro" value={createClubForm.address} onChange={v => setCreateClubForm({ ...createClubForm, address: v })} placeholder="Rua, Av, Setor..." />
                  </div>
                  <MemberField label="Número" value={createClubForm.addressNumber} onChange={v => setCreateClubForm({ ...createClubForm, addressNumber: v })} placeholder="Ex: 100" />
                  <MemberField label="Complemento" value={createClubForm.complement} onChange={v => setCreateClubForm({ ...createClubForm, complement: v })} placeholder="Ex: Galpão A" />
                  <MemberField label="Bairro" value={createClubForm.neighborhood} onChange={v => setCreateClubForm({ ...createClubForm, neighborhood: v })} placeholder="Ex: Centro" />
                  <MemberField label="Cidade" value={createClubForm.city} onChange={v => setCreateClubForm({ ...createClubForm, city: v })} placeholder="Ex: Sobradinho" />
                  <MemberField label="UF" value={createClubForm.state} onChange={v => setCreateClubForm({ ...createClubForm, state: v })} placeholder="Ex: DF" />
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={creatingClub}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs px-6 py-3 rounded-xl font-bold transition shadow-lg shadow-blue-100 cursor-pointer"
                  >
                    {creatingClub ? 'Salvando...' : 'Registrar Unidade'}
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs text-left">
              <h4 className="font-display font-bold text-slate-900 text-sm">Clubes Cadastrados ({clubs.length})</h4>
              {clubs.length === 0 ? (
                <p className="text-xs text-slate-400">Nenhum clube filiado cadastrado ainda.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {clubs.map((club) => (
                    <div key={club.id} className="border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-slate-50/50 hover:border-slate-300 transition">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">{club.name}</h4>
                          {club.crNumber && <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">CR: {club.crNumber}</span>}
                        </div>
                        <p className="text-xs text-slate-600">
                          <strong>CNPJ:</strong> {club.cnpj || 'Não informado'} • <strong>Diretor:</strong> {club.responsibleName || 'Não informado'}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {club.address ? `${club.address}${club.addressNumber ? ', ' + club.addressNumber : ''}${club.neighborhood ? ' - ' + club.neighborhood : ''} | ` : ''}
                          {club.city ? `${club.city}${club.state ? '/' + club.state : ''}` : 'Cidade não informada'} • Tel: {club.phone || 'N/I'} • Email: {club.email || 'N/I'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => startEditingClub(club)}
                          className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer shadow-2xs"
                        >
                          <Pencil className="w-3.5 h-3.5 text-blue-600" />
                          Editar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal de Edição do Clube */}
            {editingClub && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-2xl overflow-hidden shadow-2xl text-slate-800 flex flex-col max-h-[90vh] text-left">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <div>
                      <h4 className="font-display font-bold text-slate-900 text-base">Editar Clube: {editingClub.name}</h4>
                      <p className="text-xs text-slate-400">Atualizar dados cadastrais e de endereço do clube filiado.</p>
                    </div>
                    <button onClick={() => setEditingClub(null)} className="text-slate-400 hover:text-slate-600 p-1">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveEditClub} className="p-6 overflow-y-auto space-y-4">
                    {editClubSuccess && (
                      <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl flex items-center gap-2 text-xs font-semibold">
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                        Cadastro do clube atualizado com sucesso!
                      </div>
                    )}
                    {editClubError && (
                      <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-semibold">{editClubError}</div>
                    )}

                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">Dados Principais</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <MemberField label="Nome do Estande/Clube" value={editingClubForm.name} onChange={v => setEditingClubForm({ ...editingClubForm, name: v })} />
                      </div>
                      <MemberField label="CNPJ Entidade" value={editingClubForm.cnpj} onChange={v => setEditingClubForm({ ...editingClubForm, cnpj: v })} />
                      <MemberField label="CR do Clube" value={editingClubForm.crNumber} onChange={v => setEditingClubForm({ ...editingClubForm, crNumber: v })} />
                      <MemberField label="Diretor Presidente Responsável" value={editingClubForm.responsibleName} onChange={v => setEditingClubForm({ ...editingClubForm, responsibleName: v })} />
                      <MemberField label="E-mail de Contato" type="email" value={editingClubForm.email} onChange={v => setEditingClubForm({ ...editingClubForm, email: v })} />
                      <MemberField label="Telefone" value={editingClubForm.phone} onChange={v => setEditingClubForm({ ...editingClubForm, phone: v })} />
                    </div>

                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 pt-2">Endereço Completo</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <MemberField label="CEP" value={editingClubForm.cep} onChange={v => setEditingClubForm({ ...editingClubForm, cep: v })} />
                      <div className="sm:col-span-2">
                        <MemberField label="Endereço / Logradouro" value={editingClubForm.address} onChange={v => setEditingClubForm({ ...editingClubForm, address: v })} />
                      </div>
                      <MemberField label="Número" value={editingClubForm.addressNumber} onChange={v => setEditingClubForm({ ...editingClubForm, addressNumber: v })} />
                      <MemberField label="Complemento" value={editingClubForm.complement} onChange={v => setEditingClubForm({ ...editingClubForm, complement: v })} />
                      <MemberField label="Bairro" value={editingClubForm.neighborhood} onChange={v => setEditingClubForm({ ...editingClubForm, neighborhood: v })} />
                      <MemberField label="Cidade" value={editingClubForm.city} onChange={v => setEditingClubForm({ ...editingClubForm, city: v })} />
                      <MemberField label="UF" value={editingClubForm.state} onChange={v => setEditingClubForm({ ...editingClubForm, state: v })} />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setEditingClub(null)}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={savingEditClub}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs px-6 py-2.5 rounded-xl font-bold transition shadow-lg shadow-blue-100 cursor-pointer"
                      >
                        {savingEditClub ? 'Salvando...' : 'Salvar Alterações'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
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
            {(editingChampId || showCreateForm) && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs text-slate-800">
                {editingChampId ? (
                  <>
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                      <button
                        type="button"
                        onClick={() => setEditingChampId(null)}
                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-850 transition cursor-pointer"
                        title="Voltar para a lista"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <h3 className="font-display font-bold text-slate-900 text-lg flex items-center gap-2">
                        <Settings className="w-5 h-5 text-amber-500 animate-spin-slow" />
                        Editar Campeonato: <span className="text-blue-600">{editChampTitle}</span>
                      </h3>
                    </div>

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
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Conjunto de Modalidades e Regras</label>
                        <p className="text-[10px] text-slate-400 mb-1">Selecione as modalidades já cadastradas. Séries/tiros/tempo/avaliação vêm da própria modalidade e só podem ser alterados na tela "Modalidades".</p>
                        <div className="flex flex-wrap gap-2">
                          {modalities.length === 0 ? (
                            <p className="text-xs text-slate-400">Nenhuma modalidade cadastrada. Cadastre em "Modalidades" primeiro.</p>
                          ) : modalities.map((m) => {
                            const isSel = editSelectedMods.includes(m.id);
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  if (isSel) {
                                    setEditSelectedMods(editSelectedMods.filter(id => id !== m.id));
                                  } else {
                                    setEditSelectedMods([...editSelectedMods, m.id]);
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition ${isSel ? 'bg-blue-600 border-blue-600 text-white shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-650'}`}
                              >
                                {m.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Regulamento (PDF)</label>
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={(e) => setEditChampRegulamentoFile(e.target.files?.[0] || null)}
                          className="w-full text-[11px] text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                        />
                        {editChampRegulamentoFile ? (
                          <p className="text-[10px] text-emerald-600">Novo arquivo selecionado: {editChampRegulamentoFile.name}</p>
                        ) : editingChamp?.regulamentoUploaded ? (
                          <p className="text-[10px] text-emerald-600">Já enviado.</p>
                        ) : null}
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Súmula (PDF)</label>
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={(e) => setEditChampSumulaFile(e.target.files?.[0] || null)}
                          className="w-full text-[11px] text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                        />
                        {editChampSumulaFile ? (
                          <p className="text-[10px] text-emerald-600">Novo arquivo selecionado: {editChampSumulaFile.name}</p>
                        ) : editingChamp?.sumulaUploaded ? (
                          <p className="text-[10px] text-emerald-600">Já enviado.</p>
                        ) : null}
                      </div>
                      <ChampField label="Valor de X" type="number" value={editChampExtra.valorX} onChange={v => setEditChampExtra({ ...editChampExtra, valorX: v })} />

                      <ChampExtraFields values={editChampExtra} onChange={patch => setEditChampExtra({ ...editChampExtra, ...patch })} />

                      <div className="space-y-2 sm:col-span-2 pt-4 border-t border-slate-100">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Imagem de Capa (Banner)</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <button
                            type="button"
                            onClick={() => setEditChampImageSourceMode('gallery')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${editChampImageSourceMode === 'gallery' ? 'bg-blue-600 border-blue-600 text-white shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'}`}
                          >
                            Fotos Próprias ({myUserPhotos.length})
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
                          myUserPhotos.length === 0 ? (
                            <div className="p-3 mb-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500">
                              Você ainda não possui fotos próprias enviadas. Escolha a opção <strong>"Upload de Imagem"</strong> ao lado para carregar do seu dispositivo.
                            </div>
                          ) : (
                            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-3 max-h-[160px] overflow-y-auto p-1 border border-slate-200 rounded-xl bg-slate-50">
                              {myUserPhotos.map((url, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setEditChampBanner(url)}
                                  className={`relative rounded-lg overflow-hidden border-2 h-14 bg-slate-100 transition cursor-pointer ${editChampBanner === url ? 'border-blue-600 scale-95 shadow-xs ring-2 ring-blue-500/30' : 'border-transparent hover:border-slate-300'}`}
                                >
                                  <img src={url} alt={`Minha foto ${idx + 1}`} className="w-full h-full object-cover" />
                                  <span className="absolute bottom-0 inset-x-0 bg-slate-900/60 text-white text-[7px] truncate px-1 py-0.5 text-center font-semibold font-mono">
                                    Foto #{idx + 1}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )
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

                    {editChampError && (
                      <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-semibold">{editChampError}</div>
                    )}

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
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-850 transition cursor-pointer"
                      title="Voltar para a lista"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <h3 className="font-display font-bold text-slate-900 text-lg flex items-center gap-2">
                      <PlusCircle className="w-5 h-5 text-blue-600" />
                      Configurar Novo Campeonato
                    </h3>
                  </div>

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
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Conjunto de Modalidades e Regras</label>
                        <p className="text-[10px] text-slate-400 mb-1">Selecione as modalidades já cadastradas. Séries/tiros/tempo/avaliação vêm da própria modalidade e só podem ser alterados na tela "Modalidades".</p>
                        <div className="flex flex-wrap gap-2">
                          {modalities.length === 0 ? (
                            <p className="text-xs text-slate-400">Nenhuma modalidade cadastrada. Cadastre em "Modalidades" primeiro.</p>
                          ) : modalities.map((m) => {
                            const isSel = selectedMods.includes(m.id);
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  if (isSel) {
                                    setSelectedMods(selectedMods.filter(id => id !== m.id));
                                  } else {
                                    setSelectedMods([...selectedMods, m.id]);
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition ${isSel ? 'bg-blue-600 border-blue-600 text-white shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-650'}`}
                              >
                                {m.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Regulamento (PDF)</label>
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={(e) => setChampRegulamentoFile(e.target.files?.[0] || null)}
                          className="w-full text-[11px] text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                        />
                        {champRegulamentoFile && <p className="text-[10px] text-emerald-600">Selecionado: {champRegulamentoFile.name}</p>}
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Súmula (PDF)</label>
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={(e) => setChampSumulaFile(e.target.files?.[0] || null)}
                          className="w-full text-[11px] text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                        />
                        {champSumulaFile && <p className="text-[10px] text-emerald-600">Selecionado: {champSumulaFile.name}</p>}
                      </div>
                      <ChampField label="Valor de X" type="number" value={champExtra.valorX} onChange={v => setChampExtra({ ...champExtra, valorX: v })} />

                      <ChampExtraFields values={champExtra} onChange={patch => setChampExtra({ ...champExtra, ...patch })} />

                      <div className="space-y-2 sm:col-span-2 pt-4 border-t border-slate-100">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Imagem de Capa (Banner)</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <button
                            type="button"
                            onClick={() => setChampImageSourceMode('gallery')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${champImageSourceMode === 'gallery' ? 'bg-blue-600 border-blue-600 text-white shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'}`}
                          >
                            Fotos Próprias ({myUserPhotos.length})
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
                          myUserPhotos.length === 0 ? (
                            <div className="p-3 mb-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500">
                              Você ainda não possui fotos próprias enviadas. Escolha a opção <strong>"Upload de Imagem"</strong> ao lado para carregar do seu dispositivo.
                            </div>
                          ) : (
                            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-3 max-h-[160px] overflow-y-auto p-1 border border-slate-200 rounded-xl bg-slate-50">
                              {myUserPhotos.map((url, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setChampBanner(url)}
                                  className={`relative rounded-lg overflow-hidden border-2 h-14 bg-slate-100 transition cursor-pointer ${champBanner === url ? 'border-blue-600 scale-95 shadow-xs ring-2 ring-blue-500/30' : 'border-transparent hover:border-slate-300'}`}
                                >
                                  <img src={url} alt={`Minha foto ${idx + 1}`} className="w-full h-full object-cover" />
                                  <span className="absolute bottom-0 inset-x-0 bg-slate-900/60 text-white text-[7px] truncate px-1 py-0.5 text-center font-semibold font-mono">
                                    Foto #{idx + 1}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )
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

                    {champError && (
                      <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-semibold">{champError}</div>
                    )}

                    <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCreateForm(false)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-5 py-3 rounded-xl font-bold transition cursor-pointer"
                      >
                        Cancelar
                      </button>
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
            )}

            {/* List of Championships to select for Edit */}
            {!editingChampId && !showCreateForm && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs text-slate-800">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="font-display font-bold text-slate-900 text-base">Campeonatos Cadastrados para Edição</h3>
                  <p className="text-xs text-slate-400">Gerencie e altere dados das competições abaixo.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3.5 py-2 rounded-xl font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Novo Campeonato
                  </button>
                  <Trophy className="w-5 h-5 text-blue-600" />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-mono text-[10px] uppercase">
                      <th className="py-3 px-2">Campeonato</th>
                      <th className="py-3 px-2">Período</th>
                      <th className="py-3 px-2 text-center">Etapas</th>
                      <th className="py-3 px-2 text-center">Inscritos</th>
                      <th className="py-3 px-2 text-center">Arrecadação</th>
                      <th className="py-3 px-2 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {championships.map((champ) => {
                      const champRegs = registrations.filter(r => r.championshipId === champ.id);
                      const totalArrecadacao = champRegs.reduce((acc, r) => {
                        if (r.valorPago && r.valorPago > 0 && r.valorPago !== 120) return acc + r.valorPago;
                        if (r.registrationType === 'reinscrição') {
                          return acc + (champ.valorReinscricao ?? champ.registrationFee ?? 0);
                        }
                        if (r.registeredByUserId && r.registeredByUserId !== r.userId) {
                          return acc + (champ.valorInscricaoClube ?? champ.registrationFee ?? 0);
                        }
                        return acc + (champ.valorInscricaoIndividual ?? champ.registrationFee ?? 0);
                      }, 0);

                      return (
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
                          <td className="py-3 px-2 text-center font-bold font-mono">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedChampForInscritosModal(champ);
                                setInscritosSearchQuery('');
                              }}
                              className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-bold outline-none"
                              title="Ver listagem de inscritos"
                            >
                              {champRegs.length}
                            </button>
                          </td>
                          <td className="py-3 px-2 text-center font-bold font-mono text-emerald-600">
                            R$ {totalArrecadacao.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-2 text-center">
                          <div className="flex justify-center items-center gap-2">
                            <button
                              type="button"
                              onClick={() => startEditingChamp(champ)}
                              className="bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-[10px] px-3 py-1.5 rounded-xl transition inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Settings className="w-3.5 h-3.5" />
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                  if (confirm(`Deseja realmente excluir o campeonato "${champ.title}"?\nEsta ação é irreversível e excluirá as etapas vazias vinculadas.`)) {
                                    try {
                                      await onRemoveChampionship(champ.id);
                                      alert('Campeonato excluído com sucesso!');
                                    } catch (err: any) {
                                      alert(err.message || 'Erro ao excluir campeonato.');
                                    }
                                  }
                                }}
                                className="text-red-500 hover:text-red-700 transition p-1.5 hover:bg-red-50 rounded-lg cursor-pointer inline-flex items-center justify-center"
                                title="Excluir Campeonato"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  </table>
                </div>
              </div>
              )}


            </div>
        );

      case 'etapas':
        return (
          <div className="space-y-6">
            {(editingStageId || showCreateStageForm) && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs text-slate-800">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                  <button
                    type="button"
                    onClick={cancelEditingStage}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-850 transition cursor-pointer"
                    title="Voltar para a lista"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <h3 className="font-display font-bold text-slate-900 text-base flex items-center gap-2">
                    {editingStageId ? (
                      <>
                        <Settings className="w-5 h-5 text-amber-500 animate-spin-slow" />
                        Editar Etapa: <span className="text-blue-600">{(stages.find(s => s.id === editingStageId)?.title || '')}</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-5 h-5 text-blue-600" />
                        Nova Etapa
                      </>
                    )}
                  </h3>
                </div>

                {stageError && (
                  <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-semibold">{stageError}</div>
                )}

                <form onSubmit={handleSubmitStage} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Campeonato</label>
                    <select
                      value={stageForm.championshipId}
                      onChange={(e) => setStageForm({ ...stageForm, championshipId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl focus:border-blue-500 text-xs text-slate-700"
                    >
                      <option value="">Selecione...</option>
                      {championships.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Título</label>
                    <input
                      type="text"
                      placeholder="Ex: Etapa 1"
                      value={stageForm.title}
                      onChange={(e) => setStageForm({ ...stageForm, title: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl focus:border-blue-500 text-xs text-slate-700"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Descrição</label>
                    <textarea
                      rows={3}
                      value={stageForm.description}
                      onChange={(e) => setStageForm({ ...stageForm, description: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl focus:border-blue-500 text-xs text-slate-700"
                    />
                  </div>

                  <ChampField label="Data Início" type="date" value={stageForm.date} onChange={v => setStageForm({ ...stageForm, date: v })} />
                  <ChampField label="Data Encerramento" type="date" value={stageForm.endDate} onChange={v => setStageForm({ ...stageForm, endDate: v })} />

                  <ChampSelect label="Sexo" value={stageForm.sexo} onChange={v => setStageForm({ ...stageForm, sexo: v })} options={[
                    { value: 'masculino', label: 'Masculino' }, { value: 'feminino', label: 'Feminino' }, { value: 'misto', label: 'Misto' }
                  ]} />
                  <ChampSelect label="Homologar Resultado" value={stageForm.homologarResultado} onChange={v => setStageForm({ ...stageForm, homologarResultado: v })} options={[
                    { value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }
                  ]} />
                  <ChampSelect label="Aberto para Resultados" value={stageForm.abertoParaResultados} onChange={v => setStageForm({ ...stageForm, abertoParaResultados: v })} options={[
                    { value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }
                  ]} />
                  <ChampSelect label="Gerar Certificados" value={stageForm.gerarCertificados} onChange={v => setStageForm({ ...stageForm, gerarCertificados: v })} options={[
                    { value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }
                  ]} />
                  <ChampField label="Fator de Multiplicação de Resultado" type="number" value={stageForm.fatorMultiplicacaoResultados} onChange={v => setStageForm({ ...stageForm, fatorMultiplicacaoResultados: v })} />
                  <ChampSelect label="Exibir Inscritos e Premiação Página Inicial" value={stageForm.exibirInscritosPaginaInicial} onChange={v => setStageForm({ ...stageForm, exibirInscritosPaginaInicial: v })} options={[
                    { value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }
                  ]} />
                  <ChampSelect label="Incluir na Soma da Página Inicial" value={stageForm.incluirNaSomaPaginaInicial} onChange={v => setStageForm({ ...stageForm, incluirNaSomaPaginaInicial: v })} options={[
                    { value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }
                  ]} />

                  <div className="sm:col-span-2 pt-3 border-t border-slate-100 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={cancelEditingStage}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-5 py-3 rounded-xl font-bold transition cursor-pointer"
                    >
                      Voltar para a Lista
                    </button>
                    <button
                      type="submit"
                      disabled={savingStage || !stageForm.championshipId || !stageForm.title || !stageForm.date}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs px-6 py-3 rounded-xl font-bold transition shadow-lg cursor-pointer"
                    >
                      {savingStage ? 'Salvando...' : editingStageId ? 'Salvar Alterações' : 'Salvar'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {!editingStageId && !showCreateStageForm && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs text-slate-800">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
                  <div>
                    <h3 className="font-display font-bold text-slate-900 text-base">Etapas Cadastradas ({stages.length})</h3>
                    <p className="text-xs text-slate-400">Gerencie e altere dados das etapas abaixo.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowCreateStageForm(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3.5 py-2 rounded-xl font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Nova Etapa
                    </button>
                  </div>
                </div>

                {stageError && (
                  <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-semibold mb-4">{stageError}</div>
                )}

                {stages.length === 0 ? (
                  <p className="text-xs text-slate-400">Nenhuma etapa cadastrada ainda.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-mono text-[10px] uppercase">
                          <th className="py-2 px-2">Campeonato</th>
                          <th className="py-2 px-2">Título</th>
                          <th className="py-2 px-2">Início</th>
                          <th className="py-2 px-2">Encerramento</th>
                          <th className="py-2 px-2 text-center">Homologar</th>
                          <th className="py-2 px-2 text-center">Aberto</th>
                          <th className="py-2 px-2 text-center">Certificados</th>
                          <th className="py-2 px-2 text-center">Fator</th>
                          <th className="py-2 px-2 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {stages.map(s => (
                          <tr key={s.id} className="hover:bg-slate-50/50">
                            <td className="py-2 px-2 font-semibold">{championships.find(c => c.id === s.championshipId)?.title || s.championshipId}</td>
                            <td className="py-2 px-2">{s.title}</td>
                            <td className="py-2 px-2 font-mono">{new Date(s.date).toLocaleDateString('pt-BR')}</td>
                            <td className="py-2 px-2 font-mono">{s.endDate ? new Date(s.endDate).toLocaleDateString('pt-BR') : '-'}</td>
                            <td className="py-2 px-2 text-center">{s.homologarResultado === 'sim' ? 'Sim' : 'Não'}</td>
                            <td className="py-2 px-2 text-center">{s.abertoParaResultados === 'sim' ? 'Sim' : 'Não'}</td>
                            <td className="py-2 px-2 text-center">{s.gerarCertificados === 'sim' ? 'Sim' : 'Não'}</td>
                            <td className="py-2 px-2 text-center font-mono">{s.fatorMultiplicacaoResultados ?? 1}</td>
                            <td className="py-2 px-2 text-right whitespace-nowrap">
                              <button onClick={() => startEditingStage(s)} className="text-blue-600 hover:text-blue-800 font-bold text-[10px] mr-3">Editar</button>
                              <button onClick={() => handleDeleteStage(s.id)} className="text-red-500 hover:text-red-700 font-bold text-[10px]">Excluir</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'modalidades':
        return (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs text-slate-800">
            <h3 className="font-display font-bold text-slate-900 text-base">Gerenciamento de Modalidades de Tiro</h3>

            {modalityError && (
              <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-semibold">{modalityError}</div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Cadastrar Modalidades */}
              <div className="border border-slate-100 p-4 rounded-xl bg-slate-50/50 space-y-3">
                <h4 className="font-bold text-xs">Cadastrar Modalidade</h4>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Modalidade</label>
                    <input
                      type="text"
                      value={newModality.name}
                      onChange={(e) => setNewModality({ ...newModality, name: e.target.value })}
                      className="w-full bg-white border border-slate-200 p-2.5 rounded-lg text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Quantidade de séries</label>
                    <input
                      type="number"
                      min={0}
                      value={newModality.seriesCount}
                      onChange={(e) => setNewModality({ ...newModality, seriesCount: e.target.value })}
                      className="w-full bg-white border border-slate-200 p-2.5 rounded-lg text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Tiros por série</label>
                    <input
                      type="number"
                      min={0}
                      value={newModality.shotsPerSeries}
                      onChange={(e) => setNewModality({ ...newModality, shotsPerSeries: e.target.value })}
                      className="w-full bg-white border border-slate-200 p-2.5 rounded-lg text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Tempo por série em minutos</label>
                    <input
                      type="number"
                      min={0}
                      value={newModality.timePerSeriesMinutes}
                      onChange={(e) => setNewModality({ ...newModality, timePerSeriesMinutes: e.target.value })}
                      className="w-full bg-white border border-slate-200 p-2.5 rounded-lg text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Tipo de avaliação</label>
                    <select
                      value={newModality.evaluationType}
                      onChange={(e) => setNewModality({ ...newModality, evaluationType: e.target.value })}
                      className="w-full bg-white border border-slate-200 p-2.5 rounded-lg text-xs"
                    >
                      <option value="">Selecione...</option>
                      <option value="pontuacao">Pontuação</option>
                      <option value="pontuacao_tempo">Pontuação + Tempo</option>
                      <option value="tempo">Tempo</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleSaveModality}
                  disabled={savingModality || !newModality.name}
                  className="w-full bg-blue-600 disabled:opacity-60 text-white text-xs py-2 rounded-lg font-bold"
                >
                  {savingModality ? 'Salvando...' : 'Salvar'}
                </button>
              </div>

              {/* List */}
              <div className="space-y-2 max-h-[420px] overflow-y-auto">
                {modalities.length === 0 ? (
                  <p className="text-xs text-slate-400 p-2.5">Nenhuma modalidade cadastrada ainda.</p>
                ) : modalities.map((m) => (
                  <div key={m.id} className="flex justify-between items-center bg-slate-100/50 p-2.5 rounded-lg text-xs font-semibold">
                    <div>
                      <span className="block">{m.name}</span>
                      <span className="block text-[10px] text-slate-450 font-normal">
                        {[
                          m.seriesCount ? `${m.seriesCount} séries` : null,
                          m.shotsPerSeries ? `${m.shotsPerSeries} tiros/série` : null,
                          m.timePerSeriesMinutes ? `${m.timePerSeriesMinutes} min/série` : null,
                          m.evaluationType === 'pontuacao' ? 'Pontuação' : m.evaluationType === 'pontuacao_tempo' ? 'Pontuação + Tempo' : m.evaluationType === 'tempo' ? 'Tempo' : null
                        ].filter(Boolean).join(' • ') || 'Sem detalhes cadastrados'}
                      </span>
                    </div>
                    <button onClick={() => handleDeleteModality(m.id)} className="text-red-500 hover:text-red-700">Excluir</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'cadastrar_resultados':
        return <CadastrarResultadosPanel
          championships={championships}
          stages={stages}
          modalities={modalities}
          currentUser={currentUser}
          onRecordScore={onRecordScore}
          onRefreshData={onRefreshData}
          isPlataformaScope={true}
        />;

      case 'multi_campeonatos':
        return (
          <MultiChampionshipsManager
            championships={championships}
            multiChampionships={multiChampionships}
            currentUser={currentUser}
            onRefreshData={onRefreshData}
          />
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
                    <th className="py-2">Valor Pago</th>
                    <th className="py-2 text-center">Tipo</th>
                    <th className="py-2 text-center">Origem</th>
                    <th className="py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {registrations.map((reg) => {
                    const athlete = users.find(u => u.id === reg.userId);
                    const champ = championships.find(c => c.id === reg.championshipId);
                    const isRegisteredByClub = reg.registeredByUserId && reg.registeredByUserId !== reg.userId;
                    return (
                      <tr key={reg.id}>
                        <td className="py-2.5 font-bold text-slate-800">{athlete?.fullName}</td>
                        <td className="py-2.5 text-slate-500">{champ?.title}</td>
                        <td className="py-2.5 font-mono">{modalityName(reg.modalityId)}</td>
                        <td className="py-2.5 font-semibold text-slate-700">
                          {reg.valorPago != null ? `R$ ${Number(reg.valorPago).toFixed(2)}` : '-'}
                        </td>
                        <td className="py-2.5 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${reg.registrationType === 'reinscrição' ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-800'}`}>
                            {reg.registrationType === 'reinscrição' ? 'REINSCRIÇÃO' : 'NORMAL'}
                          </span>
                        </td>
                        <td className="py-2.5 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${isRegisteredByClub ? 'bg-teal-100 text-teal-800' : 'bg-indigo-100 text-indigo-800'}`}>
                            {isRegisteredByClub ? 'CLUBE' : 'ATLETA'}
                          </span>
                        </td>
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

      case 'cadastro_armas': {
        const clubWeapons = weapons.filter(w => w.ownerId === currentUser?.clubId);
        return (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs text-slate-805">
            <h3 className="font-display font-bold text-slate-900 text-base">Cadastro de Armas do Clube</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-xl space-y-3">
                <h4 className="font-bold text-xs">Registrar Arma no Estande</h4>
                <div className="space-y-2">
                  <input type="text" placeholder="Número da arma" value={newClubWeapon.weaponNumber} onChange={(e) => setNewClubWeapon({ ...newClubWeapon, weaponNumber: e.target.value })} className="w-full bg-white border border-slate-200 p-2.5 rounded-lg text-xs" />
                  <input type="text" placeholder="Número Sigma" value={newClubWeapon.sigmaNumber} onChange={(e) => setNewClubWeapon({ ...newClubWeapon, sigmaNumber: e.target.value })} className="w-full bg-white border border-slate-200 p-2.5 rounded-lg text-xs" />
                  <select value={newClubWeapon.weaponClass} onChange={(e) => setNewClubWeapon({ ...newClubWeapon, weaponClass: e.target.value })} className="w-full bg-white border border-slate-200 p-2.5 rounded-lg text-xs">
                    <option value="">Classe...</option>
                    {weaponLookup('classe').map(o => <option key={o.id} value={o.label}>{o.label}</option>)}
                  </select>
                  <select value={newClubWeapon.model} onChange={(e) => setNewClubWeapon({ ...newClubWeapon, model: e.target.value })} className="w-full bg-white border border-slate-200 p-2.5 rounded-lg text-xs">
                    <option value="">Modelo...</option>
                    {weaponLookup('modelo').map(o => <option key={o.id} value={o.label}>{o.label}</option>)}
                  </select>
                  <select value={newClubWeapon.caliber} onChange={(e) => setNewClubWeapon({ ...newClubWeapon, caliber: e.target.value })} className="w-full bg-white border border-slate-200 p-2.5 rounded-lg text-xs">
                    <option value="">Calibre...</option>
                    {weaponLookup('calibre').map(o => <option key={o.id} value={o.label}>{o.label}</option>)}
                  </select>
                  <select value={newClubWeapon.manufacturer} onChange={(e) => setNewClubWeapon({ ...newClubWeapon, manufacturer: e.target.value })} className="w-full bg-white border border-slate-200 p-2.5 rounded-lg text-xs">
                    <option value="">Fabricante...</option>
                    {weaponLookup('fabricante').map(o => <option key={o.id} value={o.label}>{o.label}</option>)}
                  </select>
                  <select value={newClubWeapon.registrySystem} onChange={(e) => setNewClubWeapon({ ...newClubWeapon, registrySystem: e.target.value })} className="w-full bg-white border border-slate-200 p-2.5 rounded-lg text-xs">
                    <option value="">Arma é...</option>
                    {weaponLookup('tipo_arma').map(o => <option key={o.id} value={o.label}>{o.label}</option>)}
                  </select>
                  <select value={newClubWeapon.permissionStatus} onChange={(e) => setNewClubWeapon({ ...newClubWeapon, permissionStatus: e.target.value })} className="w-full bg-white border border-slate-200 p-2.5 rounded-lg text-xs">
                    <option value="">Status de permissão...</option>
                    {weaponLookup('permissao_arma').map(o => <option key={o.id} value={o.label}>{o.label}</option>)}
                  </select>
                </div>
                <button
                  onClick={handleSaveClubWeapon}
                  disabled={savingClubWeapon || !newClubWeapon.manufacturer || !newClubWeapon.model || !newClubWeapon.caliber || !currentUser?.clubId}
                  className="w-full bg-blue-600 disabled:opacity-60 text-white text-xs py-2 rounded-lg font-bold"
                >
                  {savingClubWeapon ? 'Salvando...' : 'Salvar'}
                </button>
              </div>

              {/* Weapons list */}
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {clubWeapons.length === 0 ? (
                  <p className="text-xs text-slate-400 p-2.5">Nenhuma arma cadastrada para este clube ainda.</p>
                ) : clubWeapons.map((w) => (
                  <div key={w.id} className="border border-slate-200 rounded-xl overflow-hidden">
                    {editingWeaponId === w.id ? (
                      /* ── EDIT MODE ── */
                      <div className="bg-slate-50 p-3 space-y-2">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Editando arma</p>
                        {weaponEditError && (
                          <p className="text-[10px] text-red-600 font-semibold">{weaponEditError}</p>
                        )}
                        <input type="text" placeholder="Número da arma" value={editWeaponData.weaponNumber} onChange={(e) => setEditWeaponData({ ...editWeaponData, weaponNumber: e.target.value })} className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs" />
                        <input type="text" placeholder="Número Sigma" value={editWeaponData.sigmaNumber} onChange={(e) => setEditWeaponData({ ...editWeaponData, sigmaNumber: e.target.value })} className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs" />
                        <select value={editWeaponData.weaponClass} onChange={(e) => setEditWeaponData({ ...editWeaponData, weaponClass: e.target.value })} className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs">
                          <option value="">Classe...</option>
                          {weaponLookup('classe').map(o => <option key={o.id} value={o.label}>{o.label}</option>)}
                        </select>
                        <select value={editWeaponData.model} onChange={(e) => setEditWeaponData({ ...editWeaponData, model: e.target.value })} className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs">
                          <option value="">Modelo...</option>
                          {weaponLookup('modelo').map(o => <option key={o.id} value={o.label}>{o.label}</option>)}
                        </select>
                        <select value={editWeaponData.caliber} onChange={(e) => setEditWeaponData({ ...editWeaponData, caliber: e.target.value })} className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs">
                          <option value="">Calibre...</option>
                          {weaponLookup('calibre').map(o => <option key={o.id} value={o.label}>{o.label}</option>)}
                        </select>
                        <select value={editWeaponData.manufacturer} onChange={(e) => setEditWeaponData({ ...editWeaponData, manufacturer: e.target.value })} className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs">
                          <option value="">Fabricante...</option>
                          {weaponLookup('fabricante').map(o => <option key={o.id} value={o.label}>{o.label}</option>)}
                        </select>
                        <select value={editWeaponData.registrySystem} onChange={(e) => setEditWeaponData({ ...editWeaponData, registrySystem: e.target.value })} className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs">
                          <option value="">Arma é...</option>
                          {weaponLookup('tipo_arma').map(o => <option key={o.id} value={o.label}>{o.label}</option>)}
                        </select>
                        <select value={editWeaponData.permissionStatus} onChange={(e) => setEditWeaponData({ ...editWeaponData, permissionStatus: e.target.value })} className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs">
                          <option value="">Status de permissão...</option>
                          {weaponLookup('permissao_arma').map(o => <option key={o.id} value={o.label}>{o.label}</option>)}
                        </select>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={handleSaveWeaponEdit}
                            disabled={savingWeaponEdit}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs py-2 rounded-lg font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            {savingWeaponEdit ? <><div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Salvando...</> : <><Check className="w-3 h-3" /> Salvar alterações</>}
                          </button>
                          <button
                            onClick={() => { setEditingWeaponId(null); setWeaponEditError(''); }}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs rounded-lg font-semibold transition cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── VIEW MODE ── */
                      <div className="bg-slate-50/50 p-2.5 flex justify-between items-start gap-2 text-xs leading-tight">
                        <div className="min-w-0">
                          <span className="font-bold text-slate-800 block truncate">{w.manufacturer} {w.model} {w.caliber}</span>
                          <span className="text-[10px] text-slate-500 font-mono block truncate">
                            {[w.weaponNumber && `Nº ${w.weaponNumber}`, w.sigmaNumber && `Sigma ${w.sigmaNumber}`, w.weaponClass, w.registrySystem, w.permissionStatus].filter(Boolean).join(' • ')}
                          </span>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => {
                              setEditingWeaponId(w.id);
                              setWeaponEditError('');
                              setEditWeaponData({
                                weaponNumber: w.weaponNumber || '',
                                sigmaNumber: w.sigmaNumber || '',
                                weaponClass: w.weaponClass || '',
                                model: w.model || '',
                                caliber: w.caliber || '',
                                manufacturer: w.manufacturer || '',
                                registrySystem: w.registrySystem || '',
                                permissionStatus: w.permissionStatus || '',
                              });
                            }}
                            className="text-blue-500 hover:text-blue-700 transition p-1 rounded hover:bg-blue-50 cursor-pointer"
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onRemoveWeapon(w.id)}
                            className="text-red-400 hover:text-red-600 transition p-1 rounded hover:bg-red-50 cursor-pointer"
                            title="Remover"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

            </div>
          </div>
        );
      }

      case 'municoes':
        return (
          <MunicoesManagerPanel
            currentUser={currentUser}
            weaponLookupOptions={weaponLookupOptions}
            onAddWeaponLookup={onAddWeaponLookup}
            onRefreshData={onRefreshData}
          />
        );

      case 'treinamentos_competicoes':
        return (
          <TreinamentosCompeticoesAdminPanel
            currentUser={currentUser}
            users={users}
            weapons={weapons}
            weaponLookupOptions={weaponLookupOptions}
            onAddWeapon={onAddWeapon}
            onRefreshData={onRefreshData}
          />
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
        return <HomeBannersManager currentUser={currentUser} />;

      case 'texto_home':
      case 'banners_paginas':
        return <HomeTextManager settings={settings} onSaveSetting={onSaveSetting} />;

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
                    Fotos Próprias ({myUserPhotos.length})
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
                  myUserPhotos.length === 0 ? (
                    <div className="p-3 mb-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500">
                      Você ainda não possui fotos próprias enviadas. Escolha a opção <strong>"Upload de Imagem"</strong> ao lado para carregar do seu dispositivo.
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-3 max-h-[160px] overflow-y-auto p-1 border border-slate-200 rounded-xl bg-slate-50">
                      {myUserPhotos.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setNewDefaultImage(url)}
                          className={`relative rounded-lg overflow-hidden border-2 h-14 bg-slate-100 transition cursor-pointer ${newDefaultImage === url ? 'border-blue-600 scale-95 shadow-xs ring-2 ring-blue-500/30' : 'border-transparent hover:border-slate-300'}`}
                        >
                          <img src={url} alt={`Minha foto ${idx + 1}`} className="w-full h-full object-cover" />
                          <span className="absolute bottom-0 inset-x-0 bg-slate-900/60 text-white text-[7px] truncate px-1 py-0.5 text-center font-semibold font-mono">
                            Foto #{idx + 1}
                          </span>
                        </button>
                      ))}
                    </div>
                  )
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

      case 'certificados_carteirinhas':
        return (
          <ClubTemplatesManager
            currentUser={currentUser}
            clubs={clubs}
          />
        );

      case 'integracoes_sicoob':
        return <SicoobPixManager currentUser={currentUser} />;


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

      case 'gerenciar_armas':
        return (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs text-slate-800 text-left">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-base">Gerenciar Listas de Armas</h3>
                <p className="text-xs text-slate-400">Classe, Modelo, Calibre, Fabricante, Arma é e Status de permissão — usados no cadastro de armas dos clubes.</p>
              </div>
              <Database className="w-5 h-5 text-blue-600" />
            </div>

            {lookupError && (
              <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-semibold">{lookupError}</div>
            )}

            <div className="flex flex-wrap gap-2">
              {WEAPON_LOOKUP_KINDS.map(k => (
                <button
                  key={k.value}
                  type="button"
                  onClick={() => { setLookupKind(k.value); setEditingLookupId(null); setLookupError(''); }}
                  className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition ${lookupKind === k.value ? 'bg-blue-600 border-blue-600 text-white shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-650'}`}
                >
                  {k.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder={`Novo item em "${WEAPON_LOOKUP_KINDS.find(k => k.value === lookupKind)?.label}"`}
                value={newLookupLabel}
                onChange={(e) => setNewLookupLabel(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl focus:border-blue-500 text-xs text-slate-700"
              />
              <button
                onClick={handleAddLookupItem}
                disabled={savingLookup || !newLookupLabel.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs px-4 py-2.5 rounded-xl font-bold transition cursor-pointer"
              >
                {savingLookup ? 'Salvando...' : 'Adicionar'}
              </button>
            </div>

            <div className="space-y-2 max-h-[360px] overflow-y-auto">
              {weaponLookupOptions.filter(o => o.kind === lookupKind).length === 0 ? (
                <p className="text-xs text-slate-400">Nenhum item cadastrado nesta lista ainda.</p>
              ) : weaponLookupOptions.filter(o => o.kind === lookupKind).map(o => (
                <div key={o.id} className="flex justify-between items-center bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-xs">
                  {editingLookupId === o.id ? (
                    <>
                      <input
                        type="text"
                        value={editingLookupLabel}
                        onChange={(e) => setEditingLookupLabel(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 outline-none p-1.5 rounded-lg text-xs mr-2"
                      />
                      <div className="flex gap-2 shrink-0">
                        <button onClick={handleSaveLookupEdit} className="text-emerald-600 hover:text-emerald-800 font-bold text-[10px]">Salvar</button>
                        <button onClick={() => setEditingLookupId(null)} className="text-slate-500 hover:text-slate-700 font-bold text-[10px]">Cancelar</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-slate-800">{o.label}</span>
                      <div className="flex gap-3 shrink-0">
                        <button onClick={() => startEditingLookup(o)} className="text-blue-600 hover:text-blue-800 font-bold text-[10px]">Editar</button>
                        <button onClick={() => handleDeleteLookupItem(o.id)} className="text-red-500 hover:text-red-700 font-bold text-[10px]">Excluir</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
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
                { id: 'inscricao_clube', label: 'Inscrição Clube', icon: FileCheck },
                { id: 'certificados', label: 'Certificados', icon: Award },
                { id: 'cadastrar_membros', label: 'Cadastrar Membros', icon: UserPlus },
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
                    <button onClick={() => setPlataformaMenu('texto_home')} className={`w-full text-left px-3 py-2 rounded text-[11px] font-semibold transition ${plataformaMenu === 'texto_home' || plataformaMenu === 'banners_paginas' ? 'text-blue-600 bg-blue-50/50 font-bold' : 'text-slate-650 hover:bg-slate-50'}`}>Texto Home</button>
                    <button onClick={() => setPlataformaMenu('certificados_carteirinhas')} className={`w-full text-left px-3 py-2 rounded text-[11px] font-semibold transition ${plataformaMenu === 'certificados_carteirinhas' ? 'text-blue-600 bg-blue-50/50 font-bold' : 'text-slate-650 hover:bg-slate-50'}`}>Certificados e Carteirinhas</button>
                  </div>
                )}
              </div>

              {/* 6. Section: Integrações */}
              <div className="space-y-1">
                <button
                  onClick={() => toggleSection('integracoes')}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-450 hover:text-slate-700 cursor-pointer"
                >
                  <span>Integrações</span>
                  {expandedSections.integracoes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {expandedSections.integracoes && (
                  <div className="pl-3 border-l border-slate-100 space-y-0.5 mt-1">
                    <button onClick={() => setPlataformaMenu('integracoes_sicoob')} className={`w-full text-left px-3 py-2 rounded text-[11px] font-semibold transition ${plataformaMenu === 'integracoes_sicoob' ? 'text-blue-600 bg-blue-50/50 font-bold' : 'text-slate-650 hover:bg-slate-50'}`}>Sicoob</button>
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
                { id: 'gestao_cobrancas', label: 'Gestão de Cobranças', icon: CreditCard },
                ...(currentUser?.role === 'master_admin' ? [{ id: 'gerenciar_armas', label: 'Listas de Armas', icon: Database }] : [])
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

      {/* POPUP: LISTA DE INSCRITOS */}
      {selectedChampForInscritosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-4xl overflow-hidden shadow-2xl text-slate-800 flex flex-col max-h-[85vh] text-left">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h4 className="font-display font-bold text-slate-900 text-sm">
                  Inscritos — {selectedChampForInscritosModal.title}
                </h4>
                <p className="text-[10px] text-slate-400">Lista ordenada por Nome, Etapa e Modalidade</p>
              </div>
              <button 
                onClick={() => {
                  setSelectedChampForInscritosModal(null);
                  setInscritosSearchQuery('');
                }} 
                className="text-slate-400 hover:text-slate-650 transition cursor-pointer p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search bar inside popup */}
            <div className="px-6 py-3 border-b border-slate-100 bg-white flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Buscar por atleta, etapa, modalidade ou origem (clube/atleta)..."
                value={inscritosSearchQuery}
                onChange={(e) => setInscritosSearchQuery(e.target.value)}
                className="w-full text-xs outline-none bg-transparent placeholder:text-slate-400 text-slate-700"
              />
              {inscritosSearchQuery && (
                <button
                  onClick={() => setInscritosSearchQuery('')}
                  className="text-slate-400 hover:text-slate-600 text-xs font-semibold cursor-pointer"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Body - Scrollable table */}
            <div className="overflow-y-auto flex-1 p-6">
              {(() => {
                const allChampRegs = registrations.filter(r => r.championshipId === selectedChampForInscritosModal.id);
                
                const modalRegs = allChampRegs
                  .map(r => {
                    const user = users.find(u => u.id === r.userId);
                    const stage = stages.find(s => s.id === r.stageId);
                    const modality = modalities.find(m => m.id === r.modalityId);
                    return {
                      ...r,
                      athleteName: user?.fullName || 'Atleta Desconhecido',
                      stageTitle: stage?.title || 'Etapa Desconhecida',
                      modalityName: modality?.name || 'Modalidade Desconhecida',
                      athleteCpf: user?.cpf || '',
                    };
                  })
                  .sort((a, b) => {
                    const nameCompare = a.athleteName.localeCompare(b.athleteName, 'pt-BR');
                    if (nameCompare !== 0) return nameCompare;
                    const stageCompare = a.stageTitle.localeCompare(b.stageTitle, 'pt-BR');
                    if (stageCompare !== 0) return stageCompare;
                    return a.modalityName.localeCompare(b.modalityName, 'pt-BR');
                  });

                const filteredRegs = modalRegs.filter(r => {
                  const query = inscritosSearchQuery.toLowerCase();
                  const isClub = Boolean(r.registeredByUserId && r.registeredByUserId !== r.userId);
                  const origemStr = isClub ? 'clube' : 'atleta';
                  return (
                    r.athleteName.toLowerCase().includes(query) ||
                    r.stageTitle.toLowerCase().includes(query) ||
                    r.modalityName.toLowerCase().includes(query) ||
                    r.athleteCpf.includes(query) ||
                    origemStr.includes(query)
                  );
                });

                if (allChampRegs.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-450">
                      <Trophy className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                      <p className="text-xs font-semibold">Nenhum atleta inscrito neste campeonato.</p>
                    </div>
                  );
                }

                if (filteredRegs.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-455">
                      <Search className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                      <p className="text-xs font-semibold">Nenhuma inscrição corresponde à busca.</p>
                    </div>
                  );
                }

                return (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 font-mono text-[9px] text-slate-400 uppercase">
                        <th className="py-2">Atleta</th>
                        <th className="py-2">Etapa</th>
                        <th className="py-2">Modalidade</th>
                        <th className="py-2 text-center">Tipo</th>
                        <th className="py-2 text-center">Origem</th>
                        <th className="py-2 text-center">Valor Inscrição</th>
                        <th className="py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredRegs.map((reg) => {
                        const isClub = Boolean(reg.registeredByUserId && reg.registeredByUserId !== reg.userId);
                        const regValue = (reg.valorPago && reg.valorPago > 0 && reg.valorPago !== 120)
                          ? reg.valorPago
                          : reg.registrationType === 'reinscrição'
                            ? (selectedChampForInscritosModal.valorReinscricao ?? selectedChampForInscritosModal.registrationFee ?? 0)
                            : isClub
                              ? (selectedChampForInscritosModal.valorInscricaoClube ?? selectedChampForInscritosModal.registrationFee ?? 0)
                              : (selectedChampForInscritosModal.valorInscricaoIndividual ?? selectedChampForInscritosModal.registrationFee ?? 0);

                        return (
                          <tr key={reg.id} className="hover:bg-slate-50/50">
                            <td className="py-3 pr-2 font-bold text-slate-800">
                              <div>{reg.athleteName}</div>
                              {reg.athleteCpf && (
                                <div className="text-[9px] font-mono font-normal text-slate-400">CPF: {reg.athleteCpf}</div>
                              )}
                            </td>
                            <td className="py-3 px-2 text-slate-500 font-semibold">{reg.stageTitle}</td>
                            <td className="py-3 px-2 text-slate-655 font-mono">{reg.modalityName}</td>
                            <td className="py-3 px-2 text-center">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${reg.registrationType === 'reinscrição' ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-800'}`}>
                                {reg.registrationType === 'reinscrição' ? 'REINSCRIÇÃO' : 'NORMAL'}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${isClub ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                {isClub ? 'CLUBE' : 'ATLETA'}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-center font-bold font-mono text-emerald-600">
                              R$ {regValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 text-center">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${reg.paymentStatus === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                {reg.paymentStatus === 'approved' ? 'HOMOLOGADA' : 'PENDENTE'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs">
              <span className="text-slate-500 font-semibold">
                {(() => {
                  const allRegs = registrations.filter(r => r.championshipId === selectedChampForInscritosModal.id);
                  const totalCount = allRegs.length;
                  const totalValor = allRegs.reduce((acc, r) => {
                    const isClub = Boolean(r.registeredByUserId && r.registeredByUserId !== r.userId);
                    const val = (r.valorPago && r.valorPago > 0 && r.valorPago !== 120)
                      ? r.valorPago
                      : r.registrationType === 'reinscrição'
                        ? (selectedChampForInscritosModal.valorReinscricao ?? selectedChampForInscritosModal.registrationFee ?? 0)
                        : isClub
                          ? (selectedChampForInscritosModal.valorInscricaoClube ?? selectedChampForInscritosModal.registrationFee ?? 0)
                          : (selectedChampForInscritosModal.valorInscricaoIndividual ?? selectedChampForInscritosModal.registrationFee ?? 0);
                    return acc + val;
                  }, 0);
                  return `Total: ${totalCount} inscrição(ões) — Total Arrecadado: R$ ${totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                })()}
              </span>
              <button
                onClick={() => {
                  setSelectedChampForInscritosModal(null);
                  setInscritosSearchQuery('');
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      </div>

    </div>
  );
}

export function HomeTextManager({
  settings = {},
  onSaveSetting,
}: {
  settings?: { [key: string]: string };
  onSaveSetting?: (key: string, value: string) => Promise<void>;
}) {
  const [tag, setTag] = useState(settings.home_hero_tag ?? 'ESTANDE E FEDERAÇÃO DE ALTA PRECISÃO');
  const [title, setTitle] = useState(settings.home_hero_title ?? 'A Pista de Encontro dos Atletas Federados');
  const [subtitle, setSubtitle] = useState(
    settings.home_hero_subtitle ??
      'Monitore resultados de etapas em tempo real, acompanhe rankings do clube, interaja na rede social de tiro e garanta sua inscrição oficial nos principais campeonatos de tiro prático e de precisão de Brasília.'
  );
  const [btn1Text, setBtn1Text] = useState(settings.home_hero_btn1_text ?? 'Começar Agora');
  const [btn1Link, setBtn1Link] = useState(settings.home_hero_btn1_link ?? '');
  const [btn2Text, setBtn2Text] = useState(settings.home_hero_btn2_text ?? 'Ver Campeonatos');
  const [btn2Link, setBtn2Link] = useState(settings.home_hero_btn2_link ?? '#championships');

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (settings.home_hero_tag !== undefined) setTag(settings.home_hero_tag);
    if (settings.home_hero_title !== undefined) setTitle(settings.home_hero_title);
    if (settings.home_hero_subtitle !== undefined) setSubtitle(settings.home_hero_subtitle);
    if (settings.home_hero_btn1_text !== undefined) setBtn1Text(settings.home_hero_btn1_text);
    if (settings.home_hero_btn1_link !== undefined) setBtn1Link(settings.home_hero_btn1_link);
    if (settings.home_hero_btn2_text !== undefined) setBtn2Text(settings.home_hero_btn2_text);
    if (settings.home_hero_btn2_link !== undefined) setBtn2Link(settings.home_hero_btn2_link);
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveSetting) return;
    setSaving(true);
    setSuccess(false);
    try {
      await onSaveSetting('home_hero_tag', tag);
      await onSaveSetting('home_hero_title', title);
      await onSaveSetting('home_hero_subtitle', subtitle);
      await onSaveSetting('home_hero_btn1_text', btn1Text);
      await onSaveSetting('home_hero_btn1_link', btn1Link);
      await onSaveSetting('home_hero_btn2_text', btn2Text);
      await onSaveSetting('home_hero_btn2_link', btn2Link);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs text-slate-800">
      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
        <div>
          <h3 className="font-display font-bold text-slate-900 text-base">Gerenciamento dos Textos da Página Inicial (Home)</h3>
          <p className="text-xs text-slate-400">Edite a insígnia, título principal, texto descritivo e botões de ação exibidos logo abaixo do banner principal.</p>
        </div>
        <FileText className="w-5 h-5 text-blue-600 animate-pulse" />
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl flex items-center gap-2 text-xs font-semibold">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          Textos da Página Inicial atualizados com sucesso no banco de dados!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Insígnia / Tag Superior */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase block">Insígnia / Destaque Superior (Tag)</label>
          <input
            type="text"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="Ex: ESTANDE E FEDERAÇÃO DE ALTA PRECISÃO"
            className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:border-blue-500 text-xs text-slate-800 font-semibold"
          />
        </div>

        {/* Título Principal */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase block">Título Principal (H2)</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: A Pista de Encontro dos Atletas Federados"
            className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:border-blue-500 text-xs text-slate-900 font-bold"
          />
        </div>

        {/* Texto Descritivo */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase block">Texto Descritivo (Subtítulo)</label>
          <textarea
            rows={3}
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Ex: Monitore resultados de etapas em tempo real..."
            className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700 leading-relaxed resize-y"
          />
        </div>

        {/* Configuração de Botões */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          {/* Botão 1 */}
          <div className="bg-slate-50/70 border border-slate-200/80 p-4 rounded-xl space-y-3">
            <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              Botão Principal (Ação 1)
            </h4>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase block">Texto do Botão 1</label>
              <input
                type="text"
                value={btn1Text}
                onChange={(e) => setBtn1Text(e.target.value)}
                placeholder="Ex: Começar Agora"
                className="w-full bg-white border border-slate-200 p-2.5 rounded-lg text-xs font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase block">Link / Destino (opcional)</label>
              <input
                type="text"
                value={btn1Link}
                onChange={(e) => setBtn1Link(e.target.value)}
                placeholder="Deixe em branco p/ abrir modal de login ou cole URL (ex: https://...)"
                className="w-full bg-white border border-slate-200 p-2.5 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          {/* Botão 2 */}
          <div className="bg-slate-50/70 border border-slate-200/80 p-4 rounded-xl space-y-3">
            <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-600"></span>
              Botão Secundário (Ação 2)
            </h4>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase block">Texto do Botão 2</label>
              <input
                type="text"
                value={btn2Text}
                onChange={(e) => setBtn2Text(e.target.value)}
                placeholder="Ex: Ver Campeonatos"
                className="w-full bg-white border border-slate-200 p-2.5 rounded-lg text-xs font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase block">Link / Destino</label>
              <input
                type="text"
                value={btn2Link}
                onChange={(e) => setBtn2Link(e.target.value)}
                placeholder="Ex: #championships ou https://..."
                className="w-full bg-white border border-slate-200 p-2.5 rounded-lg text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Pré-visualização ao Vivo (Live Preview) */}
        <div className="space-y-2 pt-3 border-t border-slate-100">
          <label className="text-[10px] font-bold text-slate-500 uppercase block">Pré-visualização da Seção no Site Público</label>
          <div className="bg-slate-950 p-8 rounded-2xl border border-slate-800 text-center space-y-4">
            <div className="inline-flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full text-[10px] text-blue-400 font-bold tracking-wide uppercase">
              <Sparkles className="w-3 h-3 animate-pulse" />
              {tag || 'SEU BADGE AQUI'}
            </div>
            <h3 className="font-display font-black text-xl sm:text-2xl text-white tracking-tight">
              {title || 'Seu Título Aqui'}
            </h3>
            <p className="text-slate-400 text-xs max-w-xl mx-auto leading-relaxed">
              {subtitle || 'Seu texto descritivo aparecerá aqui.'}
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <span className="bg-gradient-to-r from-blue-600 to-sky-500 text-white font-extrabold text-[10px] px-5 py-2.5 rounded-full uppercase tracking-wider shadow">
                {btn1Text || 'Botão 1'}
              </span>
              <span className="bg-slate-900 text-slate-200 border border-slate-800 font-bold text-[10px] px-5 py-2.5 rounded-full uppercase tracking-wider">
                {btn2Text || 'Botão 2'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs px-6 py-3 rounded-xl font-bold transition shadow-lg shadow-blue-100 cursor-pointer flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Salvando Alterações...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvar Texto Home
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export function HomeBannersManager({ currentUser }: { currentUser: User | null }) {
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<HomeBanner | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [form, setForm] = useState({
    tag: 'DESTAQUE PRINCIPAL',
    subtitle: 'INSCRIÇÕES ABERTAS • COPA DE INVERNO G&G',
    title: 'Campeonato IPSC Copa de Inverno 2026',
    description: 'Prepare-se para o maior confronto de IPSC Handgun do Centro-Oeste! Pistas dinâmicas que testam velocidade, precisão e potência (DVC).',
    buttonText: 'GARANTIR MINHA VAGA',
    imageUrl: 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=1200&auto=format&fit=crop&q=80',
    linkUrl: '',
    active: true,
    displayOrder: 1,
  });

  const loadBanners = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/home-banners', {
        headers: { 'x-user-id': currentUser?.id || '' }
      });
      const data = await res.json();
      if (data.banners) {
        setBanners(data.banners);
      }
    } catch (err) {
      console.error('Failed to load banners:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBanners();
  }, []);

  const openCreateModal = () => {
    setEditingBanner(null);
    setForm({
      tag: 'DESTAQUE PRINCIPAL',
      subtitle: 'INSCRIÇÕES ABERTAS • COPA DE INVERNO G&G',
      title: '',
      description: '',
      buttonText: 'GARANTIR MINHA VAGA',
      imageUrl: 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=1200&auto=format&fit=crop&q=80',
      linkUrl: '',
      active: true,
      displayOrder: banners.length + 1,
    });
    setErrorMsg('');
    setModalOpen(true);
  };

  const openEditModal = (b: HomeBanner) => {
    setEditingBanner(b);
    setForm({
      tag: b.tag || 'DESTAQUE PRINCIPAL',
      subtitle: b.subtitle || 'INSCRIÇÕES ABERTAS • COPA DE INVERNO G&G',
      title: b.title || '',
      description: b.description || '',
      buttonText: b.buttonText || 'GARANTIR MINHA VAGA',
      imageUrl: b.imageUrl || '',
      linkUrl: b.linkUrl || '',
      active: b.active !== false,
      displayOrder: b.displayOrder || 1,
    });
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      setErrorMsg('Título e Descrição são obrigatórios.');
      return;
    }
    setSaving(true);
    setErrorMsg('');
    try {
      const url = editingBanner ? `/api/home-banners/${editingBanner.id}` : '/api/home-banners';
      const method = editingBanner ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || ''
        },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar banner.');

      setSuccessMsg(editingBanner ? 'Banner atualizado com sucesso!' : 'Novo banner cadastrado com sucesso!');
      setTimeout(() => setSuccessMsg(''), 3000);
      setModalOpen(false);
      loadBanners();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar banner.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (b: HomeBanner) => {
    try {
      const res = await fetch(`/api/home-banners/${b.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || ''
        },
        body: JSON.stringify({ active: !b.active })
      });
      if (res.ok) {
        setSuccessMsg(`Status do banner alterado para ${!b.active ? 'Ativo' : 'Inativo'}.`);
        setTimeout(() => setSuccessMsg(''), 2500);
        loadBanners();
      }
    } catch (err) {
      console.error('Failed to toggle banner:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este banner da página inicial?')) return;
    try {
      const res = await fetch(`/api/home-banners/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': currentUser?.id || '' }
      });
      if (res.ok) {
        setSuccessMsg('Banner excluído com sucesso.');
        setTimeout(() => setSuccessMsg(''), 2500);
        loadBanners();
      }
    } catch (err) {
      console.error('Failed to delete banner:', err);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs text-slate-800">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="font-display font-bold text-slate-900 text-base flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            Gerenciador de Banners da Página Inicial (Home)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastre múltiplos banners para criar o carrossel em sequência exibido na capa do site público.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-100 cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          Cadastrar Novo Banner
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl flex items-center gap-2 text-xs font-semibold">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Banners List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs font-mono">
          Carregando banners do carrossel...
        </div>
      ) : banners.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50 space-y-3">
          <Globe className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">Nenhum banner cadastrado para o carrossel da Home.</p>
          <button
            onClick={openCreateModal}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition"
          >
            Cadastrar Primeiro Banner
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
            <span>Banners Cadastrados ({banners.length})</span>
            <span className="text-[10px] text-slate-400 font-normal normal-case">Ordem definida pelo campo Ordem de Exibição</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {banners.map((b) => (
              <div
                key={b.id}
                className={`border rounded-2xl p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center transition ${b.active ? 'border-slate-200 bg-white hover:border-slate-300' : 'border-slate-200 bg-slate-50 opacity-70'}`}
              >
                {/* Banner Thumbnail & Info */}
                <div className="flex items-start md:items-center gap-4 min-w-0 flex-1">
                  <div className="w-28 h-20 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-200 relative group">
                    <img
                      src={b.imageUrl || 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=800&auto=format&fit=crop&q=80'}
                      alt={b.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=800&auto=format&fit=crop&q=80';
                      }}
                    />
                    <span className="absolute top-1 left-1 bg-black/70 text-white text-[9px] font-mono px-1.5 py-0.5 rounded font-bold">
                      #{b.displayOrder}
                    </span>
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-blue-100 text-blue-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {b.tag || 'DESTAQUE'}
                      </span>
                      <span className="text-[10px] text-amber-600 font-bold uppercase truncate max-w-xs">
                        {b.subtitle}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                        {b.active ? 'Ativo na Home' : 'Inativo'}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm truncate">{b.title}</h4>
                    <p className="text-xs text-slate-500 line-clamp-1 max-w-xl">{b.description}</p>
                    <div className="text-[10px] font-mono text-slate-400 flex items-center gap-3">
                      <span>Botão: <strong>{b.buttonText}</strong></span>
                      {b.linkUrl && <span className="truncate max-w-xs text-blue-600">Link: {b.linkUrl}</span>}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0 border-t md:border-t-0 pt-3 md:pt-0 w-full md:w-auto justify-end">
                  <button
                    onClick={() => handleToggleActive(b)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition cursor-pointer ${b.active ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'}`}
                  >
                    {b.active ? 'Desativar' : 'Ativar'}
                  </button>

                  <button
                    onClick={() => openEditModal(b)}
                    className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer border border-slate-200"
                    title="Editar Banner"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(b.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer border border-slate-200"
                    title="Excluir Banner"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h4 className="font-bold text-slate-900 text-sm">
                {editingBanner ? 'Editar Banner da Home' : 'Cadastrar Novo Banner da Home'}
              </h4>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl flex items-center gap-2 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tag / Badge (Topo) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: DESTAQUE PRINCIPAL"
                    value={form.tag}
                    onChange={(e) => setForm({ ...form, tag: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-blue-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Subtítulo (Laranja) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: INSCRIÇÕES ABERTAS • COPA DE INVERNO G&G"
                    value={form.subtitle}
                    onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-blue-500 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Título Principal do Banner *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Campeonato IPSC Copa de Inverno 2026"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-blue-500 font-bold text-sm"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Descrição Curta *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ex: Prepare-se para o maior confronto de IPSC Handgun do Centro-Oeste! Pistas dinâmicas que testam velocidade, precisão e potência (DVC)."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-blue-500 font-normal leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Texto do Botão de Ação *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: GARANTIR MINHA VAGA"
                    value={form.buttonText}
                    onChange={(e) => setForm({ ...form, buttonText: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-blue-500 font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">URL de Destino / Link (Opcional)</label>
                  <input
                    type="url"
                    placeholder="https://... (deixe em branco para abrir modal de inscrição)"
                    value={form.linkUrl}
                    onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Ordem de Exibição no Carrossel</label>
                  <input
                    type="number"
                    min={1}
                    value={form.displayOrder}
                    onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-blue-500 font-bold"
                  />
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <input
                    type="checkbox"
                    id="bannerActive"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                  <label htmlFor="bannerActive" className="font-bold text-slate-800 cursor-pointer">
                    Banner Ativo no Carrossel da Home
                  </label>
                </div>
              </div>

              {/* Image selection / Upload */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Imagem de Fundo do Banner (URL ou Upload)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://... (URL da imagem)"
                    value={form.imageUrl}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                    className="flex-1 bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-blue-500 font-mono text-[11px]"
                  />
                  <label className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1 shrink-0 text-xs">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setForm({ ...form, imageUrl: reader.result as string });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>

                {/* Preset image suggestions */}
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] text-slate-400 font-semibold block">Sugestões de Galeria:</span>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {GALLERY_IMAGES.map((img) => (
                      <button
                        type="button"
                        key={img.id}
                        onClick={() => setForm({ ...form, imageUrl: img.url })}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border shrink-0 cursor-pointer transition ${form.imageUrl === img.url ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-650 hover:bg-slate-100 border-slate-200'}`}
                      >
                        {img.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Preview Box */}
                {form.imageUrl && (
                  <div className="mt-3 rounded-2xl overflow-hidden h-36 relative border border-slate-800 flex flex-col justify-end p-4 shadow-sm select-none"
                    style={{
                      backgroundImage: `linear-gradient(to right, rgba(9, 15, 29, 0.95) 30%, rgba(9, 15, 29, 0.4) 70%, rgba(9, 15, 29, 0.1)), url(${form.imageUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    <div className="bg-blue-600/20 text-blue-300 text-[8px] font-black uppercase px-2 py-0.5 rounded-full self-start mb-1 border border-blue-400/30">
                      {form.tag || 'DESTAQUE'}
                    </div>
                    <span className="text-[9px] text-amber-500 font-black uppercase block truncate">{form.subtitle}</span>
                    <h5 className="font-extrabold text-white text-sm leading-tight truncate">{form.title || 'Título do Banner'}</h5>
                    <p className="text-[10px] text-slate-300 truncate">{form.description}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition cursor-pointer shadow-md shadow-blue-100 flex items-center gap-1.5"
                >
                  {saving ? 'Salvando...' : editingBanner ? 'Atualizar Banner' : 'Cadastrar Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
