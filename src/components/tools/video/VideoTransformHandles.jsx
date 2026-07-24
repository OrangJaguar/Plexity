import { useRef } from 'react';

/**
 * Move / scale / rotate handles for overlay, text, and sticker clips.
 * @param {object} props
 */
export default function VideoTransformHandles({
  clip,
  projectWidth,
  projectHeight,
  stageEl,
  onLive,
  onBegin,
  onEnd,
}) {
  const startRef = useRef(null);

  if (!clip || !stageEl) return null;
  const t = clip.transform;

  const clientToProject = (clientX, clientY) => {
    const rect = stageEl.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * projectWidth;
    const y = ((clientY - rect.top) / rect.height) * projectHeight;
    return { x, y };
  };

  return (
    <div
      className="tools-video-transform-box"
      style={{
        left: `${(t.x / projectWidth) * 100}%`,
        top: `${(t.y / projectHeight) * 100}%`,
        transform: `scale(${t.scale}) rotate(${t.rotation}deg)`,
        transformOrigin: 'top left',
      }}
      onPointerDown={(e) => {
        if (e.target !== e.currentTarget && !(/** @type {HTMLElement} */ (e.target)).dataset?.handle) {
          // allow bubbling from handles only
        }
        const handle = /** @type {HTMLElement} */ (e.target).dataset?.handle || 'move';
        e.stopPropagation();
        e.preventDefault();
        onBegin();
        const origin = clientToProject(e.clientX, e.clientY);
        startRef.current = {
          handle,
          origin,
          transform: { ...t },
        };
        const node = e.currentTarget;
        node.setPointerCapture(e.pointerId);
        const onMove = (ev) => {
          const s = startRef.current;
          if (!s) return;
          const cur = clientToProject(ev.clientX, ev.clientY);
          const dx = cur.x - s.origin.x;
          const dy = cur.y - s.origin.y;
          if (s.handle === 'move') {
            onLive(clip.id, { x: s.transform.x + dx, y: s.transform.y + dy });
          } else if (s.handle === 'scale') {
            const delta = (dx + dy) / 200;
            onLive(clip.id, { scale: Math.max(0.1, s.transform.scale + delta) });
          } else if (s.handle === 'rotate') {
            onLive(clip.id, { rotation: s.transform.rotation + dx * 0.5 });
          }
        };
        const onUp = () => {
          node.releasePointerCapture(e.pointerId);
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          startRef.current = null;
          onEnd();
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      }}
    >
      <span className="tools-video-transform-handle tools-video-transform-handle--scale" data-handle="scale" />
      <span className="tools-video-transform-handle tools-video-transform-handle--rotate" data-handle="rotate" title="Rotate" />
    </div>
  );
}
