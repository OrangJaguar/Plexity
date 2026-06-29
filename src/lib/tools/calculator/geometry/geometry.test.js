import { describe, expect, it } from 'vitest';
import { lineIntersection, midpoint, distance } from '@/lib/tools/calculator/geometry/constraints';

describe('geometry', () => {
  it('computes midpoint', () => {
    expect(midpoint({ x: 0, y: 0 }, { x: 4, y: 4 })).toEqual({ x: 2, y: 2 });
  });

  it('computes distance', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it('finds line intersection', () => {
    const pt = lineIntersection({ x: 0, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }, { x: 2, y: 0 });
    expect(pt).not.toBeNull();
    expect(pt.x).toBeCloseTo(1);
    expect(pt.y).toBeCloseTo(1);
  });
});
