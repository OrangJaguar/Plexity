import { ImageToolPanelShell } from '@/components/tools/image/tools/ImageToolPanelShell';

const SLIDERS = [
  { key: 'brightness', label: 'Brightness' },
  { key: 'contrast', label: 'Contrast' },
  { key: 'exposure', label: 'Exposure' },
  { key: 'saturation', label: 'Saturation' },
  { key: 'temperature', label: 'Temperature' },
  { key: 'tint', label: 'Tint' },
];

export default function AdjustPanel({
  adjustDraft,
  setAdjustDraft,
  onBack,
  onReset,
  onDone,
}) {
  return (
    <ImageToolPanelShell title="Adjust" onBack={onBack} onReset={onReset} onDone={onDone}>
      {SLIDERS.map(({ key, label }) => (
        <div key={key} className="tools-image-field-block">
          <span className="tools-image-field-label">{label}</span>
          <div className="tools-image-slider-row">
            <input
              type="range"
              min={-100}
              max={100}
              value={Math.round((adjustDraft[key] || 0) * 100)}
              onChange={(e) => setAdjustDraft({
                ...adjustDraft,
                [key]: Number(e.target.value) / 100,
              })}
            />
            <span className="tools-image-num-readonly">
              {Math.round((adjustDraft[key] || 0) * 100)}
            </span>
          </div>
        </div>
      ))}
    </ImageToolPanelShell>
  );
}
