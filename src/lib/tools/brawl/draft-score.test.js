import { describe, expect, it } from 'vitest';
import {
  buildTagIndex,
  createEmptyDraftState,
  eloToAccountPower,
  legalP11Ids,
  scoreDraftCandidate,
} from '@/lib/tools/brawl/draft-score';

describe('brawl draft score', () => {
  const catalog = [
    { id: 1, name: 'Shelly' },
    { id: 2, name: 'Piper' },
    { id: 3, name: 'Bull' },
    { id: 4, name: 'Edgar' },
    { id: 5, name: 'Gale' },
    { id: 6, name: 'Colette' },
  ];
  const tagIndex = buildTagIndex(catalog);

  it('only returns owned power 11s not already taken', () => {
    const roster = [
      { brawler_id: 1, power: 11 },
      { brawler_id: 2, power: 9 },
      { brawler_id: 3, power: 11 },
    ];
    expect(legalP11Ids(roster, new Set([1]))).toEqual([3]);
  });

  it('soft-demotes avoids without hard killing', () => {
    const scored = scoreDraftCandidate({
      brawlerId: 1,
      fit: 90,
      isAvoid: true,
      isPocket: false,
      modeId: 'gemGrab',
      ourPickIds: [],
      enemyPickIds: [],
      tagIndex,
    });
    const clean = scoreDraftCandidate({
      brawlerId: 1,
      fit: 90,
      isAvoid: false,
      modeId: 'gemGrab',
      ourPickIds: [],
      enemyPickIds: [],
      tagIndex,
    });
    expect(scored.score).toBeLessThan(clean.score);
    expect(scored.reasons).toContain('avoid');
  });

  it('punishes assassin first picks and rewards B3 multi-counter', () => {
    const a1Assassin = scoreDraftCandidate({
      brawlerId: 4,
      fit: 60,
      modeId: 'knockout',
      ourPickIds: [],
      enemyPickIds: [],
      tagIndex,
      laneSeat: 'A1',
    });
    const a1Control = scoreDraftCandidate({
      brawlerId: 5,
      fit: 60,
      modeId: 'knockout',
      ourPickIds: [],
      enemyPickIds: [],
      tagIndex,
      laneSeat: 'A1',
    });
    expect(a1Control.score).toBeGreaterThan(a1Assassin.score);
    expect(a1Assassin.reasons).toContain('risky A1');
    expect(a1Control.reasons).toContain('safe A1');

    const b3 = scoreDraftCandidate({
      brawlerId: 4,
      fit: 50,
      modeId: 'knockout',
      ourPickIds: [],
      enemyPickIds: [2, 2],
      tagIndex,
      laneSeat: 'B3',
    });
    expect(b3.reasons.some((r) => r.includes('counter') || r.includes('B3') || r.includes('dive'))).toBe(true);
  });

  it('same brawler scores differently across modes', () => {
    const ko = scoreDraftCandidate({
      brawlerId: 4, // Edgar assassin
      fit: 55,
      modeId: 'knockout',
      ourPickIds: [],
      enemyPickIds: [],
      tagIndex,
      laneSeat: 'A2',
    });
    const ball = scoreDraftCandidate({
      brawlerId: 4,
      fit: 55,
      modeId: 'brawlBall',
      ourPickIds: [],
      enemyPickIds: [],
      tagIndex,
      laneSeat: 'A2',
    });
    expect(ball.score).not.toBe(ko.score);
  });

  it('map name texture reshuffles within a mode', () => {
    const open = scoreDraftCandidate({
      brawlerId: 2, // Piper sniper
      fit: 55,
      modeId: 'knockout',
      ourPickIds: [],
      enemyPickIds: [],
      tagIndex,
      laneSeat: 'A2',
      mapName: 'Open Field Bridge',
    });
    const bush = scoreDraftCandidate({
      brawlerId: 2,
      fit: 55,
      modeId: 'knockout',
      ourPickIds: [],
      enemyPickIds: [],
      tagIndex,
      laneSeat: 'A2',
      mapName: 'Sneaky Bush Cavern',
    });
    expect(open.score).not.toBe(bush.score);
  });

  it('pocket does not beat a real safe A1 / counter', () => {
    const pocketAssassinA1 = scoreDraftCandidate({
      brawlerId: 4,
      fit: 95,
      isPocket: true,
      modeId: 'knockout',
      ourPickIds: [],
      enemyPickIds: [],
      tagIndex,
      laneSeat: 'A1',
    });
    const safeControlA1 = scoreDraftCandidate({
      brawlerId: 5,
      fit: 50,
      isPocket: false,
      modeId: 'knockout',
      ourPickIds: [],
      enemyPickIds: [],
      tagIndex,
      laneSeat: 'A1',
    });
    expect(safeControlA1.score).toBeGreaterThan(pocketAssassinA1.score);

    const pocketNoCounterB3 = scoreDraftCandidate({
      brawlerId: 1,
      fit: 95,
      isPocket: true,
      modeId: 'knockout',
      ourPickIds: [],
      enemyPickIds: [2, 2],
      tagIndex,
      laneSeat: 'B3',
    });
    const diveB3 = scoreDraftCandidate({
      brawlerId: 4,
      fit: 50,
      isPocket: false,
      modeId: 'knockout',
      ourPickIds: [],
      enemyPickIds: [2, 2],
      tagIndex,
      laneSeat: 'B3',
    });
    expect(diveB3.score).toBeGreaterThan(pocketNoCounterB3.score);
  });

  it('boosts role fill and counters', () => {
    const alreadyCovered = scoreDraftCandidate({
      brawlerId: 3,
      fit: 50,
      modeId: 'knockout',
      ourPickIds: [2, 1],
      enemyPickIds: [],
      tagIndex,
    });
    const fillsSniperLane = scoreDraftCandidate({
      brawlerId: 2,
      fit: 50,
      modeId: 'knockout',
      ourPickIds: [],
      enemyPickIds: [],
      tagIndex,
    });
    expect(fillsSniperLane.score).toBeGreaterThan(alreadyCovered.score);
    expect(fillsSniperLane.reasons).toContain('fills role');

    const counterPick = scoreDraftCandidate({
      brawlerId: 4,
      fit: 50,
      modeId: 'knockout',
      ourPickIds: [],
      enemyPickIds: [2],
      tagIndex,
      laneSeat: 'B3',
    });
    expect(counterPick.reasons.some((r) => String(r).includes('counter') || String(r).includes('dive'))).toBe(true);
  });

  it('anti-tank tags counter tanks', () => {
    const anti = scoreDraftCandidate({
      brawlerId: 6, // Colette
      fit: 50,
      modeId: 'hotZone',
      ourPickIds: [],
      enemyPickIds: [3],
      tagIndex,
      laneSeat: 'B3',
    });
    expect(anti.reasons.some((r) => String(r).includes('counter'))).toBe(true);
  });

  it('maps elo to account power', () => {
    expect(eloToAccountPower(400)).toBeLessThan(eloToAccountPower(1000));
    expect(eloToAccountPower(null)).toBe(0.5);
  });

  it('creates empty draft state shape', () => {
    const st = createEmptyDraftState();
    expect(st.bans).toEqual([]);
    expect(st.ourPicks).toEqual([]);
    expect(st.enemyPicks).toEqual([]);
    expect(st.gameMode).toBe('');
    expect(st.mapName).toBe('');
  });
});
