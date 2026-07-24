import { SHAPE_CATALOG } from './image-shapes.js';

/**
 * Curated graphics — inline SVG (MIT Lucide-style paths), local-only.
 * @typedef {{ id: string, label: string, category: 'graphics', keywords: string[], svg: string }} GraphicItem
 * @typedef {{ id: string, label: string, category: 'shapes', shape: string, keywords: string[] }} ShapeItem
 */

/** @type {GraphicItem[]} */
export const GRAPHIC_CATALOG = [
  { id: 'star', label: 'Star', category: 'graphics', keywords: ['star', 'favorite'], svg: svgIcon('M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z') },
  { id: 'heart', label: 'Heart', category: 'graphics', keywords: ['heart', 'love'], svg: svgIcon('M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z') },
  { id: 'check', label: 'Check', category: 'graphics', keywords: ['check', 'ok'], svg: svgIcon('M20 6L9 17l-5-5') },
  { id: 'x', label: 'X', category: 'graphics', keywords: ['close', 'x'], svg: svgIcon('M18 6L6 18M6 6l12 12') },
  { id: 'plus', label: 'Plus', category: 'graphics', keywords: ['plus', 'add'], svg: svgIcon('M12 5v14M5 12h14') },
  { id: 'minus', label: 'Minus', category: 'graphics', keywords: ['minus'], svg: svgIcon('M5 12h14') },
  { id: 'arrow-right', label: 'Arrow right', category: 'graphics', keywords: ['arrow'], svg: svgIcon('M5 12h14M13 5l7 7-7 7') },
  { id: 'arrow-left', label: 'Arrow left', category: 'graphics', keywords: ['arrow'], svg: svgIcon('M19 12H5M11 19l-7-7 7-7') },
  { id: 'arrow-up', label: 'Arrow up', category: 'graphics', keywords: ['arrow'], svg: svgIcon('M12 19V5M5 11l7-7 7 7') },
  { id: 'arrow-down', label: 'Arrow down', category: 'graphics', keywords: ['arrow'], svg: svgIcon('M12 5v14M19 13l-7 7-7-7') },
  { id: 'circle', label: 'Circle', category: 'graphics', keywords: ['circle'], svg: svgIcon('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z') },
  { id: 'square', label: 'Square', category: 'graphics', keywords: ['square'], svg: svgIcon('M4 4h16v16H4z') },
  { id: 'triangle', label: 'Triangle', category: 'graphics', keywords: ['triangle'], svg: svgIcon('M12 3l10 18H2L12 3z') },
  { id: 'bookmark', label: 'Bookmark', category: 'graphics', keywords: ['bookmark'], svg: svgIcon('M6 3h12v18l-6-4-6 4V3z') },
  { id: 'flag', label: 'Flag', category: 'graphics', keywords: ['flag'], svg: svgIcon('M4 22V4m0 0h10l-2 4 2 4H4') },
  { id: 'pin', label: 'Pin', category: 'graphics', keywords: ['pin', 'map'], svg: svgIcon('M12 22s8-5.5 8-12a8 8 0 1 0-16 0c0 6.5 8 12 8 12z') },
  { id: 'home', label: 'Home', category: 'graphics', keywords: ['home'], svg: svgIcon('M3 11l9-8 9 8v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9z') },
  { id: 'user', label: 'User', category: 'graphics', keywords: ['user', 'person'], svg: svgIcon('M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z') },
  { id: 'mail', label: 'Mail', category: 'graphics', keywords: ['mail', 'email'], svg: svgIcon('M4 6h16v12H4zM4 6l8 7 8-7') },
  { id: 'phone', label: 'Phone', category: 'graphics', keywords: ['phone'], svg: svgIcon('M6 3h4l2 5-3 2a12 12 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2z') },
  { id: 'link', label: 'Link', category: 'graphics', keywords: ['link'], svg: svgIcon('M10 14a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1') },
  { id: 'image', label: 'Image', category: 'graphics', keywords: ['image', 'photo'], svg: svgIcon('M4 5h16v14H4zM8 11l3 4 3-3 4 5') },
  { id: 'camera', label: 'Camera', category: 'graphics', keywords: ['camera'], svg: svgIcon('M4 8h4l2-2h4l2 2h4v12H4zM12 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6z') },
  { id: 'music', label: 'Music', category: 'graphics', keywords: ['music'], svg: svgIcon('M9 18V6l10-2v12M9 18a3 3 0 1 1-2-2.8M19 16a3 3 0 1 1-2-2.8') },
  { id: 'zap', label: 'Zap', category: 'graphics', keywords: ['zap', 'bolt'], svg: svgIcon('M13 2L4 14h7l-1 8 9-12h-7l1-8z') },
  { id: 'sun', label: 'Sun', category: 'graphics', keywords: ['sun', 'light'], svg: svgIcon('M12 4V2M12 22v-2M4.9 4.9L3.5 3.5M20.5 20.5l-1.4-1.4M4 12H2M22 12h-2M4.9 19.1L3.5 20.5M20.5 3.5l-1.4 1.4M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z') },
  { id: 'moon', label: 'Moon', category: 'graphics', keywords: ['moon'], svg: svgIcon('M20 14.5A8.5 8.5 0 1 1 9.5 4 7 7 0 0 0 20 14.5z') },
  { id: 'cloud', label: 'Cloud', category: 'graphics', keywords: ['cloud'], svg: svgIcon('M18 18H7a4 4 0 1 1 1-7.9A6 6 0 1 1 18 18z') },
  { id: 'alert', label: 'Alert', category: 'graphics', keywords: ['alert', 'warning'], svg: svgIcon('M12 3l10 18H2L12 3zM12 10v4M12 17h.01') },
  { id: 'info', label: 'Info', category: 'graphics', keywords: ['info'], svg: svgIcon('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 10v6M12 8h.01') },
  { id: 'smile', label: 'Smile', category: 'graphics', keywords: ['smile', 'emoji'], svg: svgIcon('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM8 10h.01M16 10h.01M8.5 15a4 4 0 0 0 7 0') },
  { id: 'thumbs-up', label: 'Thumbs up', category: 'graphics', keywords: ['thumbs', 'like'], svg: svgIcon('M7 11v10M14 21H7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h2l2-7a2 2 0 0 1 4 0v5h4a2 2 0 0 1 2 2l-1 7a2 2 0 0 1-2 2z') },
];

/** @type {ShapeItem[]} */
export const SHAPE_ITEMS = SHAPE_CATALOG.map((s) => ({
  id: s.id,
  label: s.label,
  category: 'shapes',
  shape: s.id,
  keywords: [s.label.toLowerCase(), s.id],
}));

/**
 * @param {string} d
 */
function svgIcon(d) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
}

/**
 * @param {'graphics'|'shapes'|'images'} category
 * @param {string} query
 * @param {{ id: string, name: string }[]} [sessionImages]
 */
export function searchElements(category, query, sessionImages = []) {
  const q = String(query || '').trim().toLowerCase();
  if (category === 'shapes') {
    return SHAPE_ITEMS.filter((item) => !q || item.keywords.some((k) => k.includes(q)) || item.label.toLowerCase().includes(q));
  }
  if (category === 'graphics') {
    return GRAPHIC_CATALOG.filter((item) => !q
      || item.label.toLowerCase().includes(q)
      || item.keywords.some((k) => k.includes(q)));
  }
  // images — session layers
  return sessionImages
    .filter((img) => !q || img.name.toLowerCase().includes(q))
    .map((img) => ({
      id: img.id,
      label: img.name,
      category: 'images',
      keywords: [img.name.toLowerCase()],
      layerId: img.id,
    }));
}

/**
 * Rasterize SVG string to canvas (Image + data URL — more reliable than createImageBitmap for SVG).
 * @param {string} svg
 * @param {number} [size]
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function svgToCanvas(svg, size = 96) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const img = new Image();
  img.decoding = 'async';
  await new Promise((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('SVG rasterize failed'));
    img.src = dataUrl;
  });
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(img, 0, 0, size, size);
  return canvas;
}

/**
 * @param {string} id
 */
export function getGraphicById(id) {
  return GRAPHIC_CATALOG.find((g) => g.id === id) ?? null;
}
