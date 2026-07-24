import { ImageTextStyleControls } from '@/components/tools/image/ImageTextStyleControls';

export default function ImageAnnotatePill({
  annotateMode,
  drawColor,
  setDrawColor,
  drawWidth,
  setDrawWidth,
  textStyle,
  setTextStyle,
  redactMode,
  setRedactMode,
  redactStrength,
  setRedactStrength,
  selectedText = null,
  onPatchSelectedText,
}) {
  if (annotateMode === 'draw') {
    return (
      <div className="tools-image-floating-pill" role="toolbar" aria-label="Draw options">
        <label className="tools-image-pill-field">
          Color
          <input type="color" value={drawColor} onChange={(e) => setDrawColor(e.target.value)} />
        </label>
        <label className="tools-image-pill-field">
          Size
          <input
            type="range"
            min={1}
            max={120}
            value={drawWidth}
            onChange={(e) => setDrawWidth(Number(e.target.value))}
          />
          <span>{drawWidth}</span>
        </label>
      </div>
    );
  }

  if (annotateMode === 'text') {
    // Editing an existing selected text layer while still in annotate
    if (selectedText?.text && onPatchSelectedText) {
      return (
        <div className="tools-image-floating-pill" role="toolbar" aria-label="Edit text">
          <span className="tools-image-pill-label">Edit</span>
          <ImageTextStyleControls
            text={selectedText.text}
            onChange={onPatchSelectedText}
            showContent
          />
        </div>
      );
    }

    return (
      <div className="tools-image-floating-pill" role="toolbar" aria-label="Text options">
        <span className="tools-image-pill-label">Place</span>
        <ImageTextStyleControls
          text={textStyle}
          onChange={(patch) => setTextStyle({ ...textStyle, ...patch })}
          showContent={false}
        />
        <span className="tools-image-pill-hint">Click canvas to place</span>
      </div>
    );
  }

  return (
    <div className="tools-image-floating-pill" role="toolbar" aria-label="Redact options">
      <div className="tools-image-seg tools-image-seg--inline">
        {['blackout', 'blur', 'pixelate'].map((mode) => (
          <button
            key={mode}
            type="button"
            className={redactMode === mode ? 'is-active' : ''}
            onClick={() => setRedactMode(mode)}
          >
            {mode}
          </button>
        ))}
      </div>
      {redactMode !== 'blackout' && (
        <label className="tools-image-pill-field">
          Strength
          <input
            type="range"
            min={2}
            max={40}
            value={redactStrength}
            onChange={(e) => setRedactStrength(Number(e.target.value))}
          />
        </label>
      )}
    </div>
  );
}
