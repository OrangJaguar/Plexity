/**
 * Plan 6 regression guards — capture expected Plan 5+6 capability surface
 * before broader refactors. Keep public empty; admin additive only.
 */
import { describe, expect, it } from 'vitest';
import {
  ADMIN_TOOL_CAPABILITY_DELTAS,
  PUBLIC_TOOL_CAPABILITIES,
  resolveToolCapabilities,
} from '@/lib/tools/tool-capabilities';

/** Plan 5+6 keys that must remain present (Plan 7 may add more). */
export const PLAN6_ADMIN_CONVERTER_CAPS = Object.freeze({
  'converter.url.import': true,
  'converter.playlist.import': true,
  'converter.package.create': true,
});

describe('plan 6 baseline guards', () => {
  it('keeps public converter capabilities empty', () => {
    expect(PUBLIC_TOOL_CAPABILITIES.converter).toEqual({});
    expect(resolveToolCapabilities('converter', 'public')).toEqual({});
  });

  it('keeps Plan 5+6 admin keys as a required subset (no V2 gates)', () => {
    const admin = resolveToolCapabilities('converter', 'admin');
    const delta = ADMIN_TOOL_CAPABILITY_DELTAS.converter;
    for (const [key, value] of Object.entries(PLAN6_ADMIN_CONVERTER_CAPS)) {
      expect(delta[key]).toBe(value);
      expect(admin[key]).toBe(value);
    }
    for (const key of Object.keys(admin)) {
      expect(key.startsWith('converter.v2')).toBe(false);
    }
  });
});
