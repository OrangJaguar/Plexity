import { describe, expect, it } from 'vitest';
import {
  buildRankedPickTimeline,
  nextPickStep,
  orderSeatsByPartyLeaderAndElo,
} from '@/lib/tools/brawl/draft-sequence';

const seats = [
  { userId: 'cap', nickname: 'Captain', rankedElo: 900, slot: 0 },
  { userId: 'low', nickname: 'Low', rankedElo: 400, slot: 1 },
  { userId: 'hi', nickname: 'High', rankedElo: 700, slot: 2 },
];

describe('party leader + elo order', () => {
  it('puts captain last; lower elo before higher among others', () => {
    const ordered = orderSeatsByPartyLeaderAndElo(seats, 'cap');
    expect(ordered.map((s) => s.userId)).toEqual(['low', 'hi', 'cap']);
    expect(ordered.map((s) => s.slot)).toEqual([0, 1, 2]);
  });

  it('timeline still A1..B3 when we won', () => {
    const t = buildRankedPickTimeline('us', orderSeatsByPartyLeaderAndElo(seats, 'cap'));
    expect(t[0].laneSeat).toBe('A1');
    expect(t[0].nickname).toBe('Low');
    expect(t[4].laneSeat).toBe('A3');
    expect(t[4].nickname).toBe('Captain');
    expect(nextPickStep(t, 0, 0)?.laneSeat).toBe('A1');
  });
});
