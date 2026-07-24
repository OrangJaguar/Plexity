import { describe, expect, it } from 'vitest';
import {
  COMPATIBILITY_PROFILES,
  getCompatibilityProfile,
  listCompatibilityProfiles,
  resolveCompatibilityPlan,
} from '@/lib/tools/converter/compatibility-profiles.js';

const PROFILE_IDS = [
  'browser',
  'iphone',
  'android',
  'email',
  'discord',
  'website',
  'podcast',
  'presentation',
  'editing',
];

describe('compatibility-profiles', () => {
  it('defines all expected profiles', () => {
    const ids = listCompatibilityProfiles().map((p) => p.id);
    for (const id of PROFILE_IDS) {
      expect(ids).toContain(id);
    }
    expect(COMPATIBILITY_PROFILES.length).toBe(PROFILE_IDS.length);
  });

  it('gets a profile by id', () => {
    expect(getCompatibilityProfile('iphone')?.label).toContain('iPhone');
    expect(getCompatibilityProfile('nonexistent')).toBeUndefined();
  });

  it('resolves a compatibility plan for an image source', () => {
    const result = resolveCompatibilityPlan('browser', { category: 'image', format: 'png', width: 800, height: 600 });
    expect(result?.plan.operationId).toBeTruthy();
    expect(result?.plan.compatibilityProfile).toBe('browser');
  });

  it('resolves a podcast plan for audio down to mono 128kbps mp3', () => {
    const result = resolveCompatibilityPlan('podcast', { category: 'audio', format: 'wav' });
    expect(result?.plan.options.bitrateKbps).toBe(128);
    expect(result?.plan.options.channels).toBe(1);
  });

  it('returns null for an unknown profile', () => {
    expect(resolveCompatibilityPlan('unknown-profile', { category: 'image', format: 'png' })).toBeNull();
  });

  it('returns null when the category has no plan default', () => {
    const result = resolveCompatibilityPlan('podcast', { category: 'image', format: 'png' });
    expect(result).toBeNull();
  });

  it('freezes returned plans', () => {
    const result = resolveCompatibilityPlan('editing', { category: 'image', format: 'png' });
    expect(Object.isFrozen(result?.plan)).toBe(true);
  });
});
