import { describe, expect, it } from 'vitest';
import {
  analyzeCharacters,
  calcWpm,
  countCompletedWords,
  countPromptWords,
  generatePrompt,
  getWordModeEndIndex,
  isTestComplete,
} from '@/lib/tools/typing-engine';

describe('typing-engine', () => {
  it('generates exact word count in words mode', () => {
    for (const n of [10, 25, 50, 100]) {
      const prompt = generatePrompt({ mode: 'words', count: n, punctuation: false, numbers: false });
      expect(countPromptWords(prompt)).toBe(n);
    }
  });

  it('counts character stats', () => {
    const stats = analyzeCharacters('helxo', 'hello');
    expect(stats.correct).toBe(4);
    expect(stats.incorrect).toBe(1);
  });

  it('calculates wpm from correct characters', () => {
    expect(calcWpm(50, 60000)).toBe(10);
  });

  it('detects completed words', () => {
    const target = 'one two three ';
    expect(countCompletedWords(target, 'one ')).toBe(1);
    expect(countCompletedWords(target, 'one two ')).toBe(2);
  });

  it('ends word mode after typing through the last target word', () => {
    const target = 'one two ';
    expect(getWordModeEndIndex(target, 2)).toBe(7);
    expect(isTestComplete({
      mode: 'words',
      count: 2,
      elapsedMs: 1000,
      typed: 'one two',
      target,
    })).toBe(true);
    expect(isTestComplete({
      mode: 'words',
      count: 2,
      elapsedMs: 1000,
      typed: 'one twx',
      target,
    })).toBe(true);
    expect(isTestComplete({
      mode: 'words',
      count: 2,
      elapsedMs: 1000,
      typed: 'one t',
      target,
    })).toBe(false);
  });
});
