import { describe, expect, it } from 'vitest';
import {
  metaBoostFromTier,
  parseMetaTierText,
} from '@/lib/tools/brawl/meta-prior';

const catalog = [
  { id: 1, name: 'Shelly' },
  { id: 2, name: 'Piper' },
];

describe('brawl meta prior', () => {
  it('parses CSV-ish lines and skips unknowns', () => {
    const { byId, skipped, accepted } = parseMetaTierText(
      'Shelly, 90\nUnknown, 50\nPiper, A\n',
      catalog,
    );
    expect(accepted).toBe(2);
    expect(byId.get(1)).toBe(90);
    expect(byId.get(2)).toBe(80);
    expect(skipped).toContain('Unknown');
  });

  it('parses JSON object', () => {
    const { byId, accepted } = parseMetaTierText(JSON.stringify({ Shelly: 70, Piper: 'S' }), catalog);
    expect(accepted).toBe(2);
    expect(byId.get(1)).toBe(70);
    expect(byId.get(2)).toBe(95);
  });

  it('caps soft boost', () => {
    expect(metaBoostFromTier(100)).toBe(12);
    expect(metaBoostFromTier(50)).toBe(6);
    expect(metaBoostFromTier(null)).toBe(0);
  });
});
