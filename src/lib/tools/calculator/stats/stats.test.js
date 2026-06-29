import { describe, expect, it } from 'vitest';
import { mean, stdev, normalCdf, linearRegression, parseCsvColumn } from '@/lib/tools/calculator/stats/stats-engine';

describe('stats-engine', () => {
  it('computes mean and stdev', () => {
    const data = [2, 4, 4, 4, 5, 5, 7, 9];
    expect(mean(data)).toBe(5);
    expect(stdev(data)).toBeCloseTo(2, 0);
  });

  it('normal CDF at mean is 0.5', () => {
    expect(normalCdf(0, 0, 1)).toBeCloseTo(0.5, 2);
  });

  it('linear regression', () => {
    const r = linearRegression([0, 1, 2], [0, 2, 4]);
    expect(r.slope).toBeCloseTo(2);
    expect(r.intercept).toBeCloseTo(0);
    expect(r.r2).toBeCloseTo(1);
  });

  it('parses CSV column', () => {
    expect(parseCsvColumn('1\n2\n3')).toEqual([1, 2, 3]);
  });
});
