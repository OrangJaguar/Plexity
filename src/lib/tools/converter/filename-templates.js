/**
 * Token-based filename templating for batch/renaming output, with
 * collision-safe resolution shared with converter-filenames.js.
 */

import { resolveNameCollision, sanitizeFileName } from './converter-filenames.js';

/**
 * @typedef {object} FilenameTemplateContext
 * @property {string} [name]
 * @property {number} [index]
 * @property {number | string | Date} [date]
 * @property {string} [preset]
 * @property {string} [format]
 * @property {string} [ext]
 */

const TOKEN_PATTERN = /\{(\w+)\}/g;

/**
 * @param {number | string | Date | null | undefined} date
 * @returns {string}
 */
function formatDate(date) {
  const d = date != null ? new Date(date) : new Date();
  if (Number.isNaN(d.getTime())) return formatDate(Date.now());
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * @param {FilenameTemplateContext} ctx
 * @returns {Readonly<Record<string, string>>}
 */
function buildTokenMap(ctx) {
  return Object.freeze({
    name: String(ctx.name ?? 'file'),
    index: String(ctx.index ?? 1),
    date: formatDate(ctx.date),
    preset: String(ctx.preset ?? ''),
    format: String(ctx.format ?? ''),
    ext: String(ctx.ext ?? '').replace(/^\./, ''),
  });
}

/**
 * @param {string} template
 * @param {FilenameTemplateContext} [ctx]
 * @param {ReadonlySet<string>} [usedNames]
 * @returns {string}
 */
export function renderFilenameTemplate(template, ctx = {}, usedNames) {
  const tokens = buildTokenMap(ctx);
  const rawTemplate = typeof template === 'string' && template.trim() ? template : '{name}';
  const rendered = rawTemplate.replace(TOKEN_PATTERN, (match, key) => (
    key in tokens ? tokens[key] : match
  ));
  const safe = sanitizeFileName(rendered);
  if (usedNames) return resolveNameCollision(safe, usedNames);
  return safe;
}

/** @type {Readonly<FilenameTemplateContext>} */
const SAMPLE_CONTEXT_DEFAULTS = Object.freeze({
  name: 'photo',
  index: 1,
  date: Date.now(),
  preset: 'web-optimized',
  format: 'png',
  ext: 'webp',
});

/**
 * Renders a template against a sample context for UI preview purposes.
 * Missing fields fall back to representative sample values.
 * @param {string} template
 * @param {FilenameTemplateContext} [sampleCtx]
 * @returns {string}
 */
export function previewTemplate(template, sampleCtx = {}) {
  return renderFilenameTemplate(template, { ...SAMPLE_CONTEXT_DEFAULTS, ...sampleCtx });
}

/** @type {ReadonlyArray<string>} */
export const FILENAME_TEMPLATE_TOKENS = Object.freeze(['name', 'index', 'date', 'preset', 'format', 'ext']);

/**
 * @param {string} template
 * @returns {boolean}
 */
export function isValidFilenameTemplate(template) {
  const value = String(template ?? '').trim();
  if (!value || value.length > 180) return false;
  const withoutTokens = value.replace(TOKEN_PATTERN, 'x');
  if (/[<>:"/\\|?*\u0000-\u001f]/.test(withoutTokens)) return false;
  return true;
}
