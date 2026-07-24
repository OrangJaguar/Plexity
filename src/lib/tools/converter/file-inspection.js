export const INSPECTION_ERROR = Object.freeze({
  FILE_EMPTY: 'FILE_EMPTY',
  FILE_TRUNCATED: 'FILE_TRUNCATED',
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
  UNTRUSTED_RENDER: 'UNTRUSTED_RENDER',
  EXECUTABLE_REJECTED: 'EXECUTABLE_REJECTED',
  TEXT_PARSE_FAILED: 'TEXT_PARSE_FAILED',
});

/** Maximum bytes read from file header for signature detection. */
export const HEADER_READ_LIMIT = 65536;

const SIGNATURES = Object.freeze([
  { format: 'png', mime: 'image/png', match: (b) => b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { format: 'jpeg', mime: 'image/jpeg', match: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { format: 'webp', mime: 'image/webp', match: (b) => b.length >= 12 && readAscii(b, 0, 4) === 'RIFF' && readAscii(b, 8, 4) === 'WEBP' },
  { format: 'bmp', mime: 'image/bmp', match: (b) => b.length >= 2 && b[0] === 0x42 && b[1] === 0x4d },
  { format: 'gif', mime: 'image/gif', match: (b) => b.length >= 6 && readAscii(b, 0, 3) === 'GIF' },
  { format: 'wav', mime: 'audio/wav', match: (b) => b.length >= 12 && readAscii(b, 0, 4) === 'RIFF' && readAscii(b, 8, 4) === 'WAVE' },
  { format: 'mp3', mime: 'audio/mpeg', match: (b) => (b.length >= 3 && b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) || (b.length >= 2 && b[0] === 0xff && (b[1] & 0xe0) === 0xe0) },
  { format: 'm4a', mime: 'audio/mp4', match: (b) => b.length >= 12 && readAscii(b, 4, 4) === 'ftyp' && isAudioFtyp(b) },
  { format: 'mp4', mime: 'video/mp4', match: (b) => b.length >= 12 && readAscii(b, 4, 4) === 'ftyp' && !isAudioFtyp(b) },
  { format: 'flac', mime: 'audio/flac', match: (b) => b.length >= 4 && readAscii(b, 0, 4) === 'fLaC' },
  { format: 'ogg', mime: 'audio/ogg', match: (b) => b.length >= 4 && readAscii(b, 0, 4) === 'OggS' },
  { format: 'webm', mime: 'video/webm', match: (b) => b.length >= 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 },
  { format: 'exe', mime: 'application/x-msdownload', match: (b) => b.length >= 2 && b[0] === 0x4d && b[1] === 0x5a },
  { format: 'elf', mime: 'application/x-elf', match: (b) => b.length >= 4 && b[0] === 0x7f && b[1] === 0x45 && b[2] === 0x4c && b[3] === 0x46 },
]);

/**
 * @param {Uint8Array} bytes
 * @param {number} offset
 * @param {number} length
 * @returns {string}
 */
function readAscii(bytes, offset, length) {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += String.fromCharCode(bytes[offset + i] ?? 0);
  }
  return out;
}

/**
 * @param {Uint8Array} bytes
 * @returns {boolean}
 */
function isAudioFtyp(bytes) {
  const brand = readAscii(bytes, 8, 4).toLowerCase();
  // Only treat dedicated audio brands as M4A.
  // Common video brands (isom, mp42, iso2, avc1, dash, …) must stay MP4/video.
  const trimmed = brand.trim();
  return trimmed === 'm4a' || trimmed === 'm4b' || trimmed === 'm4p';
}

/**
 * @param {string} ext
 * @returns {string | null}
 */
function extensionToFormat(ext) {
  const normalized = ext.toLowerCase().replace(/^\./, '');
  const map = {
    png: 'png',
    jpg: 'jpeg',
    jpeg: 'jpeg',
    webp: 'webp',
    bmp: 'bmp',
    gif: 'gif',
    wav: 'wav',
    mp3: 'mp3',
    m4a: 'm4a',
    aac: 'aac',
    flac: 'flac',
    ogg: 'ogg',
    opus: 'opus',
    mp4: 'mp4',
    m4v: 'm4v',
    mov: 'mov',
    webm: 'webm',
    mkv: 'mkv',
    avi: 'avi',
    mpeg: 'mpeg',
    mpg: 'mpeg',
    csv: 'csv',
    tsv: 'tsv',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    txt: 'txt',
    svg: 'svg',
    html: 'html',
    htm: 'html',
  };
  return map[normalized] ?? null;
}

/**
 * @param {Uint8Array} bytes
 * @returns {{ format: string, mime: string, animated?: boolean } | null}
 */
function detectBinarySignature(bytes) {
  for (const sig of SIGNATURES) {
    if (sig.match(bytes)) {
      const result = { format: sig.format, mime: sig.mime };
      if (sig.format === 'gif') {
        return { ...result, animated: detectGifAnimation(bytes) };
      }
      return result;
    }
  }
  return null;
}

/**
 * Detect animated GIF via multiple image descriptors or NETSCAPE extension.
 * @param {Uint8Array} bytes
 * @returns {boolean}
 */
export function detectGifAnimation(bytes) {
  if (bytes.length < 13) return false;
  if (readAscii(bytes, 0, 3) !== 'GIF') return false;

  let imageDescriptorCount = 0;
  for (let i = 10; i < bytes.length - 1; i += 1) {
    if (bytes[i] === 0x21 && bytes[i + 1] === 0xff) {
      const label = readAscii(bytes, i + 3, 8);
      if (label.startsWith('NETSCAPE')) {
        return true;
      }
    }
    if (bytes[i] === 0x2c) {
      imageDescriptorCount += 1;
      if (imageDescriptorCount > 1) return true;
    }
  }
  return false;
}

/**
 * @param {Uint8Array} bytes
 * @param {string} [extFormat]
 * @param {string} [declaredMime]
 * @returns {{ format: string, mime: string, warnings: string[] } | { error: string, code: string }}
 */
function detectTextFormat(bytes, extFormat, declaredMime) {
  let offset = 0;
  const warnings = [];

  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    offset = 3;
    warnings.push('UTF-8 BOM stripped for detection');
  } else if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return { error: 'UTF-16 BE text not supported for inline conversion', code: INSPECTION_ERROR.UNSUPPORTED_FORMAT };
  } else if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return { error: 'UTF-16 LE text not supported for inline conversion', code: INSPECTION_ERROR.UNSUPPORTED_FORMAT };
  }

  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(offset)).trimStart();
  if (!text) {
    return { error: 'File is empty', code: INSPECTION_ERROR.FILE_EMPTY };
  }

  if (text.startsWith('<svg') || (text.startsWith('<?xml') && text.includes('<svg'))) {
    return { error: 'SVG is not supported as a trusted render target', code: INSPECTION_ERROR.UNTRUSTED_RENDER };
  }
  if (/^<!doctype html/i.test(text) || /^<html/i.test(text)) {
    return { error: 'HTML is not supported as input', code: INSPECTION_ERROR.UNTRUSTED_RENDER };
  }

  if (text.startsWith('{') || text.startsWith('[')) {
    try {
      JSON.parse(text);
      return { format: 'json', mime: 'application/json', warnings };
    } catch {
      if (looksLikeTruncatedJson(text) && extFormat === 'json') {
        warnings.push('JSON sample truncated; trusting extension/MIME');
        return { format: 'json', mime: declaredMime || 'application/json', warnings };
      }
      if (extFormat === 'json' && (declaredMime?.includes('json') ?? false)) {
        warnings.push('Incomplete JSON prefix; trusting extension/MIME agreement');
        return { format: 'json', mime: declaredMime || 'application/json', warnings };
      }
      return { error: 'Invalid JSON', code: INSPECTION_ERROR.TEXT_PARSE_FAILED };
    }
  }

  if (/^<\?xml/i.test(text) || (/^<[a-zA-Z]/.test(text) && text.includes('</'))) {
    return { format: 'xml', mime: 'application/xml', warnings };
  }

  if (/^---\s/m.test(text) || looksLikeYaml(text)) {
    return { format: 'yaml', mime: 'application/yaml', warnings };
  }

  const firstLine = text.split(/\r?\n/)[0] ?? '';
  const tabCount = (firstLine.match(/\t/g) ?? []).length;
  const commaCount = (firstLine.match(/,/g) ?? []).length;

  if (tabCount > 0 && tabCount >= commaCount) {
    return { format: 'tsv', mime: 'text/tab-separated-values', warnings };
  }
  if (commaCount > 0 || firstLine.includes(',')) {
    return { format: 'csv', mime: 'text/csv', warnings };
  }

  if (extFormat === 'txt' || extFormat === 'text') {
    return { format: 'txt', mime: 'text/plain', warnings };
  }

  if (extFormat === 'yaml' || extFormat === 'xml' || extFormat === 'txt') {
    const mimeMap = { yaml: 'application/yaml', xml: 'application/xml', txt: 'text/plain' };
    return { format: extFormat, mime: mimeMap[extFormat], warnings };
  }

  return { error: 'Unsupported text format', code: INSPECTION_ERROR.UNSUPPORTED_FORMAT };
}

/**
 * @param {string} text
 * @returns {boolean}
 */
function looksLikeTruncatedJson(text) {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return false;
  const openCurly = (trimmed.match(/\{/g) ?? []).length;
  const closeCurly = (trimmed.match(/\}/g) ?? []).length;
  const openSquare = (trimmed.match(/\[/g) ?? []).length;
  const closeSquare = (trimmed.match(/\]/g) ?? []).length;
  return openCurly > closeCurly || openSquare > closeSquare;
}

/**
 * @param {string} text
 * @returns {boolean}
 */
function looksLikeYaml(text) {
  const line = text.split(/\r?\n/).find((l) => l.trim() && !l.trim().startsWith('#'));
  if (!line) return false;
  return /^[\w.-]+:\s/.test(line) || line.trim() === '---';
}

/**
 * @param {object} params
 * @param {Uint8Array} params.bytes
 * @param {number} params.fileSize
 * @param {string} [params.fileName]
 * @param {string} [params.declaredMime]
 * @returns {import('./file-inspection.js').InspectionResult}
 */
export function inspectFileHeader(params) {
  const { bytes, fileSize, fileName = '', declaredMime = '' } = params;

  if (fileSize === 0 || bytes.length === 0) {
    return { ok: false, code: INSPECTION_ERROR.FILE_EMPTY, message: 'File is empty' };
  }

  const ext = fileName.includes('.') ? fileName.split('.').pop() ?? '' : '';
  const extFormat = extensionToFormat(ext);
  const warnings = [];

  const binary = detectBinarySignature(bytes);
  if (binary?.format === 'exe' || binary?.format === 'elf') {
    return { ok: false, code: INSPECTION_ERROR.EXECUTABLE_REJECTED, message: 'Executable files are not supported' };
  }

  if (binary) {
    if (extFormat && extFormat !== binary.format) {
      const extNorm = extFormat === 'jpg' ? 'jpeg' : extFormat;
      const binNorm = binary.format === 'jpg' ? 'jpeg' : binary.format;
      if (extNorm !== binNorm && !(extNorm === 'aac' && binNorm === 'm4a')) {
        warnings.push(`Extension .${ext} does not match detected ${binary.format}; using signature`);
      }
    }
    if (declaredMime && !declaredMime.includes(binary.format) && declaredMime !== binary.mime) {
      warnings.push(`Declared MIME ${declaredMime} does not match detected ${binary.mime}`);
    }
    return {
      ok: true,
      format: binary.format === 'jpeg' ? 'jpeg' : binary.format,
      mimeType: binary.mime,
      warnings,
      animated: binary.animated ?? undefined,
      truncated: bytes.length < fileSize && bytes.length < HEADER_READ_LIMIT,
    };
  }

  const textResult = detectTextFormat(bytes, extFormat ?? undefined, declaredMime);
  if ('error' in textResult) {
    return { ok: false, code: textResult.code, message: textResult.error };
  }

  if (extFormat && extFormat !== textResult.format) {
    warnings.push(`Extension .${ext} does not match detected ${textResult.format}; using content`);
  }
  warnings.push(...textResult.warnings);

  return {
    ok: true,
    format: textResult.format,
    mimeType: textResult.mime,
    warnings,
    truncated: bytes.length < fileSize,
  };
}

/**
 * Read bounded header from a Blob/File.
 * @param {Blob} file
 * @param {number} [limit]
 * @returns {Promise<Uint8Array>}
 */
export async function readFileHeader(file, limit = HEADER_READ_LIMIT) {
  const slice = file.slice(0, Math.min(limit, file.size));
  const buffer = await slice.arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * @param {Blob} file
 * @param {string} [fileName]
 * @param {string} [declaredMime]
 * @returns {Promise<import('./file-inspection.js').InspectionResult>}
 */
export async function inspectFile(file, fileName, declaredMime) {
  const name = fileName ?? (file instanceof File ? file.name : 'unknown');
  const mime = declaredMime ?? (file instanceof File ? file.type : '');
  const bytes = await readFileHeader(file);
  return inspectFileHeader({
    bytes,
    fileSize: file.size,
    fileName: name,
    declaredMime: mime,
  });
}

/**
 * @typedef {object} InspectionResult
 * @property {boolean} ok
 * @property {string} [format]
 * @property {string} [mimeType]
 * @property {ReadonlyArray<string>} [warnings]
 * @property {boolean} [animated]
 * @property {boolean} [truncated]
 * @property {string} [code]
 * @property {string} [message]
 */
