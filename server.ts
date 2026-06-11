import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { defaultChampionships, shootingImages } from './src/data/mockData.js';
import { User, Post, Championship, Registration, StageScore, Comment } from './src/types.js';
import { pool, initDB } from './src/db.js';

const app = express();
const PORT = 3000;

// Mapping functions to convert PostgreSQL row format to client/React expected format
function mapUser(u: any): User {
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    fullName: u.full_name,
    avatarUrl: u.avatar_url,
    bio: u.bio,
    crNumber: u.cr_number || undefined,
    isClubMember: u.is_club_member,
    memberSince: u.member_since || undefined,
    role: u.role as 'admin' | 'member',
    followers: u.followers || [],
    following: u.following || [],
    hasPaidSignature: u.has_paid_signature,
    signatureExpiry: u.signature_expiry || undefined,
  };
}

function mapChampionship(c: any): Championship {
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    startDate: c.start_date,
    endDate: c.end_date,
    registrationFee: Number(c.registration_fee),
    modalities: c.modalities,
    stagesCount: c.stages_count,
    currentStage: c.current_stage,
    status: c.status as 'draft' | 'open' | 'completed',
    bannerUrl: c.banner_url,
  };
}

function mapRegistration(r: any): Registration {
  return {
    id: r.id,
    championshipId: r.championship_id,
    userId: r.user_id,
    modality: r.modality,
    crNumber: r.cr_number,
    paymentMethod: r.payment_method as 'pix' | 'credit_card',
    paymentStatus: r.payment_status as 'pending' | 'approved',
    registeredAt: r.registered_at,
    approvedAt: r.approved_at || undefined,
    txId: r.tx_id || undefined,
  };
}

function mapStageScore(s: any): StageScore {
  return {
    id: s.id,
    championshipId: s.championship_id,
    registrationId: s.registration_id,
    userId: s.user_id,
    shooterName: s.shooter_name,
    modality: s.modality,
    stageNum: s.stage_num,
    score: Number(s.score),
    timeSeconds: s.time_seconds !== null && s.time_seconds !== undefined ? Number(s.time_seconds) : undefined,
    hitFactor: s.hit_factor !== null && s.hit_factor !== undefined ? Number(s.hit_factor) : undefined,
    createdAt: s.created_at,
  };
}

function mapPost(p: any): Post {
  return {
    id: p.id,
    userId: p.user_id,
    username: p.username,
    userAvatar: p.user_avatar,
    content: p.content,
    imageUrl: p.image_url || undefined,
    targetScore: p.target_score || undefined,
    likes: p.likes || [],
    comments: (p.comments || []).map((c: any) => ({
      id: c.id,
      userId: c.userId || c.user_id,
      username: c.username,
      userAvatar: c.userAvatar || c.user_avatar,
      content: c.content,
      createdAt: c.createdAt || c.created_at
    })),
    createdAt: p.created_at,
  };
}

// Middlewares
app.use(express.json());

// Auth middleware - reads client user context from header for stateless simple authentication
app.use(async (req, res, next) => {
  const userId = req.headers['x-user-id'] as string;
  if (userId) {
    try {
      const userRes = await pool.query(
        `SELECT u.*,
          COALESCE((SELECT json_agg(follower_id) FROM follows WHERE following_id = u.id), '[]'::json) as followers,
          COALESCE((SELECT json_agg(following_id) FROM follows WHERE follower_id = u.id), '[]'::json) as following
        FROM users u WHERE u.id = $1`,
        [userId]
      );
      if (userRes.rows.length > 0) {
        (req as any).user = mapUser(userRes.rows[0]);
      }
    } catch (err) {
      console.error('Auth middleware database error:', err);
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

app.post('/api/auth/login', async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Nome de usuário é obrigatório.' });
  }

  const cleanUsername = username.trim().toLowerCase().replace('@', '');
  
  try {
    // Find user by clean username
    const userRes = await pool.query(
      `SELECT u.*,
        COALESCE((SELECT json_agg(follower_id) FROM follows WHERE following_id = u.id), '[]'::json) as followers,
        COALESCE((SELECT json_agg(following_id) FROM follows WHERE follower_id = u.id), '[]'::json) as following
      FROM users u WHERE LOWER(u.username) = $1`,
      [cleanUsername]
    );

    let user: User;

    if (userRes.rows.length === 0) {
      // Elegant Auto-registration for seamless onboarding!
      const newId = `user_${Date.now()}`;
      const email = `${cleanUsername}@clubgegpistol.com.br`;
      const fullName = username.trim();
      const avatarUrl = `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`;
      const bio = "Novo atleta federado do G&G Competições! Pronto para os desafios nas pistas. 🎯";
      const crNumber = `CR-${Math.floor(100000 + Math.random() * 900000)}-DF`;
      const isClubMember = true;
      const memberSince = new Date().toISOString().split('T')[0];
      const role = cleanUsername.includes('admin') || cleanUsername === 'gg' ? 'admin' : 'member';
      const hasPaidSignature = false;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `INSERT INTO users (id, email, username, full_name, avatar_url, bio, cr_number, is_club_member, member_since, role, has_paid_signature)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [newId, email, cleanUsername, fullName, avatarUrl, bio, crNumber, isClubMember, memberSince, role, hasPaidSignature]
        );

        // Auto-follow founders (user_guilherme, user_gabriel)
        const founders = ['user_guilherme', 'user_gabriel'];
        for (const founderId of founders) {
          const checkFounder = await client.query('SELECT 1 FROM users WHERE id = $1', [founderId]);
          if (checkFounder.rows.length > 0) {
            await client.query(
              `INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
              [newId, founderId]
            );
          }
        }
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }

      user = {
        id: newId,
        email,
        username: cleanUsername,
        fullName,
        avatarUrl,
        bio,
        crNumber,
        isClubMember,
        memberSince,
        role,
        followers: [],
        following: ["user_guilherme", "user_gabriel"],
        hasPaidSignature,
      };
    } else {
      user = mapUser(userRes.rows[0]);
    }

    res.json({ user });
  } catch (err) {
    console.error('Login database error:', err);
    res.status(500).json({ error: 'Erro interno ao realizar login.' });
  }
});

// 2. User & Social Feed Follow system
app.get('/api/users', async (req, res) => {
  try {
    const usersRes = await pool.query(
      `SELECT u.*,
        COALESCE((SELECT json_agg(follower_id) FROM follows WHERE following_id = u.id), '[]'::json) as followers,
        COALESCE((SELECT json_agg(following_id) FROM follows WHERE follower_id = u.id), '[]'::json) as following
      FROM users u`
    );
    const users = usersRes.rows.map(mapUser);
    res.json({ users });
  } catch (err) {
    console.error('Fetch users database error:', err);
    res.status(500).json({ error: 'Erro ao buscar atletas.' });
  }
});

app.post('/api/users/:id/follow', requireAuth, async (req, res) => {
  const targetId = req.params.id;
  const currentUser = (req as any).user as User;

  if (targetId === currentUser.id) {
    return res.status(400).json({ error: 'Você não pode seguir a si mesmo.' });
  }

  try {
    // Check if target user exists
    const targetRes = await pool.query('SELECT 1 FROM users WHERE id = $1', [targetId]);
    if (targetRes.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Toggle follow relation
    const checkFollow = await pool.query('SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2', [currentUser.id, targetId]);
    const isFollowing = checkFollow.rows.length > 0;

    if (isFollowing) {
      await pool.query('DELETE FROM follows WHERE follower_id = $1 AND following_id = $2', [currentUser.id, targetId]);
    } else {
      await pool.query('INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)', [currentUser.id, targetId]);
    }

    // Retrieve updated followers list for target
    const targetFollowersRes = await pool.query('SELECT follower_id FROM follows WHERE following_id = $1', [targetId]);
    const targetFollowers = targetFollowersRes.rows.map(row => row.follower_id);

    // Retrieve updated following list for current user
    const myFollowingRes = await pool.query('SELECT following_id FROM follows WHERE follower_id = $1', [currentUser.id]);
    const myFollowing = myFollowingRes.rows.map(row => row.following_id);

    res.json({ 
      success: true, 
      isFollowing: !isFollowing,
      targetFollowers,
      myFollowing
    });
  } catch (err) {
    console.error('Follow toggle database error:', err);
    res.status(500).json({ error: 'Erro ao processar ação de seguir.' });
  }
});

// 3. Instagram Social Feed (Posts, Likes, Comments)
app.get('/api/posts', async (req, res) => {
  try {
    const postsRes = await pool.query(
      `SELECT p.*,
        COALESCE((SELECT json_agg(user_id) FROM likes WHERE post_id = p.id), '[]'::json) as likes,
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', c.id,
            'userId', c.user_id,
            'username', c.username,
            'userAvatar', c.user_avatar,
            'content', c.content,
            'createdAt', c.created_at
          ) ORDER BY c.created_at ASC)
          FROM comments c WHERE c.post_id = p.id
        ), '[]'::json) as comments
      FROM posts p
      ORDER BY p.created_at DESC`
    );
    const posts = postsRes.rows.map(mapPost);
    res.json({ posts });
  } catch (err) {
    console.error('Fetch posts database error:', err);
    res.status(500).json({ error: 'Erro ao buscar publicações.' });
  }
});

app.post('/api/posts', requireAuth, async (req, res) => {
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

  try {
    await pool.query(
      `INSERT INTO posts (id, user_id, username, user_avatar, content, image_url, target_score, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        newPost.id,
        newPost.userId,
        newPost.username,
        newPost.userAvatar,
        newPost.content,
        newPost.imageUrl || null,
        newPost.targetScore ? JSON.stringify(newPost.targetScore) : null,
        newPost.createdAt
      ]
    );
    res.status(201).json({ post: newPost });
  } catch (err) {
    console.error('Create post database error:', err);
    res.status(500).json({ error: 'Erro ao criar publicação.' });
  }
});

app.post('/api/posts/:id/like', requireAuth, async (req, res) => {
  const postId = req.params.id;
  const currentUser = (req as any).user as User;

  try {
    const postCheck = await pool.query('SELECT 1 FROM posts WHERE id = $1', [postId]);
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Post não encontrado.' });
    }

    const likeCheck = await pool.query('SELECT 1 FROM likes WHERE post_id = $1 AND user_id = $2', [postId, currentUser.id]);
    const alreadyLiked = likeCheck.rows.length > 0;

    if (alreadyLiked) {
      await pool.query('DELETE FROM likes WHERE post_id = $1 AND user_id = $2', [postId, currentUser.id]);
    } else {
      await pool.query('INSERT INTO likes (post_id, user_id) VALUES ($1, $2)', [postId, currentUser.id]);
    }

    const likesRes = await pool.query('SELECT user_id FROM likes WHERE post_id = $1', [postId]);
    const likes = likesRes.rows.map(row => row.user_id);

    res.json({ success: true, likes, liked: !alreadyLiked });
  } catch (err) {
    console.error('Like post database error:', err);
    res.status(500).json({ error: 'Erro ao curtir publicação.' });
  }
});

app.post('/api/posts/:id/comment', requireAuth, async (req, res) => {
  const postId = req.params.id;
  const { content } = req.body;
  const currentUser = (req as any).user as User;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'O comentário não pode ficar vazio.' });
  }

  try {
    const postCheck = await pool.query('SELECT 1 FROM posts WHERE id = $1', [postId]);
    if (postCheck.rows.length === 0) {
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

    await pool.query(
      `INSERT INTO comments (id, post_id, user_id, username, user_avatar, content, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [newComment.id, postId, newComment.userId, newComment.username, newComment.userAvatar, newComment.content, newComment.createdAt]
    );

    const commentsRes = await pool.query(
      `SELECT c.id, c.user_id as "userId", c.username, c.user_avatar as "userAvatar", c.content, c.created_at as "createdAt"
       FROM comments c WHERE c.post_id = $1 ORDER BY c.created_at ASC`,
      [postId]
    );

    res.status(201).json({ comment: newComment, comments: commentsRes.rows });
  } catch (err) {
    console.error('Comment database error:', err);
    res.status(500).json({ error: 'Erro ao adicionar comentário.' });
  }
});

// 4. Championships, Modalities & Staging
app.get('/api/championships', async (req, res) => {
  try {
    const champsRes = await pool.query('SELECT * FROM championships');
    const championships = champsRes.rows.map(mapChampionship);
    res.json({ championships });
  } catch (err) {
    console.error('Fetch championships database error:', err);
    res.status(500).json({ error: 'Erro ao buscar campeonatos.' });
  }
});

app.post('/api/championships', requireAdmin, async (req, res) => {
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

  try {
    await pool.query(
      `INSERT INTO championships (id, title, description, start_date, end_date, registration_fee, modalities, stages_count, current_stage, status, banner_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        newChamp.id,
        newChamp.title,
        newChamp.description,
        newChamp.startDate,
        newChamp.endDate,
        newChamp.registrationFee,
        JSON.stringify(newChamp.modalities),
        newChamp.stagesCount,
        newChamp.currentStage,
        newChamp.status,
        newChamp.bannerUrl
      ]
    );
    res.status(201).json({ championship: newChamp });
  } catch (err) {
    console.error('Create championship database error:', err);
    res.status(500).json({ error: 'Erro ao criar campeonato.' });
  }
});

app.post('/api/championships/:id/status', requireAdmin, async (req, res) => {
  const { status, currentStage } = req.body;
  const champId = req.params.id;

  try {
    const champRes = await pool.query('SELECT * FROM championships WHERE id = $1', [champId]);
    if (champRes.rows.length === 0) {
      return res.status(404).json({ error: 'Campeonato não encontrado.' });
    }

    const champ = mapChampionship(champRes.rows[0]);

    if (status) champ.status = status;
    if (currentStage) champ.currentStage = Number(currentStage);

    await pool.query(
      `UPDATE championships SET status = $1, current_stage = $2 WHERE id = $3`,
      [champ.status, champ.currentStage, champId]
    );

    res.json({ success: true, championship: champ });
  } catch (err) {
    console.error('Update championship status database error:', err);
    res.status(500).json({ error: 'Erro ao atualizar status do campeonato.' });
  }
});

// 5. Registration & Payments
app.get('/api/registrations', requireAuth, async (req, res) => {
  const currentUser = (req as any).user as User;
  
  try {
    let regsRes;
    if (currentUser.role === 'admin') {
      regsRes = await pool.query('SELECT * FROM registrations');
    } else {
      regsRes = await pool.query('SELECT * FROM registrations WHERE user_id = $1', [currentUser.id]);
    }
    const registrations = regsRes.rows.map(mapRegistration);
    res.json({ registrations });
  } catch (err) {
    console.error('Fetch registrations database error:', err);
    res.status(500).json({ error: 'Erro ao buscar inscrições.' });
  }
});

app.post('/api/championships/:id/register', requireAuth, async (req, res) => {
  const championshipId = req.params.id;
  const { modality, crNumber, paymentMethod } = req.body;
  const currentUser = (req as any).user as User;

  if (!modality || !crNumber || !paymentMethod) {
    return res.status(400).json({ error: 'Inscrição requer modalidade, CR válido e meio de pagamento.' });
  }

  try {
    const alreadyRegisteredRes = await pool.query(
      'SELECT 1 FROM registrations WHERE championship_id = $1 AND user_id = $2 AND modality = $3',
      [championshipId, currentUser.id, modality]
    );

    if (alreadyRegisteredRes.rows.length > 0) {
      return res.status(400).json({ error: 'Você já possui inscrição activa nesta modalidade para este campeonato.' });
    }

    const newReg: Registration = {
      id: `reg_${Date.now()}`,
      championshipId,
      userId: currentUser.id,
      modality,
      crNumber,
      paymentMethod,
      paymentStatus: 'approved', // Auto approved for responsive demonstration flow!
      registeredAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
      txId: `tx_gg_${Math.random().toString(36).substring(2, 12)}`
    };

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO registrations (id, championship_id, user_id, modality, cr_number, payment_method, payment_status, registered_at, approved_at, tx_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          newReg.id,
          newReg.championshipId,
          newReg.userId,
          newReg.modality,
          newReg.crNumber,
          newReg.paymentMethod,
          newReg.paymentStatus,
          newReg.registeredAt,
          newReg.approvedAt || null,
          newReg.txId || null
        ]
      );

      await client.query(
        `UPDATE users SET cr_number = COALESCE(cr_number, $1) WHERE id = $2`,
        [crNumber, currentUser.id]
      );
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    res.status(201).json({ success: true, registration: newReg });
  } catch (err) {
    console.error('Register championship database error:', err);
    res.status(500).json({ error: 'Erro ao realizar inscrição.' });
  }
});

// 6. Record Championship Stage Scores (Admin Only)
app.get('/api/scores', async (req, res) => {
  try {
    const scoresRes = await pool.query('SELECT * FROM stage_scores');
    const stageScores = scoresRes.rows.map(mapStageScore);
    res.json({ stageScores });
  } catch (err) {
    console.error('Fetch scores database error:', err);
    res.status(500).json({ error: 'Erro ao buscar pontuações.' });
  }
});

app.post('/api/championships/:id/scores', requireAdmin, async (req, res) => {
  const championshipId = req.params.id;
  const { registrationId, stageNum, score, timeSeconds } = req.body;

  if (!registrationId || !stageNum || score === undefined) {
    return res.status(400).json({ error: 'Dados pontuais incompletos.' });
  }

  try {
    const regRes = await pool.query('SELECT * FROM registrations WHERE id = $1', [registrationId]);
    if (regRes.rows.length === 0) {
      return res.status(404).json({ error: 'Inscrição federativa não localizada.' });
    }
    const reg = mapRegistration(regRes.rows[0]);

    const shooterRes = await pool.query('SELECT * FROM users WHERE id = $1', [reg.userId]);
    if (shooterRes.rows.length === 0) {
      return res.status(404).json({ error: 'Atirador de cadastro não localizado.' });
    }
    const shooter = mapUser(shooterRes.rows[0]);

    let hitFactor: number | undefined;
    if (timeSeconds && Number(timeSeconds) > 0) {
      hitFactor = Number((Number(score) / Number(timeSeconds)).toFixed(4));
    }

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

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `DELETE FROM stage_scores WHERE championship_id = $1 AND registration_id = $2 AND stage_num = $3`,
        [championshipId, registrationId, Number(stageNum)]
      );

      await client.query(
        `INSERT INTO stage_scores (id, championship_id, registration_id, user_id, shooter_name, modality, stage_num, score, time_seconds, hit_factor, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          newScore.id,
          newScore.championshipId,
          newScore.registrationId,
          newScore.userId,
          newScore.shooterName,
          newScore.modality,
          newScore.stageNum,
          newScore.score,
          newScore.timeSeconds || null,
          newScore.hitFactor || null,
          newScore.createdAt
        ]
      );

      const hasResultPost = Math.random() > 0.5;
      if (hasResultPost) {
        const champRes = await client.query('SELECT banner_url FROM championships WHERE id = $1', [championshipId]);
        const bannerUrl = champRes.rows[0]?.banner_url || defaultChampionships.find(c => c.id === championshipId)?.bannerUrl || shootingImages.paper_target;

        const newPost: Post = {
          id: `post_result_${Date.now()}`,
          userId: shooter.id,
          username: shooter.username,
          userAvatar: shooter.avatarUrl,
          content: `🎯 Medalha na Etapa ${stageNum} do campeonato! Minha pontuação oficial cadastrada foi de ${score} pontos na G&G Competições. Foco total nas próximas etapas! 💪🔫`,
          imageUrl: bannerUrl,
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

        await client.query(
          `INSERT INTO posts (id, user_id, username, user_avatar, content, image_url, target_score, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            newPost.id,
            newPost.userId,
            newPost.username,
            newPost.userAvatar,
            newPost.content,
            newPost.imageUrl || null,
            JSON.stringify(newPost.targetScore),
            newPost.createdAt
          ]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    res.status(201).json({ success: true, score: newScore });
  } catch (err) {
    console.error('Post score database error:', err);
    res.status(500).json({ error: 'Erro ao cadastrar pontuação.' });
  }
});

// 7. Rankings Calculation API
app.get('/api/rankings', async (req, res) => {
  const { championshipId, modality } = req.query;

  try {
    let query = 'SELECT * FROM stage_scores WHERE 1=1';
    const params: any[] = [];
    let paramIdx = 1;

    if (championshipId) {
      query += ` AND championship_id = $${paramIdx++}`;
      params.push(championshipId);
    }
    if (modality) {
      query += ` AND modality = $${paramIdx++}`;
      params.push(modality);
    }

    const scoresRes = await pool.query(query, params);
    const scores = scoresRes.rows.map(mapStageScore);

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

    for (const s of scores) {
      const key = `${s.userId}_${s.modality}`;
      const userRes = await pool.query('SELECT username, avatar_url FROM users WHERE id = $1', [s.userId]);
      const user = userRes.rows[0];

      if (!shooterMap[key]) {
        shooterMap[key] = {
          userId: s.userId,
          username: user?.username || 'Federado',
          fullName: s.shooterName,
          avatarUrl: user?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          modality: s.modality,
          totalScore: 0,
          stageScores: {}
        };
      }

      // Add stage score
      shooterMap[key].stageScores[s.stageNum] = s.score;
    }

    const results = Object.values(shooterMap).map(item => {
      const vals = Object.values(item.stageScores);
      const sum = vals.reduce((a, b) => a + b, 0);
      return {
        ...item,
        totalScore: Number(sum.toFixed(2))
      };
    });

    const sorted = results.sort((a, b) => b.totalScore - a.totalScore);
    res.json({ rankings: sorted });
  } catch (err) {
    console.error('Fetch rankings database error:', err);
    res.status(500).json({ error: 'Erro ao calcular ranking.' });
  }
});

// 8. Sign / Affiliation fee payment simulation
app.post('/api/users/signature', requireAuth, async (req, res) => {
  const currentUser = (req as any).user as User;

  try {
    const expDate = new Date();
    expDate.setFullYear(expDate.getFullYear() + 1); // 1 year expiry
    const signatureExpiry = expDate.toISOString().split('T')[0];

    const userRes = await pool.query(
      `UPDATE users SET has_paid_signature = true, signature_expiry = $1 WHERE id = $2 RETURNING *`,
      [signatureExpiry, currentUser.id]
    );

    if (userRes.rows.length > 0) {
      const fullUserRes = await pool.query(
        `SELECT u.*,
          COALESCE((SELECT json_agg(follower_id) FROM follows WHERE following_id = u.id), '[]'::json) as followers,
          COALESCE((SELECT json_agg(following_id) FROM follows WHERE follower_id = u.id), '[]'::json) as following
        FROM users u WHERE u.id = $1`,
        [currentUser.id]
      );
      res.json({ success: true, user: mapUser(fullUserRes.rows[0]) });
    } else {
      res.status(404).json({ error: 'Atleta não encontrado.' });
    }
  } catch (err) {
    console.error('Signature database error:', err);
    res.status(500).json({ error: 'Erro ao atualizar assinatura.' });
  }
});

// ==========================================
// VITE DEV SERVER AND PRODUCTION ASSET HANDLERS
// ==========================================

async function startServer() {
  // Initialize PostgreSQL database (create tables and seed if empty)
  try {
    await initDB();
    console.log('PostgreSQL database initialized successfully.');
  } catch (err) {
    console.error('Critical: Failed to initialize PostgreSQL database:', err);
    process.exit(1);
  }

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
