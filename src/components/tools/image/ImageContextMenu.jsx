import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const LAYER_ACTIONS = [
  { id: 'forward', label: 'Bring forward' },
  { id: 'backward', label: 'Send backward' },
  { id: 'front', label: 'Bring to front' },
  { id: 'back', label: 'Send to back' },
];

const ALIGN_ACTIONS = ['left', 'center', 'right', 'top', 'middle', 'bottom'];

/**
 * Image-only custom context menu — viewport-aware with hover submenus.
 */
export default function ImageContextMenu({
  open,
  x,
  y,
  layer,
  onClose,
  onCopy,
  onPaste,
  onDuplicate,
  onDelete,
  onLayerZ,
  onAlign,
  onFlip,
  onLock,
  onEdit,
  onSetBackground,
}) {
  const ref = useRef(/** @type {HTMLDivElement | null} */ (null));
  const [pos, setPos] = useState({ left: x, top: y });
  const [layerOpen, setLayerOpen] = useState(false);
  const [alignOpen, setAlignOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  useLayoutEffect(() => {
    if (!open || !ref.current) return;
    const menu = ref.current;
    const rect = menu.getBoundingClientRect();
    const pad = 8;
    let left = x - rect.width / 2;
    let top = y - rect.height / 2;
    left = Math.min(Math.max(pad, left), window.innerWidth - rect.width - pad);
    top = Math.min(Math.max(pad, top), window.innerHeight - rect.height - pad);
    setPos({ left, top });
  }, [open, x, y, layerOpen, alignOpen]);

  useEffect(() => {
    if (!open) {
      setLayerOpen(false);
      setAlignOpen(false);
    }
  }, [open]);

  if (!open) return null;

  const locked = Boolean(layer?.locked);
  const isImage = layer?.type === 'image';

  return (
    <div
      ref={ref}
      className="tools-image-context-menu"
      style={{ left: pos.left, top: pos.top }}
      role="menu"
    >
      <button type="button" role="menuitem" onClick={() => { onCopy(); onClose(); }} disabled={!layer}>Copy</button>
      <button type="button" role="menuitem" onClick={() => { onPaste(); onClose(); }}>Paste</button>
      <button type="button" role="menuitem" onClick={() => { onDuplicate(); onClose(); }} disabled={!layer}>Duplicate</button>
      <button type="button" role="menuitem" onClick={() => { onDelete(); onClose(); }} disabled={!layer}>Delete</button>
      <div className="tools-image-context-sep" />
      <div
        className="tools-image-context-submenu"
        onMouseEnter={() => setLayerOpen(true)}
        onMouseLeave={() => setLayerOpen(false)}
      >
        <button type="button" className="tools-image-context-submenu-trigger" disabled={!layer}>
          Layer ▸
        </button>
        {layerOpen && (
          <div className="tools-image-context-flyout">
            {LAYER_ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                disabled={!layer}
                onClick={() => { onLayerZ(action.id); onClose(); }}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div
        className="tools-image-context-submenu"
        onMouseEnter={() => setAlignOpen(true)}
        onMouseLeave={() => setAlignOpen(false)}
      >
        <button type="button" className="tools-image-context-submenu-trigger" disabled={!layer || layer?.isBackground}>
          Align ▸
        </button>
        {alignOpen && (
          <div className="tools-image-context-flyout">
            {ALIGN_ACTIONS.map((a) => (
              <button
                key={a}
                type="button"
                disabled={!layer || layer.isBackground}
                onClick={() => { onAlign(a); onClose(); }}
              >
                {a}
              </button>
            ))}
          </div>
        )}
      </div>
      <button type="button" role="menuitem" onClick={() => { onFlip('h'); onClose(); }} disabled={!layer}>Flip horizontal</button>
      <button type="button" role="menuitem" onClick={() => { onFlip('v'); onClose(); }} disabled={!layer}>Flip vertical</button>
      <button type="button" role="menuitem" onClick={() => { onLock(!locked); onClose(); }} disabled={!layer}>
        {locked ? 'Unlock' : 'Lock'}
      </button>
      <div className="tools-image-context-sep" />
      <button type="button" role="menuitem" onClick={() => { onEdit(); onClose(); }} disabled={!isImage}>Edit…</button>
      <button type="button" role="menuitem" onClick={() => { onSetBackground(); onClose(); }} disabled={!isImage}>Set as background</button>
      {layer && (
        <p className="tools-image-context-info">
          {layer.name} · {Math.round(layer.width)}×{Math.round(layer.height)} · {layer.type}
        </p>
      )}
    </div>
  );
}
