import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { clearPdfDocCache, renderPageThumbnail } from '@/lib/tools/pdftools/pdf-render';
import { filesToSession, pageKey, parsePageKey } from '@/lib/tools/pdftools/pdf-session';

/**
 * @typedef {Object} PageState
 * @property {string} key
 * @property {string} fileId
 * @property {number} pageIndex
 * @property {number} rotation
 * @property {string|null} thumb
 * @property {boolean} thumbFailed
 * @property {string|null} [thumbError]
 */

/** @typedef {'grid' | 'expanded'} PdfViewMode */

/** Reorder page keys when document order changes — preserves within-file order segments. */
function reorderPageKeysByFiles(pageOrder, nextFileOrder) {
  const segments = [];
  let currentFileId = null;
  let currentKeys = [];

  for (const key of pageOrder) {
    const { fileId } = parsePageKey(key);
    if (fileId !== currentFileId) {
      if (currentKeys.length) segments.push({ fileId: currentFileId, keys: currentKeys });
      currentFileId = fileId;
      currentKeys = [key];
    } else {
      currentKeys.push(key);
    }
  }
  if (currentKeys.length) segments.push({ fileId: currentFileId, keys: currentKeys });

  const segMap = Object.fromEntries(segments.map((s) => [s.fileId, s.keys]));
  return nextFileOrder.flatMap((fid) => segMap[fid] || []);
}

export function usePdfEditor() {
  const [files, setFiles] = useState(/** @type {import('@/lib/tools/pdftools/pdf-session').SessionFile[]} */([]));
  const [fileOrder, setFileOrder] = useState(/** @type {string[]} */([]));
  const [pages, setPages] = useState(/** @type {PageState[]} */([]));
  const [pageOrder, setPageOrder] = useState(/** @type {string[]} */([]));
  const [splitAfterKeys, setSplitAfterKeys] = useState(() => new Set(/** @type {string[]} */([])));
  const [viewMode, setViewMode] = useState(/** @type {PdfViewMode} */('grid'));
  const [activePageKey, setActivePageKey] = useState(/** @type {string|null} */(null));
  const [annotations, setAnnotations] = useState(/** @type {Record<string, import('@/lib/tools/pdftools/pdf-operations').Annotation[]>} */({}));
  const [pageLayouts, setPageLayouts] = useState(/** @type {Record<string, import('@/lib/tools/pdftools/pdf-render').PageLayout>} */({}));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(/** @type {string|null} */(null));
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(/** @type {null|{ type: 'single', name: string, data: Uint8Array, pageCount: number }|{ type: 'multi', files: { name: string, data: Uint8Array, pageCount: number }[] }} */(null));
  const thumbCache = useRef(new Map());

  const fileMap = useMemo(
    () => Object.fromEntries(files.map((f) => [f.id, f])),
    [files],
  );

  const orderedFiles = useMemo(
    () => fileOrder.map((id) => fileMap[id]).filter(Boolean),
    [fileOrder, fileMap],
  );

  const pageMap = useMemo(
    () => Object.fromEntries(pages.map((p) => [p.key, p])),
    [pages],
  );

  const orderedPageObjects = useMemo(
    () => pageOrder.map((k) => pageMap[k]).filter(Boolean),
    [pageOrder, pageMap],
  );

  const virtualPageRefs = useMemo(
    () => orderedPageObjects.map((p) => ({
      key: p.key,
      fileId: p.fileId,
      pageIndex: p.pageIndex,
      rotation: p.rotation,
    })),
    [orderedPageObjects],
  );

  const fileDataMap = useMemo(
    () => Object.fromEntries(files.map((f) => [f.id, f.data])),
    [files],
  );

  const rotationsMap = useMemo(() => {
    const map = {};
    pages.forEach((p) => {
      if (p.rotation) map[p.key] = p.rotation;
    });
    return map;
  }, [pages]);

  const fileGroups = useMemo(() => orderedFiles.map((file) => ({
    fileId: file.id,
    name: file.name,
    pageKeys: pageOrder.filter((k) => k.startsWith(`${file.id}:`)),
  })), [orderedFiles, pageOrder]);

  const loadThumbnails = useCallback(async (pageList, dataMap) => {
    const pending = pageList.filter((p) => !p.thumb && !p.thumbFailed);
    const batchSize = 3;
    for (let i = 0; i < pending.length; i += batchSize) {
      const batch = pending.slice(i, i + batchSize);
      await Promise.all(batch.map(async (p) => {
        const cached = thumbCache.current.get(p.key);
        if (cached) {
          setPages((prev) => prev.map((x) => (
            x.key === p.key && !x.thumb ? { ...x, thumb: cached, thumbFailed: false } : x
          )));
          return;
        }
        const data = dataMap[p.fileId];
        if (!data) {
          setPages((prev) => prev.map((x) => (x.key === p.key ? { ...x, thumbFailed: true } : x)));
          return;
        }
        try {
          const thumb = await renderPageThumbnail(data, p.fileId, p.pageIndex, p.rotation);
          thumbCache.current.set(p.key, thumb);
          setPages((prev) => prev.map((x) => (x.key === p.key ? { ...x, thumb, thumbFailed: false, thumbError: null } : x)));
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Preview failed';
          setPages((prev) => prev.map((x) => (x.key === p.key ? { ...x, thumbFailed: true, thumbError: message } : x)));
        }
      }));
    }
  }, []);

  const addFiles = useCallback(async (fileList) => {
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const existingPages = files.reduce((n, f) => n + f.pageCount, 0);
      const incoming = await filesToSession(fileList, {
        multiFile: true,
        existingCount: files.length,
        existingPages,
      });

      const nextFiles = [...files, ...incoming];
      const nextOrder = [...fileOrder, ...incoming.map((f) => f.id)];

      const incomingPageStates = [];
      for (const file of incoming) {
        for (let j = 0; j < file.pageCount; j += 1) {
          const key = pageKey(file.id, j);
          incomingPageStates.push({
            key,
            fileId: file.id,
            pageIndex: j,
            rotation: 0,
            thumb: null,
            thumbFailed: false,
          });
        }
      }

      setFiles(nextFiles);
      setFileOrder(nextOrder);
      setPages((prev) => [...prev, ...incomingPageStates]);
      setPageOrder((prev) => [...prev, ...incomingPageStates.map((p) => p.key)]);
      setActivePageKey((prev) => prev ?? incomingPageStates[0]?.key ?? null);

      const dataMap = Object.fromEntries(nextFiles.map((f) => [f.id, f.data]));
      void loadThumbnails(incomingPageStates, dataMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setLoading(false);
    }
  }, [files, fileOrder, loadThumbnails]);

  const reset = useCallback(() => {
    thumbCache.current.clear();
    clearPdfDocCache();
    setFiles([]);
    setFileOrder([]);
    setPages([]);
    setPageOrder([]);
    setSplitAfterKeys(new Set());
    setViewMode('grid');
    setActivePageKey(null);
    setAnnotations({});
    setPageLayouts({});
    setError(null);
    setResult(null);
    setLoading(false);
    setProcessing(false);
  }, []);

  useEffect(() => () => {
    thumbCache.current.clear();
    clearPdfDocCache();
  }, []);

  useEffect(() => {
    if (!files.length || !pages.length) return;
    const dataMap = Object.fromEntries(files.map((f) => [f.id, f.data]));
    const pending = pages.filter((p) => !p.thumb && !p.thumbFailed);
    if (pending.length > 0) void loadThumbnails(pending, dataMap);
  }, [files, pages, loadThumbnails]);

  const movePage = useCallback((fromIndex, toIndex) => {
    setPageOrder((prev) => {
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  }, []);

  const moveFile = useCallback((fromIndex, toIndex) => {
    setFileOrder((prevOrder) => {
      const nextOrder = [...prevOrder];
      const [fileId] = nextOrder.splice(fromIndex, 1);
      nextOrder.splice(toIndex, 0, fileId);
      setPageOrder((prevKeys) => reorderPageKeysByFiles(prevKeys, nextOrder));
      return nextOrder;
    });
  }, []);

  const removeFile = useCallback((fileId) => {
    const removedKeys = pageOrder.filter((k) => k.startsWith(`${fileId}:`));
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    setFileOrder((prev) => prev.filter((id) => id !== fileId));
    setPages((prev) => prev.filter((p) => p.fileId !== fileId));
    setPageOrder((prev) => prev.filter((k) => !k.startsWith(`${fileId}:`)));
    setSplitAfterKeys((prev) => {
      const next = new Set(prev);
      removedKeys.forEach((k) => next.delete(k));
      return next;
    });
    setAnnotations((prev) => {
      const next = { ...prev };
      removedKeys.forEach((k) => { delete next[k]; });
      return next;
    });
    removedKeys.forEach((k) => thumbCache.current.delete(k));
    setActivePageKey((prev) => (prev && removedKeys.includes(prev) ? null : prev));
  }, [pageOrder]);

  const deletePage = useCallback((key) => {
    if (pageOrder.length <= 1) {
      setError('Cannot delete the only remaining page.');
      return;
    }
    setPageOrder((prev) => {
      const next = prev.filter((k) => k !== key);
      if (activePageKey === key) setActivePageKey(next[0] ?? null);
      return next;
    });
    setSplitAfterKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setError(null);
  }, [activePageKey, pageOrder.length]);

  const rotatePage = useCallback((key, delta) => {
    let nextRot = 0;
    setPages((prev) => prev.map((p) => {
      if (p.key !== key) return p;
      nextRot = (p.rotation + delta + 360) % 360;
      thumbCache.current.delete(key);
      return { ...p, rotation: nextRot, thumb: null, thumbFailed: false };
    }));
    const page = pages.find((p) => p.key === key);
    if (!page) return;
    const file = files.find((f) => f.id === page.fileId);
    if (!file) return;
    void (async () => {
      try {
        const thumb = await renderPageThumbnail(file.data, page.fileId, page.pageIndex, nextRot);
        thumbCache.current.set(key, thumb);
        setPages((prev) => prev.map((x) => (x.key === key ? { ...x, thumb, rotation: nextRot, thumbFailed: false } : x)));
      } catch {
        setPages((prev) => prev.map((x) => (x.key === key ? { ...x, thumbFailed: true } : x)));
      }
    })();
  }, [pages, files]);

  const retryThumb = useCallback((key) => {
    const page = pages.find((p) => p.key === key);
    if (!page) return;
    const file = files.find((f) => f.id === page.fileId);
    if (!file) return;
    setPages((prev) => prev.map((p) => (p.key === key ? { ...p, thumbFailed: false, thumb: null } : p)));
    void (async () => {
      try {
        const thumb = await renderPageThumbnail(file.data, page.fileId, page.pageIndex, page.rotation);
        thumbCache.current.set(key, thumb);
        setPages((prev) => prev.map((x) => (x.key === key ? { ...x, thumb, thumbFailed: false } : x)));
      } catch {
        setPages((prev) => prev.map((x) => (x.key === key ? { ...x, thumbFailed: true } : x)));
      }
    })();
  }, [pages, files]);

  const toggleSplitAfter = useCallback((pageKey) => {
    setSplitAfterKeys((prev) => {
      const next = new Set(prev);
      if (next.has(pageKey)) next.delete(pageKey);
      else next.add(pageKey);
      return next;
    });
  }, []);

  const splitPreview = useMemo(() => {
    if (!splitAfterKeys.size || !pageOrder.length) return [];
    const breaks = [];
    pageOrder.forEach((key, i) => {
      if (splitAfterKeys.has(key)) breaks.push(i + 1);
    });
    const ranges = [];
    let start = 1;
    for (const b of breaks.sort((a, b) => a - b)) {
      if (b < 1 || b >= pageOrder.length) continue;
      ranges.push({ start, end: b, startKey: pageOrder[start - 1], endKey: pageOrder[b - 1] });
      start = b + 1;
    }
    if (start <= pageOrder.length) {
      ranges.push({
        start,
        end: pageOrder.length,
        startKey: pageOrder[start - 1],
        endKey: pageOrder[pageOrder.length - 1],
      });
    }
    return ranges;
  }, [splitAfterKeys, pageOrder]);

  const splitBreakIndices = useMemo(() => {
    const breaks = [];
    pageOrder.forEach((key, i) => {
      if (splitAfterKeys.has(key)) breaks.push(i + 1);
    });
    return breaks;
  }, [splitAfterKeys, pageOrder]);

  return {
    files,
    orderedFiles,
    fileMap,
    fileDataMap,
    pages,
    pageMap,
    pageOrder,
    orderedPageObjects,
    virtualPageRefs,
    fileGroups,
    splitAfterKeys,
    splitPreview,
    splitBreakIndices,
    viewMode,
    setViewMode,
    activePageKey,
    setActivePageKey,
    annotations,
    setAnnotations,
    pageLayouts,
    setPageLayout: (key, layout) => setPageLayouts((prev) => ({ ...prev, [key]: layout })),
    rotationsMap,
    loading,
    error,
    processing,
    setProcessing,
    result,
    setResult,
    setError,
    addFiles,
    reset,
    movePage,
    moveFile,
    removeFile,
    deletePage,
    rotatePage,
    toggleSplitAfter,
    retryThumb,
    totalPages: pageOrder.length,
  };
}
