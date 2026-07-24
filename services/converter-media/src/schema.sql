-- Converter media control plane schema (applied on api boot)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS batches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id        TEXT NOT NULL UNIQUE,
  actor_id        TEXT NOT NULL,
  actor_email     TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'processing',
  kind            TEXT NOT NULL DEFAULT 'direct',
  discovery_id    TEXT,
  selected_count  INT NOT NULL DEFAULT 0,
  paused          BOOLEAN NOT NULL DEFAULT FALSE,
  numbering_policy TEXT NOT NULL DEFAULT 'index-prefix',
  accepted_count  INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE batches ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'direct';
ALTER TABLE batches ADD COLUMN IF NOT EXISTS discovery_id TEXT;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS selected_count INT NOT NULL DEFAULT 0;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS paused BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS numbering_policy TEXT NOT NULL DEFAULT 'index-prefix';

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id        TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  payload_hash    TEXT NOT NULL,
  batch_id        TEXT NOT NULL REFERENCES batches(batch_id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (actor_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS discoveries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discovery_id        TEXT NOT NULL UNIQUE,
  actor_id            TEXT NOT NULL,
  provider            TEXT NOT NULL,
  redacted_label      TEXT NOT NULL DEFAULT '',
  status              TEXT NOT NULL DEFAULT 'discovering',
  item_count          INT NOT NULL DEFAULT 0,
  error_code          TEXT NOT NULL DEFAULT '',
  cancel_requested    BOOLEAN NOT NULL DEFAULT FALSE,
  idempotency_key     TEXT NOT NULL DEFAULT '',
  source_url          TEXT NOT NULL DEFAULT '',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discoveries_status ON discoveries (status);
CREATE INDEX IF NOT EXISTS idx_discoveries_actor ON discoveries (actor_id);

CREATE TABLE IF NOT EXISTS discovery_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id             TEXT NOT NULL UNIQUE,
  discovery_id        TEXT NOT NULL REFERENCES discoveries(discovery_id) ON DELETE CASCADE,
  provider_item_id    TEXT NOT NULL,
  redacted_title      TEXT NOT NULL DEFAULT '',
  duration_bucket     TEXT NOT NULL DEFAULT 'unknown',
  encrypted_source_url TEXT NOT NULL DEFAULT '',
  selected            BOOLEAN NOT NULL DEFAULT FALSE,
  playlist_index      INT NOT NULL DEFAULT 0,
  metadata_json       JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discovery_items_discovery ON discovery_items (discovery_id);
CREATE INDEX IF NOT EXISTS idx_discovery_items_selected ON discovery_items (discovery_id, selected);

CREATE TABLE IF NOT EXISTS jobs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id              TEXT NOT NULL UNIQUE,
  batch_id            TEXT NOT NULL REFERENCES batches(batch_id),
  actor_id            TEXT NOT NULL,
  actor_email         TEXT NOT NULL,
  provider            TEXT NOT NULL,
  source_url          TEXT NOT NULL,
  redacted_label      TEXT NOT NULL DEFAULT '',
  operation_id        TEXT NOT NULL,
  plan_json           JSONB NOT NULL DEFAULT '{}',
  status              TEXT NOT NULL DEFAULT 'queued',
  progress_phase      TEXT NOT NULL DEFAULT 'queued',
  progress_fraction   REAL NOT NULL DEFAULT 0,
  error_code          TEXT NOT NULL DEFAULT '',
  attempt_id          TEXT NOT NULL,
  state_version       INT NOT NULL DEFAULT 1,
  input_bytes         BIGINT NOT NULL DEFAULT 0,
  output_bytes        BIGINT NOT NULL DEFAULT 0,
  duration_ms         BIGINT NOT NULL DEFAULT 0,
  input_artifact_key  TEXT,
  output_artifact_key TEXT,
  discovery_item_id   TEXT,
  playlist_index      INT,
  expires_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS discovery_item_id TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS playlist_index INT;

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_actor ON jobs (actor_id);
CREATE INDEX IF NOT EXISTS idx_jobs_batch ON jobs (batch_id);
CREATE INDEX IF NOT EXISTS idx_jobs_discovery_item ON jobs (discovery_item_id);

CREATE TABLE IF NOT EXISTS job_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id      TEXT NOT NULL UNIQUE,
  job_id          TEXT NOT NULL REFERENCES jobs(job_id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'active',
  error_code      TEXT NOT NULL DEFAULT '',
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_job_attempts_job ON job_attempts (job_id);

CREATE TABLE IF NOT EXISTS artifacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id     TEXT NOT NULL UNIQUE,
  job_id          TEXT NOT NULL REFERENCES jobs(job_id) ON DELETE CASCADE,
  kind            TEXT NOT NULL DEFAULT 'primary',
  storage_key     TEXT NOT NULL,
  content_type    TEXT NOT NULL DEFAULT 'application/octet-stream',
  byte_size       BIGINT NOT NULL DEFAULT 0,
  sha256          TEXT NOT NULL DEFAULT '',
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_artifacts_job ON artifacts (job_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_expires ON artifacts (expires_at);

CREATE TABLE IF NOT EXISTS packages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id          TEXT NOT NULL UNIQUE,
  batch_id            TEXT NOT NULL REFERENCES batches(batch_id),
  actor_id            TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'queued',
  entry_count         INT NOT NULL DEFAULT 0,
  size_bytes          BIGINT NOT NULL DEFAULT 0,
  object_key          TEXT,
  expires_at          TIMESTAMPTZ,
  error_code          TEXT NOT NULL DEFAULT '',
  include_thumbnails  BOOLEAN NOT NULL DEFAULT FALSE,
  include_subtitles   BOOLEAN NOT NULL DEFAULT FALSE,
  include_metadata    BOOLEAN NOT NULL DEFAULT FALSE,
  ready_subset_only   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packages_status ON packages (status);
CREATE INDEX IF NOT EXISTS idx_packages_batch ON packages (batch_id);
CREATE INDEX IF NOT EXISTS idx_packages_expires ON packages (expires_at);

CREATE TABLE IF NOT EXISTS package_entries (
  package_id          TEXT NOT NULL REFERENCES packages(package_id) ON DELETE CASCADE,
  job_id              TEXT NOT NULL REFERENCES jobs(job_id) ON DELETE CASCADE,
  artifact_id         TEXT NOT NULL,
  archive_path        TEXT NOT NULL,
  PRIMARY KEY (package_id, job_id, artifact_id)
);

CREATE INDEX IF NOT EXISTS idx_package_entries_package ON package_entries (package_id);

CREATE TABLE IF NOT EXISTS worker_leases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_key       TEXT NOT NULL UNIQUE,
  owner_id        TEXT NOT NULL,
  job_id          TEXT REFERENCES jobs(job_id) ON DELETE SET NULL,
  lease_type      TEXT NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  heartbeat_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_worker_leases_expires ON worker_leases (expires_at);
CREATE INDEX IF NOT EXISTS idx_worker_leases_type ON worker_leases (lease_type);

CREATE TABLE IF NOT EXISTS quota_counters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id        TEXT NOT NULL,
  day_key         DATE NOT NULL DEFAULT CURRENT_DATE,
  job_count       INT NOT NULL DEFAULT 0,
  bytes_total     BIGINT NOT NULL DEFAULT 0,
  fetch_active    INT NOT NULL DEFAULT 0,
  transcode_active INT NOT NULL DEFAULT 0,
  discovery_active INT NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (actor_id, day_key)
);

ALTER TABLE quota_counters ADD COLUMN IF NOT EXISTS discovery_active INT NOT NULL DEFAULT 0;
ALTER TABLE quota_counters ADD COLUMN IF NOT EXISTS ai_active INT NOT NULL DEFAULT 0;
ALTER TABLE quota_counters ADD COLUMN IF NOT EXISTS ai_requests_count INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS ai_jobs (
  id                  TEXT PRIMARY KEY,
  actor_id            TEXT NOT NULL,
  kind                TEXT NOT NULL CHECK (kind IN ('ocr', 'transcribe', 'translate', 'assist')),
  status              TEXT NOT NULL DEFAULT 'queued',
  progress_phase      TEXT NOT NULL DEFAULT 'queued',
  progress_fraction   REAL NOT NULL DEFAULT 0,
  error_code          TEXT NOT NULL DEFAULT '',
  object_key_in       TEXT,
  object_key_out      TEXT,
  provider            TEXT NOT NULL DEFAULT '',
  model               TEXT NOT NULL DEFAULT '',
  cancel_requested    BOOLEAN NOT NULL DEFAULT FALSE,
  options_json        JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON ai_jobs (status);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_actor ON ai_jobs (actor_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_expires ON ai_jobs (expires_at);
