/**
 * Probe media files in the browser and create object URLs.
 */

/**
 * @param {File} file
 * @param {'video'|'audio'|'image'} kind
 * @returns {Promise<import('./video-project.js').MediaAsset>}
 */
export async function probeAndCreateMediaAsset(file, kind) {
  const objectUrl = URL.createObjectURL(file);
  try {
    if (kind === 'image') {
      const dims = await probeImage(objectUrl);
      return {
        id: crypto.randomUUID(),
        name: file.name,
        kind: 'image',
        mime: file.type || 'image/png',
        blob: file,
        objectUrl,
        durationMs: 0,
        width: dims.width,
        height: dims.height,
        fileBytes: file.size,
      };
    }
    if (kind === 'audio') {
      const durationMs = await probeMediaDuration(objectUrl, 'audio');
      return {
        id: crypto.randomUUID(),
        name: file.name,
        kind: 'audio',
        mime: file.type || 'audio/mpeg',
        blob: file,
        objectUrl,
        durationMs,
        width: 0,
        height: 0,
        fileBytes: file.size,
      };
    }
    const meta = await probeVideo(objectUrl);
    return {
      id: crypto.randomUUID(),
      name: file.name,
      kind: 'video',
      mime: file.type || 'video/mp4',
      blob: file,
      objectUrl,
      durationMs: meta.durationMs,
      width: meta.width,
      height: meta.height,
      fileBytes: file.size,
    };
  } catch (err) {
    URL.revokeObjectURL(objectUrl);
    throw err;
  }
}

/**
 * @param {string} url
 * @returns {Promise<{ width: number, height: number }>}
 */
function probeImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Could not decode image.'));
    img.src = url;
  });
}

/**
 * @param {string} url
 * @param {'audio'|'video'} tag
 * @returns {Promise<number>}
 */
function probeMediaDuration(url, tag) {
  return new Promise((resolve, reject) => {
    const el = document.createElement(tag);
    el.preload = 'metadata';
    el.onloadedmetadata = () => {
      const dur = Number.isFinite(el.duration) ? el.duration * 1000 : 0;
      resolve(Math.max(0, Math.round(dur)));
      el.removeAttribute('src');
      el.load();
    };
    el.onerror = () => reject(new Error(`Could not read ${tag} metadata.`));
    el.src = url;
  });
}

/**
 * @param {string} url
 * @returns {Promise<{ durationMs: number, width: number, height: number }>}
 */
function probeVideo(url) {
  return new Promise((resolve, reject) => {
    const el = document.createElement('video');
    el.preload = 'metadata';
    el.onloadedmetadata = () => {
      const durationMs = Number.isFinite(el.duration) ? Math.round(el.duration * 1000) : 0;
      resolve({
        durationMs: Math.max(0, durationMs),
        width: el.videoWidth || 0,
        height: el.videoHeight || 0,
      });
      el.removeAttribute('src');
      el.load();
    };
    el.onerror = () => reject(new Error('Could not read video metadata.'));
    el.src = url;
  });
}

/**
 * @param {import('./video-project.js').MediaAsset[]} media
 */
export function revokeAllMediaUrls(media) {
  for (const m of media) {
    try {
      if (m.objectUrl) URL.revokeObjectURL(m.objectUrl);
    } catch {
      // ignore
    }
  }
}
