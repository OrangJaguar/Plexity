import { describe, expect, it } from 'vitest';
import {
  ADMIN_TOOL_CAPABILITY_DELTAS,
  PUBLIC_TOOL_CAPABILITIES,
  TOOL_EXTENSION_SLOTS,
  hasToolCapability,
  resolveToolCapabilities,
} from '@/lib/tools/tool-capabilities';
import { TOOL_REGISTRY } from '@/lib/tools/registry';

describe('tool capabilities', () => {
  it('starts with empty public maps for every tool', () => {
    for (const tool of TOOL_REGISTRY) {
      expect(PUBLIC_TOOL_CAPABILITIES[tool.id]).toEqual({});
      expect(resolveToolCapabilities(tool.id, 'public')).toEqual({});
    }
  });

  it('keeps non-converter admin deltas empty', () => {
    for (const tool of TOOL_REGISTRY) {
      if (tool.id === 'converter') continue;
      expect(ADMIN_TOOL_CAPABILITY_DELTAS[tool.id]).toEqual({});
      expect(resolveToolCapabilities(tool.id, 'admin')).toEqual({});
    }
  });

  it('resolves empty admin deltas identically to public', () => {
    const pub = resolveToolCapabilities('tasks', 'public');
    const admin = resolveToolCapabilities('tasks', 'admin');
    expect(admin).toEqual(pub);
  });

  it('adds Plan 5–7 converter capabilities only on the admin surface', () => {
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
    expect(hasToolCapability(
      resolveToolCapabilities('converter', 'admin'),
      'converter.playlist.import',
    )).toBe(true);
    expect(hasToolCapability(
      resolveToolCapabilities('converter', 'admin'),
      'converter.ai.assist',
    )).toBe(true);
    expect(hasToolCapability(
      resolveToolCapabilities('converter', 'public'),
      'converter.package.create',
    )).toBe(false);
    expect(hasToolCapability(
      resolveToolCapabilities('converter', 'public'),
      'converter.ai.ocr',
    )).toBe(false);
  });

  it('fails closed for unknown tools', () => {
    expect(resolveToolCapabilities('not-a-tool', 'admin')).toEqual({});
    expect(hasToolCapability({}, 'image.ai.generate')).toBe(false);
    expect(hasToolCapability({ 'image.ai.generate': false }, 'image.ai.generate')).toBe(false);
  });

  it('returns frozen capability objects', () => {
    const caps = resolveToolCapabilities('calendar', 'admin');
    expect(Object.isFrozen(caps)).toBe(true);
    expect(() => {
      caps['image.ai.generate'] = true;
    }).toThrow();
  });

  it('defines extension slot names without implementations', () => {
    expect(TOOL_EXTENSION_SLOTS).toContain('toolbarActions');
    expect(TOOL_EXTENSION_SLOTS).toContain('exportFormats');
  });

  it('merges a named admin delta when present', () => {
    const original = ADMIN_TOOL_CAPABILITY_DELTAS.tasks;
    // Simulate future delta without mutating the frozen export permanently:
    const merged = Object.freeze({
      ...PUBLIC_TOOL_CAPABILITIES.tasks,
      'tasks.ai.summarize': true,
    });
    expect(hasToolCapability(merged, 'tasks.ai.summarize')).toBe(true);
    expect(hasToolCapability(original, 'tasks.ai.summarize')).toBe(false);
  });
});
