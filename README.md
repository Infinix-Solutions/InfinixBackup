# Infinix Backup

Self-hosted backup automation for databases, Docker containers, and files. Schedule backups, store them wherever you want, and get notified when something goes wrong.

## What it does

- **Backs up** PostgreSQL, MySQL, MongoDB, files/directories — locally or on remote servers via SSH
- **Stores** backups on S3 (or any S3-compatible service), FTP, SFTP, or local filesystem
- **Schedules** jobs with cron expressions, runs them on demand, or triggers them via API
- **Notifies** via Discord, Slack, WhatsApp (OpenWA), or any generic webhook on success/failure
- **Manages retention** — keep the last N copies or delete backups older than N days
- **Supports Docker** — backs up databases and folders inside running containers
- **SSH remote execution** — run backups on remote servers with automatic ED25519 key provisioning

## Stack

- **Nuxt 4** — full-stack (frontend + API in one repo)
- **Nuxt UI v4** — component library
- **Drizzle ORM + PostgreSQL** — database
- **node-cron** — job scheduler
- **ssh2** — SSH remote execution
- **chart.js** — dashboard charts
- **Sentry** — error tracking

## Quick start

### Docker Compose

```yaml
services:
  backup:
    image: ghcr.io/your-org/infinix-backup:latest
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      NODE_ENV: production

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: infinix
      POSTGRES_USER: infinix
      POSTGRES_PASSWORD: changeme
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

Open `http://localhost:3000` — the setup wizard will guide you through the database connection and first admin account.

### Manual

```bash
pnpm install
cp .env.example .env
# edit DATABASE_URL, ENCRYPTION_KEY, SESSION_SECRET
pnpm db:migrate
pnpm dev
```

## Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `ENCRYPTION_KEY` | 32-character key for encrypting stored credentials |
| `SESSION_SECRET` | Secret for signing session cookies (min 32 chars) |

All three are generated automatically by the setup wizard and written to `data/config.json`. You can also provide them as environment variables before the first run to skip the wizard entirely.

## Source types

| Type | Description |
|---|---|
| `postgresql` | pg_dump — local or via SSH |
| `mysql` | mysqldump — local or via SSH |
| `mongodb` | mongodump — local or via SSH |
| `files` | tar archive of a directory — local or via SSH |
| `docker_postgresql` | pg_dump inside a running container |
| `docker_mysql` | mysqldump inside a running container |
| `docker_mongodb` | mongodump inside a running container |
| `docker_folder` | tar archive of a path inside a container |

## Destination types

| Type | Description |
|---|---|
| `s3` | Amazon S3 or any S3-compatible storage (MinIO, Backblaze B2, Wasabi, Cloudflare R2) |
| `sftp` | SFTP with password or private key |
| `ftp` | FTP / FTPS |
| `local` | Local filesystem path |

## SSH remote backups

Add a remote server once — Infinix generates an ED25519 keypair and installs the public key to `~/.ssh/authorized_keys` automatically if you provide a password. The password is never stored. All subsequent connections use the generated keypair (private key encrypted at rest with AES-256-GCM).

Once a server is connected, all source types work on it transparently.

## Retention

Two modes, both run after each successful backup and daily at 03:30:

- **Max age** — delete backups older than N days
- **Max copies** — keep only the last N successful backups

Set both to 0 to keep everything forever.

## Webhooks

| Type | Format |
|---|---|
| Discord | Embed with color-coded status |
| Slack | Block Kit message |
| OpenWA | WhatsApp via OpenWA REST API |
| Generic | JSON POST with optional HMAC-SHA256 signature |

Webhooks fire on `backup.success` and/or `backup.failed`. A test button is available in the UI.

## Development

```bash
pnpm dev              # dev server at http://localhost:3000
pnpm db:generate      # generate Drizzle migration after schema changes
pnpm db:migrate       # apply pending migrations
pnpm db:studio        # open Drizzle Studio
pnpm typecheck        # TypeScript check
pnpm lint             # ESLint
```

## License

MIT
