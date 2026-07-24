/**
 * Parent/child job helpers for merge, split, two-pass, and plan snapshots.
 */

import { fetchFile } from '@ffmpeg/util';
import { sha256Hex } from '../checksums.js';
import { createConversionPlan } from '../conversion-plan.js';
import { CONVERTER_FEATURE_FLAGS } from '../converter-feature-flags.js';
import {
  createAttemptId,
  createJob,
  ERROR_CODES,
  JOB_STATUS,
} from '../converter-job-model.js';
import {
  buildFfmpegArgv,
  concatMedia,
  sanitizeVirtualInput,
  sanitizeVirtualOutput,
  splitMediaSegment,
} from '../ffmpeg/ffmpeg-operations.js';
import { getFfmpegRuntime } from '../ffmpeg/ffmpeg-runtime.js';
import { normalizeFfmpegError } from '../ffmpeg/ffmpeg-runner.js';
import { createMergePlan, validateMergeCompatibility } from '../merge-plan.js';
import {
  estimateSplitCount,
  validateSplitSpec,
} from '../split-plan.js';
import {
  isWithinTargetTolerance,
  planTargetSize,
  suggestSecondPassBitrate,
} from '../target-size-planner.js';

/**
 * @param {import('../converter-job-model.js').ConverterJob} job
 * @param {string | null | undefined} engine
 * @param {Readonly<Record<string, boolean>>} [acknowledgments]
 */
export function buildAttemptPlanSnapshot(job, engine, acknowledgments = {}) {
  const existing = job.plan;
  const targetBytes = existing?.targetBytes
    ?? (Number(job.options?.targetBytes) > 0 ? Number(job.options.targetBytes) : null);

  return createConversionPlan({
    goalId: job.goalId || existing?.goalId || 'manual',
    operationId: job.operationId ?? existing?.operationId ?? '',
    options: { ...(existing?.options ?? {}), ...(job.options ?? {}) },
    engineHint: engine ?? existing?.engineHint ?? null,
    warnings: [
      ...new Set([
        ...(existing?.warnings ?? []),
        ...(job.analysis?.warnings ?? []),
      ]),
    ],
    acknowledged: { ...(job.acknowledgments ?? {}), ...acknowledgments },
    recipeId: job.recipeId ?? existing?.recipeId ?? null,
    compatibilityProfile: existing?.compatibilityProfile ?? null,
    targetBytes,
    passStrategy: existing?.passStrategy ?? 'auto',
    metadataPolicy: existing?.metadataPolicy ?? 'preserve',
    namingTemplate: existing?.namingTemplate ?? null,
    relativePath: job.relativePath ?? existing?.relativePath ?? null,
    mergeGroupId: job.mergeGroupId ?? existing?.mergeGroupId ?? null,
    splitSpec: job.splitSpec ?? existing?.splitSpec ?? null,
    estimate: job.estimate ?? existing?.estimate ?? null,
    checksumPolicy: existing?.checksumPolicy ?? 'none',
  });
}

/**
 * @param {import('../conversion-plan.js').MetadataPolicy | string | null | undefined} metadataPolicy
 * @param {Record<string, unknown>} options
 */
export function applyPlanMetadataToOptions(metadataPolicy, options) {
  const mapped = mapMetadataPolicy(metadataPolicy);
  if (!mapped) return options;
  return { ...options, metadataPolicy: mapped };
}

/**
 * @param {import('../conversion-plan.js').MetadataPolicy | string | null | undefined} policy
 * @returns {'keep' | 'strip' | 'minimal' | null}
 */
export function mapMetadataPolicy(policy) {
  if (policy === 'strip') return 'strip';
  if (policy === 'strip-gps') return 'minimal';
  if (policy === 'preserve') return 'keep';
  return null;
}

/**
 * @param {import('../converter-job-model.js').ConverterJob} job
 */
export function isMergeParentJob(job) {
  return Boolean(
    job.childJobIds?.length >= 2
    && (job.goalId?.startsWith('merge') || job.mergeGroupId),
  );
}

/**
 * @param {import('../converter-job-model.js').ConverterJob} job
 */
export function isSplitParentJob(job) {
  return Boolean(job.splitSpec && (job.childJobIds?.length || job.goalId?.startsWith('split')));
}

/**
 * @param {object} params
 * @param {ReadonlyArray<import('../converter-job-model.js').ConverterJob>} params.sourceJobs
 * @param {string} [params.outputFormat]
 * @param {() => string} [params.idFactory]
 */
export function createMergeParentJob(params) {
  const sourceJobs = params.sourceJobs ?? [];
  const category = String(sourceJobs[0]?.analysis?.category ?? '');
  const outputFormat = params.outputFormat
    ?? String(sourceJobs[0]?.analysis?.format ?? 'mp4');

  const mergePlan = createMergePlan({
    sourceJobIds: sourceJobs.map((j) => j.id),
    category: /** @type {'audio' | 'video'} */ (category),
    outputFormat,
  });
  if (!mergePlan) {
    throw Object.assign(new Error('Could not create merge plan'), { code: ERROR_CODES.MERGE_INCOMPATIBLE });
  }

  return createJob({
    source: {
      name: `merge-${sourceJobs.length}-files`,
      size: sourceJobs.reduce((sum, j) => sum + (j.source.size ?? 0), 0),
      detectedFormat: outputFormat,
    },
    goalId: 'merge',
    mergeGroupId: mergePlan.mergeGroupId,
    childJobIds: sourceJobs.map((j) => j.id),
    operationId: mergePlan.plan.operationId,
    plan: mergePlan.plan,
    options: mergePlan.plan.options,
  });
}

/**
 * @param {object} params
 * @param {import('../converter-job-model.js').ConverterJob} params.sourceJob
 * @param {import('../split-plan.js').SplitSpec} params.splitSpec
 */
export function createSplitParentJob(params) {
  const { sourceJob, splitSpec } = params;
  return createJob({
    source: { ...sourceJob.source },
    goalId: 'split',
    splitSpec,
    parentJobId: null,
    childJobIds: [],
    operationId: sourceJob.operationId,
    options: { ...sourceJob.options },
    analysis: sourceJob.analysis,
    relativePath: sourceJob.relativePath,
  });
}

/**
 * @param {import('../converter-job-model.js').ConverterJob} parentJob
 * @param {(jobId: string) => import('../converter-job-model.js').ConverterJob | undefined} getJob
 */
export function validateMergeExecution(parentJob, getJob) {
  if (!CONVERTER_FEATURE_FLAGS.ENABLE_V2_MERGE_SPLIT) {
    return {
      ok: false,
      code: ERROR_CODES.MERGE_INCOMPATIBLE,
      message: 'Merge is disabled in this build (ENABLE_V2_MERGE_SPLIT).',
    };
  }

  const childJobs = (parentJob.childJobIds ?? [])
    .map((id) => getJob(id))
    .filter(Boolean);

  const sources = childJobs.map((job) => ({
    category: job?.analysis?.category,
    format: job?.analysis?.format ?? job?.source.detectedFormat,
    width: job?.analysis?.width ?? null,
    height: job?.analysis?.height ?? null,
    sampleRate: job?.analysis?.sampleRate ?? null,
    channels: job?.analysis?.channels ?? null,
  }));

  return validateMergeCompatibility(sources);
}

/**
 * @param {import('../converter-job-model.js').ConverterJob} parentJob
 * @param {import('../converter-job-model.js').ConverterJob} [sourceJob]
 */
export function validateSplitExecution(parentJob, sourceJob) {
  if (!CONVERTER_FEATURE_FLAGS.ENABLE_V2_MERGE_SPLIT) {
    return {
      ok: false,
      code: ERROR_CODES.SPLIT_LIMIT_EXCEEDED,
      message: 'Split is disabled in this build (ENABLE_V2_MERGE_SPLIT).',
    };
  }

  const specResult = validateSplitSpec(parentJob.splitSpec, {
    durationSec: Number((sourceJob ?? parentJob).analysis?.durationSec ?? 0) || null,
    sourceBytes: Number((sourceJob ?? parentJob).source.size ?? 0) || null,
  });
  if (!specResult.ok) return specResult;

  const job = sourceJob ?? parentJob;
  const count = estimateSplitCount(parentJob.splitSpec, {
    durationSec: Number(job.analysis?.durationSec ?? 0) || null,
    sourceBytes: Number(job.source.size ?? 0) || null,
  });
  if (count == null) {
    return {
      ok: false,
      code: ERROR_CODES.SPLIT_LIMIT_EXCEEDED,
      message: 'Unable to estimate split segment count for this source.',
    };
  }
  return { ok: true, count };
}

/**
 * Collect job ids that should be cancelled together (parent + children).
 * @param {import('../converter-job-model.js').ConverterJob} job
 * @param {Readonly<Record<string, import('../converter-job-model.js').ConverterJob>>} state
 */
export function collectJobsForCancel(job, state) {
  /** @type {Set<string>} */
  const ids = new Set([job.id]);

  for (const childId of job.childJobIds ?? []) {
    ids.add(String(childId));
  }

  const parentId = job.parentJobId != null ? String(job.parentJobId) : null;
  if (parentId && state[parentId]) {
    ids.add(parentId);
    for (const siblingId of state[parentId].childJobIds ?? []) {
      ids.add(String(siblingId));
    }
  }

  return [...ids];
}

/**
 * @param {object} params
 * @param {import('../conversion-plan.js').ConversionPlan} params.plan
 * @param {import('../converter-job-model.js').ConverterJob} params.job
 * @param {Record<string, unknown>} params.options
 */
export function applyTargetSizePlan(params) {
  const { plan, job, options } = params;
  if (!plan.targetBytes) {
    return { options, warnings: [], passStrategy: plan.passStrategy ?? 'auto' };
  }

  const category = String(job.analysis?.category ?? job.sourceAnalysis?.category ?? 'unknown');
  const sizePlan = planTargetSize({
    category,
    durationSec: Number(job.analysis?.durationSec ?? job.sourceAnalysis?.durationSec ?? 0) || null,
    sourceBytes: Number(job.source.size ?? 0),
    targetBytes: plan.targetBytes,
    allowTwoPass: plan.passStrategy !== 'one',
  });

  if (!sizePlan) {
    return { options, warnings: ['TARGET_SIZE_APPROX'], passStrategy: plan.passStrategy ?? 'auto' };
  }

  const nextOptions = { ...options };
  if (category === 'video') {
    nextOptions.videoBitrateKbps = sizePlan.bitrateKbps;
  } else if (category === 'audio') {
    nextOptions.bitrateKbps = sizePlan.bitrateKbps;
  } else if (category === 'image') {
    const ratio = plan.targetBytes / Math.max(1, job.source.size ?? 1);
    nextOptions.quality = Math.min(0.95, Math.max(0.35, ratio * 0.9));
  }

  return {
    options: nextOptions,
    warnings: [...sizePlan.warnings],
    passStrategy: sizePlan.passStrategy,
    toleranceRatio: sizePlan.toleranceRatio,
  };
}

/**
 * @param {object} params
 * @param {number} params.measuredBytes
 * @param {import('../conversion-plan.js').ConversionPlan} params.plan
 * @param {number} params.firstPassBitrateKbps
 * @param {number} [params.toleranceRatio]
 */
export function resolveTargetSizeSecondPass(params) {
  if (!CONVERTER_FEATURE_FLAGS.ENABLE_V2_TWO_PASS || !params.plan.targetBytes) {
    return null;
  }
  if (isWithinTargetTolerance(
    params.measuredBytes,
    params.plan.targetBytes,
    params.toleranceRatio ?? 0.12,
  )) {
    return null;
  }
  return suggestSecondPassBitrate({
    firstPassBytes: params.measuredBytes,
    targetBytes: params.plan.targetBytes,
    firstPassBitrateKbps: params.firstPassBitrateKbps,
  });
}

/**
 * @param {object} params
 * @param {number} params.measuredBytes
 * @param {import('../conversion-plan.js').ConversionPlan} params.plan
 * @param {number} [params.toleranceRatio]
 * @returns {ReadonlyArray<string>}
 */
export function targetSizeCompletionWarnings(params) {
  if (!params.plan.targetBytes) return [];
  if (isWithinTargetTolerance(
    params.measuredBytes,
    params.plan.targetBytes,
    params.toleranceRatio ?? 0.12,
  )) {
    return ['TARGET_SIZE_APPROX'];
  }
  return ['TARGET_SIZE_APPROX', 'TARGET_SIZE_FAILED'];
}

/**
 * @param {import('../conversion-plan.js').ConversionPlan} plan
 * @param {ArrayBuffer} buffer
 */
export async function computeOutputChecksum(plan, buffer) {
  if (plan.checksumPolicy !== 'sha256') return null;
  try {
    return await sha256Hex(buffer);
  } catch {
    return null;
  }
}

/**
 * @param {object} params
 * @param {import('../converter-job-model.js').ConverterJob} params.parentJob
 * @param {ReadonlyArray<{ bytes: Uint8Array, ext: string }>} params.sources
 * @param {string} params.outputExt
 * @param {AbortSignal} [params.signal]
 * @param {(ratio: number) => void} [params.onProgress]
 */
export async function executeMergeWithFfmpeg(params) {
  const validation = validateMergeExecution(params.parentJob, () => undefined);
  if (!validation.ok) {
    throw Object.assign(new Error(validation.message), { code: validation.code });
  }

  if (params.sources.length < 2) {
    throw Object.assign(new Error('Merge requires at least two source files'), {
      code: ERROR_CODES.MERGE_INCOMPATIBLE,
    });
  }

  const outputExt = params.outputExt || 'mp4';
  const ffmpeg = await getFfmpegRuntime({ onProgress: params.onProgress });
  const argv = buildFfmpegArgv('concatMedia', {
    inputCount: params.sources.length,
    inputExt: params.sources[0]?.ext ?? 'mp4',
    outputExt,
    mode: 'filter',
  });

  for (let i = 0; i < params.sources.length; i += 1) {
    const name = sanitizeVirtualInput(i, params.sources[i].ext);
    await ffmpeg.writeFile(name, await fetchFile(new Blob([params.sources[i].bytes])));
  }

  const outputName = sanitizeVirtualOutput(outputExt);
  try {
    if (params.signal?.aborted) {
      throw normalizeFfmpegError(new Error('Cancelled'), ERROR_CODES.CANCELLED);
    }
    await ffmpeg.exec(argv);
    const data = await ffmpeg.readFile(outputName);
    const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
    return {
      buffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      mimeType: outputExt === 'mp3' ? 'audio/mpeg' : `video/${outputExt}`,
    };
  } finally {
    for (let i = 0; i < params.sources.length; i += 1) {
      await ffmpeg.deleteFile(sanitizeVirtualInput(i, params.sources[i].ext)).catch(() => {});
    }
    await ffmpeg.deleteFile(outputName).catch(() => {});
  }
}

/**
 * @param {object} params
 * @param {Uint8Array} params.sourceBytes
 * @param {string} params.inputExt
 * @param {string} params.outputExt
 * @param {number} params.startSec
 * @param {number} params.durationSec
 * @param {AbortSignal} [params.signal]
 * @param {(ratio: number) => void} [params.onProgress]
 */
export async function executeSplitSegmentWithFfmpeg(params) {
  const ffmpeg = await getFfmpegRuntime({ onProgress: params.onProgress });
  const inputName = sanitizeVirtualInput(0, params.inputExt);
  const outputName = sanitizeVirtualOutput(params.outputExt);
  const argv = splitMediaSegment({
    inputExt: params.inputExt,
    outputExt: params.outputExt,
    startSec: params.startSec,
    durationSec: params.durationSec,
  });

  await ffmpeg.writeFile(inputName, await fetchFile(new Blob([params.sourceBytes])));
  try {
    if (params.signal?.aborted) {
      throw normalizeFfmpegError(new Error('Cancelled'), ERROR_CODES.CANCELLED);
    }
    await ffmpeg.exec(argv);
    const data = await ffmpeg.readFile(outputName);
    const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
    return {
      buffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      mimeType: `video/${params.outputExt}`,
    };
  } finally {
    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});
  }
}

/**
 * @param {Readonly<Record<string, import('../converter-job-model.js').ConverterJob>>} state
 * @param {ReadonlyArray<string>} [activeJobIds]
 */
export function listActiveCompositeJobs(state, activeJobIds = []) {
  const active = new Set(activeJobIds);
  return Object.values(state).filter(
    (job) => active.has(job.id)
      || (job.parentJobId && active.has(job.parentJobId))
      || job.childJobIds?.some((id) => active.has(id)),
  );
}

export { createAttemptId, JOB_STATUS };
