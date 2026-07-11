import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { defaultChampionships, shootingImages } from './src/data/mockData.js';
import { User, Post, Championship, Registration, StageScore, Comment, Club, Modality, Stage, Weapon } from './src/types.js';
import { pool, initDB } from './src/db.js';
import { verifyPassword } from './src/auth.js';

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
    role: u.role as User['role'],
    followers: u.followers || [],
    following: u.following || [],
    hasPaidSignature: u.has_paid_signature,
    signatureExpiry: u.signature_expiry || undefined,
    clubId: u.club_id || undefined,
    isProfileComplete: u.is_profile_complete || false,
    cpf: u.cpf || undefined,
    rg: u.rg || undefined,
    phone: u.phone || undefined,
  };
}

function mapClub(c: any): Club {
  return {
    id: c.id,
    name: c.name,
    logoUrl: c.logo_url || undefined,
    subDomain: c.sub_domain || undefined,
    cnpj: c.cnpj || undefined,
    phone: c.phone || undefined,
    isPremium: c.is_premium,
    createdAt: c.created_at,
  };
}

function mapModality(m: any): Modality {
  return {
    id: m.id,
    name: m.name,
    discipline: m.discipline,
    targetPreview: m.target_preview || undefined,
    seriesCount: m.series_count ?? undefined,
    shotsPerSeries: m.shots_per_series ?? undefined,
    timePerSeriesMinutes: m.time_per_series_minutes ?? undefined,
    evaluationType: m.evaluation_type || undefined,
  };
}

function mapStage(s: any): Stage {
  return {
    id: s.id,
    championshipId: s.championship_id,
    stageNum: s.stage_num,
    title: s.title,
    date: s.date,
    regulationsFile: s.regulations_file || undefined,
    scorecardFile: s.scorecard_file || undefined,
  };
}

function mapWeapon(w: any): Weapon {
  return {
    id: w.id,
    ownerId: w.owner_id,
    manufacturer: w.manufacturer,
    model: w.model,
    caliber: w.caliber,
    serialNumber: w.serial_number,
    weaponType: w.weapon_type,
    weaponNumber: w.weapon_number || undefined,
    sigmaNumber: w.sigma_number || undefined,
    weaponClass: w.class || undefined,
    permissionStatus: w.permission_status || undefined,
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
    status: c.status as 'draft' | 'open' | 'completed',
    bannerUrl: c.banner_url,
    clubId: c.club_id || undefined,
    type: (c.type as 'individual' | 'clube') || 'individual',
  };
}

function mapRegistration(r: any): Registration {
  return {
    id: r.id,
    championshipId: r.championship_id,
    userId: r.user_id,
    clubId: r.club_id || undefined,
    modalityId: r.modality_id,
    stageId: r.stage_id,
    weaponId: r.weapon_id,
    crNumber: r.cr_number,
    paymentMethod: r.payment_method as 'pix' | 'credit_card',
    paymentStatus: r.payment_status as 'pending' | 'approved',
    completionStatus: (r.completion_status as 'pending' | 'completed') || 'pending',
    registeredAt: r.registered_at,
    approvedAt: r.approved_at || undefined,
    txId: r.tx_id || undefined,
    scoreDetails: r.score_details || undefined,
    totalPoints: r.total_points ?? undefined,
    idscTotalSeconds: r.idsc_total_seconds ?? undefined,
    disqualified: r.disqualified || false,
    penalty: r.penalty || 0,
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
app.use(express.json({ limit: '10mb' }));

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

const ADMIN_ROLES = ['admin', 'master_admin', 'club_admin'];

const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!(req as any).user || !ADMIN_ROLES.includes((req as any).user.role)) {
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
  const { cpf, password } = req.body;
  if (!cpf || !password) {
    return res.status(400).json({ error: 'CPF e senha são obrigatórios.' });
  }

  const cleanCpf = String(cpf).replace(/\D/g, '');
  const invalidCredentials = () => res.status(401).json({ error: 'CPF ou senha inválidos.' });

  try {
    const userRes = await pool.query(
      `SELECT u.*,
        COALESCE((SELECT json_agg(follower_id) FROM follows WHERE following_id = u.id), '[]'::json) as followers,
        COALESCE((SELECT json_agg(following_id) FROM follows WHERE follower_id = u.id), '[]'::json) as following
      FROM users u WHERE regexp_replace(u.cpf, '[^0-9]', '', 'g') = $1`,
      [cleanCpf]
    );

    if (userRes.rows.length === 0 || !userRes.rows[0].password_hash) {
      return invalidCredentials();
    }

    if (!verifyPassword(password, userRes.rows[0].password_hash)) {
      return invalidCredentials();
    }

    res.json({ user: mapUser(userRes.rows[0]) });
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
  const { title, description, startDate, endDate, registrationFee, modalities, stagesCount, bannerUrl, clubId, type } = req.body;

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
    status: 'open',
    bannerUrl: bannerUrl || 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=800&auto=format&fit=crop&q=80',
    clubId: clubId || undefined,
    type: type === 'clube' ? 'clube' : 'individual'
  };

  try {
    await pool.query(
      `INSERT INTO championships (id, title, description, start_date, end_date, registration_fee, modalities, stages_count, status, banner_url, club_id, type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        newChamp.id,
        newChamp.title,
        newChamp.description,
        newChamp.startDate,
        newChamp.endDate,
        newChamp.registrationFee,
        JSON.stringify(newChamp.modalities),
        newChamp.stagesCount,
        newChamp.status,
        newChamp.bannerUrl,
        newChamp.clubId || null,
        newChamp.type
      ]
    );
    res.status(201).json({ championship: newChamp });
  } catch (err) {
    console.error('Create championship database error:', err);
    res.status(500).json({ error: 'Erro ao criar campeonato.' });
  }
});

app.post('/api/championships/:id/status', requireAdmin, async (req, res) => {
  const { status } = req.body;
  const champId = req.params.id;

  try {
    const champRes = await pool.query('SELECT * FROM championships WHERE id = $1', [champId]);
    if (champRes.rows.length === 0) {
      return res.status(404).json({ error: 'Campeonato não encontrado.' });
    }

    const champ = mapChampionship(champRes.rows[0]);

    if (status) champ.status = status;

    await pool.query(
      `UPDATE championships SET status = $1 WHERE id = $2`,
      [champ.status, champId]
    );

    res.json({ success: true, championship: champ });
  } catch (err) {
    console.error('Update championship status database error:', err);
    res.status(500).json({ error: 'Erro ao atualizar status do campeonato.' });
  }
});

app.put('/api/championships/:id', requireAdmin, async (req, res) => {
  const champId = req.params.id;
  const { title, description, startDate, endDate, registrationFee, modalities, stagesCount, bannerUrl } = req.body;

  if (!title || !description || !registrationFee || !modalities || !stagesCount) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
  }

  try {
    const champRes = await pool.query('SELECT * FROM championships WHERE id = $1', [champId]);
    if (champRes.rows.length === 0) {
      return res.status(404).json({ error: 'Campeonato não encontrado.' });
    }

    const currentBanner = champRes.rows[0].banner_url;

    await pool.query(
      `UPDATE championships
       SET title = $1, description = $2, start_date = $3, end_date = $4, registration_fee = $5, modalities = $6, stages_count = $7, banner_url = $8
       WHERE id = $9`,
      [
        title,
        description,
        startDate,
        endDate,
        Number(registrationFee),
        JSON.stringify(Array.isArray(modalities) ? modalities : [modalities]),
        Number(stagesCount),
        bannerUrl || currentBanner || 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=800&auto=format&fit=crop&q=80',
        champId
      ]
    );

    res.json({ success: true, message: 'Campeonato atualizado com sucesso.' });
  } catch (err) {
    console.error('Update championship database error:', err);
    res.status(500).json({ error: 'Erro ao atualizar campeonato.' });
  }
});

// 5. Registration & Payments
app.get('/api/registrations', requireAuth, async (req, res) => {
  const currentUser = (req as any).user as User;
  
  try {
    let regsRes;
    if (ADMIN_ROLES.includes(currentUser.role)) {
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
  const { modalityId, stageId, weaponId, crNumber, paymentMethod } = req.body;
  const currentUser = (req as any).user as User;

  if (!modalityId || !stageId || !weaponId || !crNumber || !paymentMethod) {
    return res.status(400).json({ error: 'Inscrição requer modalidade, etapa, arma, CR válido e meio de pagamento.' });
  }

  try {
    const champRes = await pool.query('SELECT * FROM championships WHERE id = $1', [championshipId]);
    if (champRes.rows.length === 0) {
      return res.status(404).json({ error: 'Campeonato não encontrado.' });
    }
    const champ = mapChampionship(champRes.rows[0]);

    const alreadyRegisteredRes = await pool.query(
      'SELECT 1 FROM registrations WHERE championship_id = $1 AND user_id = $2 AND modality_id = $3 AND stage_id = $4',
      [championshipId, currentUser.id, modalityId, stageId]
    );

    if (alreadyRegisteredRes.rows.length > 0) {
      return res.status(400).json({ error: 'Você já possui inscrição ativa nesta modalidade/etapa para este campeonato.' });
    }

    const newReg: Registration = {
      id: `reg_${Date.now()}`,
      championshipId,
      userId: currentUser.id,
      clubId: currentUser.clubId || champ.clubId || undefined,
      modalityId,
      stageId,
      weaponId,
      crNumber,
      paymentMethod,
      paymentStatus: 'approved', // Auto approved for responsive demonstration flow!
      completionStatus: 'pending',
      registeredAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
      txId: `tx_gg_${Math.random().toString(36).substring(2, 12)}`,
      disqualified: false,
      penalty: 0
    };

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO registrations (id, championship_id, user_id, club_id, modality_id, stage_id, weapon_id, cr_number, payment_method, payment_status, completion_status, registered_at, approved_at, tx_id, disqualified, penalty)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          newReg.id,
          newReg.championshipId,
          newReg.userId,
          newReg.clubId || null,
          newReg.modalityId,
          newReg.stageId,
          newReg.weaponId,
          newReg.crNumber,
          newReg.paymentMethod,
          newReg.paymentStatus,
          newReg.completionStatus,
          newReg.registeredAt,
          newReg.approvedAt || null,
          newReg.txId || null,
          newReg.disqualified,
          newReg.penalty
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

// 4b. Clubs, Modalities, Stages & Weapons (lookup / registry data)
app.get('/api/clubs', async (req, res) => {
  try {
    const clubsRes = await pool.query('SELECT * FROM clubs');
    res.json({ clubs: clubsRes.rows.map(mapClub) });
  } catch (err) {
    console.error('Fetch clubs database error:', err);
    res.status(500).json({ error: 'Erro ao buscar clubes.' });
  }
});

app.get('/api/modalities', async (req, res) => {
  try {
    const modalitiesRes = await pool.query('SELECT * FROM modalities');
    res.json({ modalities: modalitiesRes.rows.map(mapModality) });
  } catch (err) {
    console.error('Fetch modalities database error:', err);
    res.status(500).json({ error: 'Erro ao buscar modalidades.' });
  }
});

app.get('/api/stages', async (req, res) => {
  try {
    const { championshipId } = req.query;
    const stagesRes = championshipId
      ? await pool.query('SELECT * FROM stages WHERE championship_id = $1 ORDER BY stage_num ASC', [championshipId])
      : await pool.query('SELECT * FROM stages ORDER BY stage_num ASC');
    res.json({ stages: stagesRes.rows.map(mapStage) });
  } catch (err) {
    console.error('Fetch stages database error:', err);
    res.status(500).json({ error: 'Erro ao buscar etapas.' });
  }
});

app.get('/api/weapons', async (req, res) => {
  try {
    const { ownerId } = req.query;
    const weaponsRes = ownerId
      ? await pool.query('SELECT * FROM weapons WHERE owner_id = $1', [ownerId])
      : await pool.query('SELECT * FROM weapons');
    res.json({ weapons: weaponsRes.rows.map(mapWeapon) });
  } catch (err) {
    console.error('Fetch weapons database error:', err);
    res.status(500).json({ error: 'Erro ao buscar armas.' });
  }
});

app.post('/api/weapons', requireAuth, async (req, res) => {
  const currentUser = (req as any).user as User;
  const { ownerId, manufacturer, model, caliber, serialNumber, weaponType, weaponNumber, sigmaNumber, weaponClass, permissionStatus } = req.body;

  if (!manufacturer || !model || !caliber || !serialNumber || !weaponType) {
    return res.status(400).json({ error: 'Preencha fabricante, modelo, calibre, número de série e tipo da arma.' });
  }

  // Members can only register weapons for themselves; admins may register on behalf of their club.
  const resolvedOwnerId = ownerId && ADMIN_ROLES.includes(currentUser.role) ? ownerId : currentUser.id;

  const newWeapon: Weapon = {
    id: `weapon_${Date.now()}`,
    ownerId: resolvedOwnerId,
    manufacturer,
    model,
    caliber,
    serialNumber,
    weaponType,
    weaponNumber: weaponNumber || undefined,
    sigmaNumber: sigmaNumber || undefined,
    weaponClass: weaponClass || undefined,
    permissionStatus: permissionStatus || undefined,
  };

  try {
    await pool.query(
      `INSERT INTO weapons (id, owner_id, manufacturer, model, caliber, serial_number, weapon_type, weapon_number, sigma_number, class, permission_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        newWeapon.id,
        newWeapon.ownerId,
        newWeapon.manufacturer,
        newWeapon.model,
        newWeapon.caliber,
        newWeapon.serialNumber,
        newWeapon.weaponType,
        newWeapon.weaponNumber || null,
        newWeapon.sigmaNumber || null,
        newWeapon.weaponClass || null,
        newWeapon.permissionStatus || null
      ]
    );
    res.status(201).json({ weapon: newWeapon });
  } catch (err) {
    console.error('Create weapon database error:', err);
    res.status(500).json({ error: 'Erro ao cadastrar arma.' });
  }
});

app.delete('/api/weapons/:id', requireAuth, async (req, res) => {
  const currentUser = (req as any).user as User;
  const weaponId = req.params.id;

  try {
    const weaponRes = await pool.query('SELECT * FROM weapons WHERE id = $1', [weaponId]);
    if (weaponRes.rows.length === 0) {
      return res.status(404).json({ error: 'Arma não encontrada.' });
    }
    const weapon = mapWeapon(weaponRes.rows[0]);

    const canDelete = weapon.ownerId === currentUser.id || (ADMIN_ROLES.includes(currentUser.role) && weapon.ownerId === currentUser.clubId);
    if (!canDelete) {
      return res.status(403).json({ error: 'Você não tem permissão para remover esta arma.' });
    }

    await pool.query('DELETE FROM weapons WHERE id = $1', [weaponId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete weapon database error:', err);
    res.status(500).json({ error: 'Erro ao remover arma.' });
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

    const modalityRes = await pool.query('SELECT * FROM modalities WHERE id = $1', [reg.modalityId]);
    const modalityName = modalityRes.rows.length > 0 ? mapModality(modalityRes.rows[0]).name : reg.modalityId;

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
      modality: modalityName,
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
            distance: modalityName.includes('10m') ? 10 : (modalityName.includes('25m') ? 25 : 15),
            gunModel: "Imbel GC MD2 LX",
            caliber: modalityName.includes('IPSC') ? "380 ACP" : ".22 LR",
            discipline: modalityName
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

// 9. Site Settings
app.get('/api/settings', async (req, res) => {
  try {
    const settingsRes = await pool.query('SELECT * FROM settings');
    const settings: { [key: string]: string } = {};
    settingsRes.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    res.json({ settings });
  } catch (err) {
    console.error('Fetch settings database error:', err);
    res.status(500).json({ error: 'Erro ao buscar configurações.' });
  }
});

app.post('/api/settings', requireAdmin, async (req, res) => {
  const { key, value } = req.body;
  if (!key || !value) {
    return res.status(400).json({ error: 'Chave e valor são obrigatórios.' });
  }

  try {
    await pool.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [key, value]
    );
    res.json({ success: true, key, value });
  } catch (err) {
    console.error('Update setting database error:', err);
    res.status(500).json({ error: 'Erro ao salvar configuração.' });
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
