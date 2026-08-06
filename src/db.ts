import pg from 'pg';
import { defaultUsers, defaultPosts, defaultClubs, defaultWeapons } from './data/mockData.js';
import { hashPassword } from './auth.js';
import { ensureBucket } from './storage.js';

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
        created_at TEXT NOT NULL,
        cr_number TEXT,
        responsible_name TEXT,
        email TEXT,
        cep TEXT,
        address TEXT,
        address_number TEXT,
        complement TEXT,
        neighborhood TEXT,
        city TEXT,
        state TEXT
      );
    `);

    // Defensive column backfill: this table may already exist from an earlier schema
    // version (CREATE TABLE IF NOT EXISTS above won't add missing columns to it).
    await client.query(`
      ALTER TABLE clubs
        ADD COLUMN IF NOT EXISTS cr_number TEXT,
        ADD COLUMN IF NOT EXISTS responsible_name TEXT,
        ADD COLUMN IF NOT EXISTS email TEXT,
        ADD COLUMN IF NOT EXISTS cep TEXT,
        ADD COLUMN IF NOT EXISTS address TEXT,
        ADD COLUMN IF NOT EXISTS address_number TEXT,
        ADD COLUMN IF NOT EXISTS complement TEXT,
        ADD COLUMN IF NOT EXISTS neighborhood TEXT,
        ADD COLUMN IF NOT EXISTS city TEXT,
        ADD COLUMN IF NOT EXISTS state TEXT,
        ADD COLUMN IF NOT EXISTS doc_cnpj_key TEXT,
        ADD COLUMN IF NOT EXISTS doc_cr_key TEXT,
        ADD COLUMN IF NOT EXISTS doc_alvara_key TEXT;
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
        password_hash TEXT,
        birth_date TEXT,
        sex TEXT,
        rg_issuer TEXT,
        rg_issue_date TEXT,
        father_name TEXT,
        mother_name TEXT,
        cr_validity TEXT,
        military_region TEXT,
        nationality TEXT,
        cep TEXT,
        address TEXT,
        address_number TEXT,
        complement TEXT,
        neighborhood TEXT,
        city TEXT,
        state TEXT,
        guia_transito_expiry TEXT
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
        ADD COLUMN IF NOT EXISTS password_hash TEXT,
        ADD COLUMN IF NOT EXISTS birth_date TEXT,
        ADD COLUMN IF NOT EXISTS sex TEXT,
        ADD COLUMN IF NOT EXISTS rg_issuer TEXT,
        ADD COLUMN IF NOT EXISTS rg_issue_date TEXT,
        ADD COLUMN IF NOT EXISTS father_name TEXT,
        ADD COLUMN IF NOT EXISTS mother_name TEXT,
        ADD COLUMN IF NOT EXISTS cr_validity TEXT,
        ADD COLUMN IF NOT EXISTS military_region TEXT,
        ADD COLUMN IF NOT EXISTS nationality TEXT,
        ADD COLUMN IF NOT EXISTS cep TEXT,
        ADD COLUMN IF NOT EXISTS address TEXT,
        ADD COLUMN IF NOT EXISTS address_number TEXT,
        ADD COLUMN IF NOT EXISTS complement TEXT,
        ADD COLUMN IF NOT EXISTS neighborhood TEXT,
        ADD COLUMN IF NOT EXISTS city TEXT,
        ADD COLUMN IF NOT EXISTS state TEXT,
        ADD COLUMN IF NOT EXISTS signature_expiry TEXT,
        ADD COLUMN IF NOT EXISTS guia_transito_expiry TEXT,
        ADD COLUMN IF NOT EXISTS doc_rg_cnh_key TEXT,
        ADD COLUMN IF NOT EXISTS doc_cr_key TEXT,
        ADD COLUMN IF NOT EXISTS doc_declaracao_key TEXT;
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
        discipline TEXT,
        target_preview TEXT,
        series_count INTEGER,
        shots_per_series INTEGER,
        time_per_series_minutes INTEGER,
        evaluation_type TEXT CHECK (evaluation_type IN ('pontuacao', 'pontuacao_tempo', 'tempo'))
      );
    `);

    // Defensive column backfill: this table may already exist from an earlier schema
    // version (CREATE TABLE IF NOT EXISTS above won't add missing columns to it).
    // discipline was originally NOT NULL but the real "Cadastrar Modalidades" form
    // (per legacy system spec) has no category field, so it's now optional/unused.
    await client.query(`
      ALTER TABLE modalities
        ADD COLUMN IF NOT EXISTS series_count INTEGER,
        ADD COLUMN IF NOT EXISTS shots_per_series INTEGER,
        ADD COLUMN IF NOT EXISTS time_per_series_minutes INTEGER,
        ADD COLUMN IF NOT EXISTS evaluation_type TEXT,
        ALTER COLUMN discipline DROP NOT NULL;
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

    // Cadastro completo de campeonato (legacy system parity): documents, PIX,
    // registration pricing, revenue/prize percentage splits and medal thresholds.
    // All additive/optional so existing championships keep working untouched.
    await client.query(`
      ALTER TABLE championships
        ADD COLUMN IF NOT EXISTS regulamento_key TEXT,
        ADD COLUMN IF NOT EXISTS sumula_key TEXT,
        ADD COLUMN IF NOT EXISTS valor_x DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS valor_inscricao_clube DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS valor_inscricao_individual DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS percentual_clube DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS valor_reinscricao DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS tipo_pix TEXT,
        ADD COLUMN IF NOT EXISTS chave_pix TEXT,
        ADD COLUMN IF NOT EXISTS nome_exibido_pix TEXT,
        ADD COLUMN IF NOT EXISTS whatsapp_comprovante TEXT,
        ADD COLUMN IF NOT EXISTS formato_pagamento TEXT,
        ADD COLUMN IF NOT EXISTS limite_equipes_clube INTEGER,
        ADD COLUMN IF NOT EXISTS qtd_atletas_por_equipe INTEGER,
        ADD COLUMN IF NOT EXISTS formato_insercao TEXT,
        ADD COLUMN IF NOT EXISTS alcance_campeonato TEXT,
        ADD COLUMN IF NOT EXISTS nivel_campeonato INTEGER,
        ADD COLUMN IF NOT EXISTS percentual_tributos DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS percentual_organizacao DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS percentual_clubes DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS percentual_premiacao_atleta DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS percentual_premiacao_clube DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS percentual_premiacao_todas_etapas DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS premiacao_adicional_todas_etapas DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS qtd_etapas_consideradas INTEGER,
        ADD COLUMN IF NOT EXISTS qtd_piores_descartar INTEGER,
        ADD COLUMN IF NOT EXISTS qtd_melhores_descartar INTEGER,
        ADD COLUMN IF NOT EXISTS percentual_pos1_todas_etapas DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS percentual_pos2_todas_etapas DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS percentual_pos3_todas_etapas DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS percentual_pos4_todas_etapas DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS percentual_pos5_todas_etapas DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS percentual_ouro DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS percentual_prata DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS percentual_bronze DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS percentual_pos1_medalha DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS percentual_pos2_medalha DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS percentual_pos3_medalha DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS percentual_pos4_medalha DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS percentual_pos5_medalha DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS pontuacao_minima_atleta_ouro DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS pontuacao_minima_atleta_prata DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS pontuacao_minima_atleta_bronze DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS pontuacao_minima_equipe_ouro DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS pontuacao_minima_equipe_prata DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS pontuacao_minima_equipe_bronze DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS ordem_exibicao INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS aberto_outros_clubes TEXT DEFAULT 'sim';
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS club_templates (
        id TEXT PRIMARY KEY,
        club_id TEXT REFERENCES clubs(id) ON DELETE CASCADE,
        template_type TEXT NOT NULL,
        background_url TEXT,
        body_template TEXT,
        layout_config JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(club_id, template_type)
      );
    `);

    // Database performance optimization indexes & additive schema migrations
    await client.query(`
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS shared_post TEXT;
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS shares_count INT DEFAULT 0;
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS views_count INT DEFAULT 0;
      CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
      CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
      CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
      CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
      CREATE INDEX IF NOT EXISTS idx_registrations_user ON registrations(user_id);
      CREATE INDEX IF NOT EXISTS idx_registrations_championship ON registrations(championship_id);
      CREATE INDEX IF NOT EXISTS idx_stage_scores_championship ON stage_scores(championship_id);
      CREATE INDEX IF NOT EXISTS idx_stage_scores_registration ON stage_scores(registration_id);
      CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
      CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS trainings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        club_id TEXT,
        date_time TEXT NOT NULL,
        weapon_id TEXT REFERENCES weapons(id) ON DELETE SET NULL,
        weapon_name TEXT NOT NULL,
        weapon_caliber TEXT,
        weapon_owner_type TEXT NOT NULL DEFAULT 'propria',
        total_shots INT NOT NULL DEFAULT 0,
        own_ammo_shots INT NOT NULL DEFAULT 0,
        club_ammo_shots INT NOT NULL DEFAULT 0,
        modality TEXT,
        score INT DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_trainings_user_id ON trainings(user_id);
    `);

    // Sanitize championships.modalities JSONB array: remove any deleted/orphaned modality IDs
    await client.query(`
      DO $$
      DECLARE
          champ RECORD;
          m_elem text;
          new_mods jsonb;
          mod_exists boolean;
      BEGIN
          FOR champ IN SELECT id, modalities FROM championships WHERE jsonb_typeof(modalities) = 'array' LOOP
              new_mods := '[]'::jsonb;
              FOR m_elem IN SELECT jsonb_array_elements_text(champ.modalities) LOOP
                  SELECT EXISTS (
                      SELECT 1 FROM modalities WHERE id = m_elem OR name = m_elem
                  ) INTO mod_exists;
                  
                  IF mod_exists THEN
                      new_mods := new_mods || to_jsonb(m_elem);
                  END IF;
              END LOOP;
              
              UPDATE championships SET modalities = new_mods WHERE id = champ.id;
          END LOOP;
      END $$;
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

    // Cadastro completo de etapas (legacy system parity) — additive/optional so
    // any pre-existing stage rows keep working untouched.
    await client.query(`
      ALTER TABLE stages
        ADD COLUMN IF NOT EXISTS description TEXT,
        ADD COLUMN IF NOT EXISTS end_date TEXT,
        ADD COLUMN IF NOT EXISTS sexo TEXT DEFAULT 'masculino',
        ADD COLUMN IF NOT EXISTS homologar_resultado TEXT DEFAULT 'nao',
        ADD COLUMN IF NOT EXISTS aberto_para_resultados TEXT DEFAULT 'sim',
        ADD COLUMN IF NOT EXISTS gerar_certificados TEXT DEFAULT 'sim',
        ADD COLUMN IF NOT EXISTS fator_multiplicacao_resultados DOUBLE PRECISION DEFAULT 1.00,
        ADD COLUMN IF NOT EXISTS exibir_inscritos_pagina_inicial TEXT DEFAULT 'sim',
        ADD COLUMN IF NOT EXISTS incluir_na_soma_pagina_inicial TEXT DEFAULT 'sim';
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

    // Cadastro completo de armas (legacy system parity): "Tipo de arma" isn't
    // part of the real form, so it's now optional; "Arma é" (Sigma/Sinarm) is new.
    await client.query(`
      ALTER TABLE weapons
        ALTER COLUMN weapon_type DROP NOT NULL,
        ADD COLUMN IF NOT EXISTS registry_system TEXT;
    `);

    // Managed dropdown lists for the weapon form (Classe, Modelo, Calibre,
    // Fabricante, Arma é, Status de permissão) — only master_admin can add/edit/
    // remove items (see requireMasterAdmin in server.ts); club admins just pick
    // from whatever exists when registering a weapon.
    await client.query(`
      CREATE TABLE IF NOT EXISTS weapon_lookup_options (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL CHECK (kind IN ('classe', 'modelo', 'calibre', 'fabricante', 'tipo_arma', 'permissao_arma')),
        label TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS weapon_lookup_options_kind_label_idx ON weapon_lookup_options (kind, label);
    `);

    const weaponLookupCountRes = await client.query('SELECT COUNT(*)::int as count FROM weapon_lookup_options');
    if (weaponLookupCountRes.rows[0].count === 0) {
      const seedLookups: { kind: string; label: string }[] = [
        ...['Espingarda', 'Pistola', 'Revólver', 'Carabina / Rifle / Fuzil', 'Carabina de Pressão'].map(label => ({ kind: 'classe', label })),
        ...['Sigma', 'Sinarm'].map(label => ({ kind: 'tipo_arma', label })),
        ...['Permitida', 'Restrita'].map(label => ({ kind: 'permissao_arma', label })),
        ...['380 Auto', '9mm', '38 SPL', '454', '40 S&W', '12', '44 Mag', '22', '22 LR', '308', '45 ACP', '357 Mag', '22 Magnum', '5.56', '7.62', '44 S&W', '5.5', '4.5', '6.0', '38TPC', '6.35', '32', '38TCP'].map(label => ({ kind: 'calibre', label })),
        ...['IMBEL', 'TAURUS', 'BOITO', 'ROSSI', 'CBC', 'GLOCK', 'Sig Sauer', 'Arex', 'Ceska Zbrojovka CZ', 'Stoeger', 'Smith & Wesson', 'MARLIN', 'IWI', 'Beretta', 'BRIGADE', 'WALTHER', 'ZASTAVA ARMS', 'SPRINGFIELD', 'BERSA', 'Browning', 'Fire Eagle'].map(label => ({ kind: 'fabricante', label })),
        ...[
          'RT 889', 'G17', 'G19', 'GC MD2', 'GC MD7', 'GC MD1', 'PT 838', 'PT 845', 'PT 92 INOX', 'CZ O 07 Kadet',
          'TH 380', 'TS 9', 'PT 92', 'RT 357H', 'RT454 8 3/8', 'CZ 75 SP 01 Shadow', 'RT 88', 'RT 85', 'RT 85S', 'CZ O 09 KUG',
          'RT 82S', 'RT 838', 'RT 856', 'RT 817', 'G43X', 'PT 917C', 'P320 M17 Coyote', 'SC MD1', 'G2C', 'G3 TORO',
          'G3C', 'GX4', 'PT100', 'PT1911 Clássica', 'PT1911 Government', 'PT1911 Tatical', 'TH 40', 'TH 9', 'TX 22', 'TC MD6',
          'Arex Delta', 'Arex Delta Gen 2 FDE', 'Arex Delta M Gen 2', 'Arex Delta L Gen 2', 'Arex Delta L Gen 2 FDE', 'Arex ZERO 1 C', 'Arex ZERO 1 Gen 2 C', 'P320 Compacto Nitron', 'P320 Compacto Coyote',
          'CT40', 'CTT 9mm', 'G21', 'PUMP', 'Puma 20', '8021', 'CZ 75 CZechmate', 'Rifle 8122 BOLT ACTION', 'Rifle 7022', 'Fuzil 308',
          'P365 XL', 'PT1911 Officer', 'PUMA 24', 'CZ Shedow 2 OR', 'CZ Shedow 2 SA', 'CZ Shedow 2', 'CZ 75 Orange', 'CZ Shedow 2 Orange', 'CZ Shedow 2 Urban Grey', 'Revólver 38 6 Tiros',
          'CZ O 07 Kadet Urban Grey', 'P365 SAS', 'PT 59', 'PT 58', 'GC MD6', '605', 'M911 A1', 'T4', 'Tatical 7022', 'P365XL',
          'TH 9 C', 'TX22', 'PT 59S', '7022 0X MED', 'RT 627', '7022 WAY', 'DELTA NEW FRAME', 'PUMP MILITARY 3.0', 'TR 886', 'THC9',
          '7022 Tactical', 'RT 605', 'G 3', 'TH40C', 'PT138', 'MD1', 'PT 938', 'RT 608', 'STR-9', 'SW/WD9 VE CAPACITY',
          '8122', 'MD2 A2', 'Golden 39AS', '8022', 'G25', 'Jericho', 'CZ1', 'RT66', 'Rex1S', 'DIONE',
          '941', 'APX', 'REX ZERO 1', 'BMF9', 'P320 XFULL', 'P22', '457 LUX', 'MD5', 'MP22', 'MP17',
          '7022 Delta', 'PT809C', 'XD-M ELITE', 'G22', 'ERA2001', 'GES M B H', 'THUNDER', '457 Premium', 'Special Streel', 'RT8566',
          'RIO BRAVO', 'MOD. 5', 'Revólver', 'RT856', 'GX4 CARRY', 'F F 914', 'TCP 38'
        ].map(label => ({ kind: 'modelo', label })),
      ];
      let seedIdx = 0;
      for (const item of seedLookups) {
        seedIdx += 1;
        await client.query(
          `INSERT INTO weapon_lookup_options (id, kind, label, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT (kind, label) DO NOTHING`,
          [`wlo_${item.kind}_${seedIdx}`, item.kind, item.label, new Date().toISOString().split('T')[0]]
        );
      }
      console.log(`Seeded ${seedLookups.length} weapon lookup option(s).`);
    }

    // =========================================================================
    // MÓDULO DE MUNIÇÕES (Entrada NF, Estoque/Recarga, Ponta/Reciclado, Alocar)
    // =========================================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS ammo_caliber_stocks (
        id TEXT PRIMARY KEY,
        club_id TEXT REFERENCES clubs(id) ON DELETE CASCADE,
        caliber TEXT NOT NULL,
        initial_stock INT NOT NULL DEFAULT 0,
        has_initial_stock_set BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT ammo_caliber_stocks_club_caliber_unique UNIQUE (club_id, caliber)
      );

      CREATE TABLE IF NOT EXISTS ammo_invoices (
        id TEXT PRIMARY KEY,
        club_id TEXT REFERENCES clubs(id) ON DELETE CASCADE,
        invoice_number TEXT,
        supplier TEXT,
        date TEXT NOT NULL,
        total_amount DOUBLE PRECISION DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ammo_invoice_items (
        id TEXT PRIMARY KEY,
        invoice_id TEXT REFERENCES ammo_invoices(id) ON DELETE CASCADE,
        product_type TEXT NOT NULL,
        caliber TEXT NOT NULL,
        quantity INT NOT NULL DEFAULT 0,
        unit_price DOUBLE PRECISION DEFAULT 0,
        total_price DOUBLE PRECISION DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS ammo_productions (
        id TEXT PRIMARY KEY,
        club_id TEXT REFERENCES clubs(id) ON DELETE CASCADE,
        quantity INT NOT NULL DEFAULT 0,
        date TEXT NOT NULL,
        caliber TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ammo_recycled (
        id TEXT PRIMARY KEY,
        club_id TEXT REFERENCES clubs(id) ON DELETE CASCADE,
        quantity INT NOT NULL DEFAULT 0,
        date TEXT NOT NULL,
        caliber TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ammo_athlete_allocations (
        id TEXT PRIMARY KEY,
        club_id TEXT REFERENCES clubs(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ammo_athlete_allocation_items (
        id TEXT PRIMARY KEY,
        allocation_id TEXT REFERENCES ammo_athlete_allocations(id) ON DELETE CASCADE,
        caliber TEXT NOT NULL,
        quantity INT NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS ammo_athlete_balances (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        club_id TEXT REFERENCES clubs(id) ON DELETE CASCADE,
        caliber TEXT NOT NULL,
        balance INT NOT NULL DEFAULT 0,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT ammo_athlete_balances_user_caliber_unique UNIQUE (user_id, caliber)
      );

      -- Additive migrations for unit of measure and club ammo type (nova vs recarga)
      ALTER TABLE ammo_invoice_items ADD COLUMN IF NOT EXISTS unit_measure TEXT DEFAULT 'un';
      ALTER TABLE trainings ADD COLUMN IF NOT EXISTS club_ammo_type TEXT DEFAULT 'recarga';
      ALTER TABLE registrations ADD COLUMN IF NOT EXISTS club_ammo_type TEXT DEFAULT 'recarga';
      ALTER TABLE stage_scores ADD COLUMN IF NOT EXISTS club_ammo_type TEXT DEFAULT 'recarga';
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

    // Legacy system parity (inscricao_modalidades): full score breakdown, IDSC fields,
    // execution date/time, per-series JSON, and registration tracking.
    // All additive — existing registrations keep working untouched.
    await client.query(`
      ALTER TABLE registrations
        -- Who performed the registration (the athlete themselves or a club admin)
        ADD COLUMN IF NOT EXISTS registered_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        -- 'normal' (first time) or 'reinscrição' (re-entry, lower fee)
        ADD COLUMN IF NOT EXISTS registration_type TEXT DEFAULT 'normal',
        -- Payment details for import compatibility
        ADD COLUMN IF NOT EXISTS valor_pago DECIMAL(10,2),
        ADD COLUMN IF NOT EXISTS data_pagamento TEXT,
        -- Best series scores per target zone (mirrors legacy p0..p10, x columns)
        ADD COLUMN IF NOT EXISTS score_x INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS score_p10 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS score_p9 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS score_p8 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS score_p7 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS score_p6 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS score_p5 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS score_p4 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS score_p3 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS score_p2 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS score_p1 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS score_p0 INTEGER DEFAULT 0,
        -- IDSC-specific fields (speed/dynamic shooting disciplines)
        ADD COLUMN IF NOT EXISTS idsc_0 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS idsc_2 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS idsc_5 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS idsc_misses INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS idsc_noshoot INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS idsc_tempo_pista FLOAT,
        ADD COLUMN IF NOT EXISTS idsc_tempo_pista_exibe TEXT,
        ADD COLUMN IF NOT EXISTS idsc_total_segundos_exibe TEXT,
        -- Execution metadata
        ADD COLUMN IF NOT EXISTS data_execucao TEXT,
        ADD COLUMN IF NOT EXISTS hora_execucao TEXT,
        ADD COLUMN IF NOT EXISTS total_minutos TEXT,
        ADD COLUMN IF NOT EXISTS total_milesegundos INTEGER DEFAULT 0,
        -- Full series detail JSON (all series, for re-editing results later)
        ADD COLUMN IF NOT EXISTS series_pontos JSONB,
        ADD COLUMN IF NOT EXISTS series_tempos JSONB,
        -- Legacy import compatibility code (corresponds to 'codigo' in inscricao_modalidades)
        ADD COLUMN IF NOT EXISTS codigo_inscricao INTEGER,
        -- Ammo origin (tiros própria / tiros clube)
        ADD COLUMN IF NOT EXISTS own_ammo_shots INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS club_ammo_shots INTEGER DEFAULT 0;
    `);

    // Relax completion_status CHECK to accept 'absent' (Não Participou) in addition to
    // 'pending' and 'completed'. PostgreSQL doesn't support ALTER COLUMN ... ADD CONSTRAINT
    // conditionally, so we drop and re-add the constraint.
    await client.query(`ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_completion_status_check`);
    await client.query(`ALTER TABLE registrations ADD CONSTRAINT registrations_completion_status_check CHECK (completion_status IN ('pending', 'completed', 'absent'))`);


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

    // Drop and recreate weapon_concessions to fix UUID→TEXT type mismatch
    // (safe: table is new, no real data exists yet)
    await client.query(`DROP TABLE IF EXISTS weapon_concessions`);

    await client.query(`
      CREATE TABLE weapon_concessions (
        id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        concession_number  SERIAL,
        club_id            TEXT NOT NULL REFERENCES clubs(id),
        athlete_id         TEXT NOT NULL REFERENCES users(id),
        weapon_id          TEXT NOT NULL REFERENCES weapons(id),
        start_date         DATE NOT NULL,
        end_date           DATE NOT NULL,
        created_at         TIMESTAMPTZ DEFAULT NOW()
      );
    `);


    await client.query(`
      CREATE TABLE IF NOT EXISTS home_banners (
        id           TEXT PRIMARY KEY,
        tag          TEXT NOT NULL,
        subtitle     TEXT NOT NULL,
        title        TEXT NOT NULL,
        description  TEXT NOT NULL,
        button_text  TEXT NOT NULL,
        image_url    TEXT NOT NULL,
        link_url     TEXT,
        active       BOOLEAN NOT NULL DEFAULT TRUE,
        display_order INT NOT NULL DEFAULT 1,
        created_at   TEXT NOT NULL
      );
    `);

    // ── Ammunition Management Tables ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS ammo_stock (
        id TEXT PRIMARY KEY,
        club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
        caliber TEXT NOT NULL,
        initial_quantity INT NOT NULL DEFAULT 0,
        initial_set BOOLEAN NOT NULL DEFAULT FALSE,
        current_quantity INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(club_id, caliber)
      );

      CREATE TABLE IF NOT EXISTS ammo_nfs (
        id TEXT PRIMARY KEY,
        club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
        nf_number TEXT NOT NULL,
        supplier TEXT,
        date TEXT NOT NULL,
        total_value NUMERIC(10,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ammo_nf_items (
        id TEXT PRIMARY KEY,
        nf_id TEXT NOT NULL REFERENCES ammo_nfs(id) ON DELETE CASCADE,
        product_type TEXT NOT NULL,
        caliber TEXT NOT NULL,
        quantity INT NOT NULL DEFAULT 0,
        unit_value NUMERIC(10,2) NOT NULL DEFAULT 0,
        total_value NUMERIC(10,2) NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS ammo_production_logs (
        id TEXT PRIMARY KEY,
        club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
        caliber TEXT NOT NULL,
        quantity INT NOT NULL DEFAULT 0,
        date TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ammo_recycled_logs (
        id TEXT PRIMARY KEY,
        club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
        caliber TEXT NOT NULL,
        quantity INT NOT NULL DEFAULT 0,
        date TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ammo_athlete_stock (
        id TEXT PRIMARY KEY,
        club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
        athlete_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        caliber TEXT NOT NULL,
        quantity INT NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(club_id, athlete_id, caliber)
      );

      CREATE TABLE IF NOT EXISTS ammo_allocations (
        id TEXT PRIMARY KEY,
        club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
        athlete_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        items JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS sicoob_charges (
        id TEXT PRIMARY KEY,
        txid TEXT NOT NULL UNIQUE,
        debtor_cpf TEXT,
        debtor_name TEXT,
        description TEXT,
        amount NUMERIC(10,2) NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'ATIVA',
        pix_copia_e_cola TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query('COMMIT');

    const settingsCountRes = await client.query("SELECT COUNT(*) FROM settings WHERE key = 'default_image'");
    if (parseInt(settingsCountRes.rows[0].count, 10) === 0) {
      await client.query("INSERT INTO settings (key, value) VALUES ('default_image', 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=800&auto=format&fit=crop&q=80')");
    }

    const defaultHomeSettings: [string, string][] = [
      ['home_hero_tag', 'ESTANDE E FEDERAÇÃO DE ALTA PRECISÃO'],
      ['home_hero_title', 'A Pista de Encontro dos Atletas Federados'],
      ['home_hero_subtitle', 'Monitore resultados de etapas em tempo real, acompanhe rankings do clube, interaja na rede social de tiro e garanta sua inscrição oficial nos principais campeonatos de tiro prático e de precisão de Brasília.'],
      ['home_hero_btn1_text', 'Começar Agora'],
      ['home_hero_btn1_link', ''],
      ['home_hero_btn2_text', 'Ver Campeonatos'],
      ['home_hero_btn2_link', '#championships']
    ];
    for (const [k, v] of defaultHomeSettings) {
      await client.query("INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING", [k, v]);
    }

    const homeBannersCountRes = await client.query("SELECT COUNT(*) FROM home_banners");
    if (parseInt(homeBannersCountRes.rows[0].count, 10) === 0) {
      await client.query(`
        INSERT INTO home_banners (id, tag, subtitle, title, description, button_text, image_url, link_url, active, display_order, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        'banner-1',
        'DESTAQUE PRINCIPAL',
        'INSCRIÇÕES ABERTAS • COPA DE INVERNO G&G',
        'Campeonato IPSC Copa de Inverno 2026',
        'Prepare-se para o maior confronto de IPSC Handgun do Centro-Oeste! Pistas dinâmicas que testam velocidade, precisão e potência (DVC).',
        'GARANTIR MINHA VAGA',
        'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=1200&auto=format&fit=crop&q=80',
        '',
        true,
        1,
        new Date().toISOString()
      ]);
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

    // --- SIMULATION DATA SEEDING (CLUBS AND ATHLETES FOR ONLINE TESTING) ---
    const simClubs = [
      { id: 'club_sim_1', name: 'Clube Sniper de Elite', subDomain: 'sniper', cnpj: '11.111.111/0001-11', phone: '(11) 99999-1111', crNumber: 'CR-CLUB-1111' },
      { id: 'club_sim_2', name: 'Clube Balística de Precisão', subDomain: 'balistica', cnpj: '22.222.222/0001-22', phone: '(22) 99999-2222', crNumber: 'CR-CLUB-2222' }
    ];
    for (const c of simClubs) {
      await client.query(
        `INSERT INTO clubs (id, name, sub_domain, cnpj, phone, cr_number, is_premium, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, $7)
         ON CONFLICT (id) DO NOTHING`,
        [c.id, c.name, c.subDomain, c.cnpj, c.phone, c.crNumber, new Date().toISOString()]
      );
    }

    const simAdmins = [
      { id: 'usr_adm_sim_1', email: 'admin@sniper.com.br', username: 'admin_sniper', fullName: 'Guilherme Sniper', cpf: '66666666666', clubId: 'club_sim_1' },
      { id: 'usr_adm_sim_2', email: 'admin@balistica.com.br', username: 'admin_balistica', fullName: 'Gabriel Balistica', cpf: '77777777777', clubId: 'club_sim_2' }
    ];
    for (const a of simAdmins) {
      await client.query(
        `INSERT INTO users (
          id, email, username, full_name, role, club_id, cpf, cr_number, password_hash,
          avatar_url, bio, is_club_member, member_since, has_paid_signature, is_profile_complete,
          rg, phone
         )
         VALUES ($1, $2, $3, $4, 'club_admin', $5, $6, $7, $8, '', '', true, $9, true, true, '', '')
         ON CONFLICT (id) DO NOTHING`,
        [
          a.id, a.email, a.username, a.fullName, a.clubId, a.cpf, `CR-ADM-${a.cpf.slice(-4)}`, DEMO_PASSWORD_HASH,
          new Date().toISOString().split('T')[0]
        ]
      );
    }

    const simAthletes = [
      { id: 'ath_sim_1', email: 'atleta1@sniper.com', username: 'atleta1_sniper', fullName: 'Alexandre Sniper Um', cpf: '88888888881', clubId: 'club_sim_1', sex: 'masculino' },
      { id: 'ath_sim_2', email: 'atleta2@sniper.com', username: 'atleta2_sniper', fullName: 'Beatriz Sniper Dois', cpf: '88888888882', clubId: 'club_sim_1', sex: 'feminino' },
      { id: 'ath_sim_3', email: 'atleta3@sniper.com', username: 'atleta3_sniper', fullName: 'Carlos Sniper Tres', cpf: '88888888883', clubId: 'club_sim_1', sex: 'masculino' },
      { id: 'ath_sim_4', email: 'atleta1@balistica.com', username: 'atleta1_balistica', fullName: 'Daniel Balistica Um', cpf: '99999999991', clubId: 'club_sim_2', sex: 'masculino' },
      { id: 'ath_sim_5', email: 'atleta2@balistica.com', username: 'atleta2_balistica', fullName: 'Eduardo Balistica Dois', cpf: '99999999992', clubId: 'club_sim_2', sex: 'masculino' },
      { id: 'ath_sim_6', email: 'atleta3@balistica.com', username: 'atleta3_balistica', fullName: 'Fernanda Balistica Tres', cpf: '99999999993', clubId: 'club_sim_2', sex: 'feminino' }
    ];

    const champRes = await client.query('SELECT id FROM championships LIMIT 1');
    const stageRes = await client.query('SELECT id FROM stages LIMIT 1');
    const modRes = await client.query('SELECT id FROM modalities LIMIT 1');

    if (champRes.rows.length > 0 && stageRes.rows.length > 0 && modRes.rows.length > 0) {
      const champId = champRes.rows[0].id;
      const stageId = stageRes.rows[0].id;
      const modalityId = modRes.rows[0].id;

      for (const ath of simAthletes) {
        const crNumber = `CR-ATH-${ath.cpf.slice(-4)}`;
        await client.query(
          `INSERT INTO users (
            id, email, username, full_name, role, club_id, cpf, cr_number, password_hash,
            avatar_url, bio, is_club_member, member_since, has_paid_signature, is_profile_complete,
            rg, phone, sex
           )
           VALUES ($1, $2, $3, $4, 'member', $5, $6, $7, $8, '', '', true, $9, true, true, '', '', $10)
           ON CONFLICT (id) DO NOTHING`,
          [
            ath.id, ath.email, ath.username, ath.fullName, ath.clubId, ath.cpf, crNumber, DEMO_PASSWORD_HASH,
            new Date().toISOString().split('T')[0], ath.sex
          ]
        );

        const weaponId = `wpn_sim_${ath.id.slice(-4)}`;
        await client.query(
          `INSERT INTO weapons (id, owner_id, manufacturer, model, caliber, serial_number, weapon_type, weapon_number, sigma_number, class, permission_status)
           VALUES ($1, $2, 'Taurus', 'TS9', '9mm', $3, 'Pistola', $4, $5, 'Pistola', 'Permitido')
           ON CONFLICT (id) DO NOTHING`,
          [weaponId, ath.id, `SER-SIM-${ath.cpf.slice(-4)}`, `NUM-SIM-${ath.cpf.slice(-4)}`, `SIG-SIM-${ath.cpf.slice(-4)}`]
        );

        const regId = `reg_sim_${ath.id.slice(-4)}`;
        await client.query(
          `INSERT INTO registrations (
            id, championship_id, user_id, club_id, modality_id, stage_id, weapon_id, cr_number,
            payment_method, payment_status, completion_status, registered_at, approved_at, tx_id,
            disqualified, penalty, registered_by_user_id, registration_type, valor_pago, data_pagamento
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pix', 'approved', 'pending', $9, $9, $10, false, 0, 'usr_admin_1', 'normal', 80, $11)
          ON CONFLICT (id) DO NOTHING`,
          [
            regId, champId, ath.id, ath.clubId, modalityId, stageId, weaponId, crNumber,
            new Date().toISOString(), `tx_sim_${ath.id.slice(-4)}`, new Date().toISOString().split('T')[0]
          ]
        );
      }
    }

    // Sincronizar o sexo de todos os atletas existentes na base de dados
    await client.query(`
      UPDATE users 
      SET sex = CASE 
        WHEN full_name ILIKE '%Beatriz%' OR full_name ILIKE '%Carla%' OR full_name ILIKE '%Ana%' OR full_name ILIKE '%Fernanda%' THEN 'feminino'
        ELSE 'masculino'
      END
      WHERE (sex IS NULL OR sex = '' OR sex = 'undefined') AND role = 'member'
    `);

    // Atualizar o valor_pago de inscrições legadas ou com valor estático de seed (120) para o valor real das tarifas do campeonato
    await client.query(`
      UPDATE registrations
      SET valor_pago = CASE
        WHEN registration_type = 'reinscrição' THEN COALESCE(c.valor_reinscricao, c.registration_fee, 0)
        WHEN (registrations.registered_by_user_id IS NOT NULL AND registrations.registered_by_user_id <> registrations.user_id) THEN COALESCE(c.valor_inscricao_clube, c.registration_fee, 0)
        ELSE COALESCE(c.valor_inscricao_individual, c.registration_fee, 0)
      END
      FROM championships c
      WHERE registrations.championship_id = c.id
        AND (registrations.valor_pago = 120 OR registrations.valor_pago IS NULL);
    `);

    // ─── Multi-campeonatos ───────────────────────────────────────────────────
    // Nova tabela para pacotes de campeonatos com inscrição unificada.
    await client.query(`
      CREATE TABLE IF NOT EXISTS multi_championships (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        championship_ids TEXT[] NOT NULL DEFAULT '{}',
        registration_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
        club_registration_fee NUMERIC(10,2),
        pix_key TEXT,
        pix_type TEXT,
        pix_name TEXT,
        whatsapp TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Rastreamento: coluna que aponta qual multicampeonato originou a inscrição.
    // Aditiva — inscrições individuais existentes ficam com NULL.
    await client.query(`
      ALTER TABLE registrations
        ADD COLUMN IF NOT EXISTS multi_championship_id TEXT;
    `);

    console.log('Database seed check complete.');

    try {
      await ensureBucket();
    } catch (err) {
      console.error('Could not ensure MinIO bucket exists:', err);
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during database initialization:', err);
    throw err;
  } finally {
    client.release();
  }
}
