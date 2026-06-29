import { MAX_MERGE_FILES, MAX_PAGES, MAX_PDF_BYTES } from '@/lib/tools/pdftools/constants';
import { validatePdf } from '@/lib/tools/pdftools/pdf-operations';

/**
 * @typedef {Object} SessionFile
 * @property {string} id
 * @property {string} name
 * @property {Uint8Array} data
 * @property {number} pageCount
 */

/**
 * @param {File} file
 * @returns {Promise<SessionFile>}
 */
export async function fileToSession(file) {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Only PDF files are supported.');
  }
  if (file.size > MAX_PDF_BYTES) {
    throw new Error(`${file.name} exceeds the 25 MB limit.`);
  }

  const data = new Uint8Array(await file.arrayBuffer()).slice(0);
  let pageCount;
  try {
    pageCount = await validatePdf(data);
  } catch {
    throw new Error(`${file.name} could not be read. The file may be corrupt or password-protected.`);
  }

  if (pageCount === 0) throw new Error(`${file.name} has no pages.`);

  return {
    id: crypto.randomUUID(),
    name: file.name,
    data,
    pageCount,
  };
}

/**
 * @param {File[]} files
 * @param {{ multiFile: boolean, existingCount?: number, existingPages?: number }} opts
 * @returns {Promise<SessionFile[]>}
 */
export async function filesToSession(files, opts) {
  if (!files.length) throw new Error('No files selected.');

  const pdfs = files.filter((f) =>
    f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));

  if (pdfs.length !== files.length) {
    throw new Error('Only PDF files are supported.');
  }

  if (!opts.multiFile && (pdfs.length > 1 || (opts.existingCount ?? 0) > 0)) {
    throw new Error('This tool only accepts one PDF at a time.');
  }

  const totalFiles = (opts.existingCount ?? 0) + pdfs.length;
  if (opts.multiFile && totalFiles > MAX_MERGE_FILES) {
    throw new Error(`Maximum ${MAX_MERGE_FILES} files for merge.`);
  }

  const sessions = [];
  let totalPages = opts.existingPages ?? 0;

  for (const file of pdfs) {
    const session = await fileToSession(file);
    totalPages += session.pageCount;
    if (totalPages > MAX_PAGES) {
      throw new Error(`Total pages cannot exceed ${MAX_PAGES}.`);
    }
    sessions.push(session);
  }

  return sessions;
}

/**
 * @param {string} fileId
 * @param {number} pageIndex
 */
export function pageKey(fileId, pageIndex) {
  return `${fileId}:${pageIndex}`;
}

/**
 * @param {string} key
 */
export function parsePageKey(key) {
  const [fileId, idx] = key.split(':');
  return { fileId, pageIndex: Number(idx) };
}
