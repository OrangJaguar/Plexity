/**
 * Helpers for activity content / generation eligibility.
 */

export function hasLearningGuideContent(activity) {
  return Boolean(activity?.content?.sections?.length);
}

export function isLearningGuideComplete(activity) {
  if (!hasLearningGuideContent(activity)) return false;
  const total = activity.content.sections.length;
  const completed = activity.content?.progress?.completedSectionIds?.length ?? 0;
  return total > 0 && completed >= total;
}

export function isLearningGuideInProgress(activity) {
  if (!hasLearningGuideContent(activity)) return false;
  if (isLearningGuideComplete(activity)) return false;
  const progress = activity.content?.progress;
  const completed = progress?.completedSectionIds?.length ?? 0;
  const hasCheckIns = progress?.checkInBySection
    && Object.keys(progress.checkInBySection).length > 0;
  return completed > 0
    || progress?.currentSectionIndex != null
    || hasCheckIns;
}

export function learningGuideIncomplete(activity) {
  if (!activity) return true;
  if (activity.status === 'notGenerated') return true;
  if (!hasLearningGuideContent(activity)) return true;
  return !isLearningGuideComplete(activity);
}

export function resolveGuideSectionIndex(sections, progress = {}, sessionData = {}) {
  if (!sections?.length) return 0;
  const saved = sessionData.currentSectionIndex ?? progress.currentSectionIndex;
  if (typeof saved === 'number' && saved >= 0 && saved < sections.length) {
    return saved;
  }
  const completed = new Set(progress.completedSectionIds ?? sessionData.completedSectionIds ?? []);
  const firstIncomplete = sections.findIndex((s) => !completed.has(s.sectionId));
  return firstIncomplete >= 0 ? firstIncomplete : 0;
}

export function resolveGuideCheckIns(progress = {}, sessionData = {}) {
  if (progress.checkInBySection && typeof progress.checkInBySection === 'object') {
    return progress.checkInBySection;
  }
  if (sessionData.checkInBySection && typeof sessionData.checkInBySection === 'object') {
    return sessionData.checkInBySection;
  }
  const results = sessionData.checkInResults ?? progress.checkInResults;
  if (Array.isArray(results)) {
    return Object.fromEntries(
      results.map((r) => [r.sectionId, {
        selected: r.selected ?? r.response ?? null,
        correct: r.correct,
        skipped: r.skipped,
      }]),
    );
  }
  return {};
}

export function learningGuideNeedsGeneration(activity) {
  if (!activity || activity.type !== 'learningGuide') return false;
  if (hasLearningGuideContent(activity)) return false;
  return activity.status === 'notGenerated' || activity.status === 'failed';
}

export function isLegacyGeneratingActivity(activity) {
  return activity?.status === 'generating';
}
