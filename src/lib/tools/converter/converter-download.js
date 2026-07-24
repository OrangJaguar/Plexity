export const DOWNLOAD_ERROR = Object.freeze({
  DOWNLOAD_FAILED: 'DOWNLOAD_FAILED',
});

const REVOKE_DELAY_MS = 60_000;

/**
 * Safari-safe download via temporary anchor with delayed revoke.
 * @param {object} params
 * @param {Blob} params.blob
 * @param {string} params.fileName
 * @param {number} [params.revokeDelayMs]
 * @returns {{ url: string, revoke: () => void }}
 */
export function createDownloadObjectUrl(params) {
  const url = URL.createObjectURL(params.blob);
  let revoked = false;
  let timer = null;

  const revoke = () => {
    if (revoked) return;
    revoked = true;
    if (timer) clearTimeout(timer);
    URL.revokeObjectURL(url);
  };

  timer = setTimeout(revoke, params.revokeDelayMs ?? REVOKE_DELAY_MS);

  return { url, revoke };
}

/**
 * @param {object} params
 * @param {Blob} params.blob
 * @param {string} params.fileName
 * @returns {Promise<void>}
 */
export async function downloadBlob(params) {
  const { url, revoke } = createDownloadObjectUrl(params);

  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = params.fileName;
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } catch (error) {
    revoke();
    const err = new Error('Download failed');
    /** @type {Record<string, unknown>} */ (err).code = DOWNLOAD_ERROR.DOWNLOAD_FAILED;
    /** @type {Record<string, unknown>} */ (err).cause = error;
    throw err;
  }
}

/**
 * Optional Web Share for files when supported.
 * @param {object} params
 * @param {Blob} params.blob
 * @param {string} params.fileName
 * @param {string} [params.title]
 * @returns {Promise<boolean>}
 */
export async function shareBlobFile(params) {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) {
    return false;
  }

  const file = new File([params.blob], params.fileName, { type: params.blob.type });
  const shareData = { files: [file], title: params.title ?? params.fileName };

  if (!navigator.canShare(shareData)) {
    return false;
  }

  await navigator.share(shareData);
  return true;
}
