import { describe, expect, it } from 'vitest';
import {
  ADMIN_TOOL_CAPABILITY_DELTAS,
  PUBLIC_TOOL_CAPABILITIES,
  resolveToolCapabilities,
} from '@/lib/tools/tool-capabilities';
import { getToolRoute } from '@/lib/tools/tool-routes';
import { CONVERTER_FEATURE_FLAGS } from '@/lib/tools/converter/converter-feature-flags.js';
import { CONVERTER_PRESETS } from '@/lib/tools/converter/converter-presets.js';
import { TOOL_PAGE_META } from '@/lib/tools/tool-page-meta';

describe('converter v2 parity', () => {
  it('keeps shared converter routes with admin-only Plan 5–7 capabilities', () => {
    expect(getToolRoute('converter')).toBe('/convert');
    expect(getToolRoute('converter', { surface: 'admin' })).toBe('/admin/convert');
    expect(PUBLIC_TOOL_CAPABILITIES.converter).toEqual({});
    expect(ADMIN_TOOL_CAPABILITY_DELTAS.converter).toEqual({
      'converter.url.import': true,
      'converter.playlist.import': true,
      'converter.package.create': true,
      'converter.ai.assist': true,
      'converter.ai.ocr': true,
      'converter.ai.transcribe': true,
    });
    expect(resolveToolCapabilities('converter', 'public')).toEqual({});
    expect(resolveToolCapabilities('converter', 'admin')).toEqual({
      'converter.url.import': true,
      'converter.playlist.import': true,
      'converter.package.create': true,
      'converter.ai.assist': true,
      'converter.ai.ocr': true,
      'converter.ai.transcribe': true,
    });
  });

  it('does not introduce admin-only V2 capability gates', () => {
    const publicCaps = resolveToolCapabilities('converter', 'public');
    const adminCaps = resolveToolCapabilities('converter', 'admin');
    for (const key of Object.keys({ ...publicCaps, ...adminCaps })) {
      expect(key.startsWith('converter.v2')).toBe(false);
    }
    expect(adminCaps['converter.playlist.import']).toBe(true);
    expect(adminCaps['converter.package.create']).toBe(true);
  });

  it('shares the same converter page meta for both surfaces', () => {
    const entry = TOOL_PAGE_META.find((item) => item.id === 'converter');
    expect(entry?.route).toBe('/convert');
    expect(entry?.adminRoute ?? '/admin/convert').toBe('/admin/convert');
  });

  it('keeps V1 presets and adds V2 goals', () => {
    const ids = CONVERTER_PRESETS.map((p) => p.id);
    for (const id of ['make-smaller', 'under-size', 'compatibility', 'social-video', 'email-attachment', 'preserve-animation']) {
      expect(ids).toContain(id);
    }
  });

  it('allows V2 heavy paths to be disabled via feature flags shape', () => {
    expect(typeof CONVERTER_FEATURE_FLAGS.ENABLE_V2_TWO_PASS).toBe('boolean');
    expect(typeof CONVERTER_FEATURE_FLAGS.ENABLE_V2_MERGE_SPLIT).toBe('boolean');
    expect(typeof CONVERTER_FEATURE_FLAGS.ENABLE_V2_ADVANCED_FFMPEG).toBe('boolean');
    expect(typeof CONVERTER_FEATURE_FLAGS.ENABLE_V2_TARGET_SIZE).toBe('boolean');
    expect(typeof CONVERTER_FEATURE_FLAGS.ENABLE_V2_RECIPES).toBe('boolean');
  });
});
