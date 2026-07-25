import React, { useState, useEffect } from 'react';
import { Post, User, Comment, ShootingResult, SharedPostInfo } from '../types';
import { Heart, MessageCircle, Send, Award, Target, PlusCircle, Bookmark, CheckCircle2, Trophy, Loader2, X, RotateCw, ChevronLeft, ChevronRight, Images, Plus, Maximize2, Share2, Repeat } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { shootingImages } from '../data/mockData';
import likeIcon from '@/assets/like_icon.png';

interface FeedProps {
  posts: Post[];
  currentUser: User | null;
  users: User[];
  onAddPost: (content: string, imageUrl?: string, targetScore?: ShootingResult, imageUrls?: string[], sharedPost?: SharedPostInfo) => Promise<void>;
  onLikePost: (postId: string) => Promise<void>;
  onCommentPost: (postId: string, content: string) => Promise<void>;
  onToggleFollow: (userId: string) => Promise<void>;
  defaultImage?: string;
  onViewProfile: (username: string) => void;
}

export default function FeedView({
  posts,
  currentUser,
  users,
  onAddPost,
  onLikePost,
  onCommentPost,
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
  const [gunModel, setGunModel] = useState('Glock 17 Gen 5');
  const [caliber, setCaliber] = useState('9mm');
  const [discipline, setDiscipline] = useState('IPSC Handgun');

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

  // Re-build randomized feed on initial mount or when post count changes
  useEffect(() => {
    setDisplayPosts(buildRandomizedFeed(posts));
  }, [posts.length]);

  // Merge updated likes/comments into displayPosts without breaking the randomized order
  useEffect(() => {
    setDisplayPosts(prev => {
      if (prev.length === 0) return buildRandomizedFeed(posts);
      return prev.map(p => posts.find(newP => newP.id === p.id) || p);
    });
  }, [posts]);

  const handleManualRefreshFeed = () => {
    setDisplayPosts(buildRandomizedFeed(posts));
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
      const singleFallbackImg = customImagePreview !== '' 
        ? customImagePreview 
        : (customImageUrl.trim() !== '' ? customImageUrl.trim() : selectedImagePreset);
      
      const finalImagesList = postImages.length > 0
        ? postImages.slice(0, 5)
        : (singleFallbackImg ? [singleFallbackImg] : undefined);

      let scoreObj: ShootingResult | undefined;
      
      if (includeTargetScore) {
        scoreObj = {
          hits: Number(targetHits),
          shots: Number(targetShots),
          score: Number(targetScore),
          distance: Number(targetDistance),
          gunModel: gunModel || 'Pistola Esportiva',
          caliber: caliber || '9mm',
          discipline: discipline || 'Tiro de Precisão'
        };
      }

      if (!postContent.trim() && (!finalImagesList || finalImagesList.length === 0) && !scoreObj) {
        alert('Por favor, escreva uma mensagem ou selecione pelo menos uma imagem para publicar.');
        setIsSubmittingPost(false);
        return;
      }

      await onAddPost(postContent, finalImagesList?.[0], scoreObj, finalImagesList);
      
      // Reset
      setPostContent('');
      setCustomImageUrl('');
      setCustomImagePreview('');
      setCustomImageFile(null);
      setPostImages([]);
      setIncludeTargetScore(false);
      setIsPostingOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingPost(false);
    }
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
              <div key={u.id} className="flex flex-col items-center flex-shrink-0">
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

        {/* Quick Post trigger */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
          <img
            src={currentUser?.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"}
            alt="My Avatar"
            className="w-10 h-10 rounded-full object-cover border border-slate-200"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80";
            }}
          />
          <button
            onClick={() => setIsPostingOpen(true)}
            className="flex-1 bg-slate-50 hover:bg-slate-100 text-left text-slate-500 px-4 py-3 rounded-xl transition duration-150 text-sm cursor-pointer"
          >
            Olá {currentUser?.fullName}, registrou sua pontuação de treino ou postou algo hoje? Compartilhe com o clube...
          </button>
        </div>

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
                  </div>

                  {/* Multi-Image Gallery Grid & Lightbox Trigger */}
                  {(() => {
                    const imagesList = post.imageUrls && post.imageUrls.length > 0
                      ? post.imageUrls
                      : (post.imageUrl ? [post.imageUrl] : []);

                    if (imagesList.length === 0) return null;

                    const openLightbox = (idx: number) => {
                      setLightboxState({
                        images: imagesList,
                        currentIndex: idx,
                        authorName: post.username,
                        authorAvatar: post.userAvatar
                      });
                    };

                    // 1 Photo Layout
                    if (imagesList.length === 1) {
                      return (
                        <div
                          onClick={() => openLightbox(0)}
                          className="relative bg-slate-950/90 overflow-hidden flex items-center justify-center min-h-[200px] max-h-[600px] w-full cursor-pointer group select-none"
                        >
                          <div
                            className="absolute inset-0 bg-cover bg-center blur-2xl opacity-40 scale-110 pointer-events-none"
                            style={{ backgroundImage: `url("${imagesList[0]}")` }}
                          />
                          <img
                            src={imagesList[0]}
                            alt="Post Asset"
                            className="relative z-10 max-w-full max-h-[600px] w-auto h-auto object-contain mx-auto shadow-md group-hover:scale-[1.01] transition duration-200"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              if (defaultImage) e.currentTarget.src = defaultImage;
                            }}
                          />
                          <div className="absolute top-3 right-3 z-20 bg-slate-900/70 hover:bg-slate-900 text-white rounded-full p-2 backdrop-blur-md shadow-lg flex items-center justify-center transition">
                            <Maximize2 className="w-4 h-4" />
                          </div>
                          {hasScore && (
                            <div className="absolute top-3 left-3 z-20 bg-blue-600/90 backdrop-blur-md text-white rounded-full p-2 shadow-lg flex items-center justify-center">
                              <Target className="w-5 h-5 animate-pulse" />
                            </div>
                          )}
                        </div>
                      );
                    }

                    // 2 Photos Layout
                    if (imagesList.length === 2) {
                      return (
                        <div className="grid grid-cols-2 gap-1 bg-slate-950 overflow-hidden max-h-[420px] relative select-none">
                          {imagesList.slice(0, 2).map((img, idx) => (
                            <div
                              key={idx}
                              onClick={() => openLightbox(idx)}
                              className="relative aspect-[4/3] sm:aspect-square overflow-hidden cursor-pointer group bg-slate-900"
                            >
                              <img src={img} alt={`Foto ${idx+1}`} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" referrerPolicy="no-referrer" />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition flex items-center justify-center">
                                <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition duration-200 drop-shadow-md" />
                              </div>
                              <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full font-mono">
                                #{idx+1}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }

                    // 3 Photos Layout
                    if (imagesList.length === 3) {
                      return (
                        <div className="grid grid-cols-3 gap-1 bg-slate-950 overflow-hidden max-h-[420px] relative select-none">
                          <div
                            onClick={() => openLightbox(0)}
                            className="col-span-2 relative h-full min-h-[220px] overflow-hidden cursor-pointer group bg-slate-900"
                          >
                            <img src={imagesList[0]} alt="Foto 1" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" referrerPolicy="no-referrer" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition flex items-center justify-center">
                              <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition duration-200 drop-shadow-md" />
                            </div>
                            <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full font-mono">
                              #1
                            </span>
                          </div>
                          <div className="flex flex-col gap-1 h-full min-h-[220px]">
                            {imagesList.slice(1, 3).map((img, idx) => (
                              <div
                                key={idx}
                                onClick={() => openLightbox(idx + 1)}
                                className="relative h-1/2 overflow-hidden cursor-pointer group bg-slate-900"
                              >
                                <img src={img} alt={`Foto ${idx+2}`} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" referrerPolicy="no-referrer" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition flex items-center justify-center">
                                  <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition duration-200 drop-shadow-md" />
                                </div>
                                <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full font-mono">
                                  #{idx+2}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    // 4 Photos Layout
                    if (imagesList.length === 4) {
                      return (
                        <div className="grid grid-cols-2 gap-1 bg-slate-950 overflow-hidden max-h-[440px] relative select-none">
                          {imagesList.slice(0, 4).map((img, idx) => (
                            <div
                              key={idx}
                              onClick={() => openLightbox(idx)}
                              className="relative aspect-[4/3] overflow-hidden cursor-pointer group bg-slate-900"
                            >
                              <img src={img} alt={`Foto ${idx+1}`} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" referrerPolicy="no-referrer" />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition flex items-center justify-center">
                                <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition duration-200 drop-shadow-md" />
                              </div>
                              <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full font-mono">
                                #{idx+1}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }

                    // 5+ Photos Layout (2 top row + 3 bottom row)
                    return (
                      <div className="flex flex-col gap-1 bg-slate-950 overflow-hidden max-h-[460px] relative select-none">
                        <div className="grid grid-cols-2 gap-1 h-[220px]">
                          {imagesList.slice(0, 2).map((img, idx) => (
                            <div
                              key={idx}
                              onClick={() => openLightbox(idx)}
                              className="relative h-full overflow-hidden cursor-pointer group bg-slate-900"
                            >
                              <img src={img} alt={`Foto ${idx+1}`} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" referrerPolicy="no-referrer" />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition flex items-center justify-center">
                                <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition duration-200 drop-shadow-md" />
                              </div>
                              <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full font-mono">
                                #{idx+1}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-3 gap-1 h-[200px]">
                          {imagesList.slice(2, 5).map((img, idx) => (
                            <div
                              key={idx}
                              onClick={() => openLightbox(idx + 2)}
                              className="relative h-full overflow-hidden cursor-pointer group bg-slate-900"
                            >
                              <img src={img} alt={`Foto ${idx+3}`} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" referrerPolicy="no-referrer" />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition flex items-center justify-center">
                                <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition duration-200 drop-shadow-md" />
                              </div>
                              <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full font-mono">
                                #{idx+3}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
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
                          <Share2 className="w-4 h-4" />
                          <span className="font-semibold text-xs">
                            {post.sharesCount && post.sharesCount > 0 ? post.sharesCount : 'Compartilhar'}
                          </span>
                        </button>
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
        </div>
      </div>

      {/* Suggested Follows sidebar */}
      <div className="hidden lg:block space-y-6">
        
        {/* User Card info brief */}
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

      {/* Posting Modal */}
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
                  <span className="font-display font-semibold text-base">Nova Postagem - G&G Club</span>
                </div>
                <button
                  onClick={() => setIsPostingOpen(false)}
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
                    <div className="space-y-3 pt-1">
                      {/* User's Personal Photo Gallery (only photos uploaded/posted by currentUser) */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                          <span>Sua Galeria Pessoal (fotos enviadas por você):</span>
                          {myUserPhotos.length > 0 && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              {myUserPhotos.length} {myUserPhotos.length === 1 ? 'foto salva' : 'fotos salvas'}
                            </span>
                          )}
                        </div>

                        {myUserPhotos.length === 0 ? (
                          <div className="bg-white p-3 rounded-xl border border-dashed border-slate-250 text-center">
                            <p className="text-xs text-slate-600 font-semibold mb-0.5">Sua galeria pessoal está vazia</p>
                            <p className="text-[10px] text-slate-400">
                              Envie fotos do seu computador ou informe a URL abaixo para publicar e salvar na sua conta!
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-5 gap-1.5 max-h-[140px] overflow-y-auto p-1 bg-white rounded-xl border border-slate-200 shadow-2xs">
                            {myUserPhotos.map((url, idx) => {
                              const isAdded = postImages.includes(url);
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  disabled={isAdded}
                                  onClick={() => {
                                    if (!isAdded && postImages.length < 5) {
                                      setPostImages(prev => [...prev, url]);
                                    }
                                  }}
                                  className={`aspect-square rounded-lg overflow-hidden border-2 relative transition cursor-pointer ${
                                    isAdded
                                      ? 'opacity-40 border-slate-300 cursor-not-allowed scale-95'
                                      : 'border-slate-200 hover:border-blue-500 hover:scale-105'
                                  }`}
                                  title={isAdded ? 'Foto já adicionada' : 'Adicionar à publicação'}
                                >
                                  <img src={url} alt={`Minha foto ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  {isAdded && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                      <CheckCircle2 className="w-4 h-4 text-white" />
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* File upload or URL */}
                      <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row items-center gap-2">
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

                              const readPromises = filesToRead.map(file => {
                                return new Promise<string>((resolve) => {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    if (reader.result) {
                                      resolve(reader.result as string);
                                    } else {
                                      resolve('');
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                });
                              });

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
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase block font-semibold mb-0.5">Disciplina / Modalidade</label>
                        <select
                          value={discipline}
                          onChange={(e) => setDiscipline(e.target.value)}
                          className="w-full bg-white p-2 rounded border border-slate-200"
                        >
                          <option value="IPSC Handgun">IPSC Handgun</option>
                          <option value="Trap Americano 12GA">Trap Americano 12GA</option>
                          <option value="Carabina Mira Aberta 10m">Carabina Mira Aberta 10m</option>
                          <option value="Pistola de Precisão 25m">Pistola de Precisão 25m</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase block font-semibold mb-0.5">Armamento Utilizado</label>
                        <input
                          type="text"
                          value={gunModel}
                          onChange={(e) => setGunModel(e.target.value)}
                          placeholder="Ex: Imbel .40, Glock 17"
                          className="w-full bg-white p-2 rounded border border-slate-200"
                        />
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
                        <label className="text-[10px] text-slate-500 uppercase block font-semibold mb-0.5">Disparos (Acertos / Total)</label>
                        <div className="flex gap-1 items-center">
                          <input
                            type="number"
                            value={targetHits}
                            onChange={(e) => setTargetHits(Number(e.target.value))}
                            className="bg-white p-2 rounded border border-slate-200 w-1/2 text-center"
                          />
                          <span>/</span>
                          <input
                            type="number"
                            value={targetShots}
                            onChange={(e) => setTargetShots(Number(e.target.value))}
                            className="bg-white p-2 rounded border border-slate-200 w-1/2 text-center"
                          />
                        </div>
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
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsPostingOpen(false)}
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
                      'Publicar Post'
                    )}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

              {/* Enlarged Photo */}
              <motion.img
                key={lightboxState.currentIndex}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                src={lightboxState.images[lightboxState.currentIndex]}
                alt={`Foto ${lightboxState.currentIndex + 1}`}
                className="max-w-full max-h-[75vh] w-auto h-auto object-contain mx-auto shadow-2xl rounded-xl"
                referrerPolicy="no-referrer"
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
