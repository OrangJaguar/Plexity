import crypto from 'node:crypto';
import { config } from './config.js';
import { hmacSign } from './hmac.js';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;

function deriveKey() {
  const raw = config.encryptionKey || '';
  if (!raw) return null;
  if (/^[0-9a-f]{64}$/i.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  return crypto.createHash('sha256').update(raw).digest();
}

/**
 * Encrypt a source URL for at-rest storage in discovery_items.
 * Falls back to base64+HMAC envelope when ENCRYPTION_KEY is absent.
 */
export function encryptSourceUrl(plaintext) {
  const key = deriveKey();
  if (!key) {
    const payload = Buffer.from(String(plaintext), 'utf8').toString('base64');
    const mac = hmacSign(config.hmacSecret || 'dev', payload);
    return `b64hmac:${payload}:${mac}`;
  }

  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `aes256gcm:${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

export function decryptSourceUrl(ciphertext) {
  if (!ciphertext) return '';
  const str = String(ciphertext);

  if (str.startsWith('b64hmac:')) {
    const [, payload, mac] = str.split(':');
    const expected = hmacSign(config.hmacSecret || 'dev', payload);
    if (mac !== expected) throw new Error('ENCRYPTION_INTEGRITY');
    return Buffer.from(payload, 'base64').toString('utf8');
  }

  if (str.startsWith('aes256gcm:')) {
    const key = deriveKey();
    if (!key) throw new Error('ENCRYPTION_KEY_MISSING');
    const parts = str.split(':');
    const iv = Buffer.from(parts[1], 'hex');
    const tag = Buffer.from(parts[2], 'hex');
    const data = Buffer.from(parts[3], 'hex');
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  }

  throw new Error('ENCRYPTION_FORMAT');
}

/** Wipe encrypted URL after discovery reaches terminal state. */
export function wipedEncryptedUrl() {
  return '';
}
