import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { normalizeAdjustParams, defaultAdjustParams } from '@/lib/tools/image/image-adjust.js';
import { cropCanvas, rotateCanvas, fullCropRect } from '@/lib/tools/image/image-crop.js';
import { decodeImageBlob, formatBytes } from '@/lib/tools/image/image-decode.js';
import {
  createEmptyDocument,
  createImageHistory,
  createImageLayer,
  createTextLayer,
  createShapeLayer,
  createDrawingLayer,
  createGraphicLayer,
  createRedactLayer,
  deleteLayer,
  duplicateLayer,
  getSelectedLayer,
  patchLayer,
  reorderLayers,
  addLayer,
  moveLayerZ,
  setLayerAsBackground,
  cloneLayer,
  cloneDocument,
} from '@/lib/tools/image/image-document.js';
import { createOpaqueMask, paintMaskBrush, paintMaskStroke } from '@/lib/tools/image/image-erase.js';
import { exportComposite, exportFileName } from '@/lib/tools/image/image-export.js';
import {
  IMAGE_ACCEPT,
  IMAGE_MAX_LAYERS,
  validateImageFile,
} from '@/lib/tools/image/image-limits.js';
import { removeBackgroundLocal } from '@/lib/tools/image/image-rembg.js';
import { compositeDocument, estimateDocumentBytes } from '@/lib/tools/image/image-render.js';
import { alignBoxToCanvas, flipLayerTransform, snapBox } from '@/lib/tools/image/image-transform.js';
import { defaultTextStyle, normalizeTextStyle, measureTextBox } from '@/lib/tools/image/image-text.js';
import { defaultShapeStyle } from '@/lib/tools/image/image-shapes.js';
import { defaultRedactStyle } from '@/lib/tools/image/image-redact.js';
import { getGraphicById, svgToCanvas } from '@/lib/tools/image/image-elements-catalog.js';
import { cloneCanvas } from '@/lib/tools/image/image-decode.js';
import { sanitizeDisplayName, sanitizeDisplayNameInput } from '@/lib/tools/shared/display-filename.js';

function stemFromName(name) {
  const base = String(name ?? 'image');
  const idx = base.lastIndexOf('.');
  const stem = idx > 0 ? base.slice(0, idx) : base;
  return sanitizeDisplayName(stem);
}

/**
 * @typedef {'home' | 'crop' | 'eraser' | 'filters' | 'adjust' | 'layers' | 'annotate' | 'elements'} ImageToolId
 */

export function useImageWorkspace() {
  const [doc, setDoc] = useState(() => createEmptyDocument());
  const [rejections, setRejections] = useState(/** @type {{ id: string, name: string, code: string, message: string }[]} */ ([]));
  const [warnings, setWarnings] = useState(/** @type {string[]} */ ([]));
  const [activeTool, setActiveTool] = useState(/** @type {ImageToolId} */ ('home'));
  const [comparing, setComparing] = useState(false);
  const [compareLocked, setCompareLocked] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rembgStatus, setRembgStatus] = useState(/** @type {'idle' | 'loading' | 'error'} */ ('idle'));
  const [rembgError, setRembgError] = useState('');
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Tool drafts (committed on Done)
  const [cropDraft, setCropDraft] = useState(null);
  const [cropRotation, setCropRotation] = useState(0);
  const [adjustDraft, setAdjustDraft] = useState(defaultAdjustParams());
  const [filterDraft, setFilterDraft] = useState(/** @type {string | null} */ (null));
  const [eraserMode, setEraserMode] = useState(/** @type {'erase' | 'restore'} */ ('erase'));
  const [eraserSize, setEraserSize] = useState(24);
  const [eraserShowOriginal, setEraserShowOriginal] = useState(false);

  // Plan 2 annotate / elements / clipboard / nested edit
  const [annotateMode, setAnnotateMode] = useState(/** @type {'draw'|'text'|'redact'} */ ('draw'));
  const [drawColor, setDrawColor] = useState('#ffffff');
  const [drawWidth, setDrawWidth] = useState(4);
  const [textStyle, setTextStyle] = useState(defaultTextStyle());
  const [redactMode, setRedactMode] = useState(/** @type {'blackout'|'blur'|'pixelate'} */ ('blackout'));
  const [redactStrength, setRedactStrength] = useState(12);
  const [activeDrawingId, setActiveDrawingId] = useState(/** @type {string | null} */ (null));
  const activeDrawingIdRef = useRef(/** @type {string | null} */ (null));
  activeDrawingIdRef.current = activeDrawingId;
  const [clipboardLayer, setClipboardLayer] = useState(null);
  const [nestedEditOpen, setNestedEditOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState(/** @type {null | { x: number, y: number, layerId: string | null }} */ (null));
  const [eraserDraftMask, setEraserDraftMask] = useState(/** @type {HTMLCanvasElement | null} */ (null));
  const [eraserPreviewTick, setEraserPreviewTick] = useState(0);
  const [liveStroke, setLiveStroke] = useState(/** @type {null | { color: string, width: number, points: { x: number, y: number }[] }} */ (null));
  const [brushPreview, setBrushPreview] = useState(/** @type {null | { size: number, color?: string }} */ (null));
  const [editingTextId, setEditingTextId] = useState(/** @type {string | null} */ (null));
  const [fitZoomKey, setFitZoomKey] = useState(0);

  const historyRef = useRef(createImageHistory());
  const docRef = useRef(doc);
  const baselineDocRef = useRef(/** @type {import('@/lib/tools/image/image-document.js').ImageDocument | null} */ (null));
  const toolSessionRef = useRef(/** @type {import('@/lib/tools/image/image-document.js').ImageDocument | null} */ (null));
  const eraserDraftRef = useRef(/** @type {HTMLCanvasElement | null} */ (null));
  const eraserLastPointRef = useRef(/** @type {{ x: number, y: number } | null} */ (null));
  const eraserPreviewRafRef = useRef(0);
  const drawPendingRef = useRef(null);
  const liveStrokeRef = useRef(null);
  const brushPreviewTimerRef = useRef(0);
  docRef.current = doc;

  const isEmpty = doc.layers.length === 0;
  const selected = getSelectedLayer(doc);

  const syncHistoryFlags = useCallback(() => {
    setCanUndo(historyRef.current.canUndo());
    setCanRedo(historyRef.current.canRedo());
  }, []);

  const commit = useCallback((nextDoc, { pushHistory = true } = {}) => {
    if (pushHistory) {
      historyRef.current.push(docRef.current);
    }
    const withBytes = {
      ...nextDoc,
      estimatedBytes: estimateDocumentBytes(nextDoc),
    };
    setDoc(withBytes);
    queueMicrotask(syncHistoryFlags);
  }, [syncHistoryFlags]);

  const undo = useCallback(() => {
    const prev = historyRef.current.undo(docRef.current);
    if (!prev) return;
    setDoc(prev);
    syncHistoryFlags();
  }, [syncHistoryFlags]);

  const redo = useCallback(() => {
    const next = historyRef.current.redo(docRef.current);
    if (!next) return;
    setDoc(next);
    syncHistoryFlags();
  }, [syncHistoryFlags]);

  const reset = useCallback(() => {
    if (!baselineDocRef.current) return;
    if (!window.confirm('Reset all edits and restore the original image?')) return;
    historyRef.current.clear();
    const restored = cloneDocument(baselineDocRef.current);
    setDoc(restored);
    setRejections([]);
    setWarnings([]);
    setActiveTool('home');
    setComparing(false);
    setCompareLocked(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRembgStatus('idle');
    setRembgError('');
    setDownloadOpen(false);
    setEraserDraftMask(null);
    eraserDraftRef.current = null;
    eraserLastPointRef.current = null;
    toolSessionRef.current = null;
    setEditingTextId(null);
    setFitZoomKey((k) => k + 1);
    syncHistoryFlags();
  }, [syncHistoryFlags]);

  const addFiles = useCallback(async (files) => {
    const list = [...(files || [])];
    if (!list.length) return;
    /** @type {{ id: string, name: string, code: string, message: string }[]} */
    const rejected = [];
    /** @type {string[]} */
    const warns = [];
    const current = docRef.current;
    let next = current;
    let remaining = IMAGE_MAX_LAYERS - current.layers.length;

    for (const file of list) {
      if (remaining <= 0) {
        rejected.push({
          id: crypto.randomUUID(),
          name: file.name,
          code: 'limit',
          message: `Maximum ${IMAGE_MAX_LAYERS} images on the canvas.`,
        });
        continue;
      }
      const check = validateImageFile(file);
      if (!check.ok) {
        rejected.push({
          id: crypto.randomUUID(),
          name: file.name,
          code: check.code,
          message: check.message,
        });
        continue;
      }
      try {
        const decoded = await decodeImageBlob(file);
        if (decoded.warnMegapixels) {
          warns.push(`${file.name} is ${decoded.megapixels.toFixed(1)} MP — editing a downsampled working copy.`);
        } else if (decoded.downsampled) {
          warns.push(`${file.name} was resized for performance.`);
        }
        const isFirst = next.layers.length === 0;
        const layer = createImageLayer({
          id: crypto.randomUUID(),
          name: file.name,
          canvas: decoded.canvas,
          isBackground: isFirst,
          x: isFirst ? 0 : Math.round(next.canvasWidth * 0.1),
          y: isFirst ? 0 : Math.round(next.canvasHeight * 0.1),
          fileBytes: file.size,
        });
        if (isFirst) {
          next = {
            title: stemFromName(file.name),
            canvasWidth: decoded.workingWidth,
            canvasHeight: decoded.workingHeight,
            layers: [layer],
            selectedLayerId: layer.id,
            estimatedBytes: file.size,
          };
          baselineDocRef.current = cloneDocument(next);
          setFitZoomKey((k) => k + 1);
        } else {
          // Scale overlay to fit nicely (~40% of canvas)
          const maxW = next.canvasWidth * 0.45;
          const maxH = next.canvasHeight * 0.45;
          const scale = Math.min(maxW / layer.width, maxH / layer.height, 1);
          layer.width = Math.round(layer.width * scale);
          layer.height = Math.round(layer.height * scale);
          next = {
            ...next,
            layers: [...next.layers, layer],
            selectedLayerId: layer.id,
          };
        }
        remaining -= 1;
      } catch {
        rejected.push({
          id: crypto.randomUUID(),
          name: file.name,
          code: 'decode',
          message: 'Could not decode this image.',
        });
      }
    }

    setRejections(rejected);
    setWarnings(warns);
    if (next !== current && next.layers.length) {
      commit(next, { pushHistory: current.layers.length > 0 });
      if (!current.layers.length) {
        historyRef.current.clear();
        syncHistoryFlags();
      }
    }
  }, [commit, syncHistoryFlags]);

  const pasteFromClipboard = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read();
      const files = [];
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            files.push(new File([blob], `paste-${Date.now()}.png`, { type: blob.type }));
          }
        }
      }
      if (files.length) await addFiles(files);
    } catch {
      // ignore clipboard permission errors
    }
  }, [addFiles]);

  const setTitle = useCallback((title) => {
    setDoc((d) => ({ ...d, title: sanitizeDisplayNameInput(title) }));
  }, []);

  const discardToolSession = useCallback(() => {
    const snap = toolSessionRef.current;
    toolSessionRef.current = null;
    if (snap) {
      setDoc({ ...snap, estimatedBytes: estimateDocumentBytes(snap) });
    }
    setActiveTool('home');
    setCropDraft(null);
    setCropRotation(0);
    setEraserDraftMask(null);
    eraserDraftRef.current = null;
    eraserLastPointRef.current = null;
    setActiveDrawingId(null);
    setEditingTextId(null);
    syncHistoryFlags();
  }, [syncHistoryFlags]);

  const finishToolSession = useCallback(() => {
    toolSessionRef.current = null;
    setActiveTool('home');
    setCropDraft(null);
    setCropRotation(0);
    setEraserDraftMask(null);
    eraserDraftRef.current = null;
    eraserLastPointRef.current = null;
    setActiveDrawingId(null);
    syncHistoryFlags();
  }, [syncHistoryFlags]);

  const selectLayer = useCallback((layerId) => {
    setDoc((d) => ({ ...d, selectedLayerId: layerId }));
  }, []);

  const showBrushPreview = useCallback((size, color) => {
    setBrushPreview({ size, color });
    if (brushPreviewTimerRef.current) window.clearTimeout(brushPreviewTimerRef.current);
    brushPreviewTimerRef.current = window.setTimeout(() => {
      setBrushPreview(null);
      brushPreviewTimerRef.current = 0;
    }, 700);
  }, []);

  const setDrawWidthWithPreview = useCallback((width) => {
    setDrawWidth(width);
    showBrushPreview(width, drawColor);
  }, [drawColor, showBrushPreview]);

  const setEraserSizeWithPreview = useCallback((size) => {
    setEraserSize(size);
    showBrushPreview(size, 'rgba(255,255,255,0.85)');
  }, [showBrushPreview]);

  const updateSelectedTransformLive = useCallback((patch, { snap = true } = {}) => {
    const cur = docRef.current;
    const layer = getSelectedLayer(cur);
    if (!layer || layer.locked) return;
    let nextBox = {
      x: patch.x ?? layer.x,
      y: patch.y ?? layer.y,
      width: patch.width ?? layer.width,
      height: patch.height ?? layer.height,
      rotation: patch.rotation ?? layer.rotation,
    };
    if (snap && !layer.isBackground) {
      const siblings = cur.layers
        .filter((l) => l.id !== layer.id && l.visible)
        .map((l) => ({ x: l.x, y: l.y, width: l.width, height: l.height }));
      nextBox = snapBox(nextBox, cur.canvasWidth, cur.canvasHeight, siblings);
    }
    // Skip estimateDocumentBytes during live drag
    setDoc(patchLayer(cur, layer.id, { ...patch, ...nextBox }));
  }, []);

  const pushTransformCommit = useCallback(() => {
    const cur = docRef.current;
    setDoc({ ...cur, estimatedBytes: estimateDocumentBytes(cur) });
    syncHistoryFlags();
  }, [syncHistoryFlags]);

  const beginTransform = useCallback(() => {
    historyRef.current.push(docRef.current);
    syncHistoryFlags();
  }, [syncHistoryFlags]);

  const flipSelected = useCallback((axis) => {
    const cur = docRef.current;
    const layer = getSelectedLayer(cur);
    if (!layer || layer.locked) return;
    commit(patchLayer(cur, layer.id, flipLayerTransform(layer, axis)));
  }, [commit]);

  const alignSelected = useCallback((align) => {
    const cur = docRef.current;
    const layer = getSelectedLayer(cur);
    if (!layer || layer.locked || layer.isBackground) return;
    const box = alignBoxToCanvas(
      { x: layer.x, y: layer.y, width: layer.width, height: layer.height },
      cur.canvasWidth,
      cur.canvasHeight,
      align,
    );
    commit(patchLayer(cur, layer.id, box));
  }, [commit]);

  const setLayerOpacity = useCallback((opacity) => {
    const cur = docRef.current;
    const layer = getSelectedLayer(cur);
    if (!layer || layer.locked) return;
    commit(patchLayer(cur, layer.id, { opacity: Math.min(1, Math.max(0, opacity)) }));
  }, [commit]);

  const duplicateSelected = useCallback(() => {
    const cur = docRef.current;
    const layer = getSelectedLayer(cur);
    if (!layer) return;
    if (cur.layers.length >= IMAGE_MAX_LAYERS) return;
    commit(duplicateLayer(cur, layer.id));
  }, [commit]);

  const deleteSelected = useCallback(() => {
    const cur = docRef.current;
    const layer = getSelectedLayer(cur);
    if (!layer) return;
    commit(deleteLayer(cur, layer.id));
    setActiveTool('home');
  }, [commit]);

  const setLayerVisible = useCallback((layerId, visible) => {
    commit(patchLayer(docRef.current, layerId, { visible }));
  }, [commit]);

  const setLayerLocked = useCallback((layerId, locked) => {
    commit(patchLayer(docRef.current, layerId, { locked }));
  }, [commit]);

  const moveLayer = useCallback((fromIndex, toIndex) => {
    commit(reorderLayers(docRef.current, fromIndex, toIndex));
  }, [commit]);

  const openTool = useCallback((tool) => {
    const cur = docRef.current;
    const layer = getSelectedLayer(cur);
    if ((tool === 'crop' || tool === 'adjust' || tool === 'filters' || tool === 'eraser')
      && (!layer || layer.type !== 'image' || !layer.source)) {
      return;
    }
    toolSessionRef.current = cloneDocument(cur);
    setActiveTool(tool);
    if (tool === 'crop' && layer?.source) {
      const orig = layer.originalSource || layer.source;
      setCropDraft(fullCropRect(orig.width, orig.height));
      setCropRotation(0);
    }
    if (tool === 'adjust' && layer) {
      setAdjustDraft(normalizeAdjustParams(layer.adjust));
    }
    if (tool === 'filters' && layer) {
      setFilterDraft(layer.filterId);
    }
    if (tool === 'eraser' && layer?.source) {
      const mask = layer.mask
        ? cloneCanvas(layer.mask)
        : createOpaqueMask(layer.source.width, layer.source.height);
      eraserDraftRef.current = mask;
      setEraserDraftMask(mask);
      eraserLastPointRef.current = null;
    }
    if (tool === 'annotate') {
      setAnnotateMode('draw');
      setActiveDrawingId(null);
    }
  }, []);

  const closeTool = useCallback(() => {
    discardToolSession();
  }, [discardToolSession]);

  const resetToolDraft = useCallback(() => {
    const layer = getSelectedLayer(docRef.current);
    if (!layer) return;
    if (activeTool === 'crop' && layer.source) {
      const orig = layer.originalSource || layer.source;
      setCropDraft(fullCropRect(orig.width, orig.height));
      setCropRotation(0);
    }
    if (activeTool === 'adjust') {
      setAdjustDraft(defaultAdjustParams());
    }
    if (activeTool === 'filters') {
      setFilterDraft(null);
    }
    if (activeTool === 'eraser' && layer.source) {
      const mask = createOpaqueMask(layer.source.width, layer.source.height);
      eraserDraftRef.current = mask;
      setEraserDraftMask(mask);
      eraserLastPointRef.current = null;
    }
  }, [activeTool]);

  const applyToolDone = useCallback(() => {
    const cur = docRef.current;
    const layer = getSelectedLayer(cur);
    if (!layer) {
      finishToolSession();
      return;
    }

    if (activeTool === 'crop' && cropDraft) {
      const orig = layer.originalSource || layer.source;
      let canvas = cropCanvas(orig, cropDraft);
      if (Math.abs(cropRotation) > 0.01) {
        canvas = rotateCanvas(canvas, cropRotation);
      }
      const next = patchLayer(cur, layer.id, {
        source: canvas,
        originalSource: layer.originalSource || cloneCanvas(orig),
        width: layer.isBackground ? canvas.width : layer.width,
        height: layer.isBackground ? canvas.height : layer.height,
        mask: null,
      });
      if (layer.isBackground) {
        next.canvasWidth = canvas.width;
        next.canvasHeight = canvas.height;
        next.layers = next.layers.map((l) => (
          l.id === layer.id ? { ...l, x: 0, y: 0, width: canvas.width, height: canvas.height } : l
        ));
      }
      commit(next);
    }

    if (activeTool === 'adjust') {
      commit(patchLayer(cur, layer.id, { adjust: normalizeAdjustParams(adjustDraft) }));
    }

    if (activeTool === 'filters') {
      commit(patchLayer(cur, layer.id, { filterId: filterDraft === 'none' ? null : filterDraft }));
    }

    if (activeTool === 'eraser' && eraserDraftRef.current) {
      commit(patchLayer(cur, layer.id, { mask: cloneCanvas(eraserDraftRef.current) }));
    }

    finishToolSession();
  }, [activeTool, cropDraft, cropRotation, adjustDraft, filterDraft, commit, finishToolSession]);

  /** Live preview overlays for adjust/filter without committing */
  const previewDoc = useMemo(() => {
    if (isEmpty) return doc;
    const layer = getSelectedLayer(doc);
    if (!layer) return doc;
    if (activeTool === 'adjust') {
      return patchLayer(doc, layer.id, { adjust: normalizeAdjustParams(adjustDraft) });
    }
    if (activeTool === 'filters') {
      return patchLayer(doc, layer.id, { filterId: filterDraft === 'none' ? null : filterDraft });
    }
    if (activeTool === 'crop' && layer.type === 'image' && layer.originalSource) {
      const orig = layer.originalSource;
      let next = patchLayer(doc, layer.id, {
        source: orig,
        mask: null,
        filterId: null,
        adjust: defaultAdjustParams(),
        width: layer.isBackground ? orig.width : layer.width,
        height: layer.isBackground ? orig.height : layer.height,
        x: layer.isBackground ? 0 : layer.x,
        y: layer.isBackground ? 0 : layer.y,
      });
      if (layer.isBackground) {
        next = { ...next, canvasWidth: orig.width, canvasHeight: orig.height };
      }
      return next;
    }
    if (activeTool === 'eraser' && eraserDraftRef.current) {
      return patchLayer(doc, layer.id, { mask: eraserDraftRef.current });
    }
    if (activeTool === 'eraser' && eraserShowOriginal) {
      return patchLayer(doc, layer.id, { mask: null, filterId: null, adjust: defaultAdjustParams() });
    }
    return doc;
  }, [doc, isEmpty, activeTool, adjustDraft, filterDraft, eraserPreviewTick, eraserShowOriginal]);

  const showCompare = comparing || compareLocked;

  const composite = useMemo(() => {
    if (isEmpty) return null;
    return compositeDocument(previewDoc, { compareOriginal: showCompare });
  }, [previewDoc, isEmpty, showCompare]);

  const eraserStrokeRef = useRef(false);

  const paintEraser = useCallback((layerX, layerY) => {
    const cur = docRef.current;
    const layer = getSelectedLayer(cur);
    if (!layer || layer.locked || layer.type !== 'image' || !layer.source) return;
    const mask = eraserDraftRef.current;
    if (!mask) return;
    if (!eraserStrokeRef.current) {
      eraserStrokeRef.current = true;
    }
    const scaleX = layer.source.width / layer.width;
    const scaleY = layer.source.height / layer.height;
    const sx = layerX * scaleX;
    const sy = layerY * scaleY;
    const radius = (eraserSize / 2) * Math.max(scaleX, scaleY);
    const last = eraserLastPointRef.current;
    if (last) {
      paintMaskStroke(mask, last.x, last.y, sx, sy, radius, eraserMode);
    } else {
      paintMaskBrush(mask, sx, sy, radius, eraserMode);
    }
    eraserLastPointRef.current = { x: sx, y: sy };
    // Throttle React updates — mutate mask in place; tick forces one composite/frame.
    if (!eraserPreviewRafRef.current) {
      eraserPreviewRafRef.current = requestAnimationFrame(() => {
        eraserPreviewRafRef.current = 0;
        setEraserPreviewTick((t) => t + 1);
      });
    }
  }, [eraserSize, eraserMode]);

  const commitEraserStroke = useCallback(() => {
    eraserStrokeRef.current = false;
    eraserLastPointRef.current = null;
    if (eraserDraftRef.current) {
      setEraserDraftMask(eraserDraftRef.current);
      setEraserPreviewTick((t) => t + 1);
    }
  }, []);

  const runRemoveBackground = useCallback(async () => {
    const cur = docRef.current;
    const layer = getSelectedLayer(cur);
    if (!layer || layer.locked) return;
    setRembgStatus('loading');
    setRembgError('');
    try {
      const cutout = await removeBackgroundLocal(layer.source);
      const next = patchLayer(cur, layer.id, {
        source: cutout,
        mask: null,
        width: layer.isBackground ? cutout.width : layer.width,
        height: layer.isBackground ? cutout.height : layer.height,
      });
      if (layer.isBackground) {
        next.canvasWidth = cutout.width;
        next.canvasHeight = cutout.height;
        next.layers = next.layers.map((l) => (
          l.id === layer.id
            ? { ...l, x: 0, y: 0, width: cutout.width, height: cutout.height }
            : l
        ));
      }
      commit(next);
      setRembgStatus('idle');
    } catch (err) {
      setRembgStatus('error');
      setRembgError(err?.message || 'Background removal failed. Check your connection for model download.');
    }
  }, [commit]);

  const download = useCallback(async (options) => {
    const canvas = compositeDocument(docRef.current);
    const { blob } = await exportComposite(canvas, options);
    const name = exportFileName(docRef.current.title, options.format);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadOpen(false);
  }, []);

  const placeRectAt = useCallback((x, y) => {
    const layer = createShapeLayer({
      shape: defaultShapeStyle('rect'),
      name: 'Rectangle',
      x: x - 80,
      y: y - 50,
      width: 160,
      height: 100,
    });
    commit(addLayer(docRef.current, layer));
  }, [commit]);

  const startTextPlacement = useCallback(() => {
    setActiveTool('annotate');
    setAnnotateMode('text');
    setActiveDrawingId(null);
    toolSessionRef.current = cloneDocument(docRef.current);
  }, []);

  const startRectPlacement = useCallback(() => {
    const cur = docRef.current;
    placeRectAt(cur.canvasWidth / 2, cur.canvasHeight / 2);
  }, [placeRectAt]);

  // Keyboard shortcuts
  useEffect(() => {
    if (isEmpty) return undefined;
    const onKey = (e) => {
      const target = e.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;
      }
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (e.key === 'Escape') {
        if (editingTextId) {
          setEditingTextId(null);
          return;
        }
        if (activeTool !== 'home') closeTool();
        return;
      }
      if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        startTextPlacement();
        return;
      }
      if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        startRectPlacement();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isEmpty, activeTool, undo, redo, closeTool, deleteSelected, editingTextId, startTextPlacement, startRectPlacement]);

  const metaLabel = useMemo(() => {
    if (isEmpty) return { dims: '', size: '' };
    return {
      dims: `${doc.canvasWidth} × ${doc.canvasHeight} px`,
      size: formatBytes(doc.estimatedBytes),
    };
  }, [doc, isEmpty]);

  const placeCentered = useCallback((width, height) => {
    const cur = docRef.current;
    return {
      x: Math.round((cur.canvasWidth - width) / 2),
      y: Math.round((cur.canvasHeight - height) / 2),
    };
  }, []);

  const placeGraphic = useCallback(async (graphicId) => {
    const item = getGraphicById(graphicId);
    if (!item) return;
    try {
      const canvas = await svgToCanvas(item.svg, 96);
      const pos = placeCentered(96, 96);
      const layer = createGraphicLayer({
        name: item.label,
        graphicId: item.id,
        graphicSvg: item.svg,
        canvas,
        ...pos,
      });
      commit(addLayer(docRef.current, layer));
    } catch (err) {
      console.error('placeGraphic failed', err);
      // Fallback: place shape-like placeholder so click never feels dead
      const pos = placeCentered(96, 96);
      const layer = createGraphicLayer({
        name: item.label,
        graphicId: item.id,
        graphicSvg: item.svg,
        canvas: null,
        ...pos,
      });
      commit(addLayer(docRef.current, layer));
    }
  }, [commit, placeCentered]);

  const placeShape = useCallback((shapeId) => {
    const pos = placeCentered(160, 100);
    const layer = createShapeLayer({
      shape: defaultShapeStyle(shapeId),
      name: shapeId,
      width: shapeId === 'line' || shapeId === 'arrow' ? 200 : 160,
      height: shapeId === 'line' || shapeId === 'arrow' ? 24 : 100,
      ...pos,
    });
    commit(addLayer(docRef.current, layer));
  }, [commit, placeCentered]);

  const placeSessionImage = useCallback((layerId) => {
    const cur = docRef.current;
    const src = cur.layers.find((l) => l.id === layerId && l.type === 'image');
    if (!src?.source) return;
    if (cur.layers.length >= IMAGE_MAX_LAYERS) return;
    const copy = cloneLayer(src);
    copy.id = crypto.randomUUID();
    copy.name = `${src.name} copy`;
    copy.isBackground = false;
    const pos = placeCentered(Math.min(src.width, cur.canvasWidth * 0.4), Math.min(src.height, cur.canvasHeight * 0.4));
    copy.x = pos.x;
    copy.y = pos.y;
    copy.width = Math.min(src.width, cur.canvasWidth * 0.4);
    copy.height = Math.min(src.height, cur.canvasHeight * 0.4);
    commit(addLayer(cur, copy));
  }, [commit, placeCentered]);

  const patchSelectedShape = useCallback((shapePatch) => {
    const cur = docRef.current;
    const layer = getSelectedLayer(cur);
    if (!layer || layer.type !== 'shape') return;
    commit(patchLayer(cur, layer.id, { shape: { ...layer.shape, ...shapePatch } }));
  }, [commit]);

  const patchSelectedText = useCallback((textPatch) => {
    const cur = docRef.current;
    const layer = getSelectedLayer(cur);
    if (!layer || layer.type !== 'text') return;
    const text = normalizeTextStyle({ ...layer.text, ...textPatch });
    const box = measureTextBox(text);
    commit(patchLayer(cur, layer.id, { text, width: Math.max(layer.width, box.width), height: box.height }));
  }, [commit]);

  const ensureDrawingLayer = useCallback(() => {
    const cur = docRef.current;
    if (activeDrawingId) {
      const existing = cur.layers.find((l) => l.id === activeDrawingId);
      if (existing) return existing.id;
    }
    const layer = createDrawingLayer({
      name: `Drawing ${cur.layers.filter((l) => l.type === 'drawing').length + 1}`,
      x: 0,
      y: 0,
      width: cur.canvasWidth,
      height: cur.canvasHeight,
      strokes: [],
    });
    const next = addLayer(cur, layer);
    historyRef.current.push(cur);
    setDoc({ ...next, estimatedBytes: estimateDocumentBytes(next) });
    setActiveDrawingId(layer.id);
    syncHistoryFlags();
    return layer.id;
  }, [activeDrawingId, syncHistoryFlags]);

  const drawStrokeStart = useCallback((x, y) => {
    const id = ensureDrawingLayer();
    const stroke = {
      color: drawColor,
      width: drawWidth,
      points: [{ x, y }],
    };
    liveStrokeRef.current = { layerId: id, stroke };
    setLiveStroke({ ...stroke, points: [...stroke.points] });
  }, [ensureDrawingLayer, drawColor, drawWidth]);

  const drawStrokeMove = useCallback((x, y) => {
    const live = liveStrokeRef.current;
    if (!live) return;
    live.stroke.points.push({ x, y });
    if (drawPendingRef.current) return;
    drawPendingRef.current = requestAnimationFrame(() => {
      drawPendingRef.current = null;
      const cur = liveStrokeRef.current;
      if (!cur) return;
      setLiveStroke({
        color: cur.stroke.color,
        width: cur.stroke.width,
        points: cur.stroke.points.slice(),
      });
    });
  }, []);

  const drawStrokeEnd = useCallback(() => {
    const live = liveStrokeRef.current;
    liveStrokeRef.current = null;
    setLiveStroke(null);
    if (!live?.stroke?.points?.length) return;
    const cur = docRef.current;
    const layer = cur.layers.find((l) => l.id === live.layerId);
    if (!layer) return;
    // Convert document-space points → layer-local
    const local = {
      color: live.stroke.color,
      width: live.stroke.width,
      points: live.stroke.points.map((p) => ({ x: p.x - layer.x, y: p.y - layer.y })),
    };
    const strokes = [...(layer.strokes || []), local];
    setDoc(patchLayer(cur, live.layerId, { strokes }));
  }, []);

  const placeTextAt = useCallback((x, y) => {
    const style = normalizeTextStyle(textStyle);
    const box = measureTextBox(style);
    const layer = createTextLayer({
      text: style,
      x: x - box.width / 2,
      y: y - box.height / 2,
    });
    commit(addLayer(docRef.current, layer));
    // Keep annotate text mode; selection drives the edit pill.
  }, [commit, textStyle]);

  const placeRedactRect = useCallback((x, y, width, height) => {
    const layer = createRedactLayer({
      x,
      y,
      width: Math.max(8, width),
      height: Math.max(8, height),
      redact: defaultRedactStyle(redactMode),
    });
    layer.redact.strength = redactStrength;
    commit(addLayer(docRef.current, layer));
  }, [commit, redactMode, redactStrength]);

  const finishDrawingSession = useCallback(() => {
    // Next draw creates a new Drawing N layer (Plan 2 stroke grouping).
    setActiveDrawingId(null);
  }, []);

  const setAnnotateModeSafe = useCallback((mode) => {
    if (mode !== 'draw') setActiveDrawingId(null);
    setAnnotateMode(mode);
  }, []);

  const copySelected = useCallback(() => {
    const layer = getSelectedLayer(docRef.current);
    if (!layer) return;
    setClipboardLayer(cloneLayer(layer));
  }, []);

  const pasteClipboard = useCallback(() => {
    if (!clipboardLayer) return;
    const cur = docRef.current;
    if (cur.layers.length >= IMAGE_MAX_LAYERS) return;
    const copy = cloneLayer(clipboardLayer);
    copy.id = crypto.randomUUID();
    copy.isBackground = false;
    copy.x += 24;
    copy.y += 24;
    copy.name = `${clipboardLayer.name} copy`;
    commit(addLayer(cur, copy));
  }, [clipboardLayer, commit]);

  const layerZ = useCallback((action) => {
    const cur = docRef.current;
    const layer = getSelectedLayer(cur);
    if (!layer) return;
    commit(moveLayerZ(cur, layer.id, action));
  }, [commit]);

  const setSelectedLocked = useCallback((locked) => {
    const cur = docRef.current;
    const layer = getSelectedLayer(cur);
    if (!layer) return;
    commit(patchLayer(cur, layer.id, { locked }));
  }, [commit]);

  const promoteBackground = useCallback(() => {
    const cur = docRef.current;
    const layer = getSelectedLayer(cur);
    if (!layer || layer.type !== 'image') return;
    commit(setLayerAsBackground(cur, layer.id));
  }, [commit]);

  const openNestedEdit = useCallback(() => {
    const layer = getSelectedLayer(docRef.current);
    if (!layer || layer.type !== 'image') return;
    setNestedEditOpen(true);
  }, []);

  const saveNestedEdit = useCallback((patch) => {
    const cur = docRef.current;
    const layer = getSelectedLayer(cur);
    if (!layer || layer.type !== 'image') return;
    let next = patchLayer(cur, layer.id, {
      source: patch.source,
      mask: patch.mask ?? null,
      filterId: patch.filterId ?? null,
      adjust: patch.adjust ?? defaultAdjustParams(),
      originalSource: layer.originalSource || cloneCanvas(layer.source),
    });
    if (layer.isBackground && patch.source) {
      next = {
        ...next,
        canvasWidth: patch.source.width,
        canvasHeight: patch.source.height,
        layers: next.layers.map((l) => (
          l.id === layer.id
            ? { ...l, width: patch.source.width, height: patch.source.height, x: 0, y: 0 }
            : l
        )),
      };
    } else if (patch.source) {
      next = patchLayer(next, layer.id, {
        width: layer.width,
        height: layer.height,
      });
    }
    commit(next);
    setNestedEditOpen(false);
  }, [commit]);

  const applyToolDoneWithAnnotate = useCallback(() => {
    if (activeTool === 'annotate') {
      finishDrawingSession();
      finishToolSession();
      return;
    }
    applyToolDone();
  }, [activeTool, applyToolDone, finishDrawingSession, finishToolSession]);

  return {
    doc: previewDoc,
    rawDoc: doc,
    isEmpty,
    rejections,
    warnings,
    acceptAttribute: IMAGE_ACCEPT,
    activeTool,
    selected,
    composite,
    zoom,
    setZoom,
    pan,
    setPan,
    comparing: showCompare,
    setComparing,
    compareLocked,
    setCompareLocked,
    canUndo,
    canRedo,
    undo,
    redo,
    reset,
    addFiles,
    pasteFromClipboard,
    setTitle,
    selectLayer,
    updateSelectedTransform: updateSelectedTransformLive,
    pushTransformCommit,
    beginTransform,
    flipSelected,
    alignSelected,
    setLayerOpacity,
    duplicateSelected,
    deleteSelected,
    setLayerVisible,
    setLayerLocked,
    moveLayer,
    openTool,
    closeTool,
    resetToolDraft,
    applyToolDone: applyToolDoneWithAnnotate,
    cropDraft,
    setCropDraft,
    cropRotation,
    setCropRotation,
    adjustDraft,
    setAdjustDraft,
    filterDraft,
    setFilterDraft,
    eraserMode,
    setEraserMode,
    eraserSize,
    setEraserSize: setEraserSizeWithPreview,
    eraserShowOriginal,
    setEraserShowOriginal,
    paintEraser,
    commitEraserStroke,
    rembgStatus,
    rembgError,
    runRemoveBackground,
    downloadOpen,
    setDownloadOpen,
    download,
    metaLabel,
    // Plan 2
    annotateMode,
    setAnnotateMode: setAnnotateModeSafe,
    drawColor,
    setDrawColor,
    drawWidth,
    setDrawWidth: setDrawWidthWithPreview,
    textStyle,
    setTextStyle,
    redactMode,
    setRedactMode,
    redactStrength,
    setRedactStrength,
    placeGraphic,
    placeShape,
    placeSessionImage,
    patchSelectedShape,
    patchSelectedText,
    drawStrokeStart,
    drawStrokeMove,
    drawStrokeEnd,
    liveStroke,
    brushPreview,
    placeTextAt,
    placeRedactRect,
    finishDrawingSession,
    copySelected,
    pasteClipboard,
    layerZ,
    setSelectedLocked,
    promoteBackground,
    nestedEditOpen,
    setNestedEditOpen,
    openNestedEdit,
    saveNestedEdit,
    contextMenu,
    setContextMenu,
    fitZoomKey,
    editingTextId,
    setEditingTextId,
    placeRectAt,
    startTextPlacement,
    startRectPlacement,
  };
}
