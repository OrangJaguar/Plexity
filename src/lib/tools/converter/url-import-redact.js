/**
 * Redact credentials, signed query params, and sensitive tokens from URLs
 * for display, logs, and audits. Never returns the raw secret-bearing URL.
 */

const SENSITIVE_QUERY_KEYS = Object.freeze(new Set([
  'token',
  'access_token',
  'auth',
  'authorization',
  'signature',
  'sig',
  'x-amz-signature',
  'x-amz-credential',
  'x-amz-security-token',
  'awsaccesskeyid',
  'key',
  'apikey',
  'api_key',
  'password',
  'secret',
  'session',
  'sid',
  'cookie',
]));

/**
 * @param {string} raw
 * @returns {string}
 */
export function redactUrlForDisplay(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return '[empty]';
  let parsed;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return '[invalid-url]';
  }

  const host = parsed.hostname || '[host]';
  const path = parsed.pathname && parsed.pathname !== '/'
    ? truncatePath(parsed.pathname)
    : '';

  if (parsed.username || parsed.password) {
    return `https://***@${host}${path}`;
  }

  let hasSensitive = false;
  for (const key of parsed.searchParams.keys()) {
    if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) {
      hasSensitive = true;
      break;
    }
  }

  const queryNote = hasSensitive
    ? '?[redacted]'
    : (parsed.search ? '?[query]' : '');

  return `https://${host}${path}${queryNote}`;
}

/**
 * Short label for review lists — host + last path segment only.
 * @param {string} raw
 * @returns {string}
 */
export function redactedSourceLabel(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return 'unknown';
  try {
    const parsed = new URL(raw.trim());
    const host = parsed.hostname || 'unknown';
    const parts = parsed.pathname.split('/').filter(Boolean);
    const leaf = parts.length ? parts[parts.length - 1].slice(0, 48) : '';
    return leaf ? `${host}/…/${leaf}` : host;
  } catch {
    return 'invalid';
  }
}

/**
 * @param {string} pathname
 */
function truncatePath(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length <= 2) return `/${parts.join('/')}`;
  return `/…/${parts[parts.length - 1].slice(0, 64)}`;
}
