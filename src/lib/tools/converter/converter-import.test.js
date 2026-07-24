import { describe, expect, it } from 'vitest';
import {
  fromClipboardText,
  IMPORT_ERROR,
  IMPORT_LIMITS,
  normalizeDirectoryFilesWithPaths,
  normalizeFileListWithPaths,
  normalizeFilesFromPicker,
} from '@/lib/tools/converter/converter-import.js';

describe('converter-import', () => {
  it('accepts valid picker files', () => {
    const file = new File(['hello'], 'a.txt', { type: 'text/plain', lastModified: 1 });
    const { accepted, rejections } = normalizeFilesFromPicker([file]);
    expect(accepted).toHaveLength(1);
    expect(rejections).toHaveLength(0);
  });

  it('dedupes same File object in one import event', () => {
    const file = new File(['hello'], 'a.txt', { type: 'text/plain', lastModified: 1 });
    const { accepted, rejections } = normalizeFilesFromPicker([file, file]);
    expect(accepted).toHaveLength(1);
    expect(rejections.some((r) => r.code === IMPORT_ERROR.DUPLICATE)).toBe(true);
  });

  it('dedupes same name size lastModified', () => {
    const a = new File(['hello'], 'a.txt', { type: 'text/plain', lastModified: 1 });
    const b = new File(['hello'], 'a.txt', { type: 'text/plain', lastModified: 1 });
    const { accepted, rejections } = normalizeFilesFromPicker([a, b]);
    expect(accepted).toHaveLength(1);
    expect(rejections.some((r) => r.code === IMPORT_ERROR.DUPLICATE)).toBe(true);
  });

  it('rejects when max files exceeded', () => {
    const files = Array.from({ length: IMPORT_LIMITS.maxFiles + 1 }, (_, i) =>
      new File(['x'], `f${i}.txt`, { type: 'text/plain', lastModified: i }),
    );
    const { accepted, rejections } = normalizeFilesFromPicker(files);
    expect(accepted).toHaveLength(IMPORT_LIMITS.maxFiles);
    expect(rejections.some((r) => r.code === IMPORT_ERROR.TOO_MANY_FILES)).toBe(true);
  });

  it('rejects oversized clipboard text', () => {
    const text = 'x'.repeat(IMPORT_LIMITS.maxClipboardText + 1);
    const { accepted, rejections } = fromClipboardText(text);
    expect(accepted).toHaveLength(0);
    expect(rejections[0]?.code).toBe(IMPORT_ERROR.CLIPBOARD_TOO_LARGE);
  });

  it('returns file and relativePath from normalizeFileListWithPaths', () => {
    const file = new File(['hello'], 'a.txt', { type: 'text/plain', lastModified: 1 });
    Object.defineProperty(file, 'webkitRelativePath', { value: 'folder/a.txt' });
    const { accepted } = normalizeFileListWithPaths([file]);
    expect(accepted).toHaveLength(1);
    expect(accepted[0]?.file).toBe(file);
    expect(accepted[0]?.relativePath).toBe('folder/a.txt');
  });

  it('dedupes by relativePath size and lastModified', () => {
    const a = new File(['hello'], 'a.txt', { type: 'text/plain', lastModified: 1 });
    const b = new File(['hello'], 'b.txt', { type: 'text/plain', lastModified: 1 });
    Object.defineProperty(a, 'webkitRelativePath', { value: 'folder/a.txt' });
    Object.defineProperty(b, 'webkitRelativePath', { value: 'folder/a.txt' });
    const { accepted, rejections } = normalizeDirectoryFilesWithPaths([a, b]);
    expect(accepted).toHaveLength(1);
    expect(rejections.some((r) => r.code === IMPORT_ERROR.DUPLICATE)).toBe(true);
  });

  it('allows same name in different folders', () => {
    const a = new File(['hello'], 'a.txt', { type: 'text/plain', lastModified: 1 });
    const b = new File(['world'], 'a.txt', { type: 'text/plain', lastModified: 2 });
    Object.defineProperty(a, 'webkitRelativePath', { value: 'folder1/a.txt' });
    Object.defineProperty(b, 'webkitRelativePath', { value: 'folder2/a.txt' });
    const { accepted } = normalizeDirectoryFilesWithPaths([a, b]);
    expect(accepted).toHaveLength(2);
  });
});
