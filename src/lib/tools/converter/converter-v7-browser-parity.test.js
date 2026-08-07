/**
 * Plan 7 browser capability parity — public has no AI gates; admin exposes them independently.
 */
import { describe, expect, it } from 'vitest';
import {
  resolveToolCapabilities,
  CONVERTER_AI_ASSIST_CAPABILITY,
  CONVERTER_AI_OCR_CAPABILITY,
  CONVERTER_AI_TRANSCRIBE_CAPABILITY,
} from '@/lib/tools/tool-capabilities';

describe('plan 7 browser capability parity', () => {
  it('public surface has no AI capabilities', () => {
    const pub = resolveToolCapabilities('converter', 'public');
    expect(pub[CONVERTER_AI_ASSIST_CAPABILITY]).toBeUndefined();
    expect(pub[CONVERTER_AI_OCR_CAPABILITY]).toBeUndefined();
    expect(pub[CONVERTER_AI_TRANSCRIBE_CAPABILITY]).toBeUndefined();
  });

  it('admin surface hides AI gates while converter server features are off', () => {
    const admin = resolveToolCapabilities('converter', 'admin');
    expect(admin[CONVERTER_AI_ASSIST_CAPABILITY]).toBeUndefined();
    expect(admin[CONVERTER_AI_OCR_CAPABILITY]).toBeUndefined();
    expect(admin[CONVERTER_AI_TRANSCRIBE_CAPABILITY]).toBeUndefined();
  });
});
