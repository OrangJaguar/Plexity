import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { renderPageThumbnail } from '@/lib/tools/pdftools/pdf-render';
import { ensurePdfJs } from '@/lib/tools/pdftools/pdfjs-setup';
import {
  filesToSession, pageKey, parsePageKey,
} from '@/lib/tools/pdftools/pdf-session';
import { getPdfTool } from '@/lib/tools/pdftools/constants';

/**
 * @typedef {Object} PageState
 * @property {string} key
 * @property {string} fileId
 * @property {number} pageIndex
 * @property {number} rotation
 * @property {string|null} thumb
 */

/**
 * @param {import('@/lib/tools/pdftools/constants').PdfToolId} toolId
 */
export function usePdfWorkspace(toolId) {
  const tool = getPdfTool(toolId);
  const [files, setFiles] = useState(/** @type {import('@/lib/tools/pdftools/pdf-session').SessionFile[]} */([]));
  const [fileOrder, setFileOrder] = useState(/** @type {string[]} */([]));
  const [pages, setPages] = useState(/** @type {PageState[]} */([]));
  const [pageOrder, setPageOrder] = useState(/** @type {string[]} */([]));
  const [selected, setSelected] = useState(() => new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(/** @type {string|null} */(null));
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(/** @type {null|{ type: 'single', name: string, data: Uint8Array, pageCount: number }|{ type: 'multi', files: { name: string, data: Uint8Array, pageCount: number }[] }} */(null));
  const thumbCache = useRef(new Map());

  const totalPages = pages.length;

  const fileMap = useMemo(
    () => Object.fromEntries(files.map((f) => [f.id, f])),
    [files],
  );

  const orderedFiles = useMemo(
    () => fileOrder.map((id) => fileMap[id]).filter(Boolean),
    [fileOrder, fileMap],
  );

  const rebuildPagesFromFiles = useCallback((nextFiles, order) => {
    const list = [];
    for (const fileId of order) {
      const file = nextFiles.find((f) => f.id === fileId);
      if (!file) continue;
      for (let i = 0; i < file.pageCount; i += 1) {
        list.push({
          key: pageKey(fileId, i),
          fileId,
          pageIndex: i,
          rotation: 0,
          thumb: thumbCache.current.get(pageKey(fileId, i)) ?? null,
        });
      }
    }
    setPages(list);
    setPageOrder(list.map((p) => p.key));
  }, []);

  const loadThumbnails = useCallback(async (pageList, fileDataMap) => {
    for (const p of pageList) {
      if (thumbCache.current.has(p.key)) continue;
      const data = fileDataMap[p.fileId];
      if (!data) continue;
      try {
        const thumb = await renderPageThumbnail(data, p.fileId, p.pageIndex, p.rotation);
        thumbCache.current.set(p.key, thumb);
        setPages((prev) => prev.map((x) => (x.key === p.key ? { ...x, thumb } : x)));
      } catch {
        // skip failed thumb
      }
    }
  }, []);

  const addFiles = useCallback(async (fileList) => {
    if (!tool) return;
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const existingPages = files.reduce((n, f) => n + f.pageCount, 0);
      const incoming = await filesToSession(fileList, {
        multiFile: tool.multiFile,
        existingCount: files.length,
        existingPages,
      });

      const nextFiles = tool.multiFile ? [...files, ...incoming] : incoming;
      const nextOrder = tool.multiFile ? [...fileOrder, ...incoming.map((f) => f.id)] : incoming.map((f) => f.id);

      setFiles(nextFiles);
      setFileOrder(nextOrder);

      const newPages = [];
      for (const fileId of nextOrder) {
        const file = nextFiles.find((f) => f.id === fileId);
        if (!file) continue;
        for (let i = 0; i < file.pageCount; i += 1) {
          newPages.push({
            key: pageKey(fileId, i),
            fileId,
            pageIndex: i,
            rotation: 0,
            thumb: thumbCache.current.get(pageKey(fileId, i)) ?? null,
          });
        }
      }

      if (!tool.multiFile) {
        setPages(newPages);
        setPageOrder(newPages.map((p) => p.key));
        setSelected(new Set());
      } else {
        rebuildPagesFromFiles(nextFiles, nextOrder);
      }

      const dataMap = Object.fromEntries(nextFiles.map((f) => [f.id, f.data]));
      void loadThumbnails(newPages.filter((p) => !p.thumb), dataMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setLoading(false);
    }
  }, [tool, files, fileOrder, rebuildPagesFromFiles, loadThumbnails]);

  const reset = useCallback(() => {
    thumbCache.current.clear();
    setFiles([]);
    setFileOrder([]);
    setPages([]);
    setPageOrder([]);
    setSelected(new Set());
    setError(null);
    setResult(null);
    setLoading(false);
    setProcessing(false);
  }, []);

  useEffect(() => () => {
    thumbCache.current.clear();
  }, []);

  useEffect(() => {
    void ensurePdfJs();
  }, []);

  const togglePage = useCallback((key) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(pageOrder));
  }, [pageOrder]);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const movePage = useCallback((fromIndex, toIndex) => {
    setPageOrder((prev) => {
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  }, []);

  const moveFile = useCallback((fromIndex, toIndex) => {
    setFiles((currentFiles) => {
      setFileOrder((prev) => {
        const next = [...prev];
        const [item] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, item);
        rebuildPagesFromFiles(currentFiles, next);
        return next;
      });
      return currentFiles;
    });
  }, [rebuildPagesFromFiles]);

  const removeFile = useCallback((fileId) => {
    setFiles((prev) => {
      const next = prev.filter((f) => f.id !== fileId);
      setFileOrder((order) => {
        const nextOrder = order.filter((id) => id !== fileId);
        rebuildPagesFromFiles(next, nextOrder);
        return nextOrder;
      });
      return next;
    });
    setSelected((prev) => {
      const next = new Set();
      prev.forEach((k) => {
        if (!k.startsWith(`${fileId}:`)) next.add(k);
      });
      return next;
    });
  }, [rebuildPagesFromFiles]);

  const rotateSelected = useCallback((delta) => {
    const keys = selected.size ? [...selected] : pageOrder;
    setPages((prev) => prev.map((p) => {
      if (!keys.includes(p.key)) return p;
      const rotation = (p.rotation + delta + 360) % 360;
      thumbCache.current.delete(p.key);
      return { ...p, rotation, thumb: null };
    }));
    const toRefresh = keys.map((k) => parsePageKey(k));
    void (async () => {
      for (const { fileId, pageIndex } of toRefresh) {
        const file = files.find((f) => f.id === fileId);
        if (!file) continue;
        const key = pageKey(fileId, pageIndex);
        const page = pages.find((p) => p.key === key);
        const rot = page?.rotation ?? 0;
        try {
          const thumb = await renderPageThumbnail(file.data, pageIndex, rot);
          thumbCache.current.set(key, thumb);
          setPages((prev) => prev.map((x) => (x.key === key ? { ...x, thumb, rotation: rot } : x)));
        } catch { /* ignore */ }
      }
    })();
  }, [selected, pageOrder, files, pages]);

  const rotationsMap = useMemo(() => {
    const map = {};
    pages.forEach((p) => {
      if (p.rotation) map[p.pageIndex] = p.rotation;
    });
    return map;
  }, [pages]);

  const orderedPageObjects = useMemo(
    () => pageOrder.map((k) => pages.find((p) => p.key === k)).filter(Boolean),
    [pageOrder, pages],
  );

  return {
    tool,
    files,
    orderedFiles,
    fileMap,
    pages,
    pageOrder,
    orderedPageObjects,
    selected,
    totalPages,
    loading,
    error,
    processing,
    setProcessing,
    result,
    setResult,
    setError,
    addFiles,
    reset,
    togglePage,
    selectAll,
    clearSelection,
    movePage,
    moveFile,
    removeFile,
    rotateSelected,
    rotationsMap,
    setPageOrder,
    setSelected,
  };
}
