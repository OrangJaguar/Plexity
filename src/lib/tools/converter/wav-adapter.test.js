import { describe, expect, it } from 'vitest';
import {
  encodeWavPcm16,
  parseWavPcm,
  transformPcm,
} from '@/lib/tools/converter/adapters/wav-adapter.js';

function makeWavBuffer() {
  const samples = new Float32Array([0, 0.5, -0.5, 0.25]);
  return encodeWavPcm16(samples, 1, 44100);
}

describe('wav-adapter', () => {
  it('round-trips PCM WAV parse metadata', () => {
    const bytes = makeWavBuffer();
    const info = parseWavPcm(bytes);
    expect(info.channels).toBe(1);
    expect(info.sampleRate).toBe(44100);
    expect(info.bitsPerSample).toBe(16);
    expect(info.dataSize).toBeGreaterThan(0);
  });

  it('transforms sample rate and channels', () => {
    const input = new Float32Array([1, -1, 1, -1]);
    const out = transformPcm(input, 2, 44100, 1, 22050, 0);
    expect(out.length).toBeGreaterThan(0);
    expect(out.length).toBeLessThan(input.length);
  });

  it('applies gain in dB', () => {
    const input = new Float32Array([0.1, 0.1]);
    const out = transformPcm(input, 1, 44100, 1, 44100, 6);
    expect(out[0]).toBeGreaterThan(0.1);
  });

  it('rejects truncated wav data chunk', () => {
    const bytes = makeWavBuffer();
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const dataSize = view.getUint32(40, true);
    view.setUint32(40, dataSize + 100, true);
    expect(() => parseWavPcm(bytes)).toThrow(/truncated/i);
  });
});
