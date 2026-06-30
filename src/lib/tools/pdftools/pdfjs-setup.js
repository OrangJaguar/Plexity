import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

const base = import.meta.env.BASE_URL || '/';
const withTrailing = base.endsWith('/') ? base : `${base}/`;

// Legacy build ships Map/WeakMap polyfills; worker must load the matching legacy worker file.
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

let readyPromise = null;

function assetUrl(folder) {
  return `${withTrailing}${folder}/`;
}

export async function ensurePdfJs() {
  if (!readyPromise) {
    readyPromise = Promise.resolve(pdfjs);
  }
  return readyPromise;
}

/**
 * @param {Uint8Array} data
 * @returns {import('pdfjs-dist').DocumentInitParameters}
 */
export function getDocumentOptions(data) {
  const bytes = data instanceof Uint8Array ? data.slice() : new Uint8Array(data);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  return {
    url,
    cMapUrl: assetUrl('cmaps'),
    cMapPacked: true,
    standardFontDataUrl: assetUrl('standard_fonts'),
    wasmUrl: assetUrl('wasm'),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
    enableXfa: false,
    disableFontFace: true,
  };
}

export default pdfjs;
