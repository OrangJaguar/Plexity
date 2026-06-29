/**
 * Derive weak concept IDs from recent quiz sessions.
 */
export function getWeakConceptIds(sessions, moduleId, limit = 10) {
  const quizSessions = sessions
    .filter((s) => s.moduleId === moduleId && s.activityType === 'practiceQuiz' && s.status === 'completed')
    .sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0))
    .slice(0, 3);

  const misses = {};
  for (const session of quizSessions) {
    const answers = session.sessionData?.answers ?? [];
    for (const ans of answers) {
      if (!ans.correct && ans.conceptId) {
        misses[ans.conceptId] = (misses[ans.conceptId] ?? 0) + 1;
      }
    }
  }

  return Object.entries(misses)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
}

export function getRecentQuestionIds(sessions, moduleId) {
  return sessions
    .filter((s) => s.moduleId === moduleId && s.activityType === 'practiceQuiz')
    .sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0))
    .slice(0, 3)
    .flatMap((s) => (s.sessionData?.questions ?? []).map((q) => q.id))
    .slice(0, 50);
}
