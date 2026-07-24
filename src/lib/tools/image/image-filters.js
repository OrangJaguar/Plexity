import { applyAdjustToImageData, defaultAdjustParams } from './image-adjust.js';
import { cloneCanvas, getImageData, canvasFromImageData } from './image-decode.js';

/**
 * @typedef {{ id: string, label: string, category: string, adjust: import('./image-adjust.js').ImageAdjustParams }} ImageFilterPreset
 */

/** @type {ImageFilterPreset[]} */
export const IMAGE_FILTER_PRESETS = [
  { id: 'none', label: 'Original', category: 'Natural', adjust: defaultAdjustParams() },
  { id: 'fresco', label: 'Fresco', category: 'Natural', adjust: { brightness: 0.06, contrast: 0.12, exposure: 0.05, saturation: -0.15, temperature: 0.08, tint: 0 } },
  { id: 'belvedere', label: 'Belvedere', category: 'Natural', adjust: { brightness: 0.02, contrast: 0.18, exposure: 0, saturation: -0.25, temperature: -0.05, tint: 0.05 } },
  { id: 'flint', label: 'Flint', category: 'Natural', adjust: { brightness: -0.04, contrast: 0.22, exposure: -0.05, saturation: -0.35, temperature: -0.1, tint: 0 } },
  { id: 'luna', label: 'Luna', category: 'Natural', adjust: { brightness: 0.08, contrast: 0.1, exposure: 0.08, saturation: -0.4, temperature: -0.15, tint: 0.05 } },
  { id: 'aero', label: 'Aero', category: 'Natural', adjust: { brightness: 0.1, contrast: 0.08, exposure: 0.1, saturation: 0.15, temperature: -0.2, tint: 0.1 } },
  { id: 'myst', label: 'Myst', category: 'Natural', adjust: { brightness: 0.04, contrast: -0.05, exposure: 0.12, saturation: -0.2, temperature: 0.05, tint: -0.05 } },
  { id: 'ember', label: 'Ember', category: 'Warm', adjust: { brightness: 0.05, contrast: 0.15, exposure: 0.05, saturation: 0.2, temperature: 0.45, tint: 0.1 } },
  { id: 'sunlit', label: 'Sunlit', category: 'Warm', adjust: { brightness: 0.12, contrast: 0.1, exposure: 0.15, saturation: 0.1, temperature: 0.35, tint: 0.05 } },
  { id: 'amber', label: 'Amber', category: 'Warm', adjust: { brightness: 0, contrast: 0.2, exposure: 0, saturation: 0.05, temperature: 0.55, tint: 0.15 } },
  { id: 'frost', label: 'Frost', category: 'Cool', adjust: { brightness: 0.06, contrast: 0.12, exposure: 0.05, saturation: -0.1, temperature: -0.4, tint: -0.05 } },
  { id: 'steel', label: 'Steel', category: 'Cool', adjust: { brightness: -0.02, contrast: 0.25, exposure: -0.05, saturation: -0.3, temperature: -0.35, tint: 0 } },
  { id: 'glacier', label: 'Glacier', category: 'Cool', adjust: { brightness: 0.1, contrast: 0.08, exposure: 0.1, saturation: -0.15, temperature: -0.5, tint: 0.05 } },
  { id: 'noir', label: 'Noir', category: 'Mood', adjust: { brightness: -0.05, contrast: 0.35, exposure: -0.1, saturation: -1, temperature: 0, tint: 0 } },
  { id: 'fade', label: 'Fade', category: 'Mood', adjust: { brightness: 0.15, contrast: -0.2, exposure: 0.1, saturation: -0.35, temperature: 0.1, tint: 0 } },
  { id: 'punch', label: 'Punch', category: 'Mood', adjust: { brightness: 0.02, contrast: 0.4, exposure: 0.05, saturation: 0.35, temperature: 0.1, tint: 0 } },
];

/**
 * @returns {string[]}
 */
export function listFilterCategories() {
  const seen = new Set();
  const out = [];
  for (const preset of IMAGE_FILTER_PRESETS) {
    if (!seen.has(preset.category)) {
      seen.add(preset.category);
      out.push(preset.category);
    }
  }
  return out;
}

/**
 * @param {string | null | undefined} id
 */
export function getFilterPreset(id) {
  return IMAGE_FILTER_PRESETS.find((p) => p.id === id) ?? IMAGE_FILTER_PRESETS[0];
}

/**
 * @param {HTMLCanvasElement} source
 * @param {string | null | undefined} filterId
 * @returns {HTMLCanvasElement}
 */
export function applyFilterToCanvas(source, filterId) {
  const preset = getFilterPreset(filterId);
  if (!filterId || filterId === 'none') return cloneCanvas(source);
  const data = getImageData(cloneCanvas(source));
  applyAdjustToImageData(data, preset.adjust);
  return canvasFromImageData(data);
}

/**
 * Build a small preview thumbnail for a filter.
 * @param {HTMLCanvasElement} source
 * @param {string} filterId
 * @param {number} [thumbSize]
 * @returns {HTMLCanvasElement}
 */
export function renderFilterThumbnail(source, filterId, thumbSize = 72) {
  const scale = Math.min(thumbSize / source.width, thumbSize / source.height, 1);
  const w = Math.max(1, Math.round(source.width * scale));
  const h = Math.max(1, Math.round(source.height * scale));
  const mini = document.createElement('canvas');
  mini.width = w;
  mini.height = h;
  const ctx = mini.getContext('2d');
  if (!ctx) return mini;
  ctx.drawImage(source, 0, 0, w, h);
  return applyFilterToCanvas(mini, filterId);
}
