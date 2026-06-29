import {
  Combine, Scissors, ArrowUpDown, Trash2, Copy, RotateCw, PenLine,
} from 'lucide-react';

export const MAX_PDF_BYTES = 25 * 1024 * 1024;
export const MAX_MERGE_FILES = 20;
export const MAX_PAGES = 300;
export const THUMB_WIDTH = 148;

/** @typedef {'merge'|'split'|'rearrange'|'remove'|'extract'|'rotate'|'edit'} PdfToolId */

/**
 * @typedef {Object} PdfToolDefinition
 * @property {PdfToolId} id
 * @property {string} name
 * @property {string} description
 * @property {import('lucide-react').LucideIcon} icon
 * @property {boolean} multiFile
 * @property {string} fileHint
 */

/** @type {PdfToolDefinition[]} */
export const PDF_TOOLS = [
  {
    id: 'merge',
    name: 'Merge PDF',
    description: 'Combine multiple PDFs into one file in your chosen order.',
    icon: Combine,
    multiFile: true,
    fileHint: 'Upload two or more PDF files',
  },
  {
    id: 'split',
    name: 'Split PDF',
    description: 'Break one PDF into multiple files by page, range, or custom breaks.',
    icon: Scissors,
    multiFile: false,
    fileHint: 'Upload one PDF file',
  },
  {
    id: 'rearrange',
    name: 'Rearrange pages',
    description: 'Drag pages into a new order and save a reordered PDF.',
    icon: ArrowUpDown,
    multiFile: false,
    fileHint: 'Upload one PDF file',
  },
  {
    id: 'remove',
    name: 'Remove pages',
    description: 'Delete unwanted pages and export a cleaned PDF.',
    icon: Trash2,
    multiFile: false,
    fileHint: 'Upload one PDF file',
  },
  {
    id: 'extract',
    name: 'Extract pages',
    description: 'Pull selected pages into a new PDF.',
    icon: Copy,
    multiFile: false,
    fileHint: 'Upload one PDF file',
  },
  {
    id: 'rotate',
    name: 'Rotate pages',
    description: 'Rotate individual pages left or right.',
    icon: RotateCw,
    multiFile: false,
    fileHint: 'Upload one PDF file',
  },
  {
    id: 'edit',
    name: 'Edit PDF',
    description: 'Add text, highlights, shapes, signatures, and markups.',
    icon: PenLine,
    multiFile: false,
    fileHint: 'Upload one PDF file',
  },
];

export const EDIT_SUBTITLE = 'Add text, highlights, signatures, and markups';

/** @type {Record<PdfToolId, PdfToolDefinition>} */
export const PDF_TOOL_MAP = Object.fromEntries(PDF_TOOLS.map((t) => [t.id, t]));

/**
 * @param {string} id
 * @returns {PdfToolDefinition | null}
 */
export function getPdfTool(id) {
  return PDF_TOOL_MAP[id] || null;
}
