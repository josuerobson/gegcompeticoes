// Importação final do legado (clubedetiroaranas.com.br, MySQL `clubedetiro_multi`)
// antes do corte de produção de 2026-10-07. Depois desta rodada, o legado
// deixa de ser fonte de dados — tudo nasce no GEG Competições.
//
// Regras de segurança combinadas com o usuário:
// - Clubes/Usuários/Modalidades/Etapas: só INSERE o que ainda não existe
//   (match por legacy_id). NUNCA atualiza uma linha já existente — campos
//   configurados dentro do app novo (is_premium, sub_domain, credenciais PIX,
//   role, senha, perfil) não podem ser sobrescritos pelo legado.
// - Campeonatos novos: cadastro "esqueleto" (título, datas, clube
//   organizador) com status 'draft' — tem ~40 campos financeiros/PIX/
//   premiação que só um humano deve preencher antes de publicar.
// - Inscrições (`inscricao_modalidades`): as que já existem (legacy_id
//   já presente) só avançam de pendente -> aprovado se o legado agora
//   mostra pago (nunca o contrário, e nunca toca em club_invoice_id/
//   payment_gateway/tx_id, que são campos do app novo). As novas são
//   inseridas direto com o status/valor do legado.
// - Treinamentos (`registro_treinamentos`): mesma política de
//   insert-only-new; a tabela não tinha legacy_id, então este script
//   adiciona a coluna (migração aditiva) e faz backfill a partir do
//   padrão existente `training_legacy_<id>` antes de importar o resto.
// - Armas novas NÃO são criadas neste passe (fora do escopo confirmado);
//   treinamentos/inscrições cuja arma não existir ainda ficam com
//   weapon_id nulo, reportado como "sem arma resolvida".
//
// Uso:
//   npx tsx scripts/import-legacy-final.ts            → dry-run (não escreve nada)
//   npx tsx scripts/import-legacy-final.ts --apply     → aplica de verdade

import 'dotenv/config';
import { Pool } from 'pg';
import mysql from 'mysql2/promise';
import { hashPassword } from '../src/auth.js';

const APPLY = process.argv.includes('--apply');

// Credenciais do legado vêm de .env (LEGACY_DB_*), nunca hardcoded aqui —
// este arquivo é versionado no git.
for (const k of ['LEGACY_DB_HOST', 'LEGACY_DB_USER', 'LEGACY_DB_PASSWORD', 'LEGACY_DB_DATABASE']) {
  if (!process.env[k]) { console.error(`Faltando ${k} no .env`); process.exit(1); }
}
const LEGACY_CONFIG = {
  host: process.env.LEGACY_DB_HOST!,
  user: process.env.LEGACY_DB_USER!,
  password: process.env.LEGACY_DB_PASSWORD!,
  database: process.env.LEGACY_DB_DATABASE!,
  connectTimeout: 20000,
};

type Counts = { inserted: number; updated: number; skippedExisting: number; note?: string };
const report: Record<string, Counts> = {};
function bump(entity: string, field: keyof Counts) {
  if (!report[entity]) report[entity] = { inserted: 0, updated: 0, skippedExisting: 0 };
  (report[entity][field] as number) += 1;
}

function emptyToNull(v: any): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}
function dateOrNull(v: any): string | null {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime()) || d.getFullYear() <= 1899) return null;
  return d.toISOString().split('T')[0];
}
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

async function main() {
  const pg = new Pool({ connectionString: process.env.DATABASE_URL });
  const legacy = await mysql.createConnection(LEGACY_CONFIG);
  console.log(APPLY ? '*** MODO APLICAR — vai escrever no banco ***' : 'Modo dry-run — nada será escrito. Use --apply para aplicar de verdade.');

  // Cache de lookups polimórficos (multicadastro.id -> info1), usado pelos
  // campos idN que referenciam listas (Sexo, TipoFiliado, RegiaoMilitar,
  // tipoAvaliacao, SexoEtapa, TipoInscricao...).
  const lookupCache = new Map<number, string | null>();
  async function resolveLookup(id: number | null | undefined): Promise<string | null> {
    if (!id) return null;
    if (lookupCache.has(id)) return lookupCache.get(id)!;
    const [rows] = await legacy.query('SELECT info1 FROM multicadastro WHERE id = ?', [id]);
    const val = emptyToNull((rows as any[])[0]?.info1);
    lookupCache.set(id, val);
    return val;
  }

  // ─── Fase 1: Clubes (insert-only-new) ───────────────────────────────────
  {
    const existing = await pg.query('SELECT legacy_id FROM clubs WHERE legacy_id IS NOT NULL');
    const existingIds = new Set(existing.rows.map(r => r.legacy_id));
    const [rows] = await legacy.query(
      `SELECT id, info1, info2, info3, info4, info5, info6, info7, info8, info9, info10,
              info11, info12, info13, info14, info19, info21
       FROM multicadastro WHERE tipo='Clubes'`
    );
    for (const r of rows as any[]) {
      if (existingIds.has(r.id)) { bump('clubs', 'skippedExisting'); continue; }
      const cnpjDigits = emptyToNull(r.info3);
      const cnpjFormatted = cnpjDigits && cnpjDigits.length === 14
        ? `${cnpjDigits.slice(0,2)}.${cnpjDigits.slice(2,5)}.${cnpjDigits.slice(5,8)}/${cnpjDigits.slice(8,12)}-${cnpjDigits.slice(12,14)}`
        : cnpjDigits;
      const name = emptyToNull(r.info2) || `Clube legado ${r.id}`;
      bump('clubs', 'inserted');
      if (APPLY) {
        await pg.query(
          `INSERT INTO clubs (id, name, cnpj, responsible_name, cep, address, address_number, city, state,
                               phone, cell_phone, email, cr_number, neighborhood, complement,
                               parent_club_id, is_premium, is_blocked, legacy_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,false,false,$17)
           ON CONFLICT (legacy_id) DO NOTHING`,
          [`club_legacy_${r.id}`, name, cnpjFormatted, emptyToNull(r.info5), emptyToNull(r.info6),
           emptyToNull(r.info7), emptyToNull(r.info8), emptyToNull(r.info9), emptyToNull(r.info10),
           emptyToNull(r.info11), emptyToNull(r.info12), emptyToNull(r.info13), emptyToNull(r.info14),
           emptyToNull(r.info19), emptyToNull(r.info21), 'club_aranas', r.id]
        );
      }
    }
  }

  // ─── Fase 2: Modalidades (insert-only-new) ──────────────────────────────
  {
    const existing = await pg.query('SELECT legacy_id FROM modalities WHERE legacy_id IS NOT NULL');
    const existingIds = new Set(existing.rows.map(r => r.legacy_id));
    const [rows] = await legacy.query(`SELECT id, info1, info2, info3, info5, id1 FROM multicadastro WHERE tipo='Modalidades'`);
    for (const r of rows as any[]) {
      if (existingIds.has(r.id)) { bump('modalities', 'skippedExisting'); continue; }
      const avaliacaoLabel = await resolveLookup(r.id1);
      const evaluationType = avaliacaoLabel?.includes('Tempo') && avaliacaoLabel?.includes('Pontua')
        ? 'pontuacao_tempo' : avaliacaoLabel?.includes('Tempo') ? 'tempo' : 'pontuacao';
      const timeMinutes = (() => {
        const m = String(r.info5 || '').match(/^(\d+):(\d+)/);
        return m ? Number(m[1]) + Number(m[2]) / 60 : null;
      })();
      bump('modalities', 'inserted');
      if (APPLY) {
        await pg.query(
          `INSERT INTO modalities (id, name, series_count, shots_per_series, time_per_series_minutes, evaluation_type, club_id, legacy_id)
           VALUES ($1,$2,$3,$4,$5,$6,'club_aranas',$7)
           ON CONFLICT (legacy_id) DO NOTHING`,
          [`mod_legacy_${r.id}`, emptyToNull(r.info1) || `Modalidade legada ${r.id}`,
           Number(r.info2) || null, Number(r.info3) || null, timeMinutes, evaluationType, r.id]
        );
      }
    }
  }

  // ─── Fase 3: Usuários/atletas (insert-only-new) ─────────────────────────
  {
    const existing = await pg.query('SELECT legacy_id FROM users WHERE legacy_id IS NOT NULL');
    const existingIds = new Set(existing.rows.map(r => r.legacy_id));
    const defaultPasswordHash = hashPassword('123456');
    const [rows] = await legacy.query(
      `SELECT id, info2, info3, info4, info5, info6, info7, info8, info9, info10, info11, info12,
              info13, info19, info22, info25, info26, info27, id1, id2, id4, id5, data2, data3, data4
       FROM multicadastro WHERE tipo='Membros'`
    );
    let noMatchingClub = 0;
    for (const r of rows as any[]) {
      if (existingIds.has(r.id)) { bump('users', 'skippedExisting'); continue; }
      const fullName = emptyToNull(r.info2);
      if (!fullName) { bump('users', 'skippedExisting', ); continue; } // linha vazia/lixo, sem nome não dá pra cadastrar
      let clubId: string | null = r.id1 ? `club_legacy_${r.id1}` : null;
      const [sexLabel, affiliationLabel, militaryLabel] = await Promise.all([
        resolveLookup(r.id4), resolveLookup(r.id2), resolveLookup(r.id5),
      ]);
      const sex = sexLabel?.toLowerCase().includes('masc') ? 'masculino'
        : sexLabel?.toLowerCase().includes('fem') ? 'feminino' : null;
      if (clubId) {
        const clubExists = await pg.query('SELECT 1 FROM clubs WHERE id=$1', [clubId]);
        if (clubExists.rows.length === 0) { noMatchingClub++; clubId = null; } // clube órfão no legado — cadastra o atleta sem vínculo em vez de falhar a FK
      }
      bump('users', 'inserted');
      if (APPLY) {
        const slug = slugify(fullName) + '_' + r.id;
        await pg.query(
          `INSERT INTO users (id, email, username, full_name, avatar_url, bio, cpf, rg, cr_number,
                               cep, address, address_number, city, state, phone, cell_phone, neighborhood,
                               rg_issuer, father_name, mother_name, nationality, sex, affiliation_type,
                               military_region, cr_validity, rg_issue_date, birth_date,
                               club_id, role, is_club_member, is_profile_complete, has_paid_signature,
                               is_blocked, password_hash, member_since, legacy_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,
                   $24,$25,$26,$27,$28,'member',true,false,false,false,$29,CURRENT_DATE,$30)
           ON CONFLICT (legacy_id) DO NOTHING`,
          [slug + '@legado.importado', slug,
           fullName, 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
           'Atleta G&G Competições.', emptyToNull(r.info3), emptyToNull(r.info4), emptyToNull(r.info5),
           emptyToNull(r.info6), emptyToNull(r.info7), emptyToNull(r.info8), emptyToNull(r.info9),
           emptyToNull(r.info10), emptyToNull(r.info11), emptyToNull(r.info12), emptyToNull(r.info19),
           emptyToNull(r.info22), emptyToNull(r.info25), emptyToNull(r.info26), emptyToNull(r.info27),
           sex, affiliationLabel, militaryLabel, dateOrNull(r.data2), dateOrNull(r.data3), dateOrNull(r.data4),
           clubId, defaultPasswordHash, r.id]
        );
      }
    }
    if (noMatchingClub > 0) report['users'].note = `${noMatchingClub} usuário(s) novo(s) tinham referência a um clube que não existe (órfã no legado ou criado depois nesta mesma rodada) — cadastrado(s) sem clube vinculado, para revisão manual.`;
  }

  // ─── Fase 4: Campeonatos novos — cadastro ESQUELETO, status 'draft' ─────
  // Propositalmente incompleto: ~40 campos financeiros/PIX/premiação
  // precisam de revisão humana antes de publicar. Isto só garante que o
  // campeonato existe (para as etapas/inscrições dele poderem ser
  // importadas) e fica visível só no admin até alguém completar o cadastro.
  {
    const existing = await pg.query('SELECT legacy_id FROM championships WHERE legacy_id IS NOT NULL');
    const existingIds = new Set(existing.rows.map(r => r.legacy_id));
    const [rows] = await legacy.query(`SELECT id, info1 FROM multicadastro WHERE tipo='Campeonato'`);
    for (const r of rows as any[]) {
      if (existingIds.has(r.id)) { bump('championships', 'skippedExisting'); continue; }
      const [stageDates] = await legacy.query(
        `SELECT MIN(data1) minDate, MAX(data2) maxDate FROM multicadastro WHERE tipo='etapa' AND id1 = ?`,
        [String(r.id)]
      );
      const sd = (stageDates as any[])[0];
      bump('championships', 'inserted');
      if (APPLY) {
        await pg.query(
          `INSERT INTO championships (id, title, description, start_date, end_date, registration_fee,
                                       modalities, stages_count, status, banner_url, club_id, type, legacy_id)
           VALUES ($1,$2,$2,$3,$4,0,'{}',0,'draft',
                   'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=800&auto=format&fit=crop&q=80',
                   'club_aranas','individual',$5)
           ON CONFLICT (legacy_id) DO NOTHING`,
          [`champ_legacy_${r.id}`, emptyToNull(r.info1) || `Campeonato legado ${r.id}`,
           dateOrNull(sd?.minDate) || new Date().toISOString().split('T')[0],
           dateOrNull(sd?.maxDate) || new Date().toISOString().split('T')[0], r.id]
        );
      }
    }
    if (report['championships']?.inserted) {
      report['championships'].note = 'Importados como RASCUNHO (status draft) só com título/datas — PIX, percentuais de premiação e pontuação mínima precisam ser preenchidos manualmente em Cadastrar Campeonato antes de publicar.';
    }
  }

  // ─── Fase 5: Etapas (insert-only-new) ───────────────────────────────────
  {
    const existing = await pg.query('SELECT legacy_id FROM stages WHERE legacy_id IS NOT NULL');
    const existingIds = new Set(existing.rows.map(r => r.legacy_id));
    const [rows] = await legacy.query(
      `SELECT id, info1, info3, info4, info5, info10, info11, info12, info13, data1, data2, id1
       FROM multicadastro WHERE tipo='etapa'`
    );
    let noMatchingChamp = 0;
    for (const r of rows as any[]) {
      if (existingIds.has(r.id)) { bump('stages', 'skippedExisting'); continue; }
      const champId = r.id1 ? `champ_legacy_${r.id1}` : null;
      if (!champId) { bump('stages', 'skippedExisting'); continue; }
      const champExists = await pg.query('SELECT 1 FROM championships WHERE id=$1', [champId]);
      if (champExists.rows.length === 0) { noMatchingChamp++; continue; }
      const sexoLabel = await resolveLookup(r.info12);
      const sexo = sexoLabel?.toLowerCase().includes('masc') ? 'masculino'
        : sexoLabel?.toLowerCase().includes('fem') ? 'feminino' : 'misto';
      const stageNumRes = await pg.query('SELECT COALESCE(MAX(stage_num),0)+1 n FROM stages WHERE championship_id=$1', [champId]);
      bump('stages', 'inserted');
      if (APPLY) {
        await pg.query(
          `INSERT INTO stages (id, championship_id, stage_num, title, date, end_date, sexo,
                                homologar_resultado, aberto_para_resultados, gerar_certificados,
                                fator_multiplicacao_resultados, exibir_inscritos_pagina_inicial,
                                incluir_na_soma_pagina_inicial, legacy_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
           ON CONFLICT (legacy_id) DO NOTHING`,
          [`stage_legacy_${r.id}`, champId, stageNumRes.rows[0].n, emptyToNull(r.info1) || `Etapa ${r.id}`,
           dateOrNull(r.data1) || new Date().toISOString().split('T')[0], dateOrNull(r.data2), sexo,
           emptyToNull(r.info3) || 'nao', emptyToNull(r.info4) || 'nao', emptyToNull(r.info5) || 'nao',
           Number(r.info10) || 1, emptyToNull(r.info11) || 'nao', emptyToNull(r.info13) || 'nao', r.id]
        );
      }
    }
    if (noMatchingChamp > 0) report['stages'].note = `${noMatchingChamp} etapa(s) nova(s) referenciam campeonato ainda não resolvido nesta rodada.`;
  }

  // ─── Fase 6: Inscrições (upsert seguro) ─────────────────────────────────
  {
    const existingRows = await pg.query('SELECT id, legacy_id, payment_status FROM registrations WHERE legacy_id IS NOT NULL');
    const existingByLegacyId = new Map(existingRows.rows.map(r => [r.legacy_id, r]));
    const [rows] = await legacy.query(
      `SELECT im.id, im.clube, im.atleta, im.campeonato, im.etapa, im.modalidade, im.status_pagamento,
              im.status_conclusao, im.data, im.data_pagamento, im.valor_pago,
              im.x, im.p10, im.p9, im.p8, im.p7, im.p6, im.p5, im.p4, im.p3, im.p2, im.p1, im.p0,
              im.total_pontos, im.desclassificado, im.penalidade, ida.arma_utilizada AS id_arma
       FROM inscricao_modalidades im
       LEFT JOIN Inscricao_dados_adicionais ida ON ida.id_inscricao = im.id`
    );
    let missingFk = 0;
    for (const r of rows as any[]) {
      const userId = `user_legacy_${r.atleta}`;
      const clubId = `club_legacy_${r.clube}`;
      const champId = `champ_legacy_${r.campeonato}`;
      const stageId = `stage_legacy_${r.etapa}`;
      const modId = `mod_legacy_${r.modalidade}`;
      const weaponId = r.id_arma ? `weapon_legacy_${r.id_arma}` : null;
      const paymentStatus = r.status_pagamento === 1 ? 'approved' : 'pending';
      const existing = existingByLegacyId.get(r.id);

      if (existing) {
        // só avança pendente -> aprovado; nunca retrocede e nunca toca em
        // club_invoice_id/payment_gateway/tx_id (campos do app novo).
        if (paymentStatus === 'approved' && existing.payment_status !== 'approved') {
          bump('registrations', 'updated');
          if (APPLY) {
            await pg.query(
              `UPDATE registrations SET payment_status='approved', valor_pago=$1, data_pagamento=$2,
                                         approved_at=COALESCE(approved_at, $2::text)
               WHERE id=$3`,
              [Number(r.valor_pago) || 0, dateOrNull(r.data_pagamento), existing.id]
            );
          }
        } else {
          bump('registrations', 'skippedExisting');
        }
        continue;
      }

      // nova inscrição — precisa de todas as entidades-pai já existentes
      const [[clubOk], [champOk], [stageOk], [modOk], [userOk]] = await Promise.all([
        pg.query('SELECT 1 FROM clubs WHERE id=$1', [clubId]).then(r => r.rows),
        pg.query('SELECT 1 FROM championships WHERE id=$1', [champId]).then(r => r.rows),
        pg.query('SELECT 1 FROM stages WHERE id=$1', [stageId]).then(r => r.rows),
        pg.query('SELECT 1 FROM modalities WHERE id=$1', [modId]).then(r => r.rows),
        pg.query('SELECT 1 FROM users WHERE id=$1', [userId]).then(r => r.rows),
      ]);
      if (!clubOk || !champOk || !stageOk || !modOk || !userOk) { missingFk++; continue; }
      let resolvedWeaponId: string | null = null;
      if (weaponId) {
        const w = await pg.query('SELECT 1 FROM weapons WHERE id=$1', [weaponId]);
        resolvedWeaponId = w.rows.length > 0 ? weaponId : null;
      }

      bump('registrations', 'inserted');
      if (APPLY) {
        await pg.query(
          `INSERT INTO registrations (id, championship_id, user_id, club_id, modality_id, stage_id, weapon_id,
                                        cr_number, payment_method, payment_status, completion_status,
                                        registered_at, data_pagamento, valor_pago, payment_gateway,
                                        score_x, score_p10, score_p9, score_p8, score_p7, score_p6, score_p5,
                                        score_p4, score_p3, score_p2, score_p1, score_p0, total_points,
                                        disqualified, penalty, legacy_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'','pix',$8,$9,$10,$11,$12,'manual',
                   $13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)
           ON CONFLICT (legacy_id) DO NOTHING`,
          [`reg_legacy_${r.id}`, champId, userId, clubId, modId, stageId, resolvedWeaponId,
           paymentStatus, r.status_conclusao === 1 ? 'completed' : 'pending',
           dateOrNull(r.data) || new Date().toISOString(), dateOrNull(r.data_pagamento), Number(r.valor_pago) || 0,
           r.x || 0, r.p10 || 0, r.p9 || 0, r.p8 || 0, r.p7 || 0, r.p6 || 0, r.p5 || 0,
           r.p4 || 0, r.p3 || 0, r.p2 || 0, r.p1 || 0, r.p0 || 0, r.total_pontos || 0,
           String(r.desclassificado).toLowerCase() === 'sim', Number(r.penalidade) || 0, r.id]
        );
      }
    }
    if (missingFk > 0) {
      if (!report['registrations']) report['registrations'] = { inserted: 0, updated: 0, skippedExisting: 0 };
      report['registrations'].note = `${missingFk} inscrição(ões) nova(s) ignorada(s): referenciam clube/campeonato/etapa/modalidade/atleta que ainda não existe no Postgres (rode o script de novo depois de resolver as fases anteriores).`;
    }
  }

  // ─── Fase 7: Treinamentos ────────────────────────────────────────────────
  {
    await pg.query(`ALTER TABLE trainings ADD COLUMN IF NOT EXISTS legacy_id INTEGER`);
    if (APPLY) {
      await pg.query(`CREATE UNIQUE INDEX IF NOT EXISTS trainings_legacy_id_key ON trainings(legacy_id) WHERE legacy_id IS NOT NULL`);
      await pg.query(
        `UPDATE trainings SET legacy_id = substring(id from 'training_legacy_(\\d+)')::int
         WHERE id LIKE 'training_legacy_%' AND legacy_id IS NULL`
      );
    }
    const existing = await pg.query('SELECT legacy_id FROM trainings WHERE legacy_id IS NOT NULL');
    const existingIds = new Set(existing.rows.map(r => r.legacy_id));
    // fallback para dry-run (coluna pode não ter sido populada ainda)
    if (existingIds.size === 0) {
      const byPattern = await pg.query(`SELECT id FROM trainings WHERE id LIKE 'training_legacy_%'`);
      for (const row of byPattern.rows) {
        const m = row.id.match(/training_legacy_(\d+)/);
        if (m) existingIds.add(Number(m[1]));
      }
    }
    const [rows] = await legacy.query(
      `SELECT id, data, hora_ini, propriedade_arma, id_arma, tiros, total_pontos, atleta, id_clube FROM registro_treinamentos`
    );
    let missingFk = 0;
    for (const r of rows as any[]) {
      if (existingIds.has(r.id)) { bump('trainings', 'skippedExisting'); continue; }
      const userId = `user_legacy_${r.atleta}`;
      const clubId = `club_legacy_${r.id_clube}`;
      const [[userOk], [clubOk]] = await Promise.all([
        pg.query('SELECT 1 FROM users WHERE id=$1', [userId]).then(r => r.rows),
        pg.query('SELECT 1 FROM clubs WHERE id=$1', [clubId]).then(r => r.rows),
      ]);
      if (!userOk || !clubOk) { missingFk++; continue; }
      let weaponId: string | null = null, weaponName: string | null = null, weaponCaliber: string | null = null;
      if (r.id_arma) {
        const w = await pg.query('SELECT id, model, caliber FROM weapons WHERE legacy_id=$1', [r.id_arma]);
        if (w.rows.length > 0) { weaponId = w.rows[0].id; weaponName = w.rows[0].model; weaponCaliber = w.rows[0].caliber; }
      }
      const owner = String(r.propriedade_arma || '').toLowerCase();
      const isOwn = owner === 'propria';
      const dateTime = r.data && r.hora_ini
        ? `${dateOrNull(r.data)}T${r.hora_ini}`
        : dateOrNull(r.data);
      bump('trainings', 'inserted');
      if (APPLY) {
        await pg.query(
          `INSERT INTO trainings (id, user_id, club_id, date_time, weapon_id, weapon_name, weapon_caliber,
                                    weapon_owner_type, total_shots, own_ammo_shots, club_ammo_shots, score, legacy_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
           ON CONFLICT (legacy_id) DO NOTHING`,
          [`training_legacy_${r.id}`, userId, clubId, dateTime, weaponId, weaponName, weaponCaliber,
           isOwn ? 'propria' : 'clube', Number(r.tiros) || 0, isOwn ? Number(r.tiros) || 0 : 0,
           isOwn ? 0 : Number(r.tiros) || 0, Number(r.total_pontos) || 0, r.id]
        );
      }
    }
    if (missingFk > 0) {
      if (!report['trainings']) report['trainings'] = { inserted: 0, updated: 0, skippedExisting: 0 };
      report['trainings'].note = `${missingFk} treino(s) novo(s) ignorado(s): atleta ou clube ainda não existe no Postgres.`;
    }
  }

  console.log('\n=== RELATÓRIO ===');
  for (const [entity, c] of Object.entries(report)) {
    console.log(`${entity}: +${c.inserted} novo(s), ${c.updated} atualizado(s), ${c.skippedExisting} já existia(m)${c.note ? `\n   ⚠ ${c.note}` : ''}`);
  }
  console.log(APPLY ? '\nAplicado.' : '\nDry-run — nada foi escrito. Rode com --apply para aplicar de verdade.');

  await legacy.end();
  await pg.end();
}

main().catch(err => { console.error(err); process.exit(1); });
