/**
 * Lightweight Playwright-oriented harness helpers for Plan 6 capability parity.
 * Full E2E against live discovery requires Docker; this documents expected gates.
 */
import { describe, expect, it } from 'vitest';
import {
  resolveToolCapabilities,
  CONVERTER_PLAYLIST_IMPORT_CAPABILITY,
  CONVERTER_PACKAGE_CREATE_CAPABILITY,
  CONVERTER_URL_IMPORT_CAPABILITY,
} from '@/lib/tools/tool-capabilities';

describe('plan 6 browser capability parity', () => {
  it('public surface has no playlist or package capabilities', () => {
    const pub = resolveToolCapabilities('converter', 'public');
    expect(pub[CONVERTER_URL_IMPORT_CAPABILITY]).toBeUndefined();
    expect(pub[CONVERTER_PLAYLIST_IMPORT_CAPABILITY]).toBeUndefined();
    expect(pub[CONVERTER_PACKAGE_CREATE_CAPABILITY]).toBeUndefined();
  });

  it('admin surface exposes independent playlist and package gates', () => {
    const admin = resolveToolCapabilities('converter', 'admin');
    expect(admin[CONVERTER_URL_IMPORT_CAPABILITY]).toBe(true);
    expect(admin[CONVERTER_PLAYLIST_IMPORT_CAPABILITY]).toBe(true);
    expect(admin[CONVERTER_PACKAGE_CREATE_CAPABILITY]).toBe(true);
  });
});
