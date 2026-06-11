import React, { useState } from 'react';
import { User, Post, Registration, StageScore } from '../types';
import { ShieldCheck, HelpCircle, Activity, Award, Grid, Target, CheckCircle2, DollarSign, Calendar, CreditCard, Copy, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MemberProfileProps {
  currentUser: User | null;
  selectedUser: User;
  posts: Post[];
  registrations: Registration[];
  stageScores: StageScore[];
  onToggleFollow: (userId: string) => Promise<void>;
  onPaySignature: () => Promise<void>;
  onLogout: () => void;
}

export default function MemberProfile({
  currentUser,
  selectedUser,
  posts,
  registrations,
  stageScores,
  onToggleFollow,
  onPaySignature,
  onLogout
}: MemberProfileProps) {
  const [profileTab, setProfileTab] = useState<'posts' | 'targets' | 'safety'>('posts');
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [payingSign, setPayingSign] = useState(false);
  const [paidSignDone, setPaidSignDone] = useState(false);
  const [selectedExpandPost, setSelectedExpandPost] = useState<Post | null>(null);

  const isMe = currentUser?.id === selectedUser.id;
  const isFollowing = currentUser?.following.includes(selectedUser.id) || false;

  // Filter posts created by this selected user
  const userPosts = posts.filter(p => p.userId === selectedUser.id);
  const userTargetPosts = userPosts.filter(p => !!p.targetScore);

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

  return (
    <div className="py-6 space-y-6">
      
      {/* Top Banner mock decoration */}
      <div className="h-32 bg-gradient-to-r from-blue-900 via-blue-950 to-slate-900 rounded-2xl relative overflow-hidden flex items-end p-4">
        {/* Floating details inside banner */}
        <div className="absolute right-4 top-4 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-white font-mono uppercase font-bold tracking-wider">
          G&G FILIADO nº {selectedUser.isClubMember ? '918' : 'MOD'}
        </div>
      </div>

      {/* Main layout container */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        
        {/* Left Column: Profile Card & Military Credentials */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col items-center text-center relative mt-[-64px]">
            {/* Avatar positioning */}
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

            {/* Profile Counts Row */}
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
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-50"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    Anuidade
                  </button>
                  <button
                    onClick={onLogout}
                    className="text-red-600 hover:bg-red-50 hover:text-red-800 border border-red-100 p-2.5 rounded-xl transition flex items-center justify-center cursor-pointer"
                    title="Sair da Conta"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onToggleFollow(selectedUser.id)}
                  className={`w-full text-xs py-2.5 rounded-xl font-bold transition duration-200 ${isFollowing ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-50'}`}
                >
                  {isFollowing ? 'Seguindo' : 'Seguir Atleta'}
                </button>
              )}
            </div>

          </div>

          {/* Affiliation signature status Card */}
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
                className="w-full bg-amber-500 hover:bg-amber-600 text-white text-xs py-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-100"
              >
                Regularizar Anuidade de Atleta
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Dynamic Instagram Grid Media tabs */}
        <div className="space-y-6 md:col-span-2">
          
          {/* Profile tab header selectors */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setProfileTab('posts')}
              className={`pb-3 text-xs font-semibold tracking-wider uppercase border-b-2 transition duration-150 flex items-center gap-1 px-4 ${profileTab === 'posts' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              <Grid className="w-4 h-4" />
              Fotos Publicadas
            </button>
            <button
              onClick={() => setProfileTab('targets')}
              className={`pb-3 text-xs font-semibold tracking-wider uppercase border-b-2 transition duration-150 flex items-center gap-1 px-4 ${profileTab === 'targets' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              <Target className="w-4 h-4" />
              Alvos Homologados
            </button>
            <button
              onClick={() => setProfileTab('safety')}
              className={`pb-3 text-xs font-semibold tracking-wider uppercase border-b-2 transition duration-150 flex items-center gap-1 px-4 ${profileTab === 'safety' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              <Activity className="w-4 h-4" />
              Estatísticas Tiro
            </button>
          </div>

          {profileTab === 'posts' && (
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
                    {/* Hover detail */}
                    <div className="absolute inset-0 bg-blue-900/40 opacity-0 group-hover:opacity-100 transition duration-150 flex items-center justify-center gap-4 text-white text-xs font-bold font-mono">
                      <span>❤ {post.likes.length}</span>
                      <span>💬 {post.comments.length}</span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}

          {profileTab === 'targets' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {userTargetPosts.length === 0 ? (
                <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-2xl smooth-shadow border border-slate-100">
                  <Target className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                  <p className="font-medium text-sm">Nenhum cartão de tiro homologado ainda.</p>
                </div>
              ) : (
                userTargetPosts.map((post) => {
                  if (!post.targetScore) return null;
                  return (
                    <div
                      key={post.id}
                      onClick={() => setSelectedExpandPost(post)}
                      className="bg-white rounded-2xl smooth-shadow border border-slate-100 overflow-hidden cursor-pointer hover:border-blue-400 transition flex flex-col justify-between"
                    >
                      <div className="aspect-video bg-slate-50 relative">
                        <img
                          src={post.imageUrl}
                          alt="Target record"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      
                      <div className="p-4 bg-slate-900 text-white font-mono text-xs space-y-2">
                        <div className="flex justify-between font-bold">
                          <span className="text-[10px] text-blue-300 uppercase tracking-widest">{post.targetScore.discipline}</span>
                          <span className="text-amber-400">{post.targetScore.score} pts</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-300 pt-1 border-t border-slate-800">
                          <span>Arma: {post.targetScore.gunModel}</span>
                          <span>Alvo: {post.targetScore.distance}m</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {profileTab === 'safety' && (
            <div className="bg-white rounded-2xl smooth-shadow border border-slate-100 p-6 space-y-6">
              <h4 className="font-display font-bold text-slate-800 text-sm uppercase">Relatório de Rendimento Tático</h4>
              
              <div className="grid grid-cols-3 gap-4 font-mono">
                <div className="bg-slate-50 p-4 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 block uppercase font-sans">Total Disparos</span>
                  <span className="text-xl font-bold text-slate-800 mt-1 block">
                    {userTargetPosts.reduce((acc, p) => acc + (p.targetScore?.shots || 0), 0)}
                  </span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 block uppercase font-sans">Média Alvos (pts)</span>
                  <span className="text-xl font-bold text-blue-600 mt-1 block">
                    {userTargetPosts.length > 0
                      ? (userTargetPosts.reduce((acc, p) => acc + (p.targetScore?.score || 0), 0) / userTargetPosts.length).toFixed(1)
                      : '0.0'}
                  </span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 block uppercase font-sans">Precisão Média</span>
                  <span className="text-xl font-bold text-emerald-600 mt-1 block">
                    {userTargetPosts.length > 0
                      ? ((userTargetPosts.reduce((acc, p) => acc + (p.targetScore?.hits || 0), 0) / userTargetPosts.reduce((acc, p) => acc + (p.targetScore?.shots || 0), 1)) * 100).toFixed(0) + '%'
                      : '0%'}
                  </span>
                </div>
              </div>

              {/* Training Tips block */}
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl space-y-2">
                <span className="text-[10px] text-blue-800 font-bold block uppercase tracking-wider">RECOMENDAÇÃO DO INSTRUTOR G&G</span>
                <p className="text-xs text-slate-600 leading-relaxed font-sans">
                  Suas séries demonstram excelente consistência de grip e empunhadura no calibre {selectedUser.crNumber?.includes('DF') ? '9mm' : '.380'}. Sugerimos praticar o 'Trigger Reset' suave a seco 15 minutos diários para otimizar disparos rápidos dinâmicos de IPSC.
                </p>
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
              {/* Left post img */}
              <div className="sm:w-1/2 bg-slate-900 flex items-center justify-center">
                <img
                  src={selectedExpandPost.imageUrl || "https://picsum.photos/seed/shoot/600/600"}
                  alt="Expanded target"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Right post comments thread */}
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
                  className="mt-6 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition"
                >
                  Fechar Visualização
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RE-MEMBERSHIP SIGNATURE REGISTRATION PORTAL MODAL */}
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
                <button onClick={() => setIsSignModalOpen(false)} className="text-white/70 hover:text-white">✕</button>
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

                  {/* PIX copy area */}
                  <div className="bg-slate-50 p-3 rounded-lg space-y-2 font-mono">
                    <span className="text-[9px] text-slate-400 block uppercase font-bold text-center">PIX CNPJ DE AFILIAÇÃO</span>
                    <div className="bg-white p-2 text-center rounded border border-slate-200 truncate">
                      anuidade.gegpistol.online.producao445582
                    </div>
                  </div>

                  <div className="flex gap-3 pt-3">
                    <button
                      onClick={() => setIsSignModalOpen(false)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-semibold transition"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handlePaySignatureSubmit}
                      disabled={payingSign}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold shadow-md shadow-blue-150 transition flex items-center justify-center gap-2"
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

    </div>
  );
}
