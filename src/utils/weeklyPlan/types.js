/**
 * @typedef {'normal' | 'cram'} PlanMode
 */

/**
 * @typedef {'learningGuide' | 'practiceQuiz' | 'flashcardSet' | 'feynman' | 'freeRecall'} ModuleActivityType
 */

/**
 * @typedef {Object} PlanAssignment
 * @property {string} moduleId
 * @property {string} moduleName
 * @property {string} moduleAbbr
 * @property {string} activityId
 * @property {ModuleActivityType} activityType
 * @property {string} reasonCode
 */

/**
 * @typedef {Object} PlanDay
 * @property {number} dayIndex - 0=Mon … 6=Sun
 * @property {string} dateKey - YYYY-MM-DD
 * @property {number} estimatedMin
 * @property {PlanAssignment[]} assignments
 * @property {number} fsrsCardCount
 * @property {boolean} isRestDay
 */

/**
 * @typedef {Object} ModuleSummary
 * @property {string} moduleId
 * @property {string} moduleName
 * @property {string} priorityText
 * @property {number[]} assignedDayIndexes
 * @property {string[]} weakConceptLabels
 */

/**
 * @typedef {Object} WeeklyPlanSnapshot
 * @property {PlanMode} mode
 * @property {string} weekKey
 * @property {number} builtAt
 * @property {number} dailyBudgetMin
 * @property {number|null} daysUntilExam
 * @property {PlanDay[]} days
 * @property {ModuleSummary[]} moduleSummaries
 */

/**
 * @typedef {Object} ModuleContext
 * @property {object} module
 * @property {string} stage
 * @property {boolean} guideComplete
 * @property {boolean} guideInProgress
 * @property {number|null} quizAccuracy
 * @property {number|null} daysSinceLastQuiz
 * @property {string[]} weakConceptLabels
 * @property {object|null} learningGuideActivity
 * @property {object|null} practiceQuizActivity
 * @property {object|null} flashcardActivity
 * @property {object|null} feynmanActivity
 * @property {object|null} freeRecallActivity
 * @property {number} urgencyScore
 */

export {};
