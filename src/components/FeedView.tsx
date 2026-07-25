import React, { useState } from 'react';
import { Post, User, Comment, ShootingResult } from '../types';
import { Heart, MessageCircle, Send, Award, Target, PlusCircle, Bookmark, CheckCircle2, Trophy, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { shootingImages } from '../data/mockData';
import likeIcon from '@/assets/like_icon.png';

interface FeedProps {
  posts: Post[];
  currentUser: User | null;
  users: User[];
  onAddPost: (content: string, imageUrl?: string, targetScore?: ShootingResult) => Promise<void>;
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

  // Comment input state
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});
  const [activeCommentDrawer, setActiveCommentDrawer] = useState<string | null>(null);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

  // Suggestions list
  const suggestedUsers = users
    .filter(u => u.id !== currentUser?.id && !currentUser?.following.includes(u.id))
    .slice(0, 4);

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingPost(true);
    try {
      const finalImg = customImagePreview !== '' 
        ? customImagePreview 
        : (customImageUrl.trim() !== '' ? customImageUrl.trim() : selectedImagePreset);
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

      await onAddPost(postContent, finalImg, scoreObj);
      
      // Reset
      setPostContent('');
      setCustomImageUrl('');
      setCustomImagePreview('');
      setCustomImageFile(null);
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
        <div className="space-y-6">
          {posts.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200 shadow-sm">
              <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">Nenhuma postagem no feed ainda.</p>
              <p className="text-xs text-slate-400 mt-1">Seja o primeiro a publicar sua preparação esportiva!</p>
            </div>
          ) : (
            posts.map((post) => {
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

                  {/* Optional Image - 100% Full Uncropped Display */}
                  {post.imageUrl && (
                    <div className="relative bg-slate-950/90 overflow-hidden flex items-center justify-center min-h-[200px] max-h-[650px] w-full">
                      {/* Soft blurred background layer matching the photo */}
                      <div
                        className="absolute inset-0 bg-cover bg-center blur-2xl opacity-40 scale-110 pointer-events-none"
                        style={{ backgroundImage: `url("${post.imageUrl || defaultImage}")` }}
                      />
                      
                      {/* Main Uncropped Image */}
                      <img
                        src={post.imageUrl || defaultImage}
                        alt="Post Asset"
                        className="relative z-10 max-w-full max-h-[650px] w-auto h-auto object-contain mx-auto shadow-md"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          if (defaultImage) e.currentTarget.src = defaultImage;
                        }}
                      />
                      
                      {/* Floating Indicator of Shooting Record */}
                      {hasScore && (
                        <div className="absolute top-3 right-3 z-20 bg-blue-600/90 backdrop-blur-md text-white rounded-full p-2 shadow-lg flex items-center justify-center">
                          <Target className="w-5 h-5 animate-pulse" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Body Content */}
                  <div className="p-4 space-y-4">
                    <p className="text-slate-800 text-[14px] leading-relaxed whitespace-pre-wrap">
                      {post.content}
                    </p>

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
                          className="flex items-center gap-1.5 hover:text-blue-600 transition duration-150 text-sm"
                        >
                          <MessageCircle className="w-5 h-5" />
                          <span className="font-medium">{post.comments.length}</span>
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
                  <label className="text-xs font-bold text-slate-500 uppercase block">O que você está pensando?</label>
                  <textarea
                    rows={3}
                    placeholder="Compartilhe seus treinos, munição, ajustes de mira ou a sensação de seu último disparo..."
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-sm text-slate-700"
                    required
                  />
                </div>

                {/* Preset Image selectors */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase block">Escolha uma foto da galeria do clube</label>
                  <div className="grid grid-cols-5 gap-2">
                    {Object.entries(shootingImages).slice(0, 5).map(([key, url]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setSelectedImagePreset(url);
                          setCustomImageUrl('');
                        }}
                        className={`aspect-square rounded-lg overflow-hidden border-2 relative ${selectedImagePreset === url ? 'border-blue-600 scale-95 ring-2 ring-blue-300' : 'border-transparent'}`}
                      >
                        <img src={url} alt={key} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        {selectedImagePreset === url && (
                          <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="pt-2">
                    <span className="text-[11px] text-slate-450 block text-center font-medium">Ou adicione URL da sua imagem:</span>
                    <input
                      type="url"
                      placeholder="Ex: https://minha-foto-no-clube.jpg"
                      value={customImageUrl}
                      onChange={(e) => {
                        setCustomImageUrl(e.target.value);
                        setSelectedImagePreset('');
                        setCustomImagePreview('');
                        setCustomImageFile(null);
                      }}
                      className="w-full mt-1 bg-slate-50 border border-slate-200 outline-none px-3 py-1.5 rounded-xl text-xs text-slate-600 focus:border-blue-500"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-100 mt-2 flex flex-col gap-2">
                    <span className="text-[11px] text-slate-450 block font-medium">Ou envie uma foto do seu computador:</span>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setCustomImageFile(file);
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setCustomImagePreview(reader.result as string);
                              setSelectedImagePreset('');
                              setCustomImageUrl('');
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                      />
                      {customImagePreview && (
                        <div className="relative w-10 h-10 rounded border border-slate-200 overflow-hidden flex-shrink-0 bg-slate-50">
                          <img src={customImagePreview} alt="Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              setCustomImageFile(null);
                              setCustomImagePreview('');
                            }}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow hover:bg-red-650 flex items-center justify-center cursor-pointer"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
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

    </div>
  );
}
