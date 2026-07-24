/**
 * Review-session model for Authorized URL Import.
 * Separates accepted / rejected / deferred entries with acknowledgment gates.
 */

/**
 * @typedef {{
 *   sessionId: string,
 *   createdAt: number,
 *   parseResult: import('./url-import-parse.js').UrlImportParseResult,
 *   acknowledgments: {
 *     sourceRights: boolean,
 *     youtubeTermsRisk: boolean,
 *   },
 * }} UrlImportReviewSession
 */

/**
 * @param {import('./url-import-parse.js').UrlImportParseResult} parseResult
 * @returns {UrlImportReviewSession}
 */
export function createUrlImportReviewSession(parseResult) {
  return {
    sessionId: `rev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    parseResult,
    acknowledgments: {
      sourceRights: false,
      youtubeTermsRisk: false,
    },
  };
}

/**
 * @param {UrlImportReviewSession} session
 * @param {'sourceRights' | 'youtubeTermsRisk'} key
 * @param {boolean} value
 */
export function setReviewAcknowledgment(session, key, value) {
  return {
    ...session,
    acknowledgments: {
      ...session.acknowledgments,
      [key]: Boolean(value),
    },
  };
}

/**
 * @param {UrlImportReviewSession} session
 */
export function reviewRequiresYouTubeAck(session) {
  return session.parseResult.accepted.some((e) => e.provider === 'youtube-single');
}

/**
 * @param {UrlImportReviewSession} session
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function canConfirmReview(session) {
  if (!session.parseResult.accepted.length) {
    return { ok: false, reason: 'NO_ACCEPTED_URLS' };
  }
  if (!session.acknowledgments.sourceRights) {
    return { ok: false, reason: 'SOURCE_RIGHTS_REQUIRED' };
  }
  if (reviewRequiresYouTubeAck(session) && !session.acknowledgments.youtubeTermsRisk) {
    return { ok: false, reason: 'YOUTUBE_ACK_REQUIRED' };
  }
  return { ok: true };
}

/**
 * Payload URLs for server create — raw normalized URLs only after confirm.
 * @param {UrlImportReviewSession} session
 * @returns {string[]}
 */
export function acceptedUrlsForCreate(session) {
  return session.parseResult.accepted.map((e) => e.normalizedUrl);
}
