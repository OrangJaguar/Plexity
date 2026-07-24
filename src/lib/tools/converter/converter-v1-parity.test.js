import { describe, expect, it } from 'vitest';
import {
  assertToolPageManifestParity,
  EXPECTED_TOOL_COUNT,
  TOOL_PAGE_META,
} from '@/lib/tools/tool-page-meta';
import {
  ADMIN_TOOL_CAPABILITY_DELTAS,
  PUBLIC_TOOL_CAPABILITIES,
  resolveToolCapabilities,
} from '@/lib/tools/tool-capabilities';
import { TOOL_REGISTRY } from '@/lib/tools/registry';
import { getToolRoute } from '@/lib/tools/tool-routes';

describe('converter v1 parity', () => {
  it('includes converter in TOOL_PAGE_META', () => {
    expect(TOOL_PAGE_META.some((entry) => entry.id === 'converter')).toBe(true);
    expect(TOOL_PAGE_META.find((entry) => entry.id === 'converter')?.route).toBe('/convert');
  });

  it('keeps expected tool inventory at 21', () => {
    expect(EXPECTED_TOOL_COUNT).toBe(19);
    expect(TOOL_PAGE_META).toHaveLength(EXPECTED_TOOL_COUNT);
    expect(TOOL_REGISTRY).toHaveLength(EXPECTED_TOOL_COUNT);
  });

  it('keeps page manifest parity with registry', () => {
    const parity = assertToolPageManifestParity();
    expect(parity.ok).toBe(true);
  });

  it('routes converter on public and admin surfaces', () => {
    expect(getToolRoute('converter')).toBe('/convert');
    expect(getToolRoute('converter', { surface: 'admin' })).toBe('/admin/convert');
  });

  it('keeps public converter empty and admin additive Plan 5–7 keys', () => {
    expect(PUBLIC_TOOL_CAPABILITIES.converter).toEqual({});
    expect(resolveToolCapabilities('converter', 'public')).toEqual({});
    expect(ADMIN_TOOL_CAPABILITY_DELTAS.converter).toEqual({
      'converter.url.import': true,
      'converter.playlist.import': true,
      'converter.package.create': true,
      'converter.ai.assist': true,
      'converter.ai.ocr': true,
      'converter.ai.transcribe': true,
    });
    expect(resolveToolCapabilities('converter', 'admin')).toEqual({
      'converter.url.import': true,
      'converter.playlist.import': true,
      'converter.package.create': true,
      'converter.ai.assist': true,
      'converter.ai.ocr': true,
      'converter.ai.transcribe': true,
    });
  });
});
