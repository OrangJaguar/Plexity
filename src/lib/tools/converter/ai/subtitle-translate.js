/**
 * Subtitle translation helpers — produce new VTT/SRT without mutating source cues.
 */

import { cuesToSrt, cuesToVtt, mapCueTexts, normalizeTranscriptCues } from './subtitles.js';

/**
 * @param {unknown} sourceCues
 * @param {(text: string) => string} translateFn
 * @param {'srt' | 'vtt'} [format]
 */
export function translateSubtitles(sourceCues, translateFn, format = 'vtt') {
  const source = normalizeTranscriptCues(sourceCues);
  const translated = mapCueTexts(source, translateFn);
  return {
    sourceCues: source,
    translatedCues: translated,
    content: format === 'srt' ? cuesToSrt(translated) : cuesToVtt(translated),
    format,
  };
}

/**
 * Apply a language tag prefix for offline/mock translation drafts.
 * @param {unknown} sourceCues
 * @param {string} language
 * @param {'srt' | 'vtt'} [format]
 */
export function draftTranslatedSubtitles(sourceCues, language = 'en', format = 'vtt') {
  const lang = String(language || 'en').slice(0, 8);
  return translateSubtitles(
    sourceCues,
    (text) => `[${lang}] ${text}`,
    format,
  );
}
