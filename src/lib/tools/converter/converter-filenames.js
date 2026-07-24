const INVALID_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

/**
 * @param {string} name
 * @returns {string}
 */
export function sanitizeFileName(name) {
  const base = String(name ?? 'file')
    .replace(INVALID_CHARS, '_')
    .replace(/\s+/g, ' ')
    .trim();
  return base || 'file';
}

/**
 * @param {string} fileName
 * @param {string} extension
 * @returns {string}
 */
export function replaceExtension(fileName, extension) {
  const ext = extension.replace(/^\./, '');
  const idx = fileName.lastIndexOf('.');
  const stem = idx > 0 ? fileName.slice(0, idx) : fileName;
  return `${stem}.${ext}`;
}

/**
 * @param {string} baseName
 * @param {ReadonlySet<string>} usedNames
 * @returns {string}
 */
export function resolveNameCollision(baseName, usedNames) {
  if (!usedNames.has(baseName)) return baseName;
  const dot = baseName.lastIndexOf('.');
  const stem = dot > 0 ? baseName.slice(0, dot) : baseName;
  const ext = dot > 0 ? baseName.slice(dot) : '';
  let i = 2;
  while (usedNames.has(`${stem} (${i})${ext}`)) i += 1;
  return `${stem} (${i})${ext}`;
}

/**
 * Deterministic output name from source + operation.
 * @param {object} params
 * @param {string} params.sourceName
 * @param {string} params.operationId
 * @param {string} params.extension
 * @param {ReadonlySet<string>} [params.usedNames]
 * @returns {string}
 */
export function buildOutputFileName(params) {
  const source = sanitizeFileName(params.sourceName);
  const withExt = replaceExtension(source, params.extension);
  const stem = withExt.replace(/\.[^.]+$/, '');
  const tagged = `${stem}.${params.extension}`;
  const candidate = replaceExtension(`${stem}-converted`, params.extension);
  const base = params.operationId ? candidate : tagged;
  if (params.usedNames) {
    return resolveNameCollision(base, params.usedNames);
  }
  return base;
}

/**
 * @param {string} operationId
 * @param {string} sourceName
 * @param {string} extension
 * @returns {string}
 */
export function deterministicOutputName(operationId, sourceName, extension) {
  const clean = sanitizeFileName(sourceName).replace(/\.[^.]+$/, '');
  const opSlug = operationId.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  return `${clean}.${opSlug}.${extension.replace(/^\./, '')}`;
}
