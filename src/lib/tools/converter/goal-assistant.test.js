import { describe, expect, it } from 'vitest';
import {
  listAssistantDestinations,
  mapDestinationToPlan,
} from '@/lib/tools/converter/goal-assistant.js';
import { normalizeSourceAnalysis } from '@/lib/tools/converter/source-analysis.js';

describe('goal-assistant', () => {
  const source = normalizeSourceAnalysis({
    adapterAnalysis: { format: 'png', category: 'image', width: 400, height: 300 },
  });

  it('lists preset and profile destinations', () => {
    const destinations = listAssistantDestinations();
    expect(destinations.some((d) => d.id === 'preset:make-smaller')).toBe(true);
    expect(destinations.some((d) => d.id === 'profile:browser')).toBe(true);
  });

  it('maps preset destination to plan', () => {
    const result = mapDestinationToPlan('preset:make-smaller', source);
    expect(result?.plan.goalId).toBe('make-smaller');
    expect(result?.explanation).toContain('Make smaller');
  });

  it('maps profile destination to plan', () => {
    const result = mapDestinationToPlan('profile:website', source);
    expect(result?.plan.compatibilityProfile).toBe('website');
    expect(result?.explanation).toContain('Website');
  });

  it('returns null for invalid destination ids', () => {
    expect(mapDestinationToPlan('invalid', source)).toBeNull();
    expect(mapDestinationToPlan('preset:extract-audio', source)).toBeNull();
  });
});
