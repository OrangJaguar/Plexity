import { describe, expect, it } from 'vitest';
import {
  buildOutputFileName,
  deterministicOutputName,
  replaceExtension,
  resolveNameCollision,
  sanitizeFileName,
} from '@/lib/tools/converter/converter-filenames.js';

describe('converter-filenames', () => {
  it('sanitizes invalid characters', () => {
    expect(sanitizeFileName('bad:name?.png')).toBe('bad_name_.png');
  });

  it('replaces extensions', () => {
    expect(replaceExtension('photo.png', 'jpg')).toBe('photo.jpg');
  });

  it('resolves name collisions with suffix', () => {
    const used = new Set(['out.jpg', 'out (2).jpg']);
    expect(resolveNameCollision('out.jpg', used)).toBe('out (3).jpg');
  });

  it('builds deterministic output names', () => {
    const name = buildOutputFileName({
      sourceName: 'pic.png',
      operationId: 'png-to-jpeg',
      extension: 'jpg',
    });
    expect(name).toMatch(/converted\.jpg$/);
  });

  it('creates deterministic tagged names', () => {
    expect(deterministicOutputName('png-to-jpeg', 'pic.png', 'jpg')).toBe('pic.png-to-jpeg.jpg');
  });
});
