import { differenceInDays } from 'date-fns';
import { getWeakConceptIds } from '@/utils/study/conceptWeakness';
import { learningGuideIncomplete } from '@/utils/study/activityContent';

export { learningGuideIncomplete };

function findActivity(activities, moduleId, type) {
  return activities.find(
    (a) => a.moduleId === moduleId && a.type === type && a.status !== 'failed',
  ) ?? null;
}

export function getModuleQuizAccuracy(moduleId, activities) {
  const quiz = findActivity(activities, moduleId, 'practiceQuiz');
  if (!quiz?.stats) return null;
  return quiz.stats.avgAccuracy ?? quiz.stats.lastScore ?? null;
}

export function getDaysSinceLastQuiz(moduleId, sessions) {
  const quizSessions = sessions
    .filter((s) => s.moduleId === moduleId && s.activityType === 'practiceQuiz' && s.status === 'completed')
    .sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0));
  if (!quizSessions.length) return null;
  return differenceInDays(new Date(), new Date(quizSessions[0].startedAt));
}

function resolveConceptLabel(conceptId, module) {
  const concepts = module.knowledgeMap?.concepts;
  if (Array.isArray(concepts)) {
    const match = concepts.find((c) => c.id === conceptId || c.conceptId === conceptId);
    if (match?.name) return match.name;
    if (match?.label) return match.label;
  }
  if (conceptId.length > 24) return `${conceptId.slice(0, 20)}…`;
  return conceptId;
}

export function getWeakConceptLabels(sessions, module, limit = 3) {
  const ids = getWeakConceptIds(sessions, module.moduleId, limit);
  return ids.map((id) => resolveConceptLabel(id, module));
}

export function moduleAbbr(name) {
  if (!name) return '—';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 4);
  return words.map((w) => w[0]).join('').slice(0, 4).toUpperCase();
}

/** 1-based module index from journey order. */
export function buildModuleNumberMap(modules) {
  const sorted = [...modules].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const map = {};
  sorted.forEach((mod, index) => {
    map[mod.moduleId] = index + 1;
  });
  return map;
}

/**
 * Build derived context for one module used by the weekly plan engine.
 */
export function buildModuleContext(module, activities, sessions, journey) {
  const stage = module.stage || 'A';
  const learningGuideActivity = findActivity(activities, module.moduleId, 'learningGuide');
  const guideComplete = !learningGuideIncomplete(learningGuideActivity);
  const guideInProgress = !!learningGuideActivity
    && learningGuideActivity.status !== 'notGenerated'
    && !guideComplete;
  const focusBoost = journey?.moduleFocusBoosts?.[module.moduleId] ?? 0;

  return {
    module,
    stage,
    guideComplete,
    guideInProgress,
    quizAccuracy: getModuleQuizAccuracy(module.moduleId, activities),
    daysSinceLastQuiz: getDaysSinceLastQuiz(module.moduleId, sessions),
    weakConceptLabels: getWeakConceptLabels(sessions, module),
    learningGuideActivity,
    practiceQuizActivity: findActivity(activities, module.moduleId, 'practiceQuiz'),
    flashcardActivity: findActivity(activities, module.moduleId, 'flashcardSet'),
    feynmanActivity: findActivity(activities, module.moduleId, 'feynman'),
    freeRecallActivity: findActivity(activities, module.moduleId, 'freeRecall'),
    focusBoost,
    urgencyScore: 0,
  };
}

export function buildAllModuleContexts(modules, activities, sessions, journey) {
  return modules
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((mod) => buildModuleContext(mod, activities, sessions, journey));
}
