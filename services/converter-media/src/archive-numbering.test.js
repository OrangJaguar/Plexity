import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatArchivePath,
  padIndex,
  resolveUniqueArchivePath,
  sanitizeFileName,
} from './archive-numbering.js';

describe('archive-numbering', () => {
  it('pads playlist indices to three digits', () => {
    assert.equal(padIndex(1), '001');
    assert.equal(padIndex(42), '042');
  });

  it('prefixes file names with index by default', () => {
    assert.equal(formatArchivePath(3, 'song.mp3'), '003-song.mp3');
  });

  it('supports flat numbering policy', () => {
    assert.equal(formatArchivePath(3, 'song.mp3', 'flat'), 'song.mp3');
  });

  it('resolves unique paths on collision', () => {
    const used = new Map();
    const a = resolveUniqueArchivePath(1, 'clip.mp4', 'index-prefix', used);
    const b = resolveUniqueArchivePath(2, 'clip.mp4', 'index-prefix', used);
    assert.notEqual(a, b);
    assert.match(b, /^002-clip/);
  });

  it('sanitizes unsafe file names', () => {
    assert.match(sanitizeFileName('../evil/name.mp4'), /evil_name\.mp4$/);
  });
});
