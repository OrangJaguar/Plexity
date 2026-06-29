import { buildPasswordCharsets } from '@/lib/tools/passwords/password-charset';
import { securePick, secureRandomIndex, secureShuffle } from '@/lib/tools/passwords/password-random';
import passphraseWords from '@/lib/tools/passwords/passphrase-words.json';

const CHARSETS = buildPasswordCharsets();

export function generatePassword({
  length = 20,
  lower = true,
  upper = true,
  digits = true,
  symbols = true,
} = {}) {
  let pool = '';
  const required = [];
  if (lower) { pool += CHARSETS.lower; required.push(CHARSETS.lower); }
  if (upper) { pool += CHARSETS.upper; required.push(CHARSETS.upper); }
  if (digits) { pool += CHARSETS.digits; required.push(CHARSETS.digits); }
  if (symbols) { pool += CHARSETS.symbols; required.push(CHARSETS.symbols); }
  if (!pool) pool = CHARSETS.lower + CHARSETS.upper + CHARSETS.digits;

  const chars = required.map((set) => securePick(set));
  while (chars.length < length) {
    chars.push(securePick(pool));
  }
  return secureShuffle(chars).join('');
}

export function generatePassphrase({ words = 4, separator = '-' } = {}) {
  const list = Array.isArray(passphraseWords) ? passphraseWords : [];
  if (!list.length) {
    throw new Error('Passphrase word list is unavailable');
  }

  const picked = [];
  for (let i = 0; i < words; i += 1) {
    picked.push(list[secureRandomIndex(list.length)]);
  }
  const tail = 10 + secureRandomIndex(90);
  return `${picked.join(separator)}${separator}${tail}`;
}
