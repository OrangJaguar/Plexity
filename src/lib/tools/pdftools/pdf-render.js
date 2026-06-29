import pdfjs from '@/lib/tools/pdftools/pdfjs-setup';
import { THUMB_WIDTH } from '@/lib/tools/pdftools/constants';

/** @type {Map<string, Promise<import('pdfjs-dist').PDFDocumentProxy>>} */
const docCache = new Map();

function pdfDataCopy(data) {
  return new Uint8Array(data);
}

/**
 * @param {Uint8Array} data
 * @param {string} cacheId
 */
export async function getPdfDoc(data, cacheId) {
  if (docCache.has(cacheId)) return docCache.get(cacheId);

  const promise = pdfjs.getDocument({
    data: pdfDataCopy(data),
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  docCache.set(cacheId, promise);
  try {
    return await promise;
  } catch (err) {
    docCache.delete(cacheId);
    console.error('[pdf] Failed to open document:', cacheId, err);
    throw err;
  }
}

export function clearPdfDocCache() {
  docCache.clear();
}

/**
 * @param {Uint8Array} data
 * @param {string} [cacheId]
 */
export async function getPageCount(data, cacheId = 'count') {
  const pdf = await getPdfDoc(data, cacheId);
  return pdf.numPages;
}

async function renderPageToDataUrl(data, cacheId, pageIndex, rotation, maxWidth, mime) {
  const pdf = await getPdfDoc(data, cacheId);
  const page = await pdf.getPage(pageIndex + 1);
  const base = page.getViewport({ scale: 1, rotation });
  const scale = maxWidth / base.width;
  const viewport = page.getViewport({ scale, rotation });

  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Could not create canvas context.');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const renderTask = page.render({
    canvasContext: ctx,
    viewport,
    canvas,
  });
  await renderTask.promise;

  return canvas.toDataURL(mime, mime === 'image/jpeg' ? 0.85 : undefined);
}

/**
 * @param {Uint8Array} data
 * @param {string} cacheId
 * @param {number} pageIndex 0-based
 * @param {number} [rotation]
 */
export async function renderPageThumbnail(data, cacheId, pageIndex, rotation = 0) {
  return renderPageToDataUrl(data, cacheId, pageIndex, rotation, THUMB_WIDTH, 'image/jpeg');
}

/**
 * @param {Uint8Array} data
 * @param {string} cacheId
 * @param {number} pageIndex 0-based
 * @param {number} [rotation]
 * @param {number} [maxWidth]
 */
export async function renderPagePreview(data, cacheId, pageIndex, rotation = 0, maxWidth = 720) {
  return renderPageToDataUrl(data, cacheId, pageIndex, rotation, maxWidth, 'image/png');
}
