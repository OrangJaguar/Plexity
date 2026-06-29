import { getCatalogCollege, resolveCollegeName } from '@/lib/tools/college/college-catalog';
import { countWords } from '@/lib/tools/college/college-model';

const MONTH_ORDER = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

function parseDeadlineLabel(label, year) {
  if (!label || label === 'Rolling') return null;
  const parts = label.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const month = MONTH_ORDER[parts[0]];
  const day = parseInt(parts[1], 10);
  if (month == null || Number.isNaN(day)) return null;
  return new Date(year, month, day);
}

export function getCollegeDeadline(myCollege, round) {
  const cat = getCatalogCollege(myCollege.catalogId);
  if (!cat) return null;
  const year = new Date().getFullYear();
  const map = {
    ed: cat.edDeadline,
    ea: cat.eaDeadline,
    rea: cat.eaDeadline,
    rd: cat.rdDeadline,
    rolling: cat.rdDeadline === 'Rolling' ? 'Rolling' : cat.rdDeadline,
  };
  const label = map[myCollege.applicationRound] || map.rd;
  if (!label) return null;
  if (label === 'Rolling') return { label: 'Rolling', date: null };
  const date = parseDeadlineLabel(label, year);
  if (date && date < new Date()) {
    return { label, date: parseDeadlineLabel(label, year + 1) };
  }
  return { label, date };
}

export function computeBestScores(testing) {
  const satAttempts = testing?.satAttempts || [];
  const actAttempts = testing?.actAttempts || [];

  let bestSat = null;
  let bestAct = null;
  let bestSatSections = { erw: null, math: null };

  for (const a of satAttempts) {
    const total = Number(a.total) || (Number(a.erw) + Number(a.math)) || null;
    if (total && (!bestSat || total > bestSat)) bestSat = total;
    const erw = Number(a.erw);
    const math = Number(a.math);
    if (erw && (!bestSatSections.erw || erw > bestSatSections.erw)) bestSatSections.erw = erw;
    if (math && (!bestSatSections.math || math > bestSatSections.math)) bestSatSections.math = math;
  }

  for (const a of actAttempts) {
    const comp = Number(a.composite);
    if (comp && (!bestAct || comp > bestAct)) bestAct = comp;
  }

  const superscoreSat = bestSatSections.erw && bestSatSections.math
    ? bestSatSections.erw + bestSatSections.math
    : bestSat;

  return { bestSat, bestAct, superscoreSat };
}

export function computeCollegeOverview(doc) {
  const myColleges = doc.myColleges || [];
  const supplementals = doc.supplementals || [];
  const mainEssays = doc.mainEssays || [];
  const recommenders = doc.recommenders || [];
  const checklist = doc.applicationChecklist || [];

  const classificationCounts = { reach: 0, target: 0, safety: 0, financial_safety: 0, unclassified: 0 };
  for (const c of myColleges) {
    const key = c.classification || 'unclassified';
    classificationCounts[key] = (classificationCounts[key] || 0) + 1;
  }

  const applicationsStarted = myColleges.filter((c) =>
    c.applicationStatus !== 'not_started').length;

  const essaysDrafted = mainEssays.filter((e) =>
    (e.content || '').trim().length > 50).length
    + supplementals.filter((s) => (s.draftText || '').trim().length > 30).length;

  const supplementalsRemaining = supplementals.filter((s) =>
    s.status !== 'final').length;

  const recsPending = recommenders.filter((r) =>
    r.status !== 'submitted' && r.status !== 'declined').length;

  const deadlines = myColleges
    .map((c) => getCollegeDeadline(c))
    .filter((d) => d?.date)
    .sort((a, b) => a.date - b.date);

  const checklistOpen = checklist.filter((i) => !i.status || i.status === 'need_ask' || i.status === 'need_find').length;

  const nextActions = [];
  if (!myColleges.length) nextActions.push({ text: 'Add schools to your college list', section: 'colleges' });
  if (!doc.academics?.schoolName) nextActions.push({ text: 'Fill in your academic summary', section: 'academics' });
  if (!(doc.testing?.satAttempts?.length || doc.testing?.actAttempts?.length)) {
    nextActions.push({ text: 'Add your test scores', section: 'testing' });
  }
  if ((doc.activities || []).length < 3) nextActions.push({ text: 'Build your activities list', section: 'activities' });
  if (!(doc.mainEssays?.[0]?.content || '').trim()) {
    nextActions.push({ text: 'Start your personal statement', section: 'writing' });
  }
  if (checklistOpen > 4) nextActions.push({ text: 'Review application info checklist', section: 'application-info' });

  return {
    totalColleges: myColleges.length,
    classificationCounts,
    applicationsStarted,
    essaysDrafted,
    supplementalsRemaining,
    earliestDeadline: deadlines[0] || null,
    upcomingDeadlines: deadlines.slice(0, 5),
    recsPending,
    checklistOpen,
    nextActions: nextActions.slice(0, 4),
  };
}

export function getCollegeSupplementals(doc, collegeId) {
  return (doc.supplementals || []).filter((s) => s.collegeId === collegeId);
}

export function essayTypeLabel(type) {
  const map = {
    why_us: 'Why us',
    why_major: 'Why major',
    community: 'Community',
    identity: 'Identity',
    intellectual: 'Intellectual curiosity',
    extracurricular: 'Extracurricular',
    short_answer: 'Short answer',
    other: 'Other',
    personal_statement: 'Personal statement',
    additional_info: 'Additional information',
  };
  return map[type] || type;
}

export function statusLabel(status) {
  return (status || '').replace(/_/g, ' ');
}

export function wordCountText(text) {
  return countWords(text);
}
