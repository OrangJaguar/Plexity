/**
 * @typedef {Object} ImageAdjustParams
 * @property {number} brightness  -1..1
 * @property {number} contrast    -1..1
 * @property {number} exposure    -1..1
 * @property {number} saturation  -1..1
 * @property {number} temperature -1..1
 * @property {number} tint        -1..1
 */

/** @returns {ImageAdjustParams} */
export function defaultAdjustParams() {
  return {
    brightness: 0,
    contrast: 0,
    exposure: 0,
    saturation: 0,
    temperature: 0,
    tint: 0,
  };
}

/**
 * @param {Partial<ImageAdjustParams> | null | undefined} value
 * @returns {ImageAdjustParams}
 */
export function normalizeAdjustParams(value) {
  const base = defaultAdjustParams();
  if (!value || typeof value !== 'object') return base;
  for (const key of Object.keys(base)) {
    const n = Number(value[key]);
    if (Number.isFinite(n)) base[key] = Math.min(1, Math.max(-1, n));
  }
  return base;
}

/**
 * @param {ImageAdjustParams} params
 */
export function isIdentityAdjust(params) {
  const p = normalizeAdjustParams(params);
  return Object.values(p).every((v) => Math.abs(v) < 0.0001);
}

/**
 * Apply adjust params to ImageData in place.
 * @param {ImageData} imageData
 * @param {ImageAdjustParams} params
 */
export function applyAdjustToImageData(imageData, params) {
  const p = normalizeAdjustParams(params);
  if (isIdentityAdjust(p)) return imageData;

  const data = imageData.data;
  const brightness = p.brightness * 255;
  const contrast = p.contrast;
  const contrastFactor = (1 + contrast) / (1.0001 - contrast);
  const exposureMul = 2 ** p.exposure;
  const sat = p.saturation;
  const temp = p.temperature * 40;
  const tint = p.tint * 40;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    r = (r - 128) * contrastFactor + 128 + brightness;
    g = (g - 128) * contrastFactor + 128 + brightness;
    b = (b - 128) * contrastFactor + 128 + brightness;

    r *= exposureMul;
    g *= exposureMul;
    b *= exposureMul;

    r += temp;
    b -= temp;
    g += tint;

    const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = gray + (r - gray) * (1 + sat);
    g = gray + (g - gray) * (1 + sat);
    b = gray + (b - gray) * (1 + sat);

    data[i] = clampByte(r);
    data[i + 1] = clampByte(g);
    data[i + 2] = clampByte(b);
  }
  return imageData;
}

function clampByte(n) {
  return Math.min(255, Math.max(0, Math.round(n)));
}
