import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const FIXTURES_DIR = path.resolve(__dirname, '../../src/lib/tools/converter/__fixtures__');

/**
 * @param {string} name
 */
export function readFixture(name) {
  return fs.readFileSync(path.join(FIXTURES_DIR, name));
}

/**
 * @param {Buffer | Uint8Array} bytes
 */
function toBase64(bytes) {
  return Buffer.from(bytes).toString('base64');
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} method
 * @param {Buffer | Uint8Array} bytes
 * @param {string} operationId
 * @param {Record<string, unknown>} [options]
 */
export async function callHarness(page, method, bytes, operationId, options = {}) {
  return page.evaluate(async ({ fn, base64, op, opts }) => {
    const harness = window.__converterHarness;
    if (!harness || typeof harness[fn] !== 'function') {
      throw new Error(`Harness method missing: ${fn}`);
    }

    const binary = atob(base64);
    const input = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      input[i] = binary.charCodeAt(i);
    }

    const result = await harness[fn](input, op, opts);
    if (result?.buffer instanceof ArrayBuffer) {
      const out = new Uint8Array(result.buffer);
      let encoded = '';
      const chunk = 0x8000;
      for (let i = 0; i < out.length; i += chunk) {
        encoded += String.fromCharCode(...out.subarray(i, i + chunk));
      }
      return {
        ...result,
        bufferBase64: btoa(encoded),
        bufferLength: out.length,
      };
    }
    return result;
  }, {
    fn: method,
    base64: toBase64(bytes),
    op: operationId,
    opts: options,
  });
}

/**
 * @param {{ bufferBase64?: string, bufferLength?: number }} result
 */
export function getResultByteLength(result) {
  if (result.bufferLength != null) return result.bufferLength;
  if (result.bufferBase64) return Buffer.from(result.bufferBase64, 'base64').length;
  return 0;
}

/**
 * @param {{ bufferBase64?: string }} result
 */
export function decodeResultText(result) {
  if (!result.bufferBase64) return '';
  return Buffer.from(result.bufferBase64, 'base64').toString('utf8');
}
