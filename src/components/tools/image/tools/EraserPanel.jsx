import { ImageToolPanelShell } from '@/components/tools/image/tools/ImageToolPanelShell';

export default function EraserPanel({
  eraserMode,
  setEraserMode,
  eraserSize,
  setEraserSize,
  eraserShowOriginal,
  setEraserShowOriginal,
  rembgStatus,
  rembgError,
  onRemoveBackground,
  onBack,
  onReset,
  onDone,
}) {
  return (
    <ImageToolPanelShell title="Eraser" onBack={onBack} onReset={onReset} onDone={onDone}>
      <div className="tools-image-field-block">
        <span className="tools-image-field-label">Type</span>
        <div className="tools-image-seg">
          <button
            type="button"
            className={eraserMode === 'erase' ? 'is-active' : ''}
            onClick={() => setEraserMode('erase')}
          >
            Erase
          </button>
          <button
            type="button"
            className={eraserMode === 'restore' ? 'is-active' : ''}
            onClick={() => setEraserMode('restore')}
          >
            Restore
          </button>
        </div>
      </div>
      <div className="tools-image-field-block">
        <span className="tools-image-field-label">Size</span>
        <div className="tools-image-slider-row">
          <input
            type="range"
            min={4}
            max={200}
            value={eraserSize}
            onChange={(e) => setEraserSize(Number(e.target.value))}
          />
          <span className="tools-image-num-readonly">{eraserSize}</span>
        </div>
      </div>
      <label className="tools-image-toggle-row">
        <span>Show original</span>
        <input
          type="checkbox"
          checked={eraserShowOriginal}
          onChange={(e) => setEraserShowOriginal(e.target.checked)}
        />
      </label>
      <button
        type="button"
        className="pdf-btn pdf-btn--secondary tools-image-rembg-btn"
        onClick={onRemoveBackground}
        disabled={rembgStatus === 'loading'}
      >
        {rembgStatus === 'loading' ? 'Removing background…' : 'Remove background'}
      </button>
      {rembgError ? <p className="tools-image-error">{rembgError}</p> : null}
      <p className="tools-image-hint">
        Paint on the canvas to erase or restore. Background removal runs locally in your browser.
      </p>
    </ImageToolPanelShell>
  );
}
