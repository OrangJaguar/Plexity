/** Letter grade → CSS modifier class (A+ green → F red). */
export function letterGradeClass(letter) {
  if (!letter || letter === '—') return 'tools-grade-letter--na';
  const key = letter.replace('+', 'p').replace('-', 'm').toLowerCase();
  return `tools-grade-letter--${key}`;
}
