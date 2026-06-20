# InfinixBackupSystem — Claude Context

Self-hosted backup automation system. Nuxt 4 full-stack app (frontend + API in one repo).

## Tech Stack

- **Framework:** Nuxt 4 with `app/` directory structure (NOT `src/`)
- **UI:** Nuxt UI v4 (`@nuxt/ui`) — components: UCard, UTable, UForm, UFormField, USelect, UInput, UButton, UBadge, UModal, UDashboardGroup, UDashboardSidebar
- **ORM:** Drizzle ORM + `pg` (node-postgres) — PostgreSQL only
- **i18n:** @nuxtjs/i18n v10 with vue-i18n — locales: EN, PL, DE in `i18n/locales/`
- **Scheduler:** node-cron **v3** (NOT v4 — v4 ESM crashes Nitro)
- **Auth:** h3 session (iron-webcrypto signed cookie, 7-day TTL)
- **Encryption:** AES-256-GCM in `server/utils/encryption.ts`
- **Charts:** chart.js + vue-chartjs
- **Animations:** gsap

## Project Structure

```
app/
  components/       # SourceForm.vue, DestinationForm.vue, JobForm.vue, WebhookForm.vue, AppLogo.vue
  layouts/          # default.vue (sidebar nav)
  pages/            # index.vue, sources/, destinations/, jobs/, runs/, users/, webhooks/, setup/
  utils/            # format.ts (formatBytes, formatDuration, formatDateTime), constants.ts
  composables/      # usePageAnimate.ts
server/
  api/              # auth/, dashboard/, destinations/, docker/, jobs/, runs/, setup/, sources/, users/, webhooks/
  database/
    schema.ts       # ALL table definitions + relations
    migrations/     # Auto-generated SQL migrations
  middleware/       # auth.ts (protects all /api/* except /api/auth/ and /api/setup/)
  plugins/          # scheduler.ts (node-cron jobs, globalThis.__backupScheduler Map)
  utils/
    backup/         # postgres.ts, mysql.ts, mongo.ts, files.ts, docker.ts — return Node.js Readable streams
    storage/        # s3.ts, ftp.ts, sftp.ts, local.ts — upload/delete per destination
    db.ts           # useDB() helper
    encryption.ts   # encryptConfig() / decryptConfig()
    executor.ts     # runBackupJob() — orchestrates source → temp file → all destinations
    retention.ts    # applyRetentionForJob(), applyRetentionForJobByCount(), applyRetentionAll()
    session.ts      # requireAuth() / getSession()
    types.ts        # server-side type helpers
    webhook-dispatch.ts  # dispatchWebhooks() — sends to discord/slack/openwa/generic
shared/
  types.d.ts        # Global TypeScript declarations (ApiJob, ApiRun, ApiRunDetail, etc.)
i18n/locales/       # en.json, pl.json, de.json
```

## Database Schema (Drizzle, PostgreSQL)

Tables: `users`, `backup_sources`, `backup_destinations`, `backup_jobs`, `job_destinations` (junction), `backup_runs`, `webhooks`

Key relationships:

- `backup_jobs` → `backup_sources` (many-to-one via `source_id`)
- `backup_jobs` ↔ `backup_destinations` via `job_destinations` junction table (many-to-many)
- `backup_runs` → `backup_jobs` (many-to-one via `job_id`)

After schema changes: `pnpm db:generate` then `pnpm db:migrate`

## Critical Gotchas

1. **i18n:** `@` in locale JSON values MUST be escaped as `{'@'}` — vue-i18n treats bare `@word` as linked message reference (throws error code 10)
2. **node-cron:** Use v3 API (`cron.schedule(expr, fn)`). v4 has different API and ESM issues with Nitro
3. **Multi-destination:** Jobs send backup to ALL destinations. executor.ts writes to temp file first (streams can only be consumed once), then reads it N times for N destinations. Temp file in `tmpdir()`, cleaned up in finally block
4. **Encryption:** ALL source/destination configs are encrypted at rest. Always call `decryptConfig()` before using config in executor/retention/storage utils
5. **Drizzle relations:** `jobDestinations` junction table. Use nested `with: { jobDestinations: { with: { destination: true } } }` for jobs with destinations. Never use old `with: { destination: true }` on backupJobs (that relation is gone)
6. **Docker container API:** `GET /api/docker/containers` queries Docker socket at `/var/run/docker.sock`. Requires socket to be mounted in docker-compose. Excludes the running container itself via `HOSTNAME` env var (Docker sets HOSTNAME to container ID). Falls back to `[]` if socket unavailable

## Common Commands

```bash
pnpm dev              # Start dev server
pnpm db:generate      # Generate Drizzle migration SQL after schema.ts changes
pnpm db:migrate       # Apply pending migrations
pnpm db:studio        # Drizzle Studio UI
pnpm typecheck        # TypeScript check
pnpm lint             # ESLint
```

## Source Types

`postgresql`, `mysql`, `mongodb`, `files`, `docker_postgresql`, `docker_mysql`, `docker_mongodb`, `docker_folder`

Backup utils in `server/utils/backup/` return a Node.js `Readable` stream. executor.ts pipes this to a temp file, then uploads to each destination.

## Destination Types

`s3`, `ftp`, `sftp`, `local`

Storage utils in `server/utils/storage/` handle upload and delete per type.

## Retention Logic

Two modes per job: `retentionDays` (delete older than N days) + `retentionCount` (keep last N copies). Both run after each successful backup AND daily at 03:30 via scheduler. Deletes from ALL destinations of the job.

## Auth Flow

- Setup wizard creates first admin user (no auth required)
- All `/api/*` protected except `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/setup/*`
- Roles: `admin` (full access), `viewer` (read-only)

## Webhooks

Types: `generic` (HMAC JSON), `discord` (embeds), `slack` (blocks), `openwa` (WhatsApp via REST API). Dispatched after each backup success/failure from executor.ts.
