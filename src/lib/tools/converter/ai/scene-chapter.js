/**
 * Scene/chapter detection suggestions — metadata sidecar drafts only.
 * Never auto-split without human confirm.
 */

import { normalizeSceneChapterDraft } from './ocr-normalize.js';

/**
 * @param {Array<{ start: number, end?: number, label?: string }>} markers
 */
export function buildSceneChapterSidecar(markers) {
  return {
    ...normalizeSceneChapterDraft(markers),
    schema: 'converter.scene-chapter.v1',
    requiresConfirm: true,
  };
}

/**
 * Heuristic chapter markers from sparse timestamps (draft).
 * @param {number[]} timestampsSeconds
 */
export function suggestChaptersFromTimestamps(timestampsSeconds) {
  const marks = (Array.isArray(timestampsSeconds) ? timestampsSeconds : [])
    .map(Number)
    .filter((n) => Number.isFinite(n) && n >= 0)
    .sort((a, b) => a - b)
    .slice(0, 50)
    .map((start, i, arr) => ({
      start,
      end: arr[i + 1] != null ? arr[i + 1] : null,
      label: `Chapter ${i + 1}`,
    }));
  return buildSceneChapterSidecar(marks);
}

export { normalizeSceneChapterDraft };
