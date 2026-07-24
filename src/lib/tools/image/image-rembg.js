/**
 * Local background removal via @imgly/background-removal (ONNX WASM).
 * Models load on first use (CDN by default; optional same-origin publicPath).
 */

/** @type {Promise<typeof import('@imgly/background-removal')> | null} */
let rembgModulePromise = null;

async function loadRembgModule() {
  if (!rembgModulePromise) {
    rembgModulePromise = import('@imgly/background-removal');
  }
  return rembgModulePromise;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<Blob>}
 */
function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/png');
  });
}

/**
 * @param {HTMLCanvasElement} source
 * @param {{ publicPath?: string, onProgress?: (key: string) => void }} [opts]
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function removeBackgroundLocal(source, opts = {}) {
  const mod = await loadRembgModule();
  const removeBackground = mod.default ?? mod.removeBackground;
  if (typeof removeBackground !== 'function') {
    throw new Error('Background removal module failed to load');
  }

  const blob = await canvasToPngBlob(source);
  /** @type {Record<string, unknown>} */
  const config = {
    progress: opts.onProgress,
    output: { format: 'image/png', quality: 0.9 },
    model: 'isnet_quint8',
  };
  if (opts.publicPath) {
    config.publicPath = opts.publicPath;
  }

  const resultBlob = await removeBackground(blob, config);
  const bitmap = await createImageBitmap(resultBlob);
  try {
    const out = document.createElement('canvas');
    out.width = bitmap.width;
    out.height = bitmap.height;
    const ctx = out.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D unavailable');
    ctx.drawImage(bitmap, 0, 0);
    return out;
  } finally {
    bitmap.close?.();
  }
}

export function prefetchRembg() {
  return loadRembgModule().catch(() => null);
}
