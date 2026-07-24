import { GRAPHIC_CATALOG, getGraphicById, svgToCanvas } from '@/lib/tools/image/image-elements-catalog.js';
import { VIDEO_IMAGE_DEFAULT_MS } from './video-limits.js';

export const VIDEO_STICKER_DEFAULT_MS = VIDEO_IMAGE_DEFAULT_MS;
export const VIDEO_STICKER_DEFAULT_SIZE = 240;

/** @returns {typeof GRAPHIC_CATALOG} */
export function listVideoStickers() {
  return GRAPHIC_CATALOG;
}

export { getGraphicById };

/**
 * Rasterize sticker SVG to a PNG Blob + object URL for timeline/preview/export.
 * @param {string} graphicId
 * @param {number} [size]
 * @returns {Promise<{ blob: Blob, objectUrl: string, width: number, height: number, name: string }>}
 */
export async function rasterizeSticker(graphicId, size = VIDEO_STICKER_DEFAULT_SIZE) {
  const graphic = getGraphicById(graphicId);
  if (!graphic) throw new Error(`Unknown sticker: ${graphicId}`);
  const canvas = await svgToCanvas(graphic.svg, size);
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Sticker encode failed'))), 'image/png');
  });
  const objectUrl = URL.createObjectURL(blob);
  return {
    blob,
    objectUrl,
    width: size,
    height: size,
    name: `${graphic.label}.png`,
  };
}

/**
 * Data URL for lightweight preview thumbs (no blob lifecycle).
 * @param {string} graphicId
 */
export function stickerDataUrl(graphicId) {
  const graphic = getGraphicById(graphicId);
  if (!graphic) return '';
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(graphic.svg)}`;
}
