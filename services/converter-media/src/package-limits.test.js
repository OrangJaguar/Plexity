import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { admitPackageEntry, pickCompressionMethod } from './package-limits.js';
import { QUOTAS } from './quotas.js';

describe('package-limits', () => {
  it('rejects entries that exceed the hard cap', () => {
    const nearCap = QUOTAS.packageHardCapBytes - 10;
    const ok = admitPackageEntry(nearCap, 5);
    assert.equal(ok.ok, true);
    const bad = admitPackageEntry(nearCap, 20);
    assert.equal(bad.ok, false);
    assert.equal(bad.code, 'PACKAGE_TOO_LARGE');
  });

  it('stores av/image without deflate', () => {
    assert.equal(pickCompressionMethod('video/mp4', 'out.mp4'), 'store');
    assert.equal(pickCompressionMethod('image/png', 'thumb.png'), 'store');
  });

  it('deflates text-like payloads', () => {
    assert.equal(pickCompressionMethod('application/json', 'meta.json'), 'deflate');
  });
});
