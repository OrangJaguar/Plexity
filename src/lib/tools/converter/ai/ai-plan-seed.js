/**
 * Ephemeral seed for remote job create when AI assist produces a plan draft.
 * In-memory only — never persists prompts or filenames.
 */

/** @type {Record<string, unknown> | null} */
let remotePlanSeed = null;

/** @param {Record<string, unknown> | null} plan */
export function setRemoteAiPlanSeed(plan) {
  remotePlanSeed = plan && typeof plan === 'object' ? { ...plan } : null;
}

/** @returns {Record<string, unknown> | null} */
export function consumeRemoteAiPlanSeed() {
  const next = remotePlanSeed;
  remotePlanSeed = null;
  return next;
}

/** @returns {Record<string, unknown> | null} */
export function peekRemoteAiPlanSeed() {
  return remotePlanSeed;
}
