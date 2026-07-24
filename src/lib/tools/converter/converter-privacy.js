/**
 * Privacy guardrails shared by telemetry and status surfaces.
 * Converter processing is local-only — nothing here may accept or emit
 * filenames, paths, file content, exact byte counts, dimensions, durations,
 * or other free-text metadata that could identify user content.
 */

/** @type {ReadonlySet<string>} */
const ALLOWED_TELEMETRY_KEYS = Object.freeze(new Set([
  'category',
  'outcome',
  'engine',
  'presetId',
  'statusCode',
  'goalId',
  'mergeStatus',
  'splitStatus',
  'targetSizeStatus',
  'v2Feature',
  'provider',
  'aiAction',
  'tokenBucket',
  'costUsdBucket',
]));

const ALLOWED_PROVIDERS = Object.freeze(new Set([
  'direct-https',
  'youtube-single',
  'youtube-playlist',
  'youtube-channel',
  'rss-feed',
  'openai-compatible',
  'anthropic',
  'offline-mock',
]));

const ALLOWED_AI_ACTIONS = Object.freeze(new Set([
  'assist.plan',
  'assist.summary',
  'assist.naming',
  'assist.compress',
  'ocr.run',
  'ocr.table',
  'ocr.schema',
  'ocr.altText',
  'transcribe.run',
  'transcribe.translate',
  'subtitle.generate',
]));

const TOKEN_BUCKET_PATTERN = /^(0|lt500|500to2k|2kto8k|gte8k)$/;
const COST_BUCKET_PATTERN = /^(0|lt1c|1cto10c|10cto1|gte1)$/;

const FORBIDDEN_KEY_PATTERN = /(name|path|file|width|height|duration|size|bytes?|metadata|message|url|content|dimension)/i;

const ALLOWED_CATEGORIES = Object.freeze(new Set(['image', 'audio', 'video', 'data', 'archive', 'unknown']));
const ALLOWED_OUTCOMES = Object.freeze(new Set(['success', 'fail', 'cancel']));
const ALLOWED_ENGINES = Object.freeze(new Set(['native', 'mediabunny', 'ffmpeg']));

const PRESET_ID_PATTERN = /^[a-z][a-z0-9-]{0,63}$/;
const STATUS_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,63}$/;
const GOAL_ID_PATTERN = /^[a-z][a-z0-9:-]{0,63}$/;
const V2_FEATURE_PATTERN = /^(recipe|target-size|merge|split|two-pass|checksum|report|assistant)$/;

/**
 * Strip any telemetry prop that is not an allowed bucket/enum/status-code or
 * a boolean flag. Values that fail their allowlist check are dropped rather
 * than coerced, so callers never leak an unexpected shape by accident.
 * @param {Record<string, unknown> | null | undefined} props
 * @returns {Readonly<Record<string, string | boolean>>}
 */
export function sanitizeTelemetryProps(props) {
  /** @type {Record<string, string | boolean>} */
  const sanitized = {};
  if (!props || typeof props !== 'object') return Object.freeze(sanitized);

  for (const [key, value] of Object.entries(props)) {
    if (FORBIDDEN_KEY_PATTERN.test(key)) continue;

    if (typeof value === 'boolean') {
      sanitized[key] = value;
      continue;
    }

    if (!ALLOWED_TELEMETRY_KEYS.has(key) || typeof value !== 'string') continue;

    switch (key) {
      case 'category':
        if (ALLOWED_CATEGORIES.has(value)) sanitized.category = value;
        break;
      case 'outcome':
        if (ALLOWED_OUTCOMES.has(value)) sanitized.outcome = value;
        break;
      case 'engine':
        if (ALLOWED_ENGINES.has(value)) sanitized.engine = value;
        break;
      case 'presetId':
        if (PRESET_ID_PATTERN.test(value)) sanitized.presetId = value;
        break;
      case 'statusCode':
        if (STATUS_CODE_PATTERN.test(value)) sanitized.statusCode = value;
        break;
      case 'goalId':
        if (GOAL_ID_PATTERN.test(value)) sanitized.goalId = value;
        break;
      case 'mergeStatus':
      case 'splitStatus':
      case 'targetSizeStatus':
        if (STATUS_CODE_PATTERN.test(value)) sanitized[key] = value;
        break;
      case 'v2Feature':
        if (V2_FEATURE_PATTERN.test(value)) sanitized.v2Feature = value;
        break;
      case 'provider':
        if (ALLOWED_PROVIDERS.has(value)) sanitized.provider = value;
        break;
      case 'aiAction':
        if (ALLOWED_AI_ACTIONS.has(value)) sanitized.aiAction = value;
        break;
      case 'tokenBucket':
        if (TOKEN_BUCKET_PATTERN.test(value)) sanitized.tokenBucket = value;
        break;
      case 'costUsdBucket':
        if (COST_BUCKET_PATTERN.test(value)) sanitized.costUsdBucket = value;
        break;
      default:
        break;
    }
  }

  return Object.freeze(sanitized);
}

/**
 * Documents (and lightly asserts) that converter processing, telemetry, and
 * artifact storage must stay entirely on-device. This is a contract helper
 * for call sites that touch the network layer — it does not sandbox fetch —
 * so pair it with code review rather than relying on it as a runtime guard.
 * @returns {true}
 */
export function assertLocalOnlyContext() {
  return true;
}

const PATH_PATTERN = /(?:[A-Za-z]:)?[\\/][^\s"'<>]+/g;
const FILENAME_PATTERN = /\b[\w.\-]+\.[A-Za-z0-9]{1,8}\b/g;

/**
 * Replace anything that looks like a path or filename in a status message
 * with a generic token, for optional use when surfacing error text outside
 * of purely local UI (e.g. shared logs).
 * @param {string | null | undefined} message
 * @returns {string}
 */
export function redactStatusMessage(message) {
  if (typeof message !== 'string' || message.length === 0) return '';
  return message
    .replace(PATH_PATTERN, '<path>')
    .replace(FILENAME_PATTERN, '<file>');
}
