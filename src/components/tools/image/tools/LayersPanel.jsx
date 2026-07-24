import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  FlipHorizontal2,
  FlipVertical2,
  ArrowLeft,
  Image as ImageIcon,
  Type,
  Square,
  Pencil,
  Shapes,
  EyeClosed,
} from 'lucide-react';

const TYPE_ICON = {
  image: ImageIcon,
  text: Type,
  shape: Square,
  drawing: Pencil,
  graphic: Shapes,
  redact: EyeClosed,
};

export default function LayersPanel({
  doc,
  selectedId,
  onSelect,
  onReorder,
  onVisible,
  onLocked,
  onDuplicate,
  onDelete,
  onFlip,
  onAlign,
  onOpacity,
  onEdit,
  onBack,
}) {
  const layersTopFirst = [...doc.layers].reverse();

  return (
    <div className="tools-image-tool-panel">
      <header className="tools-image-tool-panel-head">
        <button type="button" className="tools-image-tool-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={16} />
        </button>
        <h3>Layers</h3>
      </header>
      <div className="tools-image-tool-panel-body">
        <ul className="tools-image-layer-list">
          {layersTopFirst.map((layer, visualIndex) => {
            const realIndex = doc.layers.length - 1 - visualIndex;
            const active = layer.id === selectedId;
            const TypeIcon = TYPE_ICON[layer.type] || Square;
            return (
              <li key={layer.id} className={`tools-image-layer-item${active ? ' is-active' : ''}`}>
                <button
                  type="button"
                  className="tools-image-layer-select"
                  onClick={() => onSelect(layer.id)}
                >
                  <span className="tools-image-layer-type" title={layer.type} aria-label={layer.type}>
                    <TypeIcon size={12} />
                  </span>
                  <span className="tools-image-layer-name">
                    {layer.isBackground ? 'Background' : layer.name}
                  </span>
                </button>
                <div className="tools-image-layer-actions">
                  <button
                    type="button"
                    aria-label={layer.visible ? 'Hide' : 'Show'}
                    onClick={() => onVisible(layer.id, !layer.visible)}
                  >
                    {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button
                    type="button"
                    aria-label={layer.locked ? 'Unlock' : 'Lock'}
                    onClick={() => onLocked(layer.id, !layer.locked)}
                  >
                    {layer.locked ? <Lock size={14} /> : <Unlock size={14} />}
                  </button>
                  <button
                    type="button"
                    aria-label="Move up"
                    disabled={realIndex >= doc.layers.length - 1}
                    onClick={() => onReorder(realIndex, realIndex + 1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    disabled={realIndex <= 0}
                    onClick={() => onReorder(realIndex, realIndex - 1)}
                  >
                    ↓
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {selectedId ? (
          <div className="tools-image-layer-tools">
            <div className="tools-image-field-block">
              <span className="tools-image-field-label">Opacity</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round((doc.layers.find((l) => l.id === selectedId)?.opacity ?? 1) * 100)}
                onChange={(e) => onOpacity(Number(e.target.value) / 100)}
              />
            </div>
            <div className="tools-image-inline-actions">
              <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" onClick={() => onFlip('h')} aria-label="Flip horizontal">
                <FlipHorizontal2 size={14} />
              </button>
              <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" onClick={() => onFlip('v')} aria-label="Flip vertical">
                <FlipVertical2 size={14} />
              </button>
              <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" onClick={onDuplicate} aria-label="Duplicate">
                <Copy size={14} />
              </button>
              <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" onClick={onDelete} aria-label="Delete">
                <Trash2 size={14} />
              </button>
              {doc.layers.find((l) => l.id === selectedId)?.type === 'image' && onEdit ? (
                <button type="button" className="pdf-btn pdf-btn--secondary pdf-btn--sm" onClick={onEdit}>
                  Edit…
                </button>
              ) : null}
            </div>
            <div className="tools-image-align-row">
              {['left', 'center', 'right', 'top', 'middle', 'bottom'].map((a) => (
                <button
                  key={a}
                  type="button"
                  className="tools-image-aspect-chip"
                  onClick={() => onAlign(a)}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
