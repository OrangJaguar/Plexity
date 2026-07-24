import crypto from 'node:crypto';
import { config } from './config.js';

const HEX = /^[0-9a-f]+$/i;

export function sha256Hex(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function hmacSign(secret, message) {
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

export function hmacVerify(secret, message, signatureHex) {
  if (!signatureHex || !HEX.test(signatureHex)) return false;
  const expected = hmacSign(secret, message);
  if (expected.length !== signatureHex.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signatureHex, 'hex'));
}

/**
 * Canonical message: method\npath\ntimestamp\nnonce\nbodyHash
 * bodyHash = HMAC(secret, rawBody) — matches Base44 adminConverterApi.
 */
export function buildCanonicalRequest(method, path, timestamp, nonce, rawBody, secret = config.hmacSecret) {
  const bodyHash = hmacSign(secret, rawBody || '');
  return `${method}\n${path}\n${timestamp}\n${nonce}\n${bodyHash}`;
}

export function verifyRequestSignature(req, rawBody, secret = config.hmacSecret) {
  const timestamp = req.headers['x-plexity-timestamp'] || '';
  const nonce = req.headers['x-plexity-nonce'] || '';
  const signature = req.headers['x-plexity-signature'] || '';
  const tsNum = Number(timestamp);

  if (!timestamp || !nonce || !signature || !Number.isFinite(tsNum)) {
    return { ok: false, code: 'AUTH_REQUIRED' };
  }
  if (Math.abs(Date.now() - tsNum) > config.hmacMaxSkewMs) {
    return { ok: false, code: 'AUTH_REQUIRED' };
  }
  if (!secret) {
    return { ok: false, code: 'SERVICE_UNAVAILABLE' };
  }

  const canonical = buildCanonicalRequest(req.method.toUpperCase(), req.path, timestamp, nonce, rawBody, secret);
  if (!hmacVerify(secret, canonical, signature)) {
    return { ok: false, code: 'AUTH_REQUIRED' };
  }
  return { ok: true };
}

export function signOutboundRequest(method, path, body, secret = config.hmacSecret) {
  const timestamp = String(Date.now());
  const nonce = crypto.randomUUID();
  const bodyText = typeof body === 'string' ? body : JSON.stringify(body);
  const canonical = buildCanonicalRequest(method, path, timestamp, nonce, bodyText, secret);
  const signature = hmacSign(secret, canonical);
  return {
    timestamp,
    nonce,
    signature,
    bodyText,
    headers: {
      'content-type': 'application/json',
      'x-plexity-timestamp': timestamp,
      'x-plexity-nonce': nonce,
      'x-plexity-signature': signature,
    },
  };
}
