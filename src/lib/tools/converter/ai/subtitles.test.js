import { describe, expect, it } from 'vitest';
import { cuesToSrt, cuesToVtt, normalizeTranscriptCues } from '@/lib/tools/converter/ai/subtitles.js';
import { draftTranslatedSubtitles, translateSubtitles } from '@/lib/tools/converter/ai/subtitle-translate.js';

describe('subtitles', () => {
  const cues = [
    { start: 0, end: 1.5, text: 'Hello' },
    { start: 1.5, end: 3, text: 'World' },
  ];

  it('builds SRT with stable timestamps', () => {
    const srt = cuesToSrt(cues);
    expect(srt).toContain('00:00:00,000 --> 00:00:01,500');
    expect(srt).toContain('Hello');
  });

  it('builds VTT with header', () => {
    const vtt = cuesToVtt(cues);
    expect(vtt.startsWith('WEBVTT')).toBe(true);
    expect(vtt).toContain('00:00:00.000 --> 00:00:01.500');
  });

  it('preserves cue timing on translation', () => {
    const result = translateSubtitles(cues, (t) => `X:${t}`, 'vtt');
    expect(result.sourceCues).toEqual(cues);
    expect(result.translatedCues[0].start).toBe(0);
    expect(result.translatedCues[0].text).toBe('X:Hello');
    expect(result.content).toContain('X:Hello');
  });

  it('draftTranslatedSubtitles does not mutate source', () => {
    const original = normalizeTranscriptCues(cues);
    const draft = draftTranslatedSubtitles(original, 'es', 'srt');
    expect(original[0].text).toBe('Hello');
    expect(draft.translatedCues[0].text).toMatch(/^\[es\]/);
  });
});
