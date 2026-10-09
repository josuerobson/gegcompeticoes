// TEMPORÁRIO — importação final do legado (corte de 2026-10-07).
// Porta de scripts/import-legacy-final.ts para rodar dentro do servidor (o
// Postgres de produção só é acessível pela rede interna do EasyPanel). Em vez
// de conectar no MySQL do legado, recebe as linhas já extraídas localmente.
// Será removido do repositório depois de aplicado.
//
// Regras (as mesmas do script original):
// - Clubes/Modalidades/Usuários/Campeonatos/Etapas: só INSERE o que ainda não
//   existe (match por legacy_id); nunca atualiza linha existente.
// - Campeonatos novos entram como rascunho ('draft').
// - Inscrições existentes só avançam de pendente -> aprovado; novas são inseridas.
// - Treinamentos: insert-only-new.
// - Armas novas NÃO são criadas.
import type { Pool } from 'pg';
import { hashPassword } from './auth.js';

export interface LegacyFinalData {
  lookup: Record<string, string | null>;
  clubs: any[];
  modalities: any[];
  members: any[];
  campeonatos: any[];
  stageDates: Record<string, { minDate: string | null; maxDate: string | null }>;
  etapas: any[];
  inscricoes: any[];
  treinos: any[];
  // CPF (só dígitos) de atletas referenciados que não estão em members — permite vincular à mesma pessoa já cadastrada.
  cpfByAtleta?: Record<string, string>;
}

type Counts = { inserted: number; updated: number; skippedExisting: number; note?: string };

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
// O clube 1001 do legado é o próprio Aranãs, cujo id no sistema novo é club_aranas (não club_legacy_1001).
const clubIdOf = (legacyId: any): string => (Number(legacyId) === 1001 ? 'club_aranas' : `club_legacy_${legacyId}`);

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

export async function applyLegacyFinalImport(pg: Pool, data: LegacyFinalData, apply: boolean) {
  const report: Record<string, Counts> = {};
  const bump = (entity: string, field: keyof Counts) => {
    if (!report[entity]) report[entity] = { inserted: 0, updated: 0, skippedExisting: 0 };
    (report[entity][field] as number) += 1;
  };
  const resolveLookup = (id: number | null | undefined): string | null => {
    if (!id) return null;
    return emptyToNull(data.lookup[String(id)]);
  };

  // Pessoa já cadastrada com o mesmo CPF (login é por CPF): usada quando o atleta legado referenciado
  // não existe como user_legacy_<id> mas o CPF dele já está no sistema.
  const cpfRows = await pg.query(`SELECT id, regexp_replace(cpf, '[^0-9]', '', 'g') AS d FROM users WHERE cpf IS NOT NULL ORDER BY (id LIKE 'user_legacy_%') DESC, id`);
  const userByCpf = new Map<string, string>();
  for (const r of cpfRows.rows) { if (r.d && !userByCpf.has(r.d)) userByCpf.set(r.d, r.id); }
  const userByLegacyAtleta = (atleta: any): string | null => {
    const d = String(data.cpfByAtleta?.[String(atleta)] || '').replace(/\D/g, '');
    return d ? userByCpf.get(d) || null : null;
  };

  // ─── Fase 1: Clubes ─────────────────────────────────────────────────────
  {
    const existing = await pg.query('SELECT legacy_id FROM clubs WHERE legacy_id IS NOT NULL');
    const existingIds = new Set(existing.rows.map(r => r.legacy_id));
    for (const r of data.clubs) {
      if (existingIds.has(r.id)) { bump('clubs', 'skippedExisting'); continue; }
      const cnpjDigits = emptyToNull(r.info3);
      const cnpjFormatted = cnpjDigits && cnpjDigits.length === 14
        ? `${cnpjDigits.slice(0,2)}.${cnpjDigits.slice(2,5)}.${cnpjDigits.slice(5,8)}/${cnpjDigits.slice(8,12)}-${cnpjDigits.slice(12,14)}`
        : cnpjDigits;
      const name = emptyToNull(r.info2) || `Clube legado ${r.id}`;
      bump('clubs', 'inserted');
      if (apply) {
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

  // ─── Fase 2: Modalidades ────────────────────────────────────────────────
  {
    const existing = await pg.query('SELECT legacy_id FROM modalities WHERE legacy_id IS NOT NULL');
    const existingIds = new Set(existing.rows.map(r => r.legacy_id));
    for (const r of data.modalities) {
      if (existingIds.has(r.id)) { bump('modalities', 'skippedExisting'); continue; }
      const avaliacaoLabel = resolveLookup(r.id1);
      const evaluationType = avaliacaoLabel?.includes('Tempo') && avaliacaoLabel?.includes('Pontua')
        ? 'pontuacao_tempo' : avaliacaoLabel?.includes('Tempo') ? 'tempo' : 'pontuacao';
      const timeMinutes = (() => {
        const m = String(r.info5 || '').match(/^(\d+):(\d+)/);
        return m ? Number(m[1]) + Number(m[2]) / 60 : null;
      })();
      bump('modalities', 'inserted');
      if (apply) {
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

  // ─── Fase 3: Usuários/atletas ───────────────────────────────────────────
  {
    const existing = await pg.query('SELECT legacy_id FROM users WHERE legacy_id IS NOT NULL');
    const existingIds = new Set(existing.rows.map(r => r.legacy_id));
    const defaultPasswordHash = hashPassword('123456');
    // Login é por CPF: nunca cria um segundo usuário com um CPF que já existe.
    const cpfRes = await pg.query(`SELECT regexp_replace(cpf, '[^0-9]', '', 'g') AS d FROM users WHERE cpf IS NOT NULL`);
    const existingCpfs = new Set(cpfRes.rows.map(r => r.d as string).filter(Boolean));
    let noMatchingClub = 0;
    let cpfAlreadyExists = 0;
    for (const r of data.members) {
      if (existingIds.has(r.id)) { bump('users', 'skippedExisting'); continue; }
      const fullName = emptyToNull(r.info2);
      if (!fullName) { bump('users', 'skippedExisting'); continue; }
      const cpfDigits = String(r.info3 || '').replace(/\D/g, '');
      if (cpfDigits && existingCpfs.has(cpfDigits)) { cpfAlreadyExists++; bump('users', 'skippedExisting'); continue; }
      if (cpfDigits) existingCpfs.add(cpfDigits);
      // Sem clube (ou clube fora do Aranãs): vai para o Aranãs, como na importação original.
      let clubId: string | null = r.id1 ? clubIdOf(r.id1) : 'club_aranas';
      const sexLabel = resolveLookup(r.id4);
      const affiliationLabel = resolveLookup(r.id2);
      const militaryLabel = resolveLookup(r.id5);
      const sex = sexLabel?.toLowerCase().includes('masc') ? 'masculino'
        : sexLabel?.toLowerCase().includes('fem') ? 'feminino' : null;
      if (clubId) {
        const clubExists = await pg.query('SELECT 1 FROM clubs WHERE id=$1', [clubId]);
        // Em dry-run clubes novos ainda não existem no banco — só conta como órfão quando também não está na lista a inserir.
        const willBeInserted = !apply && data.clubs.some(c => clubIdOf(c.id) === clubId);
        if (clubExists.rows.length === 0 && !willBeInserted) { noMatchingClub++; clubId = 'club_aranas'; }
      }
      bump('users', 'inserted');
      if (apply) {
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
          [`user_legacy_${r.id}`, slug + '@legado.importado', slug,
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
    const userNotes: string[] = [];
    if (noMatchingClub > 0) userNotes.push(`${noMatchingClub} usuário(s) novo(s) com clube inexistente — cadastrado(s) no Aranãs.`);
    if (cpfAlreadyExists > 0) userNotes.push(`${cpfAlreadyExists} atleta(s) ignorado(s): o CPF já existe no sistema.`);
    if (userNotes.length > 0) {
      if (!report['users']) report['users'] = { inserted: 0, updated: 0, skippedExisting: 0 };
      report['users'].note = userNotes.join(' ');
    }
  }

  // ─── Fase 4: Campeonatos novos (rascunho) ───────────────────────────────
  {
    const existing = await pg.query('SELECT legacy_id FROM championships WHERE legacy_id IS NOT NULL');
    const existingIds = new Set(existing.rows.map(r => r.legacy_id));
    for (const r of data.campeonatos) {
      if (existingIds.has(r.id)) { bump('championships', 'skippedExisting'); continue; }
      const sd = data.stageDates[String(r.id)];
      bump('championships', 'inserted');
      if (apply) {
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
  }

  // ─── Fase 5: Etapas ─────────────────────────────────────────────────────
  const newStageIds: string[] = [];
  {
    const existing = await pg.query('SELECT legacy_id FROM stages WHERE legacy_id IS NOT NULL');
    const existingIds = new Set(existing.rows.map(r => r.legacy_id));
    let noMatchingChamp = 0;
    for (const r of data.etapas) {
      if (existingIds.has(r.id)) { bump('stages', 'skippedExisting'); continue; }
      const champId = r.id1 ? `champ_legacy_${r.id1}` : null;
      if (!champId) { bump('stages', 'skippedExisting'); continue; }
      const champExists = await pg.query('SELECT 1 FROM championships WHERE id=$1', [champId]);
      const champWillBeInserted = !apply && data.campeonatos.some(c => `champ_legacy_${c.id}` === champId);
      if (champExists.rows.length === 0 && !champWillBeInserted) { noMatchingChamp++; continue; }
      const sexoLabel = resolveLookup(r.info12);
      const sexo = sexoLabel?.toLowerCase().includes('masc') ? 'masculino'
        : sexoLabel?.toLowerCase().includes('fem') ? 'feminino' : 'misto';
      const stageNumRes = await pg.query('SELECT COALESCE(MAX(stage_num),0)+1 n FROM stages WHERE championship_id=$1', [champId]);
      bump('stages', 'inserted');
      newStageIds.push(`stage_legacy_${r.id}`);
      (report['stages'] as any).detail = [
        ...(((report['stages'] as any).detail as string[]) || []),
        `${emptyToNull(r.info1) || `Etapa ${r.id}`} (legado ${r.id}) -> ${champId}`,
      ];
      if (apply) {
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
    if (noMatchingChamp > 0) report['stages'].note = `${noMatchingChamp} etapa(s) nova(s) referenciam campeonato ainda não resolvido.`;
  }

  // Numeração: o MAX+1 acima numeraria a "7ª ETAPA" importada como 8, porque o
  // app novo já criou uma "8ª ETAPA" com número 7 nesses campeonatos. Nos
  // campeonatos que ganharam etapa nova, o número passa a seguir o número do
  // título ("7ª" = 7, "8ª" = 8). Só toca em etapas cujo título começa com "Nª".
  if (apply && newStageIds.length > 0) {
    const champsTouched = await pg.query(
      `SELECT DISTINCT championship_id FROM stages WHERE id = ANY($1::text[])`, [newStageIds]
    );
    const fixed = await pg.query(
      `UPDATE stages SET stage_num = (regexp_match(title, '^\\s*(\\d+)'))[1]::int
       WHERE championship_id = ANY($1::text[]) AND title ~ '^\\s*\\d+\\s*ª'
         AND stage_num <> (regexp_match(title, '^\\s*(\\d+)'))[1]::int
       RETURNING id, title, stage_num`,
      [champsTouched.rows.map(r => r.championship_id)]
    );
    (report['stages'] as any).renumbered = fixed.rows.map(r => `${r.id}: "${String(r.title).trim()}" -> nº ${r.stage_num}`);
  }

  // ─── Fase 6: Inscrições ─────────────────────────────────────────────────
  {
    const existingRows = await pg.query('SELECT id, legacy_id, payment_status FROM registrations WHERE legacy_id IS NOT NULL');
    const existingByLegacyId = new Map(existingRows.rows.map(r => [r.legacy_id, r]));
    // Em dry-run, entidades-pai "a inserir" ainda não existem no banco — considera-as presentes.
    const pendingStage = new Set(apply ? [] : data.etapas.map(e => `stage_legacy_${e.id}`));
    const pendingChamp = new Set(apply ? [] : data.campeonatos.map(c => `champ_legacy_${c.id}`));
    let missingFk = 0;
    for (const r of data.inscricoes) {
      let userId = `user_legacy_${r.atleta}`;
      const clubId = clubIdOf(r.clube);
      const champId = `champ_legacy_${r.campeonato}`;
      const stageId = `stage_legacy_${r.etapa}`;
      const modId = `mod_legacy_${r.modalidade}`;
      const weaponId = r.id_arma ? `weapon_legacy_${r.id_arma}` : null;
      const paymentStatus = r.status_pagamento === 1 ? 'approved' : 'pending';
      const existing = existingByLegacyId.get(r.id);

      if (existing) {
        if (paymentStatus === 'approved' && existing.payment_status !== 'approved') {
          bump('registrations', 'updated');
          if (apply) {
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

      const [clubOk, champOk, stageOk, modOk, userOk] = await Promise.all([
        pg.query('SELECT 1 FROM clubs WHERE id=$1', [clubId]).then(x => x.rows.length > 0 || (!apply && data.clubs.some(c => clubIdOf(c.id) === clubId))),
        pg.query('SELECT 1 FROM championships WHERE id=$1', [champId]).then(x => x.rows.length > 0 || pendingChamp.has(champId)),
        pg.query('SELECT 1 FROM stages WHERE id=$1', [stageId]).then(x => x.rows.length > 0 || pendingStage.has(stageId)),
        pg.query('SELECT 1 FROM modalities WHERE id=$1', [modId]).then(x => x.rows.length > 0 || (!apply && data.modalities.some(m => `mod_legacy_${m.id}` === modId))),
        pg.query('SELECT 1 FROM users WHERE id=$1', [userId]).then(x => x.rows.length > 0 || (!apply && data.members.some(m => `user_legacy_${m.id}` === userId))),
      ]);
      let userOkFinal = userOk;
      if (!userOkFinal) {
        const alt = userByLegacyAtleta(r.atleta);
        if (alt) { userId = alt; userOkFinal = true; (report['registrations'] ||= { inserted: 0, updated: 0, skippedExisting: 0 }); ((report as any).__viaCpf ||= { registrations: 0, trainings: 0 }).registrations++; }
      }
      if (!clubOk || !champOk || !stageOk || !modOk || !userOkFinal) {
        missingFk++;
        // Motivo do descarte; "noAranas" = o campeonato da inscrição é da loja 2017 (as demais são de outros sites do legado).
        const det = ((report as any).__skipDetail ||= { total: {} as Record<string, number>, aranas: {} as Record<string, number> });
        const inAranas = data.campeonatos.some(c => `champ_legacy_${c.id}` === champId);
        const reasons = [!clubOk && 'clube', !champOk && 'campeonato', !stageOk && 'etapa', !modOk && 'modalidade', !userOk && 'atleta'].filter(Boolean) as string[];
        for (const k of reasons) {
          det.total[k] = (det.total[k] || 0) + 1;
          if (inAranas) det.aranas[k] = (det.aranas[k] || 0) + 1;
        }
        if (inAranas) det.aranas.__linhas = (det.aranas.__linhas || 0) + 1;
        continue;
      }
      let resolvedWeaponId: string | null = null;
      if (weaponId) {
        const w = await pg.query('SELECT 1 FROM weapons WHERE id=$1', [weaponId]);
        resolvedWeaponId = w.rows.length > 0 ? weaponId : null;
      }

      bump('registrations', 'inserted');
      if (!report['registrations_by_stage']) report['registrations_by_stage'] = { inserted: 0, updated: 0, skippedExisting: 0 };
      ((report['registrations_by_stage'] as any).byStage ||= {})[stageId] = (((report['registrations_by_stage'] as any).byStage || {})[stageId] || 0) + 1;
      if (apply) {
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
      report['registrations'].note = `${missingFk} inscrição(ões) nova(s) ignorada(s): referenciam clube/campeonato/etapa/modalidade/atleta inexistente.`;
    }
  }

  // ─── Fase 7: Treinamentos ───────────────────────────────────────────────
  {
    const colRes = await pg.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name='trainings' AND column_name='legacy_id'`
    );
    if (apply) {
      await pg.query(`ALTER TABLE trainings ADD COLUMN IF NOT EXISTS legacy_id INTEGER`);
      await pg.query(`CREATE UNIQUE INDEX IF NOT EXISTS trainings_legacy_id_key ON trainings(legacy_id) WHERE legacy_id IS NOT NULL`);
      await pg.query(
        `UPDATE trainings SET legacy_id = substring(id from 'training_legacy_(\\d+)')::int
         WHERE id LIKE 'training_legacy_%' AND legacy_id IS NULL`
      );
    }
    const existingIds = new Set<number>();
    if (colRes.rows.length > 0 || apply) {
      const existing = await pg.query('SELECT legacy_id FROM trainings WHERE legacy_id IS NOT NULL');
      existing.rows.forEach(r => existingIds.add(Number(r.legacy_id)));
    }
    const byPattern = await pg.query(`SELECT id FROM trainings WHERE id LIKE 'training_legacy_%'`);
    for (const row of byPattern.rows) {
      const m = String(row.id).match(/training_legacy_(\d+)/);
      if (m) existingIds.add(Number(m[1]));
    }
    let missingFk = 0;
    for (const r of data.treinos) {
      if (existingIds.has(r.id)) { bump('trainings', 'skippedExisting'); continue; }
      let userId = `user_legacy_${r.atleta}`;
      const clubId = clubIdOf(r.id_clube);
      const [userOk, clubOk] = await Promise.all([
        pg.query('SELECT 1 FROM users WHERE id=$1', [userId]).then(x => x.rows.length > 0 || (!apply && data.members.some(m => `user_legacy_${m.id}` === userId))),
        pg.query('SELECT 1 FROM clubs WHERE id=$1', [clubId]).then(x => x.rows.length > 0 || (!apply && data.clubs.some(c => clubIdOf(c.id) === clubId))),
      ]);
      let userOkFinal = userOk;
      if (!userOkFinal) {
        const alt = userByLegacyAtleta(r.atleta);
        if (alt) { userId = alt; userOkFinal = true; ((report as any).__viaCpf ||= { registrations: 0, trainings: 0 }).trainings++; }
      }
      if (!userOkFinal || !clubOk) { missingFk++; continue; }
      let weaponId: string | null = null, weaponName: string | null = null, weaponCaliber: string | null = null;
      if (r.id_arma) {
        const w = await pg.query('SELECT id, model, caliber FROM weapons WHERE legacy_id=$1', [r.id_arma]);
        if (w.rows.length > 0) { weaponId = w.rows[0].id; weaponName = w.rows[0].model; weaponCaliber = w.rows[0].caliber; }
      }
      const isOwn = String(r.propriedade_arma || '').toLowerCase() === 'propria';
      const dateTime = r.data && r.hora_ini
        ? `${dateOrNull(r.data)}T${r.hora_ini}`
        : dateOrNull(r.data);
      bump('trainings', 'inserted');
      if (apply) {
        await pg.query(
          `INSERT INTO trainings (id, user_id, club_id, date_time, weapon_id, weapon_name, weapon_caliber,
                                    weapon_owner_type, total_shots, own_ammo_shots, club_ammo_shots, score, legacy_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
           ON CONFLICT (legacy_id) WHERE legacy_id IS NOT NULL DO NOTHING`,
          [`training_legacy_${r.id}`, userId, clubId, dateTime, weaponId, weaponName || 'Arma não identificada (legado)', weaponCaliber,
           isOwn ? 'propria' : 'clube', Number(r.tiros) || 0, isOwn ? Number(r.tiros) || 0 : 0,
           isOwn ? 0 : Number(r.tiros) || 0, Number(r.total_pontos) || 0, r.id]
        );
      }
    }
    if (missingFk > 0) {
      if (!report['trainings']) report['trainings'] = { inserted: 0, updated: 0, skippedExisting: 0 };
      report['trainings'].note = `${missingFk} treino(s) novo(s) ignorado(s): atleta ou clube inexistente.`;
    }
  }

  return { apply, report, newStageIds };
}
