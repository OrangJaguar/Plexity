import { describe, expect, it } from 'vitest';
import { formatChecksumShort, sha256Hex } from '@/lib/tools/converter/checksums.js';

describe('checksums', () => {
  it('computes a stable sha256 hex digest for Uint8Array input', async () => {
    const bytes = new TextEncoder().encode('hello world');
    const hex = await sha256Hex(bytes);
    expect(hex).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
  });

  it('computes the same digest for an equivalent ArrayBuffer', async () => {
    const bytes = new TextEncoder().encode('hello world');
    const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const hex = await sha256Hex(arrayBuffer);
    expect(hex).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
  });

  it('produces different digests for different content', async () => {
    const a = await sha256Hex(new TextEncoder().encode('a'));
    const b = await sha256Hex(new TextEncoder().encode('b'));
    expect(a).not.toBe(b);
  });

  it('formats a short checksum prefix', () => {
    expect(formatChecksumShort('B94D27B9934D3E08')).toBe('b94d27b9');
    expect(formatChecksumShort('abc', 8)).toBe('abc');
  });
});
