/**
 * SHA-256 checksums for output integrity verification. Uses the Web Crypto
 * API, which is available in both browsers and the Node test runtime.
 */

/**
 * @returns {Crypto}
 */
function getCrypto() {
  const cryptoRef = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (!cryptoRef?.subtle) {
    throw new Error('Web Crypto API is unavailable in this environment');
  }
  return cryptoRef;
}

/**
 * @param {Uint8Array | ArrayBuffer} bytes
 * @returns {ArrayBuffer}
 */
function toArrayBuffer(bytes) {
  if (bytes instanceof ArrayBuffer) return bytes;
  if (bytes instanceof Uint8Array) {
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }
  throw new TypeError('sha256Hex expects a Uint8Array or ArrayBuffer');
}

/**
 * @param {Uint8Array | ArrayBuffer} bytes
 * @returns {Promise<string>}
 */
export async function sha256Hex(bytes) {
  const buffer = toArrayBuffer(bytes);
  const digest = await getCrypto().subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * @param {string} hex
 * @param {number} [length]
 * @returns {string}
 */
export function formatChecksumShort(hex, length = 8) {
  const normalized = String(hex ?? '').trim().toLowerCase();
  return normalized.slice(0, length);
}
