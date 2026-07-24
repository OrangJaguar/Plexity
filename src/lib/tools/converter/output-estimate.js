/**
 * Coarse, honest output-size estimation.
 *
 * sizeBias is the user-facing control:
 *   -1 = aggressive compress
 *    0 = roughly match the original file size (center of the slider)
 *   +1 = larger / higher quality (room to improve or upscale)
 *
 * These are rough forward estimates — never a guarantee.
 */

import { getOperationById } from './conversion-capabilities.js';

/** @typedef {'image' | 'audio' | 'video' | 'data'} ConverterCategory */
/** @typedef {'low' | 'medium' | 'high'} UncertaintyLevel */

/**
 * @typedef {object} OutputEstimateResult
 * @property {number} bytes
 * @property {UncertaintyLevel} uncertainty
 * @property {number} savingsRatio
 * @property {number} sizeBias
 */

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Map size bias to a size multiplier centered on 1× at bias 0.
 * @param {number} bias -1…1
 * @returns {number}
 */
export function sizeBiasToFactor(bias) {
  const b = clamp(Number.isFinite(bias) ? bias : 0, -1, 1);
  if (b <= 0) return 0.25 + 0.75 * (b + 1); // -1 → 0.25, 0 → 1
  return 1 + b; // 0 → 1, +1 → 2
}

/**
 * Mild format-change baseline at bias 0 (same “intent”, different container).
 * Kept close to 1 so the center of the slider ≈ original size.
 * @param {ConverterCategory} category
 * @param {{ id?: string, outputFormat?: string, lossy?: boolean } | null} operation
 * @param {Record<string, unknown>} [options]
 * @returns {number}
 */
export function formatChangeBaseline(category, operation, options = {}) {
  const out = String(operation?.outputFormat ?? '').toLowerCase();
  const id = String(operation?.id ?? '');

  if (category === 'image') {
    if (out === 'jpeg' || id.includes('-to-jpeg')) return 0.95;
    if (out === 'webp' || id.includes('-to-webp')) return 0.92;
    if (out === 'png' || id.includes('-to-png')) return 1.05;
    return 1;
  }
  if (category === 'data') {
    return options.pretty === false ? 0.9 : 1.05;
  }
  // Remux / same-container media: treat as 1× at center.
  if (id.includes('-remux')) return 1;
  return 1;
}

/**
 * @param {string | { id?: string, lossy?: boolean, outputFormat?: string } | null | undefined} operation
 * @returns {{ id: string | null, lossy: boolean, outputFormat: string | null }}
 */
function resolveOperation(operation) {
  if (!operation) return { id: null, lossy: false, outputFormat: null };
  const op = typeof operation === 'string' ? getOperationById(operation) : operation;
  if (!op) return { id: typeof operation === 'string' ? operation : null, lossy: false, outputFormat: null };
  return {
    id: op.id ?? null,
    lossy: Boolean(op.lossy),
    outputFormat: op.outputFormat ?? null,
  };
}

/**
 * Infer the source’s average bitrate (kbps) from size + duration.
 * @param {number} sourceBytes
 * @param {number} durationSec
 * @returns {number | null}
 */
export function inferSourceBitrateKbps(sourceBytes, durationSec) {
  if (!(sourceBytes > 0) || !(durationSec > 0)) return null;
  return (sourceBytes * 8) / durationSec / 1000;
}

/**
 * @param {object} params
 * @param {ConverterCategory} params.category
 * @param {number} params.sourceBytes
 * @param {string | object} [params.operation]
 * @param {Record<string, unknown>} [params.options]
 * @param {number | null} [params.durationSec]
 * @param {number} [params.sizeBias] -1…1 (options.sizeBias wins when set)
 * @returns {OutputEstimateResult}
 */
export function estimateOutputSize(params) {
  const { category, sourceBytes, operation, options = {}, durationSec = null } = params;
  const safeSourceBytes = Number.isFinite(sourceBytes) && sourceBytes > 0 ? sourceBytes : 0;
  const resolved = resolveOperation(operation);
  const bias = clamp(
    Number(options.sizeBias ?? params.sizeBias ?? 0),
    -1,
    1,
  );
  const factor = sizeBiasToFactor(bias);
  const baselineMul = formatChangeBaseline(category, resolved, options);

  let bytes = Math.round(safeSourceBytes * baselineMul * factor);
  /** @type {UncertaintyLevel} */
  let uncertainty = 'medium';

  if ((category === 'audio' || category === 'video') && Number.isFinite(durationSec) && durationSec > 0) {
    const sourceBr = inferSourceBitrateKbps(safeSourceBytes, durationSec);
    if (sourceBr != null) {
      // Prefer explicit encoder targets when the user already moved the slider /
      // options were mapped from bias — but keep them relative to source when absent.
      const explicit = Number(
        category === 'video' ? options.videoBitrateKbps ?? options.bitrateKbps : options.bitrateKbps,
      );
      let totalKbps;
      if (Number.isFinite(explicit) && explicit > 0 && options.sizeBias == null && params.sizeBias == null) {
        // Legacy path: absolute bitrate without bias → absolute estimate.
        const audioAllocationKbps = category === 'video' ? Number(options.audioBitrateKbps ?? 128) : 0;
        totalKbps = explicit + (Number.isFinite(audioAllocationKbps) ? audioAllocationKbps : 0);
        uncertainty = 'low';
      } else {
        totalKbps = sourceBr * factor * baselineMul;
        uncertainty = 'medium';
      }
      bytes = Math.round((totalKbps * 1000 * durationSec) / 8);
    } else {
      uncertainty = 'high';
    }
  } else if (category === 'image') {
    uncertainty = 'medium';
  } else if (category === 'data') {
    uncertainty = 'medium';
  } else {
    uncertainty = 'high';
  }

  bytes = Math.max(0, bytes);
  const savingsRatio = safeSourceBytes > 0 ? clamp(1 - bytes / safeSourceBytes, -1, 1) : 0;

  return Object.freeze({ bytes, uncertainty, savingsRatio, sizeBias: bias });
}

/**
 * Map a size bias into concrete encoder options for the active category.
 * @param {object} params
 * @param {ConverterCategory | string} params.category
 * @param {number} params.sizeBias
 * @param {number} params.sourceBytes
 * @param {number | null} [params.durationSec]
 * @param {number | null} [params.width]
 * @param {number | null} [params.height]
 * @returns {Record<string, unknown>}
 */
export function encoderOptionsFromSizeBias(params) {
  const bias = clamp(Number(params.sizeBias) || 0, -1, 1);
  const factor = sizeBiasToFactor(bias);
  const category = String(params.category ?? '');

  if (category === 'image') {
    const quality = bias <= 0
      ? 0.2 + 0.72 * (bias + 1) // -1 → 0.20, 0 → 0.92
      : 0.92 + 0.08 * bias; // 0 → 0.92, +1 → 1.00
    const scale = bias <= 0 ? 1 : 1 + 0.5 * bias; // 0 → 1×, +1 → 1.5×
    /** @type {Record<string, unknown>} */
    const next = { sizeBias: bias, quality: Math.round(quality * 100) / 100 };
    if (scale > 1.001) next.scale = Math.round(scale * 100) / 100;
    else next.scale = 1;
    return next;
  }

  if (category === 'video') {
    const durationSec = Number(params.durationSec ?? 0);
    const sourceBr = inferSourceBitrateKbps(params.sourceBytes, durationSec);
    const audioBitrateKbps = 128;
    let videoBitrateKbps;
    if (sourceBr != null) {
      videoBitrateKbps = Math.max(250, Math.round((sourceBr - audioBitrateKbps) * factor));
    } else {
      videoBitrateKbps = Math.max(250, Math.round(2500 * factor));
    }
    const fps = bias < -0.35 ? 24 : bias > 0.35 ? 60 : 30;
    return {
      sizeBias: bias,
      videoBitrateKbps,
      audioBitrateKbps,
      fps,
    };
  }

  if (category === 'audio') {
    const durationSec = Number(params.durationSec ?? 0);
    const sourceBr = inferSourceBitrateKbps(params.sourceBytes, durationSec);
    const bitrateKbps = sourceBr != null
      ? Math.max(64, Math.round(sourceBr * factor))
      : Math.max(64, Math.round(192 * factor));
    return { sizeBias: bias, bitrateKbps };
  }

  return { sizeBias: bias };
}
