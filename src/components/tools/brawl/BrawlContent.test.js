import { describe, expect, it } from 'vitest';
import { resolveBrawlPanel } from '@/components/tools/brawl/BrawlContent';

describe('brawl shell panels', () => {
  it('maps ranked + solo to ranked-solo', () => {
    expect(resolveBrawlPanel({ mode: 'ranked', scope: 'solo' })).toBe('ranked-solo');
  });

  it('maps ranked + trio to ranked-trio', () => {
    expect(resolveBrawlPanel({ mode: 'ranked', scope: 'trio' })).toBe('ranked-trio');
  });

  it('maps team mode regardless of draft scope', () => {
    expect(resolveBrawlPanel({ mode: 'team', scope: 'solo' })).toBe('team');
    expect(resolveBrawlPanel({ mode: 'team', scope: 'trio' })).toBe('team');
  });
});
