/** 12-factor configuration from environment. */

function envBool(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return defaultValue;
  return raw === 'true' || raw === '1';
}

function envInt(name, defaultValue) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) ? n : defaultValue;
}

const GiB = 1024 * 1024 * 1024;
const MiB = 1024 * 1024;

export const config = {
  role: process.env.ROLE || 'api',
  port: envInt('PORT', 8080),
  host: process.env.HOST || '0.0.0.0',

  acceptNewJobs: envBool('ACCEPT_NEW_JOBS', true),
  enableYoutubeConnector: envBool('ENABLE_YOUTUBE_CONNECTOR', false),
  /**
   * RSS/Atom feed discovery (Plan 6). Independent of YouTube.
   * When false, feed URLs are rejected at connector classification.
   */
  enableFeedConnector: envBool('ENABLE_FEED_CONNECTOR', true),

  hmacSecret: process.env.HMAC_SECRET || '',
  callbackUrl: process.env.CALLBACK_URL || '',
  callbackHmacSecret: process.env.CALLBACK_HMAC_SECRET || process.env.HMAC_SECRET || '',

  /** AES-256-GCM key (hex) or fallback HMAC secret for URL encryption at rest. */
  encryptionKey: process.env.ENCRYPTION_KEY || process.env.HMAC_SECRET || '',

  databaseUrl: process.env.DATABASE_URL || 'postgres://converter:converter@localhost:5432/converter_media',

  s3: {
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    region: process.env.S3_REGION || 'us-east-1',
    bucket: process.env.S3_BUCKET || 'converter-media',
    accessKey: process.env.S3_ACCESS_KEY || '',
    secretKey: process.env.S3_SECRET_KEY || '',
    forcePathStyle: envBool('S3_FORCE_PATH_STYLE', true),
    publicEndpoint: process.env.S3_PUBLIC_ENDPOINT || process.env.S3_ENDPOINT || 'http://localhost:9000',
  },

  workerId: process.env.WORKER_ID || `worker-${process.pid}`,
  workerPollMs: envInt('WORKER_POLL_MS', 2000),
  cleanupIntervalMs: envInt('CLEANUP_INTERVAL_MS', 60_000),
  leaseTtlMs: envInt('LEASE_TTL_MS', 120_000),
  leaseHeartbeatMs: envInt('LEASE_HEARTBEAT_MS', 30_000),

  readyJobTtlMs: envInt('READY_JOB_TTL_MS', 60 * 60 * 1000),
  orphanArtifactTtlMs: envInt('ORPHAN_ARTIFACT_TTL_MS', 24 * 60 * 60 * 1000),
  packageTtlMs: envInt('PACKAGE_TTL_MS', 24 * 60 * 60 * 1000),

  egressProxyUrl: process.env.EGRESS_PROXY_URL || process.env.HTTP_PROXY || '',

  signedDownloadTtlMs: envInt('SIGNED_DOWNLOAD_TTL_MS', 5 * 60 * 1000),
  hmacMaxSkewMs: envInt('HMAC_MAX_SKEW_MS', 5 * 60 * 1000),

  plan6: {
    maxDiscoveryItems: envInt('MAX_DISCOVERY_ITEMS', 200),
    maxSelectedItems: envInt('MAX_SELECTED_ITEMS', 50),
    maxConcurrentDiscoveries: envInt('MAX_CONCURRENT_DISCOVERIES', 1),
    packageHardCapBytes: envInt('PACKAGE_HARD_CAP_BYTES', 4 * GiB),
    packageWarnDesktopBytes: envInt('PACKAGE_WARN_DESKTOP_BYTES', 2 * GiB),
    packageWarnMobileBytes: envInt('PACKAGE_WARN_MOBILE_BYTES', 500 * MiB),
  },

  /** Plan 7 — admin AI sidecar worker (OCR, STT, translate, assist). */
  enableAiProvider: envBool('ENABLE_AI_PROVIDER', false),
  acceptNewAiJobs: envBool('ACCEPT_NEW_AI_JOBS', true),

  plan7: {
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    primaryModel: process.env.AI_PRIMARY_MODEL || 'gpt-4o-mini',
    fallbackModel: process.env.AI_FALLBACK_MODEL || 'gpt-4o-mini',
    /** Input/output temp retention (matches client AI_QUOTAS.tempRetentionMs). */
    tempRetentionMs: envInt('AI_TEMP_RETENTION_MS', 15 * 60 * 1000),
    maxRequestsPerAdminPerDay: envInt('AI_MAX_REQUESTS_PER_DAY', 20),
    maxConcurrentAiJobsPerAdmin: envInt('AI_MAX_CONCURRENT_JOBS', 5),
    maxOcrImageBytes: envInt('AI_MAX_OCR_IMAGE_BYTES', 25 * MiB),
    maxSttAudioBytes: envInt('AI_MAX_STT_AUDIO_BYTES', 100 * MiB),
    maxSttVideoBytes: envInt('AI_MAX_STT_VIDEO_BYTES', 500 * MiB),
    maxSttAudioSeconds: envInt('AI_MAX_STT_AUDIO_SECONDS', 30 * 60),
    maxSttVideoSeconds: envInt('AI_MAX_STT_VIDEO_SECONDS', 2 * 60 * 60),
    maxPromptChars: envInt('AI_MAX_PROMPT_CHARS', 8000),
    maxCompletionChars: envInt('AI_MAX_COMPLETION_CHARS', 4000),
    aiJobTimeoutMs: envInt('AI_JOB_TIMEOUT_MS', 10 * 60 * 1000),
  },
};

export default config;
