import { describe, expect, it } from 'vitest';
import {
  convertUnits,
  finalizeAmount,
  normalizeAmountInput,
} from '@/lib/tools/unit-convert';

describe('normalizeAmountInput', () => {
  it('defaults empty to zero', () => {
    expect(normalizeAmountInput('')).toBe('0');
    expect(normalizeAmountInput(null)).toBe('0');
  });

  it('replaces leading zero when typing digits', () => {
    expect(normalizeAmountInput('05')).toBe('5');
    expect(normalizeAmountInput('07')).toBe('7');
    expect(normalizeAmountInput('0.5')).toBe('0.5');
    expect(normalizeAmountInput('0.')).toBe('0.');
  });
});

describe('finalizeAmount', () => {
  it('trims dangling decimal', () => {
    expect(finalizeAmount('0.')).toBe('0');
    expect(finalizeAmount('12.')).toBe('12');
  });
});

describe('convertUnits', () => {
  it('converts linear length units', () => {
    expect(convertUnits(1, 'km', 'm', 'length')).toBe(1000);
    expect(convertUnits(1, 'mi', 'ft', 'length')).toBeCloseTo(5280, 0);
  });

  it('converts currency via USD as base', () => {
    expect(convertUnits(1, 'USD', 'INR', 'currency')).toBeCloseTo(94.55, 2);
    expect(convertUnits(94.55, 'INR', 'USD', 'currency')).toBeCloseTo(1, 4);
    expect(convertUnits(1, 'INR', 'USD', 'currency')).toBeCloseTo(1 / 94.55, 4);
    expect(convertUnits(1, 'EUR', 'USD', 'currency')).toBeCloseTo(1 / 0.8754, 4);
  });

  it('converts temperature', () => {
    expect(convertUnits(32, 'F', 'C', 'temperature')).toBeCloseTo(0, 4);
    expect(convertUnits(100, 'C', 'F', 'temperature')).toBeCloseTo(212, 4);
  });
});
