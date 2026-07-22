# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — starts the app (single process: Express API + Vite dev middleware) on `http://localhost:3000`. Requires `DATABASE_URL` in `.env` (see `.env.example`); the app refuses to start without it.
- `npm run build` — `vite build` (client bundle to `dist/`) then `esbuild server.ts` bundled to `dist/server.cjs`.
- `npm start` — runs the production build (`node dist/server.cjs`). Requires `NODE_ENV=production`, otherwise the server tries to boot a Vite dev server instead of serving `dist/`.
- `npm run lint` — `tsc --noEmit`. This is the only automated check in the repo; there is no test suite (no test runner in `package.json`, no `*.test.*`/`*.spec.*` files). Verify behavior by running the app and exercising it manually (or via the browser preview tools).

## Architecture

**Single Express server, no separate API service.** `server.ts` is one file that both serves the REST API (`/api/*`) and, depending on `NODE_ENV`, either mounts the Vite dev server in middleware mode (`npm run dev`) or serves the built `dist/` static assets with an SPA catch-all (`npm start`). There's no separate backend deployment — `startServer()` calls `initDB()` then `app.listen()` on port 3000.

**No ORM.** All database access is raw `pg` (node-postgres) queries in `server.ts`. Schema lives entirely in `src/db.ts`'s `initDB()`, which runs on every boot:
- Tables are created with `CREATE TABLE IF NOT EXISTS`.
- Schema changes to existing tables are **always** additive: `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, `ALTER COLUMN ... DROP NOT NULL` — never `DROP COLUMN` and never a destructive `NOT NULL` on an existing column, since production is never empty. This pattern is used consistently across `championships`, `stages`, `weapons`, `modalities`, `clubs`, `users` — follow it for any new column.
- Reference/seed data (demo users, clubs, modalities, championships, weapon lookup options) converges via `INSERT ... ON CONFLICT (id) DO UPDATE` from `src/data/mockData.ts`, not "insert only if table is empty" — so re-running `initDB()` against a partially-populated production database keeps seed rows in sync instead of skipping them.
- Row types map between `snake_case` (Postgres columns) and `camelCase` (TS) via `mapX()` functions near the top of `server.ts` (`mapUser`, `mapClub`, `mapChampionship`, `mapStage`, `mapWeapon`, `mapModality`, `mapWeaponLookupOption`, ...). Every route reads/writes through these, never raw rows.
- For endpoints with many optional fields (e.g. championships, stages), the pattern is a `Record<string, string>` map of `{ camelCaseKey: snake_case_column }` (e.g. `CHAMPIONSHIP_EXTRA_COLUMNS`, `STAGE_EXTRA_COLUMNS`) that's iterated to build dynamic `INSERT`/`UPDATE` column lists — only columns actually present in the request body are touched. Reuse this pattern instead of hand-writing a fixed-arity `INSERT` when a form has more than ~6 optional fields.

**Auth is a trusted client header, not a session/JWT.** The Express middleware in `server.ts` reads `x-user-id` from every request, loads that user from Postgres, and attaches it to `req.user` — there is no token verification. `requireAuth` (any logged-in user), `requireAdmin` (`role` in `admin`/`master_admin`/`club_admin`), and `requireMasterAdmin` (`role === 'master_admin'` only) are the three gating middlewares. Login is CPF + password (`POST /api/auth/login`, scrypt via `src/auth.ts`), not username/email. The frontend (`src/App.tsx`) stores `currentUser.id` and sends it as `x-user-id` on every authenticated fetch.

**Document storage (MinIO)** is optional at the infra level: `src/storage.ts` exposes `storageEnabled` (true only if `MINIO_ACCESS_KEY`/`MINIO_SECRET_KEY` are set) and endpoints check it before touching MinIO, returning a clear 503 instead of crashing when unset (e.g. local dev without MinIO configured). Uploaded files are never exposed as direct/presigned URLs — MinIO's internal hostname isn't reachable outside the deploy network — they're streamed through the Express server (`getDocumentStream` piped to the response). Only a boolean `xUploaded` flag is ever sent to the client for compliance-style documents (club/member docs); championship regulamento/súmula PDFs are streamed via a dedicated public-ish `GET /api/championships/:id/documents/:kind` route since athletes (not just the uploader) need to read them.

**Frontend state is centralized in `src/App.tsx`.** There's no state management library — `App.tsx` holds all top-level entity state (`users`, `championships`, `stages`, `weapons`, `modalities`, `clubs`, `weaponLookupOptions`, ...), fetches it in a single `syncWithBackend()` on load and after every mutation, and passes both the data and the mutation callbacks (`handleCreateX`/`handleUpdateX`/`handleRemoveX`) down as props to the view components. Components never fetch on their own except through these passed-down handlers.

**View components** (`src/components/`):
- `CompetitionResultsViewer.tsx` — reusable 4-step competition results viewer (Championship -> Stage -> Modality -> Medal Filters & Official Rankings Table). **Rule**: Any fix, calculation rule, or filter applied to results must be applied universally across all views displaying results by using or staying aligned with this component.
- `AdminPanel.tsx` — "Painel Diretor", the entire director/admin surface, gated by role (`admin`/`master_admin`/`club_admin`). One very large component with three top-level tabs (`mainTab`: `clube` | `plataforma` | `master`), each with its own sidebar menu (`clubeMenu`/`plataformaMenu`/`masterMenu`) driving a `switch` statement that renders the selected screen. New admin cadastro screens go here, following the existing per-screen pattern: local form state + a `handleSubmitX` that calls the prop-passed `onCreateX`/`onUpdateX`, plus a list below reading straight from the real prop data (never local mock arrays for anything meant to be real).
- `ChampionshipsView.tsx` — athlete-facing championship browsing/registration.
- `MemberProfile.tsx` — athlete's own profile, progressive "Meu Cadastro" completion, weapons, and competition results tab.
- `FeedView.tsx` — social feed (posts/likes/comments).

**Legacy system parity.** Several `Painel Diretor` cadastro screens were rebuilt to match field-for-field specs from a legacy PHP system the user is migrating off of (raw HTML forms with generic field names like `info1`, `id4` were used as the source of truth — those internal names are not meaningful, only the field's label/position/options matter). Where this repo's data model needed to diverge from a first guess based on the legacy system, the actual legacy HTML always won. See "Painel Diretor module status" below for what's been aligned this way — don't assume an unconverted screen's fields are correct without checking for a legacy reference first.

## Painel Diretor module status (as of 2026-07-14)

Real (backed by actual DB tables/endpoints, tested end-to-end):
- **Gerenciamento Plataforma > Novo Clube** — creates a club + its `club_admin` login.
- **Gerenciamento Plataforma > Modalidades** — 5 fields only (Modalidade, Quantidade de séries, Tiros por série, Tempo por série em minutos, Tipo de avaliação). No "categoria" field — it doesn't exist in the real legacy form; `modalities.discipline` is a vestigial nullable column, unused going forward.
- **Gerenciamento Plataforma > Novo Campeonato** — full cadastro (~40 fields: PIX config, valores de inscrição/reinscrição, percentuais com validação de soma 100%, cascata de premiação atleta/todas-etapas/ouro-prata-bronze, pontuação mínima atleta/equipe, regulamento/súmula PDF). The modality picker here selects from real `modalities` by id and does **not** allow overriding séries/tiros/tempo/avaliação — those are fixed on the modality itself, by design (mirrors the legacy system so data can be imported without losing that constraint).
- **Gerenciamento Plataforma > Etapas** — full CRUD; this didn't exist at all before (no `POST/PUT/DELETE /api/stages`, the UI was decorative buttons with no handlers).
- **Gerenciamento Plataforma > ADM > Cadastro de armas** — 8 fields (Número da arma, Número Sigma, Classe, Modelo, Calibre, Fabricante, Arma é, Status de permissão), no "Tipo de arma" (not part of the real form). Classe/Modelo/Calibre/Fabricante/Arma é/Status de permissão are dropdowns backed by `weapon_lookup_options` (one shared table, `kind` column distinguishes the six lists), seeded from the legacy system's real option lists. Supports inline editing.
- **Administrador Master > Listas de Armas** — CRUD for the six `weapon_lookup_options` lists above. Restricted to `role === 'master_admin'` (menu item hidden otherwise, and the API routes use `requireMasterAdmin`), because ordinary club admins should not be able to add/rename/remove the shared dropdown options.
- **Gerenciamento Plataforma > Cadastrar Membros** — creates a member + login, then progressive profile completion (same pattern as the athlete's own "Meu Cadastro").
- **Menus Clube > Cadastrar Resultados** — full result entry with series grid, target zones (X, 10, 9..0), automatic best series detection, penalties, execution metadata and status actions (Absent/DQ).
- **Menus Clube > Inscrição Clube** — bulk registration for club members, allowing matching club weapons and real-time weapon search by Sigma/Serial number, using a backend bulk registration API.
- **ChampionshipsView > Inscrição Individual** — athlete registration now supports real-time Sigma/serial weapon search and auto-detects re-entries to charge the promotional re-entry fee correctly.
- **Gerenciamento Clube > Cessão de Arma** — real DB-backed form: CPF/name autocomplete (debounced, max 8 results, avoids loading 2500+ athletes), weapon search by sigma/weapon_number (reuses `/api/weapons/search`), start/end dates, stored in `weapon_concessions` table (SERIAL `concession_number`), PDF generation matching Anexo N format (art. 34, Decreto 11.615/2023).

Still decorative/mock (local `useState` arrays, no backing table, don't trust the UI at face value):
- **Administrador Master > Gerenciar Clubes** (`masterClubs`) and **Gestão de Cobranças** (`billingList`) — separate from the real "Novo Clube" list under Gerenciamento Plataforma.
- Most of **ADM** beyond Cadastro de armas and Cadastrar Resultados (Munições, Filtro Resultados, Relatórios e declarações, Treinamento/competições, Validar treinamentos), all of **IDSC**, and all of **SITE** (banners, patrocinadores, vídeos, imagem padrão) haven't been converted from the original mock scaffold.
- **Cessão de Arma** was decorative — now moved to Real list above (2026-07-15).

## Deploy

Production runs on EasyPanel (self-hosted PaaS), not any CI/CD defined in this repo. `origin/main` on GitHub is what EasyPanel's `web` service deploys from; the deploy webhook is unreliable, so a deploy is normally triggered manually via EasyPanel's tRPC API after pushing (see project memory / ask the user for the current API token — it's not stored in this repo). Logs (build + running container) are readable via a separate EasyPanel logs endpoint. Postgres and MinIO are separate EasyPanel services on the same internal Docker network as `web`.
