import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { defaultUsers, defaultChampionships, defaultRegistrations, defaultStageScores, defaultPosts, shootingImages } from './src/data/mockData.js';
import { User, Post, Championship, Registration, StageScore, Comment } from './src/types.js';

const app = express();
const PORT = 3000;
const DB_DIR = path.join(process.cwd(), 'src', 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Ensure database directory exists and file is initialized
function initDB() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      users: defaultUsers,
      championships: defaultChampionships,
      registrations: defaultRegistrations,
      stageScores: defaultStageScores,
      posts: defaultPosts
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    console.log('Database initialized with seed data.');
    return initialData;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading database file, resetting to mock data.', err);
    const initialData = {
      users: defaultUsers,
      championships: defaultChampionships,
      registrations: defaultRegistrations,
      stageScores: defaultStageScores,
      posts: defaultPosts
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    return initialData;
  }
}

// In-memory working database
let dbState = initDB();

function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save database changes to disk:', err);
  }
}

// Middlewares
app.use(express.json());

// Auth middleware - reads client user context from header for stateless simple authentication
app.use((req, res, next) => {
  const userId = req.headers['x-user-id'] as string;
  if (userId) {
    const user = dbState.users.find((u: User) => u.id === userId);
    if (user) {
      (req as any).user = user;
    }
  }
  next();
});

// Helper for authorized routes
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!(req as any).user) {
    return res.status(401).json({ error: 'Acesso não autorizado. Por favor entre com sua conta.' });
  }
  next();
};

const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!(req as any).user || (req as any).user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito para administradores do G&G.' });
  }
  next();
};

// ==========================================
// API ROUTES
// ==========================================

// 1. Session & Auth Endpoints
app.get('/api/auth/me', (req, res) => {
  if ((req as any).user) {
    res.json({ user: (req as any).user });
  } else {
    res.json({ user: null });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Nome de usuário é obrigatório.' });
  }

  const cleanUsername = username.trim().toLowerCase().replace('@', '');
  
  // Find user by clean username
  let user = dbState.users.find((u: User) => u.username.toLowerCase() === cleanUsername);

  if (!user) {
    // Elegant Auto-registration for seamless onboarding!
    const newId = `user_${Date.now()}`;
    user = {
      id: newId,
      email: `${cleanUsername}@clubgegpistol.com.br`,
      username: cleanUsername,
      fullName: username.trim(),
      avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`, // placeholder avatar
      bio: "Novo atleta federado do G&G Competições! Pronto para os desafios nas pistas. 🎯",
      crNumber: `CR-${Math.floor(100000 + Math.random() * 900000)}-DF`,
      isClubMember: true,
      memberSince: new Date().toISOString().split('T')[0],
      role: cleanUsername.includes('admin') || cleanUsername === 'gg' ? 'admin' : 'member',
      followers: [],
      following: ["user_guilherme", "user_gabriel"], // Auto-follow founders
      hasPaidSignature: false,
    };
    dbState.users.push(user);
    // Add follower count to founders
    dbState.users.forEach((u: User) => {
      if (u.id === 'user_guilherme' || u.id === 'user_gabriel') {
        if (!u.followers.includes(newId)) {
          u.followers.push(newId);
        }
      }
    });
    saveDB();
  }

  res.json({ user });
});

// 2. User & Social Feed Follow system
app.get('/api/users', (req, res) => {
  res.json({ users: dbState.users });
});

app.post('/api/users/:id/follow', requireAuth, (req, res) => {
  const targetId = req.params.id;
  const currentUser = (req as any).user as User;

  if (targetId === currentUser.id) {
    return res.status(400).json({ error: 'Você não pode seguir a si mesmo.' });
  }

  const targetUser = dbState.users.find((u: User) => u.id === targetId);
  const me = dbState.users.find((u: User) => u.id === currentUser.id);

  if (!targetUser || !me) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  const isFollowing = me.following.includes(targetId);

  if (isFollowing) {
    // Unfollow
    me.following = me.following.filter(id => id !== targetId);
    targetUser.followers = targetUser.followers.filter(id => id !== currentUser.id);
  } else {
    // Follow
    me.following.push(targetId);
    if (!targetUser.followers.includes(currentUser.id)) {
      targetUser.followers.push(currentUser.id);
    }
  }

  saveDB();
  res.json({ 
    success: true, 
    isFollowing: !isFollowing,
    targetFollowers: targetUser.followers,
    myFollowing: me.following
  });
});

// 3. Instagram Social Feed (Posts, Likes, Comments)
app.get('/api/posts', (req, res) => {
  // Sort posts newest first
  const sortedPosts = [...dbState.posts].sort((a: Post, b: Post) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  res.json({ posts: sortedPosts });
});

app.post('/api/posts', requireAuth, (req, res) => {
  const { content, imageUrl, targetScore } = req.body;
  const currentUser = (req as any).user as User;

  if (!content && !imageUrl && !targetScore) {
    return res.status(400).json({ error: 'Post deve conter texto, imagem ou resultado de tiro.' });
  }

  const newPost: Post = {
    id: `post_${Date.now()}`,
    userId: currentUser.id,
    username: currentUser.username,
    userAvatar: currentUser.avatarUrl,
    content: content || '',
    imageUrl: imageUrl || undefined,
    targetScore: targetScore || undefined,
    likes: [],
    comments: [],
    createdAt: new Date().toISOString()
  };

  dbState.posts.push(newPost);
  saveDB();

  res.status(201).json({ post: newPost });
});

app.post('/api/posts/:id/like', requireAuth, (req, res) => {
  const postId = req.params.id;
  const currentUser = (req as any).user as User;

  const post = dbState.posts.find((p: Post) => p.id === postId);
  if (!post) {
    return res.status(404).json({ error: 'Post não encontrado.' });
  }

  const alreadyLiked = post.likes.includes(currentUser.id);

  if (alreadyLiked) {
    post.likes = post.likes.filter(id => id !== currentUser.id);
  } else {
    post.likes.push(currentUser.id);
  }

  saveDB();
  res.json({ success: true, likes: post.likes, liked: !alreadyLiked });
});

app.post('/api/posts/:id/comment', requireAuth, (req, res) => {
  const postId = req.params.id;
  const { content } = req.body;
  const currentUser = (req as any).user as User;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'O comentário não pode ficar vazio.' });
  }

  const post = dbState.posts.find((p: Post) => p.id === postId);
  if (!post) {
    return res.status(404).json({ error: 'Post não encontrado.' });
  }

  const newComment: Comment = {
    id: `comm_${Date.now()}`,
    userId: currentUser.id,
    username: currentUser.username,
    userAvatar: currentUser.avatarUrl,
    content: content.trim(),
    createdAt: new Date().toISOString()
  };

  post.comments.push(newComment);
  saveDB();

  res.status(201).json({ comment: newComment, comments: post.comments });
});

// 4. Championships, Modalities & Staging
app.get('/api/championships', (req, res) => {
  res.json({ championships: dbState.championships });
});

app.post('/api/championships', requireAdmin, (req, res) => {
  const { title, description, startDate, endDate, registrationFee, modalities, stagesCount } = req.body;

  if (!title || !description || !registrationFee || !modalities || !stagesCount) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios do campeonato.' });
  }

  const newChamp: Championship = {
    id: `champ_${Date.now()}`,
    title,
    description,
    startDate,
    endDate,
    registrationFee: Number(registrationFee),
    modalities: Array.isArray(modalities) ? modalities : [modalities],
    stagesCount: Number(stagesCount),
    currentStage: 1,
    status: 'open',
    bannerUrl: 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=800&auto=format&fit=crop&q=80'
  };

  dbState.championships.push(newChamp);
  saveDB();

  res.status(201).json({ championship: newChamp });
});

app.post('/api/championships/:id/status', requireAdmin, (req, res) => {
  const { status, currentStage } = req.body;
  const champ = dbState.championships.find((c: Championship) => c.id === req.params.id);

  if (!champ) {
    return res.status(404).json({ error: 'Campeonato não encontrado.' });
  }

  if (status) champ.status = status;
  if (currentStage) champ.currentStage = Number(currentStage);

  saveDB();
  res.json({ success: true, championship: champ });
});

// 5. Registration & Payments
app.get('/api/registrations', requireAuth, (req, res) => {
  const currentUser = (req as any).user as User;
  
  // Members see their own registration, admins see all
  if (currentUser.role === 'admin') {
    res.json({ registrations: dbState.registrations });
  } else {
    const filtered = dbState.registrations.filter((r: Registration) => r.userId === currentUser.id);
    res.json({ registrations: filtered });
  }
});

app.post('/api/championships/:id/register', requireAuth, (req, res) => {
  const championshipId = req.params.id;
  const { modality, crNumber, paymentMethod } = req.body;
  const currentUser = (req as any).user as User;

  if (!modality || !crNumber || !paymentMethod) {
    return res.status(400).json({ error: 'Inscrição requer modalidade, CR válido e meio de pagamento.' });
  }

  // Check if already registered
  const alreadyRegistered = dbState.registrations.find(
    (r: Registration) => r.championshipId === championshipId && r.userId === currentUser.id && r.modality === modality
  );

  if (alreadyRegistered) {
    return res.status(400).json({ error: 'Você já possui inscrição ativa nesta modalidade para este campeonato.' });
  }

  const newReg: Registration = {
    id: `reg_${Date.now()}`,
    championshipId,
    userId: currentUser.id,
    modality,
    crNumber,
    paymentMethod,
    paymentStatus: paymentMethod === 'pix' ? 'approved' : 'approved', // Auto approved for responsive demonstration flow!
    registeredAt: new Date().toISOString(),
    approvedAt: new Date().toISOString(),
    txId: `tx_gg_${Math.random().toString(36).substring(2, 12)}`
  };

  dbState.registrations.push(newReg);

  // Update user's CR if it wasn't present
  const me = dbState.users.find((u: User) => u.id === currentUser.id);
  if (me && !me.crNumber) {
    me.crNumber = crNumber;
  }

  saveDB();
  res.status(201).json({ success: true, registration: newReg });
});

// 6. Record Championship Stage Scores (Admin Only)
app.get('/api/scores', (req, res) => {
  res.json({ stageScores: dbState.stageScores });
});

app.post('/api/championships/:id/scores', requireAdmin, (req, res) => {
  const championshipId = req.params.id;
  const { registrationId, stageNum, score, timeSeconds } = req.body;

  if (!registrationId || !stageNum || score === undefined) {
    return res.status(400).json({ error: 'Dados pontuais incompletos.' });
  }

  const reg = dbState.registrations.find((r: Registration) => r.id === registrationId);
  if (!reg) {
    return res.status(404).json({ error: 'Inscrição federativa não localizada.' });
  }

  const shooter = dbState.users.find((u: User) => u.id === reg.userId);
  if (!shooter) {
    return res.status(404).json({ error: 'Atirador de cadastro não localizado.' });
  }

  let hitFactor: number | undefined;
  if (timeSeconds && Number(timeSeconds) > 0) {
    hitFactor = Number((Number(score) / Number(timeSeconds)).toFixed(4));
  }

  // Remove existing score for this stage+registration if exists (override capability)
  dbState.stageScores = dbState.stageScores.filter(
    (s: StageScore) => !(s.championshipId === championshipId && s.registrationId === registrationId && s.stageNum === Number(stageNum))
  );

  const newScore: StageScore = {
    id: `score_${Date.now()}`,
    championshipId,
    registrationId,
    userId: reg.userId,
    shooterName: shooter.fullName,
    modality: reg.modality,
    stageNum: Number(stageNum),
    score: Number(score),
    timeSeconds: timeSeconds ? Number(timeSeconds) : undefined,
    hitFactor,
    createdAt: new Date().toISOString()
  };

  dbState.stageScores.push(newScore);

  // Create automatic social post to showcase this shooter's accomplishment to the feed!
  const hasResultPost = Math.random() > 0.5;
  if (hasResultPost) {
    const newPost: Post = {
      id: `post_result_${Date.now()}`,
      userId: shooter.id,
      username: shooter.username,
      userAvatar: shooter.avatarUrl,
      content: `🎯 Medalha na Etapa ${stageNum} do campeonato! Minha pontuação oficial cadastrada foi de ${score} pontos na G&G Competições. Foco total nas próximas etapas! 💪🔫`,
      imageUrl: defaultChampionships.find(c => c.id === championshipId)?.bannerUrl || shootingImages.paper_target,
      targetScore: {
        hits: Math.floor(score / 10),
        shots: Math.floor(score / 10) + 1,
        score: score,
        distance: reg.modality.includes('10m') ? 10 : (reg.modality.includes('25m') ? 25 : 15),
        gunModel: "Imbel GC MD2 LX",
        caliber: reg.modality.includes('IPSC') ? "380 ACP" : ".22 LR",
        discipline: reg.modality
      },
      likes: [],
      comments: [],
      createdAt: new Date().toISOString()
    };
    dbState.posts.push(newPost);
  }

  saveDB();
  res.status(201).json({ success: true, score: newScore });
});

// 7. Rankings Calculation API
app.get('/api/rankings', (req, res) => {
  const { championshipId, modality } = req.query;

  let scores = dbState.stageScores;

  if (championshipId) {
    scores = scores.filter((s: StageScore) => s.championshipId === championshipId);
  }
  if (modality) {
    scores = scores.filter((s: StageScore) => s.modality === modality);
  }

  // Group scores by User and Modality
  const shooterMap: { [key: string]: { 
    userId: string;
    username: string;
    fullName: string;
    avatarUrl: string;
    modality: string;
    totalScore: number;
    stageScores: { [stageNum: number]: number };
  }} = {};

  scores.forEach((s: StageScore) => {
    const key = `${s.userId}_${s.modality}`;
    const user = dbState.users.find((u: User) => u.id === s.userId);

    if (!shooterMap[key]) {
      shooterMap[key] = {
        userId: s.userId,
        username: user?.username || 'Federado',
        fullName: s.shooterName,
        avatarUrl: user?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        modality: s.modality,
        totalScore: 0,
        stageScores: {}
      };
    }

    // Add stage score
    shooterMap[key].stageScores[s.stageNum] = s.score;
  });

  // Calculate sum of stage scores
  const results = Object.values(shooterMap).map(item => {
    const vals = Object.values(item.stageScores);
    const sum = vals.reduce((a, b) => a + b, 0);
    return {
      ...item,
      totalScore: Number(sum.toFixed(2))
    };
  });

  // Sort by totalScore desc
  const sorted = results.sort((a, b) => b.totalScore - a.totalScore);

  res.json({ rankings: sorted });
});

// 8. Sign / Affiliation fee payment simulation
app.post('/api/users/signature', requireAuth, (req, res) => {
  const currentUser = (req as any).user as User;
  const me = dbState.users.find((u: User) => u.id === currentUser.id);

  if (me) {
    me.hasPaidSignature = true;
    const expDate = new Date();
    expDate.setFullYear(expDate.getFullYear() + 1); // 1 year expiry
    me.signatureExpiry = expDate.toISOString().split('T')[0];
    saveDB();
    res.json({ success: true, user: me });
  } else {
    res.status(404).json({ error: 'Atleta não encontrado.' });
  }
});

// ==========================================
// VITE DEV SERVER AND PRODUCTION ASSET HANDLERS
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    // Mount Vite asset development server
    app.use(vite.middlewares);
    console.log('Vite middleware mounted in development mode.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Serving production static assets.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`G&G Competições Social Club Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
