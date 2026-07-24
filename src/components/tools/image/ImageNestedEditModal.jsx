import { useEffect, useMemo, useState } from 'react';
import { cloneCanvas } from '@/lib/tools/image/image-decode.js';
import { cropCanvas, rotateCanvas, fullCropRect, CROP_ASPECT_PRESETS, applyAspectToCrop } from '@/lib/tools/image/image-crop.js';
import { defaultAdjustParams, normalizeAdjustParams, applyAdjustToImageData, isIdentityAdjust } from '@/lib/tools/image/image-adjust.js';
import { applyFilterToCanvas, IMAGE_FILTER_PRESETS } from '@/lib/tools/image/image-filters.js';
import { createOpaqueMask, paintMaskBrush, applyMaskAsAlpha } from '@/lib/tools/image/image-erase.js';
import { removeBackgroundLocal } from '@/lib/tools/image/image-rembg.js';
import { getImageData, canvasFromImageData } from '@/lib/tools/image/image-decode.js';

/**
 * Nested modal: crop / erase / rembg / filters / adjust on a single image layer clone.
 */
export default function ImageNestedEditModal({
  open,
  layer,
  onClose,
  onSave,
}) {
  const [tab, setTab] = useState(/** @type {'crop'|'eraser'|'filters'|'adjust'} */ ('adjust'));
  const [source, setSource] = useState(/** @type {HTMLCanvasElement | null} */ (null));
  const [cropDraft, setCropDraft] = useState(null);
  const [cropRotation, setCropRotation] = useState(0);
  const [adjust, setAdjust] = useState(defaultAdjustParams());
  const [filterId, setFilterId] = useState(/** @type {string | null} */ (null));
  const [mask, setMask] = useState(/** @type {HTMLCanvasElement | null} */ (null));
  const [eraserMode, setEraserMode] = useState(/** @type {'erase'|'restore'} */ ('erase'));
  const [eraserSize, setEraserSize] = useState(20);
  const [rembgLoading, setRembgLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !layer?.source) {
      setSource(null);
      return;
    }
    const canvas = cloneCanvas(layer.source);
    setSource(canvas);
    setCropDraft(fullCropRect(canvas.width, canvas.height));
    setCropRotation(0);
    setAdjust(normalizeAdjustParams(layer.adjust));
    setFilterId(layer.filterId);
    setMask(layer.mask ? cloneCanvas(layer.mask) : createOpaqueMask(canvas.width, canvas.height));
    setTab('adjust');
    setError('');
  }, [open, layer?.id]);

  const preview = useMemo(() => {
    if (!source) return null;
    let canvas = cloneCanvas(source);
    if (filterId && filterId !== 'none') canvas = applyFilterToCanvas(canvas, filterId);
    const adj = normalizeAdjustParams(adjust);
    if (!isIdentityAdjust(adj)) {
      const data = getImageData(canvas);
      applyAdjustToImageData(data, adj);
      canvas = canvasFromImageData(data);
    }
    if (mask) canvas = applyMaskAsAlpha(canvas, mask);
    return canvas;
  }, [source, filterId, adjust, mask]);

  if (!open || !layer) return null;

  const handleSave = () => {
    if (!source) return;
    let canvas = cloneCanvas(source);
    if (tab === 'crop' && cropDraft) {
      canvas = cropCanvas(source, cropDraft);
      if (Math.abs(cropRotation) > 0.01) canvas = rotateCanvas(canvas, cropRotation);
      onSave({ source: canvas, mask: null, filterId: null, adjust: defaultAdjustParams() });
      return;
    }
    if (filterId && filterId !== 'none') canvas = applyFilterToCanvas(canvas, filterId);
    const adj = normalizeAdjustParams(adjust);
    if (!isIdentityAdjust(adj)) {
      const data = getImageData(canvas);
      applyAdjustToImageData(data, adj);
      canvas = canvasFromImageData(data);
    }
    if (mask) canvas = applyMaskAsAlpha(canvas, mask);
    // Bake edits into source for nested save simplicity
    onSave({ source: canvas, mask: null, filterId: null, adjust: defaultAdjustParams() });
  };

  const paint = (e) => {
    if (tab !== 'eraser' || !mask || !preview) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * source.width;
    const y = ((e.clientY - rect.top) / rect.height) * source.height;
    paintMaskBrush(mask, x, y, eraserSize / 2, eraserMode);
    setMask(cloneCanvas(mask));
  };

  return (
    <div className="tools-image-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="tools-image-modal tools-image-nested-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-nested-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="image-nested-title">Edit image</h2>
        <div className="tools-image-nested-tabs">
          {['crop', 'eraser', 'filters', 'adjust'].map((id) => (
            <button
              key={id}
              type="button"
              className={tab === id ? 'is-active' : ''}
              onClick={() => setTab(id)}
            >
              {id}
            </button>
          ))}
        </div>

        <div className="tools-image-nested-preview">
          {preview && (
            <img
              src={preview.toDataURL('image/png')}
              alt=""
              draggable={false}
              onPointerDown={paint}
              onPointerMove={(e) => { if (e.buttons === 1) paint(e); }}
            />
          )}
        </div>

        <div className="tools-image-nested-controls">
          {tab === 'crop' && cropDraft && source && (
            <>
              <div className="tools-image-aspect-row">
                {CROP_ASPECT_PRESETS.slice(0, 6).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="tools-image-aspect-chip"
                    onClick={() => setCropDraft(applyAspectToCrop(
                      cropDraft,
                      source.width,
                      source.height,
                      p.ratio === 0 ? source.width / source.height : p.ratio,
                    ))}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <label className="tools-image-field-block">
                <span className="tools-image-field-label">Rotate</span>
                <input type="range" min={-45} max={45} value={cropRotation} onChange={(e) => setCropRotation(Number(e.target.value))} />
              </label>
            </>
          )}
          {tab === 'eraser' && (
            <>
              <div className="tools-image-seg">
                <button type="button" className={eraserMode === 'erase' ? 'is-active' : ''} onClick={() => setEraserMode('erase')}>Erase</button>
                <button type="button" className={eraserMode === 'restore' ? 'is-active' : ''} onClick={() => setEraserMode('restore')}>Restore</button>
              </div>
              <input type="range" min={4} max={80} value={eraserSize} onChange={(e) => setEraserSize(Number(e.target.value))} />
              <button
                type="button"
                className="pdf-btn pdf-btn--secondary"
                disabled={rembgLoading}
                onClick={async () => {
                  if (!source) return;
                  setRembgLoading(true);
                  setError('');
                  try {
                    const cutout = await removeBackgroundLocal(source);
                    setSource(cutout);
                    setMask(createOpaqueMask(cutout.width, cutout.height));
                  } catch (err) {
                    setError(err?.message || 'Background removal failed');
                  } finally {
                    setRembgLoading(false);
                  }
                }}
              >
                {rembgLoading ? 'Removing…' : 'Remove background'}
              </button>
            </>
          )}
          {tab === 'filters' && (
            <div className="tools-image-filter-grid">
              {IMAGE_FILTER_PRESETS.slice(0, 12).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`tools-image-filter-thumb${(filterId || 'none') === p.id ? ' is-active' : ''}`}
                  onClick={() => setFilterId(p.id === 'none' ? null : p.id)}
                >
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          )}
          {tab === 'adjust' && (
            ['brightness', 'contrast', 'saturation', 'exposure'].map((key) => (
              <label key={key} className="tools-image-field-block">
                <span className="tools-image-field-label">{key}</span>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  value={Math.round((adjust[key] || 0) * 100)}
                  onChange={(e) => setAdjust({ ...adjust, [key]: Number(e.target.value) / 100 })}
                />
              </label>
            ))
          )}
          {error && <p className="tools-image-error">{error}</p>}
        </div>

        <div className="tools-image-modal-actions">
          <button type="button" className="pdf-btn pdf-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="pdf-btn pdf-btn--primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
