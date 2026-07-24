/**
 * Durable remote job / discovery / package schema for Plans 5–6.
 * Mirrored conceptually by services/converter-media state-machine.
 */

export const REMOTE_JOB_STATES = Object.freeze([
  'created',
  'validating',
  'discovering',
  'discovered',
  'queued',
  'fetching',
  'probing',
  'processing',
  'uploading',
  'packaging',
  'paused',
  'ready',
  'expired',
  'failed',
  'cancelled',
]);

/** @type {ReadonlySet<string>} */
export const REMOTE_TERMINAL_STATES = Object.freeze(new Set([
  'ready',
  'expired',
  'failed',
  'cancelled',
]));

export const REMOTE_ERROR_CODES = Object.freeze({
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  ADMIN_REQUIRED: 'ADMIN_REQUIRED',
  URL_INVALID: 'URL_INVALID',
  URL_DISALLOWED: 'URL_DISALLOWED',
  PROVIDER_UNSUPPORTED: 'PROVIDER_UNSUPPORTED',
  PLAYLIST_DEFERRED: 'PLAYLIST_DEFERRED',
  SSRF_BLOCKED: 'SSRF_BLOCKED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  FETCH_FAILED: 'FETCH_FAILED',
  FETCH_TIMEOUT: 'FETCH_TIMEOUT',
  SOURCE_TOO_LARGE: 'SOURCE_TOO_LARGE',
  PROBE_FAILED: 'PROBE_FAILED',
  DURATION_LIMIT: 'DURATION_LIMIT',
  PROCESS_FAILED: 'PROCESS_FAILED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
  DOWNLOAD_FORBIDDEN: 'DOWNLOAD_FORBIDDEN',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  PLAN_INVALID: 'PLAN_INVALID',
  DISCOVERY_FAILED: 'DISCOVERY_FAILED',
  DISCOVERY_ITEM_CAP: 'DISCOVERY_ITEM_CAP',
  SELECTION_EMPTY: 'SELECTION_EMPTY',
  PACKAGE_TOO_LARGE: 'PACKAGE_TOO_LARGE',
  PACKAGE_INCOMPLETE: 'PACKAGE_INCOMPLETE',
  PAUSE_REJECTED: 'PAUSE_REJECTED',
  FEED_UNSUPPORTED: 'FEED_UNSUPPORTED',
});

export const REMOTE_QUOTAS = Object.freeze({
  maxUrlsPerSubmission: 10,
  maxDiscoveryItems: 200,
  maxSelectedItems: 50,
  maxLargeListParse: 500,
  maxInputBytes: 500 * 1024 * 1024,
  maxDurationSeconds: 2 * 60 * 60,
  maxOutputBytes: 1024 * 1024 * 1024,
  maxConcurrentTranscodesPerAdmin: 1,
  maxConcurrentFetchesPerAdmin: 2,
  maxConcurrentDiscoveriesPerAdmin: 1,
  maxJobsPerAdminPerDay: 20,
  maxFetchedBytesPerAdminPerDay: 5 * 1024 * 1024 * 1024,
  maxFetchRetries: 2,
  maxProcessRetries: 1,
  outputRetentionMs: 60 * 60 * 1000,
  signedDownloadTtlMs: 5 * 60 * 1000,
  packageHardCapBytes: 4 * 1024 * 1024 * 1024,
  packageWarnDesktopBytes: 2 * 1024 * 1024 * 1024,
  packageWarnMobileBytes: 500 * 1024 * 1024,
});

/** Allowlisted conversion operation IDs the server may execute. */
export const REMOTE_PLAN_OPERATION_ALLOWLIST = Object.freeze(new Set([
  'image-to-png',
  'image-to-jpeg',
  'image-to-webp',
  'image-to-gif',
  'audio-to-mp3',
  'audio-to-wav',
  'audio-to-ogg',
  'audio-to-aac',
  'video-to-mp4',
  'video-to-webm',
  'video-to-gif',
  'video-extract-audio',
  'data-json-to-csv',
  'data-csv-to-json',
  'data-yaml-to-json',
  'data-json-to-yaml',
  'convertVideoAdvanced',
  'convertAudioAdvanced',
]));

export const BATCH_KINDS = Object.freeze([
  'url-list',
  'playlist',
  'feed',
  'package',
]);

export const AUDIO_VIDEO_MODES = Object.freeze({
  video: Object.freeze({ operationId: 'video-to-mp4', label: 'Video' }),
  audio: Object.freeze({ operationId: 'video-extract-audio', label: 'Audio only' }),
});

/**
 * @param {unknown} plan
 * @returns {{ ok: true, plan: Record<string, unknown> } | { ok: false, code: string }}
 */
export function validateRemotePlanSnapshot(plan) {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
    return { ok: false, code: REMOTE_ERROR_CODES.PLAN_INVALID };
  }
  const p = /** @type {Record<string, unknown>} */ (plan);
  const operationId = typeof p.operationId === 'string' ? p.operationId : '';
  if (!REMOTE_PLAN_OPERATION_ALLOWLIST.has(operationId)) {
    return { ok: false, code: REMOTE_ERROR_CODES.PLAN_INVALID };
  }
  if ('argv' in p || 'ffmpegArgs' in p || 'command' in p || 'shell' in p) {
    return { ok: false, code: REMOTE_ERROR_CODES.PLAN_INVALID };
  }
  return { ok: true, plan: Object.freeze({ ...p, operationId }) };
}

/**
 * @type {Readonly<Record<string, ReadonlyArray<string>>>}
 */
export const REMOTE_STATE_TRANSITIONS = Object.freeze({
  created: ['validating', 'discovering', 'queued', 'failed', 'cancelled'],
  validating: ['queued', 'failed', 'cancelled'],
  discovering: ['discovered', 'failed', 'cancelled'],
  discovered: ['queued', 'failed', 'cancelled'],
  queued: ['fetching', 'paused', 'failed', 'cancelled'],
  fetching: ['probing', 'paused', 'failed', 'cancelled'],
  probing: ['processing', 'failed', 'cancelled'],
  processing: ['uploading', 'packaging', 'failed', 'cancelled'],
  uploading: ['ready', 'failed', 'cancelled'],
  packaging: ['ready', 'failed', 'cancelled'],
  paused: ['queued', 'cancelled'],
  ready: ['expired'],
  expired: [],
  failed: [],
  cancelled: [],
});

/**
 * @param {string} from
 * @param {string} to
 */
export function canTransitionRemoteState(from, to) {
  const allowed = REMOTE_STATE_TRANSITIONS[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

/**
 * @param {{ state: string, stateVersion: number, attemptId: string, cancelRequestedAt?: number | null, paused?: boolean }} job
 * @param {{ expectedVersion: number, expectedAttemptId: string, nextState: string }} patch
 */
export function applyRemoteStateCas(job, patch) {
  if (job.stateVersion !== patch.expectedVersion) {
    return { ok: false, code: 'STALE_VERSION' };
  }
  if (job.attemptId !== patch.expectedAttemptId) {
    return { ok: false, code: 'STALE_ATTEMPT' };
  }
  if (job.cancelRequestedAt && !REMOTE_TERMINAL_STATES.has(job.state) && patch.nextState !== 'cancelled') {
    if (canTransitionRemoteState(job.state, 'cancelled')) {
      return {
        ok: true,
        job: {
          ...job,
          state: 'cancelled',
          stateVersion: job.stateVersion + 1,
          errorCode: REMOTE_ERROR_CODES.CANCELLED,
        },
      };
    }
  }
  if (job.paused && patch.nextState !== 'paused' && patch.nextState !== 'queued' && patch.nextState !== 'cancelled') {
    if (canTransitionRemoteState(job.state, 'paused')) {
      return {
        ok: true,
        job: {
          ...job,
          state: 'paused',
          stateVersion: job.stateVersion + 1,
        },
      };
    }
  }
  if (!canTransitionRemoteState(job.state, patch.nextState)) {
    return { ok: false, code: 'INVALID_TRANSITION' };
  }
  return {
    ok: true,
    job: {
      ...job,
      state: patch.nextState,
      stateVersion: job.stateVersion + 1,
    },
  };
}

/**
 * @param {number} estimatedBytes
 * @param {'desktop' | 'mobile'} [device]
 */
export function evaluatePackageSizePolicy(estimatedBytes, device = 'desktop') {
  const bytes = Number(estimatedBytes) || 0;
  if (bytes > REMOTE_QUOTAS.packageHardCapBytes) {
    return { ok: false, code: REMOTE_ERROR_CODES.PACKAGE_TOO_LARGE, warning: null };
  }
  const warnAt = device === 'mobile'
    ? REMOTE_QUOTAS.packageWarnMobileBytes
    : REMOTE_QUOTAS.packageWarnDesktopBytes;
  return {
    ok: true,
    code: null,
    warning: bytes >= warnAt ? 'PACKAGE_SIZE_WARNING' : null,
  };
}
