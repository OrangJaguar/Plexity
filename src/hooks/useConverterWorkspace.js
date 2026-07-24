import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { encodeBlobWithCanvasFallback } from '@/lib/tools/converter/adapters/image-fallback.js';
import { processWithAdapter } from '@/lib/tools/converter/adapters/index.js';
import { createArtifactLeaseManager, safeDelete } from '@/lib/tools/converter/artifact-leases.js';
import { artifactKeyForJob, createArtifactStore } from '@/lib/tools/converter/artifact-store.js';
import {
  getAcceptAttribute,
  getOperationById,
  listOperationsForInputFormat,
  resolveConversionSupport,
} from '@/lib/tools/converter/conversion-capabilities.js';
import { createConversionPlan } from '@/lib/tools/converter/conversion-plan.js';
import { createConversionReport } from '@/lib/tools/converter/conversion-report.js';
import { createSessionHistory } from '@/lib/tools/converter/session-history.js';
import { selectConversionEngine } from '@/lib/tools/converter/converter-engine-selector.js';
import { downloadBlob, shareBlobFile } from '@/lib/tools/converter/converter-download.js';
import { buildOutputFileName } from '@/lib/tools/converter/converter-filenames.js';
import {
  createAttemptId,
  createJob,
  ERROR_CODES,
  isTerminalStatus,
  JOB_STATUS,
} from '@/lib/tools/converter/converter-job-model.js';
import {
  detectDeviceProfile,
  evaluateAdmission,
} from '@/lib/tools/converter/converter-limits.js';
import { overallQueueProgress } from '@/lib/tools/converter/converter-progress.js';
import { createConverterQueue } from '@/lib/tools/converter/converter-queue.js';
import {
  converterReducer,
  createInitialConverterState,
} from '@/lib/tools/converter/converter-reducer.js';
import { createConverterResourceRegistry } from '@/lib/tools/converter/converter-resource-registry.js';
import { createConverterWorkerClient, normalizeClientError } from '@/lib/tools/converter/converter-worker-client.js';
import { resolvePreset } from '@/lib/tools/converter/converter-presets.js';
import {
  normalizeClipboard,
  normalizeDirectoryFiles,
  normalizeFileList,
} from '@/lib/tools/converter/converter-import.js';
import {
  createOutputZip,
  evaluatePackageAdmission,
  jobsToPackageEntries,
  PACKAGE_LIMITS,
} from '@/lib/tools/converter/converter-package.js';
import {
  cancelPackageJob,
  completePackageJob,
  createPackageJob,
  failPackageJob,
  startPackageJob,
  updatePackageJobProgress,
} from '@/lib/tools/converter/converter-package-model.js';
import { inspectFile, INSPECTION_ERROR } from '@/lib/tools/converter/file-inspection.js';
import { runFfmpegJob, cancelFfmpegJob, disposeFfmpegRunner } from '@/lib/tools/converter/ffmpeg/ffmpeg-runner.js';
import { CONVERTER_FEATURE_FLAGS } from '@/lib/tools/converter/converter-feature-flags.js';
import { normalizeSourceAnalysis } from '@/lib/tools/converter/source-analysis.js';
import { TELEMETRY_EVENTS, trackConverterEvent } from '@/lib/tools/converter/converter-telemetry.js';
import { hasRequiredAcknowledgments } from '@/components/tools/converter/converter-ui-utils';
import { estimateOutputSize } from '@/lib/tools/converter/output-estimate.js';
import { listBuiltInRecipes, applyRecipeToSource } from '@/lib/tools/converter/converter-recipes.js';
import { applyRecipeToJobs } from '@/lib/tools/converter/workspace/recipeCoordinator.js';
import {
  applyPlanMetadataToOptions,
  applyTargetSizePlan,
  buildAttemptPlanSnapshot,
  collectJobsForCancel,
  computeOutputChecksum,
  createMergeParentJob,
  executeMergeWithFfmpeg,
  executeSplitSegmentWithFfmpeg,
  isMergeParentJob,
  isSplitParentJob,
  resolveTargetSizeSecondPass,
  targetSizeCompletionWarnings,
  validateMergeExecution,
  validateSplitExecution,
} from '@/lib/tools/converter/workspace/compositeJobs.js';
import {
  buildPackageBuildOptions,
  DEFAULT_WORKSPACE_PACKAGE_STATE,
  normalizeWorkspacePackageState,
} from '@/lib/tools/converter/workspace/packagingPolicy.js';
import {
  getRecipeTargetJobs,
  getSelectedJobs,
  jobToSourceAnalysis,
} from '@/lib/tools/converter/workspace/batch-selection.js';
import { validateMergeCompatibility } from '@/lib/tools/converter/merge-plan.js';

/** @typedef {import('@/lib/tools/converter/converter-job-model.js').ConverterJob} ConverterJob */

const MAX_REJECTIONS = 8;

/**
 * Jobs with analysis complete but reducer status still `analyzing` are ready to convert.
 * @param {ConverterJob | null | undefined} job
 */
export function isJobReadyToConvert(job) {
  if (!job || job.removed || isTerminalStatus(job.status)) return false;
  if (!job.operationId || !job.analysis) return false;
  if (job.status === JOB_STATUS.PROCESSING || job.status === JOB_STATUS.COMPLETED) return false;
  return job.status === JOB_STATUS.ANALYZING || job.status === JOB_STATUS.WAITING;
}

/**
 * @param {ConverterJob | null | undefined} job
 * @param {{ queuedJobIds?: ReadonlySet<string> }} [context]
 */
export function getJobStatusLabel(job, context = {}) {
  if (!job) return '';
  if (job.status === JOB_STATUS.QUEUED || context.queuedJobIds?.has(job.id)) return 'Queued';
  if (job.progress?.phase === 'loading-engine' || job.progress?.phase === 'engine') {
    return 'Loading engine';
  }
  if (job.progress?.phase === 'packaging') return 'Packaging';
  if (job.status === JOB_STATUS.ANALYZING && job.analysis) return 'Ready to convert';
  switch (job.status) {
    case JOB_STATUS.WAITING: return job.analysis ? 'Ready to convert' : 'Waiting';
    case JOB_STATUS.ANALYZING: return 'Analyzing';
    case JOB_STATUS.PROCESSING: return 'Converting';
    case JOB_STATUS.COMPLETED: return 'Complete';
    case JOB_STATUS.FAILED: return 'Failed';
    case JOB_STATUS.CANCELLED: return 'Cancelled';
    default: return job.status;
  }
}

/**
 * Map an operation to an allowlisted FFmpeg builder for non-audio adapters.
 * @param {import('@/lib/tools/converter/conversion-capabilities.js').ConversionOperation} operation
 */
function resolveFfmpegBuilderForOperation(operation) {
  if (operation.id.startsWith('extract-audio') || operation.category === 'extract') {
    const outputExt = operation.extension || operation.outputFormat || 'mp3';
    return {
      builderName: 'extractAudioFromVideo',
      outputExt,
      mimeType: operation.mimeType || 'audio/mpeg',
    };
  }
  if (operation.adapter === 'image') {
    return {
      builderName: 'convertImageViaFfmpeg',
      outputExt: operation.outputFormat === 'jpeg' ? 'jpg' : operation.outputFormat,
      mimeType: operation.mimeType || 'application/octet-stream',
    };
  }
  if (operation.outputFormat === 'mp3' || operation.id.endsWith('-to-mp3')) {
    return {
      builderName: 'convertAudioToMp3',
      outputExt: 'mp3',
      mimeType: 'audio/mpeg',
    };
  }
  return {
    builderName: 'convertVideoToMp4',
    outputExt: operation.outputFormat === 'webm' ? 'mp4' : (operation.extension?.replace('.', '') || 'mp4'),
    mimeType: operation.mimeType || 'video/mp4',
  };
}

/**
 * @param {string} [code]
 */
function mapInspectionError(code) {
  const map = {
    [INSPECTION_ERROR.FILE_EMPTY]: ERROR_CODES.FILE_EMPTY,
    [INSPECTION_ERROR.UNSUPPORTED_FORMAT]: ERROR_CODES.UNSUPPORTED_FORMAT,
    [INSPECTION_ERROR.EXECUTABLE_REJECTED]: ERROR_CODES.UNSUPPORTED_FORMAT,
    [INSPECTION_ERROR.UNTRUSTED_RENDER]: ERROR_CODES.UNSUPPORTED_FORMAT,
    [INSPECTION_ERROR.TEXT_PARSE_FAILED]: ERROR_CODES.INSPECTION_FAILED,
    [INSPECTION_ERROR.FILE_TRUNCATED]: ERROR_CODES.INSPECTION_FAILED,
  };
  return map[code] ?? ERROR_CODES.INSPECTION_FAILED;
}

/**
 * @param {string} [code]
 */
function mapAdmissionError(code) {
  const map = {
    FILE_TOO_LARGE: ERROR_CODES.FILE_TOO_LARGE,
    DIMENSIONS_TOO_LARGE: ERROR_CODES.DIMENSIONS_TOO_LARGE,
    MEMORY_BUDGET_EXCEEDED: ERROR_CODES.MEMORY_BUDGET_EXCEEDED,
  };
  return map[code] ?? ERROR_CODES.ANALYSIS_FAILED;
}

/**
 * @param {import('@/lib/tools/converter/conversion-capabilities.js').ConversionOperation} operation
 */
function defaultOptionsForOperation(operation) {
  /** @type {Record<string, unknown>} */
  const opts = { sizeBias: 0 };
  for (const field of operation.options ?? []) {
    if (field.defaultValue !== undefined) opts[field.key] = field.defaultValue;
    else if (field.default !== undefined) opts[field.key] = field.default;
  }
  return opts;
}

/**
 * @param {string} format
 * @returns {'image' | 'audio' | 'video' | 'data' | 'unknown'}
 */
function categoryForFormat(format) {
  const f = String(format ?? '').toLowerCase().replace(/^\./, '');
  if (['png', 'jpeg', 'jpg', 'webp', 'bmp', 'gif'].includes(f)) return 'image';
  if (['wav', 'mp3', 'm4a', 'aac', 'flac', 'ogg', 'opus'].includes(f)) return 'audio';
  if (['mp4', 'm4v', 'mov', 'webm', 'mkv', 'avi', 'mpeg', 'mpg'].includes(f)) return 'video';
  if (['csv', 'tsv', 'json', 'yaml', 'yml', 'xml', 'txt'].includes(f)) return 'data';
  return 'unknown';
}

/**
 * Prefer a convert op that matches the source media type.
 * Never default video containers to extract-audio.
 *
 * @param {string} format
 * @param {import('@/lib/tools/converter/converter-limits.js').DeviceProfile} deviceProfile
 */
function pickDefaultOperation(format, deviceProfile) {
  const candidates = listOperationsForInputFormat(format);
  const sourceCategory = categoryForFormat(format);
  const supported = candidates.filter((op) => resolveConversionSupport(op, deviceProfile).supported);
  const pool = supported.length ? supported : candidates;

  const preferred = pool.filter((op) => {
    if (String(op.id).startsWith('extract-audio-')) return false;
    if (sourceCategory === 'video') return op.category === 'video';
    if (sourceCategory === 'audio') return op.category === 'audio' && !String(op.id).startsWith('extract-audio-');
    if (sourceCategory === 'image') return op.category === 'image';
    if (sourceCategory === 'data') return op.category === 'data';
    return true;
  });

  return preferred[0] ?? pool.find((op) => !String(op.id).startsWith('extract-audio-')) ?? pool[0] ?? null;
}

/**
 * @param {unknown} error
 */
function normalizeProcessingError(error) {
  if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
    return {
      code: String(/** @type {{ code: string }} */ (error).code),
      message: String(/** @type {{ message: string }} */ (error).message),
    };
  }
  if (error instanceof Error) {
    const err = normalizeClientError({ code: ERROR_CODES.UNKNOWN, message: error.message });
    return { code: err.code, message: err.message };
  }
  return { code: ERROR_CODES.UNKNOWN, message: 'Unknown error' };
}

export function useConverterWorkspace() {
  const [state, dispatch] = useReducer(converterReducer, undefined, createInitialConverterState);
  const [rejections, setRejections] = useState(/** @type {Array<{ id: string, name: string, code: string, message: string }>} */([]));
  const [statusMessage, setStatusMessage] = useState('');
  const [selectedJobIds, setSelectedJobIds] = useState(/** @type {Set<string>} */(new Set()));
  const [acknowledgments, setAcknowledgments] = useState(/** @type {Record<string, Record<string, boolean>>} */({}));
  const [packageProgress, setPackageProgress] = useState(0);
  const [packageError, setPackageError] = useState(/** @type {string | null} */(null));
  const [packageOptions, setPackageOptionsState] = useState(DEFAULT_WORKSPACE_PACKAGE_STATE);
  const [customRecipes, setCustomRecipes] = useState(/** @type {import('@/lib/tools/converter/converter-recipes.js').ConverterRecipe[]} */([]));

  const deviceProfile = useMemo(() => detectDeviceProfile(), []);
  const acceptAttribute = useMemo(() => getAcceptAttribute(), []);

  const filesRef = useRef(/** @type {Map<string, File>} */(new Map()));
  const sourceUrlsRef = useRef(/** @type {Map<string, string>} */(new Map()));
  const artifactStoreRef = useRef(/** @type {import('@/lib/tools/converter/artifact-store.js').ArtifactStore | null} */(null));
  const leaseManagerRef = useRef(createArtifactLeaseManager());
  const registryRef = useRef(createConverterResourceRegistry());
  const workerClientRef = useRef(createConverterWorkerClient());
  const queueRef = useRef(/** @type {ReturnType<typeof createConverterQueue> | null} */(null));
  const activeHandlesRef = useRef(/** @type {Map<string, { cancel: () => void, dispose: () => void }>} */(new Map()));
  const usedOutputNamesRef = useRef(/** @type {Set<string>} */(new Set()));
  const queuedJobIdsRef = useRef(/** @type {Set<string>} */(new Set()));
  const activeFfmpegJobIdsRef = useRef(/** @type {Set<string>} */(new Set()));
  const packageAbortRef = useRef(/** @type {AbortController | null} */(null));
  const packageJobRef = useRef(/** @type {import('@/lib/tools/converter/converter-package-model.js').PackageJob | null} */(null));
  const stateRef = useRef(state);
  const acknowledgmentsRef = useRef(acknowledgments);
  const sessionHistoryRef = useRef(createSessionHistory());
  const packageOptionsRef = useRef(packageOptions);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    acknowledgmentsRef.current = acknowledgments;
  }, [acknowledgments]);

  useEffect(() => {
    packageOptionsRef.current = packageOptions;
  }, [packageOptions]);

  const jobs = useMemo(
    () => Object.values(state).sort((a, b) => a.createdAt - b.createdAt),
    [state],
  );

  const recipes = useMemo(() => {
    const byId = new Map(listBuiltInRecipes().map((recipe) => [recipe.id, recipe]));
    for (const recipe of customRecipes) {
      byId.set(recipe.id, recipe);
    }
    return [...byId.values()];
  }, [customRecipes]);

  const overallProgress = useMemo(() => overallQueueProgress(jobs), [jobs]);

  const canShare = useMemo(
    () => typeof navigator !== 'undefined' && Boolean(navigator.share && navigator.canShare),
    [],
  );

  const dispatchAction = useCallback((action) => {
    dispatch(action);
  }, []);

  const recordSessionHistory = useCallback((job, engine, status = JOB_STATUS.COMPLETED) => {
    sessionHistoryRef.current.add({
      jobId: job.id,
      status,
      category: job.analysis?.category ?? null,
      operationId: job.operationId,
      goalId: job.goalId,
      engine: engine ?? job.engine,
      sourceName: job.source.name,
      completedAt: Date.now(),
    });
  }, []);

  const setPackageOptions = useCallback((partial) => {
    setPackageOptionsState((prev) => normalizeWorkspacePackageState({ ...prev, ...partial }));
  }, []);

  const disposeAttempt = useCallback(async (jobId, attemptId, { keepArtifacts = false } = {}) => {
    const key = `${jobId}:${attemptId}`;
    const handle = activeHandlesRef.current.get(key);
    handle?.releaseWorker?.();
    if (!keepArtifacts) {
      handle?.cancel?.();
    }
    activeHandlesRef.current.delete(key);

    const snap = registryRef.current.snapshot(jobId, attemptId);
    if (keepArtifacts) {
      registryRef.current.releaseWorkersAndControllers(jobId, attemptId);
      return;
    }

    registryRef.current.disposeAttempt(jobId, attemptId);
    if (artifactStoreRef.current) {
      for (const artifactKey of snap.artifactKeys) {
        await safeDelete(artifactStoreRef.current, leaseManagerRef.current, artifactKey);
      }
    }
  }, []);

  const processJob = useCallback(async (jobId, attemptId) => {
    const job = stateRef.current[jobId];
    if (!job || job.attemptId !== attemptId) {
      throw new Error('Stale job');
    }

    const plan = job.plan ?? buildAttemptPlanSnapshot(
      job,
      job.engine,
      acknowledgmentsRef.current[jobId] ?? job.acknowledgments,
    );

    if (isMergeParentJob(job)) {
      const validation = validateMergeExecution(job, (id) => stateRef.current[id]);
      if (!validation.ok) {
        throw Object.assign(new Error(validation.message), { code: validation.code });
      }
      trackConverterEvent(TELEMETRY_EVENTS.CONVERT_START, {
        category: job.analysis?.category ?? 'unknown',
        engine: 'ffmpeg',
        mergeApplied: true,
      });
      const abortController = new AbortController();
      registryRef.current.registerAbortController(jobId, attemptId, abortController);
      activeFfmpegJobIdsRef.current.add(jobId);
      try {
        const sources = [];
        for (const childId of job.childJobIds ?? []) {
          const childFile = filesRef.current.get(childId);
          const childJob = stateRef.current[childId];
          if (!childFile || !childJob) {
            throw Object.assign(new Error('Merge source missing'), { code: ERROR_CODES.MERGE_INCOMPATIBLE });
          }
          sources.push({
            bytes: new Uint8Array(await childFile.arrayBuffer()),
            ext: childJob.source.detectedFormat ?? childJob.analysis?.format ?? 'bin',
          });
        }
        const outputExt = String(job.options?.outputFormat ?? sources[0]?.ext ?? 'mp4');
        const merged = await executeMergeWithFfmpeg({
          parentJob: job,
          sources,
          outputExt,
          signal: abortController.signal,
          onProgress: (ratio) => dispatchAction({
            type: 'PROGRESS',
            jobId,
            attemptId,
            phase: 'processing',
            fraction: 0.1 + ratio * 0.85,
          }),
        });
        const blob = new Blob([merged.buffer], { type: merged.mimeType });
        const fileName = buildOutputFileName({
          sourceName: job.source.name,
          operationId: job.operationId ?? 'merge',
          extension: `.${outputExt}`,
          usedNames: usedOutputNamesRef.current,
        });
        usedOutputNamesRef.current.add(fileName);
        const store = artifactStoreRef.current;
        if (!store) {
          throw Object.assign(new Error('Artifact store unavailable'), { code: ERROR_CODES.PROCESSING_FAILED });
        }
        const artifactKey = artifactKeyForJob(jobId, attemptId);
        await store.put(artifactKey, blob);
        registryRef.current.registerArtifactKey(jobId, attemptId, artifactKey);
        const objectUrl = registryRef.current.registerObjectUrl(jobId, attemptId, URL.createObjectURL(blob));
        const checksum = await computeOutputChecksum(plan, merged.buffer);
        dispatchAction({
          type: 'COMPLETE',
          jobId,
          attemptId,
          output: {
            fileName,
            mimeType: merged.mimeType,
            size: blob.size,
            artifactKey,
            objectUrl,
          },
          checksum,
          completionWarnings: ['MERGE_LOSSY'],
        });
        recordSessionHistory({ ...job, status: JOB_STATUS.COMPLETED }, 'ffmpeg');
        trackConverterEvent(TELEMETRY_EVENTS.CONVERT_COMPLETE, {
          category: job.analysis?.category ?? 'unknown',
          engine: 'ffmpeg',
          outcome: 'success',
          mergeStatus: 'SUCCESS',
        });
        setStatusMessage(`${fileName} merged`);
        return { buffer: merged.buffer, mimeType: merged.mimeType, fileName };
      } finally {
        activeFfmpegJobIdsRef.current.delete(jobId);
      }
    }

    if (isSplitParentJob(job) || job.splitSpec) {
      const validation = validateSplitExecution(job, job);
      if (!validation.ok) {
        throw Object.assign(new Error(validation.message), { code: validation.code });
      }
      const file = filesRef.current.get(jobId);
      if (!file) {
        throw Object.assign(new Error('Source file missing'), { code: ERROR_CODES.PROCESSING_FAILED });
      }
      trackConverterEvent(TELEMETRY_EVENTS.CONVERT_START, {
        category: job.analysis?.category ?? 'unknown',
        engine: 'ffmpeg',
        splitApplied: true,
      });
      const abortController = new AbortController();
      registryRef.current.registerAbortController(jobId, attemptId, abortController);
      activeFfmpegJobIdsRef.current.add(jobId);
      const sourceBytes = new Uint8Array(await file.arrayBuffer());
      const inputExt = job.source.detectedFormat ?? job.analysis?.format ?? 'mp4';
      const outputExt = inputExt;
      const segmentDuration = job.splitSpec?.mode === 'duration'
        ? Number(job.splitSpec.value)
        : 60;
      try {
        const splitResult = await executeSplitSegmentWithFfmpeg({
          sourceBytes,
          inputExt,
          outputExt,
          startSec: 0,
          durationSec: segmentDuration,
          signal: abortController.signal,
          onProgress: (ratio) => dispatchAction({
            type: 'PROGRESS',
            jobId,
            attemptId,
            phase: 'processing',
            fraction: 0.1 + ratio * 0.85,
          }),
        });
        const blob = new Blob([splitResult.buffer], { type: splitResult.mimeType });
        const fileName = buildOutputFileName({
          sourceName: job.source.name.replace(/(\.[^.]+)?$/, '-part1$1'),
          operationId: job.operationId ?? 'split',
          extension: `.${outputExt}`,
          usedNames: usedOutputNamesRef.current,
        });
        usedOutputNamesRef.current.add(fileName);
        const store = artifactStoreRef.current;
        if (!store) {
          throw Object.assign(new Error('Artifact store unavailable'), { code: ERROR_CODES.PROCESSING_FAILED });
        }
        const artifactKey = artifactKeyForJob(jobId, attemptId);
        await store.put(artifactKey, blob);
        registryRef.current.registerArtifactKey(jobId, attemptId, artifactKey);
        const objectUrl = registryRef.current.registerObjectUrl(jobId, attemptId, URL.createObjectURL(blob));
        const checksum = await computeOutputChecksum(plan, splitResult.buffer);
        dispatchAction({
          type: 'COMPLETE',
          jobId,
          attemptId,
          output: {
            fileName,
            mimeType: splitResult.mimeType,
            size: blob.size,
            artifactKey,
            objectUrl,
          },
          checksum,
          completionWarnings: ['SPLIT_LOSSY'],
        });
        recordSessionHistory({ ...job, status: JOB_STATUS.COMPLETED }, 'ffmpeg');
        trackConverterEvent(TELEMETRY_EVENTS.CONVERT_COMPLETE, {
          category: job.analysis?.category ?? 'unknown',
          engine: 'ffmpeg',
          outcome: 'success',
          splitStatus: 'PARTIAL',
        });
        setStatusMessage(`${fileName} split (first segment)`);
        return { buffer: splitResult.buffer, mimeType: splitResult.mimeType, fileName };
      } finally {
        activeFfmpegJobIdsRef.current.delete(jobId);
      }
    }

    const file = filesRef.current.get(jobId);
    if (!file) {
      throw Object.assign(new Error('Source file missing'), { code: ERROR_CODES.PROCESSING_FAILED });
    }

    const operationId = plan.operationId || job.operationId || '';
    const operation = getOperationById(operationId);
    if (!operation) {
      throw Object.assign(new Error('No operation selected'), { code: ERROR_CODES.OPERATION_UNSUPPORTED });
    }

    const targetSizeResult = applyTargetSizePlan({
      plan,
      job,
      options: plan.options ? { ...plan.options } : { ...job.options },
    });
    let frozenOptions = applyPlanMetadataToOptions(
      plan.metadataPolicy,
      targetSizeResult.options,
    );

    const support = resolveConversionSupport(operation, deviceProfile);
    if (!support.supported) {
      throw Object.assign(new Error(`Operation unsupported: ${support.reason}`), { code: ERROR_CODES.OPERATION_UNSUPPORTED });
    }

    const engineSelection = selectConversionEngine(operation, deviceProfile, {
      ffmpegLoaded: CONVERTER_FEATURE_FLAGS.ENABLE_FFMPEG,
    });
    if (!engineSelection.engine) {
      throw Object.assign(new Error(engineSelection.reason || 'No conversion engine available'), {
        code: ERROR_CODES.OPERATION_UNSUPPORTED,
      });
    }

    trackConverterEvent(TELEMETRY_EVENTS.CONVERT_START, {
      category: operation.category,
      engine: engineSelection.engine,
      goalId: plan.goalId,
      targetSizeApplied: Boolean(plan.targetBytes),
    });

    const sourceBytes = new Uint8Array(await file.arrayBuffer());
    const abortController = new AbortController();
    registryRef.current.registerAbortController(jobId, attemptId, abortController);

    const onProgress = (phase, fraction) => {
      dispatchAction({
        type: 'PROGRESS',
        jobId,
        attemptId,
        phase,
        fraction,
      });
    };

    /** @type {{ buffer?: ArrayBuffer, mimeType: string, fileName: string, metadata?: Record<string, unknown> } | null} */
    let outputPayload = null;
    const usesFfmpeg = engineSelection.engine === 'ffmpeg';
    if (usesFfmpeg) activeFfmpegJobIdsRef.current.add(jobId);

    try {
      if (usesFfmpeg) {
        onProgress('loading-engine', 0.05);
        trackConverterEvent(TELEMETRY_EVENTS.RUNTIME_LOAD, { engine: 'ffmpeg' });
        if (operation.adapter === 'audio') {
          // Audio adapter already serializes through runFfmpegJob.
          const result = await processWithAdapter(operation.id, sourceBytes, {
            operationId: operation.id,
            options: frozenOptions,
            signal: abortController.signal,
            onProgress: (phase, fraction) => onProgress(phase === 'processing' ? 'processing' : phase, fraction),
          }, job.source.name);
          outputPayload = {
            buffer: await result.blob.arrayBuffer(),
            mimeType: result.mimeType,
            fileName: result.fileName || buildOutputFileName({
              sourceName: job.source.name,
              operationId: operation.id,
              extension: operation.extension,
              usedNames: usedOutputNamesRef.current,
            }),
            metadata: { ...(result.metadata ?? {}), engine: 'ffmpeg' },
          };
        } else {
          const builder = resolveFfmpegBuilderForOperation(operation);
          const result = await runFfmpegJob({
            builderName: builder.builderName,
            builderParams: {
              ...frozenOptions,
              inputExt: operation.inputFormats?.[0] ?? job.source.detectedFormat ?? 'bin',
              outputExt: builder.outputExt,
              bitrateKbps: frozenOptions.bitrateKbps ?? 192,
              videoBitrateKbps: frozenOptions.videoBitrateKbps ?? 2500,
            },
            sourceBytes,
            inputExt: operation.inputFormats?.[0] ?? job.source.detectedFormat ?? 'bin',
            outputExt: builder.outputExt,
            mimeType: builder.mimeType,
            fileName: buildOutputFileName({
              sourceName: job.source.name,
              operationId: operation.id,
              extension: `.${builder.outputExt}`,
              usedNames: usedOutputNamesRef.current,
            }),
            signal: abortController.signal,
            onProgress: (ratio) => onProgress('processing', 0.1 + ratio * 0.85),
          });
          outputPayload = {
            buffer: await result.blob.arrayBuffer(),
            mimeType: result.mimeType,
            fileName: result.fileName || buildOutputFileName({
              sourceName: job.source.name,
              operationId: operation.id,
              extension: `.${builder.outputExt}`,
              usedNames: usedOutputNamesRef.current,
            }),
            metadata: { ...(result.metadata ?? {}), engine: 'ffmpeg' },
          };
        }
      } else if (operation.adapter === 'image' && !deviceProfile.hasOffscreenCanvas && deviceProfile.hasCanvas) {
        onProgress('processing', 0.1);
        const outBlob = await encodeBlobWithCanvasFallback(
          new Blob([sourceBytes], { type: file.type || operation.mimeType }),
          operation.outputFormat,
          frozenOptions,
          abortController.signal,
        );
        onProgress('processing', 0.95);
        outputPayload = {
          buffer: await outBlob.arrayBuffer(),
          mimeType: outBlob.type || operation.mimeType,
          fileName: buildOutputFileName({
            sourceName: job.source.name,
            operationId: operation.id,
            extension: operation.extension,
            usedNames: usedOutputNamesRef.current,
          }),
          metadata: job.analysis ?? {},
        };
      } else if (deviceProfile.hasWorkers && operation.adapter !== 'audio') {
        const handle = workerClientRef.current.startJob({
          jobId,
          attemptId,
          operationId: operation.id,
          sourceBytes,
          sourceName: job.source.name,
          options: frozenOptions,
          mode: 'process',
          onProgress,
        });
        activeHandlesRef.current.set(`${jobId}:${attemptId}`, handle);
        const payload = /** @type {{ buffer: ArrayBuffer, mimeType: string, fileName: string, metadata?: Record<string, unknown> }} */ (
          await handle.result
        );
        outputPayload = payload;
        activeHandlesRef.current.delete(`${jobId}:${attemptId}`);
      } else {
        onProgress('processing', 0.1);
        const result = await processWithAdapter(operation.id, sourceBytes, {
          operationId: operation.id,
          options: frozenOptions,
          signal: abortController.signal,
          onProgress,
        }, job.source.name);
        onProgress('processing', 0.95);
        outputPayload = {
          buffer: await result.blob.arrayBuffer(),
          mimeType: result.mimeType,
          fileName: result.fileName,
          metadata: result.metadata ?? {},
        };
      }
    } finally {
      activeFfmpegJobIdsRef.current.delete(jobId);
    }

    if (!outputPayload?.buffer) {
      throw Object.assign(new Error('Empty output'), { code: ERROR_CODES.PROCESSING_FAILED });
    }

    if (plan.targetBytes && outputPayload.buffer) {
      const firstBitrate = Number(
        frozenOptions.videoBitrateKbps ?? frozenOptions.bitrateKbps ?? targetSizeResult.options.videoBitrateKbps ?? 128,
      );
      const secondBitrate = resolveTargetSizeSecondPass({
        firstPassBytes: outputPayload.buffer.byteLength,
        targetBytes: plan.targetBytes,
        firstPassBitrateKbps: firstBitrate,
        toleranceRatio: targetSizeResult.toleranceRatio,
      });
      if (secondBitrate && usesFfmpeg) {
        const secondOptions = {
          ...frozenOptions,
          videoBitrateKbps: operation.category === 'video' ? secondBitrate : frozenOptions.videoBitrateKbps,
          bitrateKbps: operation.category === 'audio' ? secondBitrate : frozenOptions.bitrateKbps,
        };
        if (operation.adapter === 'audio') {
          const retry = await processWithAdapter(operation.id, sourceBytes, {
            operationId: operation.id,
            options: secondOptions,
            signal: abortController.signal,
            onProgress: (phase, fraction) => onProgress(phase === 'processing' ? 'processing' : phase, fraction),
          }, job.source.name);
          outputPayload = {
            buffer: await retry.blob.arrayBuffer(),
            mimeType: retry.mimeType,
            fileName: outputPayload.fileName,
            metadata: retry.metadata ?? {},
          };
        } else {
          const builder = resolveFfmpegBuilderForOperation(operation);
          const retry = await runFfmpegJob({
            builderName: builder.builderName,
            builderParams: {
              ...secondOptions,
              inputExt: operation.inputFormats?.[0] ?? job.source.detectedFormat ?? 'bin',
              outputExt: builder.outputExt,
              bitrateKbps: secondOptions.bitrateKbps ?? 192,
              videoBitrateKbps: secondOptions.videoBitrateKbps ?? 2500,
            },
            sourceBytes,
            inputExt: operation.inputFormats?.[0] ?? job.source.detectedFormat ?? 'bin',
            outputExt: builder.outputExt,
            mimeType: builder.mimeType,
            fileName: outputPayload.fileName,
            signal: abortController.signal,
            onProgress: (ratio) => onProgress('processing', 0.1 + ratio * 0.85),
          });
          outputPayload = {
            buffer: await retry.blob.arrayBuffer(),
            mimeType: retry.mimeType,
            fileName: outputPayload.fileName,
            metadata: retry.metadata ?? {},
          };
        }
      }
    }

    const blob = new Blob([outputPayload.buffer], { type: outputPayload.mimeType });
    const fileName = outputPayload.fileName || buildOutputFileName({
      sourceName: job.source.name,
      operationId: operation.id,
      extension: operation.extension,
      usedNames: usedOutputNamesRef.current,
    });
    usedOutputNamesRef.current.add(fileName);

    const store = artifactStoreRef.current;
    if (!store) {
      throw Object.assign(new Error('Artifact store unavailable'), { code: ERROR_CODES.PROCESSING_FAILED });
    }

    const artifactKey = artifactKeyForJob(jobId, attemptId);
    await store.put(artifactKey, blob);
    registryRef.current.registerArtifactKey(jobId, attemptId, artifactKey);
    const objectUrl = registryRef.current.registerObjectUrl(jobId, attemptId, URL.createObjectURL(blob));

    const completionWarnings = [
      ...new Set([
        ...(targetSizeResult.warnings ?? []),
        ...targetSizeCompletionWarnings({
          measuredBytes: blob.size,
          plan,
          toleranceRatio: targetSizeResult.toleranceRatio,
        }),
      ]),
    ];
    const checksum = await computeOutputChecksum(plan, outputPayload.buffer);

    dispatchAction({
      type: 'COMPLETE',
      jobId,
      attemptId,
      output: {
        fileName,
        mimeType: outputPayload.mimeType,
        size: blob.size,
        artifactKey,
        objectUrl,
      },
      checksum,
      completionWarnings,
    });

    recordSessionHistory({ ...job, status: JOB_STATUS.COMPLETED }, engineSelection.engine);

    trackConverterEvent(TELEMETRY_EVENTS.CONVERT_COMPLETE, {
      category: operation.category,
      engine: engineSelection.engine,
      outcome: 'success',
      goalId: plan.goalId,
      targetSizeStatus: plan.targetBytes
        ? (completionWarnings.includes('TARGET_SIZE_FAILED') ? 'APPROX' : 'OK')
        : undefined,
    });
    setStatusMessage(`${fileName} converted`);
    return outputPayload;
  }, [deviceProfile, dispatchAction, recordSessionHistory]);

  const createQueue = useCallback(() => createConverterQueue({
    lanes: {
      native: Math.max(1, deviceProfile.concurrency),
      ffmpeg: 1,
    },
    onJobStart: (jobId, attemptId) => {
      queuedJobIdsRef.current.delete(jobId);
      const job = stateRef.current[jobId];
      const operation = getOperationById(job?.operationId ?? '');
      const engineSelection = operation
        ? selectConversionEngine(operation, deviceProfile, {
          ffmpegLoaded: CONVERTER_FEATURE_FLAGS.ENABLE_FFMPEG,
        })
        : { engine: null };
      const plan = buildAttemptPlanSnapshot(
        job,
        engineSelection.engine,
        acknowledgmentsRef.current[jobId] ?? job?.acknowledgments ?? {},
      );

      dispatchAction({
        type: 'PROCESS_START',
        jobId,
        attemptId,
        engine: engineSelection.engine,
        plan,
      });

      const handle = {
        cancel: () => {
          activeHandlesRef.current.get(`${jobId}:${attemptId}`)?.cancel?.();
          if (activeFfmpegJobIdsRef.current.has(jobId)) {
            void cancelFfmpegJob();
          }
        },
        releaseWorker: () => {
          activeHandlesRef.current.get(`${jobId}:${attemptId}`)?.dispose?.();
          activeHandlesRef.current.delete(`${jobId}:${attemptId}`);
          registryRef.current.releaseWorkersAndControllers(jobId, attemptId);
        },
        dispose: () => {
          void disposeAttempt(jobId, attemptId);
        },
      };

      void processJob(jobId, attemptId)
        .then(() => {
          queueRef.current?.complete(jobId, attemptId);
        })
        .catch((error) => {
          const normalized = normalizeProcessingError(error);
          trackConverterEvent(TELEMETRY_EVENTS.CONVERT_FAIL, {
            category: operation?.category,
            engine: engineSelection.engine,
            outcome: normalized.code === ERROR_CODES.CANCELLED ? 'cancel' : 'fail',
            code: normalized.code,
          });
          if (normalized.code === ERROR_CODES.CANCELLED || normalized.code === ERROR_CODES.INTERRUPTED) {
            dispatchAction({ type: 'CANCEL', jobId, attemptId });
          } else {
            dispatchAction({
              type: 'FAIL',
              jobId,
              attemptId,
              error: normalized,
            });
            setStatusMessage(normalized.message);
          }
          queueRef.current?.fail(jobId, attemptId, error);
        });

      return Promise.resolve(handle);
    },
  }), [deviceProfile, dispatchAction, disposeAttempt, processJob]);

  useEffect(() => {
    let cancelled = false;

    createArtifactStore().then((store) => {
      if (cancelled) {
        void store.dispose();
        return;
      }
      artifactStoreRef.current = store;
    });

    queueRef.current = createQueue();

    return () => {
      cancelled = true;
      packageAbortRef.current?.abort();
      packageAbortRef.current = null;
      queueRef.current?.dispose();
      registryRef.current.disposeAll();
      leaseManagerRef.current.disposeAll();
      void artifactStoreRef.current?.dispose();
      void disposeFfmpegRunner();
      sessionHistoryRef.current.dispose();
      sessionHistoryRef.current = createSessionHistory();
      filesRef.current.clear();
      queuedJobIdsRef.current.clear();
      activeFfmpegJobIdsRef.current.clear();
    };
  }, [createQueue]);

  const analyzeFile = useCallback(async (file, importMeta = {}) => {
    const inspection = await inspectFile(file);
    if (!inspection.ok) {
      setRejections((prev) => [
        {
          id: `${Date.now()}-${file.name}`,
          name: file.name,
          code: mapInspectionError(inspection.code),
          message: inspection.message ?? 'Unsupported file',
        },
        ...prev,
      ].slice(0, MAX_REJECTIONS));
      return;
    }

    const job = createJob({
      source: {
        name: file.name,
        size: file.size,
        mimeType: file.type || inspection.mimeType,
        lastModified: file.lastModified,
        detectedFormat: inspection.format,
        detectedMime: inspection.mimeType,
        warnings: inspection.warnings ?? [],
      },
      relativePath: importMeta.relativePath ?? null,
    });

    filesRef.current.set(job.id, file);
    dispatchAction({ type: 'ADD_JOB', job });
    dispatchAction({ type: 'ANALYZE_START', jobId: job.id, attemptId: job.attemptId });

    const defaultOp = pickDefaultOperation(inspection.format ?? '', deviceProfile);
    if (!defaultOp) {
      dispatchAction({
        type: 'ANALYZE_FAIL',
        jobId: job.id,
        attemptId: job.attemptId,
        error: {
          code: ERROR_CODES.OPERATION_UNSUPPORTED,
          message: `No conversion available for ${inspection.format}`,
        },
      });
      return;
    }

    const support = resolveConversionSupport(defaultOp, deviceProfile);
    if (!support.supported) {
      dispatchAction({
        type: 'ANALYZE_FAIL',
        jobId: job.id,
        attemptId: job.attemptId,
        error: {
          code: ERROR_CODES.OPERATION_UNSUPPORTED,
          message: support.reason,
        },
      });
      return;
    }

    const admission = evaluateAdmission({
      deviceProfile,
      sourceBytes: file.size,
      adapter: defaultOp.adapter,
    });

    if (!admission.admitted) {
      dispatchAction({
        type: 'ANALYZE_FAIL',
        jobId: job.id,
        attemptId: job.attemptId,
        error: {
          code: mapAdmissionError(admission.code),
          message: admission.message ?? 'File rejected',
        },
      });
      return;
    }

    /** @type {Record<string, unknown>} */
    const analysis = {
      format: inspection.format,
      category: categoryForFormat(inspection.format ?? ''),
      warnings: [
        ...(inspection.warnings ?? []),
        ...(admission.warnings ?? []),
      ],
    };

    dispatchAction({
      type: 'ANALYZE_SUCCESS',
      jobId: job.id,
      attemptId: job.attemptId,
      analysis,
    });

    dispatchAction({
      type: 'SET_OPERATION',
      jobId: job.id,
      operationId: defaultOp.id,
      options: defaultOptionsForOperation(defaultOp),
    });

    setStatusMessage(`${file.name} ready to convert`);

    if (deviceProfile.hasWorkers) {
      try {
        const sourceBytes = new Uint8Array(await file.arrayBuffer());
        const handle = workerClientRef.current.startJob({
          jobId: job.id,
          attemptId: job.attemptId,
          operationId: defaultOp.id,
          sourceBytes,
          options: defaultOptionsForOperation(defaultOp),
          mode: 'analyze',
          onProgress: (phase, fraction) => {
            dispatchAction({
              type: 'PROGRESS',
              jobId: job.id,
              attemptId: job.attemptId,
              phase,
              fraction,
            });
          },
        });
        const enriched = /** @type {Record<string, unknown>} */ (await handle.result);
        const width = Number(enriched.width ?? enriched.metadata?.width ?? 0);
        const height = Number(enriched.height ?? enriched.metadata?.height ?? 0);
        const durationSec = Number(enriched.durationSec ?? 0);
        const readmit = evaluateAdmission({
          deviceProfile,
          sourceBytes: file.size,
          adapter: defaultOp.adapter,
          width,
          height,
          durationSec,
        });
        if (!readmit.admitted) {
          dispatchAction({
            type: 'ANALYZE_FAIL',
            jobId: job.id,
            attemptId: job.attemptId,
            error: {
              code: mapAdmissionError(readmit.code),
              message: readmit.message ?? 'File rejected after analysis',
            },
          });
          return;
        }
        const sourceAnalysis = normalizeSourceAnalysis({
          inspection,
          adapterAnalysis: { ...analysis, ...enriched },
        });
        dispatchAction({
          type: 'ANALYZE_SUCCESS',
          jobId: job.id,
          attemptId: job.attemptId,
          analysis: {
            ...analysis,
            ...enriched,
            ...sourceAnalysis,
            warnings: [
              ...(analysis.warnings ?? []),
              ...(readmit.warnings ?? []),
              ...(sourceAnalysis.warnings ?? []),
            ],
          },
        });
      } catch {
        // Keep header-based analysis when worker enrichment fails.
      }
    }
  }, [deviceProfile, dispatchAction]);

  const appendRejections = useCallback((items) => {
    if (!items.length) return;
    setRejections((prev) => [
      ...items.map((item) => ({
        id: `${Date.now()}-${item.name}-${Math.random().toString(36).slice(2, 7)}`,
        name: item.name,
        code: item.code,
        message: item.message,
      })),
      ...prev,
    ].slice(0, MAX_REJECTIONS));
  }, []);

  const ingestAcceptedFiles = useCallback(async (accepted) => {
    if (!accepted.length) return;
    trackConverterEvent(TELEMETRY_EVENTS.IMPORT, { outcome: 'success' });
    setStatusMessage(`Adding ${accepted.length} file${accepted.length === 1 ? '' : 's'}…`);
    for (const entry of accepted) {
      const file = entry?.file instanceof File ? entry.file : entry;
      const relativePath = entry?.relativePath ?? null;
      try {
        await analyzeFile(file, { relativePath });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not read file';
        appendRejections([{
          name: file.name,
          code: ERROR_CODES.INSPECTION_FAILED,
          message,
        }]);
      }
    }
  }, [analyzeFile, appendRejections]);

  const addFiles = useCallback(async (input) => {
    const { accepted, rejections: importRejections } = normalizeFileList(input);
    appendRejections(importRejections);
    await ingestAcceptedFiles(accepted);
  }, [appendRejections, ingestAcceptedFiles]);

  const addFolder = useCallback(async (input) => {
    const { accepted, rejections: importRejections } = normalizeDirectoryFiles(input);
    appendRejections(importRejections);
    await ingestAcceptedFiles(accepted);
  }, [appendRejections, ingestAcceptedFiles]);

  const pasteFromClipboard = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.read) {
      setStatusMessage('Paste is not supported in this browser');
      return;
    }
    try {
      const items = await navigator.clipboard.read();
      const { accepted, rejections: importRejections } = await normalizeClipboard(items);
      appendRejections(importRejections);
      await ingestAcceptedFiles(accepted);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not paste from clipboard';
      setStatusMessage(message);
    }
  }, [appendRejections, ingestAcceptedFiles]);

  const recheckAdmissionForJob = useCallback((jobId) => {
    const job = stateRef.current[jobId];
    const file = filesRef.current.get(jobId);
    const op = getOperationById(job?.operationId ?? '');
    if (!job || !file || !op || job.status === JOB_STATUS.PROCESSING) return true;
    const admission = evaluateAdmission({
      deviceProfile,
      sourceBytes: file.size,
      adapter: op.adapter,
      width: Number(job.analysis?.width ?? 0),
      height: Number(job.analysis?.height ?? 0),
      durationSec: Number(job.analysis?.durationSec ?? 0),
    });
    if (!admission.admitted) {
      setStatusMessage(admission.message ?? 'File exceeds conversion limits for this plan');
      return false;
    }
    return true;
  }, [deviceProfile]);

  const setOperation = useCallback((jobId, operationId, options) => {
    const job = stateRef.current[jobId];
    if (job?.status === JOB_STATUS.PROCESSING || job?.status === JOB_STATUS.QUEUED) return;
    const op = getOperationById(operationId);
    dispatchAction({
      type: 'SET_OPERATION',
      jobId,
      operationId,
      options: options ?? (op ? defaultOptionsForOperation(op) : job?.options),
    });
    recheckAdmissionForJob(jobId);
  }, [dispatchAction, recheckAdmissionForJob]);

  const setOptions = useCallback((jobId, options) => {
    const job = stateRef.current[jobId];
    if (!job?.operationId) return;
    if (job.status === JOB_STATUS.PROCESSING || job.status === JOB_STATUS.QUEUED) return;
    const mergedOptions = { ...job.options, ...options };
    const operation = getOperationById(job.operationId);
    const estimate = operation
      ? estimateOutputSize({
        category: String(job.analysis?.category ?? operation.category),
        sourceBytes: job.source.size,
        operation,
        options: mergedOptions,
        durationSec: Number(job.analysis?.durationSec ?? 0) || null,
      })
      : null;
    dispatchAction({
      type: 'SET_OPERATION',
      jobId,
      operationId: job.operationId,
      options: mergedOptions,
      plan: job.plan
        ? createConversionPlan({
          ...job.plan,
          options: mergedOptions,
          estimate,
        })
        : job.plan,
    });
    recheckAdmissionForJob(jobId);
  }, [dispatchAction, recheckAdmissionForJob]);

  const setPlanFields = useCallback((jobId, partialPlan) => {
    const job = stateRef.current[jobId];
    if (!job?.operationId) return;
    if (job.status === JOB_STATUS.PROCESSING || job.status === JOB_STATUS.QUEUED) return;
    const operation = getOperationById(job.operationId);
    const nextOptions = partialPlan.options
      ? { ...job.options, ...partialPlan.options }
      : job.options;
    const nextPlan = createConversionPlan({
      ...(job.plan ?? {
        goalId: job.goalId ?? 'manual',
        operationId: job.operationId,
        options: nextOptions,
        warnings: job.analysis?.warnings ?? [],
        acknowledged: acknowledgmentsRef.current[jobId] ?? {},
      }),
      ...partialPlan,
      operationId: job.operationId,
      options: nextOptions,
      estimate: operation
        ? estimateOutputSize({
          category: String(job.analysis?.category ?? operation.category),
          sourceBytes: job.source.size,
          operation,
          options: nextOptions,
          durationSec: Number(job.analysis?.durationSec ?? 0) || null,
        })
        : job.plan?.estimate ?? null,
    });
    dispatchAction({
      type: 'SET_OPERATION',
      jobId,
      operationId: job.operationId,
      options: nextOptions,
      plan: nextPlan,
    });
    recheckAdmissionForJob(jobId);
  }, [dispatchAction, recheckAdmissionForJob]);

  const applyGoalSuggestion = useCallback((suggestion) => {
    const targets = selectedJobIds.size
      ? getSelectedJobs(jobs, selectedJobIds)
      : jobs.filter((job) => job.analysis?.format);
    let applied = 0;
    for (const job of targets) {
      if (
        job.removed
        || job.status === JOB_STATUS.COMPLETED
        || job.status === JOB_STATUS.PROCESSING
        || job.status === JOB_STATUS.QUEUED
      ) {
        continue;
      }
      dispatchAction({
        type: 'SET_OPERATION',
        jobId: job.id,
        operationId: suggestion.plan.operationId,
        options: suggestion.plan.options,
        goalId: suggestion.plan.goalId,
        plan: createConversionPlan({
          ...suggestion.plan,
          acknowledged: acknowledgmentsRef.current[job.id] ?? {},
        }),
      });
      recheckAdmissionForJob(job.id);
      applied += 1;
    }
    if (applied > 0) {
      setStatusMessage(`Applied destination to ${applied} file${applied === 1 ? '' : 's'}`);
    } else {
      setStatusMessage('No compatible files to update');
    }
  }, [dispatchAction, jobs, recheckAdmissionForJob, selectedJobIds]);

  const importRecipe = useCallback((recipe) => {
    setCustomRecipes((prev) => {
      const next = prev.filter((entry) => entry.id !== recipe.id);
      return [recipe, ...next];
    });
    setStatusMessage(`Imported recipe “${recipe.label}”`);
  }, []);

  const applyRecipeToSelected = useCallback((recipeId) => {
    const jobIds = getRecipeTargetJobs(jobs, selectedJobIds).map((job) => job.id);
    const recipe = recipes.find((entry) => entry.id === recipeId) ?? null;
    const summary = applyRecipeToJobs({
      recipeId,
      recipe,
      jobIds,
      getJob: (jobId) => stateRef.current[jobId],
      dispatch: dispatchAction,
      acknowledgments: acknowledgmentsRef.current,
      recheckAdmission: recheckAdmissionForJob,
    });
    trackConverterEvent(TELEMETRY_EVENTS.PRESET_APPLY, {
      presetId: recipeId,
      outcome: summary.applied > 0 ? 'success' : 'fail',
      recipeApplied: summary.applied > 0,
    });
    if (summary.applied > 0) {
      const skipNote = summary.skipped > 0 ? ` (${summary.skipped} skipped)` : '';
      setStatusMessage(`Applied recipe to ${summary.applied} file${summary.applied === 1 ? '' : 's'}${skipNote}`);
    } else {
      setStatusMessage(summary.skips[0]?.reason ?? 'No compatible files for this recipe');
    }
    return summary;
  }, [dispatchAction, jobs, recipes, recheckAdmissionForJob, selectedJobIds]);

  const toggleSelect = useCallback((jobId, selected) => {
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(jobId);
      else next.delete(jobId);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedJobIds(new Set(Object.keys(stateRef.current)));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedJobIds(new Set());
  }, []);

  const setAcknowledgment = useCallback((jobId, warningCode, acknowledged) => {
    setAcknowledgments((prev) => ({
      ...prev,
      [jobId]: {
        ...(prev[jobId] ?? {}),
        [warningCode]: acknowledged,
      },
    }));
  }, []);

  const applyPresetToSelected = useCallback((presetId, presetOptions = {}) => {
    const targets = selectedJobIds.size
      ? [...selectedJobIds]
      : Object.keys(stateRef.current);

    let applied = 0;
    let skipped = 0;
    for (const jobId of targets) {
      const job = stateRef.current[jobId];
      if (!job || job.removed || job.status === JOB_STATUS.COMPLETED) {
        skipped += 1;
        continue;
      }
      if (
        job.status === JOB_STATUS.PROCESSING
        || job.status === JOB_STATUS.QUEUED
      ) {
        skipped += 1;
        continue;
      }
      const resolved = resolvePreset(presetId, {
        format: job.source.detectedFormat ?? job.analysis?.format,
        category: job.analysis?.category,
        width: job.analysis?.width,
        height: job.analysis?.height,
        hasAlpha: job.analysis?.hasAlpha,
        animated: job.analysis?.animated,
        ...job.analysis,
      }, presetOptions);
      if (!resolved) {
        skipped += 1;
        continue;
      }
      dispatchAction({
        type: 'SET_OPERATION',
        jobId,
        operationId: resolved.operationId,
        options: resolved.options,
        goalId: resolved.goalId,
        plan: createConversionPlan({
          goalId: resolved.goalId,
          operationId: resolved.operationId,
          options: resolved.options,
          warnings: resolved.warnings,
          acknowledged: acknowledgmentsRef.current[jobId] ?? {},
          targetBytes: Number(resolved.options?.targetBytes) > 0
            ? Number(resolved.options.targetBytes)
            : null,
          relativePath: job.relativePath,
          passStrategy: resolved.goalId === 'under-size' ? 'auto' : 'auto',
        }),
      });
      recheckAdmissionForJob(jobId);
      applied += 1;
    }
    trackConverterEvent(TELEMETRY_EVENTS.PRESET_APPLY, {
      presetId,
      outcome: applied > 0 ? 'success' : 'fail',
    });
    if (applied > 0) {
      const skipNote = skipped > 0 ? ` (skipped ${skipped} incompatible or active)` : '';
      setStatusMessage(`Applied preset to ${applied} file${applied === 1 ? '' : 's'}${skipNote}`);
    } else if (skipped > 0) {
      setStatusMessage(`Could not apply preset — ${skipped} file${skipped === 1 ? '' : 's'} skipped`);
    }
  }, [dispatchAction, recheckAdmissionForJob, selectedJobIds]);

  const enqueueReadyJob = useCallback((jobId) => {
    const job = stateRef.current[jobId];
    if (!job || !isJobReadyToConvert(job)) return false;
    if (!hasRequiredAcknowledgments(job, acknowledgmentsRef.current)) return false;
    if (!recheckAdmissionForJob(jobId)) return false;

    const operation = getOperationById(job.operationId ?? '');
    const engineSelection = operation
      ? selectConversionEngine(operation, deviceProfile, {
        ffmpegLoaded: CONVERTER_FEATURE_FLAGS.ENABLE_FFMPEG,
      })
      : { engine: null };
    const lane = engineSelection.engine === 'ffmpeg' ? 'ffmpeg' : 'native';

    dispatchAction({
      type: 'SET_OPERATION',
      jobId,
      operationId: job.operationId,
      options: job.options,
      acknowledgments: acknowledgmentsRef.current[jobId] ?? job.acknowledgments,
    });
    dispatchAction({ type: 'QUEUE', jobId, attemptId: job.attemptId });
    queuedJobIdsRef.current.add(jobId);
    queueRef.current?.enqueue(jobId, job.attemptId, lane);
    return true;
  }, [deviceProfile, dispatchAction, recheckAdmissionForJob]);

  const startJob = useCallback((jobId) => {
    const job = stateRef.current[jobId];
    if (!job || !enqueueReadyJob(jobId)) return;
    setStatusMessage(`Converting ${job.source.name}…`);
  }, [enqueueReadyJob]);

  const startSelected = useCallback(() => {
    let count = 0;
    for (const jobId of selectedJobIds) {
      if (enqueueReadyJob(jobId)) count += 1;
    }
    if (count > 0) setStatusMessage(`Converting ${count} selected file${count === 1 ? '' : 's'}…`);
  }, [enqueueReadyJob, selectedJobIds]);

  const startAll = useCallback(() => {
    let count = 0;
    for (const job of Object.values(stateRef.current)) {
      if (enqueueReadyJob(job.id)) count += 1;
    }
    if (count > 0) setStatusMessage(`Converting ${count} file${count === 1 ? '' : 's'}…`);
  }, [enqueueReadyJob]);

  const cancelJob = useCallback((jobId) => {
    queuedJobIdsRef.current.delete(jobId);
    const job = stateRef.current[jobId];
    if (!job) return;
    queueRef.current?.cancel(jobId, job.attemptId);
    if (activeFfmpegJobIdsRef.current.has(jobId) || job.engine === 'ffmpeg') {
      void cancelFfmpegJob();
      activeFfmpegJobIdsRef.current.delete(jobId);
    }
    dispatchAction({ type: 'CANCEL', jobId, attemptId: job.attemptId });
    void disposeAttempt(jobId, job.attemptId);
    setStatusMessage(`Cancelled ${job.source.name}`);
  }, [dispatchAction, disposeAttempt]);

  const retryJob = useCallback(async (jobId) => {
    const job = stateRef.current[jobId];
    if (!job) return;
    await disposeAttempt(jobId, job.attemptId);
    const attemptId = createAttemptId();
    dispatchAction({ type: 'RETRY', jobId, attemptId });
    const file = filesRef.current.get(jobId);
    if (file) {
      dispatchAction({ type: 'ANALYZE_START', jobId, attemptId });
      const format = job.source.detectedFormat ?? '';
      const defaultOp = pickDefaultOperation(format, deviceProfile);
      if (!defaultOp) {
        dispatchAction({
          type: 'ANALYZE_FAIL',
          jobId,
          attemptId,
          error: { code: ERROR_CODES.OPERATION_UNSUPPORTED, message: 'No conversion available' },
        });
      } else {
        dispatchAction({
          type: 'ANALYZE_SUCCESS',
          jobId,
          attemptId,
          analysis: {
            format,
            category: categoryForFormat(format),
            warnings: job.source.warnings ?? [],
          },
        });
        dispatchAction({
          type: 'SET_OPERATION',
          jobId,
          operationId: job.operationId ?? defaultOp.id,
          options: job.options,
        });
      }
    }
    setStatusMessage(`Retrying ${job.source.name}`);
  }, [deviceProfile, dispatchAction, disposeAttempt]);

  const removeJob = useCallback(async (jobId) => {
    queuedJobIdsRef.current.delete(jobId);
    const job = stateRef.current[jobId];
    if (!job) return;
    queueRef.current?.cancel(jobId, job.attemptId);
    await disposeAttempt(jobId, job.attemptId);
    await artifactStoreRef.current?.clearJob(jobId);
    filesRef.current.delete(jobId);
    const sourceUrl = sourceUrlsRef.current.get(jobId);
    if (sourceUrl) {
      URL.revokeObjectURL(sourceUrl);
      sourceUrlsRef.current.delete(jobId);
    }
    dispatchAction({ type: 'REMOVE', jobId });
    setSelectedJobIds((prev) => {
      if (!prev.has(jobId)) return prev;
      const next = new Set(prev);
      next.delete(jobId);
      return next;
    });
    setAcknowledgments((prev) => {
      if (!prev[jobId]) return prev;
      const next = { ...prev };
      delete next[jobId];
      return next;
    });
    setStatusMessage(`Removed ${job.source.name}`);
  }, [dispatchAction, disposeAttempt]);

  const cancelSelected = useCallback(() => {
    for (const jobId of selectedJobIds) {
      cancelJob(jobId);
    }
  }, [selectedJobIds, cancelJob]);

  const retrySelected = useCallback(async () => {
    for (const jobId of selectedJobIds) {
      const job = stateRef.current[jobId];
      if (job && (job.status === JOB_STATUS.FAILED || job.status === JOB_STATUS.CANCELLED)) {
        await retryJob(jobId);
      }
    }
  }, [selectedJobIds, retryJob]);

  const removeCompleted = useCallback(async () => {
    const completed = Object.values(stateRef.current).filter(
      (job) => job.status === JOB_STATUS.COMPLETED,
    );
    for (const job of completed) {
      await removeJob(job.id);
    }
    setStatusMessage('Removed completed files');
  }, [removeJob]);

  const reset = useCallback(async () => {
    packageAbortRef.current?.abort();
    packageAbortRef.current = null;
    packageJobRef.current = null;
    queueRef.current?.dispose();
    await cancelFfmpegJob();
    await disposeFfmpegRunner();
    activeFfmpegJobIdsRef.current.clear();
    leaseManagerRef.current.disposeAll();
    queueRef.current = createQueue();
    registryRef.current.disposeAll();
    await artifactStoreRef.current?.dispose();
    artifactStoreRef.current = await createArtifactStore();
    filesRef.current.clear();
    for (const url of sourceUrlsRef.current.values()) {
      URL.revokeObjectURL(url);
    }
    sourceUrlsRef.current.clear();
    usedOutputNamesRef.current.clear();
    queuedJobIdsRef.current.clear();
    sessionHistoryRef.current.clear();
    dispatchAction({ type: 'RESET' });
    setRejections([]);
    setSelectedJobIds(new Set());
    setAcknowledgments({});
    setCustomRecipes([]);
    setPackageOptionsState(DEFAULT_WORKSPACE_PACKAGE_STATE);
    setPackageProgress(0);
    setPackageError(null);
    setStatusMessage('Workspace cleared');
  }, [createQueue, dispatchAction]);

  const downloadZip = useCallback(async (selectedOnly = false) => {
    setPackageError(null);
    const completedJobs = Object.values(stateRef.current).filter(
      (job) => job.status === JOB_STATUS.COMPLETED && job.output?.artifactKey,
    );
    const targetJobs = selectedOnly
      ? completedJobs.filter((job) => selectedJobIds.has(job.id))
      : completedJobs;

    if (!targetJobs.length) {
      setPackageError('No completed files to download');
      return;
    }

    const admission = evaluatePackageAdmission(targetJobs, deviceProfile);
    if (!admission.admitted) {
      setPackageError(admission.message ?? 'ZIP download not available');
      trackConverterEvent(TELEMETRY_EVENTS.PACKAGE_FAIL, {
        outcome: 'fail',
        code: admission.code ?? ERROR_CODES.PACKAGE_LIMIT_EXCEEDED,
      });
      return;
    }

    packageAbortRef.current?.abort();
    const controller = new AbortController();
    packageAbortRef.current = controller;

    const outputKeys = targetJobs.map((job) => job.output.artifactKey).filter(Boolean);
    let packageJob = startPackageJob(createPackageJob({ outputKeys }));
    packageJobRef.current = packageJob;
    setPackageProgress(0.01);
    trackConverterEvent(TELEMETRY_EVENTS.PACKAGE_START, { outcome: 'success' });

    for (const key of outputKeys) {
      leaseManagerRef.current.acquire(key);
    }

    /** @type {string | null} */
    let packageArtifactKey = null;

    try {
      const entries = await jobsToPackageEntries(targetJobs, async (job) => {
        if (controller.signal.aborted) {
          throw Object.assign(new Error('Package build cancelled'), { code: ERROR_CODES.PACKAGE_CANCELLED });
        }
        return artifactStoreRef.current?.get(job.output.artifactKey) ?? null;
      });

      if (!entries.length) {
        packageJob = failPackageJob(packageJob, {
          code: ERROR_CODES.PACKAGE_FAILED,
          message: 'Output files are no longer available',
        });
        packageJobRef.current = packageJob;
        setPackageError('Output files are no longer available');
        setPackageProgress(0);
        return;
      }

      const result = await createOutputZip(entries, {
        signal: controller.signal,
        deviceProfile,
        artifactStore: artifactStoreRef.current ?? undefined,
        preferOpfs: (admission.totalBytes ?? 0) >= PACKAGE_LIMITS.opfsThresholdBytes,
        artifactKey: `package/${Date.now().toString(36)}.zip`,
        onProgress: (fraction) => {
          packageJob = updatePackageJobProgress(packageJob, fraction);
          packageJobRef.current = packageJob;
          setPackageProgress(fraction);
        },
      });

      packageArtifactKey = result.artifactKey;
      if (controller.signal.aborted) {
        throw Object.assign(new Error('Package build cancelled'), { code: ERROR_CODES.PACKAGE_CANCELLED });
      }

      await downloadBlob({ blob: result.blob, fileName: result.fileName });
      packageJob = completePackageJob(packageJob, {
        fileName: result.fileName,
        size: result.blob.size,
        artifactKey: result.artifactKey,
        objectUrl: null,
      });
      packageJobRef.current = packageJob;
      setPackageProgress(1);
      trackConverterEvent(TELEMETRY_EVENTS.PACKAGE_COMPLETE, { outcome: 'success' });
      setStatusMessage(`Downloaded ${result.fileName}`);
    } catch (error) {
      const code = /** @type {{ code?: string }} */ (error).code;
      const message = error instanceof Error ? error.message : 'ZIP download failed';
      if (code === ERROR_CODES.PACKAGE_CANCELLED || code === 'PACKAGE_CANCELLED' || code === 'CANCELLED') {
        packageJob = cancelPackageJob(packageJob);
        packageJobRef.current = packageJob;
        trackConverterEvent(TELEMETRY_EVENTS.PACKAGE_FAIL, { outcome: 'cancel', code: ERROR_CODES.PACKAGE_CANCELLED });
      } else {
        packageJob = failPackageJob(packageJob, { code: code ?? ERROR_CODES.PACKAGE_FAILED, message });
        packageJobRef.current = packageJob;
        setPackageError(message);
        trackConverterEvent(TELEMETRY_EVENTS.PACKAGE_FAIL, {
          outcome: 'fail',
          code: code ?? ERROR_CODES.PACKAGE_FAILED,
        });
      }
      if (packageArtifactKey && artifactStoreRef.current) {
        await artifactStoreRef.current.delete(packageArtifactKey).catch(() => {});
      }
      setPackageProgress(0);
    } finally {
      for (const key of outputKeys) {
        leaseManagerRef.current.release(key);
      }
      if (packageAbortRef.current === controller) {
        packageAbortRef.current = null;
      }
    }
  }, [deviceProfile, selectedJobIds]);

  const downloadJob = useCallback(async (jobId) => {
    const job = stateRef.current[jobId];
    if (!job?.output?.artifactKey) return;
    const key = job.output.artifactKey;
    leaseManagerRef.current.acquire(key);
    try {
      const blob = await artifactStoreRef.current?.get(key);
      if (!blob) {
        setStatusMessage('Output file no longer available');
        return;
      }
      await downloadBlob({ blob, fileName: job.output.fileName });
      setStatusMessage(`Downloaded ${job.output.fileName}`);
    } finally {
      leaseManagerRef.current.release(key);
    }
  }, []);

  const shareJob = useCallback(async (jobId) => {
    const job = stateRef.current[jobId];
    if (!job?.output?.artifactKey) return false;
    const key = job.output.artifactKey;
    leaseManagerRef.current.acquire(key);
    try {
      const blob = await artifactStoreRef.current?.get(key);
      if (!blob) return false;
      const shared = await shareBlobFile({ blob, fileName: job.output.fileName });
      if (shared) setStatusMessage(`Shared ${job.output.fileName}`);
      return shared;
    } finally {
      leaseManagerRef.current.release(key);
    }
  }, []);

  useEffect(() => {
    const onPageHide = () => {
      packageAbortRef.current?.abort();
      void cancelFfmpegJob();
      /** @type {Set<string>} */
      const cancelIds = new Set();
      for (const job of Object.values(stateRef.current)) {
        if (job.status === JOB_STATUS.PROCESSING || job.status === JOB_STATUS.QUEUED) {
          for (const id of collectJobsForCancel(job, stateRef.current)) {
            cancelIds.add(id);
          }
        }
      }
      for (const jobId of cancelIds) {
        const job = stateRef.current[jobId];
        if (!job) continue;
        queueRef.current?.cancel(jobId, job.attemptId);
        dispatchAction({
          type: 'CANCEL',
          jobId,
          attemptId: job.attemptId,
        });
        recordSessionHistory({ ...job, status: JOB_STATUS.CANCELLED }, job.engine, JOB_STATUS.CANCELLED);
      }
      queuedJobIdsRef.current.clear();
      activeFfmpegJobIdsRef.current.clear();
      setStatusMessage('Conversion interrupted — background completion is not supported');
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        onPageHide();
      }
    };

    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [dispatchAction, recordSessionHistory]);

  const exportReport = useCallback(() => {
    return createConversionReport({ jobs: Object.values(stateRef.current) });
  }, []);

  const getSessionHistory = useCallback(() => sessionHistoryRef.current.list(), []);

  const getSourceObjectUrl = useCallback((jobId) => {
    const existing = sourceUrlsRef.current.get(jobId);
    if (existing) return existing;
    const file = filesRef.current.get(jobId);
    if (!file) return null;
    const url = URL.createObjectURL(file);
    sourceUrlsRef.current.set(jobId, url);
    return url;
  }, []);

  const mergeSelected = useCallback((orderedIds) => {
    const selected = orderedIds
      .map((id) => stateRef.current[id])
      .filter(Boolean);
    const sources = selected
      .map((job) => jobToSourceAnalysis(job))
      .filter(Boolean);
    const validation = validateMergeCompatibility(sources);
    if (!validation.ok) {
      setStatusMessage(validation.message);
      trackConverterEvent(TELEMETRY_EVENTS.CONVERT_FAIL, {
        outcome: 'fail',
        mergeStatus: validation.code ?? ERROR_CODES.MERGE_INCOMPATIBLE,
      });
      return null;
    }
    const parentJob = createMergeParentJob({ sourceJobs: selected });
    dispatchAction({ type: 'ADD_JOB', job: parentJob });
    dispatchAction({
      type: 'LINK_COMPOSITE',
      parentJobId: parentJob.id,
      childJobIds: orderedIds,
    });
    setStatusMessage(`Merge job created for ${orderedIds.length} files`);
    return parentJob.id;
  }, [dispatchAction]);

  const splitSelected = useCallback((spec) => {
    const targets = selectedJobIds.size
      ? [...selectedJobIds].map((id) => stateRef.current[id]).filter(Boolean)
      : [];
    const job = targets.length === 1 ? targets[0] : null;
    if (!job) {
      setStatusMessage('Select one file to split');
      return;
    }
    setPlanFields(job.id, { splitSpec: spec });
    setStatusMessage(`Split plan saved for ${job.source.name}`);
  }, [selectedJobIds, setPlanFields]);

  const getStatusLabelForJob = useCallback(
    (job) => getJobStatusLabel(job, { queuedJobIds: queuedJobIdsRef.current }),
    [],
  );

  const pasteSupported = useMemo(
    () => typeof navigator !== 'undefined' && Boolean(navigator.clipboard?.read),
    [],
  );

  return {
    jobs,
    recipes,
    overallProgress,
    deviceProfile,
    statusMessage,
    rejections,
    acceptAttribute,
    canShare,
    pasteSupported,
    selectedJobIds,
    acknowledgments,
    packageProgress,
    packageError,
    packageOptions,
    setPackageOptions,
    addFiles,
    addFolder,
    pasteFromClipboard,
    setOperation,
    setOptions,
    setPlanFields,
    toggleSelect,
    selectAll,
    clearSelection,
    setAcknowledgment,
    applyPresetToSelected,
    applyGoalSuggestion,
    importRecipe,
    applyRecipeToSelected,
    mergeSelected,
    splitSelected,
    getSourceObjectUrl,
    startJob,
    startSelected,
    startAll,
    cancelJob,
    cancelSelected,
    retryJob,
    retrySelected,
    removeJob,
    removeCompleted,
    reset,
    downloadJob,
    downloadZip,
    shareJob,
    exportReport,
    getSessionHistory,
    isJobReadyToConvert,
    getJobStatusLabel: getStatusLabelForJob,
  };
}
