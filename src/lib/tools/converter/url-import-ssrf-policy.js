/**
 * Mirror of services/converter-media SSRF policy for frontend/unit verification.
 * Server enforcement remains authoritative in the Docker fetch worker.
 */

const PRIVATE_V4 = [
  /^0\./,
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
  /^100\.(6[4-9]|[7-9]\d|1[0-2]\d)\./,
];

/**
 * @param {string} rawUrl
 * @returns {{ ok: true } | { ok: false, code: string }}
 */
export function evaluateUrlSsrfPolicy(rawUrl) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl || '').trim());
  } catch {
    return { ok: false, code: 'URL_INVALID' };
  }
  if (parsed.protocol !== 'https:') return { ok: false, code: 'URL_DISALLOWED' };
  if (parsed.username || parsed.password) return { ok: false, code: 'URL_DISALLOWED' };
  if (parsed.port && parsed.port !== '443') return { ok: false, code: 'URL_DISALLOWED' };

  const host = parsed.hostname.toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.local')) {
    return { ok: false, code: 'SSRF_BLOCKED' };
  }
  if (isIpLiteral(host) && isPrivateOrMetadata(host)) {
    return { ok: false, code: 'SSRF_BLOCKED' };
  }
  if (isIpLiteral(host)) {
    return { ok: false, code: 'SSRF_BLOCKED' };
  }
  return { ok: true };
}

/**
 * @param {string} host
 */
function isIpLiteral(host) {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  if (host.includes(':') || (host.startsWith('[') && host.endsWith(']'))) return true;
  return false;
}

/**
 * @param {string} host
 */
function isPrivateOrMetadata(host) {
  const h = host.replace(/^\[|\]$/g, '');
  if (h === '::1' || h === '0.0.0.0') return true;
  if (h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) return true;
  if (h === '169.254.169.254' || h.startsWith('metadata.')) return true;
  return PRIVATE_V4.some((re) => re.test(h));
}

export const SSRF_POLICY = Object.freeze({
  maxRedirects: 3,
  httpsOnly: true,
  stripAuthOnOriginChange: true,
});
