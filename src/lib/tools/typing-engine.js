import { pickTypingWords } from '@/lib/tools/typing-words';

export const TIME_COUNTS = [15, 30, 60, 120];
export const WORD_COUNTS = [10, 25, 50, 100];

const CHARS_PER_WORD = 5;

export function generatePrompt({ mode, count, punctuation, numbers }) {
  const wordTotal = mode === 'words' ? count : Math.min(180, Math.max(80, count * 4));
  const words = pickTypingWords(wordTotal, { punctuation, numbers });
  return `${words.join(' ')} `;
}

export function countPromptWords(prompt) {
  const trimmed = (prompt || '').trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function getWordSpans(prompt) {
  const spans = [];
  let i = 0;
  while (i < prompt.length) {
    if (prompt[i] === ' ') {
      spans.push({ text: ' ', start: i, end: i + 1, isSpace: true });
      i += 1;
    } else {
      const start = i;
      while (i < prompt.length && prompt[i] !== ' ') i += 1;
      spans.push({ text: prompt.slice(start, i), start, end: i, isSpace: false });
    }
  }
  return spans;
}

export function getCurrentWordIndex(spans, cursorIndex) {
  for (let i = 0; i < spans.length; i += 1) {
    const span = spans[i];
    if (cursorIndex >= span.start && cursorIndex < span.end) {
      if (span.isSpace) {
        for (let j = i + 1; j < spans.length; j += 1) {
          if (!spans[j].isSpace) return j;
        }
        return -1;
      }
      return i;
    }
  }
  return spans.findIndex((s) => !s.isSpace && s.start >= cursorIndex);
}

export function countCompletedWords(prompt, typed) {
  let completed = 0;
  let i = 0;
  while (i < prompt.length) {
    while (i < prompt.length && prompt[i] === ' ') i += 1;
    if (i >= prompt.length) break;
    const start = i;
    while (i < prompt.length && prompt[i] !== ' ') i += 1;
    const word = prompt.slice(start, i);
    const typedWord = typed.slice(start, i);
    if (typedWord === word && (i >= typed.length || typed[i] === ' ')) {
      completed += 1;
    } else {
      break;
    }
    if (i < prompt.length && typed[i] === ' ') i += 1;
  }
  return completed;
}

export function analyzeCharacters(typed, target) {
  let correct = 0;
  let incorrect = 0;
  const compareLen = Math.min(typed.length, target.length);

  for (let i = 0; i < compareLen; i += 1) {
    if (typed[i] === target[i]) correct += 1;
    else incorrect += 1;
  }

  const extra = typed.length > target.length ? typed.length - target.length : 0;
  const missed = target.length > typed.length ? target.length - typed.length : 0;

  return { correct, incorrect, extra, missed };
}

export function calcWpm(correctChars, elapsedMs) {
  if (!elapsedMs || elapsedMs <= 0) return 0;
  const minutes = elapsedMs / 60000;
  return Math.round((correctChars / CHARS_PER_WORD) / minutes);
}

export function calcRawWpm(totalChars, elapsedMs) {
  if (!elapsedMs || elapsedMs <= 0) return 0;
  const minutes = elapsedMs / 60000;
  return Math.round((totalChars / CHARS_PER_WORD) / minutes);
}

export function getWordModeEndIndex(prompt, wordCount) {
  let found = 0;
  let i = 0;
  while (i < prompt.length && found < wordCount) {
    while (i < prompt.length && prompt[i] === ' ') i += 1;
    if (i >= prompt.length) break;
    while (i < prompt.length && prompt[i] !== ' ') i += 1;
    found += 1;
  }
  return i;
}

export function buildTimeSeries(samples) {
  if (!samples.length) return [];
  const bySecond = new Map();

  for (const sample of samples) {
    const sec = Math.max(1, Math.ceil(sample.elapsedMs / 1000));
    bySecond.set(sec, sample);
  }

  const maxSec = Math.max(...bySecond.keys());
  const series = [];
  let prevCumulativeErrors = 0;

  for (let s = 1; s <= maxSec; s += 1) {
    const hit = bySecond.get(s);
    if (hit) {
      const errorsThisSecond = Math.max(0, hit.errors - prevCumulativeErrors);
      prevCumulativeErrors = hit.errors;
      series.push({
        second: s,
        netWpm: hit.netWpm,
        rawWpm: hit.rawWpm,
        errors: errorsThisSecond,
      });
    } else {
      const prev = series[series.length - 1];
      series.push({
        second: s,
        netWpm: prev?.netWpm ?? 0,
        rawWpm: prev?.rawWpm ?? 0,
        errors: 0,
      });
    }
  }

  return series;
}

export function calcPeakWpm(series, windowSize = 2) {
  if (!series.length) return 0;
  let peak = 0;
  for (let i = 0; i < series.length; i += 1) {
    const slice = series.slice(Math.max(0, i - windowSize + 1), i + 1);
    const avg = slice.reduce((sum, p) => sum + p.netWpm, 0) / slice.length;
    peak = Math.max(peak, Math.round(avg));
  }
  return peak;
}

export function calcConsistency(series) {
  const values = series.map((p) => p.netWpm).filter((v) => v > 0);
  if (values.length < 2) return 100;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  const cv = (Math.sqrt(variance) / mean) * 100;
  return Math.max(0, Math.min(100, Math.round(100 - cv)));
}

export function compileResults({
  typed,
  target,
  elapsedMs,
  samples,
  mode,
  count,
}) {
  const chars = analyzeCharacters(typed, target);
  const totalTyped = typed.length;
  const accuracy = totalTyped > 0
    ? Math.round((chars.correct / totalTyped) * 100)
    : 100;

  const wpm = calcWpm(chars.correct, elapsedMs);
  const rawWpm = calcRawWpm(totalTyped, elapsedMs);
  const series = buildTimeSeries(samples);
  const peakWpm = calcPeakWpm(series);
  const consistency = calcConsistency(series);

  return {
    wpm,
    rawWpm,
    accuracy,
    peakWpm,
    consistency,
    chars,
    elapsedMs,
    series,
    mode,
    count,
    completedWords: countCompletedWords(target, typed),
  };
}

export function createSample(elapsedMs, typed, target) {
  const chars = analyzeCharacters(typed, target);
  return {
    elapsedMs,
    netWpm: calcWpm(chars.correct, elapsedMs),
    rawWpm: calcRawWpm(typed.length, elapsedMs),
    errors: chars.incorrect + chars.extra,
  };
}

export function isTestComplete({
  mode,
  count,
  elapsedMs,
  typed,
  target,
}) {
  if (mode === 'time') {
    return elapsedMs >= count * 1000;
  }
  return typed.length >= getWordModeEndIndex(target, count);
}
