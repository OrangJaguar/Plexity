import { describe, expect, it } from 'vitest';
import {
  sanitizeDisplayName,
  sanitizeDisplayNameInput,
  formatTitleMetaLine,
  DISPLAY_NAME_MAX_LENGTH,
} from '@/lib/tools/shared/display-filename.js';

describe('display-filename', () => {
  it('strips invalid characters and caps length', () => {
    expect(sanitizeDisplayName('my<file>:name?.png')).toBe('myfilename.png');
    expect(sanitizeDisplayNameInput('a'.repeat(100)).length).toBe(DISPLAY_NAME_MAX_LENGTH);
  });

  it('formats meta on one line', () => {
    expect(formatTitleMetaLine(['768 × 1024 px', '167 KB'])).toBe('768 × 1024 px · 167 KB');
  });
});
