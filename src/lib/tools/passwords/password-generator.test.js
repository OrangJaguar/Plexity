import { describe, expect, it } from 'vitest';
import { buildPasswordCharsets } from '@/lib/tools/passwords/password-charset';
import { generatePassphrase, generatePassword } from '@/lib/tools/passwords/password-generator';

describe('password-generator', () => {
  it('builds charset pools with expected lengths', () => {
    const sets = buildPasswordCharsets();
    expect(sets.lower).toHaveLength(26);
    expect(sets.upper).toHaveLength(26);
    expect(sets.digits).toHaveLength(10);
    expect(sets.symbols.length).toBeGreaterThan(10);
  });

  it('generates passwords at requested length', () => {
    const pwd = generatePassword({ length: 24, lower: true, upper: true, digits: true, symbols: false });
    expect(pwd).toHaveLength(24);
  });

  it('generates passphrases with separator and numeric tail', () => {
    const phrase = generatePassphrase({ words: 4, separator: '-' });
    const parts = phrase.split('-');
    expect(parts.length).toBeGreaterThanOrEqual(5);
    expect(parts[parts.length - 1]).toMatch(/^\d{2}$/);
  });
});
