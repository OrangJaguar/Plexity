/**
 * Normalize files from picker, directory, clipboard, and drag-drop sources.
 */

import { detectDeviceProfile } from './converter-limits.js';

export const IMPORT_LIMITS = Object.freeze({
  maxFiles: 50,
  maxDepth: 8,
  maxClipboardText: 1024 * 1024,
  maxAggregateBytesDesktop: 400 * 1024 * 1024,
  maxAggregateBytesMobile: 80 * 1024 * 1024,
});

export const IMPORT_ERROR = Object.freeze({
  TOO_MANY_FILES: 'TOO_MANY_FILES',
  AGGREGATE_TOO_LARGE: 'AGGREGATE_TOO_LARGE',
  DEPTH_EXCEEDED: 'DEPTH_EXCEEDED',
  CLIPBOARD_TOO_LARGE: 'CLIPBOARD_TOO_LARGE',
  DUPLICATE: 'DUPLICATE',
  NOT_A_FILE: 'NOT_A_FILE',
  EMPTY: 'EMPTY',
});

/**
 * @typedef {object} ImportRejection
 * @property {string} name
 * @property {string} code
 * @property {string} message
 */

/**
 * @typedef {object} FileWithPath
 * @property {File} file
 * @property {string} relativePath
 */

/**
 * @param {ReadonlyArray<File>} files
 * @param {object} [options]
 * @param {import('./converter-limits.js').DeviceProfile} [options.deviceProfile]
 * @returns {{ accepted: File[], rejections: ImportRejection[] }}
 */
export function normalizeFilesFromPicker(files, options = {}) {
  return normalizeFileList([...files], options);
}

/**
 * @param {HTMLInputElement} input
 * @param {object} [options]
 * @returns {{ accepted: File[], rejections: ImportRejection[] }}
 */
export function fromDirectoryInput(input, options = {}) {
  const files = input.files ? [...input.files] : [];
  return normalizeFileList(files, options);
}

/**
 * @param {DataTransfer} dataTransfer
 * @param {object} [options]
 * @returns {Promise<{ accepted: File[], rejections: ImportRejection[] }>}
 */
export async function fromDataTransfer(dataTransfer, options = {}) {
  const items = dataTransfer.items ? [...dataTransfer.items] : [];
  /** @type {File[]} */
  const files = [];

  for (const item of items) {
    if (item.kind === 'file') {
      const entry = item.webkitGetAsEntry?.();
      if (entry) {
        const nested = await walkEntry(entry, 0, options.maxDepth ?? IMPORT_LIMITS.maxDepth);
        files.push(...nested.files);
      } else {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
  }

  if (!files.length && dataTransfer.files?.length) {
    files.push(...dataTransfer.files);
  }

  return normalizeFileList(files, options);
}

/**
 * @param {ReadonlyArray<DataTransferItem>} items
 * @param {object} [options]
 * @returns {Promise<{ accepted: File[], rejections: ImportRejection[] }>}
 */
export async function fromClipboardItems(items, options = {}) {
  /** @type {File[]} */
  const files = [];
  for (const item of items) {
    if (item.kind === 'file') {
      const file = item.getAsFile();
      if (file) files.push(file);
    }
  }
  return normalizeFileList(files, options);
}

/**
 * @param {string} text
 * @param {string} [fileName]
 * @param {object} [options]
 * @returns {{ accepted: File[], rejections: ImportRejection[] }}
 */
export function fromClipboardText(text, fileName = 'clipboard.txt', options = {}) {
  const rejections = [];
  if (text.length > (options.maxClipboardText ?? IMPORT_LIMITS.maxClipboardText)) {
    rejections.push({
      name: fileName,
      code: IMPORT_ERROR.CLIPBOARD_TOO_LARGE,
      message: 'Clipboard text exceeds maximum size',
    });
    return { accepted: [], rejections };
  }
  const file = new File([text], fileName, { type: 'text/plain', lastModified: Date.now() });
  return normalizeFileList([file], options);
}

/**
 * @param {ReadonlyArray<File> | FileList | File[]} files
 * @param {object} [options]
 * @returns {{ accepted: File[], rejections: ImportRejection[] }}
 */
export function normalizeFileList(files, options = {}) {
  const list = Array.isArray(files) ? files : [...(files ?? [])];
  return normalizeFilesInternal(list, options);
}

/**
 * @param {ReadonlyArray<File | FileWithPath> | FileList | File[]} entries
 * @param {object} [options]
 * @returns {{ accepted: FileWithPath[], rejections: ImportRejection[] }}
 */
export function normalizeFileListWithPaths(entries, options = {}) {
  const list = Array.isArray(entries) ? entries : [...(entries ?? [])];
  /** @type {FileWithPath[]} */
  const normalized = list.map((entry) => {
    if (entry instanceof File) {
      return { file: entry, relativePath: entry.webkitRelativePath || entry.name };
    }
    return {
      file: entry.file,
      relativePath: entry.relativePath || entry.file.webkitRelativePath || entry.file.name,
    };
  });
  return normalizeFilesWithPathsInternal(normalized, options);
}

/**
 * Flatten directory-picker FileList (webkitdirectory) into accepted files.
 * @param {FileList | File[]} files
 * @param {object} [options]
 */
export function normalizeDirectoryFiles(files, options = {}) {
  return normalizeFileList(files, options);
}

/**
 * @param {FileList | File[]} files
 * @param {object} [options]
 * @returns {{ accepted: FileWithPath[], rejections: ImportRejection[] }}
 */
export function normalizeDirectoryFilesWithPaths(files, options = {}) {
  const list = Array.isArray(files) ? files : [...(files ?? [])];
  return normalizeFileListWithPaths(list, options);
}

/**
 * Normalize clipboard items (files and optional text).
 * @param {ClipboardItems | DataTransferItemList | Array<{ kind: string, type: string, getAsFile?: () => File | null, getType?: (t: string) => Promise<Blob> }> } items
 * @param {object} [options]
 */
export async function normalizeClipboard(items, options = {}) {
  /** @type {File[]} */
  const files = [];
  const list = items ? [...items] : [];
  for (const item of list) {
    if (item.kind === 'file' && typeof item.getAsFile === 'function') {
      const file = item.getAsFile();
      if (file) files.push(file);
    } else if (item.kind === 'string' && item.type === 'text/plain' && typeof item.getType === 'function') {
      try {
        const blob = await item.getType('text/plain');
        const text = await blob.text();
        const textResult = fromClipboardText(text, options);
        files.push(...textResult.accepted);
      } catch {
        // ignore clipboard read failures for individual items
      }
    }
  }
  if (files.length) return normalizeFileList(files, options);
  return { accepted: [], rejections: [] };
}

/**
 * @param {ReadonlyArray<FileWithPath>} entries
 * @param {object} options
 * @returns {{ accepted: FileWithPath[], rejections: ImportRejection[] }}
 */
function normalizeFilesWithPathsInternal(entries, options) {
  const deviceProfile = options.deviceProfile ?? detectDeviceProfile();
  const maxFiles = options.maxFiles ?? IMPORT_LIMITS.maxFiles;
  const maxAggregate = deviceProfile.isMobile
    ? (options.maxAggregateBytesMobile ?? IMPORT_LIMITS.maxAggregateBytesMobile)
    : (options.maxAggregateBytesDesktop ?? IMPORT_LIMITS.maxAggregateBytesDesktop);

  /** @type {FileWithPath[]} */
  const accepted = [];
  /** @type {ImportRejection[]} */
  const rejections = [];
  /** @type {Set<File>} */
  const seenObjects = new Set();
  /** @type {Set<string>} */
  const seenKeys = new Set();

  let aggregateBytes = 0;

  for (const entry of entries) {
    const file = entry.file;
    if (!(file instanceof File)) {
      rejections.push({ name: String(entry.relativePath ?? file), code: IMPORT_ERROR.NOT_A_FILE, message: 'Not a file' });
      continue;
    }
    if (file.size === 0) {
      rejections.push({ name: file.name, code: IMPORT_ERROR.EMPTY, message: 'File is empty' });
      continue;
    }
    if (seenObjects.has(file)) {
      rejections.push({ name: file.name, code: IMPORT_ERROR.DUPLICATE, message: 'Duplicate file in import batch' });
      continue;
    }
    const relativePath = entry.relativePath || file.webkitRelativePath || file.name;
    const dedupeKey = `${relativePath}:${file.size}:${file.lastModified}`;
    if (seenKeys.has(dedupeKey)) {
      rejections.push({ name: file.name, code: IMPORT_ERROR.DUPLICATE, message: 'Duplicate path/size in import batch' });
      continue;
    }

    if (accepted.length >= maxFiles) {
      rejections.push({ name: file.name, code: IMPORT_ERROR.TOO_MANY_FILES, message: `Maximum ${maxFiles} files per import` });
      continue;
    }

    if (aggregateBytes + file.size > maxAggregate) {
      rejections.push({
        name: file.name,
        code: IMPORT_ERROR.AGGREGATE_TOO_LARGE,
        message: `Aggregate import size exceeds ${maxAggregate} bytes`,
      });
      continue;
    }

    seenObjects.add(file);
    seenKeys.add(dedupeKey);
    accepted.push({ file, relativePath });
    aggregateBytes += file.size;
  }

  return { accepted, rejections };
}

/**
 * @param {ReadonlyArray<File>} files
 * @param {object} options
 */
function normalizeFilesInternal(files, options) {
  const deviceProfile = options.deviceProfile ?? detectDeviceProfile();
  const maxFiles = options.maxFiles ?? IMPORT_LIMITS.maxFiles;
  const maxAggregate = deviceProfile.isMobile
    ? (options.maxAggregateBytesMobile ?? IMPORT_LIMITS.maxAggregateBytesMobile)
    : (options.maxAggregateBytesDesktop ?? IMPORT_LIMITS.maxAggregateBytesDesktop);

  /** @type {File[]} */
  const accepted = [];
  /** @type {ImportRejection[]} */
  const rejections = [];
  /** @type {Set<File>} */
  const seenObjects = new Set();
  /** @type {Set<string>} */
  const seenKeys = new Set();

  let aggregateBytes = 0;

  for (const file of files) {
    if (!(file instanceof File)) {
      rejections.push({ name: String(file), code: IMPORT_ERROR.NOT_A_FILE, message: 'Not a file' });
      continue;
    }
    if (file.size === 0) {
      rejections.push({ name: file.name, code: IMPORT_ERROR.EMPTY, message: 'File is empty' });
      continue;
    }
    if (seenObjects.has(file)) {
      rejections.push({ name: file.name, code: IMPORT_ERROR.DUPLICATE, message: 'Duplicate file in import batch' });
      continue;
    }
    const dedupeKey = `${file.name}:${file.size}:${file.lastModified}`;
    if (seenKeys.has(dedupeKey)) {
      rejections.push({ name: file.name, code: IMPORT_ERROR.DUPLICATE, message: 'Duplicate name/size in import batch' });
      continue;
    }

    if (accepted.length >= maxFiles) {
      rejections.push({ name: file.name, code: IMPORT_ERROR.TOO_MANY_FILES, message: `Maximum ${maxFiles} files per import` });
      continue;
    }

    if (aggregateBytes + file.size > maxAggregate) {
      rejections.push({
        name: file.name,
        code: IMPORT_ERROR.AGGREGATE_TOO_LARGE,
        message: `Aggregate import size exceeds ${maxAggregate} bytes`,
      });
      continue;
    }

    seenObjects.add(file);
    seenKeys.add(dedupeKey);
    accepted.push(file);
    aggregateBytes += file.size;
  }

  return { accepted, rejections };
}

/**
 * @param {FileSystemEntry} entry
 * @param {number} depth
 * @param {number} maxDepth
 */
async function walkEntry(entry, depth, maxDepth) {
  /** @type {File[]} */
  const files = [];
  /** @type {ImportRejection[]} */
  const rejections = [];

  if (depth > maxDepth) {
    rejections.push({ name: entry.name, code: IMPORT_ERROR.DEPTH_EXCEEDED, message: 'Directory depth exceeded' });
    return { files, rejections };
  }

  if (entry.isFile) {
    const file = await readFileEntry(/** @type {FileSystemFileEntry} */ (entry));
    if (file) files.push(file);
    return { files, rejections };
  }

  if (entry.isDirectory) {
    const dir = /** @type {FileSystemDirectoryEntry} */ (entry);
    const entries = await readDirectoryEntries(dir);
    for (const child of entries) {
      const nested = await walkEntry(child, depth + 1, maxDepth);
      files.push(...nested.files);
      rejections.push(...nested.rejections);
    }
  }

  return { files, rejections };
}

/**
 * @param {FileSystemFileEntry} entry
 * @returns {Promise<File | null>}
 */
function readFileEntry(entry) {
  return new Promise((resolve) => {
    entry.file(resolve, () => resolve(null));
  });
}

/**
 * @param {FileSystemDirectoryEntry} dir
 * @returns {Promise<FileSystemEntry[]>}
 */
function readDirectoryEntries(dir) {
  return new Promise((resolve) => {
    /** @type {FileSystemEntry[]} */
    const entries = [];
    const reader = dir.createReader();
    const readBatch = () => {
      reader.readEntries((batch) => {
        if (!batch.length) {
          resolve(entries);
          return;
        }
        entries.push(...batch);
        readBatch();
      }, () => resolve(entries));
    };
    readBatch();
  });
}
