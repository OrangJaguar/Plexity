export const GOALS_VERSION = 1;

export const SETUP_STEPS = [
  { id: 'northStar', label: 'North Star', hint: 'What kind of life are you trying to build, and why?' },
  { id: 'pillars', label: 'Core pillars', hint: 'The major areas that matter in your plan' },
  { id: 'roadmap', label: 'Roadmap sketch', hint: 'Broad phases and next-few-years milestones' },
  { id: 'season', label: 'Current season', hint: 'What chapter are you in right now?' },
  { id: 'weekly', label: 'First week', hint: 'A handful of priorities for this week' },
];

export const PILLAR_SUGGESTIONS = [
  'Security', 'Career', 'Health', 'Relationships', 'Education', 'Impact', 'Creativity', 'Freedom',
];

export const PRIORITY_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  PARTIAL: 'partial',
  DROPPED: 'dropped',
  NOT_DONE: 'not_done',
};

export const ALIGNMENT_OPTIONS = [
  { id: 'yes', label: 'Mostly aligned' },
  { id: 'partial', label: 'Partly aligned' },
  { id: 'no', label: 'Not really aligned' },
  { id: 'unsure', label: 'Hard to tell' },
];

export function emptyGoalsDocument() {
  return {
    version: GOALS_VERSION,
    setupComplete: false,
    setupStep: 0,
    northStar: {
      text: '',
      uncertain: false,
      updatedAt: null,
    },
    pillars: [],
    roadmap: {
      tenYearPhases: [],
      fewYearsMilestones: [],
    },
    currentSeason: {
      title: '',
      description: '',
      priorityAreas: [],
      startedAt: null,
      updatedAt: null,
    },
    seasonHistory: [],
    weekly: {
      weekKey: '',
      priorities: [],
    },
    checkIns: [],
    updatedAt: Date.now(),
  };
}

export function newPillar(partial = {}) {
  return {
    id: crypto.randomUUID(),
    title: partial.title || '',
    description: partial.description || '',
    dependencyNote: partial.dependencyNote || '',
    uncertain: Boolean(partial.uncertain),
    order: partial.order ?? Date.now(),
  };
}

export function newTenYearPhase(partial = {}) {
  return {
    id: crypto.randomUUID(),
    title: partial.title || '',
    timeframe: partial.timeframe || '',
    mission: partial.mission || '',
    objectives: partial.objectives || [],
    exitCriteria: partial.exitCriteria || [],
    uncertain: Boolean(partial.uncertain),
    order: partial.order ?? Date.now(),
  };
}

export function newFewYearsMilestone(partial = {}) {
  return {
    id: crypto.randomUUID(),
    title: partial.title || '',
    timeframe: partial.timeframe || '',
    description: partial.description || '',
    category: partial.category || '',
    uncertain: Boolean(partial.uncertain),
    order: partial.order ?? Date.now(),
  };
}

export function newWeeklyPriority(partial = {}) {
  return {
    id: crypto.randomUUID(),
    text: partial.text || '',
    source: partial.source || 'manual',
    pillarId: partial.pillarId || null,
    seasonArea: partial.seasonArea || '',
    status: partial.status || PRIORITY_STATUS.ACTIVE,
    order: partial.order ?? Date.now(),
  };
}

export function newCheckIn(weekKey, partial = {}) {
  return {
    id: crypto.randomUUID(),
    weekKey,
    completedAt: partial.completedAt ?? Date.now(),
    prioritiesReview: partial.prioritiesReview || [],
    reflection: {
      movedForward: partial.reflection?.movedForward || '',
      slipped: partial.reflection?.slipped || '',
      blockers: partial.reflection?.blockers || '',
      nextWeekFocus: partial.reflection?.nextWeekFocus || '',
      alignedWithSeason: partial.reflection?.alignedWithSeason || '',
      alignmentNote: partial.reflection?.alignmentNote || '',
    },
    aiReview: partial.aiReview || null,
  };
}

export function normalizeGoalsDocument(data) {
  const base = emptyGoalsDocument();
  if (!data || typeof data !== 'object') return base;

  return {
    version: GOALS_VERSION,
    setupComplete: Boolean(data.setupComplete),
    setupStep: typeof data.setupStep === 'number' ? data.setupStep : 0,
    northStar: {
      ...base.northStar,
      ...(data.northStar || {}),
      text: data.northStar?.text || '',
      uncertain: Boolean(data.northStar?.uncertain),
    },
    pillars: Array.isArray(data.pillars)
      ? data.pillars.map(normalizePillar).sort((a, b) => a.order - b.order)
      : [],
    roadmap: {
      tenYearPhases: Array.isArray(data.roadmap?.tenYearPhases)
        ? data.roadmap.tenYearPhases.map(normalizePhase).sort((a, b) => a.order - b.order)
        : [],
      fewYearsMilestones: Array.isArray(data.roadmap?.fewYearsMilestones)
        ? data.roadmap.fewYearsMilestones.map(normalizeMilestone).sort((a, b) => a.order - b.order)
        : [],
    },
    currentSeason: {
      ...base.currentSeason,
      ...(data.currentSeason || {}),
      priorityAreas: Array.isArray(data.currentSeason?.priorityAreas)
        ? data.currentSeason.priorityAreas.filter(Boolean)
        : [],
    },
    seasonHistory: Array.isArray(data.seasonHistory)
      ? data.seasonHistory.map(normalizeSeasonSnapshot)
      : [],
    weekly: {
      weekKey: data.weekly?.weekKey || '',
      priorities: Array.isArray(data.weekly?.priorities)
        ? data.weekly.priorities.map(normalizePriority).sort((a, b) => a.order - b.order)
        : [],
    },
    checkIns: Array.isArray(data.checkIns)
      ? data.checkIns.map(normalizeCheckIn).sort((a, b) => b.completedAt - a.completedAt)
      : [],
    updatedAt: data.updatedAt || Date.now(),
  };
}

function normalizePillar(p) {
  return {
    id: p.id || crypto.randomUUID(),
    title: p.title || '',
    description: p.description || '',
    dependencyNote: p.dependencyNote || '',
    uncertain: Boolean(p.uncertain),
    order: typeof p.order === 'number' ? p.order : Date.now(),
  };
}

function normalizePhase(p) {
  return {
    id: p.id || crypto.randomUUID(),
    title: p.title || '',
    timeframe: p.timeframe || '',
    mission: p.mission || '',
    objectives: Array.isArray(p.objectives) ? p.objectives.filter(Boolean) : [],
    exitCriteria: Array.isArray(p.exitCriteria) ? p.exitCriteria.filter(Boolean) : [],
    uncertain: Boolean(p.uncertain),
    order: typeof p.order === 'number' ? p.order : Date.now(),
  };
}

function normalizeMilestone(m) {
  return {
    id: m.id || crypto.randomUUID(),
    title: m.title || '',
    timeframe: m.timeframe || '',
    description: m.description || '',
    category: m.category || '',
    uncertain: Boolean(m.uncertain),
    order: typeof m.order === 'number' ? m.order : Date.now(),
  };
}

function normalizePriority(p) {
  return {
    id: p.id || crypto.randomUUID(),
    text: p.text || '',
    source: p.source || 'manual',
    pillarId: p.pillarId || null,
    seasonArea: p.seasonArea || '',
    status: p.status || PRIORITY_STATUS.ACTIVE,
    order: typeof p.order === 'number' ? p.order : Date.now(),
  };
}

function normalizeSeasonSnapshot(s) {
  return {
    id: s.id || crypto.randomUUID(),
    title: s.title || '',
    description: s.description || '',
    priorityAreas: Array.isArray(s.priorityAreas) ? s.priorityAreas.filter(Boolean) : [],
    startedAt: s.startedAt || null,
    endedAt: s.endedAt || null,
  };
}

function normalizeCheckIn(c) {
  return {
    id: c.id || crypto.randomUUID(),
    weekKey: c.weekKey || '',
    completedAt: c.completedAt || Date.now(),
    prioritiesReview: Array.isArray(c.prioritiesReview) ? c.prioritiesReview : [],
    reflection: {
      movedForward: c.reflection?.movedForward || '',
      slipped: c.reflection?.slipped || '',
      blockers: c.reflection?.blockers || '',
      nextWeekFocus: c.reflection?.nextWeekFocus || '',
      alignedWithSeason: c.reflection?.alignedWithSeason || '',
      alignmentNote: c.reflection?.alignmentNote || '',
    },
    aiReview: c.aiReview || null,
  };
}

export function parseLinesInput(raw) {
  return (raw || '')
    .split('\n')
    .map((l) => l.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
}

export function sectionHasContent(section, doc) {
  switch (section) {
    case 'northStar':
      return Boolean(doc.northStar.text?.trim()) || doc.northStar.uncertain;
    case 'pillars':
      return doc.pillars.some((p) => p.title || p.description);
    case 'roadmap':
      return doc.roadmap.tenYearPhases.some((p) => p.title || p.mission)
        || doc.roadmap.fewYearsMilestones.some((m) => m.title);
    case 'season':
      return Boolean(doc.currentSeason.title?.trim() || doc.currentSeason.description?.trim()
        || doc.currentSeason.priorityAreas.length);
    case 'weekly':
      return doc.weekly.priorities.length > 0;
    default:
      return false;
  }
}

export function computeSetupProgress(doc) {
  const checks = [
    sectionHasContent('northStar', doc),
    doc.pillars.length > 0,
    sectionHasContent('roadmap', doc),
    sectionHasContent('season', doc),
    doc.weekly.priorities.length > 0,
  ];
  const done = checks.filter(Boolean).length;
  return { done, total: checks.length, checks };
}

export function getCheckInForWeek(doc, weekKey) {
  return doc.checkIns.find((c) => c.weekKey === weekKey) || null;
}

export function weekNeedsCheckIn(doc, weekKey) {
  if (!weekKey) return false;
  if (getCheckInForWeek(doc, weekKey)) return false;
  return doc.weekly.weekKey === weekKey && doc.weekly.priorities.length > 0;
}

export function movePillar(doc, pillarId, direction) {
  const pillars = [...doc.pillars];
  const idx = pillars.findIndex((p) => p.id === pillarId);
  if (idx < 0) return doc;
  const swap = direction === 'up' ? idx - 1 : idx + 1;
  if (swap < 0 || swap >= pillars.length) return doc;
  const orderA = pillars[idx].order;
  pillars[idx] = { ...pillars[idx], order: pillars[swap].order };
  pillars[swap] = { ...pillars[swap], order: orderA };
  return { ...doc, pillars: pillars.sort((a, b) => a.order - b.order) };
}

export function archiveCurrentSeason(doc) {
  const { currentSeason } = doc;
  if (!currentSeason.title && !currentSeason.description) return doc;
  const snapshot = {
    id: crypto.randomUUID(),
    title: currentSeason.title,
    description: currentSeason.description,
    priorityAreas: [...currentSeason.priorityAreas],
    startedAt: currentSeason.startedAt || new Date().toISOString().slice(0, 10),
    endedAt: new Date().toISOString().slice(0, 10),
  };
  return {
    ...doc,
    seasonHistory: [snapshot, ...doc.seasonHistory],
    currentSeason: {
      title: '',
      description: '',
      priorityAreas: [],
      startedAt: null,
      updatedAt: null,
    },
  };
}

export function carryForwardPriorities(doc, selectedIds, newWeekKey) {
  const toCarry = doc.weekly.priorities.filter(
    (p) => selectedIds.includes(p.id)
      && (p.status === PRIORITY_STATUS.ACTIVE || p.status === PRIORITY_STATUS.PARTIAL || p.status === PRIORITY_STATUS.NOT_DONE),
  );
  const carried = toCarry.map((p) => newWeeklyPriority({
    text: p.text,
    source: 'carried',
    pillarId: p.pillarId,
    seasonArea: p.seasonArea,
    order: p.order,
  }));
  return {
    ...doc,
    weekly: {
      weekKey: newWeekKey,
      priorities: carried,
    },
  };
}

export function prioritiesFromSeason(doc, max = 5) {
  const areas = doc.currentSeason.priorityAreas.filter(Boolean).slice(0, max);
  return areas.map((area, i) => newWeeklyPriority({
    text: area,
    source: 'season',
    seasonArea: area,
    order: Date.now() + i,
  }));
}

export function statusLabel(status) {
  const map = {
    active: 'In progress',
    completed: 'Completed',
    partial: 'Partially done',
    dropped: 'Intentionally dropped',
    not_done: 'Not done',
  };
  return map[status] || status;
}

export function alignmentLabel(id) {
  return ALIGNMENT_OPTIONS.find((o) => o.id === id)?.label || id;
}
