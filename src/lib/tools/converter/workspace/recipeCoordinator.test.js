import { describe, expect, it } from 'vitest';
import { createJob } from '@/lib/tools/converter/converter-job-model.js';
import { converterReducer, createInitialConverterState } from '@/lib/tools/converter/converter-reducer.js';
import {
  applyRecipeToJobs,
  canApplyRecipeToJob,
} from '@/lib/tools/converter/workspace/recipeCoordinator.js';

describe('recipeCoordinator', () => {
  it('skips completed and active jobs', () => {
    const waiting = createJob({
      source: { name: 'a.png', size: 1, detectedFormat: 'png' },
      analysis: { format: 'png', category: 'image' },
    });
    expect(canApplyRecipeToJob(waiting)).toBe(true);

    let state = createInitialConverterState();
    const processing = createJob({
      source: { name: 'b.png', size: 1 },
      analysis: { format: 'png', category: 'image' },
    });
    state = converterReducer(state, { type: 'ADD_JOB', job: processing });
    state = converterReducer(state, {
      type: 'PROCESS_START',
      jobId: processing.id,
      attemptId: processing.attemptId,
    });
    expect(canApplyRecipeToJob(state[processing.id])).toBe(false);
  });

  it('applies built-in recipe to matching audio jobs', () => {
    let state = createInitialConverterState();
    const job = createJob({
      source: { name: 'voice.wav', size: 1000, detectedFormat: 'wav' },
      analysis: { format: 'wav', category: 'audio' },
    });
    state = converterReducer(state, { type: 'ADD_JOB', job });
    state = converterReducer(state, {
      type: 'ANALYZE_SUCCESS',
      jobId: job.id,
      attemptId: job.attemptId,
      analysis: { format: 'wav', category: 'audio' },
    });

    /** @type {Array<object>} */
    const actions = [];
    const summary = applyRecipeToJobs({
      recipeId: 'podcast-ready-mp3',
      jobIds: [job.id],
      getJob: (id) => state[id],
      dispatch: (action) => {
        actions.push(action);
        state = converterReducer(state, action);
      },
    });

    expect(summary.applied).toBe(1);
    expect(state[job.id].operationId).toBe('wav-to-mp3');
    expect(state[job.id].recipeId).toBe('podcast-ready-mp3');
  });
});
