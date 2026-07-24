/**
 * OCR / table / schema normalizers for Plan 7.
 */

import { AI_ERROR_CODES, AI_QUOTAS } from './ai-quotas.js';

/**
 * @param {number} byteLength
 */
export function assertOcrSize(byteLength) {
  if ((Number(byteLength) || 0) > AI_QUOTAS.maxOcrImageBytes) {
    return { ok: false, code: AI_ERROR_CODES.AI_UPLOAD_TOO_LARGE };
  }
  return { ok: true };
}

/**
 * @param {unknown} raw
 */
export function normalizeOcrResult(raw) {
  const r = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? /** @type {Record<string, unknown>} */ (raw)
    : { text: String(raw || '') };

  const text = String(r.text || '').slice(0, 100_000);
  const markdown = typeof r.markdown === 'string' ? r.markdown.slice(0, 100_000) : text;
  const tables = Array.isArray(r.tables) ? r.tables.slice(0, 20) : [];
  const confidence = typeof r.confidence === 'number' ? r.confidence : null;
  const warnings = [];
  if (confidence != null && confidence < 0.5) {
    warnings.push('LOW_OCR_CONFIDENCE');
  }
  if (!text.trim()) {
    warnings.push('EMPTY_OCR');
  }
  return {
    text,
    markdown,
    tables,
    confidence,
    warnings,
  };
}

/**
 * Suggest a simple schema from tabular rows (draft only).
 * @param {unknown} table
 */
export function inferTableSchema(table) {
  const rows = Array.isArray(table) ? table : [];
  if (!rows.length) {
    return { ok: false, code: AI_ERROR_CODES.AI_VALIDATION_FAILED, schema: null };
  }
  const first = rows[0];
  if (!first || typeof first !== 'object' || Array.isArray(first)) {
    // array-of-arrays with header row
    if (Array.isArray(first)) {
      const headers = first.map((h, i) => String(h || `col_${i + 1}`).slice(0, 64));
      return {
        ok: true,
        schema: {
          type: 'array',
          items: {
            type: 'object',
            properties: Object.fromEntries(headers.map((h) => [h, { type: 'string' }])),
          },
        },
      };
    }
    return { ok: false, code: AI_ERROR_CODES.AI_VALIDATION_FAILED, schema: null };
  }
  const keys = Object.keys(first).slice(0, 40);
  return {
    ok: true,
    schema: {
      type: 'object',
      properties: Object.fromEntries(keys.map((k) => [k, { type: 'string' }])),
    },
  };
}

/**
 * Soft repair suggestion for malformed JSON — returns draft string, not executed.
 * @param {string} raw
 */
export function suggestJsonRepair(raw) {
  const text = String(raw || '').trim();
  if (!text) return { ok: false, code: AI_ERROR_CODES.AI_VALIDATION_FAILED, draft: null };
  try {
    JSON.parse(text);
    return { ok: true, draft: text, repaired: false };
  } catch {
    // Common trailing-comma fix (draft only).
    const draft = text.replace(/,\s*([}\]])/g, '$1');
    try {
      JSON.parse(draft);
      return { ok: true, draft, repaired: true };
    } catch {
      return { ok: false, code: AI_ERROR_CODES.AI_VALIDATION_FAILED, draft: null };
    }
  }
}

/**
 * @param {string} text
 */
export function normalizeAltText(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 250);
}

/**
 * Scene/chapter detection draft — metadata only, no auto-split.
 * @param {Array<{ start: number, end?: number, label?: string }>} markers
 */
export function normalizeSceneChapterDraft(markers) {
  const list = Array.isArray(markers) ? markers : [];
  return {
    kind: 'scene-chapter-draft',
    autoApply: false,
    chapters: list.slice(0, 50).map((m, i) => ({
      index: i + 1,
      start: Number(m.start) || 0,
      end: m.end != null ? Number(m.end) : null,
      label: String(m.label || `Chapter ${i + 1}`).slice(0, 80),
    })),
  };
}
