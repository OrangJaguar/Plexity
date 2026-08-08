import { describe, expect, it } from 'vitest';
import {
  applyReadySwap,
  isDraftFullyPicked,
  proposeReadySwaps,
  readySwapFullyConfirmed,
} from '@/lib/tools/brawl/ready-swaps';

describe('ready swaps', () => {
  it('detects full draft', () => {
    expect(isDraftFullyPicked([{ brawlerId: 1 }, { brawlerId: 2 }, { brawlerId: 3 }], [{ brawlerId: 4 }, { brawlerId: 5 }, { brawlerId: 6 }])).toBe(true);
    expect(isDraftFullyPicked([{ brawlerId: 1 }], [{ brawlerId: 2 }])).toBe(false);
  });

  it('proposes only when both own both at P11', () => {
    const picks = [
      { brawlerId: 1, playerUserId: 'u1', nickname: 'A', slot: 0 },
      { brawlerId: 2, playerUserId: 'u2', nickname: 'B', slot: 1 },
      { brawlerId: 3, playerUserId: 'u3', nickname: 'C', slot: 2 },
    ];
    const p11 = new Map([
      ['u1', new Set([1, 2])],
      ['u2', new Set([1, 2])],
      ['u3', new Set([3])],
    ]);
    const props = proposeReadySwaps(picks, p11);
    expect(props).toHaveLength(1);
    expect(props[0].label).toContain('A');
    expect(props[0].label).toContain('B');
  });

  it('never swaps placeholder solo seats', () => {
    const picks = [
      { brawlerId: 1, playerUserId: 'real', nickname: 'You', slot: 0 },
      { brawlerId: 2, playerUserId: 'real-s2', nickname: 'Seat 2', slot: 1 },
      { brawlerId: 3, playerUserId: 'real-s3', nickname: 'Seat 3', slot: 2 },
    ];
    const p11 = new Map([
      ['real', new Set([1, 2, 3])],
      ['real-s2', new Set([1, 2, 3])],
      ['real-s3', new Set([1, 2, 3])],
    ]);
    expect(proposeReadySwaps(picks, p11)).toHaveLength(0);
  });

  it('applies swap of brawler ids between seats', () => {
    const next = applyReadySwap(
      [
        { brawlerId: 1, playerUserId: 'u1', nickname: 'A' },
        { brawlerId: 2, playerUserId: 'u2', nickname: 'B' },
      ],
      0,
      1,
    );
    expect(next[0].brawlerId).toBe(2);
    expect(next[0].playerUserId).toBe('u1');
    expect(next[1].brawlerId).toBe(1);
  });

  it('requires dual confirm', () => {
    expect(readySwapFullyConfirmed({
      fromUserId: 'u1',
      toUserId: 'u2',
      confirms: { u1: true },
    })).toBe(false);
    expect(readySwapFullyConfirmed({
      fromUserId: 'u1',
      toUserId: 'u2',
      confirms: { u1: true, u2: true },
    })).toBe(true);
  });
});
