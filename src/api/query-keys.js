export const queryKeys = {
  preferences: (email) => (email ? ['preferences', email] : ['preferences']),
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
