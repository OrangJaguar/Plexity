import { Copy, Trash2 } from 'lucide-react';
import { ImageTextStyleControls } from '@/components/tools/image/ImageTextStyleControls';

/**
 * Selection chrome for shapes / text / graphics / images (non-tool mode).
 */
export default function ImageSelectionPill({
  selected,
  onDuplicate,
  onDelete,
  onPatchShape,
  onPatchText,
}) {
  if (!selected || selected.isBackground) return null;

  return (
    <div className="tools-image-floating-pill tools-image-selection-pill" role="toolbar" aria-label="Selection">
      <span className="tools-image-pill-label">{selected.type}</span>
      {selected.type === 'shape' && selected.shape && (
        <>
          <label className="tools-image-pill-field">
            Fill
            <input
              type="color"
              value={selected.shape.fill?.startsWith('#') ? selected.shape.fill : '#6b8afd'}
              onChange={(e) => onPatchShape({ fill: e.target.value })}
            />
          </label>
          <label className="tools-image-pill-field">
            Border
            <input
              type="color"
              value={selected.shape.stroke?.startsWith('#') ? selected.shape.stroke : '#ffffff'}
              onChange={(e) => onPatchShape({ stroke: e.target.value })}
            />
          </label>
          <label className="tools-image-pill-field">
            Width
            <input
              type="range"
              min={0}
              max={24}
              value={selected.shape.strokeWidth || 0}
              onChange={(e) => onPatchShape({ strokeWidth: Number(e.target.value) })}
            />
          </label>
          {(selected.shape.shape === 'roundRect' || selected.shape.shape === 'rect') && (
            <label className="tools-image-pill-field">
              Round
              <input
                type="range"
                min={0}
                max={64}
                value={selected.shape.cornerRadius || 0}
                onChange={(e) => onPatchShape({
                  cornerRadius: Number(e.target.value),
                  shape: 'roundRect',
                })}
              />
            </label>
          )}
        </>
      )}
      {selected.type === 'text' && selected.text && (
        <ImageTextStyleControls
          text={selected.text}
          onChange={onPatchText}
          showContent
        />
      )}
      <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" onClick={onDuplicate} aria-label="Duplicate">
        <Copy size={14} />
      </button>
      <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" onClick={onDelete} aria-label="Delete">
        <Trash2 size={14} />
      </button>
    </div>
  );
}
