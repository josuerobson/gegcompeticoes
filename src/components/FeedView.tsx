import React, { useState, useEffect, useRef } from 'react';
import { Post, User, Comment, ShootingResult, SharedPostInfo, RankingHighlight } from '../types';
import { MessageCircle, Send, Award, Target, PlusCircle, Bookmark, CheckCircle2, Trophy, Loader2, X, RotateCw, ChevronLeft, ChevronRight, Images, Plus, Maximize2, Share2, Repeat, Trash2, ZoomIn, ZoomOut, RotateCcw, Eye, Medal, Pause, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { shootingImages } from '../data/mockData';
import likeIcon from '@/assets/like_icon.png';
import { compressUploadImage } from '../utils/imageCompressor';

const SHOOTING_CATEGORIES = [
  'Tiro de Precisão',
  'Tiro Rápido',
  'Tiro em Silhueta Metálica',
  'Tiro Defensivo',
  'Tiro Alvo em Movimento',
  'IPSC',
  'Tiro ao Prato'
];

const WEAPON_TYPES = ['Revólver', 'Pistola', 'Carabina', 'Espingarda'];

const SIGHT_TYPES = ['Aberta', 'Red Dot', 'Telescópica'];

interface FeedProps {
  posts: Post[];
  currentUser: User | null;
  users: User[];
  onAddPost: (content: string, imageUrl?: string, targetScore?: ShootingResult, imageUrls?: string[], sharedPost?: SharedPostInfo, isPrivate?: boolean) => Promise<void>;
  onLikePost: (postId: string) => Promise<void>;
  onCommentPost: (postId: string, content: string) => Promise<void>;
  onDeletePost?: (postId: string) => Promise<void>;
  onToggleFollow: (userId: string) => Promise<void>;
  defaultImage?: string;
  onViewProfile: (username: string) => void;
}

function PinchZoomImage({
  src,
  alt,
  onNext,
  onPrev,
  hasMultiple
}: {
  key?: React.Key;
  src: string;
  alt: string;
  onNext?: () => void;
  onPrev?: () => void;
  hasMultiple?: boolean;
}) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const distanceRef = useRef<number | null>(null);
  const startScaleRef = useRef(1);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const lastTapRef = useRef<number>(0);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [src]);

  const handleZoomIn = () => {
    setScale(prev => Math.min(4, Number((prev + 0.5).toFixed(1))));
  };

  const handleZoomOut = () => {
    setScale(prev => {
      const next = Math.max(1, Number((prev - 0.5).toFixed(1)));
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      distanceRef.current = dist;
      startScaleRef.current = scale;
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        if (scale > 1) {
          handleResetZoom();
        } else {
          setScale(2.5);
        }
      }
      lastTapRef.current = now;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && distanceRef.current !== null) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = currentDist / distanceRef.current;
      const newScale = Math.min(4, Math.max(1, startScaleRef.current * factor));
      setScale(newScale);
      if (newScale === 1) setPosition({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && lastTouchRef.current) {
      const touch = e.touches[0];
      const dx = touch.clientX - lastTouchRef.current.x;
      const dy = touch.clientY - lastTouchRef.current.y;
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };

      if (scale > 1) {
        setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) {
      distanceRef.current = null;
    }
    if (e.touches.length === 0) {
      if (scale === 1 && touchStartPosRef.current && lastTouchRef.current && hasMultiple) {
        const deltaX = lastTouchRef.current.x - touchStartPosRef.current.x;
        if (deltaX < -50 && onNext) {
          onNext();
        } else if (deltaX > 50 && onPrev) {
          onPrev();
        }
      }
      lastTouchRef.current = null;
      touchStartPosRef.current = null;
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden select-none">
      <div className="absolute top-2 right-2 sm:right-4 z-30 flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 text-white text-xs shadow-xl">
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={scale <= 1}
          className="hover:text-blue-400 disabled:opacity-30 p-1 cursor-pointer font-bold transition"
          title="Reduzir zoom"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="font-mono text-[11px] font-bold px-1 min-w-[38px] text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          type="button"
          onClick={handleZoomIn}
          disabled={scale >= 4}
          className="hover:text-blue-400 disabled:opacity-30 p-1 cursor-pointer font-bold transition"
          title="Ampliar zoom"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        {scale > 1 && (
          <button
            type="button"
            onClick={handleResetZoom}
            className="hover:text-amber-400 p-1 cursor-pointer font-bold border-l border-white/20 pl-2 text-[10px] uppercase flex items-center gap-1 text-amber-300"
            title="Redefinir tamanho (100%)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            100%
          </button>
        )}
      </div>

      {scale === 1 && (
        <div className="absolute bottom-2 z-20 pointer-events-none bg-black/60 text-white/80 text-[10px] px-3 py-1 rounded-full backdrop-blur-xs font-sans tracking-wide">
          Use a pinça com 2 dedos para ampliar a foto ou toque duplo
        </div>
      )}

      <div
        className="w-full h-full flex items-center justify-center touch-none overflow-hidden cursor-grab active:cursor-grabbing"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={src}
          alt={alt}
          style={{
            transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
            transition: distanceRef.current ? 'none' : 'transform 0.15s ease-out',
            maxHeight: '75vh',
            maxWidth: '100%',
            objectFit: 'contain'
          }}
          className="mx-auto rounded-xl shadow-2xl pointer-events-none select-none"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}

export function PostImageCarousel({
  images,
  onOpenLightbox,
  hasScore,
  defaultImage
}: {
  images: string[];
  onOpenLightbox: (index: number) => void;
  hasScore?: boolean;
  defaultImage?: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (images.length === 0) return null;

  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex(prev => (prev + 1) % images.length);
  };

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="relative bg-slate-950 overflow-hidden select-none group">
      {/* Background Blur for aspect fill */}
      <div
        className="absolute inset-0 bg-cover bg-center blur-2xl opacity-40 scale-110 pointer-events-none"
        style={{ backgroundImage: `url("${images[currentIndex]}")` }}
      />

      {/* Swipeable Motion Image */}
      <div className="relative z-10 flex items-center justify-center min-h-[240px] max-h-[550px] w-full overflow-hidden">
        <motion.img
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          drag={images.length > 1 ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(e, { offset }) => {
            if (images.length <= 1) return;
            if (offset.x < -40) {
              nextImage();
            } else if (offset.x > 40) {
              prevImage();
            }
          }}
          src={images[currentIndex]}
          alt={`Foto ${currentIndex + 1}`}
          loading="lazy"
          onClick={() => onOpenLightbox(currentIndex)}
          className="max-w-full max-h-[550px] w-auto h-auto object-contain mx-auto shadow-md cursor-grab active:cursor-grabbing touch-pan-y"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>

      {/* Touch & Click Navigation Arrows */}
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={prevImage}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-slate-950/70 hover:bg-slate-900 text-white p-2 rounded-full backdrop-blur-md shadow-lg transition opacity-80 sm:opacity-0 group-hover:opacity-100 cursor-pointer"
            title="Foto anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={nextImage}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-slate-950/70 hover:bg-slate-900 text-white p-2 rounded-full backdrop-blur-md shadow-lg transition opacity-80 sm:opacity-0 group-hover:opacity-100 cursor-pointer"
            title="Próxima foto"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Expand Lightbox Button */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onOpenLightbox(currentIndex)}
          className="bg-slate-900/80 hover:bg-slate-900 text-white rounded-full p-2 backdrop-blur-md shadow-lg flex items-center justify-center transition cursor-pointer"
          title="Ampliar imagem"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {hasScore && (
        <div className="absolute top-3 left-3 z-20 bg-blue-600/90 backdrop-blur-md text-white rounded-full p-2 shadow-lg flex items-center justify-center">
          <Target className="w-5 h-5 animate-pulse" />
        </div>
      )}

      {/* Swipe Dots Indicator */}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-xs px-3 py-1.5 rounded-full">
          {images.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                idx === currentIndex ? 'w-5 bg-blue-400' : 'w-2 bg-white/50 hover:bg-white/80'
              }`}
              title={`Foto ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Rotating "ranking em destaque" card: fetches the pool of eligible (championship/stage x
// modality) rankings, shuffles it into a random order on load, and auto-advances through
// it every 5 seconds. Shuffling (instead of just picking one random entry) is what makes
// each page load start the cycle at a different point instead of always repeating the same
// sequence.
function RankingHighlightCard({ currentUser, onViewProfile }: { currentUser: User | null; onViewProfile: (username: string) => void }) {
  const [highlights, setHighlights] = useState<RankingHighlight[]>([]);
  const [order, setOrder] = useState<number[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [commentsByKey, setCommentsByKey] = useState<Record<string, Comment[]>>({});
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');

  useEffect(() => {
    fetch('/api/feed/ranking-highlights', {
      headers: currentUser ? { 'x-user-id': currentUser.id } : {}
    })
      .then(res => res.json())
      .then(data => {
        const list: RankingHighlight[] = data.highlights || [];
        setHighlights(list);
        const shuffled = list.map((_, i) => i);
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        setOrder(shuffled);
        setCurrentIdx(0);
      })
      .catch(() => { setHighlights([]); setOrder([]); });
  }, [currentUser]);

  // Reseta o painel de comentários ao trocar de destaque (rotação ou navegação manual)
  useEffect(() => {
    setShowComments(false);
    setCommentInput('');
  }, [currentIdx]);

  // Registra 1 visualização por destaque por sessão (dedup local via ref)
  const trackedViewsRef = useRef<Set<string>>(new Set());
  const currentHighlightKey = order.length > 0 ? highlights[order[currentIdx]]?.highlightKey : undefined;

  useEffect(() => {
    if (!currentHighlightKey || trackedViewsRef.current.has(currentHighlightKey)) return;
    trackedViewsRef.current.add(currentHighlightKey);
    fetch('/api/ranking-highlights/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ highlightKey: currentHighlightKey })
    })
      .then(res => res.json())
      .then(data => {
        if (typeof data.viewsCount === 'number') {
          setHighlights(prev => prev.map(h => h.highlightKey === currentHighlightKey ? { ...h, viewsCount: data.viewsCount } : h));
        }
      })
      .catch(() => {});
  }, [currentHighlightKey]);

  useEffect(() => {
    if (order.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setCurrentIdx(prev => (prev + 1) % order.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [order.length, isPaused, resetSignal]);

  if (order.length === 0) return null;

  const current = highlights[order[currentIdx]];
  if (!current) return null;

  const medalStyle = (rank: number) => {
    if (rank <= 3) return 'bg-emerald-100 text-emerald-700 border-emerald-300';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  // Navegação manual reinicia o temporizador (via resetSignal) para não
  // "pular de novo" logo em seguida a um clique do usuário.
  const goPrev = () => {
    setCurrentIdx(prev => (prev - 1 + order.length) % order.length);
    setResetSignal(s => s + 1);
  };
  const goNext = () => {
    setCurrentIdx(prev => (prev + 1) % order.length);
    setResetSignal(s => s + 1);
  };

  const updateCurrent = (patch: Partial<RankingHighlight>) => {
    setHighlights(prev => prev.map(h => h.highlightKey === current.highlightKey ? { ...h, ...patch } : h));
  };

  const handleToggleLike = async () => {
    if (!currentUser) { alert('Faça login para curtir.'); return; }
    if (likeBusy) return;
    setLikeBusy(true);
    const wasLiked = current.likedByMe;
    updateCurrent({ likedByMe: !wasLiked, likesCount: current.likesCount + (wasLiked ? -1 : 1) });
    try {
      const res = await fetch('/api/ranking-highlights/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
        body: JSON.stringify({ highlightKey: current.highlightKey })
      });
      const data = await res.json();
      if (res.ok) {
        updateCurrent({ likedByMe: data.liked, likesCount: data.likesCount });
      } else {
        updateCurrent({ likedByMe: wasLiked, likesCount: current.likesCount });
      }
    } catch {
      updateCurrent({ likedByMe: wasLiked, likesCount: current.likesCount });
    } finally {
      setLikeBusy(false);
    }
  };

  const handleToggleComments = async () => {
    const next = !showComments;
    setShowComments(next);
    if (next && !commentsByKey[current.highlightKey]) {
      setLoadingComments(true);
      try {
        const res = await fetch(`/api/ranking-highlights/comments?highlightKey=${encodeURIComponent(current.highlightKey)}`);
        const data = await res.json();
        setCommentsByKey(prev => ({ ...prev, [current.highlightKey]: data.comments || [] }));
      } catch {
        setCommentsByKey(prev => ({ ...prev, [current.highlightKey]: [] }));
      } finally {
        setLoadingComments(false);
      }
    }
  };

  const handleSendComment = async () => {
    if (!currentUser) { alert('Faça login para comentar.'); return; }
    const text = commentInput.trim();
    if (!text || sendingComment) return;
    setSendingComment(true);
    try {
      const res = await fetch('/api/ranking-highlights/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
        body: JSON.stringify({ highlightKey: current.highlightKey, content: text })
      });
      const data = await res.json();
      if (res.ok && data.comment) {
        setCommentsByKey(prev => ({ ...prev, [current.highlightKey]: [...(prev[current.highlightKey] || []), data.comment] }));
        updateCurrent({ commentsCount: current.commentsCount + 1 });
        setCommentInput('');
      }
    } finally {
      setSendingComment(false);
    }
  };

  const handleShare = async () => {
    const podium = current.positions.map(p => `${p.rank}º ${p.fullName} (${p.totalScore} pts)`).join(', ');
    const label = [current.championshipTitle, current.stageTitle, current.modalityName].filter(Boolean).join(' > ');
    const text = `🏆 Ranking em Destaque — ${label}\n${podium}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Ranking em Destaque', text, url: window.location.href });
      } catch {
        // usuário cancelou o share nativo — não é um erro a reportar
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
      setShareFeedback('Copiado!');
      setTimeout(() => setShareFeedback(''), 2000);
    } catch {
      setShareFeedback('Não foi possível copiar.');
      setTimeout(() => setShareFeedback(''), 2000);
    }
  };

  const currentComments = commentsByKey[current.highlightKey] || [];

  return (
    <div className="bg-gradient-to-br from-blue-950 to-slate-900 text-white rounded-xl shadow-sm border border-blue-900/40 p-4 space-y-3 overflow-hidden relative">
      <div className="absolute -right-4 -top-4 opacity-10">
        <Trophy className="w-28 h-28" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-y-2 relative">
        <div className="flex items-center gap-1.5">
          <Medal className="w-4 h-4 text-amber-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Ranking em Destaque</span>
        </div>
        {order.length > 1 && (
          <div className="flex items-center gap-1.5 w-full sm:w-auto justify-center sm:justify-end">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Ranking anterior"
              className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <div className="flex gap-1">
              {order.map((_, i) => (
                <span key={i} className={`h-1.5 rounded-full transition-all ${i === currentIdx ? 'w-4 bg-amber-400' : 'w-1.5 bg-white/25'}`} />
              ))}
            </div>
            <button
              type="button"
              onClick={goNext}
              aria-label="Próximo ranking"
              className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsPaused(p => !p)}
              aria-label={isPaused ? 'Retomar rotação' : 'Pausar rotação'}
              title={isPaused ? 'Retomar rotação automática' : 'Pausar rotação automática'}
              className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer ml-0.5"
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>

      <div className="text-xs text-slate-300 relative">
        <span className="font-semibold text-white">{current.championshipTitle}</span>
        {current.stageTitle && <span> {'>'} {current.stageTitle}</span>}
        <span> {'>'} <span className="text-sky-300 font-semibold">{current.modalityName}</span></span>
      </div>

      <div className="space-y-1.5 relative">
        {current.positions.map(p => (
          <div key={p.rank} className="flex items-center gap-2.5 bg-white/5 rounded-lg p-2">
            <div className={`h-6 px-2 rounded-full border flex items-center justify-center text-[9px] font-bold shrink-0 whitespace-nowrap ${medalStyle(p.rank)}`}>
              {p.rank}º Lugar
            </div>
            <img
              src={p.avatarUrl}
              alt={p.username}
              className="w-7 h-7 rounded-full object-cover border border-white/20 shrink-0"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80";
              }}
            />
            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold block truncate">{p.fullName}</span>
              <span className="text-[10px] text-slate-400">@{p.username}</span>
            </div>
            <span className="text-xs font-bold text-amber-300 font-mono shrink-0">{p.totalScore} pts</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 pt-1 relative border-t border-white/10 mt-1 pt-2.5">
        <button
          type="button"
          onClick={handleToggleLike}
          disabled={likeBusy}
          className="flex items-center gap-1.5 group transition duration-150 cursor-pointer select-none"
          title={current.likedByMe ? 'Descurtir' : 'Curtir'}
        >
          <img
            src={likeIcon}
            alt="Curtir"
            className={`w-5 h-5 object-contain transition-all duration-200 ${
              current.likedByMe
                ? 'scale-110 drop-shadow-md brightness-105'
                : 'opacity-40 grayscale group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-115'
            }`}
          />
          <span className={`text-xs ${current.likedByMe ? 'text-amber-300 font-extrabold' : 'text-white/60 font-semibold'}`}>
            {current.likesCount > 0 ? current.likesCount : ''}
          </span>
        </button>
        <button
          type="button"
          onClick={handleToggleComments}
          className={`flex items-center gap-1.5 text-xs font-semibold transition cursor-pointer ${showComments ? 'text-sky-300' : 'text-white/60 hover:text-white'}`}
        >
          <MessageCircle className="w-4 h-4" />
          {current.commentsCount > 0 && <span>{current.commentsCount}</span>}
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="flex items-center gap-1.5 text-xs font-semibold text-white/60 hover:text-white transition cursor-pointer"
        >
          <Share2 className="w-4 h-4" />
          {shareFeedback && <span className="text-emerald-400">{shareFeedback}</span>}
        </button>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-white/60 select-none ml-auto" title="Visualizações">
          <Eye className="w-4 h-4" />
          <span>{current.viewsCount}</span>
        </div>
      </div>

      {showComments && (
        <div className="relative space-y-2 pt-1">
          {loadingComments ? (
            <p className="text-[11px] text-white/50">Carregando comentários...</p>
          ) : currentComments.length === 0 ? (
            <p className="text-[11px] text-white/50">Nenhum comentário ainda. Seja o primeiro!</p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {currentComments.map(c => (
                <div key={c.id} className="flex gap-1.5 text-xs">
                  <span className="font-bold text-white cursor-pointer hover:underline shrink-0" onClick={() => onViewProfile(c.username)}>@{c.username}:</span>
                  <span className="text-slate-300 break-words">{c.content}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 items-center bg-white/10 rounded-xl px-3 py-1.5">
            <input
              type="text"
              placeholder="Escreva um comentário..."
              value={commentInput}
              onChange={e => setCommentInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendComment()}
              className="flex-1 bg-transparent border-none outline-none text-xs text-white placeholder:text-white/40"
            />
            <button
              type="button"
              onClick={handleSendComment}
              disabled={sendingComment || !commentInput.trim()}
              className="text-sky-300 hover:text-sky-200 disabled:text-white/30 p-1 rounded-lg transition cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FeedView({
  posts,
  currentUser,
  users,
  onAddPost,
  onLikePost,
  onCommentPost,
  onDeletePost,
  onToggleFollow,
  defaultImage,
  onViewProfile
}: FeedProps) {
  // New post state
  const [isPostingOpen, setIsPostingOpen] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [selectedImagePreset, setSelectedImagePreset] = useState<string>(shootingImages.paper_target);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [customImageFile, setCustomImageFile] = useState<File | null>(null);
  const [customImagePreview, setCustomImagePreview] = useState<string>('');
  
  // Include target score info
  const [includeTargetScore, setIncludeTargetScore] = useState(false);
  const [targetHits, setTargetHits] = useState(10);
  const [targetShots, setTargetShots] = useState(10);
  const [targetScore, setTargetScore] = useState(95);
  const [targetDistance, setTargetDistance] = useState(15);
  const [gunModel, setGunModel] = useState('Pistola');
  const [caliber, setCaliber] = useState('9mm');
  const [discipline, setDiscipline] = useState('Tiro de Precisão');
  const [sight, setSight] = useState('Aberta');
  const [executionDate, setExecutionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isPostPrivate, setIsPostPrivate] = useState(false);

  // Multi-image selection state for post creation (max 5)
  const [postImages, setPostImages] = useState<string[]>([]);

  // Fullscreen Lightbox Modal state for expanding post photos
  const [lightboxState, setLightboxState] = useState<{
    images: string[];
    currentIndex: number;
    authorName?: string;
    authorAvatar?: string;
  } | null>(null);

  // Share post state
  const [shareModalPost, setShareModalPost] = useState<Post | null>(null);
  const [shareComment, setShareComment] = useState('');
  const [isSubmittingShare, setIsSubmittingShare] = useState(false);

  const handleConfirmShare = async () => {
    if (!shareModalPost || !currentUser) return;
    setIsSubmittingShare(true);
    try {
      const originalPostInfo: SharedPostInfo = {
        originalPostId: shareModalPost.sharedPost ? shareModalPost.sharedPost.originalPostId : shareModalPost.id,
        originalUserId: shareModalPost.sharedPost ? shareModalPost.sharedPost.originalUserId : shareModalPost.userId,
        originalUsername: shareModalPost.sharedPost ? shareModalPost.sharedPost.originalUsername : shareModalPost.username,
        originalUserAvatar: shareModalPost.sharedPost ? shareModalPost.sharedPost.originalUserAvatar : shareModalPost.userAvatar,
        originalContent: shareModalPost.sharedPost ? shareModalPost.sharedPost.originalContent : shareModalPost.content,
        originalImageUrl: shareModalPost.sharedPost ? shareModalPost.sharedPost.originalImageUrl : shareModalPost.imageUrl,
        originalImageUrls: shareModalPost.sharedPost ? shareModalPost.sharedPost.originalImageUrls : shareModalPost.imageUrls,
        originalTargetScore: shareModalPost.sharedPost ? shareModalPost.sharedPost.originalTargetScore : shareModalPost.targetScore,
        originalCreatedAt: shareModalPost.sharedPost ? shareModalPost.sharedPost.originalCreatedAt : shareModalPost.createdAt
      };

      await onAddPost(shareComment.trim(), undefined, undefined, undefined, originalPostInfo);

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

  // Comment input state
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});
  const [activeCommentDrawer, setActiveCommentDrawer] = useState<string | null>(null);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

  // --- Randomized Feed State & Algorithm ---
  // Prioritizes new posts (last 3 days or top 5 newest), shuffling them randomly among themselves on each load,
  // and shuffles older posts randomly below them.
  const [displayPosts, setDisplayPosts] = useState<Post[]>([]);

  const shuffleArray = <T,>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const buildRandomizedFeed = (allPosts: Post[]): Post[] => {
    if (!allPosts || allPosts.length === 0) return [];

    const now = new Date().getTime();
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

    // 1. Separate into recent posts (created in last 3 days) vs older posts
    const recentPosts = allPosts.filter(p => {
      const postTime = new Date(p.createdAt).getTime();
      return !isNaN(postTime) && (now - postTime) <= THREE_DAYS_MS;
    });

    const olderPosts = allPosts.filter(p => !recentPosts.includes(p));

    // 2. If fewer than 3 posts in the 3-day window, consider top 5 newest posts as "recent"
    if (recentPosts.length < 3 && allPosts.length > 0) {
      const sortedByDate = [...allPosts].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const newest = sortedByDate.slice(0, Math.min(5, allPosts.length));
      const rest = sortedByDate.slice(Math.min(5, allPosts.length));
      return [...shuffleArray(newest), ...shuffleArray(rest)];
    }

    // 3. Shuffle recent posts among themselves, and older posts among themselves
    return [...shuffleArray(recentPosts), ...shuffleArray(olderPosts)];
  };

  // Pagination & Infinite Scroll: Load 3 posts initially, load 3 more on scroll
  const [visibleCount, setVisibleCount] = useState<number>(3);
  const observerTarget = useRef<HTMLDivElement | null>(null);

  // Re-build randomized feed on initial mount or when post count changes
  useEffect(() => {
    setDisplayPosts(buildRandomizedFeed(posts));
    setVisibleCount(3);
  }, [posts.length]);

  // Infinite Scroll Observer: auto-load 3 more posts as user scrolls near bottom
  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev => Math.min(prev + 3, displayPosts.length));
        }
      },
      { threshold: 0.1, rootMargin: '250px' }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [displayPosts.length, visibleCount]);

  // Track views for visible posts (register 1 view per post per session)
  const trackedPostViewsRef = useRef<Set<string>>(new Set());

  const handleTrackPostView = React.useCallback(async (postId: string) => {
    if (!postId || trackedPostViewsRef.current.has(postId)) return;
    trackedPostViewsRef.current.add(postId);

    try {
      const res = await fetch(`/api/posts/${postId}/view`, { method: 'POST' });
      const data = await res.json();
      if (data.success && typeof data.viewsCount === 'number') {
        setDisplayPosts(prev => prev.map(p => p.id === postId ? { ...p, viewsCount: data.viewsCount } : p));
      }
    } catch (e) {
      console.error('Failed to track view for post', postId, e);
    }
  }, []);

  useEffect(() => {
    if (displayPosts.length === 0) return;
    displayPosts.slice(0, visibleCount).forEach(post => {
      handleTrackPostView(post.id);
    });
  }, [displayPosts, visibleCount, handleTrackPostView]);

  // Merge updated likes/comments and newly added posts into displayPosts without breaking order
  useEffect(() => {
    setDisplayPosts(prev => {
      if (prev.length === 0) return buildRandomizedFeed(posts);
      const newItems = posts.filter(p => !prev.some(existing => existing.id === p.id));
      const updated = prev.map(p => posts.find(newP => newP.id === p.id) || p);
      return [...newItems, ...updated];
    });
  }, [posts]);

  const handleManualRefreshFeed = () => {
    setDisplayPosts(buildRandomizedFeed(posts));
    setVisibleCount(3);
  };

  // Personal photo gallery of the logged-in user (strictly photos uploaded/posted by currentUser)
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

  // Suggestions list
  const suggestedUsers = users
    .filter(u => u.id !== currentUser?.id && !currentUser?.following.includes(u.id))
    .slice(0, 4);

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingPost(true);
    try {
      let finalImagesList: string[] | undefined = undefined;

      if (postImages.length > 0) {
        finalImagesList = postImages.slice(0, 5);
      } else if (customImagePreview && customImagePreview !== '') {
        finalImagesList = [customImagePreview];
      } else if (customImageUrl && customImageUrl.trim() !== '') {
        finalImagesList = [customImageUrl.trim()];
      }

      let scoreObj: ShootingResult | undefined;
      
      if (includeTargetScore) {
        scoreObj = {
          hits: Number(targetHits),
          shots: Number(targetShots),
          score: Number(targetScore),
          distance: Number(targetDistance),
          gunModel: gunModel || 'Pistola',
          caliber: caliber || '9mm',
          discipline: discipline || 'Tiro de Precisão',
          sight: sight || 'Aberta',
          executionDate: executionDate || undefined
        };
      }

      if (!postContent.trim() && (!finalImagesList || finalImagesList.length === 0) && !scoreObj) {
        alert('Por favor, escreva uma mensagem ou selecione pelo menos uma imagem para publicar.');
        setIsSubmittingPost(false);
        return;
      }

      await onAddPost(postContent, finalImagesList?.[0], scoreObj, finalImagesList, undefined, includeTargetScore ? isPostPrivate : false);

      // Reset
      setPostContent('');
      setCustomImageUrl('');
      setCustomImagePreview('');
      setCustomImageFile(null);
      setPostImages([]);
      setIncludeTargetScore(false);
      setIsPostPrivate(false);
      setExecutionDate(new Date().toISOString().split('T')[0]);
      setIsPostingOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingPost(false);
    }
  };

  // Closing the "Postar Treino" modal without submitting discards the whole draft,
  // including the homologar toggle/fields — so it never silently leaks into the simple composer.
  const handleCancelPosting = () => {
    setIsPostingOpen(false);
    setIncludeTargetScore(false);
    setIsPostPrivate(false);
    setExecutionDate(new Date().toISOString().split('T')[0]);
  };

  const handleSendComment = async (postId: string) => {
    const text = commentInputs[postId];
    if (!text || !text.trim()) return;

    await onCommentPost(postId, text);
    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 py-6">
      {/* Feed Column */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Story highlights of Club G&G Leaders */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 overflow-x-auto no-scrollbar">
          <div className="flex flex-col items-center flex-shrink-0 cursor-pointer" onClick={() => setIsPostingOpen(true)}>
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 p-[3px] flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                <PlusCircle className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <span className="text-xs text-slate-500 mt-1 font-medium">Postar Treino</span>
          </div>

          {users.map((u) => {
            const hasSpecialTag = u.role === 'admin';
            return (
              <div
                key={u.id}
                className="flex flex-col items-center flex-shrink-0 cursor-pointer"
                onClick={() => onViewProfile(u.username)}
              >
                <div className={`w-16 h-16 rounded-full p-[3px] flex items-center justify-center bg-gradient-to-tr ${hasSpecialTag ? 'from-amber-500 to-red-500' : 'from-blue-600 to-sky-400'}`}>
                  <img
                    src={u.avatarUrl}
                    alt={u.username}
                    className="w-full h-full object-cover rounded-full border-2 border-white"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80";
                    }}
                  />
                </div>
                <span className="text-xs text-slate-600 mt-1 font-medium max-w-[75px] truncate">
                  @{u.username}
                </span>
              </div>
            );
          })}
        </div>

        <RankingHighlightCard currentUser={currentUser} onViewProfile={onViewProfile} />

        {/* Simple fixed post composer (photo/caption only — training homologation happens via the "Postar Treino" modal below) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <h4 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5 mb-3">
            <Images className="w-4 h-4 text-blue-600" />
            Publicar Nova Foto ({postImages.length}/5)
          </h4>

          <form onSubmit={handleSubmitPost} className="space-y-4">
            {/* Content */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase block">O que você está pensando? (opcional)</label>
              <textarea
                rows={2}
                placeholder="Escreva uma legenda... ou deixe em branco se for publicar apenas fotos!"
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-sm text-slate-700"
              />
            </div>

            {/* Multi-Image Gallery Selector (max 5) */}
            <div className="space-y-2.5 border border-slate-200 bg-slate-50/50 p-3.5 rounded-xl">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                  <Images className="w-4 h-4 text-blue-600" />
                  Galeria de Fotos ({postImages.length}/5)
                </label>
                {postImages.length >= 5 ? (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Limite de 5 fotos atingido
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-medium">
                    Até 5 fotos por publicação
                  </span>
                )}
              </div>

              {/* Selected Images Grid Preview */}
              {postImages.length > 0 && (
                <div className="grid grid-cols-5 gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                  {postImages.map((imgUrl, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-300 bg-slate-900 group">
                      <img src={imgUrl} alt={`Foto ${idx+1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPostImages(prev => prev.filter((_, i) => i !== idx))}
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

              {/* Add Images Controls (only if < 5) */}
              {postImages.length < 5 && (
                <div className="space-y-3 pt-1 border-t border-slate-100">
                  {/* File upload or URL */}
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <label className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 shadow-2xs">
                      <Plus className="w-4 h-4" />
                      Enviar do PC
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={async (e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length === 0) return;

                          const remainingSlots = 5 - postImages.length;
                          if (remainingSlots <= 0) {
                            e.target.value = '';
                            return;
                          }

                          const filesToRead = files.slice(0, remainingSlots);

                          const readPromises = filesToRead.map((file: any) => compressUploadImage(file as File, 1200, 0.75));

                          const results = await Promise.all(readPromises);
                          const validResults = results.filter(r => r !== '');

                          setPostImages(prev => {
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

                    <div className="flex-1 flex gap-1.5 w-full">
                      <input
                        type="url"
                        placeholder="Ou colar URL da imagem..."
                        value={customImageUrl}
                        onChange={(e) => setCustomImageUrl(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 outline-none px-3 py-1.5 rounded-xl text-xs text-slate-700 focus:border-blue-500"
                      />
                      {customImageUrl.trim() !== '' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (customImageUrl.trim() && postImages.length < 5) {
                              setPostImages(prev => [...prev, customImageUrl.trim()]);
                              setCustomImageUrl('');
                            }
                          }}
                          className="bg-blue-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition cursor-pointer shrink-0"
                        >
                          Adicionar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSubmittingPost}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-200 transition disabled:opacity-60"
              >
                {isSubmittingPost ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Postando...
                  </>
                ) : (
                  'Publicar'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* "Postar Treino" modal — the only place training/homologação posts are created */}
        <AnimatePresence>
          {isPostingOpen && (
            <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white max-w-xl w-full rounded-2xl smooth-shadow overflow-hidden max-h-[90vh] flex flex-col"
              >
                <div className="bg-blue-900 text-white p-4 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-amber-400" />
                    <span className="font-display font-semibold text-base">Postar Treino</span>
                  </div>
                  <button
                    onClick={handleCancelPosting}
                    className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSubmitPost} className="p-5 space-y-4 overflow-y-auto flex-1">
                  {/* Content */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase block">O que você está pensando? (opcional)</label>
                    <textarea
                      rows={3}
                      placeholder="Escreva uma legenda... ou deixe em branco se for publicar apenas fotos!"
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-sm text-slate-700"
                    />
                  </div>

                  {/* Multi-Image Gallery Selector (max 5) */}
                  <div className="space-y-2.5 border border-slate-200 bg-slate-50/50 p-3.5 rounded-xl">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                        <Images className="w-4 h-4 text-blue-600" />
                        Galeria de Fotos ({postImages.length}/5)
                      </label>
                      {postImages.length >= 5 ? (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          Limite de 5 fotos atingido
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">
                          Até 5 fotos por publicação
                        </span>
                      )}
                    </div>

                    {/* Selected Images Grid Preview */}
                    {postImages.length > 0 && (
                      <div className="grid grid-cols-5 gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                        {postImages.map((imgUrl, idx) => (
                          <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-300 bg-slate-900 group">
                            <img src={imgUrl} alt={`Foto ${idx+1}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setPostImages(prev => prev.filter((_, i) => i !== idx))}
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

                    {/* Add Images Controls (only if < 5) */}
                    {postImages.length < 5 && (
                      <div className="space-y-3 pt-1 border-t border-slate-100">
                        {/* File upload or URL */}
                        <div className="flex flex-col sm:flex-row items-center gap-2">
                          <label className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 shadow-2xs">
                            <Plus className="w-4 h-4" />
                            Enviar do PC
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={async (e) => {
                                const files = Array.from(e.target.files || []);
                                if (files.length === 0) return;

                                const remainingSlots = 5 - postImages.length;
                                if (remainingSlots <= 0) {
                                  e.target.value = '';
                                  return;
                                }

                                const filesToRead = files.slice(0, remainingSlots);

                                const readPromises = filesToRead.map((file: any) => compressUploadImage(file as File, 1200, 0.75));

                                const results = await Promise.all(readPromises);
                                const validResults = results.filter(r => r !== '');

                                setPostImages(prev => {
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

                          <div className="flex-1 flex gap-1.5 w-full">
                            <input
                              type="url"
                              placeholder="Ou colar URL da imagem..."
                              value={customImageUrl}
                              onChange={(e) => setCustomImageUrl(e.target.value)}
                              className="flex-1 bg-white border border-slate-200 outline-none px-3 py-1.5 rounded-xl text-xs text-slate-700 focus:border-blue-500"
                            />
                            {customImageUrl.trim() !== '' && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (customImageUrl.trim() && postImages.length < 5) {
                                    setPostImages(prev => [...prev, customImageUrl.trim()]);
                                    setCustomImageUrl('');
                                  }
                                }}
                                className="bg-blue-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition cursor-pointer shrink-0"
                              >
                                Adicionar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Shooting Result checkbox switch */}
                  <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeTargetScore}
                        onChange={(e) => setIncludeTargetScore(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                      <span className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
                        <Award className="w-4 h-4 text-amber-500" />
                        Homologar Cartão de Tiro neste Post?
                      </span>
                    </label>

                    {includeTargetScore && (
                      <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-200">
                        <div className="col-span-2">
                          <label className="text-[10px] text-slate-500 uppercase block font-semibold mb-1">Categoria</label>
                          <div className="flex flex-wrap gap-1.5">
                            {SHOOTING_CATEGORIES.map((cat) => (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => setDiscipline(cat)}
                                className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition ${discipline === cat ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase block font-semibold mb-0.5">Armamento Utilizado</label>
                          <select
                            value={gunModel}
                            onChange={(e) => setGunModel(e.target.value)}
                            className="w-full bg-white p-2 rounded border border-slate-200"
                          >
                            {WEAPON_TYPES.map((w) => (
                              <option key={w} value={w}>{w}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase block font-semibold mb-0.5">Calibre</label>
                          <input
                            type="text"
                            value={caliber}
                            onChange={(e) => setCaliber(e.target.value)}
                            placeholder="Ex: 9mm, .40, .22, 12GA"
                            className="w-full bg-white p-2 rounded border border-slate-200"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[10px] text-slate-500 uppercase block font-semibold mb-1">Mira</label>
                          <div className="flex flex-wrap gap-1.5">
                            {SIGHT_TYPES.map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setSight(s)}
                                className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition ${sight === s ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase block font-semibold mb-0.5">Data da Execução</label>
                          <input
                            type="date"
                            value={executionDate}
                            onChange={(e) => setExecutionDate(e.target.value)}
                            className="w-full bg-white p-2 rounded border border-slate-200"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase block font-semibold mb-0.5">Distância (Metros)</label>
                          <input
                            type="number"
                            value={targetDistance}
                            onChange={(e) => setTargetDistance(Number(e.target.value))}
                            className="w-full bg-white p-2 rounded border border-slate-200"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase block font-semibold mb-0.5">Total de Tiros</label>
                          <input
                            type="number"
                            value={targetShots}
                            onChange={(e) => setTargetShots(Number(e.target.value))}
                            className="w-full bg-white p-2 rounded border border-slate-200 text-center"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase block font-semibold mb-0.5">Acertos</label>
                          <input
                            type="number"
                            value={targetHits}
                            onChange={(e) => setTargetHits(Number(e.target.value))}
                            className="w-full bg-white p-2 rounded border border-slate-200 text-center"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase block font-semibold mb-0.5">Pontuação Final</label>
                          <input
                            type="number"
                            value={targetScore}
                            onChange={(e) => setTargetScore(Number(e.target.value))}
                            className="w-full bg-white p-2 rounded border border-slate-200 text-center font-bold text-blue-600"
                          />
                        </div>
                        <div className="col-span-2 pt-1">
                          <label className="text-[10px] text-slate-500 uppercase block font-semibold mb-1">Visibilidade da Postagem</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setIsPostPrivate(false)}
                              className={`p-2 rounded-lg border text-[11px] font-bold transition ${!isPostPrivate ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            >
                              Pública
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsPostPrivate(true)}
                              className={`p-2 rounded-lg border text-[11px] font-bold transition ${isPostPrivate ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            >
                              Privada
                            </button>
                          </div>
                          <p className="text-[9px] text-slate-400 mt-1">
                            {isPostPrivate ? 'Somente você poderá ver esta postagem quando estiver logado.' : 'Visível para todos no feed.'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-3">
                    <button
                      type="button"
                      onClick={handleCancelPosting}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-semibold transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingPost}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-md shadow-blue-200 transition"
                    >
                      {isSubmittingPost ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Postando...
                        </>
                      ) : (
                        'Publicar'
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Feed Posts */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Feed Social & Treinos</span>
            <button
              type="button"
              onClick={handleManualRefreshFeed}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Embaralhar e carregar novas publicações"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Atualizar Feed
            </button>
          </div>

          {displayPosts.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200 shadow-sm">
              <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">Nenhuma postagem no feed ainda.</p>
              <p className="text-xs text-slate-400 mt-1">Seja o primeiro a publicar sua preparação esportiva!</p>
            </div>
          ) : (
            displayPosts.map((post) => {
              const isLiked = currentUser ? post.likes.includes(currentUser.id) : false;
              const hasScore = !!post.targetScore;

              return (
                <motion.article
                  id={`post-card-${post.id}`}
                  key={post.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
                >
                  {/* Shared Post Banner Header if post is a shared repost */}
                  {post.sharedPost && (
                    <div className="bg-blue-50/70 border-b border-blue-100 px-4 py-2 flex items-center justify-between text-xs text-slate-700">
                      <div className="flex items-center gap-2">
                        <Repeat className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>
                          <strong className="font-bold text-slate-900 cursor-pointer hover:underline" onClick={() => onViewProfile(post.username)}>@{post.username}</strong>
                          {' '}compartilhou a publicação de{' '}
                          <button
                            type="button"
                            onClick={() => onViewProfile(post.sharedPost!.originalUsername)}
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
                    <div className="flex items-center gap-3 cursor-pointer hover:opacity-85 transition" onClick={() => onViewProfile(post.username)}>
                      <img
                        src={post.userAvatar}
                        alt={post.username}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200"
                        referrerPolicy="no-referrer"
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

                  {/* Multi-Image Touch Swipe Carousel & Lightbox Trigger */}
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
                  <div className="p-4 space-y-4">
                    {post.content && post.content.trim() !== '' && (
                      <p className="text-slate-800 text-[14px] leading-relaxed whitespace-pre-wrap">
                        {post.content}
                      </p>
                    )}

                    {/* Integrated Shooting Result Card */}
                    {hasScore && post.targetScore && (
                      <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white p-4 rounded-xl space-y-3 font-mono relative overflow-hidden ring-1 ring-blue-500/20">
                        {/* Shooting design grid decoration */}
                        <div className="absolute -right-3 -bottom-3 opacity-15">
                          <Target className="w-24 h-24 text-white" />
                        </div>

                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="text-[10px] text-blue-400 uppercase tracking-widest font-bold">RESULTADO DE TREINAMENTO</span>
                            <h4 className="text-sm font-semibold tracking-tight text-slate-100 font-display mt-0.5">{post.targetScore.discipline}</h4>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <div className="bg-blue-600/30 text-blue-300 font-sans border border-blue-500/20 px-2 py-0.5 rounded text-[11px] font-bold whitespace-nowrap">
                              Distância: {post.targetScore.distance}m
                            </div>
                            {post.targetScore.executionDate && (
                              <div className="bg-slate-800/60 text-slate-300 font-sans border border-slate-700/50 px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap">
                                Data: {new Date(post.targetScore.executionDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-slate-800 pt-3">
                          <div className="text-center bg-slate-950/40 p-2 rounded justify-center items-center">
                            <span className="text-[9px] text-slate-400 block uppercase">Tiros</span>
                            <span className="text-lg font-bold text-slate-200">{post.targetScore.shots}</span>
                          </div>
                          <div className="text-center bg-slate-950/40 p-2 rounded justify-center items-center">
                            <span className="text-[9px] text-slate-400 block uppercase">Acertos</span>
                            <span className="text-lg font-bold text-emerald-400">{post.targetScore.hits}</span>
                          </div>
                          <div className="text-center bg-slate-950/40 p-2 rounded justify-center items-center">
                            <span className="text-[9px] text-slate-400 block uppercase">EQUIPAMENTO</span>
                            <span className="text-xs font-semibold block text-slate-200 truncate">{post.targetScore.gunModel}</span>
                            <span className="text-[10px] text-slate-400">{post.targetScore.caliber}{post.targetScore.sight ? ` • Mira ${post.targetScore.sight}` : ''}</span>
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
                            onClick={() => onViewProfile(post.sharedPost!.originalUsername)}
                          >
                            <img
                              src={post.sharedPost.originalUserAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"}
                              alt={post.sharedPost.originalUsername}
                              className="w-7 h-7 rounded-full object-cover border border-slate-200"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <span className="font-semibold text-slate-900 text-xs block">@{post.sharedPost.originalUsername}</span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(post.sharedPost.originalCreatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Original Content */}
                        {post.sharedPost.originalContent && post.sharedPost.originalContent.trim() !== '' && (
                          <p className="px-3.5 text-slate-800 text-xs leading-relaxed whitespace-pre-wrap">
                            {post.sharedPost.originalContent}
                          </p>
                        )}

                        {/* Original Images Gallery */}
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
                                    <img src={img} alt={`Foto original ${idx+1}`} className="w-full h-full object-cover group-hover:scale-105 transition duration-200" referrerPolicy="no-referrer" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition flex items-center justify-center">
                                      <Maximize2 className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition duration-150" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Original Target Score */}
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
                          onClick={() => onLikePost(post.id)}
                          className="flex items-center gap-1.5 group transition duration-150 cursor-pointer select-none"
                          title={isLiked ? 'Descurtir publicação' : 'Curtir publicação'}
                        >
                          <img
                            src={likeIcon}
                            alt="Curtir"
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
                            <span className="font-bold text-slate-800 cursor-pointer hover:underline" onClick={() => onViewProfile(comment.username)}>@{comment.username}:</span>
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

          {/* Infinite Scroll Sentinel & Load More Indicator */}
          {visibleCount < displayPosts.length && (
            <div ref={observerTarget} className="py-8 flex flex-col items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setVisibleCount(prev => Math.min(prev + 3, displayPosts.length))}
                className="bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-300 px-6 py-2.5 rounded-full text-xs font-semibold shadow-xs flex items-center gap-2 transition cursor-pointer"
              >
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                Carregar mais publicações ({displayPosts.length - visibleCount} restantes)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Suggested Follows sidebar */}
      <div className="hidden lg:block space-y-6">
        {currentUser && (
          <div className="bg-white p-5 rounded-2xl smooth-shadow border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.fullName}
                className="w-12 h-12 rounded-full object-cover border border-slate-200"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80";
                }}
              />
              <div className="leading-tight">
                <span className="font-bold text-slate-900 block text-sm">@{currentUser.username}</span>
                <span className="text-xs text-slate-400 block truncate max-w-[140px]">{currentUser.fullName}</span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold font-mono">
                {currentUser.role === 'admin' ? 'ADMIN' : 'ATLETA G&G'}
              </span>
              <span className="text-[10px] text-slate-400 mt-1">
                CR: {currentUser.crNumber || 'Sem CR'}
              </span>
            </div>
          </div>
        )}

        {/* Shoot G&G Advertisements */}
        <div className="bg-gradient-to-tr from-sky-900 to-blue-950 text-white p-5 rounded-2xl smooth-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-10 -mr-4 -mt-4">
            <Trophy className="w-24 h-24 text-white" />
          </div>
          <h4 className="font-display font-bold text-base mb-1.5 text-blue-100">G&G Competições</h4>
          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            Treine em nosso estande certificado, homologue suas pontuações e dispute rankings com os melhores atiradores do país.
          </p>
          <div className="text-[11px] font-mono text-amber-300 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />
            Certificado de filiação oficial ativo
          </div>
        </div>

        {/* Shooter Suggestions */}
        <div className="bg-white p-5 rounded-2xl smooth-shadow border border-slate-100 space-y-4">
          <h4 className="font-bold text-slate-800 text-sm pb-1 border-b border-slate-50">Atletas do Clube</h4>
          {suggestedUsers.length === 0 ? (
            <p className="text-xs text-slate-400">Você já segue todos os atletas recomendados.</p>
          ) : (
            <div className="space-y-3">
              {suggestedUsers.map((su) => (
                <div key={su.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3 cursor-pointer hover:opacity-85 transition" onClick={() => onViewProfile(su.username)}>
                    <img
                      src={su.avatarUrl}
                      alt={su.username}
                      className="w-9 h-9 rounded-full object-cover border border-slate-200"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80";
                      }}
                    />
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">@{su.username}</span>
                      <span className="text-[10px] text-slate-400 block max-w-[100px] truncate">{su.fullName}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onToggleFollow(su.id)}
                    className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white px-3 py-1 rounded-full font-bold transition duration-150"
                  >
                    Seguir
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Expanded Comments Drawer modal */}
      <AnimatePresence>
        {activeCommentDrawer && (
          (() => {
            const commPost = posts.find(p => p.id === activeCommentDrawer);
            if (!commPost) return null;
            return (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-white max-w-lg w-full rounded-2xl smooth-shadow overflow-hidden flex flex-col h-[75vh]"
                >
                  <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                    <span className="font-semibold text-sm">Comentários (@{commPost.username})</span>
                    <button
                      onClick={() => setActiveCommentDrawer(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  
                  {/* Scrollable comments list */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    {commPost.comments.length === 0 ? (
                      <p className="text-slate-400 text-center py-10 text-sm">Nenhum comentário ainda. Inicie a conversa!</p>
                    ) : (
                      commPost.comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3 item-start text-sm">
                          <img
                            src={comment.userAvatar}
                            alt={comment.username}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 mt-0.5 cursor-pointer hover:opacity-85 transition"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80";
                            }}
                            onClick={() => onViewProfile(comment.username)}
                          />
                          <div>
                            <div className="bg-slate-100 rounded-2xl p-3">
                              <span className="font-bold text-slate-800 block text-xs cursor-pointer hover:underline" onClick={() => onViewProfile(comment.username)}>@{comment.username}</span>
                              <span className="text-slate-600 block mt-0.5">{comment.content}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 pl-2">
                              {new Date(comment.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add comment box */}
                  <div className="p-3 border-t border-slate-100 bg-slate-50 flex gap-2">
                    <input
                      type="text"
                      placeholder="Comentar..."
                      value={commentInputs[commPost.id] || ''}
                      onChange={(e) => setCommentInputs(prev => ({ ...prev, [commPost.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendComment(commPost.id)}
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none"
                    />
                    <button
                      onClick={() => handleSendComment(commPost.id)}
                      className="bg-blue-600 text-white px-4 rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
                    >
                      Enviar
                    </button>
                  </div>
                </motion.div>
              </div>
            );
          })()
        )}
      </AnimatePresence>

      {/* Fullscreen Multi-Image Lightbox Modal */}
      <AnimatePresence>
        {lightboxState && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 select-none"
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

            {/* Main Center Image Display with Navigation Arrows */}
            <div className="relative flex-1 flex items-center justify-center my-3 overflow-hidden">
              {/* Left Arrow Button */}
              {lightboxState.images.length > 1 && (
                <button
                  type="button"
                  onClick={() => setLightboxState(prev => prev ? { ...prev, currentIndex: (prev.currentIndex - 1 + prev.images.length) % prev.images.length } : null)}
                  className="absolute left-2 sm:left-4 z-20 bg-black/60 hover:bg-black/90 text-white p-3 rounded-full border border-white/10 transition cursor-pointer hover:scale-110 shadow-lg"
                  title="Foto anterior (Seta esquerda)"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              {/* Enlarged Photo with Pinch-to-Zoom & Touch Navigation */}
              <PinchZoomImage
                key={lightboxState.currentIndex}
                src={lightboxState.images[lightboxState.currentIndex]}
                alt={`Foto ${lightboxState.currentIndex + 1}`}
                hasMultiple={lightboxState.images.length > 1}
                onNext={() => setLightboxState(prev => prev ? { ...prev, currentIndex: (prev.currentIndex + 1) % prev.images.length } : null)}
                onPrev={() => setLightboxState(prev => prev ? { ...prev, currentIndex: (prev.currentIndex - 1 + prev.images.length) % prev.images.length } : null)}
              />

              {/* Right Arrow Button */}
              {lightboxState.images.length > 1 && (
                <button
                  type="button"
                  onClick={() => setLightboxState(prev => prev ? { ...prev, currentIndex: (prev.currentIndex + 1) % prev.images.length } : null)}
                  className="absolute right-2 sm:right-4 z-20 bg-black/60 hover:bg-black/90 text-white p-3 rounded-full border border-white/10 transition cursor-pointer hover:scale-110 shadow-lg"
                  title="Próxima foto (Seta direita)"
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
              className="bg-white max-w-lg w-full rounded-2xl smooth-shadow overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="bg-blue-900 text-white p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-amber-400" />
                  <span className="font-display font-semibold text-base">Compartilhar Publicação</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShareModalPost(null)}
                  className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase block">Adicione um comentário (opcional)</label>
                  <textarea
                    rows={3}
                    placeholder="O que você achou dessa publicação? Escreva algo para seus seguidores..."
                    value={shareComment}
                    onChange={(e) => setShareComment(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-sm text-slate-700"
                  />
                </div>

                {/* Preview of Original Post */}
                <div className="border border-slate-200 bg-slate-50 p-3.5 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <img
                      src={shareModalPost.userAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"}
                      alt={shareModalPost.username}
                      className="w-7 h-7 rounded-full object-cover border border-slate-200"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-800 block">@{shareModalPost.username}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(shareModalPost.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>

                  {shareModalPost.content && (
                    <p className="text-xs text-slate-700 line-clamp-2">{shareModalPost.content}</p>
                  )}

                  {((shareModalPost.imageUrls && shareModalPost.imageUrls.length > 0) || shareModalPost.imageUrl) && (
                    <div className="h-28 rounded-lg overflow-hidden bg-slate-900 relative">
                      <img
                        src={(shareModalPost.imageUrls && shareModalPost.imageUrls[0]) || shareModalPost.imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover opacity-90"
                      />
                      {(shareModalPost.imageUrls?.length || 0) > 1 && (
                        <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
                          +{shareModalPost.imageUrls!.length - 1} fotos
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Modal Buttons */}
                <div className="flex gap-3 pt-2">
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
