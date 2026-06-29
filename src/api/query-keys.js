export const queryKeys = {
  journeys: {
    all: ['journeys'],
    archived: ['journeys', 'archived'],
    detail: (journeyId) => ['journeys', journeyId],
  },
  modules: {
    byJourney: (journeyId) => ['modules', journeyId],
    detail: (moduleId) => ['modules', 'detail', moduleId],
  },
  activities: {
    byModule: (moduleId) => ['activities', moduleId],
    byJourney: (journeyId) => ['activities', 'journey', journeyId],
  },
  studyPlan: (journeyId) => ['studyPlan', journeyId],
  library: {
    list: (params) => ['library', 'list', params],
    preview: (journeyId) => ['library', 'preview', journeyId],
    eligibility: (journeyId) => ['library', 'eligibility', journeyId],
  },
  cards: {
    byJourney: (journeyId) => ['cards', journeyId],
    byActivity: (activityId) => ['cards', 'activity', activityId],
  },
  sessions: {
    byJourney: (journeyId) => ['sessions', journeyId],
  },
  preferences: (email) => (email ? ['preferences', email] : ['preferences']),
  profile: {
    stats: ['profile', 'stats'],
  },
  dueToday: ['dueToday'],
  aiQuota: ['aiQuota'],
  catalog: {
    allModules: ['catalog', 'modules'],
    allActivities: ['catalog', 'activities'],
    allCards: ['catalog', 'cards'],
    allSessions: ['catalog', 'sessions'],
  },
  tools: {
    schedule: ['tools', 'schedule'],
    tasks: ['tools', 'tasks'],
    calendar: ['tools', 'calendar'],
    journal: (dateKey) => (dateKey ? ['tools', 'journal', dateKey] : ['tools', 'journal']),
    journalAll: ['tools', 'journal', 'all'],
    grades: ['tools', 'grades'],
    college: ['tools', 'college'],
    lists: ['tools', 'lists'],
    profile: ['tools', 'profile'],
    goals: ['tools', 'goals'],
    passwords: ['tools', 'passwords'],
    calculator: ['tools', 'calculator'],
    stocksWorkspace: ['tools', 'stocksWorkspace'],
  },
};
