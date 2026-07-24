import { getOperationById } from '@/lib/tools/converter/conversion-capabilities.js';
import { processWithAdapter } from '@/lib/tools/converter/adapters/index.js';
import { createConverterQueue } from '@/lib/tools/converter/converter-queue.js';
import { createConverterResourceRegistry } from '@/lib/tools/converter/converter-resource-registry.js';
import { createConverterWorkerClient } from '@/lib/tools/converter/converter-worker-client.js';
import { buildConverterPackage } from '@/lib/tools/converter/converter-package.js';
import { fromClipboardText } from '@/lib/tools/converter/converter-import.js';
import { CONVERTER_PRESETS, presetAppliesToSource, resolvePresetPlan } from '@/lib/tools/converter/converter-presets.js';
import { mapDestinationToPlan, listAssistantDestinations } from '@/lib/tools/converter/goal-assistant.js';
import {
  createRecipe,
  exportRecipeJson,
  importRecipeJson,
  applyRecipeToSource,
} from '@/lib/tools/converter/converter-recipes.js';
import { planTargetSize } from '@/lib/tools/converter/target-size-planner.js';
import { validateMergeCompatibility } from '@/lib/tools/converter/merge-plan.js';
import { estimateSplitCount, createSplitSpec } from '@/lib/tools/converter/split-plan.js';
import { sha256Hex, formatChecksumShort } from '@/lib/tools/converter/checksums.js';
import { createConversionReport, exportReportJson, exportReportMarkdown } from '@/lib/tools/converter/conversion-report.js';
import { normalizeSourceAnalysis } from '@/lib/tools/converter/source-analysis.js';
import { CONVERTER_FEATURE_FLAGS } from '@/lib/tools/converter/converter-feature-flags.js';
import { ADMIN_TOOL_CAPABILITY_DELTAS, resolveToolCapabilities } from '@/lib/tools/tool-capabilities.js';

/**
 * @param {ArrayBuffer | Uint8Array} bytes
 */
function toUint8Array(bytes) {
  if (bytes instanceof Uint8Array) {
    return bytes.buffer.byteLength === bytes.byteLength
      ? bytes
      : new Uint8Array(bytes);
  }
  return new Uint8Array(bytes);
}

/**
 * Copy into a fresh ArrayBuffer so transfers never detach shared views.
 * @param {Uint8Array} bytes
 */
function ownedCopy(bytes) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

/**
 * @param {ArrayBuffer | Uint8Array} bytes
 * @param {string} operationId
 * @param {Record<string, unknown>} [options]
 */
async function processBytes(bytes, operationId, options = {}) {
  const op = getOperationById(operationId);
  if (!op) throw new Error(`Unknown operation: ${operationId}`);

  const sourceBytes = toUint8Array(bytes);
  const controller = new AbortController();
  const ctx = {
    operationId,
    options,
    signal: controller.signal,
    onProgress: () => {},
  };

  const output = await processWithAdapter(operationId, sourceBytes, ctx);
  return {
    buffer: await output.blob.arrayBuffer(),
    mimeType: output.mimeType,
    fileName: output.fileName,
    metadata: output.metadata ?? {},
  };
}

/**
 * @param {ArrayBuffer | Uint8Array} bytes
 * @param {string} operationId
 * @param {Record<string, unknown>} [options]
 */
async function processViaWorker(bytes, operationId, options = {}) {
  const client = createConverterWorkerClient({ readyTimeoutMs: 15_000, operationTimeoutMs: 60_000 });
  const sourceBytes = ownedCopy(toUint8Array(bytes));
  const handle = client.startJob({
    jobId: `harness-${Date.now()}`,
    attemptId: 'a1',
    operationId,
    sourceBytes,
    options,
    mode: 'process',
  });

  try {
    const payload = await handle.result;
    const buffer = payload?.buffer
      ?? (payload?.blob ? await payload.blob.arrayBuffer() : null)
      ?? (payload?.bytes ? payload.bytes.buffer : null);

    if (!buffer) {
      throw new Error(`Worker result missing buffer: ${JSON.stringify(Object.keys(payload || {}))}`);
    }

    return {
      buffer,
      mimeType: payload.mimeType,
      fileName: payload.fileName,
      metadata: payload.metadata ?? {},
    };
  } finally {
    handle.dispose?.();
  }
}

/**
 * Generate a tiny WebM clip via canvas + MediaRecorder when supported.
 */
async function generateTinyWebm() {
  if (typeof MediaRecorder === 'undefined' || typeof HTMLCanvasElement === 'undefined') {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  let frame = 0;
  const stream = canvas.captureStream(8);
  const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
    ? 'video/webm;codecs=vp8'
    : (MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : '');

  if (!mime) return null;

  const recorder = new MediaRecorder(stream, { mimeType: mime });
  /** @type {Blob[]} */
  const chunks = [];

  const done = new Promise((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime.split(';')[0] }));
    recorder.onerror = () => reject(new Error('MediaRecorder failed'));
  });

  recorder.start(100);
  const interval = setInterval(() => {
    frame += 1;
    ctx.fillStyle = frame % 2 ? '#2244aa' : '#44aa88';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, 80);

  await new Promise((r) => setTimeout(r, 320));
  clearInterval(interval);
  recorder.stop();
  stream.getTracks().forEach((track) => track.stop());
  const blob = await done;
  return new Uint8Array(await blob.arrayBuffer());
}

async function runLifecycleSmoke() {
  const registry = createConverterResourceRegistry();
  const progress = [];
  let cancelled = false;

  const queue = createConverterQueue({
    concurrency: 1,
    onJobStart: async () => ({
      cancel: () => {
        cancelled = true;
      },
      dispose: () => {
        registry.disposeAll();
      },
    }),
  });

  queue.enqueue('job-1', 'a1');
  await new Promise((r) => setTimeout(r, 20));
  queue.cancel('job-1', 'a1');
  queue.complete('job-1', 'a1');

  registry.registerObjectUrl('job-2', 'a2', URL.createObjectURL(new Blob(['ok'])));
  registry.disposeAttempt('job-2', 'a2');

  return {
    cancelled,
    progress,
    registryEmpty: registry.snapshot('job-2', 'a2').objectUrls.length === 0,
  };
}

/** @type {Window & { __converterHarness?: Record<string, unknown> }} */ (window).__converterHarness = {
  processImage: (bytes, operationId, options) => processBytes(bytes, operationId, options),
  processWav: (bytes, operationId = 'wav-transform', options) => processBytes(bytes, operationId, options),
  processData: (bytes, operationId, options) => processBytes(bytes, operationId, options),
  processViaWorker,
  processVideo: async (bytes, operationId, options) => {
    const op = getOperationById(operationId);
    if (!op) throw new Error(`Unknown operation: ${operationId}`);
    if (['mp4-to-webm', 'webm-to-mp4'].includes(operationId) && typeof VideoEncoder === 'undefined') {
      return { skipped: true, reason: 'VIDEO_ENCODER_UNAVAILABLE' };
    }
    return processBytes(bytes, operationId, options);
  },
  generateTinyWebm,
  runLifecycleSmoke,
  getWorkerModuleUrl: () => new URL('../../../src/workers/converter.worker.js', import.meta.url).href,

  /**
   * @param {ReadonlyArray<{ name: string, base64: string }>} entries
   * @param {string} [archiveName]
   */
  packageFiles: async (entries, archiveName = 'harness-output.zip') => {
    const packageEntries = entries.map((entry) => ({
      name: entry.name,
      bytes: base64ToBytes(entry.base64),
    }));
    const { blob, fileName } = await buildConverterPackage(packageEntries, { archiveName });
    return {
      fileName,
      size: blob.size,
      bufferBase64: bytesToBase64(new Uint8Array(await blob.arrayBuffer())),
    };
  },

  /**
   * @param {string} text
   * @param {string} [fileName]
   */
  importClipboardText: (text, fileName = 'clipboard.txt') => {
    const result = fromClipboardText(text, fileName);
    return {
      acceptedNames: result.accepted.map((file) => file.name),
      rejections: result.rejections,
    };
  },

  getImportCapabilities: () => ({
    clipboardReadSupported: typeof navigator !== 'undefined' && typeof navigator.clipboard?.read === 'function',
    clipboardWriteTextSupported: typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function',
    directoryEntrySupported: typeof DataTransferItem !== 'undefined' && 'webkitGetAsEntry' in DataTransferItem.prototype,
    directoryPickerSupported: typeof window.showDirectoryPicker === 'function',
  }),

  listPresetIds: () => CONVERTER_PRESETS.map((preset) => preset.id),

  /**
   * @param {string} presetId
   * @param {{ format?: string, category?: string }} source
   */
  presetAppliesTo: (presetId, source) => presetAppliesToSource(presetId, source),

  listAssistantDestinations: () => listAssistantDestinations().map((d) => d.id),

  /**
   * @param {string} destinationId
   * @param {object} source
   * @param {Record<string, unknown>} [options]
   */
  mapDestinationToPlan: (destinationId, source, options) => {
    const analysis = normalizeSourceAnalysis({ adapterAnalysis: source });
    const suggestion = mapDestinationToPlan(destinationId, analysis, options);
    if (!suggestion?.plan) return null;
    return {
      operationId: suggestion.plan.operationId,
      goalId: suggestion.plan.goalId,
      warnings: [...(suggestion.warnings ?? suggestion.plan.warnings ?? [])],
      explanation: suggestion.explanation,
      targetBytes: suggestion.plan.targetBytes,
      compatibilityProfile: suggestion.plan.compatibilityProfile,
    };
  },

  /**
   * @param {string} presetId
   * @param {object} source
   * @param {Record<string, unknown>} [options]
   */
  resolvePresetPlan: (presetId, source, options) => {
    const analysis = normalizeSourceAnalysis({ adapterAnalysis: source });
    const plan = resolvePresetPlan(presetId, analysis, options);
    return plan
      ? { operationId: plan.operationId, goalId: plan.goalId, warnings: [...plan.warnings], options: plan.options }
      : null;
  },

  planTargetSize: (params) => planTargetSize(params),

  recipeRoundTrip: (recipeInput) => {
    const recipe = createRecipe(recipeInput);
    if (!recipe) return { ok: false };
    const imported = importRecipeJson(exportRecipeJson(recipe));
    return { ok: Boolean(imported), id: imported?.id ?? null, json: exportRecipeJson(recipe) };
  },

  /**
   * @param {object} recipeInput
   * @param {object} source
   */
  applyRecipe: (recipeInput, source) => {
    const recipe = typeof recipeInput === 'string' ? importRecipeJson(recipeInput) : createRecipe(recipeInput);
    if (!recipe) return null;
    const analysis = normalizeSourceAnalysis({ adapterAnalysis: source });
    const applied = applyRecipeToSource(recipe, analysis);
    return applied
      ? { operationId: applied.plan.operationId, recipeId: applied.plan.recipeId, warnings: [...applied.warnings] }
      : null;
  },

  validateMerge: (sources) => validateMergeCompatibility(sources),

  estimateSplit: (params) => {
    const spec = createSplitSpec(params.spec);
    const count = estimateSplitCount(spec, {
      durationSec: params.durationSec,
      sourceBytes: params.sourceBytes,
    });
    if (count == null) return { ok: false, count: null };
    if (count > 20) return { ok: false, count, code: 'SPLIT_LIMIT_EXCEEDED' };
    return { ok: true, count };
  },

  /**
   * @param {string} base64
   */
  checksumOfBase64: async (base64) => {
    const hex = await sha256Hex(base64ToBytes(base64));
    return { hex, short: formatChecksumShort(hex) };
  },

  /**
   * @param {ReadonlyArray<object>} jobs
   */
  buildReport: (jobs) => {
    const report = createConversionReport({ jobs });
    return {
      json: exportReportJson(report),
      markdown: exportReportMarkdown(report),
      completed: report.succeeded,
    };
  },

  /**
   * @param {ReadonlyArray<{ name: string, base64: string, relativePath?: string }>} entries
   * @param {object} [options]
   */
  packageFilesAdvanced: async (entries, options = {}) => {
    const packageEntries = entries.map((entry) => ({
      name: entry.name,
      relativePath: entry.relativePath,
      bytes: base64ToBytes(entry.base64),
    }));
    const { blob, fileName } = await buildConverterPackage(packageEntries, {
      archiveName: options.archiveName ?? 'harness-advanced.zip',
      preserveStructure: options.preserveStructure ?? false,
      flatten: options.flatten ?? true,
      includeChecksumSidecar: options.includeChecksumSidecar ?? false,
      includeReport: options.includeReport ?? false,
      compressionPolicy: options.compressionPolicy ?? 'auto',
    });
    return {
      fileName,
      size: blob.size,
      bufferBase64: bytesToBase64(new Uint8Array(await blob.arrayBuffer())),
    };
  },

  getV2Flags: () => ({ ...CONVERTER_FEATURE_FLAGS }),

  getCapabilityParity: () => ({
    public: resolveToolCapabilities('converter', 'public'),
    admin: resolveToolCapabilities('converter', 'admin'),
    adminDelta: ADMIN_TOOL_CAPABILITY_DELTAS.converter,
  }),

  /**
   * Plan 7: mocked NL assist → normalize plan → apply onto a harness job descriptor.
   * @param {{ request: string, job?: { operationId?: string } }} input
   */
  async mockAiAssistApply(input) {
    const { normalizeAiPlanDraft } = await import('@/lib/tools/converter/ai/plan-from-llm.js');
    const { createMockAiProvider } = await import('@/lib/tools/converter/ai/provider-interface.js');
    const { sanitizeUserNlRequest } = await import('@/lib/tools/converter/ai/prompt-safety.js');
    const gate = sanitizeUserNlRequest(input.request || '');
    if (!gate.ok) return { ok: false, code: gate.code };
    const provider = createMockAiProvider();
    const completion = await provider.completeJson({ system: '', user: gate.text });
    const draft = normalizeAiPlanDraft(completion.json);
    if (!draft.ok) return { ok: false, code: draft.code };
    return {
      ok: true,
      plan: draft.plan,
      appliedJob: {
        ...(input.job || {}),
        operationId: draft.plan.operationId,
        options: draft.plan.options,
        goalId: draft.plan.goalId,
      },
    };
  },

  /**
   * Plan 7: mocked OCR + STT sidecar builders.
   */
  async mockAiOcrAndTranscribe() {
    const { createMockAiProvider } = await import('@/lib/tools/converter/ai/provider-interface.js');
    const { normalizeOcrResult } = await import('@/lib/tools/converter/ai/ocr-normalize.js');
    const { cuesToVtt, normalizeTranscriptCues } = await import('@/lib/tools/converter/ai/subtitles.js');
    const provider = createMockAiProvider();
    const ocrRaw = await provider.visionOcr({ bytes: new Uint8Array([1, 2, 3]) });
    const ocr = normalizeOcrResult(ocrRaw);
    const stt = await provider.transcribe({ bytes: new Uint8Array([1, 2, 3]) });
    const cues = normalizeTranscriptCues(stt.cues || stt.text);
    const vtt = cuesToVtt(cues);
    return {
      ocrSidecar: JSON.stringify(ocr),
      transcriptSidecar: JSON.stringify({ text: stt.text, cues }),
      vtt,
    };
  },
};

/**
 * @param {string} base64
 * @returns {Uint8Array}
 */
function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function bytesToBase64(bytes) {
  let encoded = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    encoded += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(encoded);
}

document.getElementById('app').textContent = 'Converter harness ready';
