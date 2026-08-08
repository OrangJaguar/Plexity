import { describe, expect, it } from 'vitest';
import {
  accountIntensityPrior,
  completionScore,
  computeFitForRoster,
  familiarityFromBattlelog,
} from '@/lib/tools/brawl/fit-engine';

describe('brawl fit engine', () => {
  it('scores pockets high and avoids near zero', () => {
    const roster = [
      { brawler_id: 1, power: 11, trophies: 900, has_hypercharge: true, gadget_count: 2, star_power_count: 2, gear_count: 2 },
      { brawler_id: 2, power: 11, trophies: 100, has_hypercharge: false, gadget_count: 0, star_power_count: 0, gear_count: 0 },
      { brawler_id: 3, power: 9, trophies: 500, has_hypercharge: false, gadget_count: 1, star_power_count: 1, gear_count: 1 },
    ];
    const results = computeFitForRoster(
      roster,
      new Set([2]),
      new Set([1]),
      {},
      { trophies: 50000, highestTrophies: 60000, '3vs3Victories': 8000 },
    );
    const byId = Object.fromEntries(results.map((r) => [r.brawlerId, r]));
    expect(byId[2].fit).toBeGreaterThanOrEqual(85);
    expect(byId[1].fit).toBeLessThanOrEqual(8);
    expect(byId[3].fit).toBeGreaterThan(byId[1].fit);
  });

  it('builds account prior from trophies/wins', () => {
    const low = accountIntensityPrior({ trophies: 1000, highestTrophies: 1000, '3vs3Victories': 10 });
    const high = accountIntensityPrior({ trophies: 70000, highestTrophies: 80000, '3vs3Victories': 20000, rankedElo: 900 });
    expect(high).toBeGreaterThan(low);
  });

  it('completion increases with power and HC', () => {
    expect(completionScore({ power: 11, has_hypercharge: true, gadget_count: 2, star_power_count: 2, gear_count: 2 }))
      .toBeGreaterThan(completionScore({ power: 7, has_hypercharge: false }));
  });

  it('familiarity is frequency-only', () => {
    const fam = familiarityFromBattlelog({
      items: [
        { battle: { teams: [[{ brawler: { id: 16000013 } }], [{ brawler: { id: 16000000 } }]] } },
        { battle: { teams: [[{ brawler: { id: 16000013 } }], [{ brawler: { id: 16000001 } }]] } },
      ],
    });
    expect(fam[16000013]).toBe(1);
    expect(fam[16000000]).toBeLessThan(1);
  });
});
