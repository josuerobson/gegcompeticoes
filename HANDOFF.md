# Handoff — G&G Competições (gegcompeticoes)

This is a knowledge-transfer document, not auto-loaded by Claude Code (unlike `CLAUDE.md`, which *is* loaded into every session automatically and stays intentionally short). Read this when you need the fuller picture — what exists, what's simulated, what decisions were already made and why, and what's still open. Written 2026-07-14.

---

## 🔖 Último commit / estado de deploy

| Campo | Valor |
|-------|-------|
| Hash | `d8e6183` |
| Mensagem | `feat: exige data e hora de execucao ao cadastrar resultados` |
| Data/hora | 2026-07-15T21:44:00-03:00 |
| Push feito? | ✅ Sim |
| Deploy EasyPanel confirmado? | ✅ Sim (disparado via Webhook) |
| Tarefa estava completa? | ✅ Sim |

> **Para a próxima IA:** antes de continuar qualquer desenvolvimento, verifique se o commit
> `d8e6183` está refletido nos logs. Use o curl abaixo (sem autenticacão, retorna JSON):
>
> ```bash
> curl https://logs-do-easypanel-logs.5450wp.easypanel.host/gegcompeticoes/web/all
> ```
>
> Se o deploy falhou ou ainda está pendente, dispare-o antes de adicionar novas features.
> Instrucoes de deploy com API key estao no `AGENTS.md`.

---

## How to log in / test credentials

Login is **CPF + password**, not email/username (`POST /api/auth/login`, CPF digits only matched via `regexp_replace`). All seed accounts share password `123456` (re-converged on every server boot if `password_hash` is null — see `DEMO_PASSWORD_HASH` in `src/db.ts`).

| CPF | Username | Role | Notes |
|---|---|---|---|
| 111.111.111-11 | guilherme_gg | master_admin | Full Painel Diretor access, incl. "Listas de Armas" |
| 222.222.222-22 | gabriel_gg | club_admin | Sees Painel Diretor but not master-only screens |
| 333.333.333-33 | ana_precision | member | Athlete |
| 444.444.444-44 | roberto_ipsc | member | Athlete |
| 555.555.555-55 | carla_trap | member | Athlete |

Anyone can also self-register (no invite/approval needed): the landing page's "Cadastrar" flow offers **Membro** (individual athlete, must pick an existing `clubId`) or **Clube** (creates a new club + its `club_admin` login in one step). Both log the user in immediately — there is no email verification anywhere in the app.

## What the app actually is, area by area

**Feed** (`FeedView.tsx`) — Instagram-style social feed. Posts, likes, comments are all real/persisted (`/api/posts`). Post creation itself lives in `MemberProfile.tsx` ("Publicar Nova Foto"), not in the feed view.

**Campeonatos (athlete side)** (`ChampionshipsView.tsx`) — browse championships, register for one by picking modality → stage → weapon → CR number → payment method. Also hosts "Líderes e Rankings" (real leaderboard, computed server-side from `stage_scores`, see `GET /api/rankings`).

**Meu Cadastro** (`MemberProfile.tsx`) — progressive, section-by-section profile completion (Dados Cadastrais / Contato / Endereço / Documentos for members; club-flavored equivalents for club admins). A member's profile must be complete (`USER_PROFILE_REQUIRED_COLUMNS` in `server.ts`) before they can register for a championship. Admin-created members (via Painel Diretor > Cadastrar Membros) complete their own profile through the *same* section-by-section pattern, just a different endpoint (`PATCH /api/admin/members/:id/profile` vs. `PATCH /api/users/me/profile`).

**Painel Diretor** (`AdminPanel.tsx`) — the admin surface, three tabs (Gerenciamento Clube / Gerenciamento Plataforma / Administrador Master). See `CLAUDE.md`'s "Painel Diretor module status" for the current real-vs-mock breakdown; don't re-derive that from scratch, it's kept up to date there. Short version: Novo Clube, Cadastrar Membros, Modalidades, Novo Campeonato, Etapas, and Cadastro de Armas + Listas de Armas are all real end-to-end (built/verified 2026-07-13/14). Most of ADM beyond armas, all of IDSC, all of SITE, and the Master tab's Gerenciar Clubes/Gestão de Cobranças are still the original decorative mock scaffold.

## ⚠️ Things that look real but aren't

- **Payment is entirely simulated.** Registering for a championship shows a fake "processing" delay (`setTimeout`, `ChampionshipsView.tsx`) and a hardcoded fake PIX key. Server-side, `POST /api/championships/:id/register` sets `paymentStatus: 'approved'` unconditionally — literally commented `// Auto approved for responsive demonstration flow!` in `server.ts`. No payment gateway is wired up anywhere in the app, including in the new Campeonato cadastro's PIX config fields (those are captured/stored only — see below).
- **No email verification** on signup, ever.
- **`weaponType`/legacy free-text fields**: some older weapon rows may still have values in columns that the current form no longer collects (`weapon_type`) — harmless, just don't be surprised if you see them on old data.

## Decisions made this session, and why (don't re-litigate without new info)

These came directly from the user reviewing legacy-system specs (real HTML forms from the system being migrated from) and correcting my initial assumptions — they're deliberate, not oversights:

- **Modality "regras" (séries/tiros/tempo/avaliação) are fixed on the Modalidade itself and cannot be overridden per-Campeonato.** The Campeonato cadastro only lets you *select* which modalities apply. Rationale given by the user: this preserves the ability to import data from the legacy system without losing that constraint. If a future request asks to make these editable per-championship, confirm it's an intentional reversal, not a misunderstanding.
- **Campeonato's "% Premiação Atleta" cascades in a specific, non-obvious way**: it splits into 4 buckets (Todas as Etapas / Ouro / Prata / Bronze) that must sum to 100% of it; "Todas as Etapas" has its own 1º–5º position curve, while Ouro/Prata/Bronze **share one** 1º–5º curve reapplied inside each bucket. See `ChampExtraFields` in `AdminPanel.tsx` and the percentage columns in `server.ts`'s `CHAMPIONSHIP_EXTRA_COLUMNS`.
- **PIX fields on Campeonato are admin-side data capture only**, not wired into the athlete registration flow — that would be a separate, larger piece of work (see "Open items" below).
- **Armas stays club-scoped, not athlete-scoped**, despite an earlier written spec suggesting an `atleta_id` picker — the actual legacy HTML titled "Cadastro de armas do clube" has no owner picker at all, so the existing club-scoped model (already in production) was kept and just fixed for a latent bug (an admin could previously pass an arbitrary `ownerId`; now `club_admin`/`admin` roles are forced to their own club server-side regardless of what's sent, only `master_admin` can target an explicit owner).
- **Weapon Classe/Modelo/Calibre/Fabricante/Arma é/Status de permissão are one shared `weapon_lookup_options` table** (`kind` column distinguishes the six lists) rather than six separate tables, since they're structurally identical (id + label). Management is restricted to `master_admin` per explicit instruction — normal club admins only pick from existing options, no inline "add new" in their form (unlike the legacy system, which let anyone add inline).
- **"Cadastro de Modalidades" has no category/discipline field.** An earlier iteration added one by inference from a decorative mock form; the user clarified it doesn't exist in the real system and to drop it. The DB column (`modalities.discipline`) was kept (nullable) rather than dropped, per the project's no-destructive-migration rule — it's just unused going forward.
- **Re-entries (Reinscrições) are automatically detected and charged differently**: Instead of blocking re-registration, the system detects if the user is already registered for the same modality and stage in that championship, charging the `valor_reinscricao` rather than the `valor_inscricao_individual`.
- **Result entries are made on a per-series basis with automatic best-series calculation**: The user enters points for each shot series across target zones (X, 10, 9, ..., 0). The backend stores the full series details in a JSON column and populates the physical columns (`score_x`...`score_p0` and `total_points`) with the values from the best series, maintaining parity with the legacy database.

## Infra / deploy

Production runs on EasyPanel (`gegcompeticoes-web.5450wp.easypanel.host`), not any CI/CD in this repo. Deploys are: push to `origin/main` → trigger EasyPanel's deploy API manually (the webhook is unreliable) → check EasyPanel's log endpoint for a clean build + boot. Postgres 17 and MinIO are separate EasyPanel services on the same internal network. None of the actual endpoints/tokens are in this repo (by design — don't add them here); if you're a Claude Code session working with this user, check project memory for `reference-easypanel-deploy`, or ask the user for a fresh API token from the EasyPanel dashboard if a deploy call 401s.

## Open items / natural next steps

- Real payment integration (currently 100% simulated) — biggest gap between "looks done" and "is done."
- Wiring the new Campeonato PIX fields into the athlete-facing registration UI, if/when real payment is tackled.
- Converting the remaining decorative Painel Diretor screens (see module-status list in `CLAUDE.md`) to real cadastros.
- Adding automated tests for the critical registration and scoring calculations to safeguard against regressions.
