import { describe, expect, it } from 'vitest';
import { buildTagIndex } from '@/lib/tools/brawl/draft-score';
import { hintLoadout, ownershipForNamedPiece } from '@/lib/tools/brawl/loadouts';

describe('loadout hints', () => {
  const catalog = [
    {
      id: 2,
      name: 'Piper',
      gadgets: [
        { id: 1, name: 'Auto Aimer' },
        { id: 2, name: 'Homemade Recipe' },
      ],
      starPowers: [
        { id: 10, name: 'Ambush' },
        { id: 11, name: 'Snappy Sniping' },
      ],
    },
    { id: 4, name: 'Edgar' },
  ];
  const tagIndex = buildTagIndex(catalog);
  const catalogById = new Map(catalog.map((c) => [c.id, c]));

  it('piper default uses Ambush; flips gadget vs dive', () => {
    const cold = hintLoadout({
      brawlerId: 2,
      modeId: 'knockout',
      enemyPickIds: [],
      tagIndex,
      catalogById,
    });
    expect(cold.lines.some((l) => /Ambush/i.test(l))).toBe(true);

    const vsDive = hintLoadout({
      brawlerId: 2,
      modeId: 'knockout',
      enemyPickIds: [4],
      tagIndex,
      catalogById,
    });
    expect(vsDive.lines.some((l) => /Auto Aimer/i.test(l))).toBe(true);
    expect(vsDive.note || vsDive.lines.join(' ')).toMatch(/dive/i);
  });

  it('warns when defining gadget missing', () => {
    const rosterRow = {
      gadget_count: 0,
      star_power_count: 0,
      gear_count: 0,
      raw: { gadgets: [], starPowers: [] },
    };
    const hint = hintLoadout({
      brawlerId: 2,
      modeId: 'knockout',
      enemyPickIds: [],
      tagIndex,
      catalogById,
      rosterRow,
    });
    expect(hint.warnings.length).toBeGreaterThan(0);
  });

  it('detects owned gadget by id', () => {
    const own = ownershipForNamedPiece(
      catalog[0],
      { raw: { gadgets: [{ id: 2 }], starPowers: [{ id: 10 }] }, gadget_count: 1, star_power_count: 1 },
      'Homemade Recipe',
      'gadget',
    );
    expect(own.owned).toBe(true);
  });
});
