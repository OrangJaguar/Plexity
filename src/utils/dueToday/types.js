/**
 * @typedef {'learningGuide' | 'practiceQuiz' | 'flashcardSet' | 'feynman' | 'freeRecall' | 'interleavedReview' | 'journeyChallenge' | 'cramSession'} ActivityType
 */

/**
 * @typedef {'focus' | 'primary' | 'overflow' | 'fsrs'} DueTodayTier
 */

/**
 * @typedef {Object} DueTodayItem
 * @property {string} id
 * @property {string} journeyId
 * @property {string} journeyTitle
 * @property {string} subject
 * @property {string|null} [moduleId]
 * @property {string|null} [moduleName]
 * @property {string} activityId
 * @property {ActivityType} activityType
 * @property {string} activityLabel
 * @property {string} reason
 * @property {string} actionLabel
 * @property {'high'|'medium'|'low'} urgency
 * @property {number} urgencyDays
 * @property {number} estimatedMin
 * @property {string} href
 * @property {number} [cardCount]
 * @property {number} [lastStudiedAt]
 * @property {DueTodayTier} [tier]
 * @property {boolean} [isCombinedFsrsDeck]
 * @property {boolean} [planAssignment]
 * @property {string[]} [cardIds]
 */

export {};
