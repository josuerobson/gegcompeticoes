import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User, Post, Registration, StageScore, Championship, Modality, Club, Stage, Weapon, TrainingSession, WeaponLookupOption } from '../types';
import { CompetitionResultsViewer } from './CompetitionResultsViewer';
import { ClubCertificatesViewer } from './ClubCertificatesViewer';
import { QRCodeView } from './QRCodeView';
import {
  ShieldCheck, HelpCircle, Activity, Award, Grid, Target, CheckCircle2,
  DollarSign, Calendar, CreditCard, LogOut, FileText, Trophy,
  Disc, Printer, Plus, Trash2, ShieldAlert, ChevronRight, ChevronLeft, ChevronDown, Info, PlusCircle, X, UserCog, Camera,
  Clock, Copy, QrCode, Images, Heart, MessageCircle, Send, Bookmark, Maximize2, Share2, Repeat, Loader2, Menu, Search, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { compressUploadImage } from '../utils/imageCompressor';
import { PostImageCarousel } from './FeedView';
import likeIcon from '@/assets/like_icon.png';
import { SharedPostInfo } from '../types';

interface MemberProfileProps {
  currentUser: User | null;
  selectedUser: User;
  posts: Post[];
  registrations: Registration[];
  stageScores: StageScore[];
  championships: Championship[];
  modalities: Modality[];
  clubs: Club[];
  stages?: Stage[];
  users?: User[];
  weapons?: Weapon[];
  weaponLookupOptions?: WeaponLookupOption[];
  onAddWeapon?: (weapon: Partial<Weapon>) => Promise<any>;
  onToggleFollow: (userId: string) => Promise<void>;
  onPaySignature: () => Promise<void>;
  onLogout: () => void;
  onAddPost: (content: string, imageUrl?: string, targetScore?: any, imageUrls?: string[], sharedPost?: SharedPostInfo) => Promise<void>;
  onLikePost?: (postId: string) => Promise<void>;
  onCommentPost?: (postId: string, content: string) => Promise<void>;
  onDeletePost?: (postId: string) => Promise<void>;
  onViewProfile?: (username: string) => void;
  onNavigateToChampionships: () => void;
  onUpdateProfile: (fields: Record<string, unknown>) => Promise<boolean>;
  onUpdateClub: (clubId: string, fields: Record<string, unknown>) => Promise<boolean>;
  onUploadDocument: (kind: string, file: File, target: 'user' | 'club') => Promise<boolean>;
  defaultImage?: string;
}

// Labeled text input matching this page's light card style (see the Treinamentos
// tab's add-form for the reference styling this mirrors).
function ProfileField({ label, value, onChange, type = 'text', placeholder }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] text-slate-450 font-bold uppercase mb-1">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
      />
    </div>
  );
}

function ProfileSelect({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-[10px] text-slate-450 font-bold uppercase mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
      >
        <option value="">Selecione...</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}


// Labeled file input for the document-completion section, same 1MB cap the
// upload endpoint enforces server-side.
function ProfileFileField({ label, onUpload }: { label: string; onUpload: (file: File) => Promise<void> }) {
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  return (
    <div>
      <label className="block text-[10px] text-slate-450 font-bold uppercase mb-1">{label}</label>
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

// A section of the "Meu cadastro" form that saves independently — the user
// fills in whatever part they have on hand and comes back later for the rest.
function ProfileSection({ title, children, onSave, saving, saved }: {
  title: string;
  children: React.ReactNode;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}) {
  return (
    <div className="bg-slate-50 p-4 rounded-xl space-y-3 border border-slate-100">
      <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-450">{title}</h5>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
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
            <CheckCircle2 className="w-3.5 h-3.5" /> Salvo
          </span>
        )}
      </div>
    </div>
  );
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
    userId: 'demo',
    dateTime: '2026-05-15T10:00',
    modality: 'IPSC Handgun',
    weaponName: 'Taurus TS9',
    weaponCaliber: '9mm',
    weaponOwnerType: 'propria',
    totalShots: 150,
    ownAmmoShots: 150,
    clubAmmoShots: 0,
    score: 138,
    notes: 'Treino focado em transição de alvos múltiplos e saque rápido.'
  },
  {
    id: 't2',
    userId: 'demo',
    dateTime: '2026-05-28T14:30',
    modality: 'Saque Rápido',
    weaponName: 'Glock G25',
    weaponCaliber: '.380',
    weaponOwnerType: 'propria',
    totalShots: 100,
    ownAmmoShots: 50,
    clubAmmoShots: 50,
    score: 92,
    notes: 'Treino de controle de recuo e trigger reset seco.'
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

// Downscales and JPEG-compresses an avatar image client-side before it's sent
// as a data URL — avatars ride along on every GET /api/users response, so an
// uncompressed photo would bloat that payload for everyone, not just the owner.
function resizeImageToDataUrl(file: File, maxSize = 400, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas não suportado neste navegador.'));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function MemberProfile({
  currentUser,
  selectedUser,
  posts,
  registrations,
  stageScores,
  championships,
  modalities,
  clubs,
  stages = [],
  users = [],
  weapons = [],
  weaponLookupOptions = [],
  onAddWeapon,
  onToggleFollow,
  onPaySignature,
  onLogout,
  onAddPost,
  onLikePost,
  onCommentPost,
  onDeletePost,
  onViewProfile,
  onNavigateToChampionships,
  onUpdateProfile,
  onUpdateClub,
  onUploadDocument,
  defaultImage
}: MemberProfileProps) {
  const modalityName = (id: string) => modalities.find(m => m.id === id)?.name || id;

  // Post action states & Lightbox for profile post stream
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});
  const [activeCommentDrawer, setActiveCommentDrawer] = useState<string | null>(null);
  const [shareModalPost, setShareModalPost] = useState<Post | null>(null);
  const [shareComment, setShareComment] = useState('');
  const [isSubmittingShare, setIsSubmittingShare] = useState(false);
  const [lightboxState, setLightboxState] = useState<{
    images: string[];
    currentIndex: number;
    authorName?: string;
    authorAvatar?: string;
  } | null>(null);

  const handleSendComment = (postId: string) => {
    const content = commentInputs[postId];
    if (content && content.trim() && onCommentPost) {
      onCommentPost(postId, content.trim());
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    }
  };

  const handleConfirmShare = async () => {
    if (!shareModalPost) return;
    setIsSubmittingShare(true);
    try {
      const origImgs = shareModalPost.imageUrls && shareModalPost.imageUrls.length > 0
        ? shareModalPost.imageUrls
        : (shareModalPost.imageUrl ? [shareModalPost.imageUrl] : undefined);

      const sharedInfo: SharedPostInfo = {
        originalPostId: shareModalPost.id,
        originalUserId: shareModalPost.userId,
        originalUsername: shareModalPost.username,
        originalUserAvatar: shareModalPost.userAvatar,
        originalContent: shareModalPost.content,
        originalImageUrl: shareModalPost.imageUrl,
        originalImageUrls: origImgs,
        originalTargetScore: shareModalPost.targetScore,
        originalCreatedAt: shareModalPost.createdAt
      };

      await onAddPost(shareComment.trim(), undefined, undefined, undefined, sharedInfo);
      setShareModalPost(null);
      setShareComment('');
    } catch (err) {
      console.error('Error sharing post:', err);
    } finally {
      setIsSubmittingShare(false);
    }
  };

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (!lightboxState) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxState(null);
      } else if (e.key === 'ArrowLeft') {
        setLightboxState(prev => prev ? { ...prev, currentIndex: (prev.currentIndex - 1 + prev.images.length) % prev.images.length } : null);
      } else if (e.key === 'ArrowRight') {
        setLightboxState(prev => prev ? { ...prev, currentIndex: (prev.currentIndex + 1) % prev.images.length } : null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxState]);

  // Tabs expanded
  type ProfileTabType = 'my_profile' | 'posts' | 'championships' | 'multi_championships' | 'my_registrations' | 'results' | 'certificates' | 'club_card' | 'playoff_card' | 'shooter_card' | 'gg_card' | 'trainings' | 'declarations' | 'ammo';
  const [profileTab, setProfileTab] = useState<ProfileTabType>('posts');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (profileTab === 'championships') {
      onNavigateToChampionships();
    }
  }, [profileTab, onNavigateToChampionships]);

  // Avatar change
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAvatarError('Selecione um arquivo de imagem.');
      e.target.value = '';
      return;
    }
    setAvatarError('');
    setAvatarSaving(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      const ok = await onUpdateProfile({ avatarUrl: dataUrl });
      if (!ok) setAvatarError('Erro ao atualizar foto.');
    } catch (err) {
      console.error(err);
      setAvatarError('Erro ao processar imagem.');
    } finally {
      setAvatarSaving(false);
      e.target.value = '';
    }
  };

  // "Meu cadastro" — progressive profile completion, saved one section at a time
  const isClubAdmin = selectedUser.role === 'club_admin';
  const myClub = clubs.find(c => c.id === selectedUser.clubId);

  // users.is_profile_complete is always true for club_admin accounts (it only
  // gates the admin's own championship registration, which doesn't apply to
  // how they act) — so for a club, "complete" has to be judged from the
  // club's own data instead of that flag.
  const isClubDataComplete = Boolean(
    myClub?.crNumber && myClub?.responsibleName && myClub?.phone && myClub?.email &&
    myClub?.address && myClub?.city && myClub?.state
  );
  const isRegistrationComplete = isClubAdmin ? isClubDataComplete : Boolean(selectedUser.isProfileComplete);

  const [profileForm, setProfileForm] = useState({
    fullName: '', birthDate: '', sex: '', rg: '', rgIssuer: '', rgIssueDate: '',
    fatherName: '', motherName: '', crNumber: '', crValidity: '', militaryRegion: '', nationality: '',
    phone: '', cep: '', address: '', addressNumber: '', complement: '', neighborhood: '', city: '', state: ''
  });
  const [clubForm, setClubForm] = useState({
    name: '', crNumber: '', responsibleName: '', phone: '', email: '',
    cep: '', address: '', addressNumber: '', complement: '', neighborhood: '', city: '', state: ''
  });
  const [savingSection, setSavingSection] = useState<string | null>(null);

  // Batch payment state for pending registrations in Minhas Inscrições tab
  const [selectedPendingIds, setSelectedPendingIds] = useState<string[]>([]);
  const [isBatchPayModalOpen, setIsBatchPayModalOpen] = useState(false);
  const [batchPaySaving, setBatchPaySaving] = useState(false);
  const [batchPaySuccess, setBatchPaySuccess] = useState('');
  const [batchPayError, setBatchPayError] = useState('');
  const [pixCopied, setPixCopied] = useState(false);

  const isClubLogin = selectedUser.role === 'club_admin';

  const relevantRegistrations = registrations.filter(r => {
    if (isClubLogin) {
      return r.registeredByUserId === selectedUser.id || (selectedUser.clubId && r.clubId === selectedUser.clubId);
    }
    return r.userId === selectedUser.id || r.registeredByUserId === selectedUser.id;
  });

  const pendingRegistrations = relevantRegistrations.filter(r => r.paymentStatus !== 'approved');
  const approvedRegistrations = relevantRegistrations.filter(r => r.paymentStatus === 'approved');

  useEffect(() => {
    // Select all pending IDs by default
    setSelectedPendingIds(pendingRegistrations.map(r => r.id));
  }, [registrations.length, selectedUser.id, selectedUser.role]);
  const [savedSection, setSavedSection] = useState<string | null>(null);

  useEffect(() => {
    setProfileForm({
      fullName: selectedUser.fullName || '',
      birthDate: selectedUser.birthDate || '',
      sex: selectedUser.sex || '',
      rg: selectedUser.rg || '',
      rgIssuer: selectedUser.rgIssuer || '',
      rgIssueDate: selectedUser.rgIssueDate || '',
      fatherName: selectedUser.fatherName || '',
      motherName: selectedUser.motherName || '',
      crNumber: selectedUser.crNumber || '',
      crValidity: selectedUser.crValidity || '',
      militaryRegion: selectedUser.militaryRegion || '',
      nationality: selectedUser.nationality || '',
      phone: selectedUser.phone || '',
      cep: selectedUser.cep || '',
      address: selectedUser.address || '',
      addressNumber: selectedUser.addressNumber || '',
      complement: selectedUser.complement || '',
      neighborhood: selectedUser.neighborhood || '',
      city: selectedUser.city || '',
      state: selectedUser.state || ''
    });
  }, [selectedUser.id]);

  useEffect(() => {
    if (!myClub) return;
    setClubForm({
      name: myClub.name || '',
      crNumber: myClub.crNumber || '',
      responsibleName: myClub.responsibleName || '',
      phone: myClub.phone || '',
      email: myClub.email || '',
      cep: myClub.cep || '',
      address: myClub.address || '',
      addressNumber: myClub.addressNumber || '',
      complement: myClub.complement || '',
      neighborhood: myClub.neighborhood || '',
      city: myClub.city || '',
      state: myClub.state || ''
    });
  }, [myClub?.id]);

  const saveUserSection = async (sectionId: string, fields: Record<string, string>) => {
    setSavingSection(sectionId);
    setSavedSection(null);
    const ok = await onUpdateProfile(fields);
    setSavingSection(null);
    if (ok) {
      setSavedSection(sectionId);
      setTimeout(() => setSavedSection(null), 2500);
    }
  };

  const saveClubSection = async (sectionId: string, fields: Record<string, string>) => {
    if (!myClub) return;
    setSavingSection(sectionId);
    setSavedSection(null);
    const ok = await onUpdateClub(myClub.id, fields);
    setSavingSection(null);
    if (ok) {
      setSavedSection(sectionId);
      setTimeout(() => setSavedSection(null), 2500);
    }
  };

  const uploadProfileDoc = async (kind: string, file: File) => {
    await onUploadDocument(kind, file, isClubAdmin ? 'club' : 'user');
  };

  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [payingSign, setPayingSign] = useState(false);
  const [paidSignDone, setPaidSignDone] = useState(false);
  const [selectedExpandPost, setSelectedExpandPost] = useState<Post | null>(null);

  // Local receipt states
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  // Print & Declaration States
  const [printMode, setPrintMode] = useState<'certificate' | 'club_card' | 'gg_card' | 'declaration_filiacao' | 'declaration_habitualidade' | null>(null);
  const [printData, setPrintData] = useState<any>(null);

  // Club Custom Templates State
  const [clubTemplates, setClubTemplates] = useState<Record<string, any>>({});

  useEffect(() => {
    const fetchClubTemplates = async () => {
      try {
        const clubId = selectedUser.clubId || 'c1';
        const res = await fetch(`/api/club-templates?clubId=${clubId}`, {
          headers: { 'x-user-id': currentUser?.id || '' }
        }).then(r => r.json());
        if (res.templates && Array.isArray(res.templates)) {
          const map: Record<string, any> = {};
          res.templates.forEach((t: any) => {
            map[t.template_type] = t;
          });
          setClubTemplates(map);
        }
      } catch (err) {
        console.error('Error fetching club templates:', err);
      }
    };
    fetchClubTemplates();
  }, [selectedUser.clubId, currentUser]);

  const replaceMemberToken = (text: string) => {
    const userClub = clubs.find(c => c.id === selectedUser.clubId);
    return text
      .replace(/{NOME_ATLETA}/g, (selectedUser.fullName || selectedUser.username).toUpperCase())
      .replace(/{CPF_ATLETA}/g, selectedUser.cpf || '000.000.000-00')
      .replace(/{RG_ATLETA}/g, selectedUser.rg || '00.000.000-0')
      .replace(/{CR_ATLETA}/g, selectedUser.crNumber || '123456')
      .replace(/{DATA_VALIDADE}/g, selectedUser.signatureExpiry ? new Date(selectedUser.signatureExpiry).toLocaleDateString('pt-BR') : '31/12/2026')
      .replace(/{CADASTRO_NUMERO}/g, selectedUser.id.slice(-5).toUpperCase() || '00123')
      .replace(/{NOME_CLUBE}/g, (userClub?.name || 'G&G CLUBE DE TIRO').toUpperCase())
      .replace(/{CIDADE}/g, (selectedUser.city || userClub?.city || 'SANTA LUZIA').toUpperCase())
      .replace(/{UF}/g, (selectedUser.state || userClub?.state || 'MG').toUpperCase());
  };

  const renderClubCardFront = () => {
    const tmpl = clubTemplates['club_card'];
    const bgUrl = tmpl?.background_url;
    const elements = tmpl?.layout_config?.elements;

    if (bgUrl || (elements && elements.length > 0)) {
      return (
        <div
          style={{
            backgroundImage: bgUrl ? `url("${bgUrl}")` : undefined,
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundColor: '#0f172a',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact'
          }}
          className="w-[340px] h-[215px] rounded-xl relative shadow-xl overflow-hidden border border-slate-700 select-none text-white shrink-0"
        >
          {bgUrl && (
            <img
              src={bgUrl}
              alt="Plano de Fundo Carteirinha"
              className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
              style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
            />
          )}

          {elements && elements.map((el: any) => {
            const isQrToken = el.text.trim() === '{QR_CODE}';
            const isFotoToken = el.text.trim() === '{FOTO_ATLETA}';
            const displayText = replaceMemberToken(el.text);

            return (
              <div
                key={el.id}
                style={{
                  position: 'absolute',
                  left: `${el.x}%`,
                  top: `${el.y}%`,
                  width: el.width ? `${el.width}%` : 'auto',
                  fontSize: `${el.fontSize}px`,
                  fontWeight: el.fontWeight || 'bold',
                  fontStyle: el.fontStyle || 'normal',
                  color: el.color || '#ffffff',
                  textAlign: el.textAlign || 'left',
                  lineHeight: '1.25',
                  whiteSpace: 'pre-line',
                  zIndex: 10,
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact'
                }}
              >
                {isQrToken ? (
                  <div className="flex flex-col items-center justify-center p-1 bg-white border border-slate-300 rounded shadow-2xs">
                    <QRCodeView
                      value={`${window.location.origin}/validar/carteirinha/${selectedUser.id}`}
                      size={el.qrSize || 64}
                    />
                  </div>
                ) : isFotoToken ? (
                  <div className="w-[85px] h-[105px] rounded bg-white p-0.5 border border-white/80 shadow-md shrink-0 overflow-hidden flex items-center justify-center">
                    <img
                      src={selectedUser.avatarUrl}
                      alt={selectedUser.username}
                      className="w-full h-full rounded object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80";
                      }}
                    />
                  </div>
                ) : (
                  <span>{displayText}</span>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    const userClub = clubs.find(c => c.id === selectedUser.clubId);

    return (
      <div
        style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
        className="w-[340px] h-[215px] rounded-xl p-2.5 flex flex-col justify-between relative shadow-xl overflow-hidden border border-slate-700 select-none bg-[linear-gradient(135deg,#06b6d4_0%,#1d4ed8_45%,#090d16_90%)] text-white shrink-0"
      >
        {/* Top Header Grid: Photo (Left) + Header/Badge/Logo (Right) */}
        <div className="flex gap-2 items-start">
          <div className="w-[70px] h-[86px] rounded-lg bg-white p-0.5 border border-white/80 shadow-md shrink-0 overflow-hidden flex items-center justify-center">
            <img
              src={selectedUser.avatarUrl}
              alt={selectedUser.username}
              className="w-full h-full rounded object-cover"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80";
              }}
            />
          </div>

          <div className="flex-1 min-w-0 space-y-1 text-left">
            <div className="flex items-center justify-between gap-1">
              <div className="bg-slate-900/90 border border-blue-400/40 rounded-md px-1.5 py-0.5 text-center shadow-xs">
                <span className="text-[6.5px] font-black text-cyan-300 block uppercase tracking-widest leading-none">
                  ATIRADOR DESPORTIVO
                </span>
                <span className="text-[7.5px] font-black text-white block uppercase tracking-wider leading-tight mt-0.5">
                  ★ PREMIUM ★
                </span>
              </div>

              <div className="text-right">
                <span className="font-display font-black text-[11px] tracking-tighter text-white block leading-none">
                  G<span className="text-cyan-300">&</span>G
                </span>
                <span className="text-[5.5px] font-mono text-cyan-200 tracking-widest block uppercase leading-none mt-0.5">
                  COMPETIÇÕES
                </span>
              </div>
            </div>

            <div className="pt-0.5">
              <span className="text-[9px] font-black text-cyan-200 uppercase tracking-wide block leading-tight font-mono">
                CADASTRO Nº {selectedUser.id.slice(-5).toUpperCase() || '00123'}
              </span>
            </div>

            <div className="bg-white rounded-md px-1.5 py-0.5 border border-slate-200 text-left">
              <span className="text-[6.5px] font-extrabold text-blue-900 uppercase block tracking-tighter leading-none">
                Nome:
              </span>
              <span className="text-[8.5px] font-bold text-slate-900 truncate block leading-tight uppercase font-sans">
                {selectedUser.fullName || selectedUser.username}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1 text-left">
          <div className="bg-white rounded-md px-1 py-0.5 border border-slate-200 min-w-0">
            <span className="text-[5.5px] font-extrabold text-blue-900 uppercase block tracking-tighter leading-none">CPF:</span>
            <span className="text-[7px] font-bold text-slate-900 font-mono truncate block leading-tight">{selectedUser.cpf || '000.000.000-00'}</span>
          </div>
          <div className="bg-white rounded-md px-1 py-0.5 border border-slate-200 min-w-0">
            <span className="text-[5.5px] font-extrabold text-blue-900 uppercase block tracking-tighter leading-none">RG:</span>
            <span className="text-[7px] font-bold text-slate-900 font-mono truncate block leading-tight">{selectedUser.rg || '00.000.000-0'}</span>
          </div>
          <div className="bg-white rounded-md px-1 py-0.5 border border-slate-200 min-w-0">
            <span className="text-[5.5px] font-extrabold text-blue-900 uppercase block tracking-tighter leading-none">CR:</span>
            <span className="text-[7px] font-bold text-slate-900 font-mono truncate block leading-tight">{selectedUser.crNumber || '123456'}</span>
          </div>
          <div className="bg-white rounded-md px-1 py-0.5 border border-slate-200 min-w-0">
            <span className="text-[5.5px] font-extrabold text-blue-900 uppercase block tracking-tighter leading-none">VALIDADE:</span>
            <span className="text-[7px] font-bold text-slate-900 font-mono truncate block leading-tight">
              {selectedUser.signatureExpiry ? new Date(selectedUser.signatureExpiry).toLocaleDateString('pt-BR') : '31/12/2026'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1 text-left">
          <div className="bg-white rounded-md px-1 py-0.5 border border-slate-200 col-span-1 min-w-0">
            <span className="text-[5.5px] font-extrabold text-blue-900 uppercase block tracking-tighter leading-none">Clube:</span>
            <span className="text-[7px] font-bold text-slate-900 truncate block leading-tight uppercase font-sans">
              {userClub?.name || 'G&G CLUBE DE TIRO'}
            </span>
          </div>
          <div className="bg-white rounded-md px-1 py-0.5 border border-slate-200 min-w-0">
            <span className="text-[5.5px] font-extrabold text-blue-900 uppercase block tracking-tighter leading-none">Cidade:</span>
            <span className="text-[7px] font-bold text-slate-900 truncate block leading-tight uppercase font-sans">
              {selectedUser.city || userClub?.city || 'SANTA LUZIA'}
            </span>
          </div>
          <div className="bg-white rounded-md px-1 py-0.5 border border-slate-200 min-w-0">
            <span className="text-[5.5px] font-extrabold text-blue-900 uppercase block tracking-tighter leading-none">ESTADO:</span>
            <span className="text-[7px] font-bold text-slate-900 truncate block leading-tight uppercase font-sans">
              {selectedUser.state || userClub?.state || 'MG'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderClubCardBack = () => {
    const tmpl = clubTemplates['club_card_back'];
    const bgUrl = tmpl?.background_url;
    const elements = tmpl?.layout_config?.elements;

    if (bgUrl || (elements && elements.length > 0)) {
      return (
        <div
          style={{
            backgroundImage: bgUrl ? `url("${bgUrl}")` : undefined,
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundColor: '#ffffff',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact'
          }}
          className="w-[340px] h-[215px] rounded-xl relative shadow-xl overflow-hidden border border-slate-300 select-none text-slate-900 shrink-0"
        >
          {bgUrl && (
            <img
              src={bgUrl}
              alt="Plano de Fundo Verso Carteirinha"
              className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
              style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
            />
          )}

          {elements && elements.map((el: any) => {
            const isQrToken = el.text.trim() === '{QR_CODE}';
            const displayText = replaceMemberToken(el.text);

            return (
              <div
                key={el.id}
                style={{
                  position: 'absolute',
                  left: `${el.x}%`,
                  top: `${el.y}%`,
                  width: el.width ? `${el.width}%` : 'auto',
                  fontSize: `${el.fontSize}px`,
                  fontWeight: el.fontWeight || 'bold',
                  fontStyle: el.fontStyle || 'normal',
                  color: el.color || '#0f172a',
                  textAlign: el.textAlign || 'left',
                  lineHeight: '1.25',
                  whiteSpace: 'pre-line',
                  zIndex: 10,
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact'
                }}
              >
                {isQrToken ? (
                  <div className="flex flex-col items-center justify-center p-1 bg-white border border-slate-300 rounded-lg shadow-xs">
                    <QRCodeView
                      value={`${window.location.origin}/validar/carteirinha/${selectedUser.id}`}
                      size={el.qrSize || 64}
                    />
                  </div>
                ) : (
                  <span>{displayText}</span>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div
        style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
        className="w-[340px] h-[215px] rounded-xl p-3 flex flex-col items-center justify-between relative shadow-xl overflow-hidden border border-slate-300 select-none bg-white text-slate-800 shrink-0"
      >
        <div className="absolute inset-0 grid grid-cols-4 gap-2 opacity-15 pointer-events-none p-2 content-between text-center select-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="text-[6px] font-black text-blue-900 uppercase font-mono tracking-tighter leading-none">
              G&G EMPREENDIMENTOS
            </div>
          ))}
        </div>

        <div className="relative z-10 my-auto flex flex-col items-center justify-center">
          <div className="bg-white p-1.5 border-2 border-slate-900 rounded-xl shadow-md flex items-center justify-center">
            <QRCodeView
              value={`${window.location.origin}/validar/carteirinha/${selectedUser.id}`}
              size={85}
            />
          </div>
          <span className="text-[7.5px] font-bold text-slate-700 font-mono mt-1 bg-white/80 px-2 py-0.5 rounded border border-slate-200">
            VALIDAÇÃO CADASTRAL AUTÊNTICA G&G
          </span>
        </div>
      </div>
    );
  };
  const [trainings, setTrainings] = useState<TrainingSession[]>([]);
  const [loadingTrainings, setLoadingTrainings] = useState(false);

  // ─── Reusable element renderer (shared by playoff / shooter cards) ───────────
  const renderCardElements = (elements: any[], bgColor = '#0f172a', borderColor = 'border-slate-700') => (
    elements && elements.map((el: any) => {
      const isQrToken = el.text.trim() === '{QR_CODE}';
      const isFotoToken = el.text.trim() === '{FOTO_ATLETA}';
      const displayText = replaceMemberToken(el.text);
      return (
        <div
          key={el.id}
          style={{
            position: 'absolute',
            left: `${el.x}%`,
            top: `${el.y}%`,
            width: el.width ? `${el.width}%` : 'auto',
            fontSize: `${el.fontSize}px`,
            fontWeight: el.fontWeight || 'bold',
            fontStyle: el.fontStyle || 'normal',
            color: el.color || '#ffffff',
            textAlign: el.textAlign || 'left',
            lineHeight: '1.25',
            whiteSpace: 'pre-line',
            zIndex: 10,
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact'
          }}
        >
          {isQrToken ? (
            <div className="flex flex-col items-center justify-center p-1 bg-white border border-slate-300 rounded shadow-2xs">
              <QRCodeView
                value={`${window.location.origin}/validar/carteirinha/${selectedUser.id}`}
                size={el.qrSize || 64}
              />
            </div>
          ) : isFotoToken ? (
            <div className="w-[85px] h-[105px] rounded bg-white p-0.5 border border-white/80 shadow-md shrink-0 overflow-hidden flex items-center justify-center">
              <img
                src={selectedUser.avatarUrl}
                alt={selectedUser.username}
                className="w-full h-full rounded object-cover"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80";
                }}
              />
            </div>
          ) : (
            <span>{displayText}</span>
          )}
        </div>
      );
    })
  );

  // ─── Playoff Card ─────────────────────────────────────────────────────────────
  const renderPlayoffCardFront = () => {
    const tmpl = clubTemplates['playoff_card'];
    const bgUrl = tmpl?.background_url;
    const els = tmpl?.layout_config?.elements;
    if (bgUrl || (els && els.length > 0)) {
      return (
        <div
          style={{
            backgroundImage: bgUrl ? `url("${bgUrl}")` : undefined,
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundColor: '#78350f',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact'
          }}
          className="w-[340px] h-[215px] rounded-xl relative shadow-xl overflow-hidden border border-amber-800 select-none text-white shrink-0"
        >
          {bgUrl && (
            <img src={bgUrl} alt="Fundo Carteirinha Playoff" className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
          )}
          {renderCardElements(els || [])}
        </div>
      );
    }
    // Fallback default
    const userClub = clubs.find(c => c.id === selectedUser.clubId);
    return (
      <div style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
        className="w-[340px] h-[215px] rounded-xl p-2.5 flex flex-col justify-between relative shadow-xl overflow-hidden border border-amber-700 select-none bg-[linear-gradient(135deg,#f59e0b_0%,#b45309_45%,#1c0a00_90%)] text-white shrink-0">
        <div className="text-[10px] font-black text-amber-200 uppercase tracking-widest">🏆 FILIADO PLAYOFF</div>
        <div className="font-bold text-sm">{(selectedUser.fullName || selectedUser.username).toUpperCase()}</div>
        <div className="text-[8px] font-mono">CPF: {selectedUser.cpf} | CR: {selectedUser.crNumber}</div>
        <div className="text-[8px]">{userClub?.name || 'G&G CLUBE'} — {selectedUser.city}/{selectedUser.state}</div>
      </div>
    );
  };

  const renderPlayoffCardBack = () => {
    const tmpl = clubTemplates['playoff_card_back'];
    const bgUrl = tmpl?.background_url;
    const els = tmpl?.layout_config?.elements;
    if (bgUrl || (els && els.length > 0)) {
      return (
        <div
          style={{
            backgroundImage: bgUrl ? `url("${bgUrl}")` : undefined,
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundColor: '#ffffff',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact'
          }}
          className="w-[340px] h-[215px] rounded-xl relative shadow-xl overflow-hidden border border-amber-300 select-none text-slate-900 shrink-0"
        >
          {bgUrl && (
            <img src={bgUrl} alt="Verso Carteirinha Playoff" className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
          )}
          {renderCardElements(els || [])}
        </div>
      );
    }
    // Fallback default
    return (
      <div style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
        className="w-[340px] h-[215px] rounded-xl p-3 flex flex-col items-center justify-between relative shadow-xl overflow-hidden border border-amber-300 select-none bg-white text-slate-800 shrink-0">
        <div className="absolute inset-0 grid grid-cols-4 gap-2 opacity-10 pointer-events-none p-2 content-between text-center select-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="text-[6px] font-black text-amber-700 uppercase font-mono tracking-tighter leading-none">G&G PLAYOFF</div>
          ))}
        </div>
        <div className="relative z-10 my-auto flex flex-col items-center justify-center">
          <div className="bg-white p-1.5 border-2 border-amber-700 rounded-xl shadow-md flex items-center justify-center">
            <QRCodeView value={`${window.location.origin}/validar/carteirinha/${selectedUser.id}`} size={85} />
          </div>
          <span className="text-[7.5px] font-bold text-amber-800 font-mono mt-1 bg-white/80 px-2 py-0.5 rounded border border-amber-200">VALIDAÇÃO CADASTRAL AUTÊNTICA G&G — PLAYOFF</span>
        </div>
      </div>
    );
  };

  // ─── Shooter Card ─────────────────────────────────────────────────────────────
  const renderShooterCardFront = () => {
    const tmpl = clubTemplates['shooter_card'];
    const bgUrl = tmpl?.background_url;
    const els = tmpl?.layout_config?.elements;
    if (bgUrl || (els && els.length > 0)) {
      return (
        <div
          style={{
            backgroundImage: bgUrl ? `url("${bgUrl}")` : undefined,
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundColor: '#0c2040',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact'
          }}
          className="w-[340px] h-[215px] rounded-xl relative shadow-xl overflow-hidden border border-indigo-700 select-none text-white shrink-0"
        >
          {bgUrl && (
            <img src={bgUrl} alt="Fundo Carteirinha Atirador" className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
          )}
          {renderCardElements(els || [])}
        </div>
      );
    }
    // Fallback default
    const userClub = clubs.find(c => c.id === selectedUser.clubId);
    return (
      <div style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
        className="w-[340px] h-[215px] rounded-xl p-2.5 flex flex-col justify-between relative shadow-xl overflow-hidden border border-indigo-700 select-none bg-[linear-gradient(135deg,#6366f1_0%,#1e40af_45%,#0c1830_90%)] text-white shrink-0">
        <div className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">🎯 ATIRADOR DESPORTIVO PREMIUM</div>
        <div className="font-bold text-sm">{(selectedUser.fullName || selectedUser.username).toUpperCase()}</div>
        <div className="text-[8px] font-mono">CPF: {selectedUser.cpf} | CR: {selectedUser.crNumber}</div>
        <div className="text-[8px]">{userClub?.name || 'G&G CLUBE'} — {selectedUser.city}/{selectedUser.state}</div>
      </div>
    );
  };

  const renderShooterCardBack = () => {
    const tmpl = clubTemplates['shooter_card_back'];
    const bgUrl = tmpl?.background_url;
    const els = tmpl?.layout_config?.elements;
    if (bgUrl || (els && els.length > 0)) {
      return (
        <div
          style={{
            backgroundImage: bgUrl ? `url("${bgUrl}")` : undefined,
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundColor: '#ffffff',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact'
          }}
          className="w-[340px] h-[215px] rounded-xl relative shadow-xl overflow-hidden border border-indigo-300 select-none text-slate-900 shrink-0"
        >
          {bgUrl && (
            <img src={bgUrl} alt="Verso Carteirinha Atirador" className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
          )}
          {renderCardElements(els || [])}
        </div>
      );
    }
    // Fallback default
    return (
      <div style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
        className="w-[340px] h-[215px] rounded-xl p-3 flex flex-col items-center justify-between relative shadow-xl overflow-hidden border border-indigo-300 select-none bg-white text-slate-800 shrink-0">
        <div className="absolute inset-0 grid grid-cols-4 gap-2 opacity-10 pointer-events-none p-2 content-between text-center select-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="text-[6px] font-black text-indigo-700 uppercase font-mono tracking-tighter leading-none">G&G ATIRADOR</div>
          ))}
        </div>
        <div className="relative z-10 my-auto flex flex-col items-center justify-center">
          <div className="bg-white p-1.5 border-2 border-indigo-700 rounded-xl shadow-md flex items-center justify-center">
            <QRCodeView value={`${window.location.origin}/validar/carteirinha/${selectedUser.id}`} size={85} />
          </div>
          <span className="text-[7.5px] font-bold text-indigo-800 font-mono mt-1 bg-white/80 px-2 py-0.5 rounded border border-indigo-200">VALIDAÇÃO CADASTRAL AUTÊNTICA G&G — ATIRADOR</span>
        </div>
      </div>
    );
  };



  const [savingTraining, setSavingTraining] = useState(false);
  const [trainingError, setTrainingError] = useState('');
  // Quick weapon registration modal state (Treinamento)
  const [showAddWeapon, setShowAddWeapon] = useState(false);
  const [savingWeapon, setSavingWeapon] = useState(false);
  const [newWeaponData, setNewWeaponData] = useState({
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

  const weaponLookup = (kind: string) => (weaponLookupOptions || []).filter(o => o.kind === kind);

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
      if (onAddWeapon) {
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
      } else {
        const res = await fetch('/api/weapons', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(currentUser ? { 'x-user-id': currentUser.id } : {})
          },
          body: JSON.stringify({
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
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Erro ao cadastrar arma.');
        }
      }

      const label = `${manufacturer} ${model} (${caliber})`.trim();
      const newW: Weapon = {
        id: `wpn_${Date.now()}`,
        ownerId: currentUser?.id || '',
        manufacturer,
        model,
        caliber,
        serialNumber: newWeaponData.sigmaNumber.trim() || newWeaponData.weaponNumber.trim() || '',
        weaponNumber: newWeaponData.weaponNumber.trim() || '',
        sigmaNumber: newWeaponData.sigmaNumber.trim() || '',
        weaponClass: newWeaponData.weaponClass,
        registrySystem: newWeaponData.registrySystem,
        permissionStatus: newWeaponData.permissionStatus,
      };

      setTrainingForm(prev => ({
        ...prev,
        selectedWeapon: newW,
        weaponName: `${manufacturer} ${model}`.trim(),
        weaponCaliber: caliber,
        weaponOwnerType: 'propria',
        weaponSearchQuery: label,
      }));

      setShowAddWeapon(false);
      setIsWeaponDropdownOpen(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao cadastrar nova arma.');
    } finally {
      setSavingWeapon(false);
    }
  };

  const [isWeaponDropdownOpen, setIsWeaponDropdownOpen] = useState(false);
  const [showAddTraining, setShowAddTraining] = useState(false);

  // Ammo Purchases State
  const [ammoPurchases, setAmmoPurchases] = useState<AmmoPurchase[]>([]);

  const [trainingForm, setTrainingForm] = useState({
    dateTime: new Date().toISOString().slice(0, 16),
    weaponSearchQuery: '',
    selectedWeapon: null as Weapon | null,
    weaponName: '',
    weaponCaliber: '',
    weaponOwnerType: 'propria' as 'propria' | 'clube',
    ownAmmoShots: '' as number | string,
    clubAmmoShots: '' as number | string,
    modality: 'Treino Livre',
    score: 0,
    notes: ''
  });

  // Weapon live search (minimum 3 characters)
  const searchFilteredWeapons = useMemo(() => {
    const q = trainingForm.weaponSearchQuery.trim().toLowerCase();
    if (q.length < 3) return [];
    const allWeapons = weapons || [];
    return allWeapons.filter(w => {
      const fullText = `${w.manufacturer || ''} ${w.model || ''} ${w.caliber || ''} ${w.sigmaNumber || ''} ${w.weaponNumber || ''} ${w.weaponClass || ''}`.toLowerCase();
      return fullText.includes(q);
    });
  }, [trainingForm.weaponSearchQuery, weapons]);

  const [showAddAmmo, setShowAddAmmo] = useState(false);
  const [ammoForm, setAmmoForm] = useState({
    date: new Date().toISOString().split('T')[0],
    caliber: '9mm',
    quantity: 250,
    invoiceNumber: '',
    notes: ''
  });

  // Profile post states (support up to 5 images)
  const [profilePostContent, setProfilePostContent] = useState('');
  const [profilePostImages, setProfilePostImages] = useState<string[]>([]);
  const [isPostingProfilePost, setIsPostingProfilePost] = useState(false);

  // Personal photo gallery of the logged-in user
  const myUserPhotos = React.useMemo(() => {
    if (!currentUser) return [];
    const urls: string[] = [];

    posts.forEach(p => {
      if (p.userId === currentUser.id || p.username === currentUser.username) {
        const pImgs = p.imageUrls && p.imageUrls.length > 0
          ? p.imageUrls
          : (p.imageUrl ? [p.imageUrl] : []);

        pImgs.forEach(url => {
          if (url && typeof url === 'string' && !urls.includes(url)) {
            urls.push(url);
          }
        });
      }
    });

    return urls;
  }, [posts, currentUser]);

  const handleCreateProfilePost = async () => {
    if (!profilePostContent.trim() && profilePostImages.length === 0) return;
    setIsPostingProfilePost(true);
    try {
      await onAddPost(
        profilePostContent,
        profilePostImages[0] || undefined,
        undefined,
        profilePostImages.length > 0 ? profilePostImages : undefined
      );
      setProfilePostContent('');
      setProfilePostImages([]);
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

  // Fetch real training sessions from PostgreSQL
  const fetchTrainings = useCallback(async () => {
    if (!selectedUser?.id) return;
    setLoadingTrainings(true);
    try {
      const authHeaders = currentUser ? { 'x-user-id': currentUser.id } : {};
      const res = await fetch(`/api/trainings?userId=${selectedUser.id}`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setTrainings(data.trainings || []);
      }
    } catch (err) {
      console.error('Error fetching real trainings:', err);
    } finally {
      setLoadingTrainings(false);
    }
  }, [selectedUser.id, currentUser]);

  useEffect(() => {
    fetchTrainings();

    const savedAmmo = localStorage.getItem(`gg_ammo_${selectedUser.id}`);
    if (savedAmmo) {
      try { setAmmoPurchases(JSON.parse(savedAmmo)); } catch (e) { setAmmoPurchases(DEFAULT_AMMO_PURCHASES); }
    } else {
      setAmmoPurchases(DEFAULT_AMMO_PURCHASES);
    }
  }, [selectedUser.id, fetchTrainings]);

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

  // Real Training Submission Handler
  const handleAddTrainingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrainingError('');

    if (!trainingForm.dateTime) {
      setTrainingError('Informe a Data e Hora do treinamento.');
      return;
    }

    const nameToSave = trainingForm.weaponName.trim() ||
      (trainingForm.selectedWeapon ? `${trainingForm.selectedWeapon.manufacturer || ''} ${trainingForm.selectedWeapon.model || ''}`.trim() : trainingForm.weaponSearchQuery.trim());

    if (!nameToSave) {
      setTrainingError('Selecione ou informe a arma utilizada no treinamento (digite ao menos 3 caracteres para buscar).');
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
      const authHeaders = currentUser
        ? { 'x-user-id': currentUser.id, 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json' };

      const payload = {
        dateTime: trainingForm.dateTime,
        weaponId: trainingForm.selectedWeapon?.id,
        weaponName: nameToSave,
        weaponCaliber: trainingForm.weaponCaliber || trainingForm.selectedWeapon?.caliber || '',
        weaponOwnerType: trainingForm.weaponOwnerType,
        ownAmmoShots: own,
        clubAmmoShots: club,
        modality: trainingForm.modality,
        score: Number(trainingForm.score) || 0,
        notes: trainingForm.notes,
      };

      const res = await fetch('/api/trainings', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowAddTraining(false);
        setTrainingForm({
          dateTime: new Date().toISOString().slice(0, 16),
          weaponSearchQuery: '',
          selectedWeapon: null,
          weaponName: '',
          weaponCaliber: '',
          weaponOwnerType: 'propria',
          ownAmmoShots: '',
          clubAmmoShots: '',
          modality: 'Treino Livre',
          score: 0,
          notes: ''
        });
        setIsWeaponDropdownOpen(false);
        fetchTrainings();
      } else {
        const data = await res.json();
        setTrainingError(data.error || 'Erro ao registrar treinamento.');
      }
    } catch (err) {
      console.error('Error creating training:', err);
      setTrainingError('Erro de conexão ao salvar treinamento.');
    } finally {
      setSavingTraining(false);
    }
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

  const deleteTraining = async (id: string) => {
    if (!confirm('Deseja realmente excluir este registro de treinamento?')) return;
    try {
      const authHeaders = currentUser ? { 'x-user-id': currentUser.id } : {};
      const res = await fetch(`/api/trainings/${id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (res.ok) {
        setTrainings(prev => prev.filter(t => t.id !== id));
      }
    } catch (err) {
      console.error('Error deleting training:', err);
    }
  };

  const deleteAmmo = (id: string) => {
    saveAmmo(ammoPurchases.filter(a => a.id !== id));
  };

  // Date range filter for Habitualidade declaration (between habStartDate and habEndDate)
  const [habStartDate, setHabStartDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().split('T')[0];
  });
  const [habEndDate, setHabEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const combinedHabitualities = useMemo(() => {
    const start = new Date(habStartDate + 'T00:00:00');
    const end = new Date(habEndDate + 'T23:59:59');

    const items: Array<{
      id: string;
      rawDate: Date;
      dateFormatted: string;
      timeFormatted: string;
      eventType: 'Treinamento' | 'Competição';
      eventName: string;
      weaponClass: string;
      model: string;
      weaponNumber: string;
      manufacturer: string;
      caliber: string;
      permissionStatus: string;
      sigma: string;
      shotsCount: number;
      weaponOwnerText: string;
      ammoOwnerText: string;
    }> = [];

    // 1. Process Training Sessions in the selected date range
    (trainings || []).forEach(t => {
      const rawDate = new Date(t.dateTime || (t.date ? `${t.date}T15:00:00` : '') || t.createdAt || '');
      if (isNaN(rawDate.getTime())) return;
      if (rawDate < start || rawDate > end) return;

      const w = t.selectedWeapon || weapons.find(wpn => wpn.id === t.weaponId);
      const dateFormatted = rawDate.toLocaleDateString('pt-BR');
      const timeFormatted = t.dateTime ? rawDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '15:00';

      const weaponClass = w?.weaponClass || t.weaponClass || 'Pistola';
      const model = w?.model || t.weaponName || t.weapon || 'Arma Cadastrada';
      const weaponNumber = w?.weaponNumber || w?.serialNumber || t.weaponNumber || 'N/A';
      const manufacturer = w?.manufacturer || 'Fabricante';
      const caliber = t.weaponCaliber || w?.caliber || t.caliber || '9mm';
      const permissionStatus = w?.permissionStatus || 'Permitido';
      const sigma = w?.sigmaNumber || w?.serialNumber || '010101010';
      const shotsCount = Number(t.totalShots) || ((Number(t.ownAmmoShots) || 0) + (Number(t.clubAmmoShots) || 0)) || t.shots || 50;

      items.push({
        id: `tr_${t.id}`,
        rawDate,
        dateFormatted,
        timeFormatted,
        eventType: 'Treinamento',
        eventName: 'TREINAMENTO',
        weaponClass,
        model,
        weaponNumber,
        manufacturer,
        caliber,
        permissionStatus,
        sigma,
        shotsCount,
        weaponOwnerText: t.weaponOwnerType === 'clube' ? 'Clube' : 'Própria',
        ammoOwnerText: (Number(t.clubAmmoShots) || 0) > 0 ? 'Clube' : 'Própria',
      });
    });

    // 2. Process Stage Scores (Competition participations)
    (userScores || []).forEach(s => {
      const rawDate = new Date(s.createdAt || '');
      if (isNaN(rawDate.getTime())) return;
      if (rawDate < start || rawDate > end) return;

      const champ = championships.find(c => c.id === s.championshipId);
      const reg = approvedRegs.find(r => r.championshipId === s.championshipId);
      const w = weapons.find(wpn => wpn.id === reg?.weaponId);

      const dateFormatted = rawDate.toLocaleDateString('pt-BR');
      const timeFormatted = rawDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) || '15:54';

      const weaponClass = w?.weaponClass || 'Pistola';
      const model = w?.model || (reg as any)?.gunModel || s.modality || 'Arma de Competição';
      const weaponNumber = w?.weaponNumber || w?.serialNumber || 'HMA02013';
      const manufacturer = w?.manufacturer || 'IMBEL';
      const caliber = w?.caliber || (reg as any)?.caliber || (s.modality?.includes('380') ? '.380' : '9mm');
      const permissionStatus = w?.permissionStatus || 'Permitido';
      const sigma = w?.sigmaNumber || selectedUser.crNumber || '010101010';
      const shotsCount = (s as any).shotsCount || s.score || 20;

      items.push({
        id: `cmp_${s.id}`,
        rawDate,
        dateFormatted,
        timeFormatted,
        eventType: 'Competição',
        eventName: champ?.title?.toUpperCase() || 'CAMPEONATO DE TIRO ESPORTIVO',
        weaponClass,
        model,
        weaponNumber,
        manufacturer,
        caliber,
        permissionStatus,
        sigma,
        shotsCount,
        weaponOwnerText: 'Própria',
        ammoOwnerText: 'Própria',
      });
    });

    // 3. Process Approved Registrations if userScores is empty
    if (userScores.length === 0) {
      (approvedRegs || []).forEach(reg => {
        const rawDate = new Date(reg.registeredAt || '');
        if (isNaN(rawDate.getTime())) return;
        if (rawDate < start || rawDate > end) return;

        const champ = championships.find(c => c.id === reg.championshipId);
        const w = weapons.find(wpn => wpn.id === reg.weaponId);

        items.push({
          id: `reg_${reg.id}`,
          rawDate,
          dateFormatted: rawDate.toLocaleDateString('pt-BR'),
          timeFormatted: '15:54',
          eventType: 'Competição',
          eventName: champ?.title?.toUpperCase() || 'CAMPEONATO DE TIRO ESPORTIVO',
          weaponClass: w?.weaponClass || 'Pistola',
          model: w?.model || (reg as any)?.gunModel || 'Pistola de Competição',
          weaponNumber: w?.weaponNumber || w?.serialNumber || 'HMA02013',
          manufacturer: w?.manufacturer || 'IMBEL',
          caliber: w?.caliber || (reg as any)?.caliber || '.380',
          permissionStatus: w?.permissionStatus || 'Permitido',
          sigma: w?.sigmaNumber || selectedUser.crNumber || '010101010',
          shotsCount: reg.totalPoints || 20,
          weaponOwnerText: 'Própria',
          ammoOwnerText: 'Própria',
        });
      });
    }

    return items.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
  }, [trainings, userScores, approvedRegs, championships, weapons, habStartDate, habEndDate, selectedUser.crNumber]);

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

  // Calculate Habitualidade count (trainings + stage/competition participations in last 12 months)
  const habitualidadeCount = useMemo(() => {
    const now = new Date();
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(now.getFullYear() - 1);

    // 1. Real training sessions in the last 12 months
    const recentTrainings = (trainings || []).filter(t => {
      const d = new Date(t.dateTime || t.createdAt || '');
      return !isNaN(d.getTime()) ? d >= twelveMonthsAgo : true;
    });

    // 2. Stage Score participations (Campeonato > Etapa > Modalidade) in the last 12 months
    const recentScores = (userScores || []).filter(s => {
      const d = new Date(s.createdAt || '');
      return !isNaN(d.getTime()) ? d >= twelveMonthsAgo : true;
    });

    const compCount = recentScores.length > 0 ? recentScores.length : approvedRegs.length;
    return recentTrainings.length + compCount;
  }, [trainings, userScores, approvedRegs, selectedUser.id]);

  // Define sidebar menu items (only active for user's own profile)
  const menuItems = [
    { id: 'my_profile', label: 'Meu Cadastro', icon: UserCog, public: false },
    { id: 'posts', label: 'Fotos Publicadas', icon: Grid, count: userPosts.length, public: true },
    { id: 'my_registrations', label: 'Minhas Inscrições', icon: CheckCircle2, count: approvedRegs.length, public: false },
    { id: 'results', label: 'Resultados', icon: Trophy, count: userScores.length, public: true },
    { id: 'certificates', label: 'Certificados', icon: Award, count: approvedRegs.length, public: false },
    { id: 'club_card', label: 'Carteirinha Clube', icon: CreditCard, public: false },
    { id: 'playoff_card', label: 'Carteirinha Playoff', icon: Trophy, public: false },
    { id: 'shooter_card', label: 'Carteirinha Atirador', icon: Target, public: false },
    { id: 'gg_card', label: 'Carteirinha G&G', icon: CreditCard, public: false },
    { id: 'trainings', label: 'Treinamentos', icon: PlusCircle, count: trainings.length, public: false },
    { id: 'declarations', label: 'Declarações', icon: FileText, public: false },
    { id: 'ammo', label: 'Controle Munição', icon: Disc, public: false },
  ];

  const filteredMenuItems = menuItems.filter(item => isMe || item.public);

  return (
    <div className="pt-0.5 pb-6 md:py-6 space-y-3 md:space-y-6">
      
      {/* Main layout container */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-8 items-start">
        
        {/* Left Column: Profile Card & Navigation */}
        <div className="space-y-3 md:space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6 flex flex-col items-center relative z-10">
            
            {/* Mobile Header: Photo (1/4) + Name (3/4) in single line */}
            <div className="grid grid-cols-4 items-center gap-3.5 w-full md:flex md:flex-col md:items-center">
              
              {/* Photo Container (1/4 on mobile, col-span-1) */}
              <div className="col-span-1 flex justify-center md:w-full">
                <div className="relative w-20 h-20 md:w-28 md:h-28 rounded-full bg-slate-50 p-[3px] border border-slate-200 shadow-sm flex-shrink-0">
                  <img
                    src={selectedUser.avatarUrl}
                    alt={selectedUser.username}
                    className="w-full h-full object-cover rounded-full"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80";
                    }}
                  />
                  {selectedUser.role === 'admin' && (
                    <div className="absolute bottom-0 right-0 bg-amber-500 text-white p-1 rounded-full border-2 border-white shadow-md">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                  )}
                  {isMe && (
                    <label
                      title="Trocar foto de perfil"
                      className={`absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-full border-2 border-white shadow-md cursor-pointer transition ${avatarSaving ? 'opacity-60 pointer-events-none' : ''}`}
                    >
                      <Camera className="w-3 h-3" />
                      <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={avatarSaving} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

              {/* Name Container (3/4 on mobile, col-span-3) */}
              <div className="col-span-3 text-left md:text-center md:mt-4 leading-tight">
                <h3 className="font-display font-extrabold text-base md:text-lg text-slate-900 leading-snug">{selectedUser.fullName}</h3>
                <span className="text-xs text-slate-400 font-mono block mt-0.5">@{selectedUser.username}</span>
                {isMe && avatarSaving && <p className="text-[10px] text-slate-400 mt-1">Enviando foto...</p>}
                {isMe && avatarError && <p className="text-[10px] text-red-500 mt-1">{avatarError}</p>}
              </div>

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
            {(() => {
              const rawBio = selectedUser.bio || '';
              const cleanBio = rawBio.replace(/Atleta federado do G&G Competições\.?/gi, '').trim();
              if (!cleanBio) return null;
              return (
                <p className="text-xs text-slate-600 leading-relaxed py-4 italic whitespace-pre-wrap">
                  "{cleanBio}"
                </p>
              );
            })()}

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

          {/* Affiliation status Card (Placed ABOVE the menu on Desktop as requested) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div>
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Situação Associativa G&G</h4>
            </div>

            <div className="space-y-2.5 font-mono text-xs">
              {/* CR e Validade na mesma linha */}
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div className="flex items-center gap-1 truncate max-w-[55%]">
                  <span className="text-slate-450 font-sans text-[11px]">CR:</span>
                  <span className="font-bold text-slate-800 truncate">{selectedUser.crNumber || 'Emitindo...'}</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-slate-450 font-sans text-[11px]">Validade:</span>
                  <span className="font-bold text-slate-800">
                    {selectedUser.crValidity ? (selectedUser.crValidity.includes('-') ? selectedUser.crValidity.split('-').reverse().join('/') : selectedUser.crValidity) : '12/12/2030'}
                  </span>
                </div>
              </div>

              {/* Anuidade */}
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-slate-450 font-sans text-[11px]">Anuidade</span>
                {selectedUser.hasPaidSignature ? (
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> REGULAR
                  </span>
                ) : (
                  <span className="font-bold text-rose-500">PENDENTE</span>
                )}
              </div>

              {/* Habitualidade */}
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-slate-450 font-sans text-[11px]">Habitualidade: Últimos 12 meses</span>
                <span className="font-extrabold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100 font-sans text-xs">
                  {habitualidadeCount}
                </span>
              </div>

              {/* Guia de Trânsito */}
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-slate-450 font-sans text-[11px]">Guia de Trânsito</span>
                <span className="font-bold text-slate-800">
                  {(selectedUser as any).guiaTransitoExpiry ? new Date((selectedUser as any).guiaTransitoExpiry).toLocaleDateString('pt-BR') : '--/--/----'}
                </span>
              </div>
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

          {/* SIDEBAR NAVIGATION CARD (Visible on Desktop - Now below Situação Associativa) */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-1">
            <h4 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider px-3 mb-2">Painel de Serviços</h4>
            <div className="space-y-1">
              {filteredMenuItems.map((item) => {
                const Icon = item.icon;
                const active = profileTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'championships') {
                        onNavigateToChampionships();
                      } else {
                        setProfileTab(item.id as ProfileTabType);
                      }
                    }}
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
        </div>

        {/* Right Column: Content viewport based on current tab */}
        <div className="space-y-3 md:space-y-6 md:col-span-2">
          
          {/* MOBILE TAB DROPDOWN (Visible on Mobile) */}
          <div className="md:hidden relative w-full z-20">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-800 shadow-sm hover:bg-slate-50 transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Menu className="w-5 h-5 text-blue-600" />
                <span className="font-display font-extrabold uppercase tracking-wider text-slate-900 text-xs">Menu da conta</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isMobileMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMobileMenuOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-30 overflow-hidden py-1">
                {filteredMenuItems.map((item) => {
                  const Icon = item.icon;
                  const active = profileTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        if (item.id === 'championships') {
                          onNavigateToChampionships();
                        } else {
                          setProfileTab(item.id as ProfileTabType);
                        }
                      }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-xs font-semibold transition ${active ? 'bg-blue-50 text-blue-700 font-bold border-l-4 border-blue-600' : 'text-slate-650 hover:bg-slate-50'}`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.count !== undefined && (
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${active ? 'bg-blue-200 text-blue-800' : 'bg-slate-100 text-slate-650'}`}>
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 0. Meu Cadastro — progressive profile completion */}
          {profileTab === 'my_profile' && isMe && (
            <div className="bg-white rounded-2xl smooth-shadow border border-slate-100 p-6 space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-display font-bold text-slate-800 text-sm uppercase">Meu Cadastro</h4>
                  <p className="text-[11px] text-slate-450 mt-0.5">Complete seus dados quando puder — cada seção é salva de forma independente.</p>
                </div>
                {isRegistrationComplete ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Cadastro completo
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full">
                    <Info className="w-3.5 h-3.5" /> Cadastro incompleto
                  </span>
                )}
              </div>

              {isClubAdmin ? (
                myClub ? (
                  <div className="space-y-4">
                    <ProfileSection
                      title="Dados Cadastrais do Clube"
                      onSave={() => saveClubSection('club_data', { name: clubForm.name, crNumber: clubForm.crNumber, responsibleName: clubForm.responsibleName })}
                      saving={savingSection === 'club_data'}
                      saved={savedSection === 'club_data'}
                    >
                      <div className="sm:col-span-2"><ProfileField label="Razão Social" value={clubForm.name} onChange={v => setClubForm({ ...clubForm, name: v })} /></div>
                      <ProfileField label="CR" value={clubForm.crNumber} onChange={v => setClubForm({ ...clubForm, crNumber: v })} />
                      <ProfileField label="Nome do responsável" value={clubForm.responsibleName} onChange={v => setClubForm({ ...clubForm, responsibleName: v })} />
                    </ProfileSection>

                    <ProfileSection
                      title="Contato do Clube"
                      onSave={() => saveClubSection('club_contact', { phone: clubForm.phone, email: clubForm.email })}
                      saving={savingSection === 'club_contact'}
                      saved={savedSection === 'club_contact'}
                    >
                      <ProfileField label="Telefone" type="tel" value={clubForm.phone} onChange={v => setClubForm({ ...clubForm, phone: v })} />
                      <ProfileField label="E-mail" type="email" value={clubForm.email} onChange={v => setClubForm({ ...clubForm, email: v })} />
                    </ProfileSection>

                    <ProfileSection
                      title="Endereço do Clube"
                      onSave={() => saveClubSection('club_address', { cep: clubForm.cep, address: clubForm.address, addressNumber: clubForm.addressNumber, complement: clubForm.complement, neighborhood: clubForm.neighborhood, city: clubForm.city, state: clubForm.state })}
                      saving={savingSection === 'club_address'}
                      saved={savedSection === 'club_address'}
                    >
                      <ProfileField label="CEP" value={clubForm.cep} onChange={v => setClubForm({ ...clubForm, cep: v })} />
                      <ProfileField label="Endereço" value={clubForm.address} onChange={v => setClubForm({ ...clubForm, address: v })} />
                      <ProfileField label="Número" value={clubForm.addressNumber} onChange={v => setClubForm({ ...clubForm, addressNumber: v })} />
                      <ProfileField label="Complemento" value={clubForm.complement} onChange={v => setClubForm({ ...clubForm, complement: v })} />
                      <ProfileField label="Bairro" value={clubForm.neighborhood} onChange={v => setClubForm({ ...clubForm, neighborhood: v })} />
                      <ProfileField label="Cidade" value={clubForm.city} onChange={v => setClubForm({ ...clubForm, city: v })} />
                      <ProfileField label="Estado" value={clubForm.state} onChange={v => setClubForm({ ...clubForm, state: v })} />
                    </ProfileSection>

                    <div className="bg-slate-50 p-4 rounded-xl space-y-3 border border-slate-100">
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Documentos do Clube (PDF/JPG/PNG até 1MB)</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <ProfileFileField label="Cartão CNPJ" onUpload={f => uploadProfileDoc('cnpj_card', f)} />
                        <ProfileFileField label="CR" onUpload={f => uploadProfileDoc('cr', f)} />
                        <div className="sm:col-span-2"><ProfileFileField label="Alvará de funcionamento" onUpload={f => uploadProfileDoc('alvara', f)} /></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-450">Clube não encontrado.</p>
                )
              ) : (
                <div className="space-y-4">
                  <ProfileSection
                    title="Dados Cadastrais"
                    onSave={() => saveUserSection('user_data', {
                      fullName: profileForm.fullName, birthDate: profileForm.birthDate, sex: profileForm.sex, rg: profileForm.rg,
                      rgIssuer: profileForm.rgIssuer, rgIssueDate: profileForm.rgIssueDate, fatherName: profileForm.fatherName,
                      motherName: profileForm.motherName, crNumber: profileForm.crNumber, crValidity: profileForm.crValidity,
                      militaryRegion: profileForm.militaryRegion, nationality: profileForm.nationality
                    })}
                    saving={savingSection === 'user_data'}
                    saved={savedSection === 'user_data'}
                  >
                    <div className="sm:col-span-2"><ProfileField label="Nome completo" value={profileForm.fullName} onChange={v => setProfileForm({ ...profileForm, fullName: v })} /></div>
                    <ProfileField label="Data de nascimento" type="date" value={profileForm.birthDate} onChange={v => setProfileForm({ ...profileForm, birthDate: v })} />
                    <ProfileSelect
                      label="Sexo"
                      value={profileForm.sex || ''}
                      onChange={v => setProfileForm({ ...profileForm, sex: v })}
                      options={[
                        { value: 'masculino', label: 'Masculino' },
                        { value: 'feminino', label: 'Feminino' }
                      ]}
                    />
                    <ProfileField label="RG" value={profileForm.rg} onChange={v => setProfileForm({ ...profileForm, rg: v })} />
                    <ProfileField label="Órgão emissor RG" value={profileForm.rgIssuer} onChange={v => setProfileForm({ ...profileForm, rgIssuer: v })} />
                    <ProfileField label="Data emissão RG" type="date" value={profileForm.rgIssueDate} onChange={v => setProfileForm({ ...profileForm, rgIssueDate: v })} />
                    <ProfileField label="Nome do pai" value={profileForm.fatherName} onChange={v => setProfileForm({ ...profileForm, fatherName: v })} />
                    <ProfileField label="Nome da mãe" value={profileForm.motherName} onChange={v => setProfileForm({ ...profileForm, motherName: v })} />
                    <ProfileField label="CR" placeholder="Ex: CR-102938-DF" value={profileForm.crNumber} onChange={v => setProfileForm({ ...profileForm, crNumber: v })} />
                    <ProfileField label="Validade CR" type="date" value={profileForm.crValidity} onChange={v => setProfileForm({ ...profileForm, crValidity: v })} />
                    <ProfileField label="Região Militar" value={profileForm.militaryRegion} onChange={v => setProfileForm({ ...profileForm, militaryRegion: v })} />
                    <ProfileField label="Nacionalidade" value={profileForm.nationality} onChange={v => setProfileForm({ ...profileForm, nationality: v })} />
                  </ProfileSection>

                  <ProfileSection
                    title="Contato"
                    onSave={() => saveUserSection('user_contact', { phone: profileForm.phone })}
                    saving={savingSection === 'user_contact'}
                    saved={savedSection === 'user_contact'}
                  >
                    <ProfileField label="Celular" type="tel" value={profileForm.phone} onChange={v => setProfileForm({ ...profileForm, phone: v })} />
                  </ProfileSection>

                  <ProfileSection
                    title="Endereço"
                    onSave={() => saveUserSection('user_address', {
                      cep: profileForm.cep, address: profileForm.address, addressNumber: profileForm.addressNumber,
                      complement: profileForm.complement, neighborhood: profileForm.neighborhood, city: profileForm.city, state: profileForm.state
                    })}
                    saving={savingSection === 'user_address'}
                    saved={savedSection === 'user_address'}
                  >
                    <ProfileField label="CEP" value={profileForm.cep} onChange={v => setProfileForm({ ...profileForm, cep: v })} />
                    <ProfileField label="Endereço" value={profileForm.address} onChange={v => setProfileForm({ ...profileForm, address: v })} />
                    <ProfileField label="Número" value={profileForm.addressNumber} onChange={v => setProfileForm({ ...profileForm, addressNumber: v })} />
                    <ProfileField label="Complemento" value={profileForm.complement} onChange={v => setProfileForm({ ...profileForm, complement: v })} />
                    <ProfileField label="Bairro" value={profileForm.neighborhood} onChange={v => setProfileForm({ ...profileForm, neighborhood: v })} />
                    <ProfileField label="Cidade" value={profileForm.city} onChange={v => setProfileForm({ ...profileForm, city: v })} />
                    <ProfileField label="Estado" value={profileForm.state} onChange={v => setProfileForm({ ...profileForm, state: v })} />
                  </ProfileSection>

                  <div className="bg-slate-50 p-4 rounded-xl space-y-3 border border-slate-100">
                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Documentos (PDF/JPG/PNG até 1MB)</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <ProfileFileField label="RG ou CNH" onUpload={f => uploadProfileDoc('rg_cnh', f)} />
                      <ProfileFileField label="CR" onUpload={f => uploadProfileDoc('cr', f)} />
                      <div className="sm:col-span-2"><ProfileFileField label="Declaração de filiação" onUpload={f => uploadProfileDoc('declaracao_filiacao', f)} /></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 1. Posts Grid (Original tab) */}
          {profileTab === 'posts' && (
            <div className="space-y-4">
              {isMe && (
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Images className="w-4 h-4 text-blue-600" />
                      Publicar Nova Foto ({profilePostImages.length}/5)
                    </h4>
                    {profilePostImages.length >= 5 ? (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        Limite de 5 fotos atingido
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium">
                        Até 5 fotos por publicação
                      </span>
                    )}
                  </div>

                  {/* Text Legenda (Optional) */}
                  <textarea
                    rows={2}
                    placeholder="Escreva uma legenda para sua foto (opcional se enviar foto)..."
                    value={profilePostContent}
                    onChange={e => setProfilePostContent(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-1 focus:ring-blue-500 text-xs text-slate-800 resize-none"
                  />

                  {/* Selected Images Grid Preview */}
                  {profilePostImages.length > 0 && (
                    <div className="grid grid-cols-5 gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                      {profilePostImages.map((imgUrl, idx) => (
                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-300 bg-slate-900">
                          <img src={imgUrl} alt={`Foto ${idx+1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setProfilePostImages(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-md transition cursor-pointer"
                            title="Remover foto"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">
                            #{idx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Controls: Upload from PC */}
                  {profilePostImages.length < 5 && (
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-1 border-t border-slate-100">
                      <label className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0">
                        <Plus className="w-4 h-4 text-blue-600" />
                        Enviar Foto(s) do Computador/Celular (até 5)
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={async (e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length === 0) return;

                            const remainingSlots = 5 - profilePostImages.length;
                            if (remainingSlots <= 0) {
                              e.target.value = '';
                              return;
                            }

                            const filesToRead = files.slice(0, remainingSlots);

                            const readPromises = filesToRead.map((file: any) => compressUploadImage(file as File, 1200, 0.75));

                            const results = await Promise.all(readPromises);
                            const validResults = results.filter(r => r !== '');

                            setProfilePostImages(prev => {
                              const combined = [...prev];
                              validResults.forEach(r => {
                                if (!combined.includes(r) && combined.length < 5) {
                                  combined.push(r);
                                }
                              });
                              return combined;
                            });

                            e.target.value = '';
                          }}
                        />
                      </label>

                      <button
                        onClick={handleCreateProfilePost}
                        disabled={isPostingProfilePost || (!profilePostContent.trim() && profilePostImages.length === 0)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-2 rounded-xl transition self-end sm:self-center cursor-pointer shadow-md shadow-blue-50 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isPostingProfilePost ? 'Publicando...' : 'Publicar'}
                      </button>
                    </div>
                  )}

                  {profilePostImages.length >= 5 && (
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={handleCreateProfilePost}
                        disabled={isPostingProfilePost}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-2 rounded-xl transition cursor-pointer shadow-md shadow-blue-50 flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isPostingProfilePost ? 'Publicando...' : 'Publicar'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* User Posts Stream (Rendered as regular Feed Posts) */}
              <div className="space-y-6 max-w-2xl mx-auto">
                {userPosts.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 bg-white rounded-2xl smooth-shadow border border-slate-100">
                    <Grid className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-sm text-slate-600">Nenhuma publicação efetuada ainda.</p>
                  </div>
                ) : (
                  userPosts.map((post) => {
                    const isLiked = currentUser ? post.likes.includes(currentUser.id) : false;
                    const hasScore = !!post.targetScore;

                    return (
                      <motion.article
                        id={`profile-post-card-${post.id}`}
                        key={post.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden text-left"
                      >
                        {/* Shared Post Banner Header */}
                        {post.sharedPost && (
                          <div className="bg-blue-50/70 border-b border-blue-100 px-4 py-2 flex items-center justify-between text-xs text-slate-700">
                            <div className="flex items-center gap-2">
                              <Repeat className="w-4 h-4 text-blue-600 shrink-0" />
                              <span>
                                <strong className="font-bold text-slate-900 cursor-pointer hover:underline" onClick={() => onViewProfile && onViewProfile(post.username)}>@{post.username}</strong>
                                {' '}compartilhou a publicação de{' '}
                                <button
                                  type="button"
                                  onClick={() => onViewProfile && onViewProfile(post.sharedPost!.originalUsername)}
                                  className="font-bold text-blue-700 hover:underline"
                                >
                                  @{post.sharedPost.originalUsername}
                                </button>
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Header */}
                        <div className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3 cursor-pointer hover:opacity-85 transition" onClick={() => onViewProfile && onViewProfile(post.username)}>
                            <img
                              src={post.userAvatar}
                              alt={post.username}
                              className="w-10 h-10 rounded-full object-cover border border-slate-200"
                              referrerPolicy="no-referrer"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80";
                              }}
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-900 text-sm">@{post.username}</span>
                                {users.find(u => u.id === post.userId)?.role === 'admin' && (
                                  <span className="bg-blue-50 text-blue-600 text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                    DIRETORIA
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-400">
                                {new Date(post.createdAt).toLocaleDateString('pt-BR', {
                                  day: '2-digit', 
                                  month: 'short', 
                                  hour: '2-digit', 
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>

                          {/* Right side actions in Header: Delete button (if owner or admin) & Follow button */}
                          <div className="flex items-center gap-2">
                            {currentUser && (currentUser.id === post.userId || ['admin', 'master_admin', 'club_admin'].includes(currentUser.role)) && onDeletePost && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm('Tem certeza que deseja excluir esta publicação?')) {
                                    onDeletePost(post.id);
                                  }
                                }}
                                className="p-1.5 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                                title="Excluir publicação"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}

                            {currentUser && currentUser.id !== post.userId && (
                              <button
                                onClick={() => onToggleFollow(post.userId)}
                                className={`text-xs px-3 py-1.5 rounded-full font-semibold transition ${
                                  currentUser.following.includes(post.userId)
                                    ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                }`}
                              >
                                {currentUser.following.includes(post.userId) ? 'Seguindo' : 'Seguir'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Media Carousel */}
                        {(() => {
                          const imagesList = post.imageUrls && post.imageUrls.length > 0
                            ? post.imageUrls
                            : (post.imageUrl ? [post.imageUrl] : []);

                          if (imagesList.length === 0) return null;

                          return (
                            <PostImageCarousel
                              images={imagesList}
                              onOpenLightbox={(idx) => setLightboxState({
                                images: imagesList,
                                currentIndex: idx,
                                authorName: post.username,
                                authorAvatar: post.userAvatar
                              })}
                              hasScore={hasScore}
                              defaultImage={defaultImage}
                            />
                          );
                        })()}

                        {/* Body Content */}
                        <div className="p-4 space-y-3">
                          {post.content && post.content.trim() !== '' && (
                            <p className="text-slate-800 text-[14px] leading-relaxed whitespace-pre-wrap">
                              {post.content}
                            </p>
                          )}

                          {/* Target Score Card */}
                          {hasScore && post.targetScore && (
                            <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white p-4 rounded-xl space-y-3 font-mono relative overflow-hidden ring-1 ring-blue-500/20">
                              <div className="absolute -right-3 -bottom-3 opacity-15">
                                <Target className="w-24 h-24 text-white" />
                              </div>
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-[10px] text-blue-400 uppercase tracking-widest font-bold">G&G RESULTADO HOMOLOGADO</span>
                                  <h4 className="text-sm font-semibold tracking-tight text-slate-100 font-display mt-0.5">{post.targetScore.discipline}</h4>
                                </div>
                                <div className="bg-blue-600/30 text-blue-300 font-sans border border-blue-500/20 px-2 py-0.5 rounded text-[11px] font-bold">
                                  Distância: {post.targetScore.distance}m
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-3 border-t border-slate-800 pt-3">
                                <div className="text-center bg-slate-950/40 p-2 rounded justify-center items-center">
                                  <span className="text-[9px] text-slate-400 block uppercase">ACERTOS</span>
                                  <span className="text-lg font-bold text-emerald-400">{post.targetScore.hits}/{post.targetScore.shots}</span>
                                </div>
                                <div className="text-center bg-slate-950/40 p-2 rounded justify-center items-center">
                                  <span className="text-[9px] text-slate-400 block uppercase">EQUIPAMENTO</span>
                                  <span className="text-xs font-semibold block text-slate-200 truncate">{post.targetScore.gunModel}</span>
                                  <span className="text-[10px] text-slate-400">{post.targetScore.caliber}</span>
                                </div>
                                <div className="text-center bg-slate-950/40 p-2 rounded justify-center items-center">
                                  <span className="text-[9px] text-slate-400 block uppercase">PONTOS</span>
                                  <span className="text-lg font-bold text-amber-400">{post.targetScore.score}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Embedded Shared Original Post Card */}
                          {post.sharedPost && (
                            <div className="border border-slate-200 rounded-xl bg-slate-50/80 overflow-hidden space-y-2.5 my-2">
                              <div className="p-3 bg-white border-b border-slate-200/70 flex items-center justify-between">
                                <div
                                  className="flex items-center gap-2.5 cursor-pointer hover:opacity-85"
                                  onClick={() => onViewProfile && onViewProfile(post.sharedPost!.originalUsername)}
                                >
                                  <img
                                    src={post.sharedPost.originalUserAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"}
                                    alt={post.sharedPost.originalUsername}
                                    className="w-7 h-7 rounded-full object-cover border border-slate-200"
                                    referrerPolicy="no-referrer"
                                    loading="lazy"
                                  />
                                  <div>
                                    <span className="font-semibold text-slate-900 text-xs block">@{post.sharedPost.originalUsername}</span>
                                    <span className="text-[10px] text-slate-400">
                                      {new Date(post.sharedPost.originalCreatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {post.sharedPost.originalContent && post.sharedPost.originalContent.trim() !== '' && (
                                <p className="px-3.5 text-slate-800 text-xs leading-relaxed whitespace-pre-wrap">
                                  {post.sharedPost.originalContent}
                                </p>
                              )}

                              {(() => {
                                const origImgs = post.sharedPost.originalImageUrls && post.sharedPost.originalImageUrls.length > 0
                                  ? post.sharedPost.originalImageUrls
                                  : (post.sharedPost.originalImageUrl ? [post.sharedPost.originalImageUrl] : []);

                                if (origImgs.length === 0) return null;

                                return (
                                  <div className="px-3.5 pb-2">
                                    <div className={`grid gap-1 rounded-xl overflow-hidden ${origImgs.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                      {origImgs.slice(0, 4).map((img, idx) => (
                                        <div
                                          key={idx}
                                          onClick={() => setLightboxState({
                                            images: origImgs,
                                            currentIndex: idx,
                                            authorName: post.sharedPost!.originalUsername,
                                            authorAvatar: post.sharedPost!.originalUserAvatar
                                          })}
                                          className="relative aspect-[16/9] overflow-hidden cursor-pointer group bg-slate-900 rounded-lg"
                                        >
                                          <img src={img} alt={`Foto original ${idx+1}`} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-200" referrerPolicy="no-referrer" />
                                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition flex items-center justify-center">
                                            <Maximize2 className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition duration-150" />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}

                              {post.sharedPost.originalTargetScore && (
                                <div className="px-3.5 pb-3">
                                  <div className="bg-slate-900 text-white p-3 rounded-xl font-mono text-xs space-y-1.5">
                                    <div className="flex justify-between items-center text-[10px] text-blue-400 font-bold">
                                      <span>{post.sharedPost.originalTargetScore.discipline}</span>
                                      <span>{post.sharedPost.originalTargetScore.distance}m</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs border-t border-slate-800 pt-1.5">
                                      <span className="text-emerald-400 font-bold">Acertos: {post.sharedPost.originalTargetScore.hits}/{post.sharedPost.originalTargetScore.shots}</span>
                                      <span className="text-amber-400 font-bold">Pontos: {post.sharedPost.originalTargetScore.score}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex items-center justify-between border-t border-slate-50 pt-3 text-slate-600">
                            <div className="flex items-center gap-5">
                              <button
                                onClick={() => onLikePost && onLikePost(post.id)}
                                className="flex items-center gap-1.5 group transition duration-150 cursor-pointer select-none"
                                title={isLiked ? 'Descurtir publicação' : 'Curtir publicação'}
                              >
                                <img
                                  src={likeIcon}
                                  alt="Curtir"
                                  loading="lazy"
                                  className={`w-6 h-6 object-contain transition-all duration-200 ${
                                    isLiked
                                      ? 'scale-110 drop-shadow-md brightness-105'
                                      : 'opacity-40 grayscale group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-115'
                                  }`}
                                />
                                <span className={`font-bold text-xs ${isLiked ? 'text-blue-600 font-extrabold' : 'text-slate-600'}`}>
                                  {post.likes.length}
                                </span>
                              </button>
                              
                              <button
                                onClick={() => setActiveCommentDrawer(activeCommentDrawer === post.id ? null : post.id)}
                                className="flex items-center gap-1.5 hover:text-blue-600 transition duration-150 text-sm cursor-pointer"
                              >
                                <MessageCircle className="w-5 h-5" />
                                <span className="font-medium">{post.comments.length}</span>
                              </button>

                              <button
                                onClick={() => setShareModalPost(post)}
                                className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 transition duration-150 text-sm cursor-pointer"
                                title="Compartilhar no meu perfil"
                              >
                                <Share2 className="w-4.5 h-4.5" />
                                {post.sharesCount && post.sharesCount > 0 ? (
                                  <span className="font-semibold text-xs">{post.sharesCount}</span>
                                ) : null}
                              </button>

                              <div className="flex items-center gap-1.5 text-slate-500 text-sm select-none" title="Visualizações">
                                <Eye className="w-4.5 h-4.5 text-slate-400" />
                                <span className="font-semibold text-xs">{post.viewsCount || 0}</span>
                              </div>
                            </div>

                            <button className="text-slate-400 hover:text-blue-600 transition">
                              <Bookmark className="w-5 h-5" />
                            </button>
                          </div>

                          {/* Comments Thread */}
                          {post.comments.length > 0 && (
                            <div className="bg-slate-50 rounded-xl p-3 space-y-2 mt-2 text-sm">
                              {post.comments.slice(-3).map((comment) => (
                                <div key={comment.id} className="flex gap-2">
                                  <span className="font-bold text-slate-800 cursor-pointer hover:underline" onClick={() => onViewProfile && onViewProfile(comment.username)}>@{comment.username}:</span>
                                  <span className="text-slate-600">{comment.content}</span>
                                </div>
                              ))}
                              {post.comments.length > 3 && (
                                <button
                                  onClick={() => setActiveCommentDrawer(post.id)}
                                  className="text-xs text-blue-600 font-medium hover:underline mt-1 block"
                                >
                                  Ver todos os {post.comments.length} comentários
                                </button>
                              )}
                            </div>
                          )}

                          {/* Input comment inline */}
                          <div className="flex gap-2 items-center bg-slate-50 rounded-xl px-3 py-1.5 mt-2">
                            <input
                              type="text"
                              placeholder="Escreva um comentário..."
                              value={commentInputs[post.id] || ''}
                              onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                              onKeyDown={(e) => e.key === 'Enter' && handleSendComment(post.id)}
                              className="flex-1 bg-transparent border-none focus:outline-none text-xs text-slate-700"
                            />
                            <button
                              onClick={() => handleSendComment(post.id)}
                              className="text-blue-600 hover:text-blue-800 p-1 rounded-lg hover:bg-blue-50 transition"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          </div>

                        </div>
                      </motion.article>
                    );
                  })
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
                    <div
                      key={champ.id}
                      onClick={onNavigateToChampionships}
                      className="border border-slate-200 hover:border-blue-400 hover:shadow-md transition duration-200 cursor-pointer rounded-xl overflow-hidden bg-slate-50/50 flex flex-col justify-between group"
                    >
                      <div className="h-32 bg-slate-200 relative">
                        <img
                          src={champ.bannerUrl || defaultImage}
                          alt={champ.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            if (defaultImage) e.currentTarget.src = defaultImage;
                          }}
                        />
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
                            onClick={onNavigateToChampionships}
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

                      const scoresForChamp = userScores.filter(s => s.championshipId === reg.championshipId && s.modality === modalityName(reg.modalityId));
                      const totalPoints = scoresForChamp.reduce((sum, s) => sum + s.score, 0);
                      const progressPercent = Math.min(100, (scoresForChamp.length / champ.stagesCount) * 100);

                      return (
                        <div key={reg.id} className="border border-slate-150 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h6 className="font-bold text-slate-800 text-xs">{champ.title}</h6>
                              <span className="text-[10px] text-slate-400 block font-mono">{modalityName(reg.modalityId)}</span>
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
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h4 className="font-display font-bold text-slate-900 text-base">
                    {isClubLogin ? 'Inscrições da Unidade Filiada (Gestão do Clube)' : 'Minhas Inscrições em Campeonatos'}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {isClubLogin
                      ? 'Gerencie e efetue o pagamento do lote de inscrições dos atletas filiados ao seu clube.'
                      : 'Acompanhe o status das suas inscrições pagas e efetue o pagamento das pendentes.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase bg-blue-50 text-blue-700 font-mono border border-blue-100">
                    {isClubLogin ? 'Login Clube' : 'Login Atleta'}
                  </span>
                </div>
              </div>

              {batchPaySuccess && (
                <div className="bg-emerald-50 text-emerald-800 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  {batchPaySuccess}
                </div>
              )}

              {/* 1. SEÇÃO DE INSCRIÇÕES PENDENTES DE PAGAMENTO */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/60">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <div>
                      <h5 className="font-bold text-xs text-amber-900 uppercase">Inscrições Pendentes de Pagamento ({pendingRegistrations.length})</h5>
                      <p className="text-[10px] text-amber-700">Selecione as inscrições em aberto para realizar o pagamento unificado via PIX.</p>
                    </div>
                  </div>
                  {pendingRegistrations.length > 0 && (
                    <button
                      onClick={() => {
                        if (selectedPendingIds.length === pendingRegistrations.length) {
                          setSelectedPendingIds([]);
                        } else {
                          setSelectedPendingIds(pendingRegistrations.map(r => r.id));
                        }
                      }}
                      className="text-xs text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer self-start sm:self-center"
                    >
                      {selectedPendingIds.length === pendingRegistrations.length ? 'Desmarcar todas' : 'Selecionar todas'}
                    </button>
                  )}
                </div>

                {pendingRegistrations.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-slate-600">Nenhuma inscrição pendente no momento!</p>
                    <p className="text-[10px] text-slate-400">Todas as inscrições estão quitadas e homologadas.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="divide-y divide-slate-100 border border-amber-200/80 rounded-xl overflow-hidden bg-white shadow-2xs">
                      {pendingRegistrations.map((reg) => {
                        const champ = championships.find(c => c.id === reg.championshipId);
                        const stg = stages.find(s => s.id === reg.stageId);
                        const modName = modalityName(reg.modalityId);
                        const regUser = users.find(u => u.id === reg.userId);
                        const isSelected = selectedPendingIds.includes(reg.id);
                        const feeVal = reg.valorPago != null ? Number(reg.valorPago) : (champ?.valorInscricaoIndividual || 100);

                        return (
                          <div
                            key={reg.id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedPendingIds(selectedPendingIds.filter(id => id !== reg.id));
                              } else {
                                setSelectedPendingIds([...selectedPendingIds, reg.id]);
                              }
                            }}
                            className={`p-4 transition duration-150 flex items-start gap-3 cursor-pointer ${
                              isSelected ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="mt-1 w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                            />
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[9px] px-2 py-0.5 rounded font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                                  PENDENTE
                                </span>
                                <span className="font-bold text-xs text-slate-900">
                                  {champ?.title || 'Campeonato G&G'} &gt; {stg?.title || `Etapa ${stg?.stageNum || 1}`} &gt; {modName}
                                </span>
                              </div>
                              
                              <div className="text-[11px] text-slate-600 font-mono flex flex-wrap gap-x-4 gap-y-0.5">
                                {isClubLogin && (
                                  <span>Atleta: <strong className="text-slate-800">{regUser?.fullName || 'Filiado G&G'}</strong> (CR: {reg.crNumber})</span>
                                )}
                                {!isClubLogin && (
                                  <span>CR: <strong className="text-slate-800">{reg.crNumber}</strong></span>
                                )}
                                <span>Data: {new Date(reg.registeredAt).toLocaleDateString()}</span>
                                <span>Tipo: <strong className="text-slate-800 uppercase">{reg.registrationType === 'reinscrição' ? 'Reinscrição' : 'Normal'}</strong></span>
                              </div>
                            </div>

                            <div className="text-right font-mono flex-shrink-0">
                              <span className="text-xs font-extrabold text-amber-700 block">R$ {feeVal.toFixed(2)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Barra de ação do Pagamento do Lote Pendente */}
                    {pendingRegistrations.length > 0 && (
                      <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-3 shadow-md">
                        <div>
                          <span className="text-xs text-slate-300 font-medium">
                            {selectedPendingIds.length} de {pendingRegistrations.length} inscrição(ões) selecionada(s)
                          </span>
                          <div className="text-lg font-bold font-mono text-emerald-400">
                            Total: R$ {pendingRegistrations
                              .filter(r => selectedPendingIds.includes(r.id))
                              .reduce((sum, r) => sum + (r.valorPago != null ? Number(r.valorPago) : 100), 0)
                              .toFixed(2)}
                          </div>
                        </div>

                        <button
                          disabled={selectedPendingIds.length === 0}
                          onClick={() => { setPixCopied(false); setIsBatchPayModalOpen(true); }}
                          className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs px-5 py-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                        >
                          <QrCode className="w-4 h-4" />
                          Pagar Selecionadas via PIX
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. SEÇÃO DE INSCRIÇÕES PAGAS / HOMOLOGADAS */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200/60">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div>
                    <h5 className="font-bold text-xs text-emerald-900 uppercase">Inscrições Pagas & Homologadas ({approvedRegistrations.length})</h5>
                    <p className="text-[10px] text-emerald-700">Inscrições confirmadas e aptas para disputar as etapas.</p>
                  </div>
                </div>

                {approvedRegistrations.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-xs">Nenhuma inscrição paga/homologada registrada ainda.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {approvedRegistrations.map((reg) => {
                      const champ = championships.find(c => c.id === reg.championshipId);
                      const stg = stages.find(s => s.id === reg.stageId);
                      const modName = modalityName(reg.modalityId);
                      const regUser = users.find(u => u.id === reg.userId);
                      const feeVal = reg.valorPago != null ? Number(reg.valorPago) : (champ?.valorInscricaoIndividual || 100);

                      return (
                        <div key={reg.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[9px] px-2 py-0.5 rounded font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                                HOMOLOGADA
                              </span>
                              <span className="font-bold text-xs text-slate-900">
                                {champ?.title || 'Campeonato G&G'} &gt; {stg?.title || `Etapa ${stg?.stageNum || 1}`} &gt; {modName}
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-600 font-mono flex flex-wrap gap-x-4 gap-y-0.5">
                              {isClubLogin && (
                                <span>Atleta: <strong className="text-slate-800">{regUser?.fullName || 'Filiado G&G'}</strong> (CR: {reg.crNumber})</span>
                              )}
                              {!isClubLogin && (
                                <span>CR: <strong className="text-slate-800">{reg.crNumber}</strong></span>
                              )}
                              <span>Data Pgto: {reg.dataPagamento || new Date(reg.registeredAt).toLocaleDateString()}</span>
                              <span>Valor Pago: <strong className="text-slate-800">R$ {feeVal.toFixed(2)}</strong></span>
                              {reg.txId && <span className="truncate max-w-[200px]">TxID: {reg.txId}</span>}
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setReceiptData({
                                regId: reg.id,
                                champTitle: champ ? champ.title : 'Campeonato G&G',
                                modality: modName,
                                crNumber: reg.crNumber,
                                registeredAt: reg.registeredAt,
                                paymentMethod: reg.paymentMethod,
                                paymentStatus: reg.paymentStatus,
                                txId: reg.txId,
                                athleteName: regUser?.fullName || selectedUser.fullName,
                                athleteUsername: regUser?.username || selectedUser.username,
                                valorPago: reg.valorPago,
                                registrationType: reg.registrationType,
                                registeredByUserId: reg.registeredByUserId,
                                userId: reg.userId
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
            </div>
          )}

          {/* 4. Resultados (NEW tab) */}
          {profileTab === 'results' && (
            <div className="space-y-6">
              {/* Tabela Interativa de Resultados Gerais das Competições */}
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
            </div>
          )}

          {/* 5. Certificados (Utiliza o visualizador oficial de certificados do clube filtrado para o atleta) */}
          {profileTab === 'certificates' && (
            <ClubCertificatesViewer
              currentUser={currentUser}
              clubs={clubs}
              users={users || (selectedUser ? [selectedUser] : [])}
              registrations={registrations}
              championships={championships}
              stages={stages || []}
              stageScores={stageScores}
              modalities={modalities}
              restrictedToUserId={selectedUser.id}
            />
          )}

          {/* 6. Carteirinha Clube (NEW tab) */}
          {profileTab === 'club_card' && (
            <div className="bg-white rounded-2xl smooth-shadow border border-slate-100 p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                <h4 className="font-display font-bold text-slate-800 text-sm uppercase">Carteira de Membro do Clube</h4>
                <CreditCard className="w-5 h-5 text-blue-600" />
              </div>

              <div className="flex flex-col lg:flex-row gap-6 items-center justify-center py-4">
                {renderClubCardFront()}
                {renderClubCardBack()}
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


          {/* 6b. Carteirinha Playoff */}
          {profileTab === 'playoff_card' && (
            <div className="bg-white rounded-2xl smooth-shadow border border-slate-100 p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                <h4 className="font-display font-bold text-slate-800 text-sm uppercase">Carteirinha Playoff</h4>
                <Trophy className="w-5 h-5 text-amber-600" />
              </div>

              <div className="flex flex-col lg:flex-row gap-6 items-center justify-center py-4">
                {renderPlayoffCardFront()}
                {renderPlayoffCardBack()}
              </div>

              <button
                onClick={() => {
                  setPrintData({
                    fullName: selectedUser.fullName,
                    crNumber: selectedUser.crNumber || 'Emitindo...',
                    regId: `GG-PLY-${selectedUser.id.slice(0, 6).toUpperCase()}`,
                  });
                  setPrintMode('club_card');
                }}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs py-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Imprimir Carteirinha Playoff
              </button>
            </div>
          )}

          {/* 6c. Carteirinha Atirador */}
          {profileTab === 'shooter_card' && (
            <div className="bg-white rounded-2xl smooth-shadow border border-slate-100 p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                <h4 className="font-display font-bold text-slate-800 text-sm uppercase">Carteirinha Atirador Desportivo</h4>
                <Target className="w-5 h-5 text-indigo-600" />
              </div>

              <div className="flex flex-col lg:flex-row gap-6 items-center justify-center py-4">
                {renderShooterCardFront()}
                {renderShooterCardBack()}
              </div>

              <button
                onClick={() => {
                  setPrintData({
                    fullName: selectedUser.fullName,
                    crNumber: selectedUser.crNumber || 'Emitindo...',
                    regId: `GG-ATI-${selectedUser.id.slice(0, 6).toUpperCase()}`,
                  });
                  setPrintMode('club_card');
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs py-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Imprimir Carteirinha Atirador
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
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80";
                      }}
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

          {/* 8. Treinamentos (Real Training Sessions Tab) */}
          {profileTab === 'trainings' && (
            <div className="bg-white rounded-2xl smooth-shadow border border-slate-100 p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <h4 className="font-display font-bold text-slate-800 text-sm uppercase">Diário de Treinamentos (Habitualidade Real)</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Registre seus treinos no clube informando arma, posse e munições utilizadas.</p>
                </div>
                {isMe && (
                  <button
                    onClick={() => {
                      setShowAddTraining(!showAddTraining);
                      setTrainingError('');
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    {showAddTraining ? 'Cancelar' : (
                      <>
                        <Plus className="w-4 h-4" />
                        Registrar Treino
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Training Form */}
              <AnimatePresence>
                {showAddTraining && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={handleAddTrainingSubmit}
                    className="bg-slate-50 p-5 rounded-2xl space-y-4 overflow-hidden text-xs text-slate-700 border border-slate-200 shadow-inner"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                      <span className="font-bold text-slate-800 text-xs uppercase flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-600" />
                        Formulário de Registro de Treinamento
                      </span>
                    </div>

                    {trainingError && (
                      <div className="bg-red-50 text-red-700 p-3 rounded-xl border border-red-200 text-xs font-semibold flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
                        <span>{trainingError}</span>
                      </div>
                    )}

                    {/* 1. Data e Hora */}
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

                    {/* 2. Seleciona a Arma Utilizada com Busca em Tempo Real (Mínimo 3 Caracteres) */}
                    <div className="relative">
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[11px] text-slate-600 font-bold uppercase">
                          Arma Utilizada <span className="text-red-500">*</span> (Pesquise digitando no mínimo 3 caracteres)
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
                            setShowAddWeapon(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          Cadastrar Nova Arma
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
                          placeholder="Digite modelo, marca, calibre, sigma ou proprietário..."
                          className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-medium shadow-xs"
                        />
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      </div>

                      {trainingForm.weaponSearchQuery.length > 0 && trainingForm.weaponSearchQuery.length < 3 && (
                        <p className="text-[10.5px] text-amber-600 mt-1 font-medium">
                          Digite mais {3 - trainingForm.weaponSearchQuery.length} caractere(s) para pesquisar nas armas do banco de dados...
                        </p>
                      )}

                      {/* Weapon Search Results Dropdown */}
                      {isWeaponDropdownOpen && trainingForm.weaponSearchQuery.length >= 3 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
                          {searchFilteredWeapons.length === 0 ? (
                            <div className="p-3 text-center text-slate-500 text-xs">
                              Nenhuma arma cadastrada encontrada para "{trainingForm.weaponSearchQuery}". Você pode continuar digitando o nome da arma.
                            </div>
                          ) : (
                            searchFilteredWeapons.map(w => {
                              const isMine = currentUser && w.ownerId === currentUser.id;
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
                                      weaponOwnerType: isMine ? 'propria' : 'clube',
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
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isMine ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-purple-100 text-purple-800 border border-purple-200'}`}>
                                    {isMine ? '🎯 Própria' : '🏛️ Clube'}
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>

                    {/* 3. Posse da Arma: Informa se a arma é própria ou do clube */}
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

                    {/* 4. Registrar total de tiros: Tiros com munição própria vs Munição do Clube */}
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
                    </div>

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
                        'Confirmar e Salvar Treinamento no Banco de Dados'
                      )}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Sub-modal: Cadastrar Nova Arma no Registro de Treinamento */}
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
                              list="weapon-model-list-training"
                              value={newWeaponData.model}
                              onChange={(e) => setNewWeaponData(prev => ({ ...prev, model: e.target.value }))}
                              className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl focus:border-blue-500 text-xs font-medium"
                            />
                            <datalist id="weapon-model-list-training">
                              {weaponLookup('modelo').map(o => <option key={o.id} value={o.label} />)}
                            </datalist>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Calibre *</label>
                            <input
                              type="text"
                              required
                              placeholder="Digite ou selecione..."
                              list="weapon-caliber-list-training"
                              value={newWeaponData.caliber}
                              onChange={(e) => setNewWeaponData(prev => ({ ...prev, caliber: e.target.value }))}
                              className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl focus:border-blue-500 text-xs font-medium"
                            />
                            <datalist id="weapon-caliber-list-training">
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
                            list="weapon-manufacturer-list-training"
                            value={newWeaponData.manufacturer}
                            onChange={(e) => setNewWeaponData(prev => ({ ...prev, manufacturer: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl focus:border-blue-500 text-xs font-medium"
                          />
                          <datalist id="weapon-manufacturer-list-training">
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

              {/* Stats panel */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-500 uppercase block font-sans font-bold">Total Sessões</span>
                  <span className="text-base font-bold text-slate-800">{trainings.length}</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-500 uppercase block font-sans font-bold">Munição Própria</span>
                  <span className="text-base font-bold text-blue-600">
                    {trainings.reduce((sum, t) => sum + (t.ownAmmoShots || 0), 0)} tiros
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-500 uppercase block font-sans font-bold">Munição Clube</span>
                  <span className="text-base font-bold text-purple-600">
                    {trainings.reduce((sum, t) => sum + (t.clubAmmoShots || 0), 0)} tiros
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-500 uppercase block font-sans font-bold">Total Disparos</span>
                  <span className="text-base font-bold text-emerald-600">
                    {trainings.reduce((sum, t) => sum + (t.totalShots || (t.ownAmmoShots || 0) + (t.clubAmmoShots || 0)), 0)} tiros
                  </span>
                </div>
              </div>

              {/* Training Sessions List */}
              {loadingTrainings ? (
                <div className="py-12 text-center text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <span className="text-xs font-semibold">Carregando registros de treinamentos...</span>
                </div>
              ) : trainings.length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Activity className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold">Nenhum treinamento registrado ainda no banco de dados.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Clique em "Registrar Treino" para adicionar sua habitualidade.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {trainings.map(t => {
                    const formattedDate = t.dateTime ? new Date(t.dateTime).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Data não informada';
                    const isClubWeapon = t.weaponOwnerType === 'clube';

                    return (
                      <div key={t.id} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 hover:bg-white hover:border-blue-200 transition shadow-xs">
                        <div className="flex justify-between items-start border-b border-slate-200/60 pb-3 mb-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">{t.weaponName}</span>
                              {t.weaponCaliber && (
                                <span className="text-[10.5px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                  {t.weaponCaliber}
                                </span>
                              )}
                              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${isClubWeapon ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                {isClubWeapon ? '🏛️ Arma do Clube' : '🎯 Arma Própria'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-3">
                              <span className="flex items-center gap-1 font-mono">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                {formattedDate}
                              </span>
                              {t.modality && (
                                <span className="font-semibold text-slate-700">• {t.modality}</span>
                              )}
                            </div>
                          </div>

                          {isMe && (
                            <button
                              onClick={() => deleteTraining(t.id)}
                              className="text-slate-400 hover:text-red-500 transition p-1.5 rounded-lg hover:bg-red-50 cursor-pointer"
                              title="Excluir treinamento"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Shot Details Grid */}
                        <div className="grid grid-cols-3 gap-3 font-mono text-xs bg-white p-3 rounded-xl border border-slate-100">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase block font-sans font-bold">Munição Própria</span>
                            <span className="font-bold text-blue-700">{t.ownAmmoShots} tiros</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase block font-sans font-bold">Munição Clube</span>
                            <span className="font-bold text-purple-700">{t.clubAmmoShots} tiros</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase block font-sans font-bold">Total Disparos</span>
                            <span className="font-extrabold text-emerald-600">{t.totalShots || (t.ownAmmoShots + t.clubAmmoShots)} tiros</span>
                          </div>
                        </div>

                        {t.notes && (
                          <p className="text-[11px] text-slate-600 italic mt-2.5 font-sans pl-2 border-l-2 border-slate-300">
                            "{t.notes}"
                          </p>
                        )}
                      </div>
                    );
                  })}
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
                <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1 max-w-md">
                      <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Declaração de Habitualidade (Frequência)</h5>
                      <p className="text-[10.5px] text-slate-500 leading-relaxed">
                        Documento comprobatório de habitualidade esportiva contendo histórico de treinamentos e campeonatos no período selecionado.
                      </p>
                    </div>
                    
                    <button
                      disabled={combinedHabitualities.length === 0}
                      onClick={() => {
                        setPrintData({
                          fullName: selectedUser.fullName,
                          crNumber: selectedUser.crNumber || 'Emitindo...',
                          startDate: habStartDate,
                          endDate: habEndDate,
                          activities: combinedHabitualities,
                          date: new Date().toISOString().split('T')[0],
                          hash: `GG-HAB-${selectedUser.id.slice(0, 8).toUpperCase()}`
                        });
                        setPrintMode('declaration_habitualidade');
                      }}
                      className={`text-xs font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 self-start sm:self-center transition cursor-pointer ${combinedHabitualities.length > 0 ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Gerar Habitualidade
                    </button>
                  </div>

                  {/* Date Range Selection (Filtro por Período de Datas) */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                      Período de Seleção da Habitualidade (Entre Datas)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Data Inicial *</label>
                        <input
                          type="date"
                          value={habStartDate}
                          onChange={(e) => setHabStartDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 outline-none p-2 rounded-lg text-xs font-semibold focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Data Final *</label>
                        <input
                          type="date"
                          value={habEndDate}
                          onChange={(e) => setHabEndDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 outline-none p-2 rounded-lg text-xs font-semibold focus:border-blue-500"
                        />
                      </div>
                    </div>
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
                          {combinedHabitualities.length} registro(s) no período selecionado ({habStartDate.split('-').reverse().join('/')} a {habEndDate.split('-').reverse().join('/')})
                        </span>
                        <p className="text-[10px] text-slate-450 mt-0.5">
                          {combinedHabitualities.length >= 8
                            ? 'Requisito legal do Exército Brasileiro atendido (8+ frequências)!'
                            : combinedHabitualities.length > 0
                            ? `${combinedHabitualities.length} habitualidades registradas no período. É possível gerar a declaração.`
                            : 'Nenhum treino ou campeonato encontrado neste período de datas.'}
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

                  {/* Activities summary in selected period */}
                  {combinedHabitualities.length > 0 && (
                    <div className="text-[9.5px] font-mono text-slate-500 bg-white p-2.5 rounded-lg border border-slate-100 max-h-36 overflow-y-auto space-y-1">
                      <div className="font-sans font-bold text-[8.5px] text-slate-400 uppercase tracking-wider mb-1">
                        Registros Encontrados ({combinedHabitualities.length})
                      </div>
                      {combinedHabitualities.map((item) => (
                        <div key={item.id} className="flex items-center justify-between border-b border-slate-50 pb-1">
                          <div className="truncate pr-2">
                            <span className="font-bold text-slate-800 mr-2">{item.dateFormatted}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold font-sans uppercase mr-1.5 ${item.eventType === 'Competição' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                              {item.eventType}
                            </span>
                            <span className="text-slate-600 font-sans truncate">{item.eventName} ({item.model})</span>
                          </div>
                          <span className="font-bold text-slate-700 shrink-0">{item.caliber} - {item.shotsCount} tir.</span>
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
              <div className="sm:w-1/2 bg-slate-950 flex items-center justify-center p-2 relative overflow-hidden min-h-[250px]">
                {/* Soft blurred background layer matching the photo */}
                <div
                  className="absolute inset-0 bg-cover bg-center blur-2xl opacity-40 scale-110 pointer-events-none"
                  style={{ backgroundImage: `url("${selectedExpandPost.imageUrl || defaultImage}")` }}
                />
                <img
                  src={selectedExpandPost.imageUrl || defaultImage}
                  alt="Expanded target"
                  className="relative z-10 max-w-full max-h-[500px] w-auto h-auto object-contain mx-auto shadow-md"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    if (defaultImage) e.currentTarget.src = defaultImage;
                  }}
                />
              </div>

              <div className="p-4 sm:w-1/2 flex flex-col justify-between max-h-[85vh] overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                    <img
                      src={selectedExpandPost.userAvatar}
                      alt="user"
                      className="w-9 h-9 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80";
                      }}
                    />
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

      {/* MODAL DE PAGAMENTO PIX EM LOTE */}
      {isBatchPayModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative my-8 text-slate-800">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-base">Pagamento Unificado via PIX</h3>
                <p className="text-xs text-slate-400">Escaneie o QR Code ou copie a chave para pagar as inscrições selecionadas.</p>
              </div>
              <button
                onClick={() => setIsBatchPayModalOpen(false)}
                className="text-slate-400 hover:text-slate-650 transition cursor-pointer p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {batchPayError && (
              <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-semibold border border-red-200">{batchPayError}</div>
            )}

            {(() => {
              const selectedRegs = pendingRegistrations.filter(r => selectedPendingIds.includes(r.id));
              const totalVal = selectedRegs.reduce((sum, r) => sum + (r.valorPago != null ? Number(r.valorPago) : 100), 0);
              const pixChaveStr = `00020126580014BR.GOV.BCB.PIX0136419974402555204000053039865405${totalVal.toFixed(2)}5802BR5915GG COMPETICOES6008BRASILIA62070503***6304`;

              return (
                <div className="space-y-5 text-xs">
                  {/* Box com resumo do valor */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center space-y-1">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Valor Total a Pagar ({selectedRegs.length} inscrição/ões)</span>
                    <div className="text-2xl font-extrabold text-emerald-700 font-mono">R$ {totalVal.toFixed(2)}</div>
                  </div>

                  {/* QR Code Simulado */}
                  <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="w-40 h-40 bg-white p-2 border border-slate-300 rounded-xl shadow-xs flex items-center justify-center">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(pixChaveStr)}`}
                        alt="QR Code PIX"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">Chave Pix Celular: (41) 99744-0255</span>
                  </div>

                  {/* Chave Copia e Cola */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Chave PIX Copia e Cola</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={pixChaveStr}
                        className="w-full bg-slate-100 border border-slate-200 p-2.5 rounded-xl font-mono text-[10px] text-slate-600 truncate outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(pixChaveStr);
                          setPixCopied(true);
                          setTimeout(() => setPixCopied(false), 3000);
                        }}
                        className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-3 py-2 rounded-xl transition text-[11px] flex-shrink-0 cursor-pointer flex items-center gap-1"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {pixCopied ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  </div>

                  {/* Lista resumida de itens inclusos */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Inscrições Incluídas neste lote:</span>
                    <div className="max-h-36 overflow-y-auto space-y-1 divide-y divide-slate-100 text-[11px] pr-1">
                      {selectedRegs.map(reg => {
                        const c = championships.find(ch => ch.id === reg.championshipId);
                        const st = stages.find(s => s.id === reg.stageId);
                        const m = modalityName(reg.modalityId);
                        const u = users.find(usr => usr.id === reg.userId);
                        const v = reg.valorPago != null ? Number(reg.valorPago) : 100;
                        return (
                          <div key={reg.id} className="pt-1 flex justify-between items-center text-slate-700">
                            <div className="truncate max-w-[280px]">
                              <span className="font-bold">{c?.title || 'Campeonato'}</span> &gt; {st?.title || `Etapa ${st?.stageNum || 1}`} &gt; {m}
                              {isClubLogin && <span className="text-[10px] text-slate-400 block">Atleta: {u?.fullName}</span>}
                            </div>
                            <span className="font-mono font-bold text-amber-700 flex-shrink-0">R$ {v.toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsBatchPayModalOpen(false)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition text-xs cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={batchPaySaving}
                      onClick={async () => {
                        setBatchPaySaving(true);
                        setBatchPayError('');
                        try {
                          const res = await fetch('/api/registrations/pay-batch', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'x-user-id': selectedUser.id
                            },
                            body: JSON.stringify({
                              registrationIds: selectedPendingIds,
                              paymentMethod: 'pix'
                            })
                          }).then(r => r.json());

                          if (res.error) {
                            setBatchPayError(res.error);
                          } else {
                            setIsBatchPayModalOpen(false);
                            setBatchPaySuccess(`Pagamento de ${res.paidCount} inscrição(ões) aprovado com sucesso! (TxID: ${res.txId})`);
                            if (onUpdateProfile) {
                              onUpdateProfile({});
                            }
                            setTimeout(() => window.location.reload(), 1500);
                          }
                        } catch (err) {
                          console.error(err);
                          setBatchPayError('Erro de conexão ao processar pagamento.');
                        } finally {
                          setBatchPaySaving(false);
                        }
                      }}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl transition text-xs cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {batchPaySaving ? 'Confirmando...' : 'Confirmar Pagamento PIX'}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

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
                  {renderClubCardFront()}
                  {renderClubCardBack()}
                </div>
              )}

              {/* CARTEIRINHA FEDERAL G&G PRINT LAYOUT */}
              {printMode === 'gg_card' && (
                <div className="flex flex-col gap-6 items-center justify-center p-4">
                  {/* Front card body */}
                  <div className="w-[325px] h-[200px] rounded-xl p-2.5 flex flex-col justify-between relative shadow-md overflow-hidden border border-slate-700 bg-[linear-gradient(135deg,#06b6d4_0%,#1d4ed8_45%,#090d16_90%)] text-white">
                    <div className="flex gap-2 items-start">
                      <div className="w-[66px] h-[80px] rounded bg-white p-0.5 border border-white/80 shrink-0 overflow-hidden flex items-center justify-center">
                        <img
                          src={selectedUser.avatarUrl}
                          alt="avatar"
                          className="w-full h-full rounded object-cover"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80";
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1 text-left">
                        <div className="flex items-center justify-between gap-1">
                          <div className="bg-slate-900/90 border border-amber-400/40 rounded px-1.5 py-0.5 text-center">
                            <span className="text-[6px] font-black text-amber-300 block uppercase tracking-widest leading-none">ATIRADOR FEDERADO</span>
                            <span className="text-[7px] font-black text-white block uppercase tracking-wider leading-tight mt-0.5">★ NACIONAL ★</span>
                          </div>
                          <div className="text-right">
                            <span className="font-display font-black text-[10px] tracking-tighter text-white block leading-none">G<span className="text-amber-400">&</span>G</span>
                            <span className="text-[5px] font-mono text-amber-200 tracking-widest block uppercase leading-none mt-0.5">COMPETIÇÕES</span>
                          </div>
                        </div>
                        <div className="pt-0.5">
                          <span className="text-[8.5px] font-black text-amber-200 uppercase tracking-wide block leading-tight font-mono">
                            CADASTRO Nº {selectedUser.id.slice(-5).toUpperCase() || '00123'}
                          </span>
                        </div>
                        <div className="bg-white rounded px-1 py-0.5 border border-slate-200 text-left">
                          <span className="text-[6px] font-extrabold text-blue-900 uppercase block tracking-tighter leading-none">Nome:</span>
                          <span className="text-[8px] font-bold text-slate-900 truncate block leading-tight uppercase font-sans">{printData.fullName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-1 text-left">
                      <div className="bg-white rounded px-1 py-0.5 border border-slate-200 min-w-0">
                        <span className="text-[5px] font-extrabold text-blue-900 uppercase block tracking-tighter leading-none">CPF:</span>
                        <span className="text-[6.5px] font-bold text-slate-900 font-mono truncate block leading-tight">{selectedUser.cpf || '000.000.000-00'}</span>
                      </div>
                      <div className="bg-white rounded px-1 py-0.5 border border-slate-200 min-w-0">
                        <span className="text-[5px] font-extrabold text-blue-900 uppercase block tracking-tighter leading-none">RG:</span>
                        <span className="text-[6.5px] font-bold text-slate-900 font-mono truncate block leading-tight">{selectedUser.rg || '00.000.000-0'}</span>
                      </div>
                      <div className="bg-white rounded px-1 py-0.5 border border-slate-200 min-w-0">
                        <span className="text-[5px] font-extrabold text-blue-900 uppercase block tracking-tighter leading-none">CR:</span>
                        <span className="text-[6.5px] font-bold text-slate-900 font-mono truncate block leading-tight">{printData.crNumber}</span>
                      </div>
                      <div className="bg-white rounded px-1 py-0.5 border border-slate-200 min-w-0">
                        <span className="text-[5px] font-extrabold text-blue-900 uppercase block tracking-tighter leading-none">VALIDADE:</span>
                        <span className="text-[6.5px] font-bold text-slate-900 font-mono truncate block leading-tight">31/12/2026</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1 text-left">
                      <div className="bg-white rounded px-1 py-0.5 border border-slate-200 col-span-1 min-w-0">
                        <span className="text-[5px] font-extrabold text-blue-900 uppercase block tracking-tighter leading-none">Clube:</span>
                        <span className="text-[6.5px] font-bold text-slate-900 truncate block leading-tight uppercase font-sans">FEDERAÇÃO G&G</span>
                      </div>
                      <div className="bg-white rounded px-1 py-0.5 border border-slate-200 min-w-0">
                        <span className="text-[5px] font-extrabold text-blue-900 uppercase block tracking-tighter leading-none">Cidade:</span>
                        <span className="text-[6.5px] font-bold text-slate-900 truncate block leading-tight uppercase font-sans">{selectedUser.city || 'SANTA LUZIA'}</span>
                      </div>
                      <div className="bg-white rounded px-1 py-0.5 border border-slate-200 min-w-0">
                        <span className="text-[5px] font-extrabold text-blue-900 uppercase block tracking-tighter leading-none">ESTADO:</span>
                        <span className="text-[6.5px] font-bold text-slate-900 truncate block leading-tight uppercase font-sans">{selectedUser.state || 'MG'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Back card body */}
                  <div className="w-[325px] h-[200px] rounded-xl p-2.5 flex flex-col items-center justify-between relative shadow-md overflow-hidden border border-slate-300 bg-white text-slate-800">
                    <div className="absolute inset-0 grid grid-cols-4 gap-2 opacity-15 pointer-events-none p-2 content-between text-center select-none">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <div key={i} className="text-[5.5px] font-black text-blue-900 uppercase font-mono tracking-tighter leading-none">
                          G&G EMPREENDIMENTOS
                        </div>
                      ))}
                    </div>
                    <div className="relative z-10 my-auto flex flex-col items-center justify-center">
                      <div className="bg-white p-1.5 border-2 border-slate-900 rounded-lg shadow-xs relative">
                        <svg viewBox="0 0 100 100" className="w-20 h-20 text-slate-900">
                          <rect width="100" height="100" fill="white" />
                          <rect x="5" y="5" width="25" height="25" fill="currentColor" />
                          <rect x="70" y="5" width="25" height="25" fill="currentColor" />
                          <rect x="5" y="70" width="25" height="25" fill="currentColor" />
                          <rect x="10" y="10" width="15" height="15" fill="white" />
                          <rect x="75" y="10" width="15" height="15" fill="white" />
                          <rect x="10" y="75" width="15" height="15" fill="white" />
                          <rect x="14" y="14" width="7" height="7" fill="currentColor" />
                          <rect x="79" y="14" width="7" height="7" fill="currentColor" />
                          <rect x="14" y="79" width="7" height="7" fill="currentColor" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-5 h-5 bg-white border border-slate-900 rounded-full flex items-center justify-center">
                            <Target className="w-3 h-3 text-amber-600" />
                          </div>
                        </div>
                      </div>
                      <span className="text-[7px] font-bold text-slate-700 font-mono mt-1 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        VALIDAÇÃO CADASTRAL AUTÊNTICA G&G
                      </span>
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

              {/* DECLARAÇÃO DE HABITUALIDADE (TABELAS CONFORME PADRÃO DO EXÉRCITO) */}
              {printMode === 'declaration_habitualidade' && (
                <div className="w-full flex-1 flex flex-col justify-between min-h-[250mm] font-sans p-4 text-slate-900">
                  {/* Timbre Header */}
                  <div className="text-center border-b-2 border-slate-900 pb-3">
                    <h2 className="font-display font-extrabold text-xl text-slate-900 tracking-wider">G&G CLUBE DE TIRO E COMPETIÇÕES</h2>
                    <p className="text-[10px] font-sans text-slate-600 uppercase tracking-widest mt-0.5">
                      Filiado ao SFPC/11ª RM - Registro de Entidade nº 9410 - CNPJ: 45.981.042/0001-12
                    </p>
                  </div>

                  {/* Title */}
                  <div className="text-center my-4">
                    <h1 className="text-base font-bold uppercase underline tracking-wider text-slate-900">
                      Declaração de Habitualidade e Treinamentos
                    </h1>
                  </div>

                  {/* Intro */}
                  <div className="text-justify text-xs text-slate-800 leading-relaxed mb-4 px-2">
                    <p>
                      Declaramos, sob as penas da lei e em cumprimento às diretrizes legais estabelecidas pelo Exército Brasileiro para fins de manutenção, revalidação ou aquisição de armamentos desportivos, que o(a) atleta <strong>{printData.fullName}</strong>, titular do CR nº <strong>{printData.crNumber}</strong>, realizou treinamentos e/ou participou de etapas oficiais de competição neste estabelecimento no período de <strong>{printData.startDate?.split('-').reverse().join('/')}</strong> a <strong>{printData.endDate?.split('-').reverse().join('/')}</strong>, conforme os registros oficiais abaixo detalhados:
                    </p>
                  </div>

                  {/* Individual Event Tables matching the user's screenshot layout */}
                  <div className="flex-1 space-y-4 px-1">
                    {printData.activities.map((item: any, idx: number) => (
                      <div key={item.id || idx} className="border border-slate-900 text-xs overflow-hidden page-break-inside-avoid shadow-xs">
                        <table className="w-full border-collapse text-xs text-slate-900">
                          <tbody>
                            {/* Row 1: Nome do Evento */}
                            <tr className="border-b border-slate-900 bg-slate-50">
                              <td colSpan={6} className="px-3 py-1.5 font-bold uppercase text-left text-[11px]">
                                Nome do evento: {item.eventName}
                              </td>
                            </tr>

                            {/* Row 2: Arma Utilizada */}
                            <tr className="border-b border-slate-900">
                              <td colSpan={6} className="px-3 py-1.5 font-medium text-[10.5px]">
                                Arma utilizada: {item.weaponClass} - {item.model} - N° {item.weaponNumber} - {item.manufacturer} - Calibre : {item.caliber} - {item.permissionStatus}
                              </td>
                            </tr>

                            {/* Row 3: Table Header */}
                            <tr className="bg-slate-100 font-bold text-[10px] text-center border-b border-slate-900 uppercase tracking-wider">
                              <td className="border-r border-slate-900 py-1.5 px-2 w-14">Ordem</td>
                              <td className="border-r border-slate-900 py-1.5 px-2 w-28">Data</td>
                              <td className="border-r border-slate-900 py-1.5 px-2 w-20">Hora</td>
                              <td className="border-r border-slate-900 py-1.5 px-2 w-32">Sigma</td>
                              <td className="border-r border-slate-900 py-1.5 px-2 w-28">Qtd Munições</td>
                              <td className="py-1.5 px-2">Tipo de Evento</td>
                            </tr>

                            {/* Row 4: Data Row */}
                            <tr className="text-center font-mono text-[11px] border-b border-slate-900">
                              <td className="border-r border-slate-900 py-2 px-2 font-bold">{String(idx + 1).padStart(2, '0')}</td>
                              <td className="border-r border-slate-900 py-2 px-2">{item.dateFormatted}</td>
                              <td className="border-r border-slate-900 py-2 px-2">{item.timeFormatted}</td>
                              <td className="border-r border-slate-900 py-2 px-2">{item.sigma}</td>
                              <td className="border-r border-slate-900 py-2 px-2 font-bold">{item.shotsCount}</td>
                              <td className="py-2 px-2 font-sans font-semibold text-slate-800">{item.eventType}</td>
                            </tr>

                            {/* Row 5: Arma & Munições ownership */}
                            <tr className="border-b border-slate-900 text-[10.5px]">
                              <td colSpan={3} className="border-r border-slate-900 px-3 py-1.5 font-medium">
                                Arma: {item.weaponOwnerText}
                              </td>
                              <td colSpan={3} className="px-3 py-1.5 font-medium">
                                Munições: {item.ammoOwnerText}
                              </td>
                            </tr>

                            {/* Row 6: Evento Footer */}
                            <tr>
                              <td colSpan={6} className="px-3 py-1.5 font-medium uppercase text-[10.5px]">
                                Evento: {item.eventName}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>

                  {/* Signatures & Footer */}
                  <div className="mt-8 space-y-8">
                    <div className="text-center text-slate-800 text-[11px]">
                      <p>Atestamos a veracidade e exatidão dos registros de habitualidade acima especificados.</p>
                      <p className="mt-1">Brasília - DF, {new Date(printData.date).toLocaleDateString('pt-BR')}.</p>
                    </div>

                    <div className="text-center text-[10px] space-y-1">
                      <div className="h-0.5 bg-slate-400 w-56 mx-auto"></div>
                      <span className="font-bold text-slate-900 block mt-1">Oficial de Segurança de Estande / Controle de Frequência</span>
                      <span className="text-slate-500 block">Homologação de Frequência G&G Competições</span>
                      <span className="text-slate-400 font-mono text-[8px] block">Registro de Autenticidade: {printData.hash}</span>
                    </div>
                  </div>

                </div>
              )}

            </div>
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
                  {receiptData.valorPago != null && (
                    <div><strong>Valor Pago:</strong> R$ {Number(receiptData.valorPago).toFixed(2)}</div>
                  )}
                  {receiptData.registrationType && (
                    <div className="uppercase"><strong>Tipo:</strong> {receiptData.registrationType}</div>
                  )}
                  {receiptData.registeredByUserId && (
                    <div><strong>Origem:</strong> {receiptData.registeredByUserId === receiptData.userId ? 'ATLETA' : 'CLUBE'}</div>
                  )}
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

      {/* Lightbox Modal for enlarged photos with touch swipe support */}
      <AnimatePresence>
        {lightboxState && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-5xl w-full h-full max-h-[90vh] flex flex-col justify-between p-2"
            >
              {/* Top Bar Header */}
              <div className="flex items-center justify-between text-white border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  {lightboxState.authorAvatar && (
                    <img src={lightboxState.authorAvatar} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-white/20" />
                  )}
                  <div>
                    {lightboxState.authorName && (
                      <span className="font-bold text-xs text-white block">@{lightboxState.authorName}</span>
                    )}
                    <span className="text-[10px] text-slate-400 font-mono">
                      Foto {lightboxState.currentIndex + 1} de {lightboxState.images.length}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setLightboxState(null)}
                  className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 w-9 h-9 rounded-full flex items-center justify-center font-bold transition cursor-pointer"
                  title="Fechar (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Main Center Image Display with Navigation Arrows & Touch Swipe */}
              <div className="relative flex-1 flex items-center justify-center my-3 overflow-hidden">
                {lightboxState.images.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setLightboxState(prev => prev ? { ...prev, currentIndex: (prev.currentIndex - 1 + prev.images.length) % prev.images.length } : null)}
                    className="absolute left-2 sm:left-4 z-20 bg-black/60 hover:bg-black/90 text-white p-3 rounded-full border border-white/10 transition cursor-pointer hover:scale-110 shadow-lg"
                    title="Foto anterior"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                )}

                <motion.img
                  key={lightboxState.currentIndex}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  drag={lightboxState.images.length > 1 ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={(e, { offset }) => {
                    if (lightboxState.images.length <= 1) return;
                    if (offset.x < -40) {
                      setLightboxState(prev => prev ? { ...prev, currentIndex: (prev.currentIndex + 1) % prev.images.length } : null);
                    } else if (offset.x > 40) {
                      setLightboxState(prev => prev ? { ...prev, currentIndex: (prev.currentIndex - 1 + prev.images.length) % prev.images.length } : null);
                    }
                  }}
                  src={lightboxState.images[lightboxState.currentIndex]}
                  alt={`Foto ${lightboxState.currentIndex + 1}`}
                  className="max-w-full max-h-[75vh] w-auto h-auto object-contain mx-auto shadow-2xl rounded-xl cursor-grab active:cursor-grabbing touch-pan-y select-none"
                  referrerPolicy="no-referrer"
                />

                {lightboxState.images.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setLightboxState(prev => prev ? { ...prev, currentIndex: (prev.currentIndex + 1) % prev.images.length } : null)}
                    className="absolute right-2 sm:right-4 z-20 bg-black/60 hover:bg-black/90 text-white p-3 rounded-full border border-white/10 transition cursor-pointer hover:scale-110 shadow-lg"
                    title="Próxima foto"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                )}
              </div>

              {/* Bottom Thumbnails Strip */}
              {lightboxState.images.length > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2 border-t border-white/10 overflow-x-auto">
                  {lightboxState.images.map((thumbUrl, tIdx) => (
                    <button
                      key={tIdx}
                      type="button"
                      onClick={() => setLightboxState(prev => prev ? { ...prev, currentIndex: tIdx } : null)}
                      className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition cursor-pointer shrink-0 ${
                        tIdx === lightboxState.currentIndex
                          ? 'border-blue-500 scale-110 opacity-100 ring-2 ring-blue-400/50'
                          : 'border-white/20 opacity-50 hover:opacity-100'
                      }`}
                    >
                      <img src={thumbUrl} alt={`Miniatura ${tIdx+1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Share Post Modal */}
      <AnimatePresence>
        {shareModalPost && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white max-w-lg w-full rounded-2xl smooth-shadow overflow-hidden p-6 space-y-4 relative text-slate-800"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-900">
                  <Share2 className="w-5 h-5 text-blue-600" />
                  <h3 className="font-display font-bold text-base">Compartilhar Publicação</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShareModalPost(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <textarea
                  rows={3}
                  placeholder="Escreva algo sobre este compartilhamento (opcional)..."
                  value={shareComment}
                  onChange={(e) => setShareComment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 text-xs text-slate-800 resize-none"
                />

                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/70 space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <img
                      src={shareModalPost.userAvatar}
                      alt={shareModalPost.username}
                      className="w-6 h-6 rounded-full object-cover border border-slate-200"
                    />
                    <span className="font-bold text-slate-900">@{shareModalPost.username}</span>
                  </div>

                  {shareModalPost.content && (
                    <p className="text-slate-700 text-xs line-clamp-3 leading-relaxed">
                      {shareModalPost.content}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShareModalPost(null)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmShare}
                    disabled={isSubmittingShare}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                  >
                    {isSubmittingShare ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Compartilhando...
                      </>
                    ) : (
                      'Compartilhar no meu perfil'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

