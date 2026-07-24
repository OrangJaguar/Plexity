import { describe, expect, it } from 'vitest';
import {
  detectGifAnimation,
  inspectFileHeader,
  INSPECTION_ERROR,
} from '@/lib/tools/converter/file-inspection.js';

const PNG = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

describe('file-inspection', () => {
  it('detects PNG signature', () => {
    const result = inspectFileHeader({
      bytes: PNG,
      fileSize: PNG.length,
      fileName: 'x.png',
    });
    expect(result.ok).toBe(true);
    expect(result.format).toBe('png');
  });

  it('detects JPEG signature', () => {
    const bytes = Uint8Array.from([0xff, 0xd8, 0xff, 0x00]);
    const result = inspectFileHeader({ bytes, fileSize: bytes.length, fileName: 'a.jpg' });
    expect(result.ok).toBe(true);
    expect(result.format).toBe('jpeg');
  });

  it('detects WAV RIFF/WAVE', () => {
    const bytes = new TextEncoder().encode('RIFF\x00\x00\x00\x00WAVEfmt ');
    const result = inspectFileHeader({ bytes, fileSize: bytes.length, fileName: 'a.wav' });
    expect(result.ok).toBe(true);
    expect(result.format).toBe('wav');
  });

  it('detects JSON text', () => {
    const bytes = new TextEncoder().encode('{"a":1}');
    const result = inspectFileHeader({ bytes, fileSize: bytes.length, fileName: 'a.json' });
    expect(result.ok).toBe(true);
    expect(result.format).toBe('json');
  });

  it('detects CSV by delimiter', () => {
    const bytes = new TextEncoder().encode('a,b,c\n1,2,3');
    const result = inspectFileHeader({ bytes, fileSize: bytes.length, fileName: 'a.csv' });
    expect(result.ok).toBe(true);
    expect(result.format).toBe('csv');
  });

  it('rejects empty files', () => {
    const result = inspectFileHeader({ bytes: new Uint8Array(), fileSize: 0, fileName: 'empty.png' });
    expect(result.ok).toBe(false);
    expect(result.code).toBe(INSPECTION_ERROR.FILE_EMPTY);
  });

  it('rejects executables', () => {
    const bytes = Uint8Array.from([0x4d, 0x5a, 0x90, 0x00]);
    const result = inspectFileHeader({ bytes, fileSize: bytes.length, fileName: 'app.exe' });
    expect(result.ok).toBe(false);
    expect(result.code).toBe(INSPECTION_ERROR.EXECUTABLE_REJECTED);
  });

  it('rejects SVG as untrusted render', () => {
    const bytes = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    const result = inspectFileHeader({ bytes, fileSize: bytes.length, fileName: 'icon.svg' });
    expect(result.ok).toBe(false);
    expect(result.code).toBe(INSPECTION_ERROR.UNTRUSTED_RENDER);
  });

  it('warns on extension mismatch but prefers signature', () => {
    const result = inspectFileHeader({
      bytes: PNG,
      fileSize: PNG.length,
      fileName: 'wrong.jpg',
    });
    expect(result.ok).toBe(true);
    expect(result.format).toBe('png');
    expect(result.warnings?.some((w) => w.includes('Extension'))).toBe(true);
  });

  it('detects BMP signature', () => {
    const bytes = Uint8Array.from([0x42, 0x4d, 0x00, 0x00]);
    const result = inspectFileHeader({ bytes, fileSize: bytes.length, fileName: 'a.bmp' });
    expect(result.ok).toBe(true);
    expect(result.format).toBe('bmp');
  });

  it('detects animated GIF via multiple image descriptors', () => {
    const bytes = Uint8Array.from([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61,
      0x01, 0x00, 0x01, 0x00, 0x00,
      0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
      0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    ]);
    expect(detectGifAnimation(bytes)).toBe(true);
    const result = inspectFileHeader({ bytes, fileSize: bytes.length, fileName: 'a.gif' });
    expect(result.ok).toBe(true);
    expect(result.format).toBe('gif');
    expect(result.animated).toBe(true);
  });

  it('detects YAML text', () => {
    const bytes = new TextEncoder().encode('name: test\nitems:\n  - one');
    const result = inspectFileHeader({ bytes, fileSize: bytes.length, fileName: 'a.yaml' });
    expect(result.ok).toBe(true);
    expect(result.format).toBe('yaml');
  });

  it('detects XML text', () => {
    const bytes = new TextEncoder().encode('<root><item>1</item></root>');
    const result = inspectFileHeader({ bytes, fileSize: bytes.length, fileName: 'a.xml' });
    expect(result.ok).toBe(true);
    expect(result.format).toBe('xml');
  });

  it('trusts json extension for truncated prefix', () => {
    const bytes = new TextEncoder().encode('{"items": [{"a":');
    const result = inspectFileHeader({
      bytes,
      fileSize: 100000,
      fileName: 'big.json',
      declaredMime: 'application/json',
    });
    expect(result.ok).toBe(true);
    expect(result.format).toBe('json');
  });

  it('detects MP3 ID3 header', () => {
    const bytes = Uint8Array.from([0x49, 0x44, 0x33, 0x03]);
    const result = inspectFileHeader({ bytes, fileSize: bytes.length, fileName: 'a.mp3' });
    expect(result.ok).toBe(true);
    expect(result.format).toBe('mp3');
  });

  it('treats common video ftyp brands as mp4, not m4a', () => {
    for (const brand of ['isom', 'mp42', 'iso2', 'avc1']) {
      const bytes = new Uint8Array(16);
      bytes.set([0x00, 0x00, 0x00, 0x18], 0);
      bytes.set(new TextEncoder().encode('ftyp'), 4);
      bytes.set(new TextEncoder().encode(brand.padEnd(4, ' ').slice(0, 4)), 8);
      const result = inspectFileHeader({
        bytes,
        fileSize: bytes.length,
        fileName: 'clip.mp4',
      });
      expect(result.ok).toBe(true);
      expect(result.format).toBe('mp4');
    }
  });

  it('detects M4A audio brand as m4a', () => {
    const bytes = new Uint8Array(16);
    bytes.set([0x00, 0x00, 0x00, 0x18], 0);
    bytes.set(new TextEncoder().encode('ftyp'), 4);
    bytes.set(new TextEncoder().encode('M4A '), 8);
    const result = inspectFileHeader({
      bytes,
      fileSize: bytes.length,
      fileName: 'song.m4a',
    });
    expect(result.ok).toBe(true);
    expect(result.format).toBe('m4a');
  });
});
