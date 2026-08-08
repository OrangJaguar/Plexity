import { describe, expect, it } from 'vitest';
import {
  encodeBrawlTag,
  formatBrawlTagDisplay,
  normalizeBrawlTag,
} from '@/api/brawl/tags';
import { normalizeCatalogBrawler } from '@/api/brawl/catalog';

describe('brawl tags', () => {
  it('normalizes and encodes player tags', () => {
    expect(normalizeBrawlTag('#2PP')).toBe('2PP');
    expect(normalizeBrawlTag('2pp')).toBe('2PP');
    expect(encodeBrawlTag('#2PP')).toBe('%232PP');
    expect(formatBrawlTagDisplay('2pp')).toBe('#2PP');
  });

  it('rejects empty or illegal tags', () => {
    expect(() => normalizeBrawlTag('')).toThrow(/required/i);
    expect(() => normalizeBrawlTag('#ABC1')).toThrow(/invalid/i);
  });
});

describe('brawl catalog normalize', () => {
  it('maps BrawlAPI-shaped brawler rows', () => {
    const row = normalizeCatalogBrawler({
      id: 16000000,
      name: 'Shelly',
      imageUrl2: 'https://cdn.example/shelly.png',
      rarity: { name: 'Common' },
    });
    expect(row).toEqual({
      id: 16000000,
      name: 'Shelly',
      imageUrl: 'https://cdn.example/shelly.png',
      rarity: 'Common',
      gadgets: [],
      starPowers: [],
    });
  });
});
