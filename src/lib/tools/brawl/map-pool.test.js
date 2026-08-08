import { describe, expect, it } from 'vitest';
import { mapsForGameMode, resolveMapChoices } from '@/lib/tools/brawl/map-pool';

const maps = [
  { name: 'Hard Rock Mine', disabled: false, gameMode: { name: 'Gem Grab' } },
  { name: 'Old Gem Map', disabled: true, gameMode: { name: 'Gem Grab' } },
  { name: 'Center Stage', disabled: false, gameMode: { name: 'Brawl Ball' } },
  { name: 'Noise Map', disabled: false, gameMode: { name: 'Gem Grab' } },
];

describe('brawl map pool', () => {
  it('filters active maps by mode', () => {
    const gg = mapsForGameMode(maps, 'gemGrab');
    expect(gg.map((m) => m.name).sort()).toEqual(['Hard Rock Mine', 'Noise Map']);
  });

  it('uses curated ranked pool as authority', () => {
    const choices = resolveMapChoices(maps, 'gemGrab', {
      gemGrab: ['Hard Rock Mine', 'Custom Ranked Only'],
    });
    expect(choices.map((m) => m.name)).toEqual(['Hard Rock Mine', 'Custom Ranked Only']);
  });

  it('does not fall back to full API list when other modes are curated', () => {
    const choices = resolveMapChoices(maps, 'gemGrab', {
      gemGrab: [],
      brawlBall: ['Center Stage'],
    });
    expect(choices).toEqual([]);
  });
});
