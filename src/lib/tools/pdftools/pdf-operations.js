import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import { getPdfDoc } from '@/lib/tools/pdftools/pdf-render';

/**
 * @param {Uint8Array} data
 */
async function loadDoc(data) {
  return PDFDocument.load(data, { ignoreEncryption: true });
}

/**
 * @param {Array<{ data: Uint8Array, pageOrder?: number[] }>} files
 * @returns {Promise<Uint8Array>}
 */
export async function mergePdfs(files) {
  const merged = await PDFDocument.create();
  for (const file of files) {
    const src = await loadDoc(file.data);
    const count = src.getPageCount();
    const order = file.pageOrder ?? [...Array(count).keys()];
    const pages = await merged.copyPages(src, order);
    pages.forEach((p) => merged.addPage(p));
  }
  return merged.save();
}

/**
 * @param {Uint8Array} data
 * @param {number[]} pageOrder 0-based indices in desired order
 * @param {Record<number, number>} [rotations] pageIndex -> degrees
 * @returns {Promise<Uint8Array>}
 */
export async function reorderPages(data, pageOrder, rotations = {}) {
  const src = await loadDoc(data);
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, pageOrder);
  pages.forEach((page, i) => {
    const origIndex = pageOrder[i];
    const rot = rotations[origIndex] ?? 0;
    if (rot) page.setRotation(degrees(rot));
    out.addPage(page);
  });
  return out.save();
}

/**
 * @param {Uint8Array} data
 * @param {Set<number>|number[]} removeIndices 0-based
 * @returns {Promise<Uint8Array>}
 */
export async function removePages(data, removeIndices) {
  const remove = new Set(removeIndices);
  const src = await loadDoc(data);
  const count = src.getPageCount();
  const keep = [...Array(count).keys()].filter((i) => !remove.has(i));
  if (keep.length === 0) throw new Error('Cannot remove every page.');
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, keep);
  pages.forEach((p) => out.addPage(p));
  return out.save();
}

/**
 * @param {Uint8Array} data
 * @param {Set<number>|number[]} extractIndices 0-based
 * @returns {Promise<Uint8Array>}
 */
export async function extractPages(data, extractIndices) {
  const indices = [...extractIndices].sort((a, b) => a - b);
  if (indices.length === 0) throw new Error('Select at least one page to extract.');
  const src = await loadDoc(data);
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, indices);
  pages.forEach((p) => out.addPage(p));
  return out.save();
}

/**
 * @param {Uint8Array} data
 * @param {Record<number, number>} rotations pageIndex -> cumulative degrees
 * @returns {Promise<Uint8Array>}
 */
export async function applyRotations(data, rotations) {
  const src = await loadDoc(data);
  const count = src.getPageCount();
  const order = [...Array(count).keys()];
  return reorderPages(data, order, rotations);
}

/**
 * @typedef {{ start: number, end: number }} PageRange 1-based inclusive
 */

/**
 * @param {Uint8Array} data
 * @param {PageRange[]} ranges
 * @returns {Promise<{ name: string, data: Uint8Array }[]>}
 */
export async function splitByRanges(data, ranges) {
  const src = await loadDoc(data);
  const total = src.getPageCount();
  const outputs = [];

  for (let i = 0; i < ranges.length; i += 1) {
    const { start, end } = ranges[i];
    const indices = [];
    for (let p = start; p <= end; p += 1) {
      if (p < 1 || p > total) {
        throw new Error(`Page ${p} is out of range (1–${total}).`);
      }
      indices.push(p - 1);
    }
    if (indices.length === 0) continue;
    const out = await PDFDocument.create();
    const pages = await out.copyPages(src, indices);
    pages.forEach((p) => out.addPage(p));
    outputs.push({
      name: `part-${i + 1}.pdf`,
      data: await out.save(),
    });
  }

  if (outputs.length === 0) throw new Error('No output files would be created.');
  return outputs;
}

/**
 * @param {string} text e.g. "1-3, 5, 7-9"
 * @param {number} totalPages
 * @returns {PageRange[]}
 */
export function parseRangeInput(text, totalPages) {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Enter at least one page range.');

  const parts = trimmed.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
  const ranges = [];

  for (const part of parts) {
    const dash = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (dash) {
      const start = Number(dash[1]);
      const end = Number(dash[2]);
      if (start > end) throw new Error(`Invalid range "${part}": start must be ≤ end.`);
      if (start < 1 || end > totalPages) {
        throw new Error(`Range "${part}" is outside 1–${totalPages}.`);
      }
      ranges.push({ start, end });
      continue;
    }
    const single = part.match(/^(\d+)$/);
    if (single) {
      const p = Number(single[1]);
      if (p < 1 || p > totalPages) throw new Error(`Page ${p} is outside 1–${totalPages}.`);
      ranges.push({ start: p, end: p });
      continue;
    }
    throw new Error(`Could not parse "${part}". Use formats like 1-3 or 5.`);
  }

  return ranges;
}

/**
 * @param {number} totalPages
 * @param {number} everyN
 * @returns {PageRange[]}
 */
export function rangesEveryN(totalPages, everyN) {
  if (everyN < 1) throw new Error('N must be at least 1.');
  const ranges = [];
  for (let start = 1; start <= totalPages; start += everyN) {
    ranges.push({ start, end: Math.min(start + everyN - 1, totalPages) });
  }
  return ranges;
}

/**
 * @param {number} totalPages
 * @returns {PageRange[]}
 */
export function rangesEveryPage(totalPages) {
  return [...Array(totalPages).keys()].map((i) => ({ start: i + 1, end: i + 1 }));
}

/**
 * @param {number} totalPages
 * @param {number[]} breakAfter 1-based page numbers after which to split
 * @returns {PageRange[]}
 */
export function rangesAtBreaks(totalPages, breakAfter) {
  const breaks = [...new Set(breakAfter)].sort((a, b) => a - b);
  const ranges = [];
  let start = 1;
  for (const b of breaks) {
    if (b < 1 || b >= totalPages) continue;
    ranges.push({ start, end: b });
    start = b + 1;
  }
  if (start <= totalPages) ranges.push({ start, end: totalPages });
  if (ranges.length === 0) throw new Error('Select at least one split point.');
  return ranges;
}

/**
 * @typedef {Object} Annotation
 * @property {string} id
 * @property {'text'|'highlight'|'draw'|'rect'|'whiteout'|'signature'} type
 * @property {number} x
 * @property {number} y
 * @property {number} [width]
 * @property {number} [height]
 * @property {string} [text]
 * @property {string} [color]
 * @property {number} [strokeWidth]
 * @property {Array<{x:number,y:number}>} [points]
 * @property {string} [imageDataUrl]
 */

/**
 * @param {Uint8Array} data
 * @param {Record<number, Annotation[]>} annotationsByPage 0-based page index
 * @returns {Promise<Uint8Array>}
 */
export async function applyAnnotations(data, annotationsByPage) {
  const pdf = await loadDoc(data);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();

  for (const [pageKey, annotations] of Object.entries(annotationsByPage)) {
    const pageIndex = Number(pageKey);
    const page = pages[pageIndex];
    if (!page || !annotations?.length) continue;

    const { height } = page.getSize();

    for (const ann of annotations) {
      const y = height - ann.y - (ann.height ?? 0);

      if (ann.type === 'text' && ann.text) {
        const size = 14;
        page.drawText(ann.text, {
          x: ann.x,
          y: y,
          size,
          font,
          color: rgb(0.1, 0.1, 0.1),
        });
      }

      if (ann.type === 'highlight' && ann.width && ann.height) {
        page.drawRectangle({
          x: ann.x,
          y: y,
          width: ann.width,
          height: ann.height,
          color: rgb(1, 0.92, 0.23),
          opacity: 0.35,
        });
      }

      if (ann.type === 'whiteout' && ann.width && ann.height) {
        page.drawRectangle({
          x: ann.x,
          y: y,
          width: ann.width,
          height: ann.height,
          color: rgb(1, 1, 1),
          opacity: 1,
        });
      }

      if (ann.type === 'rect' && ann.width && ann.height) {
        page.drawRectangle({
          x: ann.x,
          y: y,
          width: ann.width,
          height: ann.height,
          borderColor: rgb(0.2, 0.45, 0.95),
          borderWidth: 2,
        });
      }

      if (ann.type === 'draw' && ann.points?.length > 1) {
        for (let i = 1; i < ann.points.length; i += 1) {
          const a = ann.points[i - 1];
          const b = ann.points[i];
          page.drawLine({
            start: { x: ann.x + a.x, y: height - ann.y - a.y },
            end: { x: ann.x + b.x, y: height - ann.y - b.y },
            thickness: ann.strokeWidth ?? 2,
            color: rgb(0.9, 0.2, 0.2),
          });
        }
      }

      if (ann.type === 'signature' && ann.imageDataUrl && ann.width && ann.height) {
        const base64 = ann.imageDataUrl.split(',')[1];
        const imgBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const img = await pdf.embedPng(imgBytes);
        page.drawImage(img, {
          x: ann.x,
          y: y,
          width: ann.width,
          height: ann.height,
        });
      }
    }
  }

  return pdf.save();
}

/**
 * @param {Uint8Array} data
 * @param {number} pageIndex 0-based
 * @returns {Promise<string>}
 */
export async function extractPageText(data, pageIndex, cacheId = 'text-search') {
  const pdf = await getPdfDoc(data, cacheId);
  const page = await pdf.getPage(pageIndex + 1);
  const content = await page.getTextContent();
  return content.items
    .map((item) => ('str' in item ? item.str : ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @typedef {{ key: string, fileId: string, pageIndex: number, rotation?: number }} VirtualPageRef
 */

/**
 * @param {VirtualPageRef[]} pageRefs
 * @param {Record<string, Uint8Array>} fileDataMap
 * @param {{ rotations?: Record<string, number>, annotationsByKey?: Record<string, import('./pdf-operations').Annotation[]> }} [opts]
 * @returns {Promise<Uint8Array>}
 */
export async function buildPdfFromVirtualPages(pageRefs, fileDataMap, opts = {}) {
  const { rotations = {}, annotationsByKey = {} } = opts;
  const merged = await PDFDocument.create();
  const srcCache = {};

  for (const ref of pageRefs) {
    if (!srcCache[ref.fileId]) srcCache[ref.fileId] = await loadDoc(fileDataMap[ref.fileId]);
    const rot = rotations[ref.key] ?? ref.rotation ?? 0;
    const [page] = await merged.copyPages(srcCache[ref.fileId], [ref.pageIndex]);
    if (rot) page.setRotation(degrees(rot));
    merged.addPage(page);
  }

  let data = await merged.save();
  const annotByIndex = {};
  pageRefs.forEach((ref, i) => {
    const anns = annotationsByKey[ref.key];
    if (anns?.length) annotByIndex[i] = anns;
  });
  if (Object.keys(annotByIndex).length) {
    data = await applyAnnotations(data, annotByIndex);
  }
  return data;
}

/**
 * @param {VirtualPageRef[]} pageRefs
 * @param {Record<string, Uint8Array>} fileDataMap
 * @param {number[]} breakAfter 1-based global page indices after which to split
 * @param {object} [opts]
 * @returns {Promise<{ name: string, data: Uint8Array }[]>}
 */
export async function splitVirtualPages(pageRefs, fileDataMap, breakAfter, opts = {}) {
  const ranges = rangesAtBreaks(pageRefs.length, breakAfter);
  const outputs = [];
  for (let i = 0; i < ranges.length; i += 1) {
    const slice = pageRefs.slice(ranges[i].start - 1, ranges[i].end);
    const data = await buildPdfFromVirtualPages(slice, fileDataMap, opts);
    outputs.push({ name: `part-${i + 1}.pdf`, data });
  }
  return outputs;
}

/**
 * @param {Uint8Array} data
 */
export async function validatePdf(data) {
  const pdf = await loadDoc(data);
  return pdf.getPageCount();
}
