import pdfjs, { ensurePdfJs, getDocumentOptions } from '@/lib/tools/pdftools/pdfjs-setup';
import { THUMB_WIDTH } from '@/lib/tools/pdftools/constants';

/** @type {Map<string, Promise<import('pdfjs-dist').PDFDocumentProxy>>} */
const docCache = new Map();

/** @type {Map<string, string>} */
const blobUrlCache = new Map();

/** @type {Map<string, string>} */
const renderCache = new Map();

const PIPELINE_TIMEOUT_MS = 25_000;

/**
 * @typedef {Object} PageLayout
 * @property {number} displayWidth
 * @property {number} displayHeight
 * @property {number} pdfWidth
 * @property {number} pdfHeight
 */

/**
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {string} message
 * @returns {Promise<T>}
 */
async function withTimeout(promise, ms, message) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function renderCacheKey(cacheId, pageIndex, rotation, maxWidth, mime) {
  return `${cacheId}:${pageIndex}:${rotation}:${maxWidth}:${mime}`;
}

function revokeBlobUrl(cacheId) {
  const url = blobUrlCache.get(cacheId);
  if (url) {
    URL.revokeObjectURL(url);
    blobUrlCache.delete(cacheId);
  }
}

export async function getPdfDoc(data, cacheId) {
  await ensurePdfJs();

  if (docCache.has(cacheId)) return docCache.get(cacheId);

  const promise = withTimeout(
    openPdfDocument(data, cacheId),
    PIPELINE_TIMEOUT_MS,
    'Opening PDF timed out.',
  );

  docCache.set(cacheId, promise);
  try {
    return await promise;
  } catch (err) {
    docCache.delete(cacheId);
    revokeBlobUrl(cacheId);
    throw err;
  }
}

async function openPdfDocument(data, cacheId) {
  const opts = getDocumentOptions(data);
  if (opts.url) blobUrlCache.set(cacheId, opts.url);
  try {
    return await pdfjs.getDocument(opts).promise;
  } catch (err) {
    revokeBlobUrl(cacheId);
    throw err;
  }
}

export function clearPdfDocCache() {
  for (const cacheId of [...blobUrlCache.keys()]) {
    revokeBlobUrl(cacheId);
  }
  docCache.clear();
  renderCache.clear();
}

export async function getPageCount(data, cacheId = 'count') {
  const pdf = await getPdfDoc(data, cacheId);
  return pdf.numPages;
}

/**
 * @returns {Promise<{ dataUrl: string, layout: PageLayout }>}
 */
async function renderPageWithLayout(data, cacheId, pageIndex, rotation, maxWidth, mime) {
  const key = renderCacheKey(cacheId, pageIndex, rotation, maxWidth, mime);
  const cached = renderCache.get(key);

  const pdf = await getPdfDoc(data, cacheId);
  const page = await pdf.getPage(pageIndex + 1);
  const base = page.getViewport({ scale: 1, rotation });
  const scale = maxWidth / base.width;
  const viewport = page.getViewport({ scale, rotation });

  const layout = {
    displayWidth: viewport.width,
    displayHeight: viewport.height,
    pdfWidth: base.width,
    pdfHeight: base.height,
  };

  if (cached) {
    return { dataUrl: cached, layout };
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Could not create canvas context.');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await withTimeout(
    page.render({ canvasContext: ctx, viewport }).promise,
    PIPELINE_TIMEOUT_MS,
    'Rendering PDF page timed out.',
  );

  const dataUrl = canvas.toDataURL(mime, mime === 'image/jpeg' ? 0.82 : undefined);
  if (!dataUrl || dataUrl.length < 128) {
    throw new Error('Rendered page produced an empty image.');
  }

  renderCache.set(key, dataUrl);
  return { dataUrl, layout };
}

export async function renderPageThumbnail(data, cacheId, pageIndex, rotation = 0) {
  const { dataUrl } = await renderPageWithLayout(data, cacheId, pageIndex, rotation, THUMB_WIDTH, 'image/jpeg');
  return dataUrl;
}

export async function renderPagePreview(data, cacheId, pageIndex, rotation = 0, maxWidth = 720) {
  const { dataUrl } = await renderPageWithLayout(data, cacheId, pageIndex, rotation, maxWidth, 'image/jpeg');
  return dataUrl;
}

/**
 * @returns {Promise<{ dataUrl: string, layout: PageLayout }>}
 */
export async function renderPagePreviewWithLayout(data, cacheId, pageIndex, rotation = 0, maxWidth = 720) {
  return renderPageWithLayout(data, cacheId, pageIndex, rotation, maxWidth, 'image/jpeg');
}
