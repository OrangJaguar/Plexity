/**
 * Versioned conversion presets that resolve to operation plans.
 */

import { getOperationById, listOperationsForInputFormat } from './conversion-capabilities.js';
import { resolveCompatibilityPlan } from './compatibility-profiles.js';

/** @typedef {import('./source-analysis.js').SourceAnalysis} SourceAnalysis */

export const PRESET_VERSION = 2;

/** @typedef {object} ConversionPreset
 * @property {string} id
 * @property {string} label
 * @property {string} description
 * @property {ReadonlyArray<'sourceAnalysis' | 'format' | 'category'>} appliesTo
 * @property {(source: SourceAnalysis, options?: Record<string, unknown>) => PresetPlan | null} resolvePlan
 */

/**
 * @typedef {object} PresetPlan
 * @property {string} operationId
 * @property {Record<string, unknown>} options
 * @property {ReadonlyArray<string>} warnings
 * @property {string} goalId
 */

/** @type {ReadonlyArray<ConversionPreset>} */
export const CONVERTER_PRESETS = Object.freeze([
  {
    id: 'change-format',
    label: 'Change format',
    description: 'Convert to a target format without upscaling.',
    appliesTo: Object.freeze(['sourceAnalysis', 'format']),
    resolvePlan(source, options = {}) {
      const target = String(options.targetFormat ?? '').toLowerCase();
      if (!target) return null;
      const op = listOperationsForInputFormat(source.format).find((o) => o.outputFormat === target);
      if (!op) return null;
      return {
        operationId: op.id,
        options: { ...defaultResizeOptions(source) },
        warnings: [...op.warnings],
        goalId: 'change-format',
      };
    },
  },
  {
    id: 'make-smaller',
    label: 'Make smaller',
    description: 'Reduce file size with sensible quality defaults.',
    appliesTo: Object.freeze(['sourceAnalysis', 'category']),
    resolvePlan(source) {
      if (source.category === 'image') {
        const op = pickImageOutput(source.format, 'webp') ?? pickImageOutput(source.format, 'jpeg');
        if (!op) return null;
        return {
          operationId: op.id,
          options: {
            maxWidth: Math.min(source.width ?? 1920, 1920),
            maxHeight: Math.min(source.height ?? 1080, 1080),
            quality: 0.75,
            flattenTransparency: op.outputFormat === 'jpeg',
          },
          warnings: ['LOSSY', ...(op.outputFormat === 'jpeg' ? ['FLATTEN_ALPHA'] : [])],
          goalId: 'make-smaller',
        };
      }
      if (source.category === 'audio') {
        const op = getOperationById(`wav-to-mp3`) ?? getOperationById(`${source.format}-to-mp3`);
        if (!op) return null;
        return {
          operationId: op.id,
          options: { bitrateKbps: 128, channels: 1 },
          warnings: ['LOSSY', 'STRIP_METADATA'],
          goalId: 'make-smaller',
        };
      }
      if (source.category === 'video') {
        const op = getOperationById(`${source.format}-to-webm`) ?? getOperationById('mp4-to-webm');
        if (!op) return null;
        return {
          operationId: op.id,
          options: { transcode: true, videoBitrateKbps: 1000 },
          warnings: ['LOSSY', 'LOSE_TRACKS'],
          goalId: 'make-smaller',
        };
      }
      return null;
    },
  },
  {
    id: 'best-quality',
    label: 'Best quality',
    description: 'Prefer lossless or highest-quality output.',
    appliesTo: Object.freeze(['sourceAnalysis', 'category']),
    resolvePlan(source) {
      if (source.category === 'image') {
        const op = pickImageOutput(source.format, 'png');
        if (!op) return null;
        return {
          operationId: op.id,
          options: defaultResizeOptions(source),
          warnings: [],
          goalId: 'best-quality',
        };
      }
      if (source.category === 'audio') {
        const op = getOperationById('wav-transform') ?? getOperationById(`${source.format}-to-flac`);
        if (!op) return null;
        return {
          operationId: op.id,
          options: {},
          warnings: op.lossy ? ['LOSSY'] : [],
          goalId: 'best-quality',
        };
      }
      if (source.category === 'video') {
        const op = getOperationById(`${source.format}-remux`) ?? getOperationById('mp4-remux');
        if (!op) return null;
        return {
          operationId: op.id,
          options: { transcode: false },
          warnings: [],
          goalId: 'best-quality',
        };
      }
      return null;
    },
  },
  {
    id: 'web-optimized',
    label: 'Web optimized',
    description: 'Web-friendly formats and dimensions.',
    appliesTo: Object.freeze(['sourceAnalysis', 'category']),
    resolvePlan(source) {
      if (source.category === 'image') {
        const op = pickImageOutput(source.format, 'webp');
        if (!op) return null;
        return {
          operationId: op.id,
          options: { maxWidth: 1920, maxHeight: 1920, quality: 0.82 },
          warnings: ['LOSSY'],
          goalId: 'web-optimized',
        };
      }
      if (source.category === 'video') {
        const op = getOperationById(`${source.format}-to-webm`) ?? getOperationById('mp4-to-webm');
        if (!op) return null;
        return {
          operationId: op.id,
          options: { transcode: true, videoBitrateKbps: 2500 },
          warnings: ['LOSSY'],
          goalId: 'web-optimized',
        };
      }
      return null;
    },
  },
  {
    id: 'mobile-compatible',
    label: 'Mobile compatible',
    description: 'Formats and sizes suited for mobile playback.',
    appliesTo: Object.freeze(['sourceAnalysis', 'category']),
    resolvePlan(source) {
      if (source.category === 'image') {
        const op = pickImageOutput(source.format, 'jpeg');
        if (!op) return null;
        return {
          operationId: op.id,
          options: { maxWidth: 1280, maxHeight: 1280, quality: 0.8, flattenTransparency: true },
          warnings: ['LOSSY', 'FLATTEN_ALPHA', 'MOBILE_LIMIT'],
          goalId: 'mobile-compatible',
        };
      }
      if (source.category === 'video') {
        const op = getOperationById(`${source.format}-to-mp4`) ?? getOperationById('webm-to-mp4');
        if (!op) return null;
        return {
          operationId: op.id,
          options: { transcode: true, videoBitrateKbps: 1000 },
          warnings: ['LOSSY', 'MOBILE_LIMIT'],
          goalId: 'mobile-compatible',
        };
      }
      if (source.category === 'audio') {
        const op = getOperationById('wav-to-m4a') ?? getOperationById(`${source.format}-to-m4a`);
        if (!op) return null;
        return {
          operationId: op.id,
          options: { bitrateKbps: 128, channels: 2 },
          warnings: ['LOSSY', 'MOBILE_LIMIT'],
          goalId: 'mobile-compatible',
        };
      }
      return null;
    },
  },
  {
    id: 'extract-audio',
    label: 'Extract audio',
    description: 'Extract an audio track from video containers.',
    appliesTo: Object.freeze(['sourceAnalysis', 'category']),
    resolvePlan(source) {
      if (source.category !== 'video') return null;
      const op = getOperationById(`extract-audio-${source.format}`);
      if (!op) return null;
      return {
        operationId: op.id,
        options: { bitrateKbps: 192 },
        warnings: ['LOSSY', 'LOSE_TRACKS'],
        goalId: 'extract-audio',
      };
    },
  },
  {
    id: 'preserve-transparency',
    label: 'Preserve transparency',
    description: 'Keep alpha channel when converting images.',
    appliesTo: Object.freeze(['sourceAnalysis', 'category']),
    resolvePlan(source) {
      if (source.category !== 'image' || !source.hasAlpha) return null;
      const op = pickImageOutput(source.format, 'png') ?? pickImageOutput(source.format, 'webp');
      if (!op) return null;
      return {
        operationId: op.id,
        options: { ...defaultResizeOptions(source), flattenTransparency: false },
        warnings: op.outputFormat === 'webp' ? ['LOSSY'] : [],
        goalId: 'preserve-transparency',
      };
    },
  },
  {
    id: 'lossless',
    label: 'Lossless',
    description: 'Only lossless conversions when genuinely lossless.',
    appliesTo: Object.freeze(['sourceAnalysis', 'category']),
    resolvePlan(source) {
      if (source.category === 'image') {
        const op = pickImageOutput(source.format, 'png');
        if (!op || op.lossy) return null;
        return {
          operationId: op.id,
          options: defaultResizeOptions(source),
          warnings: [],
          goalId: 'lossless',
        };
      }
      if (source.category === 'audio') {
        const op = getOperationById('wav-transform');
        if (!op) return null;
        return {
          operationId: op.id,
          options: {},
          warnings: [],
          goalId: 'lossless',
        };
      }
      if (source.category === 'video') {
        const op = getOperationById(`${source.format}-remux`) ?? getOperationById('mp4-remux');
        if (!op || op.lossy) return null;
        return {
          operationId: op.id,
          options: { transcode: false },
          warnings: [],
          goalId: 'lossless',
        };
      }
      if (source.category === 'data') {
        const ops = listOperationsForInputFormat(source.format);
        const op = ops.find((o) => !o.lossy);
        if (!op) return null;
        return {
          operationId: op.id,
          options: {},
          warnings: [],
          goalId: 'lossless',
        };
      }
      return null;
    },
  },
  {
    id: 'under-size',
    label: 'Under size limit',
    description: 'Aim for an approximate maximum file size (not exact).',
    appliesTo: Object.freeze(['sourceAnalysis', 'category']),
    resolvePlan(source, options = {}) {
      const targetBytes = Number(options.targetBytes ?? 5 * 1024 * 1024);
      if (!Number.isFinite(targetBytes) || targetBytes <= 0) return null;
      if (source.category === 'image') {
        const op = pickImageOutput(source.format, 'webp') ?? pickImageOutput(source.format, 'jpeg');
        if (!op) return null;
        return {
          operationId: op.id,
          options: { ...defaultResizeOptions(source), quality: 0.72, targetBytes, maxWidth: 1600, maxHeight: 1600 },
          warnings: ['LOSSY', 'TARGET_SIZE_APPROX', 'ESTIMATE_UNCERTAIN'],
          goalId: 'under-size',
        };
      }
      if (source.category === 'audio') {
        const op = getOperationById(`${source.format}-to-mp3`) ?? getOperationById('wav-to-mp3');
        if (!op) return null;
        return {
          operationId: op.id,
          options: { bitrateKbps: 96, targetBytes },
          warnings: ['LOSSY', 'TARGET_SIZE_APPROX', 'ESTIMATE_UNCERTAIN'],
          goalId: 'under-size',
        };
      }
      if (source.category === 'video') {
        const op = listOperationsForInputFormat(source.format).find((o) => o.outputFormat === 'mp4');
        if (!op) return null;
        return {
          operationId: op.id,
          options: { transcode: true, videoBitrateKbps: 1000, targetBytes },
          warnings: ['LOSSY', 'TARGET_SIZE_APPROX', 'FFMPEG_REQUIRED', 'TWO_PASS'],
          goalId: 'under-size',
        };
      }
      return null;
    },
  },
  {
    id: 'compatibility',
    label: 'Compatibility',
    description: 'Browser or website compatibility profile defaults.',
    appliesTo: Object.freeze(['sourceAnalysis', 'category', 'format']),
    resolvePlan(source, options = {}) {
      const profileId = String(options.profileId ?? 'browser');
      const compat = resolveCompatibilityPlan(profileId, source);
      if (!compat) return null;
      return {
        operationId: compat.plan.operationId,
        options: { ...compat.plan.options },
        warnings: [...compat.warnings],
        goalId: `compat:${profileId}`,
      };
    },
  },
  {
    id: 'social-video',
    label: 'Social video',
    description: 'Compressed video/image defaults for social sharing.',
    appliesTo: Object.freeze(['sourceAnalysis', 'category']),
    resolvePlan(source) {
      const compat = resolveCompatibilityPlan('discord', source);
      if (!compat) return null;
      return {
        operationId: compat.plan.operationId,
        options: { ...compat.plan.options },
        warnings: [...compat.warnings],
        goalId: 'social-video',
      };
    },
  },
  {
    id: 'email-attachment',
    label: 'Email attachment',
    description: 'Smaller formats suitable for email attachments.',
    appliesTo: Object.freeze(['sourceAnalysis', 'category']),
    resolvePlan(source) {
      const compat = resolveCompatibilityPlan('email', source);
      if (!compat) return null;
      return {
        operationId: compat.plan.operationId,
        options: { ...compat.plan.options },
        warnings: [...compat.warnings],
        goalId: 'email-attachment',
      };
    },
  },
  {
    id: 'preserve-animation',
    label: 'Preserve animation',
    description: 'Keep animated frames when the format supports it.',
    appliesTo: Object.freeze(['sourceAnalysis', 'category']),
    resolvePlan(source) {
      if (source.category !== 'image' || !source.animated) return null;
      const op = pickImageOutput(source.format, 'gif')
        ?? pickImageOutput(source.format, source.format)
        ?? listOperationsForInputFormat(source.format)[0];
      if (!op) return null;
      return {
        operationId: op.id,
        options: { ...defaultResizeOptions(source), rasterizeAnimation: false },
        warnings: op.outputFormat === 'gif' ? [] : ['DROP_ANIMATION'],
        goalId: 'preserve-animation',
      };
    },
  },
]);

/**
 * @param {string} presetId
 * @returns {ConversionPreset | undefined}
 */
export function getPresetById(presetId) {
  return CONVERTER_PRESETS.find((p) => p.id === presetId);
}

/**
 * @param {string} presetId
 * @param {SourceAnalysis} source
 * @param {Record<string, unknown>} [options]
 * @returns {PresetPlan | null}
 */
export function resolvePresetPlan(presetId, source, options) {
  const preset = getPresetById(presetId);
  if (!preset) return null;
  return preset.resolvePlan(source, options);
}

/** @deprecated alias for UI/hook consumers */
export const resolvePreset = resolvePresetPlan;

/** @returns {ReadonlyArray<ConversionPreset>} */
export function listPresets() {
  return CONVERTER_PRESETS;
}

/**
 * Whether a preset can produce a plan for the given source.
 * @param {string} presetId
 * @param {Partial<SourceAnalysis> & { format?: string, category?: string }} source
 * @param {object} [options]
 * @returns {boolean}
 */
export function presetAppliesToSource(presetId, source, options = {}) {
  if (!source?.format && !source?.category) return false;
  const normalized = {
    format: String(source.format ?? '').toLowerCase().replace(/^\./, ''),
    category: String(source.category ?? ''),
    width: source.width ?? null,
    height: source.height ?? null,
    durationSec: source.durationSec ?? null,
    channels: source.channels ?? null,
    sampleRate: source.sampleRate ?? null,
    codec: source.codec ?? null,
    container: source.container ?? null,
    tracks: source.tracks ?? [],
    rowCount: source.rowCount ?? null,
    columnCount: source.columnCount ?? null,
    hasAlpha: source.hasAlpha ?? null,
    animated: source.animated ?? null,
    warnings: source.warnings ?? [],
  };
  if (!normalized.category && normalized.format) {
    const f = normalized.format;
    if (['png', 'jpeg', 'jpg', 'webp', 'bmp', 'gif'].includes(f)) normalized.category = 'image';
    else if (['wav', 'mp3', 'm4a', 'aac', 'flac', 'ogg', 'opus'].includes(f)) normalized.category = 'audio';
    else if (['mp4', 'm4v', 'mov', 'webm', 'mkv', 'avi', 'mpeg', 'mpg'].includes(f)) normalized.category = 'video';
    else if (['csv', 'tsv', 'json', 'yaml', 'xml', 'txt'].includes(f)) normalized.category = 'data';
  }
  // change-format needs an explicit target; treat as applicable when any ops exist
  if (presetId === 'change-format') {
    return listOperationsForInputFormat(normalized.format).length > 0;
  }
  if (presetId === 'compatibility') {
    const profileId = String(options.profileId ?? 'browser');
    return resolveCompatibilityPlan(profileId, /** @type {SourceAnalysis} */ (normalized)) != null;
  }
  if (presetId === 'under-size') {
    return resolvePresetPlan('under-size', /** @type {SourceAnalysis} */ (normalized), options) != null;
  }
  return resolvePresetPlan(presetId, /** @type {SourceAnalysis} */ (normalized), options) != null;
}

/**
 * @param {string} format
 * @param {string} outputFormat
 */
function pickImageOutput(format, outputFormat) {
  return listOperationsForInputFormat(format).find((o) => o.outputFormat === outputFormat);
}

/**
 * @param {SourceAnalysis} source
 */
function defaultResizeOptions(source) {
  return {
    maxWidth: source.width ?? undefined,
    maxHeight: source.height ?? undefined,
  };
}
