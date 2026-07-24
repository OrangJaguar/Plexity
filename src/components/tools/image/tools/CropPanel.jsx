import { CROP_ASPECT_PRESETS, applyAspectToCrop, clampCropRect } from '@/lib/tools/image/image-crop.js';
import { ImageToolPanelShell } from '@/components/tools/image/tools/ImageToolPanelShell';

export default function CropPanel({
  layer,
  cropDraft,
  setCropDraft,
  cropRotation,
  setCropRotation,
  onBack,
  onReset,
  onDone,
}) {
  if (!layer || !layer.source || !cropDraft) {
    return (
      <ImageToolPanelShell title="Crop" onBack={onBack} onReset={onReset} onDone={onDone}>
        <p className="tools-image-hint">Select an image layer to crop.</p>
      </ImageToolPanelShell>
    );
  }

  const applyPreset = (preset) => {
    const src = layer.originalSource || layer.source;
    const ratio = preset.ratio === 0
      ? src.width / src.height
      : preset.ratio;
    setCropDraft(applyAspectToCrop(cropDraft, src.width, src.height, ratio));
  };

  return (
    <ImageToolPanelShell title="Crop" onBack={onBack} onReset={onReset} onDone={onDone}>
      <div className="tools-image-field-block">
        <span className="tools-image-field-label">Aspect ratio</span>
        <div className="tools-image-aspect-row">
          {CROP_ASPECT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="tools-image-aspect-chip"
              onClick={() => applyPreset(preset)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
      <div className="tools-image-field-block">
        <span className="tools-image-field-label">Rotate</span>
        <div className="tools-image-slider-row">
          <input
            type="range"
            min={-45}
            max={45}
            step={0.5}
            value={cropRotation}
            onChange={(e) => setCropRotation(Number(e.target.value))}
          />
          <input
            className="tools-image-num"
            type="number"
            value={Math.round(cropRotation * 10) / 10}
            onChange={(e) => setCropRotation(Number(e.target.value) || 0)}
          />
        </div>
      </div>
      <div className="tools-image-field-block">
        <span className="tools-image-field-label">Crop size</span>
        <div className="tools-image-crop-size-row">
          <label>
            W
            <input
              className="tools-image-num"
              type="number"
              value={Math.round(cropDraft.width)}
              onChange={(e) => setCropDraft(clampCropRect(
                { ...cropDraft, width: Number(e.target.value) || 1 },
                layer.source.width,
                layer.source.height,
              ))}
            />
          </label>
          <label>
            H
            <input
              className="tools-image-num"
              type="number"
              value={Math.round(cropDraft.height)}
              onChange={(e) => setCropDraft(clampCropRect(
                { ...cropDraft, height: Number(e.target.value) || 1 },
                layer.source.width,
                layer.source.height,
              ))}
            />
          </label>
        </div>
      </div>
    </ImageToolPanelShell>
  );
}
