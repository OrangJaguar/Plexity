const CHARSETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{}:,.?',
};

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

  const chars = [];
  required.forEach((set) => {
    chars.push(set[Math.floor(Math.random() * set.length)]);
  });
  while (chars.length < length) {
    chars.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

const WORDS = [
  'river', 'forest', 'silver', 'planet', 'crystal', 'harbor', 'meadow', 'signal',
  'anchor', 'compass', 'orbit', 'summit', 'violet', 'granite', 'ember', 'lunar',
];

export function generatePassphrase({ words = 4, separator = '-' } = {}) {
  const picked = [];
  for (let i = 0; i < words; i += 1) {
    picked.push(WORDS[Math.floor(Math.random() * WORDS.length)]);
  }
  const tail = Math.floor(10 + Math.random() * 89);
  return `${picked.join(separator)}${separator}${tail}`;
}
