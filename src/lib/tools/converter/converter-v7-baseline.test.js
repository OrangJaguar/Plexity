/**
 * Plan 7 regression guards — public empty; admin additive Plan 5–7 keys.
 */
import { describe, expect, it } from 'vitest';
import {
  ADMIN_TOOL_CAPABILITY_DELTAS,
  PUBLIC_TOOL_CAPABILITIES,
  resolveToolCapabilities,
} from '@/lib/tools/tool-capabilities';

export const PLAN7_ADMIN_CONVERTER_CAPS = Object.freeze({
  'converter.url.import': true,
  'converter.playlist.import': true,
  'converter.package.create': true,
  'converter.ai.assist': true,
  'converter.ai.ocr': true,
  'converter.ai.transcribe': true,
});

describe('plan 7 baseline guards', () => {
  it('keeps public converter capabilities empty', () => {
    expect(PUBLIC_TOOL_CAPABILITIES.converter).toEqual({});
    expect(resolveToolCapabilities('converter', 'public')).toEqual({});
  });

  it('documents Plan 5–7 keys but keeps admin converter empty while server features are off', () => {
    expect(Object.keys(PLAN7_ADMIN_CONVERTER_CAPS).length).toBe(6);
    expect(ADMIN_TOOL_CAPABILITY_DELTAS.converter).toEqual({});
    const admin = resolveToolCapabilities('converter', 'admin');
    expect(admin).toEqual({});
    for (const key of Object.keys(admin)) {
      expect(key.startsWith('converter.v2')).toBe(false);
    }
  });
});
