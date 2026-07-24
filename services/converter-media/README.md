# Converter Media Service — Operator Runbook

Provider-neutral Docker media service for **Plexity Plan 5: Admin Converter Secure URL Processing**, **Plan 6: Playlists, Discovery, and Server Packages**, and **Plan 7: Admin AI Sidecars (OCR, STT, translate, assist)**. Handles HMAC-authenticated job control, SSRF-safe URL fetch (via egress proxy), playlist/feed discovery, private S3 artifact storage, allowlisted ffmpeg transcode, ZIP package assembly, AI sidecar generation, and automated cleanup.

## Architecture

```
Base44 adminConverterApi  --HMAC-->  api (control plane)
                                         |
        +----------------+----------------+----------------+----------------+
        |                |                |                |                |
  discovery-worker  fetch-worker   media-worker   package-worker  cleanup-worker
  (egress net)      (egress net)   (backend only) (backend only)  (backend only)
        |                |                                              |
        +----------------+---->  egress-proxy  <---- ai-worker (egress net)
                                    |
                                    +---> Internet (HTTPS only — fetch + AI providers)
                                    |
                                  MinIO (S3)  <--- all workers read/write artifacts
                                    |
                               PostgreSQL   <--- jobs, discoveries, packages, ai_jobs, leases, quotas
```

**Network isolation:** `media-worker`, `package-worker`, and `cleanup-worker` attach only to the internal `backend` network (no route to the public internet). `fetch-worker`, `discovery-worker`, and `ai-worker` join both `backend` (Postgres/MinIO) and `egress` (proxy). External HTTPS fetches and AI provider calls must go through `egress-proxy`, which rejects private-range CONNECT targets.

## Secrets

| Secret | Where set | Purpose |
|--------|-----------|---------|
| `HMAC_SECRET` | api (+ Base44 `CONVERTER_MEDIA_HMAC_SECRET`) | Signs/verifies control API requests |
| `ENCRYPTION_KEY` | api, discovery-worker, cleanup-worker | AES-256-GCM for discovery source URLs at rest |
| `CALLBACK_HMAC_SECRET` | optional workers | Worker → Base44 callback auth |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | all roles using storage | MinIO/S3 credentials |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | ai-worker (optional) | Real AI provider calls; omit for deterministic mock mode |
| `DATABASE_URL` | all roles except egress-proxy | Postgres connection string |
| Postgres password | compose / managed DB | Database auth |

Generate production HMAC secret:

```bash
openssl rand -hex 32
```

Generate encryption key (64 hex chars = 32 bytes):

```bash
openssl rand -hex 32
```

**Never commit `.env` or real secrets.** Copy `.env.example` and inject via your secret manager (Doppler, AWS SM, K8s secrets, etc.).

Base44 function env (must match):

- `CONVERTER_MEDIA_CONTROL_URL` → public URL of this service `api` (e.g. `https://converter-media.internal:8080`)
- `CONVERTER_MEDIA_HMAC_SECRET` → same as `HMAC_SECRET`
- `ACCEPT_NEW_JOBS` / `ENABLE_YOUTUBE_CONNECTOR` / `ENABLE_FEED_CONNECTOR` → mirrored kill switches (Base44 reads these for session UX; service enforces its own copy on `api`)
- `ENABLE_AI_PROVIDER` / `ACCEPT_NEW_AI_JOBS` → Plan 7 AI kill switches (mirrored on Base44 for admin UX)

## Deploy order

1. **PostgreSQL** — durable volume, backups enabled.
2. **S3/MinIO bucket** — create private bucket `converter-media`; apply lifecycle rules from `scripts/lifecycle-bucket.json`.
3. **egress-proxy** — verify it starts and blocks RFC1918 CONNECT targets.
4. **api** — boots schema from `src/schema.sql`; confirm `GET /health` returns `{ ok: true }`.
5. **cleanup-worker** — start before heavy traffic so TTL enforcement is active.
6. **discovery-worker** — required for Plan 6 playlist/feed discovery (needs egress for RSS; YouTube uses yt-dlp locally).
7. **package-worker** — assembles server ZIP packages from ready job artifacts.
8. **media-worker** — confirm `ffmpeg`/`ffprobe` present (`docker compose exec media-worker ffmpeg -version`).
9. **fetch-worker** — last, after proxy and storage are healthy.
10. **ai-worker** — Plan 7 sidecars; set `ENABLE_AI_PROVIDER=true` and provider keys when ready (mock mode works without keys for dev/test).
11. **Base44 adminConverterApi** — point `CONVERTER_MEDIA_CONTROL_URL` at `api`; deploy with matching HMAC secret.

Local smoke:

```bash
cd services/converter-media
cp .env.example .env
# edit HMAC_SECRET and ENCRYPTION_KEY
docker compose up --build -d
curl -s http://localhost:8080/health | jq
npm test
```

## Kill switches

| Variable | Default | Effect |
|----------|---------|--------|
| `ACCEPT_NEW_JOBS` | `true` | When `false`, job create, batch confirm, discovery create, and retries return `503 SERVICE_UNAVAILABLE`. In-flight work continues. |
| `ENABLE_YOUTUBE_CONNECTOR` | `false` | When `false`, YouTube single-video resolve and YouTube playlist/channel discovery are rejected. |
| `ENABLE_FEED_CONNECTOR` | `true` | When `false`, RSS/Atom feed discovery is rejected. Independent of YouTube — feeds can stay enabled while YouTube is off. |

**YouTube vs feed interaction:** Playlist and channel discovery require **both** `ENABLE_YOUTUBE_CONNECTOR=true` and a working `yt-dlp` in the image. Feed discovery only checks `ENABLE_FEED_CONNECTOR` and uses SSRF-safe HTTPS fetch through the egress proxy.

### Plan 7 kill switches

| Variable | Default | Effect |
|----------|---------|--------|
| `ENABLE_AI_PROVIDER` | `false` | When `false`, `/v1/ai/create` returns `503 AI_DISABLED` and `ai-worker` does not claim jobs. Mock provider still works in unit tests without keys. |
| `ACCEPT_NEW_AI_JOBS` | `true` | When `false`, new AI job intake returns `503 SERVICE_UNAVAILABLE`. In-flight AI jobs continue until done or cancelled. |

Provider env (ai-worker + api health):

| Variable | Default | Purpose |
|----------|---------|---------|
| `OPENAI_API_KEY` | _(empty)_ | OpenAI-compatible chat, vision OCR, Whisper STT |
| `ANTHROPIC_API_KEY` | _(empty)_ | Anthropic JSON assist fallback |
| `AI_PRIMARY_MODEL` | `gpt-4o-mini` | Preferred model when client omits `model` |
| `AI_FALLBACK_MODEL` | `gpt-4o-mini` | Fallback when primary unavailable |

**Emergency stop AI intake:**

```bash
docker compose exec api sh -c 'export ACCEPT_NEW_AI_JOBS=false ENABLE_AI_PROVIDER=false'
# or set in compose/env and restart api + ai-worker
```

Compose override example:

```yaml
services:
  api:
    environment:
      ENABLE_AI_PROVIDER: "false"
      ACCEPT_NEW_AI_JOBS: "false"
  ai-worker:
    environment:
      ENABLE_AI_PROVIDER: "false"
      ACCEPT_NEW_AI_JOBS: "false"
```

**Emergency stop new intake:**

```bash
docker compose exec api sh -c 'export ACCEPT_NEW_JOBS=false'  # or set in compose/env and restart api
```

Compose override example:

```yaml
services:
  api:
    environment:
      ACCEPT_NEW_JOBS: "false"
      ENABLE_FEED_CONNECTOR: "false"
  fetch-worker:
    environment:
      ENABLE_YOUTUBE_CONNECTOR: "false"
  discovery-worker:
    environment:
      ENABLE_YOUTUBE_CONNECTOR: "false"
      ENABLE_FEED_CONNECTOR: "false"
```

## Plan 6 quotas (enforced)

| Limit | Value |
|-------|-------|
| Discovery items per source | 200 |
| Selected items per batch | 50 |
| Concurrent discoveries per admin | 1 |
| Package hard cap | 4 GiB |
| Package warn (desktop UX) | 2 GiB |
| Package warn (mobile UX) | 500 MiB |

Plan 5 single-URL quotas still apply per job after batch confirm.

## Plan 7 quotas (enforced)

| Limit | Value |
|-------|-------|
| AI requests per admin per day | 20 |
| Concurrent AI jobs per admin | 5 |
| OCR image max | 25 MiB |
| STT audio max | 100 MiB |
| STT video max | 500 MiB |
| Prompt max chars | 8000 |
| Completion max chars | 4000 |
| Temp sidecar retention | 15 min |

Without `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`, the ai-worker uses deterministic mock outputs (safe for dev/test).

## Control API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness + kill switch state |
| POST | `/v1/jobs/create` | Create batch jobs (idempotent) |
| POST | `/v1/jobs/cancel` | Cancel active job |
| POST | `/v1/jobs/retry` | Re-queue failed/cancelled job |
| POST | `/v1/jobs/download-token` | Issue presigned GET URL |
| POST | `/v1/discovery/create` | Start playlist/feed discovery |
| POST | `/v1/discovery/get` | Poll discovery + item list |
| POST | `/v1/discovery/cancel` | Cancel in-flight or discovered session |
| POST | `/v1/discovery/items` | Update item selection (max 50) |
| POST | `/v1/batch/confirm` | Create jobs from selected discovery items |
| POST | `/v1/batch/pause` | Pause batch (blocks fetch/media workers) |
| POST | `/v1/batch/resume` | Resume paused batch |
| POST | `/v1/batch/retry-failed` | Re-queue all failed jobs in batch |
| POST | `/v1/packages/create` | Queue server ZIP package build |
| POST | `/v1/packages/get` | Poll package status + entries |
| POST | `/v1/packages/download-token` | Presigned GET for package ZIP |
| POST | `/v1/ai/create` | Queue AI sidecar job (OCR/STT/translate/assist) |
| POST | `/v1/ai/get` | Poll AI job status |
| POST | `/v1/ai/cancel` | Cancel queued job or request in-flight cancel |
| POST | `/v1/ai/download-sidecar` | Presigned GET for ready sidecar JSON |
| POST | `/v1/ai/upload-url` | Presigned PUT for AI temp input (≈15m retention) |

## Unified state machine

Shared statuses: `discovering`, `discovered`, `paused`, `packaging`, `queued`, `fetching`, `fetched`, `processing`, `ready`, `failed`, `cancelled`.

- **Discovery:** `discovering → discovered | failed | cancelled`
- **Jobs:** `queued → fetching → fetched → processing → ready` (with `paused` interrupt)
- **Packages:** `queued → packaging → ready | failed`
- **AI jobs:** `queued → processing → ready | failed | cancelled`
- **Batches:** `processing ↔ paused`

All job transitions use CAS on `state_version`.

## Rollback

1. Set `ACCEPT_NEW_JOBS=false` on **api** and Base44.
2. Set `ACCEPT_NEW_AI_JOBS=false` and `ENABLE_AI_PROVIDER=false` on **api** and **ai-worker**.
3. Set `ENABLE_FEED_CONNECTOR=false` and `ENABLE_YOUTUBE_CONNECTOR=false` on **discovery-worker** to stop new discovery.
4. Scale `fetch-worker`, `discovery-worker`, and `ai-worker` to 0 (stops new egress).
5. Scale `package-worker` to 0 (stops new ZIP builds).
6. Let `media-worker` drain in-flight transcodes (or scale to 0 after acceptable loss).
7. Keep **cleanup-worker** running to honor TTLs and wipe discovery encrypted URLs + AI temps.
8. Revert container image tag / compose file to previous release.
9. Restore secrets if changed.
10. Re-enable workers only after `GET /health` is green.

Database rollback: prefer forward-fix migrations; schema is applied idempotently on api boot (`CREATE IF NOT EXISTS` + `ADD COLUMN IF NOT EXISTS`).

## Cleanup verification

After deploy or incident, verify:

```bash
# Expired ready jobs marked failed with EXPIRED
docker compose exec postgres psql -U converter -d converter_media \
  -c "SELECT status, count(*) FROM jobs GROUP BY status;"

# Discovery secrets wiped after terminal state
docker compose exec postgres psql -U converter -d converter_media \
  -c "SELECT count(*) FROM discovery_items WHERE encrypted_source_url <> '';"

# Package expiry
docker compose exec postgres psql -U converter -d converter_media \
  -c "SELECT status, count(*) FROM packages GROUP BY status;"

# No stale leases
docker compose exec postgres psql -U converter -d converter_media \
  -c "SELECT count(*) FROM worker_leases WHERE expires_at < NOW();"

# AI temp expiry (15 min)
docker compose exec postgres psql -U converter -d converter_media \
  -c "SELECT status, count(*) FROM ai_jobs GROUP BY status;"
```

Cleanup-worker logs `{ expired, packages, packageOrphans, discoveryWiped, orphans, cancelled, aiExpired, aiTerminalCleaned, reclaimed }` each pass.

## Roles (`ROLE` env)

| Role | Description |
|------|-------------|
| `api` | Control plane HTTP server + schema migration |
| `discovery-worker` | Playlist/feed discovery via connectors |
| `fetch-worker` | SSRF-safe download → S3 input artifacts |
| `media-worker` | ffprobe/ffmpeg transcode (no external egress) |
| `package-worker` | Assemble ZIP packages → S3 |
| `ai-worker` | Plan 7 OCR/STT/translate/assist sidecars → S3 (egress via proxy) |
| `cleanup-worker` | TTL enforcement, discovery URL wipe, AI temp expiry, orphan reclamation |
| `egress-proxy` | HTTPS CONNECT forward proxy with private IP block |

## Development

```bash
npm install
npm test
ROLE=api DATABASE_URL=... node src/index.js
```

Workers use the same entrypoint with `ROLE=fetch-worker|media-worker|cleanup-worker|discovery-worker|package-worker|ai-worker|egress-proxy`.
