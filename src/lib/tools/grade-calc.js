const LETTER_SCALE = [
  { letter: 'A+', min: 97 },
  { letter: 'A', min: 93 },
  { letter: 'A-', min: 90 },
  { letter: 'B+', min: 87 },
  { letter: 'B', min: 83 },
  { letter: 'B-', min: 80 },
  { letter: 'C+', min: 77 },
  { letter: 'C', min: 73 },
  { letter: 'C-', min: 70 },
  { letter: 'D+', min: 67 },
  { letter: 'D', min: 63 },
  { letter: 'D-', min: 60 },
  { letter: 'F', min: 0 },
];

export function assignmentPercent(earned, possible) {
  if (earned == null || possible == null || possible <= 0) return null;
  return (earned / possible) * 100;
}

export function periodPoints(assignments = []) {
  let earned = 0;
  let possible = 0;
  for (const a of assignments) {
    if (a.pointsEarned == null || !a.pointsPossible) continue;
    earned += a.pointsEarned;
    possible += a.pointsPossible;
  }
  return { earned, possible };
}

export function periodPercent(assignments = []) {
  const { earned, possible } = periodPoints(assignments);
  if (!possible) return null;
  return (earned / possible) * 100;
}

export function coursePercent(periods = []) {
  const graded = periods.filter((p) => {
    const { possible } = periodPoints(p.assignments || []);
    return possible > 0;
  });
  if (!graded.length) return null;

  const totalWeight = graded.reduce((sum, p) => sum + (p.weight ?? 1), 0);
  if (!totalWeight) return null;

  let weighted = 0;
  for (const p of graded) {
    const pct = periodPercent(p.assignments);
    if (pct == null) continue;
    const w = p.weight ?? 1;
    weighted += pct * w;
  }
  return weighted / totalWeight;
}

export function percentToLetter(pct) {
  if (pct == null || Number.isNaN(pct)) return '—';
  const rounded = Math.round(pct * 10) / 10;
  for (const row of LETTER_SCALE) {
    if (rounded >= row.min) return row.letter;
  }
  return 'F';
}

export function formatPercent(pct) {
  if (pct == null || Number.isNaN(pct)) return '—';
  return `${pct.toFixed(1)}%`;
}

export function formatScore(earned, possible) {
  if (possible == null) return '—';
  if (earned == null) return `— / ${possible}`;
  return `${earned} / ${possible}`;
}
