import { ImageToolPanelShell } from '@/components/tools/image/tools/ImageToolPanelShell';

const MODES = [
  { id: 'draw', label: 'Draw', hint: 'Freehand strokes on a Drawing layer.' },
  { id: 'text', label: 'Text', hint: 'Click the canvas to place text.' },
  { id: 'redact', label: 'Redact', hint: 'Drag on the canvas to add a redact box.' },
];

export default function AnnotatePanel({
  annotateMode,
  setAnnotateMode,
  onBack,
  onDone,
}) {
  return (
    <ImageToolPanelShell
      title="Annotate"
      onBack={onBack}
      onReset={() => setAnnotateMode('draw')}
      onDone={onDone}
    >
      <div className="tools-image-annotate-modes">
        {MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={`tools-image-annotate-mode${annotateMode === mode.id ? ' is-active' : ''}`}
            onClick={() => setAnnotateMode(mode.id)}
          >
            <strong>{mode.label}</strong>
            <span>{mode.hint}</span>
          </button>
        ))}
      </div>
      <p className="tools-image-hint">
        Use the floating bar above the image for color, size, and text options. Done finishes the current drawing session.
      </p>
    </ImageToolPanelShell>
  );
}
