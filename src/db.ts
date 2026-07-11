import pg from 'pg';
import { defaultUsers, defaultChampionships, defaultRegistrations, defaultStageScores, defaultPosts, defaultClubs, defaultModalities, defaultStages, defaultWeapons } from './data/mockData.js';
import { hashPassword } from './auth.js';

const DEMO_PASSWORD_HASH = hashPassword('123456');

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não está definida. Configure-a no ambiente (.env local ou variáveis do EasyPanel).');
}

// The internal EasyPanel Postgres does not support SSL connections at all, and the previous
// hostname-substring heuristic here didn't reliably detect it (the deployed container was
// crash-looping on startup with "The server does not support SSL connections"). SSL is now
// opt-in only, via DATABASE_SSL=true, instead of guessed from the connection string.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

export async function initDB() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create Tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS clubs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        logo_url TEXT,
        sub_domain TEXT,
        cnpj TEXT,
        phone TEXT,
        is_premium BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TEXT NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        avatar_url TEXT NOT NULL,
        bio TEXT NOT NULL,
        cr_number TEXT,
        is_club_member BOOLEAN NOT NULL DEFAULT TRUE,
        member_since TEXT,
        role TEXT NOT NULL CHECK (role IN ('admin', 'master_admin', 'club_admin', 'member')),
        has_paid_signature BOOLEAN NOT NULL DEFAULT FALSE,
        signature_expiry TEXT,
        club_id TEXT REFERENCES clubs(id) ON DELETE SET NULL,
        is_profile_complete BOOLEAN NOT NULL DEFAULT FALSE,
        cpf TEXT,
        rg TEXT,
        phone TEXT,
        password_hash TEXT
      );
    `);

    // Defensive column backfill: this table may already exist from an earlier schema
    // version (CREATE TABLE IF NOT EXISTS above won't add missing columns to it) — this
    // is exactly what broke the password_hash backfill against production.
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS club_id TEXT REFERENCES clubs(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS is_profile_complete BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS cpf TEXT,
        ADD COLUMN IF NOT EXISTS rg TEXT,
        ADD COLUMN IF NOT EXISTS phone TEXT,
        ADD COLUMN IF NOT EXISTS password_hash TEXT;
    `);

    // The role CHECK constraint on a pre-existing users table may still be the old
    // admin/member-only version — replace it so master_admin/club_admin are accepted.
    await client.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
      ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'master_admin', 'club_admin', 'member'));
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS follows (
        follower_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        following_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (follower_id, following_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS modalities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        discipline TEXT NOT NULL,
        target_preview TEXT,
        series_count INTEGER,
        shots_per_series INTEGER,
        time_per_series_minutes INTEGER,
        evaluation_type TEXT CHECK (evaluation_type IN ('pontuacao', 'pontuacao_tempo', 'tempo'))
      );
    `);

    // Defensive column backfill: this table may already exist from an earlier schema
    // version (CREATE TABLE IF NOT EXISTS above won't add missing columns to it).
    await client.query(`
      ALTER TABLE modalities
        ADD COLUMN IF NOT EXISTS series_count INTEGER,
        ADD COLUMN IF NOT EXISTS shots_per_series INTEGER,
        ADD COLUMN IF NOT EXISTS time_per_series_minutes INTEGER,
        ADD COLUMN IF NOT EXISTS evaluation_type TEXT;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS championships (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        registration_fee DOUBLE PRECISION NOT NULL,
        modalities JSONB NOT NULL,
        stages_count INTEGER NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'completed')),
        banner_url TEXT NOT NULL,
        club_id TEXT REFERENCES clubs(id) ON DELETE SET NULL,
        type TEXT NOT NULL DEFAULT 'individual' CHECK (type IN ('individual', 'clube'))
      );
    `);

    // Defensive column backfill: this table may already exist from an earlier schema
    // version (CREATE TABLE IF NOT EXISTS above won't add missing columns to it).
    await client.query(`
      ALTER TABLE championships
        ADD COLUMN IF NOT EXISTS club_id TEXT REFERENCES clubs(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'individual';
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS stages (
        id TEXT PRIMARY KEY,
        championship_id TEXT REFERENCES championships(id) ON DELETE CASCADE,
        stage_num INTEGER NOT NULL,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        regulations_file TEXT,
        scorecard_file TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS weapons (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        manufacturer TEXT NOT NULL,
        model TEXT NOT NULL,
        caliber TEXT NOT NULL,
        serial_number TEXT NOT NULL,
        weapon_type TEXT NOT NULL,
        weapon_number TEXT,
        sigma_number TEXT,
        class TEXT,
        permission_status TEXT
      );
    `);

    // Defensive column backfill: this table may already exist from an earlier schema
    // version (CREATE TABLE IF NOT EXISTS above won't add missing columns to it).
    await client.query(`
      ALTER TABLE weapons
        ADD COLUMN IF NOT EXISTS weapon_number TEXT,
        ADD COLUMN IF NOT EXISTS sigma_number TEXT,
        ADD COLUMN IF NOT EXISTS class TEXT,
        ADD COLUMN IF NOT EXISTS permission_status TEXT;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS registrations (
        id TEXT PRIMARY KEY,
        championship_id TEXT REFERENCES championships(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        club_id TEXT REFERENCES clubs(id) ON DELETE SET NULL,
        modality_id TEXT REFERENCES modalities(id),
        stage_id TEXT REFERENCES stages(id),
        weapon_id TEXT REFERENCES weapons(id),
        cr_number TEXT NOT NULL,
        payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'credit_card')),
        payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'approved')),
        completion_status TEXT NOT NULL DEFAULT 'pending' CHECK (completion_status IN ('pending', 'completed')),
        registered_at TEXT NOT NULL,
        approved_at TEXT,
        tx_id TEXT,
        score_details JSONB,
        total_points INTEGER,
        idsc_total_seconds DOUBLE PRECISION,
        disqualified BOOLEAN NOT NULL DEFAULT FALSE,
        penalty INTEGER NOT NULL DEFAULT 0
      );
    `);

    // Defensive backfill: this table may already exist from an earlier schema version
    // (CREATE TABLE IF NOT EXISTS above won't add missing columns to it).
    await client.query(`
      ALTER TABLE registrations
        ADD COLUMN IF NOT EXISTS club_id TEXT REFERENCES clubs(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS modality_id TEXT REFERENCES modalities(id),
        ADD COLUMN IF NOT EXISTS stage_id TEXT REFERENCES stages(id),
        ADD COLUMN IF NOT EXISTS weapon_id TEXT REFERENCES weapons(id),
        ADD COLUMN IF NOT EXISTS completion_status TEXT NOT NULL DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS score_details JSONB,
        ADD COLUMN IF NOT EXISTS total_points INTEGER,
        ADD COLUMN IF NOT EXISTS idsc_total_seconds DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS disqualified BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS penalty INTEGER NOT NULL DEFAULT 0;
    `);

    // The legacy free-text `modality` column (unused by this app) may still exist with a
    // NOT NULL constraint from an earlier schema version, which would reject every new
    // insert that doesn't set it. Relax the constraint without touching the column or its
    // data — non-destructive, unlike dropping it.
    const legacyModalityCol = await client.query(
      `SELECT is_nullable FROM information_schema.columns WHERE table_name = 'registrations' AND column_name = 'modality'`
    );
    if (legacyModalityCol.rows.length > 0 && legacyModalityCol.rows[0].is_nullable === 'NO') {
      await client.query('ALTER TABLE registrations ALTER COLUMN modality DROP NOT NULL');
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS stage_scores (
        id TEXT PRIMARY KEY,
        championship_id TEXT REFERENCES championships(id) ON DELETE CASCADE,
        registration_id TEXT REFERENCES registrations(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        shooter_name TEXT NOT NULL,
        modality TEXT NOT NULL,
        stage_num INTEGER NOT NULL,
        score DOUBLE PRECISION NOT NULL,
        time_seconds DOUBLE PRECISION,
        hit_factor DOUBLE PRECISION,
        created_at TEXT NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        username TEXT NOT NULL,
        user_avatar TEXT NOT NULL,
        content TEXT NOT NULL,
        image_url TEXT,
        target_score JSONB,
        created_at TEXT NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS likes (
        post_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (post_id, user_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        post_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        username TEXT NOT NULL,
        user_avatar TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    await client.query('COMMIT');

    const settingsCountRes = await client.query("SELECT COUNT(*) FROM settings WHERE key = 'default_image'");
    if (parseInt(settingsCountRes.rows[0].count, 10) === 0) {
      await client.query("INSERT INTO settings (key, value) VALUES ('default_image', 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=800&auto=format&fit=crop&q=80')");
    }

    // Converge every reference table identified by static mockData.ts ids, rather than
    // gating on emptiness. An earlier deploy raced two container versions against the same
    // fresh database (a duplicate-key error on pg_type during CREATE TABLE was the tell),
    // and whichever version's code won for a given table left that table non-empty but with
    // stale/older content (e.g. production's championships kept pre-Fase-1 titles and was
    // missing the IDSC championship entirely) — so an "only seed if empty" check could never
    // self-heal it. ON CONFLICT (id) DO UPDATE makes every one of these converge to exactly
    // mockData.ts on every boot, without touching unrelated real data (different ids).
    const isEmpty = async (table: string) => {
      const r = await client.query(`SELECT 1 FROM ${table} LIMIT 1`);
      return r.rows.length === 0;
    };

    for (const c of defaultClubs) {
      await client.query(
        `INSERT INTO clubs (id, name, logo_url, sub_domain, cnpj, phone, is_premium, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, logo_url = EXCLUDED.logo_url, sub_domain = EXCLUDED.sub_domain, cnpj = EXCLUDED.cnpj, phone = EXCLUDED.phone, is_premium = EXCLUDED.is_premium`,
        [c.id, c.name, c.logoUrl || null, c.subDomain || null, c.cnpj || null, c.phone || null, c.isPremium, c.createdAt]
      );
    }

    for (const m of defaultModalities) {
      await client.query(
        `INSERT INTO modalities (id, name, discipline, target_preview, series_count, shots_per_series, time_per_series_minutes, evaluation_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, discipline = EXCLUDED.discipline, target_preview = EXCLUDED.target_preview, series_count = EXCLUDED.series_count, shots_per_series = EXCLUDED.shots_per_series, time_per_series_minutes = EXCLUDED.time_per_series_minutes, evaluation_type = EXCLUDED.evaluation_type`,
        [m.id, m.name, m.discipline, m.targetPreview || null, m.seriesCount || null, m.shotsPerSeries || null, m.timePerSeriesMinutes || null, m.evaluationType || null]
      );
    }

    // Converge the known demo/seed accounts (by id) to mockData.ts, regardless of whatever
    // partial/legacy state they already carry (rows from an earlier schema version, or a
    // login-page auto-registration that predates real auth — e.g. missing cpf entirely).
    // Only touches these specific known demo ids; any other real account is left untouched.
    for (const u of defaultUsers) {
      await client.query(
        `INSERT INTO users (id, email, username, full_name, avatar_url, bio, cr_number, is_club_member, member_since, role, has_paid_signature, signature_expiry, club_id, is_profile_complete, cpf, rg, phone, password_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
         ON CONFLICT (id) DO UPDATE SET
           role = EXCLUDED.role, club_id = EXCLUDED.club_id, is_profile_complete = EXCLUDED.is_profile_complete,
           cpf = EXCLUDED.cpf, rg = EXCLUDED.rg, phone = EXCLUDED.phone, password_hash = EXCLUDED.password_hash`,
        [u.id, u.email, u.username, u.fullName, u.avatarUrl, u.bio, u.crNumber || null, u.isClubMember, u.memberSince || null, u.role, u.hasPaidSignature, u.signatureExpiry || null, u.clubId || null, u.isProfileComplete || false, u.cpf || null, u.rg || null, u.phone || null, DEMO_PASSWORD_HASH]
      );
    }
    // Any other pre-existing user (e.g. a real signup from the old username-only login) left
    // without a password still gets the demo password so they aren't locked out.
    await client.query('UPDATE users SET password_hash = $1 WHERE password_hash IS NULL', [DEMO_PASSWORD_HASH]);

    for (const w of defaultWeapons) {
      await client.query(
        `INSERT INTO weapons (id, owner_id, manufacturer, model, caliber, serial_number, weapon_type, weapon_number, sigma_number, class, permission_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET owner_id = EXCLUDED.owner_id, manufacturer = EXCLUDED.manufacturer, model = EXCLUDED.model, caliber = EXCLUDED.caliber, serial_number = EXCLUDED.serial_number, weapon_type = EXCLUDED.weapon_type, weapon_number = EXCLUDED.weapon_number, sigma_number = EXCLUDED.sigma_number, class = EXCLUDED.class, permission_status = EXCLUDED.permission_status`,
        [w.id, w.ownerId, w.manufacturer, w.model, w.caliber, w.serialNumber, w.weaponType, w.weaponNumber || null, w.sigmaNumber || null, w.weaponClass || null, w.permissionStatus || null]
      );
    }

    // Follows for the demo accounts — always attempted, ON CONFLICT DO NOTHING makes it safe.
    for (const u of defaultUsers) {
      for (const folId of u.following) {
        if (defaultUsers.some(user => user.id === folId)) {
          await client.query(
            `INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [u.id, folId]
          );
        }
      }
    }

    for (const c of defaultChampionships) {
      await client.query(
        `INSERT INTO championships (id, title, description, start_date, end_date, registration_fee, modalities, stages_count, status, banner_url, club_id, type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date, registration_fee = EXCLUDED.registration_fee, modalities = EXCLUDED.modalities, stages_count = EXCLUDED.stages_count, status = EXCLUDED.status, banner_url = EXCLUDED.banner_url, club_id = EXCLUDED.club_id, type = EXCLUDED.type`,
        [c.id, c.title, c.description, c.startDate, c.endDate, c.registrationFee, JSON.stringify(c.modalities), c.stagesCount, c.status, c.bannerUrl, c.clubId || null, c.type]
      );
    }

    for (const s of defaultStages) {
      await client.query(
        `INSERT INTO stages (id, championship_id, stage_num, title, date, regulations_file, scorecard_file)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET championship_id = EXCLUDED.championship_id, stage_num = EXCLUDED.stage_num, title = EXCLUDED.title, date = EXCLUDED.date, regulations_file = EXCLUDED.regulations_file, scorecard_file = EXCLUDED.scorecard_file`,
        [s.id, s.championshipId, s.stageNum, s.title, s.date, s.regulationsFile || null, s.scorecardFile || null]
      );
    }

    for (const r of defaultRegistrations) {
      await client.query(
        `INSERT INTO registrations (id, championship_id, user_id, club_id, modality_id, stage_id, weapon_id, cr_number, payment_method, payment_status, completion_status, registered_at, approved_at, tx_id, score_details, total_points, idsc_total_seconds, disqualified, penalty)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
         ON CONFLICT (id) DO NOTHING`,
        [r.id, r.championshipId, r.userId, r.clubId || null, r.modalityId, r.stageId, r.weaponId, r.crNumber, r.paymentMethod, r.paymentStatus, r.completionStatus, r.registeredAt, r.approvedAt || null, r.txId || null, r.scoreDetails ? JSON.stringify(r.scoreDetails) : null, r.totalPoints ?? null, r.idscTotalSeconds ?? null, r.disqualified, r.penalty]
      );
    }

    for (const s of defaultStageScores) {
      await client.query(
        `INSERT INTO stage_scores (id, championship_id, registration_id, user_id, shooter_name, modality, stage_num, score, time_seconds, hit_factor, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO NOTHING`,
        [s.id, s.championshipId, s.registrationId, s.userId, s.shooterName, s.modality, s.stageNum, s.score, s.timeSeconds || null, s.hitFactor || null, s.createdAt]
      );
    }

    if (await isEmpty('posts')) {
      for (const p of defaultPosts) {
        await client.query(
          `INSERT INTO posts (id, user_id, username, user_avatar, content, image_url, target_score, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING`,
          [p.id, p.userId, p.username, p.userAvatar, p.content, p.imageUrl || null, p.targetScore ? JSON.stringify(p.targetScore) : null, p.createdAt]
        );

        for (const l of p.likes) {
          if (defaultUsers.some(user => user.id === l)) {
            await client.query(
              `INSERT INTO likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
              [p.id, l]
            );
          }
        }

        for (const comm of p.comments) {
          await client.query(
            `INSERT INTO comments (id, post_id, user_id, username, user_avatar, content, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING`,
            [comm.id, p.id, comm.userId, comm.username, comm.userAvatar, comm.content, comm.createdAt]
          );
        }
      }
    }

    console.log('Database seed check complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during database initialization:', err);
    throw err;
  } finally {
    client.release();
  }
}
