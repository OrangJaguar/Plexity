import { suggestPeriodId } from '@/lib/tools/grade-periods';

const NOISE_LINE = /^(section list|switch course|dropdown|for pointscategory|no comment|comment:|test-quiz)$/i;
const HEADER_INLINE_RE = /^(.+?)\s*Grading Period\s*\((\d+)%\)/i;
const HEADER_NAME_RE = /^(.+?)\s*Grading Period\s*$/i;
const WEIGHT_LINE_RE = /^\((\d+)%\)/;
const DUE_RE = /^Due\s*(.+)$/i;
const SCORE_LINE_RE = /^(\d+|—|-)\s*\/\s*(\d+)$/i;
const EARNED_ONLY_RE = /^(\d+|—|-)$/;
const SLASH_TOTAL_RE = /^\/\s*(\d+)$/;
const TOTAL_POINTS_RE = /Total Points:\s*(\d+)\s*\/\s*(\d+)/i;

function cleanTitle(raw) {
  return (raw || '')
    .replace(/test-quiz$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isNoiseLine(line) {
  if (!line) return true;
  if (NOISE_LINE.test(line)) return true;
  if (/^switch to another course/i.test(line)) return true;
  return false;
}

function parseScoreLines(lines, startIdx) {
  let i = startIdx;
  const line = lines[i];
  if (!line) return { earned: null, possible: null, nextIdx: i + 1 };

  const single = line.match(SCORE_LINE_RE);
  if (single) {
    const earned = single[1] === '—' || single[1] === '-' ? null : Number(single[1]);
    return { earned, possible: Number(single[2]), nextIdx: i + 1 };
  }

  const earnedMatch = line.match(EARNED_ONLY_RE);
  if (earnedMatch) {
    const earned = earnedMatch[1] === '—' || earnedMatch[1] === '-' ? null : Number(earnedMatch[1]);
    const next = lines[i + 1];
    const slash = next?.match(SLASH_TOTAL_RE);
    if (slash) {
      return { earned, possible: Number(slash[1]), nextIdx: i + 2 };
    }
    return { earned, possible: null, nextIdx: i + 1 };
  }

  return { earned: null, possible: null, nextIdx: i + 1 };
}

function parseSectionBody(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const assignments = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (isNoiseLine(line) || HEADER_INLINE_RE.test(line) || HEADER_NAME_RE.test(line)) {
      i += 1;
      continue;
    }
    if (WEIGHT_LINE_RE.test(line)) {
      i += 1;
      continue;
    }
    if (DUE_RE.test(line)) {
      i += 1;
      continue;
    }

    const title = line;
    let due = '';
    i += 1;

    if (i < lines.length && DUE_RE.test(lines[i])) {
      due = lines[i].replace(DUE_RE, '$1').trim();
      i += 1;
    }

    const { earned, possible, nextIdx } = parseScoreLines(lines, i);
    i = nextIdx;

    while (i < lines.length && (isNoiseLine(lines[i]) || lines[i] === 'Comment:')) {
      i += 1;
    }

    if (!title || possible == null) continue;

    assignments.push({
      assignmentId: crypto.randomUUID(),
      title: cleanTitle(title),
      category: /test-quiz/i.test(line) ? 'test-quiz' : undefined,
      due,
      pointsEarned: earned,
      pointsPossible: possible,
      importedAt: Date.now(),
    });
  }

  return assignments;
}

function splitSections(raw) {
  const sections = [];
  const lines = raw.split('\n').map((l) => l.trim());
  let current = null;
  let body = [];

  const pushSection = () => {
    if (!current) return;
    sections.push({ ...current, body: body.join('\n') });
    body = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) continue;

    const inline = line.match(HEADER_INLINE_RE);
    if (inline) {
      pushSection();
      current = {
        name: inline[1].trim(),
        weight: Number(inline[2]) / 100,
        periodId: suggestPeriodId(inline[1]),
      };
      continue;
    }

    const nameOnly = line.match(HEADER_NAME_RE);
    if (nameOnly) {
      const next = lines[i + 1] || '';
      const weightLine = next.match(WEIGHT_LINE_RE);
      pushSection();
      current = {
        name: nameOnly[1].trim(),
        weight: weightLine ? Number(weightLine[1]) / 100 : null,
        periodId: suggestPeriodId(nameOnly[1]),
      };
      if (weightLine) i += 1;
      continue;
    }

    if (current) {
      body.push(line);
    }
  }
  pushSection();
  return sections;
}

export function parseLmsGradePaste(raw, options = {}) {
  const text = (raw || '').trim();
  if (!text) {
    return { assignments: [], sections: [], totalPoints: null, hint: 'Paste your grade export text.' };
  }

  const sections = splitSections(text).map((s) => ({
    ...s,
    assignments: parseSectionBody(s.body),
  }));

  const totalMatch = text.match(TOTAL_POINTS_RE);
  const totalPoints = totalMatch
    ? { earned: Number(totalMatch[1]), possible: Number(totalMatch[2]) }
    : null;

  const { courseName, periodId } = options;
  let chosen = null;

  if (courseName) {
    chosen = sections.find((s) => s.name.toLowerCase().includes(courseName.toLowerCase()));
  }
  if (!chosen && periodId) {
    chosen = sections.find((s) => s.periodId === periodId);
  }
  if (!chosen) {
    chosen = [...sections].sort((a, b) => b.assignments.length - a.assignments.length)[0];
  }

  const hint = chosen && sections.length > 1
    ? `Parsed from “${chosen.name}” section (${chosen.assignments.length} assignments).`
    : null;

  return {
    assignments: chosen?.assignments ?? [],
    sections,
    chosenSection: chosen,
    totalPoints,
    hint,
    detectedWeight: chosen?.weight ?? null,
  };
}
