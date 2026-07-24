import { VIDEO_HISTORY_LIMIT } from './video-limits.js';
import { cloneProject } from './video-project.js';

/**
 * @param {number} [limit]
 */
export function createVideoHistory(limit = VIDEO_HISTORY_LIMIT) {
  /** @type {import('./video-project.js').VideoProject[]} */
  let past = [];
  /** @type {import('./video-project.js').VideoProject[]} */
  let future = [];

  return {
    /** @param {import('./video-project.js').VideoProject} project */
    push(project) {
      past.push(cloneProject(project));
      if (past.length > limit) past.shift();
      future = [];
    },
    canUndo() {
      return past.length > 0;
    },
    canRedo() {
      return future.length > 0;
    },
    /** @param {import('./video-project.js').VideoProject} current */
    undo(current) {
      if (!past.length) return null;
      future.push(cloneProject(current));
      return past.pop() ?? null;
    },
    /** @param {import('./video-project.js').VideoProject} current */
    redo(current) {
      if (!future.length) return null;
      past.push(cloneProject(current));
      return future.pop() ?? null;
    },
    clear() {
      past = [];
      future = [];
    },
  };
}
