import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { defaultChampionships, shootingImages } from './src/data/mockData.js';
import { User, Post, Championship, Registration, StageScore, Comment, Club, Modality, Stage, Weapon, WeaponLookupOption } from './src/types.js';
import { pool, initDB } from './src/db.js';
import { hashPassword, verifyPassword } from './src/auth.js';
import { uploadDocument, getDocumentStream, storageEnabled } from './src/storage.js';
import multer from 'multer';

const app = express();
const PORT = 3000;

// Fields a member profile needs to be considered complete for championship
// registration. Computed live from the row on every read (not trusted from
// the stored is_profile_complete column) so accounts that predate this check
// — or were seeded/migrated with the flag hardcoded true — show their real
// state immediately, without needing a backfill migration.
const USER_PROFILE_REQUIRED_COLUMNS = ['full_name', 'email', 'cpf', 'club_id', 'rg', 'phone', 'birth_date', 'address', 'city', 'state'];

function isUserRowProfileComplete(u: any): boolean {
  return USER_PROFILE_REQUIRED_COLUMNS.every(col => u[col] !== null && u[col] !== undefined && u[col] !== '');
}

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
    isProfileComplete: isUserRowProfileComplete(u),
    cpf: u.cpf || undefined,
    rg: u.rg || undefined,
    phone: u.phone || undefined,
    birthDate: u.birth_date || undefined,
    sex: u.sex || undefined,
    rgIssuer: u.rg_issuer || undefined,
    rgIssueDate: u.rg_issue_date || undefined,
    fatherName: u.father_name || undefined,
    motherName: u.mother_name || undefined,
    crValidity: u.cr_validity || undefined,
    militaryRegion: u.military_region || undefined,
    nationality: u.nationality || undefined,
    cep: u.cep || undefined,
    address: u.address || undefined,
    addressNumber: u.address_number || undefined,
    complement: u.complement || undefined,
    neighborhood: u.neighborhood || undefined,
    city: u.city || undefined,
    state: u.state || undefined,
    docRgCnhUploaded: Boolean(u.doc_rg_cnh_key),
    docCrUploaded: Boolean(u.doc_cr_key),
    docDeclaracaoUploaded: Boolean(u.doc_declaracao_key),
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
    crNumber: c.cr_number || undefined,
    responsibleName: c.responsible_name || undefined,
    email: c.email || undefined,
    cep: c.cep || undefined,
    address: c.address || undefined,
    addressNumber: c.address_number || undefined,
    complement: c.complement || undefined,
    neighborhood: c.neighborhood || undefined,
    city: c.city || undefined,
    state: c.state || undefined,
    docCnpjUploaded: Boolean(c.doc_cnpj_key),
    docCrUploaded: Boolean(c.doc_cr_key),
    docAlvaraUploaded: Boolean(c.doc_alvara_key),
  };
}

function mapModality(m: any): Modality {
  return {
    id: m.id,
    name: m.name,
    discipline: m.discipline || undefined,
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
    description: s.description || undefined,
    endDate: s.end_date || undefined,
    sexo: s.sexo || undefined,
    homologarResultado: s.homologar_resultado || undefined,
    abertoParaResultados: s.aberto_para_resultados || undefined,
    gerarCertificados: s.gerar_certificados || undefined,
    fatorMultiplicacaoResultados: num(s.fator_multiplicacao_resultados),
    exibirInscritosPaginaInicial: s.exibir_inscritos_pagina_inicial || undefined,
    incluirNaSomaPaginaInicial: s.incluir_na_soma_pagina_inicial || undefined,
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
    weaponType: w.weapon_type || undefined,
    weaponNumber: w.weapon_number || undefined,
    sigmaNumber: w.sigma_number || undefined,
    weaponClass: w.class || undefined,
    permissionStatus: w.permission_status || undefined,
    registrySystem: w.registry_system || undefined,
  };
}

function num(v: any): number | undefined {
  return v === null || v === undefined ? undefined : Number(v);
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
    regulamentoUploaded: Boolean(c.regulamento_key),
    sumulaUploaded: Boolean(c.sumula_key),
    valorX: num(c.valor_x),
    valorInscricaoClube: num(c.valor_inscricao_clube),
    valorInscricaoIndividual: num(c.valor_inscricao_individual),
    percentualClube: num(c.percentual_clube),
    valorReinscricao: num(c.valor_reinscricao),
    tipoPix: c.tipo_pix || undefined,
    chavePix: c.chave_pix || undefined,
    nomeExibidoPix: c.nome_exibido_pix || undefined,
    whatsappComprovante: c.whatsapp_comprovante || undefined,
    formatoPagamento: c.formato_pagamento || undefined,
    limiteEquipesClube: num(c.limite_equipes_clube),
    qtdAtletasPorEquipe: num(c.qtd_atletas_por_equipe),
    formatoInsercao: c.formato_insercao || undefined,
    alcanceCampeonato: c.alcance_campeonato || undefined,
    nivelCampeonato: num(c.nivel_campeonato),
    percentualTributos: num(c.percentual_tributos),
    percentualOrganizacao: num(c.percentual_organizacao),
    percentualClubes: num(c.percentual_clubes),
    percentualPremiacaoAtleta: num(c.percentual_premiacao_atleta),
    percentualPremiacaoClube: num(c.percentual_premiacao_clube),
    percentualPremiacaoTodasEtapas: num(c.percentual_premiacao_todas_etapas),
    premiacaoAdicionalTodasEtapas: num(c.premiacao_adicional_todas_etapas),
    qtdEtapasConsideradas: num(c.qtd_etapas_consideradas),
    qtdPioresDescartar: num(c.qtd_piores_descartar),
    qtdMelhoresDescartar: num(c.qtd_melhores_descartar),
    percentualPos1TodasEtapas: num(c.percentual_pos1_todas_etapas),
    percentualPos2TodasEtapas: num(c.percentual_pos2_todas_etapas),
    percentualPos3TodasEtapas: num(c.percentual_pos3_todas_etapas),
    percentualPos4TodasEtapas: num(c.percentual_pos4_todas_etapas),
    percentualPos5TodasEtapas: num(c.percentual_pos5_todas_etapas),
    percentualOuro: num(c.percentual_ouro),
    percentualPrata: num(c.percentual_prata),
    percentualBronze: num(c.percentual_bronze),
    percentualPos1Medalha: num(c.percentual_pos1_medalha),
    percentualPos2Medalha: num(c.percentual_pos2_medalha),
    percentualPos3Medalha: num(c.percentual_pos3_medalha),
    percentualPos4Medalha: num(c.percentual_pos4_medalha),
    percentualPos5Medalha: num(c.percentual_pos5_medalha),
    pontuacaoMinimaAtletaOuro: num(c.pontuacao_minima_atleta_ouro),
    pontuacaoMinimaAtletaPrata: num(c.pontuacao_minima_atleta_prata),
    pontuacaoMinimaAtletaBronze: num(c.pontuacao_minima_atleta_bronze),
    pontuacaoMinimaEquipeOuro: num(c.pontuacao_minima_equipe_ouro),
    pontuacaoMinimaEquipePrata: num(c.pontuacao_minima_equipe_prata),
    pontuacaoMinimaEquipeBronze: num(c.pontuacao_minima_equipe_bronze),
    ordemExibicao: num(c.ordem_exibicao),
    abertoOutrosClubes: (c.aberto_outros_clubes as 'sim' | 'nao') || undefined,
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
    completionStatus: (r.completion_status as 'pending' | 'completed' | 'absent') || 'pending',
    registeredAt: r.registered_at,
    approvedAt: r.approved_at || undefined,
    txId: r.tx_id || undefined,
    scoreDetails: r.score_details || undefined,
    totalPoints: r.total_points ?? undefined,
    idscTotalSeconds: r.idsc_total_seconds ?? undefined,
    disqualified: r.disqualified || false,
    penalty: r.penalty || 0,
    registeredByUserId: r.registered_by_user_id || undefined,
    registrationType: (r.registration_type as 'normal' | 'reinscrição') || 'normal',
    valorPago: r.valor_pago != null ? Number(r.valor_pago) : undefined,
    dataPagamento: r.data_pagamento || undefined,
    scoreX: r.score_x ?? 0, scoreP10: r.score_p10 ?? 0, scoreP9: r.score_p9 ?? 0,
    scoreP8: r.score_p8 ?? 0, scoreP7: r.score_p7 ?? 0, scoreP6: r.score_p6 ?? 0,
    scoreP5: r.score_p5 ?? 0, scoreP4: r.score_p4 ?? 0, scoreP3: r.score_p3 ?? 0,
    scoreP2: r.score_p2 ?? 0, scoreP1: r.score_p1 ?? 0, scoreP0: r.score_p0 ?? 0,
    idsc0: r.idsc_0 ?? 0, idsc2: r.idsc_2 ?? 0, idsc5: r.idsc_5 ?? 0,
    idscMisses: r.idsc_misses ?? 0, idscNoshoot: r.idsc_noshoot ?? 0,
    idscTempoPista: r.idsc_tempo_pista ?? undefined,
    idscTempoPistaExibe: r.idsc_tempo_pista_exibe || undefined,
    idscTotalSegundosExibe: r.idsc_total_segundos_exibe || undefined,
    dataExecucao: r.data_execucao || undefined,
    horaExecucao: r.hora_execucao || undefined,
    totalMinutos: r.total_minutos || undefined,
    totalMilesegundos: r.total_milesegundos ?? 0,
    seriesPontos: r.series_pontos || undefined,
    seriesTempos: r.series_tempos || undefined,
    codigoInscricao: r.codigo_inscricao ?? undefined,
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

// Gerenciamento das listas de armas (Classe/Modelo/Calibre/Fabricante/Arma é/
// Status de permissão) é exclusivo do Administrador Master.
const requireMasterAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!(req as any).user || (req as any).user.role !== 'master_admin') {
    return res.status(403).json({ error: 'Acesso restrito ao Administrador Master.' });
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

const COMBINING_DIACRITICS_PATTERN = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD').replace(COMBINING_DIACRITICS_PATTERN, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'atleta';
}

async function uniqueUsername(client: any, base: string): Promise<string> {
  let candidate = base;
  let suffix = 1;
  while (true) {
    const res = await client.query('SELECT 1 FROM users WHERE username = $1', [candidate]);
    if (res.rows.length === 0) return candidate;
    suffix += 1;
    candidate = `${base}_${suffix}`;
  }
}

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';

// Keeps the stored is_profile_complete column in sync too, in case anything
// ever queries it directly — mapUser above no longer relies on it for reads.
async function recomputeUserProfileComplete(client: { query: (text: string, params?: unknown[]) => Promise<any> }, userId: string): Promise<void> {
  const checkRes = await client.query(
    `SELECT (${USER_PROFILE_REQUIRED_COLUMNS.map(c => `${c} IS NOT NULL AND ${c} != ''`).join(' AND ')}) as complete FROM users WHERE id = $1`,
    [userId]
  );
  await client.query('UPDATE users SET is_profile_complete = $1 WHERE id = $2', [Boolean(checkRes.rows[0]?.complete), userId]);
}

app.post('/api/auth/register', async (req, res) => {
  const { type } = req.body;

  try {
    if (type === 'clube') {
      const {
        name, crNumber, responsibleName, phone, email,
        cep, address, addressNumber, complement, neighborhood, city, state,
        cnpj, password
      } = req.body;

      if (!name || !responsibleName || !email || !cnpj || !password) {
        return res.status(400).json({ error: 'Preencha todos os campos obrigatórios do cadastro de clube.' });
      }

      const cleanCnpj = String(cnpj).replace(/\D/g, '');
      const existingRes = await pool.query(
        `SELECT 1 FROM users WHERE regexp_replace(cpf, '[^0-9]', '', 'g') = $1`,
        [cleanCnpj]
      );
      if (existingRes.rows.length > 0) {
        return res.status(400).json({ error: 'Já existe um cadastro com este CNPJ.' });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const clubId = `club_${Date.now()}`;
        await client.query(
          `INSERT INTO clubs (id, name, cnpj, phone, is_premium, created_at, cr_number, responsible_name, email, cep, address, address_number, complement, neighborhood, city, state)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
          [clubId, name, cnpj, phone || null, false, new Date().toISOString().split('T')[0], crNumber || null, responsibleName, email, cep || null, address || null, addressNumber || null, complement || null, neighborhood || null, city || null, state || null]
        );

        const userId = `user_${Date.now()}`;
        const username = await uniqueUsername(client, slugify(name));
        await client.query(
          `INSERT INTO users (id, email, username, full_name, avatar_url, bio, is_club_member, member_since, role, has_paid_signature, club_id, is_profile_complete, cpf, phone, password_hash)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [userId, email, username, responsibleName, DEFAULT_AVATAR, `Administrador do clube ${name}.`, true, new Date().toISOString().split('T')[0], 'club_admin', false, clubId, true, cnpj, phone || null, hashPassword(password)]
        );
        await client.query('COMMIT');

        const fullUserRes = await client.query(
          `SELECT u.*, '[]'::json as followers, '[]'::json as following FROM users u WHERE id = $1`,
          [userId]
        );
        return res.status(201).json({ user: mapUser(fullUserRes.rows[0]) });
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }

    // type === 'membro' (default)
    const {
      fullName, birthDate, sex, rg, rgIssuer, rgIssueDate, fatherName, motherName,
      crNumber, crValidity, militaryRegion, nationality, phone, email,
      cep, address, addressNumber, complement, neighborhood, city, state,
      cpf, password, clubId
    } = req.body;

    if (!fullName || !email || !cpf || !password || !clubId) {
      return res.status(400).json({ error: 'Preencha todos os campos obrigatórios do cadastro.' });
    }

    const cleanCpf = String(cpf).replace(/\D/g, '');
    const existingRes = await pool.query(
      `SELECT 1 FROM users WHERE regexp_replace(cpf, '[^0-9]', '', 'g') = $1`,
      [cleanCpf]
    );
    if (existingRes.rows.length > 0) {
      return res.status(400).json({ error: 'Já existe um cadastro com este CPF.' });
    }

    const clubCheckRes = await pool.query('SELECT 1 FROM clubs WHERE id = $1', [clubId]);
    if (clubCheckRes.rows.length === 0) {
      return res.status(400).json({ error: 'Clube selecionado não encontrado.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const userId = `user_${Date.now()}`;
      const username = await uniqueUsername(client, slugify(fullName));
      await client.query(
        `INSERT INTO users (id, email, username, full_name, avatar_url, bio, cr_number, is_club_member, member_since, role, has_paid_signature, club_id, is_profile_complete, cpf, rg, phone, password_hash, birth_date, sex, rg_issuer, rg_issue_date, father_name, mother_name, cr_validity, military_region, nationality, cep, address, address_number, complement, neighborhood, city, state)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33)`,
        [userId, email, username, fullName, DEFAULT_AVATAR, 'Atleta federado do G&G Competições.', crNumber || null, true, new Date().toISOString().split('T')[0], 'member', false, clubId, false, cpf, rg || null, phone || null, hashPassword(password), birthDate || null, sex || null, rgIssuer || null, rgIssueDate || null, fatherName || null, motherName || null, crValidity || null, militaryRegion || null, nationality || null, cep || null, address || null, addressNumber || null, complement || null, neighborhood || null, city || null, state || null]
      );
      await recomputeUserProfileComplete(client, userId);
      await client.query('COMMIT');

      const fullUserRes = await client.query(
        `SELECT u.*, '[]'::json as followers, '[]'::json as following FROM users u WHERE id = $1`,
        [userId]
      );
      res.status(201).json({ user: mapUser(fullUserRes.rows[0]) });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Register database error:', err);
    res.status(500).json({ error: 'Erro ao realizar cadastro.' });
  }
});

// 1a2. Club-admin-initiated member registration ("Cadastrar Membros" in Painel
// Diretor) — creates the account with the minimum fields needed for a working
// CPF+senha login, without logging the admin in as the new member. The rest
// of the profile (RG, endereço, documentos) is completed afterwards through
// PATCH /api/admin/members/:id/profile, same section-by-section flow as
// "Meu Cadastro".
app.post('/api/admin/members', requireAdmin, async (req, res) => {
  const currentUser = (req as any).user as User;
  const { fullName, cpf, email, password } = req.body;

  if (!currentUser.clubId) {
    return res.status(400).json({ error: 'Sua conta não está vinculada a um clube.' });
  }
  if (!fullName || !cpf || !email || !password) {
    return res.status(400).json({ error: 'Preencha nome, CPF, e-mail e senha.' });
  }

  const cleanCpf = String(cpf).replace(/\D/g, '');
  const existingRes = await pool.query(
    `SELECT 1 FROM users WHERE regexp_replace(cpf, '[^0-9]', '', 'g') = $1`,
    [cleanCpf]
  );
  if (existingRes.rows.length > 0) {
    return res.status(400).json({ error: 'Já existe um cadastro com este CPF.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userId = `user_${Date.now()}`;
    const username = await uniqueUsername(client, slugify(fullName));
    await client.query(
      `INSERT INTO users (id, email, username, full_name, avatar_url, bio, is_club_member, member_since, role, has_paid_signature, club_id, is_profile_complete, cpf, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [userId, email, username, fullName, DEFAULT_AVATAR, 'Atleta federado do G&G Competições.', true, new Date().toISOString().split('T')[0], 'member', false, currentUser.clubId, false, cpf, hashPassword(password)]
    );
    await client.query('COMMIT');

    const fullUserRes = await pool.query(
      `SELECT u.*, '[]'::json as followers, '[]'::json as following FROM users u WHERE id = $1`,
      [userId]
    );
    res.status(201).json({ user: mapUser(fullUserRes.rows[0]) });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Admin create member database error:', e);
    res.status(500).json({ error: 'Erro ao cadastrar membro.' });
  } finally {
    client.release();
  }
});

// 1a3. Diretor-initiated club registration ("Novo Clube" in Painel Diretor >
// Gerenciamento Plataforma) — same shape as the public self-registration
// (type: 'clube') above: creates the club plus its club_admin login in one
// step, without logging the current admin in as that account. The rest of
// the club's profile (endereço, documentos) is completed afterwards through
// PATCH /api/clubs/:id, same as a club editing its own data.
app.post('/api/admin/clubs', requireAdmin, async (req, res) => {
  const { name, cnpj, responsibleName, email, password, phone, crNumber, city, state } = req.body;

  if (!name || !cnpj || !responsibleName || !email || !password) {
    return res.status(400).json({ error: 'Preencha nome, CNPJ, responsável, e-mail e senha.' });
  }

  const cleanCnpj = String(cnpj).replace(/\D/g, '');
  const existingRes = await pool.query(
    `SELECT 1 FROM clubs WHERE regexp_replace(cnpj, '[^0-9]', '', 'g') = $1`,
    [cleanCnpj]
  );
  if (existingRes.rows.length > 0) {
    return res.status(400).json({ error: 'Já existe um clube cadastrado com este CNPJ.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const clubId = `club_${Date.now()}`;
    await client.query(
      `INSERT INTO clubs (id, name, cnpj, phone, is_premium, created_at, cr_number, responsible_name, email, city, state)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [clubId, name, cnpj, phone || null, false, new Date().toISOString().split('T')[0], crNumber || null, responsibleName, email, city || null, state || null]
    );

    const userId = `user_${Date.now()}`;
    const username = await uniqueUsername(client, slugify(name));
    await client.query(
      `INSERT INTO users (id, email, username, full_name, avatar_url, bio, is_club_member, member_since, role, has_paid_signature, club_id, is_profile_complete, cpf, phone, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [userId, email, username, responsibleName, DEFAULT_AVATAR, `Administrador do clube ${name}.`, true, new Date().toISOString().split('T')[0], 'club_admin', false, clubId, true, cnpj, phone || null, hashPassword(password)]
    );
    await client.query('COMMIT');

    const clubRes = await client.query('SELECT * FROM clubs WHERE id = $1', [clubId]);
    res.status(201).json({ club: mapClub(clubRes.rows[0]) });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Admin create club database error:', e);
    res.status(500).json({ error: 'Erro ao cadastrar clube.' });
  } finally {
    client.release();
  }
});

// 1b. Document uploads (RG/CNH, CR, Declaração de filiação for members;
// Cartão CNPJ, CR, Alvará for clubs) — stored in MinIO, only a boolean
// "uploaded" flag is ever exposed to the client, never the storage key.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB, matches the legacy system's document upload limit
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Formato de arquivo não suportado. Envie PDF, JPG ou PNG.'));
  },
});

const handleUpload = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  upload.single('file')(req, res, (err: any) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Erro ao processar arquivo.' });
    }
    next();
  });
};

const USER_DOC_KIND_COLUMNS: Record<string, string> = {
  rg_cnh: 'doc_rg_cnh_key',
  cr: 'doc_cr_key',
  declaracao_filiacao: 'doc_declaracao_key',
};

const CLUB_DOC_KIND_COLUMNS: Record<string, string> = {
  cnpj_card: 'doc_cnpj_key',
  cr: 'doc_cr_key',
  alvara: 'doc_alvara_key',
};

// Regulamento/súmula PDFs — unlike user/club compliance docs, these need to be
// readable by any athlete (not just the uploader), so they're streamed through
// a separate public-ish endpoint below instead of the ownership-gated one.
const CHAMPIONSHIP_DOC_KIND_COLUMNS: Record<string, string> = {
  regulamento: 'regulamento_key',
  sumula: 'sumula_key',
};

app.post('/api/uploads', requireAuth, handleUpload, async (req, res) => {
  const currentUser = (req as any).user as User;
  const { kind, target, targetUserId, targetChampionshipId } = req.body as { kind?: string; target?: string; targetUserId?: string; targetChampionshipId?: string };
  const file = (req as any).file as Express.Multer.File | undefined;

  if (!storageEnabled) {
    return res.status(503).json({ error: 'Armazenamento de documentos não está configurado neste ambiente.' });
  }
  if (!file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  }

  const isClubTarget = target === 'club';
  const isChampionshipTarget = target === 'championship';
  const columnMap = isChampionshipTarget ? CHAMPIONSHIP_DOC_KIND_COLUMNS : isClubTarget ? CLUB_DOC_KIND_COLUMNS : USER_DOC_KIND_COLUMNS;
  const column = kind ? columnMap[kind] : undefined;
  if (!column) {
    return res.status(400).json({ error: 'Tipo de documento inválido.' });
  }

  let recordId: string;
  let table: 'users' | 'clubs' | 'championships';
  if (isChampionshipTarget) {
    if (!targetChampionshipId) {
      return res.status(400).json({ error: 'Campeonato não informado.' });
    }
    const champCheck = await pool.query('SELECT 1 FROM championships WHERE id = $1', [targetChampionshipId]);
    if (champCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Campeonato não encontrado.' });
    }
    recordId = targetChampionshipId;
    table = 'championships';
  } else if (targetUserId) {
    if (!ADMIN_ROLES.includes(currentUser.role) || !currentUser.clubId) {
      return res.status(403).json({ error: 'Apenas administradores do clube podem enviar documentos por um membro.' });
    }
    const memberCheck = await pool.query('SELECT club_id FROM users WHERE id = $1', [targetUserId]);
    if (memberCheck.rows.length === 0 || memberCheck.rows[0].club_id !== currentUser.clubId) {
      return res.status(403).json({ error: 'Este membro não pertence ao seu clube.' });
    }
    recordId = targetUserId;
    table = 'users';
  } else if (isClubTarget) {
    if (currentUser.role !== 'club_admin' || !currentUser.clubId) {
      return res.status(403).json({ error: 'Apenas o administrador do clube pode enviar estes documentos.' });
    }
    recordId = currentUser.clubId;
    table = 'clubs';
  } else {
    recordId = currentUser.id;
    table = 'users';
  }

  try {
    const ext = file.originalname.includes('.') ? file.originalname.split('.').pop() : 'bin';
    const objectKey = `${table}/${recordId}/${kind}-${Date.now()}.${ext}`;
    await uploadDocument(objectKey, file.buffer, file.mimetype);
    await pool.query(`UPDATE ${table} SET ${column} = $1 WHERE id = $2`, [objectKey, recordId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Upload document error:', err);
    res.status(500).json({ error: 'Erro ao enviar documento.' });
  }
});

app.get('/api/championships/:id/documents/:kind', requireAuth, async (req, res) => {
  const { id, kind } = req.params;

  if (!storageEnabled) {
    return res.status(503).json({ error: 'Armazenamento de documentos não está configurado neste ambiente.' });
  }

  const column = CHAMPIONSHIP_DOC_KIND_COLUMNS[kind];
  if (!column) {
    return res.status(400).json({ error: 'Tipo de documento inválido.' });
  }

  try {
    const r = await pool.query(`SELECT ${column} as key FROM championships WHERE id = $1`, [id]);
    const objectKey = r.rows[0]?.key || null;
    if (!objectKey) {
      return res.status(404).json({ error: 'Documento não encontrado.' });
    }

    const stream = await getDocumentStream(objectKey);
    res.setHeader('Content-Type', 'application/pdf');
    stream.on('error', (streamErr) => {
      console.error('Championship document stream error:', streamErr);
      if (!res.headersSent) res.status(500).json({ error: 'Erro ao baixar documento.' });
    });
    stream.pipe(res);
  } catch (err) {
    console.error('Get championship document error:', err);
    res.status(500).json({ error: 'Erro ao baixar documento.' });
  }
});

app.get('/api/uploads/:kind', requireAuth, async (req, res) => {
  const currentUser = (req as any).user as User;
  const { kind } = req.params;
  const isClubTarget = req.query.target === 'club';

  if (!storageEnabled) {
    return res.status(503).json({ error: 'Armazenamento de documentos não está configurado neste ambiente.' });
  }

  const columnMap = isClubTarget ? CLUB_DOC_KIND_COLUMNS : USER_DOC_KIND_COLUMNS;
  const column = columnMap[kind];
  if (!column) {
    return res.status(400).json({ error: 'Tipo de documento inválido.' });
  }

  try {
    let objectKey: string | null = null;
    if (isClubTarget) {
      if (currentUser.role !== 'club_admin' || !currentUser.clubId) {
        return res.status(403).json({ error: 'Acesso não autorizado.' });
      }
      const r = await pool.query(`SELECT ${column} as key FROM clubs WHERE id = $1`, [currentUser.clubId]);
      objectKey = r.rows[0]?.key || null;
    } else {
      const r = await pool.query(`SELECT ${column} as key FROM users WHERE id = $1`, [currentUser.id]);
      objectKey = r.rows[0]?.key || null;
    }

    if (!objectKey) {
      return res.status(404).json({ error: 'Documento não encontrado.' });
    }

    const stream = await getDocumentStream(objectKey);
    res.setHeader('Content-Type', 'application/octet-stream');
    stream.on('error', (streamErr) => {
      console.error('Document stream error:', streamErr);
      if (!res.headersSent) res.status(500).json({ error: 'Erro ao baixar documento.' });
    });
    stream.pipe(res);
  } catch (err) {
    console.error('Get document error:', err);
    res.status(500).json({ error: 'Erro ao baixar documento.' });
  }
});

// 1c. Progressive profile completion — "Meu cadastro". Lets an athlete or club
// admin fill in and save the registration data they skipped, one section at a
// time, across multiple visits, instead of requiring it all up front.
const USER_PROFILE_COLUMNS: Record<string, string> = {
  fullName: 'full_name',
  avatarUrl: 'avatar_url',
  birthDate: 'birth_date',
  sex: 'sex',
  rg: 'rg',
  rgIssuer: 'rg_issuer',
  rgIssueDate: 'rg_issue_date',
  fatherName: 'father_name',
  motherName: 'mother_name',
  crNumber: 'cr_number',
  crValidity: 'cr_validity',
  militaryRegion: 'military_region',
  nationality: 'nationality',
  phone: 'phone',
  cep: 'cep',
  address: 'address',
  addressNumber: 'address_number',
  complement: 'complement',
  neighborhood: 'neighborhood',
  city: 'city',
  state: 'state',
};

// Shared by a member editing their own "Meu Cadastro" and a club admin
// completing a member's profile on their behalf — same column whitelist,
// same live-recomputed completeness.
async function applyUserProfileFields(userId: string, body: Record<string, unknown>) {
  const updates: string[] = [];
  const values: unknown[] = [];

  for (const [key, column] of Object.entries(USER_PROFILE_COLUMNS)) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      updates.push(`${column} = $${updates.length + 1}`);
      values.push(body[key] || null);
    }
  }

  if (updates.length === 0) return null;

  values.push(userId);
  await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${values.length}`, values);
  await recomputeUserProfileComplete(pool, userId);

  const fullUserRes = await pool.query(
    `SELECT u.*,
      COALESCE((SELECT json_agg(follower_id) FROM follows WHERE following_id = u.id), '[]'::json) as followers,
      COALESCE((SELECT json_agg(following_id) FROM follows WHERE follower_id = u.id), '[]'::json) as following
    FROM users u WHERE id = $1`,
    [userId]
  );
  return fullUserRes.rows[0] ? mapUser(fullUserRes.rows[0]) : null;
}

app.patch('/api/users/me/profile', requireAuth, async (req, res) => {
  const currentUser = (req as any).user as User;
  try {
    const user = await applyUserProfileFields(currentUser.id, req.body);
    if (!user) return res.status(400).json({ error: 'Nenhum campo para atualizar.' });
    res.json({ user });
  } catch (err) {
    console.error('Update profile database error:', err);
    res.status(500).json({ error: 'Erro ao salvar cadastro.' });
  }
});

app.patch('/api/admin/members/:id/profile', requireAdmin, async (req, res) => {
  const currentUser = (req as any).user as User;
  const memberId = req.params.id;

  try {
    const memberCheck = await pool.query('SELECT club_id FROM users WHERE id = $1', [memberId]);
    if (memberCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Membro não encontrado.' });
    }
    if (memberCheck.rows[0].club_id !== currentUser.clubId) {
      return res.status(403).json({ error: 'Este membro não pertence ao seu clube.' });
    }

    const user = await applyUserProfileFields(memberId, req.body);
    if (!user) return res.status(400).json({ error: 'Nenhum campo para atualizar.' });
    res.json({ user });
  } catch (err) {
    console.error('Admin update member profile database error:', err);
    res.status(500).json({ error: 'Erro ao salvar cadastro do membro.' });
  }
});

const CLUB_PROFILE_COLUMNS: Record<string, string> = {
  name: 'name',
  crNumber: 'cr_number',
  responsibleName: 'responsible_name',
  phone: 'phone',
  email: 'email',
  cep: 'cep',
  address: 'address',
  addressNumber: 'address_number',
  complement: 'complement',
  neighborhood: 'neighborhood',
  city: 'city',
  state: 'state',
};

app.patch('/api/clubs/:id', requireAuth, async (req, res) => {
  const currentUser = (req as any).user as User;
  const clubId = req.params.id;

  if (currentUser.role !== 'club_admin' || currentUser.clubId !== clubId) {
    return res.status(403).json({ error: 'Apenas o administrador do clube pode editar estes dados.' });
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  for (const [key, column] of Object.entries(CLUB_PROFILE_COLUMNS)) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) {
      updates.push(`${column} = $${updates.length + 1}`);
      values.push(req.body[key] || null);
    }
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Nenhum campo para atualizar.' });
  }

  try {
    values.push(clubId);
    await pool.query(`UPDATE clubs SET ${updates.join(', ')} WHERE id = $${values.length}`, values);
    const clubRes = await pool.query('SELECT * FROM clubs WHERE id = $1', [clubId]);
    if (clubRes.rows.length === 0) {
      return res.status(404).json({ error: 'Clube não encontrado.' });
    }
    res.json({ club: mapClub(clubRes.rows[0]) });
  } catch (err) {
    console.error('Update club database error:', err);
    res.status(500).json({ error: 'Erro ao salvar dados do clube.' });
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

// Cadastro completo de campeonato — every field beyond the "quick create" basics
// (title/description/dates/fee/modalities/stagesCount/banner/club/type), all
// optional and dynamically inserted/updated so partial submissions never fail.
const CHAMPIONSHIP_EXTRA_COLUMNS: Record<string, string> = {
  valorX: 'valor_x',
  valorInscricaoClube: 'valor_inscricao_clube',
  valorInscricaoIndividual: 'valor_inscricao_individual',
  percentualClube: 'percentual_clube',
  valorReinscricao: 'valor_reinscricao',
  tipoPix: 'tipo_pix',
  chavePix: 'chave_pix',
  nomeExibidoPix: 'nome_exibido_pix',
  whatsappComprovante: 'whatsapp_comprovante',
  formatoPagamento: 'formato_pagamento',
  limiteEquipesClube: 'limite_equipes_clube',
  qtdAtletasPorEquipe: 'qtd_atletas_por_equipe',
  formatoInsercao: 'formato_insercao',
  alcanceCampeonato: 'alcance_campeonato',
  nivelCampeonato: 'nivel_campeonato',
  percentualTributos: 'percentual_tributos',
  percentualOrganizacao: 'percentual_organizacao',
  percentualClubes: 'percentual_clubes',
  percentualPremiacaoAtleta: 'percentual_premiacao_atleta',
  percentualPremiacaoClube: 'percentual_premiacao_clube',
  percentualPremiacaoTodasEtapas: 'percentual_premiacao_todas_etapas',
  premiacaoAdicionalTodasEtapas: 'premiacao_adicional_todas_etapas',
  qtdEtapasConsideradas: 'qtd_etapas_consideradas',
  qtdPioresDescartar: 'qtd_piores_descartar',
  qtdMelhoresDescartar: 'qtd_melhores_descartar',
  percentualPos1TodasEtapas: 'percentual_pos1_todas_etapas',
  percentualPos2TodasEtapas: 'percentual_pos2_todas_etapas',
  percentualPos3TodasEtapas: 'percentual_pos3_todas_etapas',
  percentualPos4TodasEtapas: 'percentual_pos4_todas_etapas',
  percentualPos5TodasEtapas: 'percentual_pos5_todas_etapas',
  percentualOuro: 'percentual_ouro',
  percentualPrata: 'percentual_prata',
  percentualBronze: 'percentual_bronze',
  percentualPos1Medalha: 'percentual_pos1_medalha',
  percentualPos2Medalha: 'percentual_pos2_medalha',
  percentualPos3Medalha: 'percentual_pos3_medalha',
  percentualPos4Medalha: 'percentual_pos4_medalha',
  percentualPos5Medalha: 'percentual_pos5_medalha',
  pontuacaoMinimaAtletaOuro: 'pontuacao_minima_atleta_ouro',
  pontuacaoMinimaAtletaPrata: 'pontuacao_minima_atleta_prata',
  pontuacaoMinimaAtletaBronze: 'pontuacao_minima_atleta_bronze',
  pontuacaoMinimaEquipeOuro: 'pontuacao_minima_equipe_ouro',
  pontuacaoMinimaEquipePrata: 'pontuacao_minima_equipe_prata',
  pontuacaoMinimaEquipeBronze: 'pontuacao_minima_equipe_bronze',
  ordemExibicao: 'ordem_exibicao',
  abertoOutrosClubes: 'aberto_outros_clubes',
};

app.post('/api/championships', requireAdmin, async (req, res) => {
  const { title, description, startDate, endDate, registrationFee, modalities, stagesCount, bannerUrl, clubId, type } = req.body;

  if (!title || !description || registrationFee === undefined || registrationFee === null || !modalities || !stagesCount) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios do campeonato.' });
  }

  const id = `champ_${Date.now()}`;
  const columns = ['id', 'title', 'description', 'start_date', 'end_date', 'registration_fee', 'modalities', 'stages_count', 'status', 'banner_url', 'club_id', 'type'];
  const values: unknown[] = [
    id, title, description, startDate, endDate, Number(registrationFee),
    JSON.stringify(Array.isArray(modalities) ? modalities : [modalities]),
    Number(stagesCount), 'open',
    bannerUrl || 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=800&auto=format&fit=crop&q=80',
    clubId || null, type === 'clube' ? 'clube' : 'individual'
  ];

  for (const [key, column] of Object.entries(CHAMPIONSHIP_EXTRA_COLUMNS)) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) {
      columns.push(column);
      values.push(req.body[key] === '' ? null : req.body[key]);
    }
  }

  try {
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    await pool.query(`INSERT INTO championships (${columns.join(', ')}) VALUES (${placeholders})`, values);
    const champRes = await pool.query('SELECT * FROM championships WHERE id = $1', [id]);
    res.status(201).json({ championship: mapChampionship(champRes.rows[0]) });
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

  if (!title || !description || registrationFee === undefined || registrationFee === null || !modalities || !stagesCount) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
  }

  try {
    const champRes = await pool.query('SELECT * FROM championships WHERE id = $1', [champId]);
    if (champRes.rows.length === 0) {
      return res.status(404).json({ error: 'Campeonato não encontrado.' });
    }

    const currentBanner = champRes.rows[0].banner_url;

    const columns = ['title', 'description', 'start_date', 'end_date', 'registration_fee', 'modalities', 'stages_count', 'banner_url'];
    const values: unknown[] = [
      title, description, startDate, endDate, Number(registrationFee),
      JSON.stringify(Array.isArray(modalities) ? modalities : [modalities]),
      Number(stagesCount),
      bannerUrl || currentBanner || 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=800&auto=format&fit=crop&q=80'
    ];

    for (const [key, column] of Object.entries(CHAMPIONSHIP_EXTRA_COLUMNS)) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        columns.push(column);
        values.push(req.body[key] === '' ? null : req.body[key]);
      }
    }

    values.push(champId);
    const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
    await pool.query(`UPDATE championships SET ${setClause} WHERE id = $${values.length}`, values);

    const updatedRes = await pool.query('SELECT * FROM championships WHERE id = $1', [champId]);
    res.json({ success: true, championship: mapChampionship(updatedRes.rows[0]) });
  } catch (err) {
    console.error('Update championship database error:', err);
    res.status(500).json({ error: 'Erro ao atualizar campeonato.' });
  }
});

app.delete('/api/championships/:id', requireAdmin, async (req, res) => {
  const championshipId = req.params.id;
  try {
    const regsCheck = await pool.query('SELECT COUNT(*) FROM registrations WHERE championship_id = $1', [championshipId]);
    const regsCount = parseInt(regsCheck.rows[0].count, 10);
    if (regsCount > 0) {
      return res.status(400).json({ error: 'Não é possível excluir um campeonato que possui inscrições de atletas.' });
    }

    const deleteRes = await pool.query('DELETE FROM championships WHERE id = $1', [championshipId]);
    if (deleteRes.rowCount === 0) {
      return res.status(404).json({ error: 'Campeonato não encontrado.' });
    }

    res.json({ message: 'Campeonato excluído com sucesso.' });
  } catch (err) {
    console.error('Delete championship database error:', err);
    res.status(500).json({ error: 'Erro ao excluir campeonato no banco de dados.' });
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

app.post('/api/registrations/pay-batch', requireAuth, async (req, res) => {
  const { registrationIds, paymentMethod } = req.body;
  if (!Array.isArray(registrationIds) || registrationIds.length === 0) {
    return res.status(400).json({ error: 'Nenhuma inscrição selecionada para pagamento.' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const txId = `tx_gg_${Math.random().toString(36).substring(2, 12)}`;

    await pool.query(
      `UPDATE registrations
       SET payment_status = 'approved', approved_at = NOW(), tx_id = $1, data_pagamento = $2, payment_method = $3
       WHERE id = ANY($4::text[])`,
      [txId, today, paymentMethod || 'pix', registrationIds]
    );

    res.json({ success: true, txId, paidCount: registrationIds.length });
  } catch (err) {
    console.error('Batch payment error:', err);
    res.status(500).json({ error: 'Erro ao processar pagamento das inscrições.' });
  }
});

app.post('/api/championships/:id/register', requireAuth, async (req, res) => {
  const championshipId = req.params.id;
  const { modalityId, stageId, weaponId, crNumber, paymentMethod } = req.body;
  const currentUser = (req as any).user as User;

  if (!modalityId || !stageId || !weaponId || !crNumber || !paymentMethod) {
    return res.status(400).json({ error: 'Inscrição requer modalidade, etapa, arma, CR válido e meio de pagamento.' });
  }

  if (!currentUser.isProfileComplete) {
    return res.status(403).json({ error: 'Complete seu cadastro antes de se inscrever em campeonatos.' });
  }

  try {
    const champRes = await pool.query('SELECT * FROM championships WHERE id = $1', [championshipId]);
    if (champRes.rows.length === 0) {
      return res.status(404).json({ error: 'Campeonato não encontrado.' });
    }
    const champ = mapChampionship(champRes.rows[0]);

    // Validar sexo do atleta com a etapa
    const stageRes = await pool.query('SELECT sexo FROM stages WHERE id = $1', [stageId]);
    if (stageRes.rows.length > 0) {
      const stageSex = (stageRes.rows[0].sexo || 'misto').toLowerCase();
      if (stageSex !== 'misto') {
        const userSex = (currentUser.sex || '').toLowerCase();
        if (userSex !== stageSex) {
          return res.status(403).json({ error: `Esta etapa é restrita para atletas do sexo ${stageSex === 'feminino' ? 'Feminino' : 'Masculino'}.` });
        }
      }
    }

    const alreadyRegisteredRes = await pool.query(
      'SELECT 1 FROM registrations WHERE championship_id = $1 AND user_id = $2 AND modality_id = $3 AND stage_id = $4',
      [championshipId, currentUser.id, modalityId, stageId]
    );

    const isReinscricao = alreadyRegisteredRes.rows.length > 0;
    const registrationType = isReinscricao ? 'reinscrição' : 'normal';
    const valorPago = isReinscricao
      ? (champ.valorReinscricao ?? champ.registrationFee)
      : (champ.valorInscricaoIndividual ?? champ.registrationFee);
    const dataPagamento = new Date().toISOString().split('T')[0];

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
      penalty: 0,
      registeredByUserId: currentUser.id,
      registrationType,
      valorPago,
      dataPagamento
    };

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO registrations (
          id, championship_id, user_id, club_id, modality_id, stage_id, weapon_id, cr_number,
          payment_method, payment_status, completion_status, registered_at, approved_at, tx_id,
          disqualified, penalty, registered_by_user_id, registration_type, valor_pago, data_pagamento
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
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
          newReg.penalty,
          newReg.registeredByUserId,
          newReg.registrationType,
          newReg.valorPago,
          newReg.dataPagamento
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

app.post('/api/modalities', requireAdmin, async (req, res) => {
  const { name, seriesCount, shotsPerSeries, timePerSeriesMinutes, evaluationType } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Nome da modalidade é obrigatório.' });
  }

  const id = `mod_${Date.now()}`;
  try {
    const result = await pool.query(
      `INSERT INTO modalities (id, name, series_count, shots_per_series, time_per_series_minutes, evaluation_type)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, name, seriesCount || null, shotsPerSeries || null, timePerSeriesMinutes || null, evaluationType || null]
    );
    res.status(201).json({ modality: mapModality(result.rows[0]) });
  } catch (err) {
    console.error('Create modality database error:', err);
    res.status(500).json({ error: 'Erro ao cadastrar modalidade.' });
  }
});

app.delete('/api/modalities/:id', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM modalities WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Modalidade não encontrada.' });
    }
    res.json({ success: true });
  } catch (err: any) {
    if (err.code === '23503') {
      return res.status(400).json({ error: 'Não é possível remover: esta modalidade já está em uso em inscrições ou campeonatos.' });
    }
    console.error('Delete modality database error:', err);
    res.status(500).json({ error: 'Erro ao remover modalidade.' });
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

// Cadastro completo de etapas — every field beyond campeonato/título/data de
// início, all optional and dynamically inserted/updated.
const STAGE_EXTRA_COLUMNS: Record<string, string> = {
  description: 'description',
  endDate: 'end_date',
  sexo: 'sexo',
  homologarResultado: 'homologar_resultado',
  abertoParaResultados: 'aberto_para_resultados',
  gerarCertificados: 'gerar_certificados',
  fatorMultiplicacaoResultados: 'fator_multiplicacao_resultados',
  exibirInscritosPaginaInicial: 'exibir_inscritos_pagina_inicial',
  incluirNaSomaPaginaInicial: 'incluir_na_soma_pagina_inicial',
};

app.post('/api/stages', requireAdmin, async (req, res) => {
  const { championshipId, title, date } = req.body;
  if (!championshipId || !title || !date) {
    return res.status(400).json({ error: 'Selecione o campeonato, título e data de início.' });
  }

  try {
    const champCheck = await pool.query('SELECT 1 FROM championships WHERE id = $1', [championshipId]);
    if (champCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Campeonato não encontrado.' });
    }

    const numRes = await pool.query('SELECT COALESCE(MAX(stage_num), 0) + 1 as next FROM stages WHERE championship_id = $1', [championshipId]);
    const stageNum = numRes.rows[0].next;
    const id = `stage_${Date.now()}`;

    const columns = ['id', 'championship_id', 'stage_num', 'title', 'date'];
    const values: unknown[] = [id, championshipId, stageNum, title, date];

    for (const [key, column] of Object.entries(STAGE_EXTRA_COLUMNS)) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        columns.push(column);
        values.push(req.body[key] === '' ? null : req.body[key]);
      }
    }

    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    await pool.query(`INSERT INTO stages (${columns.join(', ')}) VALUES (${placeholders})`, values);
    const stageRes = await pool.query('SELECT * FROM stages WHERE id = $1', [id]);
    res.status(201).json({ stage: mapStage(stageRes.rows[0]) });
  } catch (err) {
    console.error('Create stage database error:', err);
    res.status(500).json({ error: 'Erro ao cadastrar etapa.' });
  }
});

app.put('/api/stages/:id', requireAdmin, async (req, res) => {
  const stageId = req.params.id;
  const { title, date } = req.body;
  if (!title || !date) {
    return res.status(400).json({ error: 'Preencha título e data de início.' });
  }

  try {
    const stageCheck = await pool.query('SELECT 1 FROM stages WHERE id = $1', [stageId]);
    if (stageCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Etapa não encontrada.' });
    }

    const columns = ['title', 'date'];
    const values: unknown[] = [title, date];

    for (const [key, column] of Object.entries(STAGE_EXTRA_COLUMNS)) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        columns.push(column);
        values.push(req.body[key] === '' ? null : req.body[key]);
      }
    }

    values.push(stageId);
    const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
    await pool.query(`UPDATE stages SET ${setClause} WHERE id = $${values.length}`, values);

    const updatedRes = await pool.query('SELECT * FROM stages WHERE id = $1', [stageId]);
    res.json({ stage: mapStage(updatedRes.rows[0]) });
  } catch (err) {
    console.error('Update stage database error:', err);
    res.status(500).json({ error: 'Erro ao atualizar etapa.' });
  }
});

app.delete('/api/stages/:id', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM stages WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Etapa não encontrada.' });
    }
    res.json({ success: true });
  } catch (err: any) {
    if (err.code === '23503') {
      return res.status(400).json({ error: 'Não é possível remover: esta etapa já possui inscrições ou resultados vinculados.' });
    }
    console.error('Delete stage database error:', err);
    res.status(500).json({ error: 'Erro ao remover etapa.' });
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
  const { ownerId, manufacturer, model, caliber, serialNumber, weaponNumber, sigmaNumber, weaponClass, permissionStatus, registrySystem } = req.body;

  if (!manufacturer || !model || !caliber) {
    return res.status(400).json({ error: 'Preencha fabricante, modelo e calibre.' });
  }

  // Members can only register weapons for themselves. Club admins may register
  // on behalf of their own club — even if a different ownerId is sent, it's
  // ignored and forced back to their club. Only master_admin can target an
  // arbitrary owner via the request body.
  let resolvedOwnerId = currentUser.id;
  if (ownerId) {
    if (currentUser.role === 'master_admin') {
      resolvedOwnerId = ownerId;
    } else if (ADMIN_ROLES.includes(currentUser.role) && currentUser.clubId) {
      resolvedOwnerId = currentUser.clubId;
    }
  }

  // "Registro" isn't part of the real Cadastro de Armas form — derive it from
  // whichever identifier the club actually filled in.
  const resolvedSerialNumber = serialNumber || sigmaNumber || weaponNumber || `SIGMA-${Date.now()}`;

  const newWeapon: Weapon = {
    id: `weapon_${Date.now()}`,
    ownerId: resolvedOwnerId,
    manufacturer,
    model,
    caliber,
    serialNumber: resolvedSerialNumber,
    weaponNumber: weaponNumber || undefined,
    sigmaNumber: sigmaNumber || undefined,
    weaponClass: weaponClass || undefined,
    permissionStatus: permissionStatus || undefined,
    registrySystem: registrySystem || undefined,
  };

  try {
    await pool.query(
      `INSERT INTO weapons (id, owner_id, manufacturer, model, caliber, serial_number, weapon_number, sigma_number, class, permission_status, registry_system)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        newWeapon.id,
        newWeapon.ownerId,
        newWeapon.manufacturer,
        newWeapon.model,
        newWeapon.caliber,
        newWeapon.serialNumber,
        newWeapon.weaponNumber || null,
        newWeapon.sigmaNumber || null,
        newWeapon.weaponClass || null,
        newWeapon.permissionStatus || null,
        newWeapon.registrySystem || null
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

app.put('/api/weapons/:id', requireAuth, async (req, res) => {
  const currentUser = (req as any).user as User;
  const weaponId = req.params.id;
  const { manufacturer, model, caliber, weaponNumber, sigmaNumber, weaponClass, permissionStatus, registrySystem } = req.body;

  try {
    const weaponRes = await pool.query('SELECT * FROM weapons WHERE id = $1', [weaponId]);
    if (weaponRes.rows.length === 0) {
      return res.status(404).json({ error: 'Arma não encontrada.' });
    }
    const weapon = mapWeapon(weaponRes.rows[0]);

    const canEdit = weapon.ownerId === currentUser.id || (ADMIN_ROLES.includes(currentUser.role) && weapon.ownerId === currentUser.clubId);
    if (!canEdit) {
      return res.status(403).json({ error: 'Você não tem permissão para editar esta arma.' });
    }

    await pool.query(
      `UPDATE weapons SET
        manufacturer     = COALESCE($1, manufacturer),
        model            = COALESCE($2, model),
        caliber          = COALESCE($3, caliber),
        weapon_number    = $4,
        sigma_number     = $5,
        weapon_class     = $6,
        permission_status = $7,
        registry_system  = $8
       WHERE id = $9`,
      [manufacturer, model, caliber, weaponNumber || null, sigmaNumber || null,
       weaponClass || null, permissionStatus || null, registrySystem || null, weaponId]
    );

    const updated = await pool.query('SELECT * FROM weapons WHERE id = $1', [weaponId]);
    res.json({ weapon: mapWeapon(updated.rows[0]) });
  } catch (err) {
    console.error('Update weapon error:', err);
    res.status(500).json({ error: 'Erro ao atualizar arma.' });
  }
});



// Managed dropdown lists for the weapon form (Classe/Modelo/Calibre/Fabricante/
// Arma é/Status de permissão). Reading is open (club admins need it to populate
// the weapon form); writing is restricted to master_admin.
function mapWeaponLookupOption(o: any): WeaponLookupOption {
  return { id: o.id, kind: o.kind, label: o.label, createdAt: o.created_at };
}

app.get('/api/weapon-lookups', async (req, res) => {
  try {
    const { kind } = req.query;
    const result = kind
      ? await pool.query('SELECT * FROM weapon_lookup_options WHERE kind = $1 ORDER BY label ASC', [kind])
      : await pool.query('SELECT * FROM weapon_lookup_options ORDER BY kind ASC, label ASC');
    res.json({ options: result.rows.map(mapWeaponLookupOption) });
  } catch (err) {
    console.error('Fetch weapon lookup options database error:', err);
    res.status(500).json({ error: 'Erro ao buscar listas de armas.' });
  }
});

const WEAPON_LOOKUP_KINDS = ['classe', 'modelo', 'calibre', 'fabricante', 'tipo_arma', 'permissao_arma'];

app.post('/api/weapon-lookups', requireMasterAdmin, async (req, res) => {
  const { kind, label } = req.body;
  if (!kind || !WEAPON_LOOKUP_KINDS.includes(kind) || !label) {
    return res.status(400).json({ error: 'Informe a lista (kind) e o nome do item.' });
  }

  const id = `wlo_${Date.now()}`;
  try {
    const result = await pool.query(
      `INSERT INTO weapon_lookup_options (id, kind, label, created_at) VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, kind, label, new Date().toISOString().split('T')[0]]
    );
    res.status(201).json({ option: mapWeaponLookupOption(result.rows[0]) });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Este item já existe nesta lista.' });
    }
    console.error('Create weapon lookup option database error:', err);
    res.status(500).json({ error: 'Erro ao cadastrar item.' });
  }
});

app.put('/api/weapon-lookups/:id', requireMasterAdmin, async (req, res) => {
  const { label } = req.body;
  if (!label) {
    return res.status(400).json({ error: 'Informe o nome do item.' });
  }

  try {
    const result = await pool.query(
      `UPDATE weapon_lookup_options SET label = $1 WHERE id = $2 RETURNING *`,
      [label, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item não encontrado.' });
    }
    res.json({ option: mapWeaponLookupOption(result.rows[0]) });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Este item já existe nesta lista.' });
    }
    console.error('Update weapon lookup option database error:', err);
    res.status(500).json({ error: 'Erro ao atualizar item.' });
  }
});

app.delete('/api/weapon-lookups/:id', requireMasterAdmin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM weapon_lookup_options WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item não encontrado.' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Delete weapon lookup option database error:', err);
    res.status(500).json({ error: 'Erro ao remover item.' });
  }
});

// ---- NEW: Weapon search by serial/sigma number ----
app.get('/api/weapons/search', requireAuth, async (req, res) => {
  const currentUser = (req as any).user as User;
  const q = (req.query.q as string || '').trim();
  if (!q || q.length < 2) return res.json({ weapons: [] });
  try {
    let rows;
    if (['master_admin', 'admin'].includes(currentUser.role) && !currentUser.clubId) {
      // master_admin (without club context) can search all weapons in the system
      const r = await pool.query(
        `SELECT w.*, u.full_name as owner_name, c.name as club_name FROM weapons w
         LEFT JOIN users u ON u.id = w.owner_id
         LEFT JOIN clubs c ON c.id = u.club_id OR c.id = w.owner_id
         WHERE w.sigma_number ILIKE $1 OR w.weapon_number ILIKE $1
         ORDER BY w.sigma_number LIMIT 20`,
        [`%${q}%`]
      );
      rows = r.rows;
    } else {
      // club_admin / admin with club context: search club-owned weapons OR club-member-owned weapons
      const targetClubId = currentUser.clubId || '';
      const r = await pool.query(
        `SELECT w.*, u.full_name as owner_name, c.name as club_name FROM weapons w
         LEFT JOIN users u ON u.id = w.owner_id
         LEFT JOIN clubs c ON c.id = u.club_id OR c.id = w.owner_id
         WHERE (w.owner_id = $1 OR u.club_id = $1) AND (w.sigma_number ILIKE $2 OR w.weapon_number ILIKE $2)
         ORDER BY w.sigma_number LIMIT 20`,
        [targetClubId, `%${q}%`]
      );
      rows = r.rows;
    }
    res.json({ weapons: rows.map(mapWeapon) });
  } catch (err) {
    console.error('Weapon search error:', err);
    res.status(500).json({ error: 'Erro ao buscar armas.' });
  }
});

// ---- NEW: List club members with their weapons (for bulk registration) ----
app.get('/api/club-members', requireAdmin, async (req, res) => {
  const currentUser = (req as any).user as User;
  try {
    const clubId = currentUser.role === 'master_admin'
      ? (req.query.clubId as string)
      : currentUser.clubId;
    if (!clubId) return res.status(400).json({ error: 'Club ID obrigatório.' });

    const usersRes = await pool.query(
      `SELECT u.*,
        COALESCE((SELECT json_agg(follower_id) FROM follows WHERE following_id = u.id), '[]'::json) as followers,
        COALESCE((SELECT json_agg(following_id) FROM follows WHERE follower_id = u.id), '[]'::json) as following
       FROM users u WHERE u.club_id = $1 AND u.role = 'member' ORDER BY u.full_name`,
      [clubId]
    );
    const members = usersRes.rows.map(mapUser);

    // Attach weapons for each member
    const weaponsRes = await pool.query(
      `SELECT w.* FROM weapons w
       JOIN users u ON u.id = w.owner_id
       WHERE u.club_id = $1`,
      [clubId]
    );
    const weapons = weaponsRes.rows.map(mapWeapon);

    res.json({ members, weapons });
  } catch (err) {
    console.error('Club members error:', err);
    res.status(500).json({ error: 'Erro ao buscar membros.' });
  }
});

// ---- NEW: List registrations (enriched) for admin result entry ----
app.get('/api/admin/registrations', requireAdmin, async (req, res) => {
  const currentUser = (req as any).user as User;
  const { championshipId, stageId, modalityId, allClubs } = req.query;
  try {
    let query = `SELECT r.*,
      u.full_name as athlete_name, u.cr_number as athlete_cr,
      c.name as club_name,
      m.name as modality_name, m.series_count, m.shots_per_series, m.evaluation_type,
      w.model as weapon_model, w.serial_number as weapon_serial, w.sigma_number
      FROM registrations r
      LEFT JOIN users u ON u.id = r.user_id
      LEFT JOIN clubs c ON c.id = r.club_id
      LEFT JOIN modalities m ON m.id = r.modality_id
      LEFT JOIN weapons w ON w.id = r.weapon_id
      WHERE 1=1`;
    const params: any[] = [];
    let idx = 1;
    if (championshipId) { query += ` AND r.championship_id = $${idx++}`; params.push(championshipId); }
    if (stageId)        { query += ` AND r.stage_id = $${idx++}`;        params.push(stageId); }
    if (modalityId)     { query += ` AND r.modality_id = $${idx++}`;     params.push(modalityId); }
    // Only restrict to club_id if NOT explicitly requested as allClubs (e.g. Gerenciamento de Clube)
    if (allClubs !== 'true' && currentUser.role === 'club_admin') {
      query += ` AND r.club_id = $${idx++}`;
      params.push(currentUser.clubId);
    }
    query += ' ORDER BY u.full_name';
    const result = await pool.query(query, params);
    const registrations = result.rows.map(r => ({
      ...mapRegistration(r),
      athleteName: r.athlete_name,
      athleteCr: r.athlete_cr,
      clubName: r.club_name,
      modalityName: r.modality_name,
      seriesCount: r.series_count,
      shotsPerSeries: r.shots_per_series,
      evaluationType: r.evaluation_type,
      weaponModel: r.weapon_model,
      weaponSerial: r.weapon_serial,
      weaponSigma: r.sigma_number,
    }));
    res.json({ registrations });
  } catch (err) {
    console.error('Fetch registrations error:', err);
    res.status(500).json({ error: 'Erro ao buscar inscrições.' });
  }
});

// ---- NEW: Bulk registration by club admin ----
app.post('/api/championships/:id/register-bulk', requireAdmin, async (req, res) => {
  const championshipId = req.params.id;
  const { stageId, modalityId, athletes } = req.body as {
    stageId: string;
    modalityId: string;
    athletes: Array<{ userId: string; weaponId: string; crNumber: string }>;
  };
  const currentUser = (req as any).user as User;

  if (!stageId || !modalityId || !Array.isArray(athletes) || athletes.length === 0) {
    return res.status(400).json({ error: 'stageId, modalityId e athletes são obrigatórios.' });
  }

  const champRes = await pool.query('SELECT * FROM championships WHERE id = $1', [championshipId]);
  if (champRes.rows.length === 0) return res.status(404).json({ error: 'Campeonato não encontrado.' });
  const champ = mapChampionship(champRes.rows[0]);

  const results: Array<{ userId: string; status: 'inscrito' | 'reinscrito' | 'erro'; message?: string }> = [];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const athlete of athletes) {
      try {
        // Validar sexo do atleta com a etapa
        const stageRes = await client.query('SELECT sexo FROM stages WHERE id = $1', [stageId]);
        const userSexRes = await client.query('SELECT sex FROM users WHERE id = $1', [athlete.userId]);
        if (stageRes.rows.length > 0 && userSexRes.rows.length > 0) {
          const stageSex = (stageRes.rows[0].sexo || 'misto').toLowerCase();
          if (stageSex !== 'misto') {
            const userSex = (userSexRes.rows[0].sex || '').toLowerCase();
            if (userSex !== stageSex) {
              throw new Error(`Atleta não possui o sexo compatível com esta etapa (${stageSex === 'feminino' ? 'Feminino' : 'Masculino'}).`);
            }
          }
        }

        const existing = await client.query(
          'SELECT id FROM registrations WHERE championship_id=$1 AND user_id=$2 AND modality_id=$3 AND stage_id=$4',
          [championshipId, athlete.userId, modalityId, stageId]
        );
        const isReinscricao = existing.rows.length > 0;
        const regType = isReinscricao ? 'reinscrição' : 'normal';
        const userRes = await client.query('SELECT club_id FROM users WHERE id = $1', [athlete.userId]);
        const clubId = userRes.rows[0]?.club_id || currentUser.clubId;

        const valorPago = isReinscricao
          ? (champ.valorReinscricao ?? champ.registrationFee)
          : (champ.valorInscricaoClube ?? champ.registrationFee);
        const dataPagamento = new Date().toISOString().split('T')[0];

        await client.query(
          `INSERT INTO registrations
            (id, championship_id, user_id, club_id, modality_id, stage_id, weapon_id, cr_number,
             payment_method, payment_status, completion_status, registered_at, approved_at,
             registered_by_user_id, registration_type, valor_pago, data_pagamento, disqualified, penalty)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pix','approved','pending',$9,$9,$10,$11,$12,$13,false,0)`,
          [
            `reg_${Date.now()}_${athlete.userId.slice(-4)}`,
            championshipId, athlete.userId, clubId, modalityId, stageId, athlete.weaponId,
            athlete.crNumber, new Date().toISOString(), currentUser.id, regType, valorPago, dataPagamento
          ]
        );
        results.push({ userId: athlete.userId, status: isReinscricao ? 'reinscrito' : 'inscrito' });
      } catch (e: any) {
        results.push({ userId: athlete.userId, status: 'erro', message: e.message });
      }
    }
    await client.query('COMMIT');
    res.status(201).json({ success: true, results });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
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
  const {
    registrationId, acao,
    dataExecucao, horaExecucao,
    series, penalidade,
    // Legacy single-score fallback (stageNum + score + timeSeconds)
    stageNum, score, timeSeconds
  } = req.body;

  if (!registrationId) return res.status(400).json({ error: 'registrationId obrigatório.' });
  if (!acao || !['salvar', 'nao_participou', 'desclassificar'].includes(acao)) {
    return res.status(400).json({ error: "acao deve ser 'salvar', 'nao_participou' ou 'desclassificar'." });
  }
  if (acao === 'salvar') {
    if (!dataExecucao) {
      return res.status(400).json({ error: 'A data de execução é obrigatória para cadastrar o resultado.' });
    }
    if (!horaExecucao) {
      return res.status(400).json({ error: 'A hora de execução é obrigatória para cadastrar o resultado.' });
    }
  }

  try {
    const regRes = await pool.query('SELECT * FROM registrations WHERE id = $1', [registrationId]);
    if (regRes.rows.length === 0) return res.status(404).json({ error: 'Inscrição não localizada.' });
    const reg = mapRegistration(regRes.rows[0]);

    const shooterRes = await pool.query('SELECT * FROM users WHERE id = $1', [reg.userId]);
    if (shooterRes.rows.length === 0) return res.status(404).json({ error: 'Atleta não localizado.' });
    const shooter = mapUser(shooterRes.rows[0]);

    const modalityRes = await pool.query('SELECT * FROM modalities WHERE id = $1', [reg.modalityId]);
    const modalityRow = modalityRes.rows[0];
    const modalityName = modalityRow ? mapModality(modalityRow).name : reg.modalityId;
    const evaluationType = modalityRow?.evaluation_type || 'pontuacao';

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // ---- Ação: Não Participou ----
      if (acao === 'nao_participou') {
        await client.query(
          `UPDATE registrations SET completion_status='absent', data_execucao=$1, hora_execucao=$2 WHERE id=$3`,
          [dataExecucao || null, horaExecucao || null, registrationId]
        );
        await client.query('COMMIT');
        return res.json({ success: true, acao: 'nao_participou' });
      }

      // ---- Ação: Desclassificar ----
      if (acao === 'desclassificar') {
        await client.query(
          `UPDATE registrations SET disqualified=true, completion_status='completed', data_execucao=$1, hora_execucao=$2 WHERE id=$3`,
          [dataExecucao || null, horaExecucao || null, registrationId]
        );
        await client.query('COMMIT');
        return res.json({ success: true, acao: 'desclassificar' });
      }

      // ---- Ação: Salvar Resultados ----
      // Supports two modes:
      // a) New mode: series[] array with zone breakdown per series
      // b) Legacy fallback: single score + timeSeconds (old UI still works)

      let bestSerie: any = null;
      let totalPontos = 0;
      let seriesPontos: any[] = [];
      let seriesTempos: any[] = [];
      let idscTotalSeg: number | undefined;

      if (Array.isArray(series) && series.length > 0) {
        // Validação da quantidade de tiros contra o shots_per_series da modalidade
        const expectedShots = modalityRow?.shots_per_series || 0;
        if (expectedShots > 0) {
          const zones = ['x','p10','p9','p8','p7','p6','p5','p4','p3','p2','p1','p0'];
          for (let i = 0; i < series.length; i++) {
            const s = series[i];
            const sum = zones.reduce((acc, z) => acc + (Number(s[z]) || 0), 0);
            if (sum !== expectedShots) {
              await client.query('ROLLBACK');
              return res.status(400).json({
                error: `A Série ${i + 1} possui ${sum} tiros informados, mas a modalidade exige exatamente ${expectedShots} tiros.`
              });
            }
          }
        }

        // a) New per-series mode
        const champRes = await client.query('SELECT valor_x FROM championships WHERE id = $1', [championshipId]);
        const champRow = champRes.rows[0];
        const xScoreValue = (champRow && champRow.valor_x !== null) ? Number(champRow.valor_x) : 11;

        seriesPontos = series.map((s: any, idx: number) => {
          const zones = ['x','p10','p9','p8','p7','p6','p5','p4','p3','p2','p1','p0'];
          const total = (Number(s.x)||0)*xScoreValue + (Number(s.p10)||0)*10 + (Number(s.p9)||0)*9
            + (Number(s.p8)||0)*8 + (Number(s.p7)||0)*7 + (Number(s.p6)||0)*6
            + (Number(s.p5)||0)*5 + (Number(s.p4)||0)*4 + (Number(s.p3)||0)*3
            + (Number(s.p2)||0)*2 + (Number(s.p1)||0)*1;
          return { serie: idx+1, total, ...Object.fromEntries(zones.map(z => [z, Number(s[z])||0])) };
        });
        seriesTempos = series.map((s: any, idx: number) => ({
          serie: idx+1, tempo_ms: Number(s.tempo_ms)||0
        }));
        // Best series = highest total
        bestSerie = seriesPontos.reduce((best: any, cur: any) => cur.total > best.total ? cur : best, seriesPontos[0]);
        totalPontos = bestSerie.total;
        const totalMs = seriesTempos.reduce((sum: number, t: any) => sum + (t.tempo_ms||0), 0);
        if (evaluationType === 'pontuacao_tempo' || evaluationType === 'tempo') {
          idscTotalSeg = totalMs / 1000;
        }
      } else {
        // b) Legacy single score fallback
        totalPontos = Number(score) || 0;
        bestSerie = { total: totalPontos, x:0, p10:Math.round(totalPontos/10), p9:0, p8:0, p7:0, p6:0, p5:0, p4:0, p3:0, p2:0, p1:0, p0:0 };
        if (timeSeconds) idscTotalSeg = Number(timeSeconds);
      }

      const penValue = Number(penalidade) || 0;

      // Update registration with full score breakdown
      await client.query(`
        UPDATE registrations SET
          completion_status = 'completed',
          total_points = $1,
          score_x = $2, score_p10 = $3, score_p9 = $4, score_p8 = $5, score_p7 = $6,
          score_p6 = $7, score_p5 = $8, score_p4 = $9, score_p3 = $10,
          score_p2 = $11, score_p1 = $12, score_p0 = $13,
          idsc_total_seconds = $14,
          penalty = $15,
          data_execucao = $16, hora_execucao = $17,
          series_pontos = $18, series_tempos = $19,
          disqualified = false
        WHERE id = $20`,
        [
          totalPontos,
          bestSerie.x||0, bestSerie.p10||0, bestSerie.p9||0, bestSerie.p8||0, bestSerie.p7||0,
          bestSerie.p6||0, bestSerie.p5||0, bestSerie.p4||0, bestSerie.p3||0,
          bestSerie.p2||0, bestSerie.p1||0, bestSerie.p0||0,
          idscTotalSeg || null,
          penValue,
          dataExecucao || null, horaExecucao || null,
          seriesPontos.length > 0 ? JSON.stringify(seriesPontos) : null,
          seriesTempos.length > 0 ? JSON.stringify(seriesTempos) : null,
          registrationId
        ]
      );

      // Also maintain stage_scores table for rankings compatibility
      const effectiveStageNum = stageNum || 1;
      const hitFactor = idscTotalSeg && idscTotalSeg > 0
        ? Number((totalPontos / idscTotalSeg).toFixed(4)) : undefined;

      await client.query(
        `DELETE FROM stage_scores WHERE championship_id=$1 AND registration_id=$2`,
        [championshipId, registrationId]
      );
      await client.query(
        `INSERT INTO stage_scores (id, championship_id, registration_id, user_id, shooter_name, modality, stage_num, score, time_seconds, hit_factor, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          `score_${Date.now()}`, championshipId, registrationId, reg.userId,
          shooter.fullName, modalityName, Number(effectiveStageNum),
          totalPontos, idscTotalSeg || null, hitFactor || null, new Date().toISOString()
        ]
      );

      await client.query('COMMIT');
      res.status(201).json({ success: true, totalPontos, bestSerie, acao: 'salvar' });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
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
// WEAPON CONCESSIONS
// ==========================================

// Search club members by CPF or name (debounced autocomplete — avoids loading 2500+ records at once)
app.get('/api/members/search', requireAdmin, async (req, res) => {
  const currentUser = (req as any).user as User;
  const q = (req.query.q as string || '').trim();
  if (!q || q.length < 3) return res.json({ members: [] });
  try {
    const term = `%${q.replace(/\D/g, '') || q}%`;
    const nameTerm = `%${q}%`;
    let rows;
    if (currentUser.role === 'master_admin') {
      const r = await pool.query(
        `SELECT id, full_name, cpf, cr_number FROM users
         WHERE role = 'member'
           AND (regexp_replace(cpf, '[^0-9]', '', 'g') ILIKE $1 OR full_name ILIKE $2)
         ORDER BY full_name LIMIT 8`,
        [term, nameTerm]
      );
      rows = r.rows;
    } else {
      const r = await pool.query(
        `SELECT id, full_name, cpf, cr_number FROM users
         WHERE role = 'member' AND club_id = $1
           AND (regexp_replace(cpf, '[^0-9]', '', 'g') ILIKE $2 OR full_name ILIKE $3)
         ORDER BY full_name LIMIT 8`,
        [currentUser.clubId, term, nameTerm]
      );
      rows = r.rows;
    }
    res.json({ members: rows.map((u: any) => ({ id: u.id, fullName: u.full_name, cpf: u.cpf, crNumber: u.cr_number })) });
  } catch (err) {
    console.error('Member search error:', err);
    res.status(500).json({ error: 'Erro ao buscar atletas.' });
  }
});

// Create a weapon concession record
app.post('/api/weapon-concessions', requireAdmin, async (req, res) => {
  const currentUser = (req as any).user as User;
  const { athleteId, weaponId, startDate, endDate } = req.body as {
    athleteId: string;
    weaponId: string;
    startDate: string;
    endDate: string;
  };
  if (!athleteId || !weaponId || !startDate || !endDate) {
    return res.status(400).json({ error: 'athleteId, weaponId, startDate e endDate são obrigatórios.' });
  }
  let clubId = currentUser.clubId;
  if (!clubId && currentUser.role === 'master_admin') {
    const wRes = await pool.query(
      `SELECT u.club_id FROM weapons w JOIN users u ON u.id = w.owner_id WHERE w.id = $1`,
      [weaponId]
    );
    clubId = wRes.rows[0]?.club_id;
  }
  if (!clubId) return res.status(400).json({ error: 'Clube não identificado.' });
  try {
    const result = await pool.query(
      `INSERT INTO weapon_concessions (club_id, athlete_id, weapon_id, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [clubId, athleteId, weaponId, startDate, endDate]
    );
    const row = result.rows[0];
    const enriched = await pool.query(
      `SELECT wc.*,
         u.full_name as athlete_name, u.cpf as athlete_cpf, u.cr_number as athlete_cr,
         w.model as weapon_model, w.caliber as weapon_caliber,
         w.sigma_number as weapon_sigma, w.weapon_number as weapon_number,
         w.manufacturer as weapon_manufacturer,
         c.name as club_name, c.cnpj as club_cnpj, c.city as club_city, c.state as club_state
       FROM weapon_concessions wc
         JOIN users u ON u.id = wc.athlete_id
         JOIN weapons w ON w.id = wc.weapon_id
         JOIN clubs c ON c.id = wc.club_id
       WHERE wc.id = $1`,
      [row.id]
    );
    const e = enriched.rows[0];
    res.status(201).json({
      concession: {
        id: e.id,
        concessionNumber: e.concession_number,
        clubId: e.club_id,
        clubName: e.club_name,
        clubCnpj: e.club_cnpj,
        clubCity: e.club_city,
        clubState: e.club_state,
        athleteId: e.athlete_id,
        athleteName: e.athlete_name,
        athleteCpf: e.athlete_cpf,
        athleteCr: e.athlete_cr,
        weaponId: e.weapon_id,
        weaponModel: e.weapon_model,
        weaponCaliber: e.weapon_caliber,
        weaponSigma: e.weapon_sigma,
        weaponNumber: e.weapon_number,
        weaponManufacturer: e.weapon_manufacturer,
        startDate: e.start_date,
        endDate: e.end_date,
        createdAt: e.created_at,
      }
    });
  } catch (err) {
    console.error('Create concession error:', err);
    res.status(500).json({ error: 'Erro ao registrar cessão.' });
  }
});

// List weapon concessions for admin's club
app.get('/api/weapon-concessions', requireAdmin, async (req, res) => {
  const currentUser = (req as any).user as User;
  try {
    let query = `SELECT wc.*,
         u.full_name as athlete_name, u.cpf as athlete_cpf,
         w.model as weapon_model, w.sigma_number as weapon_sigma,
         c.name as club_name
       FROM weapon_concessions wc
         JOIN users u ON u.id = wc.athlete_id
         JOIN weapons w ON w.id = wc.weapon_id
         JOIN clubs c ON c.id = wc.club_id`;
    const params: any[] = [];
    if (currentUser.role !== 'master_admin') {
      query += ` WHERE wc.club_id = $1`;
      params.push(currentUser.clubId);
    }
    query += ` ORDER BY wc.concession_number DESC LIMIT 50`;
    const result = await pool.query(query, params);
    res.json({ concessions: result.rows });
  } catch (err) {
    console.error('List concessions error:', err);
    res.status(500).json({ error: 'Erro ao buscar cessões.' });
  }
});

// Club Templates Management (Certificates & Cards multi-tenancy)
app.get('/api/club-templates', requireAuth, async (req, res) => {
  const currentUser = (req as any).user as User;
  const clubId = (req.query.clubId as string) || currentUser.clubId || 'c1';

  try {
    const result = await pool.query('SELECT * FROM club_templates WHERE club_id = $1', [clubId]);
    res.json({ templates: result.rows });
  } catch (err) {
    console.error('Fetch club templates error:', err);
    res.status(500).json({ error: 'Erro ao buscar templates do clube.' });
  }
});

app.post('/api/club-templates', requireAuth, async (req, res) => {
  const currentUser = (req as any).user as User;
  if (!ADMIN_ROLES.includes(currentUser.role) && currentUser.role !== 'club_admin') {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  const clubId = req.body.clubId || currentUser.clubId || 'c1';
  const { templateType, backgroundUrl, bodyTemplate, layoutConfig } = req.body;

  if (!templateType) {
    return res.status(400).json({ error: 'Tipo de template é obrigatório.' });
  }

  try {
    const id = `tmpl_${clubId}_${templateType}`;
    const result = await pool.query(
      `INSERT INTO club_templates (id, club_id, template_type, background_url, body_template, layout_config, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (club_id, template_type)
       DO UPDATE SET
         background_url = EXCLUDED.background_url,
         body_template = EXCLUDED.body_template,
         layout_config = EXCLUDED.layout_config,
         updated_at = NOW()
       RETURNING *`,
      [id, clubId, templateType, backgroundUrl || '', bodyTemplate || '', JSON.stringify(layoutConfig || {})]
    );

    res.json({ success: true, template: result.rows[0] });
  } catch (err) {
    console.error('Save club template error:', err);
    res.status(500).json({ error: 'Erro ao salvar template do clube.' });
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
