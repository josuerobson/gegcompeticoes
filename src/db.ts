import pg from 'pg';
import { defaultUsers, defaultChampionships, defaultRegistrations, defaultStageScores, defaultPosts } from './data/mockData.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://spacevip_react:Jo159357*@localhost:5432/gegcompeticoes',
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') && !process.env.DATABASE_URL.includes('127.0.0.1')
    ? { rejectUnauthorized: false }
    : false,
});

export async function initDB() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create Tables
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
        role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
        has_paid_signature BOOLEAN NOT NULL DEFAULT FALSE,
        signature_expiry TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS follows (
        follower_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        following_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (follower_id, following_id)
      );
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
        current_stage INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'completed')),
        banner_url TEXT NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS registrations (
        id TEXT PRIMARY KEY,
        championship_id TEXT REFERENCES championships(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        modality TEXT NOT NULL,
        cr_number TEXT NOT NULL,
        payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'credit_card')),
        payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'approved')),
        registered_at TEXT NOT NULL,
        approved_at TEXT,
        tx_id TEXT
      );
    `);

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

    // Seeding Check
    const userCountRes = await client.query('SELECT COUNT(*) FROM users');
    const userCount = parseInt(userCountRes.rows[0].count, 10);

    const settingsCountRes = await client.query("SELECT COUNT(*) FROM settings WHERE key = 'default_image'");
    if (parseInt(settingsCountRes.rows[0].count, 10) === 0) {
      await client.query("INSERT INTO settings (key, value) VALUES ('default_image', 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=800&auto=format&fit=crop&q=80')");
    }

    if (userCount === 0) {
      console.log('PostgreSQL database is empty. Seeding with mock data...');
      await client.query('BEGIN');

      // Seed users
      for (const u of defaultUsers) {
        await client.query(
          `INSERT INTO users (id, email, username, full_name, avatar_url, bio, cr_number, is_club_member, member_since, role, has_paid_signature, signature_expiry)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [u.id, u.email, u.username, u.fullName, u.avatarUrl, u.bio, u.crNumber || null, u.isClubMember, u.memberSince || null, u.role, u.hasPaidSignature, u.signatureExpiry || null]
        );
      }

      // Seed follows (after all users exist in the users table)
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

      // Seed championships
      for (const c of defaultChampionships) {
        await client.query(
          `INSERT INTO championships (id, title, description, start_date, end_date, registration_fee, modalities, stages_count, current_stage, status, banner_url)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [c.id, c.title, c.description, c.startDate, c.endDate, c.registrationFee, JSON.stringify(c.modalities), c.stagesCount, c.currentStage, c.status, c.bannerUrl]
        );
      }

      // Seed registrations
      for (const r of defaultRegistrations) {
        await client.query(
          `INSERT INTO registrations (id, championship_id, user_id, modality, cr_number, payment_method, payment_status, registered_at, approved_at, tx_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [r.id, r.championshipId, r.userId, r.modality, r.crNumber, r.paymentMethod, r.paymentStatus, r.registeredAt, r.approvedAt || null, r.txId || null]
        );
      }

      // Seed stage scores
      for (const s of defaultStageScores) {
        await client.query(
          `INSERT INTO stage_scores (id, championship_id, registration_id, user_id, shooter_name, modality, stage_num, score, time_seconds, hit_factor, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [s.id, s.championshipId, s.registrationId, s.userId, s.shooterName, s.modality, s.stageNum, s.score, s.timeSeconds || null, s.hitFactor || null, s.createdAt]
        );
      }

      // Seed posts, likes and comments
      for (const p of defaultPosts) {
        await client.query(
          `INSERT INTO posts (id, user_id, username, user_avatar, content, image_url, target_score, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [p.id, p.userId, p.username, p.userAvatar, p.content, p.imageUrl || null, p.targetScore ? JSON.stringify(p.targetScore) : null, p.createdAt]
        );

        // Seed likes
        for (const l of p.likes) {
          if (defaultUsers.some(user => user.id === l)) {
            await client.query(
              `INSERT INTO likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
              [p.id, l]
            );
          }
        }

        // Seed comments
        for (const comm of p.comments) {
          await client.query(
            `INSERT INTO comments (id, post_id, user_id, username, user_avatar, content, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [comm.id, p.id, comm.userId, comm.username, comm.userAvatar, comm.content, comm.createdAt]
          );
        }
      }

      await client.query('COMMIT');
      console.log('Database seeded successfully.');
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during database initialization:', err);
    throw err;
  } finally {
    client.release();
  }
}
