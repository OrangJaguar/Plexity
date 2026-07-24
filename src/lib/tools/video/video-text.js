/**
 * Video text clip styles (Plan 2). Independent copy of image-text patterns.
 */

/**
 * @typedef {Object} VideoTextStyle
 * @property {string} fontFamily
 * @property {number} fontSize
 * @property {'normal'|'bold'} fontWeight
 * @property {'normal'|'italic'} fontStyle
 * @property {boolean} underline
 * @property {'left'|'center'|'right'} align
 * @property {string} color
 * @property {string} strokeColor
 * @property {number} strokeWidth
 * @property {boolean} shadow
 */

/** @returns {VideoTextStyle} */
export function defaultVideoTextStyle() {
  return {
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: 48,
    fontWeight: 'bold',
    fontStyle: 'normal',
    underline: false,
    align: 'center',
    color: '#ffffff',
    strokeColor: '#000000',
    strokeWidth: 0,
    shadow: true,
  };
}

/**
 * @param {Partial<VideoTextStyle> | null | undefined} value
 * @returns {VideoTextStyle}
 */
export function normalizeVideoTextStyle(value) {
  const base = defaultVideoTextStyle();
  if (!value || typeof value !== 'object') return base;
  return {
    ...base,
    ...value,
    fontSize: Math.max(12, Math.min(200, Number(value.fontSize) || base.fontSize)),
    strokeWidth: Math.max(0, Math.min(12, Number(value.strokeWidth) ?? base.strokeWidth)),
    fontWeight: value.fontWeight === 'bold' ? 'bold' : 'normal',
    fontStyle: value.fontStyle === 'italic' ? 'italic' : 'normal',
    align: value.align === 'left' || value.align === 'right' ? value.align : 'center',
    underline: Boolean(value.underline),
    shadow: value.shadow == null ? base.shadow : Boolean(value.shadow),
    color: String(value.color || base.color),
    strokeColor: String(value.strokeColor || base.strokeColor),
    fontFamily: String(value.fontFamily || base.fontFamily),
  };
}

export const VIDEO_TEXT_PRESETS = Object.freeze([
  { id: 'title', label: 'Title', text: 'Title', style: { fontSize: 72, fontWeight: 'bold' } },
  { id: 'subtitle', label: 'Subtitle', text: 'Subtitle', style: { fontSize: 40, fontWeight: 'normal' } },
  { id: 'lower-third', label: 'Lower third', text: 'Name', style: { fontSize: 36, align: 'left' } },
]);

/**
 * @param {VideoTextStyle} style
 * @param {string} text
 */
export function measureVideoTextBox(style, text) {
  const s = normalizeVideoTextStyle(style);
  const lines = String(text || 'Text').split('\n');
  const width = Math.max(80, Math.round(s.fontSize * Math.max(...lines.map((l) => l.length), 4) * 0.55));
  const height = Math.max(s.fontSize + 16, Math.round(lines.length * s.fontSize * 1.35 + 8));
  return { width, height };
}
