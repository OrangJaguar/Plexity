/**
 * Destination-oriented compatibility profiles. Each profile maps a source
 * analysis to sensible operation/options defaults for a common target
 * (a device, platform, or use case) without guaranteeing exact fidelity.
 */

import { getOperationById, listOperationsForInputFormat } from './conversion-capabilities.js';
import { createConversionPlan } from './conversion-plan.js';

/** @typedef {import('./source-analysis.js').SourceAnalysis} SourceAnalysis */
/** @typedef {import('./conversion-plan.js').ConversionPlan} ConversionPlan */

/**
 * @typedef {object} CompatibilityProfilePlan
 * @property {string} operationId
 * @property {Record<string, unknown>} options
 * @property {ReadonlyArray<string>} warnings
 */

/**
 * @typedef {object} CompatibilityProfile
 * @property {string} id
 * @property {string} label
 * @property {string} description
 * @property {ReadonlyArray<'image' | 'audio' | 'video' | 'data'>} categoryHints
 * @property {ReadonlyArray<string>} warnings
 * @property {(source: SourceAnalysis) => CompatibilityProfilePlan | null} planDefaults
 */

/**
 * @param {string} format
 * @param {string} outputFormat
 */
function pickImageOutput(format, outputFormat) {
  return listOperationsForInputFormat(format).find((o) => o.outputFormat === outputFormat);
}

/** @type {ReadonlyArray<CompatibilityProfile>} */
export const COMPATIBILITY_PROFILES = Object.freeze([
  {
    id: 'browser',
    label: 'Any modern browser',
    description: 'Broadly compatible web formats: WebP images, MP4/WebM video, MP3/AAC audio.',
    categoryHints: Object.freeze(['image', 'audio', 'video']),
    warnings: Object.freeze(['LOSSY']),
    planDefaults(source) {
      if (source.category === 'image') {
        const op = pickImageOutput(source.format, 'webp');
        if (!op) return null;
        return { operationId: op.id, options: { quality: 0.85 }, warnings: op.warnings };
      }
      if (source.category === 'audio') {
        const op = getOperationById('wav-to-mp3') ?? getOperationById(`${source.format}-to-mp3`);
        if (!op) return null;
        return { operationId: op.id, options: { bitrateKbps: 192 }, warnings: op.warnings };
      }
      if (source.category === 'video') {
        const op = getOperationById(`${source.format}-to-webm`) ?? getOperationById('mp4-to-webm');
        if (!op) return null;
        return { operationId: op.id, options: { transcode: true, videoBitrateKbps: 2500 }, warnings: op.warnings };
      }
      return null;
    },
  },
  {
    id: 'iphone',
    label: 'iPhone / iOS',
    description: 'MP4 (H.264/AAC), M4A audio, and JPEG images tuned for iOS playback and camera roll.',
    categoryHints: Object.freeze(['image', 'audio', 'video']),
    warnings: Object.freeze(['MOBILE_LIMIT']),
    planDefaults(source) {
      if (source.category === 'image') {
        const op = pickImageOutput(source.format, 'jpeg');
        if (!op) return null;
        return {
          operationId: op.id,
          options: { quality: 0.85, flattenTransparency: true },
          warnings: [...op.warnings, 'MOBILE_LIMIT'],
        };
      }
      if (source.category === 'audio') {
        const op = getOperationById('wav-to-m4a') ?? getOperationById(`${source.format}-to-m4a`);
        if (!op) return null;
        return { operationId: op.id, options: { bitrateKbps: 192, channels: 2 }, warnings: op.warnings };
      }
      if (source.category === 'video') {
        const op = getOperationById(`${source.format}-to-mp4`) ?? getOperationById('webm-to-mp4');
        if (!op) return null;
        return {
          operationId: op.id,
          options: { transcode: true, videoBitrateKbps: 2500, videoCodec: 'libx264', audioCodec: 'aac' },
          warnings: [...op.warnings, 'MOBILE_LIMIT'],
        };
      }
      return null;
    },
  },
  {
    id: 'android',
    label: 'Android',
    description: 'MP4 (H.264/AAC), MP3 audio, and WebP images for broad Android device support.',
    categoryHints: Object.freeze(['image', 'audio', 'video']),
    warnings: Object.freeze(['MOBILE_LIMIT']),
    planDefaults(source) {
      if (source.category === 'image') {
        const op = pickImageOutput(source.format, 'webp');
        if (!op) return null;
        return { operationId: op.id, options: { quality: 0.85 }, warnings: [...op.warnings, 'MOBILE_LIMIT'] };
      }
      if (source.category === 'audio') {
        const op = getOperationById('wav-to-mp3') ?? getOperationById(`${source.format}-to-mp3`);
        if (!op) return null;
        return { operationId: op.id, options: { bitrateKbps: 192 }, warnings: op.warnings };
      }
      if (source.category === 'video') {
        const op = getOperationById(`${source.format}-to-mp4`) ?? getOperationById('webm-to-mp4');
        if (!op) return null;
        return {
          operationId: op.id,
          options: { transcode: true, videoBitrateKbps: 2500 },
          warnings: [...op.warnings, 'MOBILE_LIMIT'],
        };
      }
      return null;
    },
  },
  {
    id: 'email',
    label: 'Email attachment',
    description: 'Smaller, widely-supported formats sized for email attachment limits.',
    categoryHints: Object.freeze(['image', 'audio', 'video', 'data']),
    warnings: Object.freeze(['LOSSY']),
    planDefaults(source) {
      if (source.category === 'image') {
        const op = pickImageOutput(source.format, 'jpeg');
        if (!op) return null;
        return {
          operationId: op.id,
          options: { maxWidth: 1600, maxHeight: 1600, quality: 0.75, flattenTransparency: true },
          warnings: [...op.warnings, 'FLATTEN_ALPHA'],
        };
      }
      if (source.category === 'audio') {
        const op = getOperationById('wav-to-mp3') ?? getOperationById(`${source.format}-to-mp3`);
        if (!op) return null;
        return { operationId: op.id, options: { bitrateKbps: 96 }, warnings: op.warnings };
      }
      if (source.category === 'video') {
        const op = getOperationById(`${source.format}-to-mp4`) ?? getOperationById('webm-to-mp4');
        if (!op) return null;
        return { operationId: op.id, options: { transcode: true, videoBitrateKbps: 500 }, warnings: op.warnings };
      }
      return null;
    },
  },
  {
    id: 'discord',
    label: 'Discord',
    description: 'Compact MP4/WebP output for chat upload limits (exact limits vary by server boost level).',
    categoryHints: Object.freeze(['image', 'video']),
    warnings: Object.freeze(['LOSSY', 'TARGET_SIZE_APPROX']),
    planDefaults(source) {
      if (source.category === 'image') {
        const op = pickImageOutput(source.format, 'webp');
        if (!op) return null;
        return { operationId: op.id, options: { quality: 0.8, maxWidth: 1920, maxHeight: 1920 }, warnings: op.warnings };
      }
      if (source.category === 'video') {
        const op = getOperationById(`${source.format}-to-mp4`) ?? getOperationById('webm-to-mp4');
        if (!op) return null;
        return {
          operationId: op.id,
          options: { transcode: true, videoBitrateKbps: 1000 },
          warnings: [...op.warnings, 'TARGET_SIZE_APPROX'],
        };
      }
      return null;
    },
  },
  {
    id: 'website',
    label: 'Website / CMS',
    description: 'Web-optimized WebP images and MP4/WebM video for embedding on a website.',
    categoryHints: Object.freeze(['image', 'video']),
    warnings: Object.freeze(['LOSSY']),
    planDefaults(source) {
      if (source.category === 'image') {
        const op = pickImageOutput(source.format, 'webp');
        if (!op) return null;
        return { operationId: op.id, options: { maxWidth: 1920, maxHeight: 1920, quality: 0.82 }, warnings: op.warnings };
      }
      if (source.category === 'video') {
        const op = getOperationById(`${source.format}-to-webm`) ?? getOperationById('mp4-to-webm');
        if (!op) return null;
        return { operationId: op.id, options: { transcode: true, videoBitrateKbps: 2500 }, warnings: op.warnings };
      }
      return null;
    },
  },
  {
    id: 'podcast',
    label: 'Podcast distribution',
    description: 'Mono 128kbps MP3, the de facto standard for podcast hosts and players.',
    categoryHints: Object.freeze(['audio']),
    warnings: Object.freeze(['LOSSY', 'STRIP_METADATA']),
    planDefaults(source) {
      if (source.category !== 'audio') return null;
      const op = getOperationById('wav-to-mp3') ?? getOperationById(`${source.format}-to-mp3`);
      if (!op) return null;
      return { operationId: op.id, options: { bitrateKbps: 128, channels: 1 }, warnings: op.warnings };
    },
  },
  {
    id: 'presentation',
    label: 'Slides / presentation',
    description: 'High-quality PNG images and MP4 video for embedding in slide decks.',
    categoryHints: Object.freeze(['image', 'video']),
    warnings: Object.freeze([]),
    planDefaults(source) {
      if (source.category === 'image') {
        const op = pickImageOutput(source.format, 'png');
        if (!op) return null;
        return { operationId: op.id, options: {}, warnings: op.warnings };
      }
      if (source.category === 'video') {
        const op = getOperationById(`${source.format}-to-mp4`) ?? getOperationById('webm-to-mp4');
        if (!op) return null;
        return { operationId: op.id, options: { transcode: true, videoBitrateKbps: 5000 }, warnings: op.warnings };
      }
      return null;
    },
  },
  {
    id: 'editing',
    label: 'Editing / archival',
    description: 'Lossless or near-lossless output preserved for further editing.',
    categoryHints: Object.freeze(['image', 'audio', 'video']),
    warnings: Object.freeze(['STRUCTURE_PRESERVE']),
    planDefaults(source) {
      if (source.category === 'image') {
        const op = pickImageOutput(source.format, 'png');
        if (!op) return null;
        return { operationId: op.id, options: {}, warnings: op.warnings };
      }
      if (source.category === 'audio') {
        const op = getOperationById('wav-transform');
        if (!op) return null;
        return { operationId: op.id, options: {}, warnings: op.warnings };
      }
      if (source.category === 'video') {
        const op = getOperationById(`${source.format}-remux`) ?? getOperationById('mp4-remux');
        if (!op) return null;
        return { operationId: op.id, options: { transcode: false }, warnings: op.warnings };
      }
      return null;
    },
  },
]);

const PROFILES_BY_ID = new Map(COMPATIBILITY_PROFILES.map((p) => [p.id, p]));

/**
 * @returns {ReadonlyArray<CompatibilityProfile>}
 */
export function listCompatibilityProfiles() {
  return COMPATIBILITY_PROFILES;
}

/**
 * @param {string} profileId
 * @returns {CompatibilityProfile | undefined}
 */
export function getCompatibilityProfile(profileId) {
  return PROFILES_BY_ID.get(profileId);
}

/**
 * @param {string} profileId
 * @param {SourceAnalysis} sourceAnalysis
 * @returns {{ plan: ConversionPlan, warnings: ReadonlyArray<string> } | null}
 */
export function resolveCompatibilityPlan(profileId, sourceAnalysis) {
  const profile = getCompatibilityProfile(profileId);
  if (!profile || !sourceAnalysis) return null;

  const resolved = profile.planDefaults(sourceAnalysis);
  if (!resolved) return null;

  const warnings = [...new Set([...profile.warnings, ...resolved.warnings])];
  const plan = createConversionPlan({
    goalId: `compat:${profile.id}`,
    operationId: resolved.operationId,
    options: resolved.options,
    warnings,
    compatibilityProfile: profile.id,
  });

  return { plan, warnings: Object.freeze(warnings) };
}
