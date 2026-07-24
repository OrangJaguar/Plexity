import {
  createAttemptId,
  createErrorDescriptor,
  createOutputDescriptor,
  createSourceDescriptor,
  ERROR_CODES,
  isTerminalStatus,
  JOB_STATUS,
  normalizeJob,
} from './converter-job-model.js';

/** @typedef {import('./converter-job-model.js').ConverterJob} ConverterJob */

/**
 * @param {ConverterJob} job
 * @param {object} patch
 * @param {() => number} [now]
 * @returns {ConverterJob}
 */
function patchJob(job, patch, now = () => Date.now()) {
  return normalizeJob({
    ...job,
    ...patch,
    updatedAt: now(),
  });
}

/**
 * @param {ConverterJob} job
 * @param {string} attemptId
 * @returns {boolean}
 */
function isStaleAttempt(job, attemptId) {
  return job.removed || job.attemptId !== attemptId || isTerminalStatus(job.status);
}

/**
 * @param {Readonly<Record<string, ConverterJob>>} state
 * @param {object} action
 * @param {() => number} [now]
 * @returns {Readonly<Record<string, ConverterJob>>}
 */
export function converterReducer(state, action, now = () => Date.now()) {
  switch (action.type) {
    case 'ADD_JOB': {
      const job = normalizeJob(action.job);
      return Object.freeze({ ...state, [job.id]: job });
    }

    case 'ANALYZE_START': {
      const job = state[action.jobId];
      if (!job || isStaleAttempt(job, action.attemptId)) return state;
      if (job.status !== JOB_STATUS.WAITING) return state;
      return Object.freeze({
        ...state,
        [job.id]: patchJob(job, {
          status: JOB_STATUS.ANALYZING,
          progress: Object.freeze({ phase: 'analyzing', fraction: 0 }),
        }, now),
      });
    }

    case 'ANALYZE_SUCCESS': {
      const job = state[action.jobId];
      if (!job || isStaleAttempt(job, action.attemptId)) return state;
      if (job.status !== JOB_STATUS.ANALYZING) return state;
      return Object.freeze({
        ...state,
        [job.id]: patchJob(job, {
          analysis: Object.freeze({ ...(action.analysis ?? {}) }),
          sourceAnalysis: action.sourceAnalysis != null
            ? Object.freeze({ ...action.sourceAnalysis })
            : job.sourceAnalysis,
          progress: Object.freeze({ phase: 'analyzing', fraction: 1 }),
        }, now),
      });
    }

    case 'ANALYZE_FAIL': {
      const job = state[action.jobId];
      if (!job || isStaleAttempt(job, action.attemptId)) return state;
      if (job.status !== JOB_STATUS.ANALYZING && job.status !== JOB_STATUS.WAITING) return state;
      return Object.freeze({
        ...state,
        [job.id]: patchJob(job, {
          status: JOB_STATUS.FAILED,
          error: createErrorDescriptor(action.error ?? { code: ERROR_CODES.ANALYSIS_FAILED, message: 'Analysis failed' }),
          progress: Object.freeze({ phase: null, fraction: 0 }),
        }, now),
      });
    }

    case 'SET_OPERATION': {
      const job = state[action.jobId];
      if (!job || job.removed || isTerminalStatus(job.status)) return state;
      return Object.freeze({
        ...state,
        [job.id]: patchJob(job, {
          operationId: action.operationId ? String(action.operationId) : null,
          goalId: action.goalId != null ? String(action.goalId) : job.goalId,
          plan: action.plan != null ? action.plan : job.plan,
          options: Object.freeze({ ...(action.options ?? job.options) }),
          acknowledgments: Object.freeze({ ...(action.acknowledgments ?? job.acknowledgments) }),
          recipeId: action.recipeId != null ? String(action.recipeId) : job.recipeId,
          splitSpec: action.splitSpec != null ? action.splitSpec : job.splitSpec,
          mergeGroupId: action.mergeGroupId != null ? String(action.mergeGroupId) : job.mergeGroupId,
          childJobIds: action.childJobIds != null
            ? Object.freeze([...action.childJobIds])
            : job.childJobIds,
          parentJobId: action.parentJobId != null ? String(action.parentJobId) : job.parentJobId,
        }, now),
      });
    }

    case 'LINK_COMPOSITE': {
      const parent = state[action.parentJobId];
      if (!parent) return state;
      const childJobIds = Object.freeze([...(action.childJobIds ?? [])].map(String));
      /** @type {Record<string, ConverterJob>} */
      let next = {
        ...state,
        [parent.id]: patchJob(parent, { childJobIds }, now),
      };
      for (const childId of childJobIds) {
        const child = next[childId];
        if (!child) continue;
        next = {
          ...next,
          [childId]: patchJob(child, { parentJobId: parent.id }, now),
        };
      }
      return Object.freeze(next);
    }

    case 'QUEUE': {
      const job = state[action.jobId];
      if (!job || isStaleAttempt(job, action.attemptId)) return state;
      if (job.status !== JOB_STATUS.WAITING && job.status !== JOB_STATUS.ANALYZING) return state;
      return Object.freeze({
        ...state,
        [job.id]: patchJob(job, {
          status: JOB_STATUS.QUEUED,
          progress: Object.freeze({ phase: 'queued', fraction: 0 }),
        }, now),
      });
    }

    case 'PROCESS_START': {
      const job = state[action.jobId];
      if (!job || isStaleAttempt(job, action.attemptId)) return state;
      if (job.status !== JOB_STATUS.ANALYZING && job.status !== JOB_STATUS.WAITING && job.status !== JOB_STATUS.QUEUED) return state;
      const plan = action.plan != null ? action.plan : job.plan;
      return Object.freeze({
        ...state,
        [job.id]: patchJob(job, {
          status: JOB_STATUS.PROCESSING,
          engine: action.engine ? String(action.engine) : job.engine,
          plan: plan ?? job.plan,
          options: plan?.options
            ? Object.freeze({ ...plan.options })
            : job.options,
          progress: Object.freeze({ phase: 'processing', fraction: 0 }),
        }, now),
      });
    }

    case 'PROGRESS': {
      const job = state[action.jobId];
      if (!job || isStaleAttempt(job, action.attemptId)) return state;
      if (job.status !== JOB_STATUS.ANALYZING && job.status !== JOB_STATUS.PROCESSING && job.status !== JOB_STATUS.QUEUED) return state;
      const phase = action.phase ?? job.progress.phase ?? 'processing';
      const prev = job.progress.fraction ?? 0;
      const next = Math.max(prev, Number(action.fraction ?? prev));
      return Object.freeze({
        ...state,
        [job.id]: patchJob(job, {
          progress: Object.freeze({ phase, fraction: next }),
        }, now),
      });
    }

    case 'COMPLETE': {
      const job = state[action.jobId];
      if (!job || isStaleAttempt(job, action.attemptId)) return state;
      if (job.status !== JOB_STATUS.PROCESSING && job.status !== JOB_STATUS.ANALYZING) return state;
      const completionWarnings = action.completionWarnings?.length
        ? Object.freeze([...new Set([...(job.plan?.warnings ?? []), ...action.completionWarnings])])
        : job.plan?.warnings;
      const nextPlan = job.plan && completionWarnings
        ? Object.freeze({ ...job.plan, warnings: completionWarnings })
        : job.plan;
      return Object.freeze({
        ...state,
        [job.id]: patchJob(job, {
          status: JOB_STATUS.COMPLETED,
          output: createOutputDescriptor(action.output),
          error: null,
          checksum: action.checksum != null ? String(action.checksum) : job.checksum,
          plan: nextPlan,
          progress: Object.freeze({ phase: 'processing', fraction: 1 }),
        }, now),
      });
    }

    case 'FAIL': {
      const job = state[action.jobId];
      if (!job || isStaleAttempt(job, action.attemptId)) return state;
      if (isTerminalStatus(job.status)) return state;
      return Object.freeze({
        ...state,
        [job.id]: patchJob(job, {
          status: JOB_STATUS.FAILED,
          error: createErrorDescriptor(action.error ?? { code: ERROR_CODES.PROCESSING_FAILED, message: 'Processing failed' }),
          progress: Object.freeze({ phase: null, fraction: 0 }),
        }, now),
      });
    }

    case 'CANCEL': {
      const job = state[action.jobId];
      if (!job || job.removed || isTerminalStatus(job.status)) return state;
      return Object.freeze({
        ...state,
        [job.id]: patchJob(job, {
          status: JOB_STATUS.CANCELLED,
          error: createErrorDescriptor({ code: ERROR_CODES.CANCELLED, message: 'Cancelled' }),
          progress: Object.freeze({ phase: null, fraction: 0 }),
        }, now),
      });
    }

    case 'RETRY': {
      const job = state[action.jobId];
      if (!job || job.removed) return state;
      const attemptId = action.attemptId ?? createAttemptId();
      return Object.freeze({
        ...state,
        [job.id]: patchJob(job, {
          attemptId,
          status: JOB_STATUS.WAITING,
          error: null,
          output: null,
          analysis: null,
          engine: null,
          progress: Object.freeze({ phase: null, fraction: 0 }),
        }, now),
      });
    }

    case 'REMOVE': {
      const job = state[action.jobId];
      if (!job) return state;
      const next = { ...state };
      delete next[job.id];
      return Object.freeze(next);
    }

    case 'RESET': {
      return Object.freeze({});
    }

    default:
      return state;
  }
}

export function createInitialConverterState() {
  return Object.freeze({});
}
