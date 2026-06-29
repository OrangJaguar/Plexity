export const COLLEGE_SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'colleges', label: 'Colleges' },
  { id: 'academics', label: 'Academics' },
  { id: 'testing', label: 'Testing' },
  { id: 'activities', label: 'Activities' },
  { id: 'honors', label: 'Honors' },
  { id: 'writing', label: 'Writing' },
  { id: 'recommendations', label: 'Recommendations' },
  { id: 'application-info', label: 'Application info' },
];

export const CLASSIFICATIONS = [
  { id: 'reach', label: 'Reach' },
  { id: 'target', label: 'Target' },
  { id: 'safety', label: 'Safety' },
  { id: 'financial_safety', label: 'Financial safety' },
];

export const APPLICATION_ROUNDS = [
  { id: 'ed', label: 'Early Decision' },
  { id: 'ea', label: 'Early Action' },
  { id: 'rea', label: 'Restrictive EA' },
  { id: 'rd', label: 'Regular Decision' },
  { id: 'rolling', label: 'Rolling' },
];

export const APPLICATION_STATUSES = [
  { id: 'not_started', label: 'Not started' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'waitlisted', label: 'Waitlisted' },
  { id: 'deferred', label: 'Deferred' },
];

export const ESSAY_TYPES = [
  'why_us', 'why_major', 'community', 'identity', 'intellectual', 'extracurricular', 'short_answer', 'other',
];

export const ESSAY_STATUSES = [
  'not_started', 'brainstorming', 'drafting', 'revised', 'final',
];

export const ACTIVITY_CATEGORIES = [
  'Academic', 'Art', 'Athletics', 'Career', 'Community Service', 'Computer/Technology',
  'Cultural', 'Dance', 'Debate/Speech', 'Environmental', 'Family Responsibilities',
  'Foreign Exchange', 'Journalism/Publication', 'Junior ROTC', 'LGBT', 'Music',
  'Religious', 'Research', 'Robotics', 'School Spirit', 'Science/Math', 'Social Justice',
  'Student Govt', 'Theater/Drama', 'Work', 'Other',
];

export const HONOR_LEVELS = [
  'school', 'local', 'state_regional', 'national', 'international',
];

export const CHECKLIST_STATUS = [
  { id: 'ready', label: 'Ready' },
  { id: 'need_ask', label: 'Need to ask' },
  { id: 'need_find', label: 'Need to find' },
  { id: 'skip', label: 'Skip for now' },
];

export const RECOMMENDER_TYPES = [
  { id: 'teacher', label: 'Teacher' },
  { id: 'counselor', label: 'Counselor' },
  { id: 'other', label: 'Other' },
];

export const RECOMMENDER_STATUSES = [
  'not_asked', 'asked', 'agreed', 'submitted', 'declined',
];

export function newId() {
  return crypto.randomUUID();
}

export function defaultApplicationChecklist() {
  return [
    { id: 'legal_name', section: 'personal', label: 'Legal full name matches school/testing documents', status: null },
    { id: 'dob', section: 'personal', label: 'Date of birth available', status: null },
    { id: 'address', section: 'personal', label: 'Current home address ready', status: null },
    { id: 'parent_occupation', section: 'family', label: 'Parent/guardian occupation ready', status: null },
    { id: 'parent_education', section: 'family', label: 'Parent/guardian education level ready', status: null },
    { id: 'parent_college', section: 'family', label: 'Parent/guardian college attendance ready', status: null },
    { id: 'counselor', section: 'school', label: 'Counselor contact info ready', status: null },
    { id: 'transcript', section: 'documents', label: 'School transcript available', status: null },
    { id: 'test_dates', section: 'documents', label: 'Standardized test dates and official reports ready', status: null },
    { id: 'fee_waiver', section: 'documents', label: 'Fee waiver documentation ready (if applicable)', status: null },
    { id: 'portal', section: 'documents', label: 'Application portal logins and submission plan ready', status: null },
  ];
}

export function emptyCollegeDocument() {
  return {
    version: 2,
    academics: {
      schoolName: '',
      gradYear: '',
      gpaUnweighted: '',
      gpaWeighted: '',
      classRank: '',
      classSize: '',
      courseloadSummary: '',
      apCount: '',
      ibCount: '',
      honorsCount: '',
      dualEnrollmentCount: '',
      currentClasses: '',
      plannedClasses: '',
      dualEnrollment: '',
      intendedMajors: '',
      intendedMajorList: [''],
      apCount: '',
      apCourses: [],
      ibCount: '',
      ibCourses: [],
      notes: '',
    },
    testing: {
      satAttempts: [],
      actAttempts: [],
      apExams: [],
      plannedDates: '',
    },
    activities: [],
    honors: [],
    mainEssays: [],
    supplementals: [],
    recommenders: [],
    myColleges: [],
    applicationChecklist: defaultApplicationChecklist(),
    updatedAt: Date.now(),
  };
}

export function newActivity(sortOrder = 0) {
  return {
    id: newId(),
    name: '',
    category: '',
    organization: '',
    role: '',
    gradeLevels: '',
    timing: '',
    hoursPerWeek: '',
    weeksPerYear: '',
    stillParticipating: false,
    shortDescription: '',
    masterDescription: '',
    impactMetrics: '',
    linkedHonorId: '',
    significance: '',
    mostImportant: false,
    sortOrder,
  };
}

export function newHonor(sortOrder = 0) {
  return {
    id: newId(),
    title: '',
    level: 'school',
    gradeLevel: '',
    explanation: '',
    criteria: '',
    linkedActivityId: '',
    inTopFive: sortOrder < 5,
    sortOrder,
  };
}

export function newMainEssay() {
  return {
    id: newId(),
    title: 'Personal statement',
    theme: '',
    content: '',
    wordCount: 0,
    status: 'drafting',
    isBest: false,
    notes: '',
    type: 'personal_statement',
  };
}

export function newSupplemental(collegeId = '') {
  return {
    id: newId(),
    collegeId,
    promptTitle: '',
    promptText: '',
    wordLimit: '',
    essayType: 'other',
    status: 'not_started',
    draftText: '',
    reusedFromId: '',
    notes: '',
  };
}

export function newRecommender() {
  return {
    id: newId(),
    name: '',
    type: 'teacher',
    subject: '',
    contactNote: '',
    requestDate: '',
    status: 'not_asked',
    thankYouSent: false,
    collegeIds: [],
    notes: '',
  };
}

export function newMyCollege(catalogId, catalogEntry = null) {
  return {
    id: newId(),
    catalogId: catalogId || '',
    customName: catalogEntry ? '' : 'Custom school',
    classification: null,
    classificationManual: false,
    applicationRound: 'rd',
    applicationStatus: 'not_started',
    whyThisSchool: '',
    scholarshipNotes: '',
    notes: '',
    testSubmit: 'undecided',
    recommenderNotes: '',
    addedAt: Date.now(),
  };
}

function migrateActivity(old, i) {
  return {
    ...newActivity(i),
    name: old.title || old.name || '',
    organization: old.organization || '',
    masterDescription: old.description || '',
    shortDescription: (old.description || '').slice(0, 150),
    sortOrder: i,
  };
}

function migrateHonor(old, i) {
  return {
    ...newHonor(i),
    title: old.title || '',
    explanation: old.description || '',
    inTopFive: i < 5,
    sortOrder: i,
  };
}

function migrateEssay(old) {
  return {
    ...newMainEssay(),
    title: old.title || 'Essay',
    content: old.content || '',
    theme: old.prompt || '',
  };
}

function migrateCollege(old) {
  return {
    ...newMyCollege(''),
    customName: old.name || old.school || 'School',
    applicationRound: old.deadlineType === 'ea' ? 'ea' : old.deadlineType === 'ed' ? 'ed' : 'rd',
    applicationStatus: old.status === 'applied' ? 'submitted' : old.status === 'accepted' ? 'accepted' : 'not_started',
    notes: old.notes || '',
  };
}

function normalizeAcademics(academics = {}) {
  const base = emptyCollegeDocument().academics;
  const merged = { ...base, ...academics };

  if (!merged.intendedMajorList?.length) {
    if (merged.intendedMajors) {
      merged.intendedMajorList = merged.intendedMajors
        .split(/[,;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (!merged.intendedMajorList?.length) {
      merged.intendedMajorList = [''];
    }
  }

  merged.apCourses = Array.isArray(merged.apCourses) ? merged.apCourses : [];
  merged.ibCourses = Array.isArray(merged.ibCourses) ? merged.ibCourses : [];

  return merged;
}

export function resizeCourseEntries(countStr, existing = []) {
  const count = Math.max(0, Math.min(20, parseInt(countStr, 10) || 0));
  const next = [...existing];
  while (next.length < count) {
    next.push({ id: newId(), course: '', score: '' });
  }
  return next.slice(0, count);
}

export function normalizeCollegeDocument(raw) {
  if (!raw) return emptyCollegeDocument();
  if (raw.version === 2) {
    const merged = {
      ...emptyCollegeDocument(),
      ...raw,
      academics: normalizeAcademics(raw.academics),
      testing: { ...emptyCollegeDocument().testing, ...raw.testing },
      applicationChecklist: raw.applicationChecklist?.length
        ? raw.applicationChecklist
        : defaultApplicationChecklist(),
    };
    if (!merged.mainEssays?.length) {
      merged.mainEssays = [newMainEssay()];
    }
    return merged;
  }

  const base = emptyCollegeDocument();
  const p = raw.profile || {};
  base.academics = normalizeAcademics({
    ...base.academics,
    schoolName: p.school || '',
    gradYear: p.gradYear || '',
    gpaUnweighted: p.gpa || '',
    intendedMajors: p.intendedMajor || '',
    notes: p.bio || '',
  });
  if (p.sat || p.act) {
    if (p.sat) {
      base.testing.satAttempts.push({
        id: newId(), date: '', erw: '', math: '', total: p.sat,
      });
    }
    if (p.act) {
      base.testing.actAttempts.push({
        id: newId(), date: '', english: '', math: '', reading: '', science: '', composite: p.act,
      });
    }
  }
  base.activities = (raw.activities || []).map(migrateActivity);
  base.honors = (raw.honors || []).map(migrateHonor);
  base.mainEssays = (raw.essays || []).map(migrateEssay);
  if (!base.mainEssays.length) {
    base.mainEssays.push(newMainEssay());
  }
  base.myColleges = (raw.colleges || []).map(migrateCollege);
  base.version = 2;
  base.updatedAt = raw.updatedAt || Date.now();
  return base;
}

export function countWords(text) {
  return (text || '').trim().split(/\s+/).filter(Boolean).length;
}
