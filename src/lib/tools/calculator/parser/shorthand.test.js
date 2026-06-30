import { describe, expect, it } from 'vitest';
import {
  expandOnSpace,
  expandTemplate,
  getAutocompleteSuggestions,
} from '@/lib/tools/calculator/parser/shorthand';

describe('calculator shorthand', () => {
  it('expands int on space', () => {
    expect(expandOnSpace('int')).toBe('∫_{0}^{1} x^2 dx');
    expect(expandOnSpace('integral')).toBe('∫_{0}^{1} x^2 dx');
  });

  it('adds parentheses for trig on space', () => {
    expect(expandOnSpace('cos')).toBe('cos(');
    expect(expandOnSpace('sin')).toBe('sin(');
  });

  it('suggests integral while typing', () => {
    const items = getAutocompleteSuggestions('integral');
    expect(items.some((i) => i.label === 'integral')).toBe(true);
  });

  it('suggests int prefix', () => {
    const items = getAutocompleteSuggestions('int');
    expect(items.some((i) => i.kind === 'template' || i.label.includes('int'))).toBe(true);
  });

  it('expandTemplate handles derivative and limit', () => {
    expect(expandTemplate('der')).toBe('d/dx( )');
    expect(expandTemplate('lim')).toBe('lim_{x→0}( )');
  });
});
