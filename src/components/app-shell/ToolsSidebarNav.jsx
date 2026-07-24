import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useReorderPinnedTools } from '@/hooks/mutations/useReorderPinnedTools';
import { useUiStore } from '@/store/uiStore';

const HORIZONTAL_POP_THRESHOLD = 12;

/** @returns {{ gap: number, y: number }[]} */
function measureGapBoundaries(navEl) {
  const itemEls = [...navEl.querySelectorAll('[data-tools-nav-item]')];
  if (!itemEls.length) return [{ gap: 0, y: 0 }];

  const rects = itemEls.map((el) => el.getBoundingClientRect());
  const boundaries = [];

  boundaries.push({ gap: 0, y: rects[0].top - 4 });

  for (let i = 0; i < rects.length - 1; i += 1) {
    boundaries.push({
      gap: i + 1,
      y: (rects[i].bottom + rects[i + 1].top) / 2,
    });
  }

  boundaries.push({
    gap: rects.length,
    y: rects[rects.length - 1].bottom + 4,
  });

  return boundaries;
}

function computeGapIndex(navEl, clientY) {
  const boundaries = measureGapBoundaries(navEl);
  let bestGap = 0;
  let bestDist = Infinity;

  boundaries.forEach(({ gap, y }) => {
    const dist = Math.abs(clientY - y);
    if (dist < bestDist) {
      bestDist = dist;
      bestGap = gap;
    }
  });

  return bestGap;
}

function ToolsSidebarNavItem({
  item,
  index,
  dragState,
  onPointerDown,
  isPinEnter,
}) {
  const Icon = item.icon;
  const isDragging = dragState?.index === index && dragState?.popped;
  const isPlaceholder = dragState?.index === index && dragState?.popped;
  const canonical = item.canonicalRoute || item.to;
  // Nested tools (stocks) stay active on subpaths; dashboard is exact-match only.
  const end = canonical === '/dashboard';

  return (
    <div
      className={`tools-sidebar-nav-item${isPlaceholder ? ' tools-sidebar-nav-item--placeholder' : ''}`}
      data-tools-nav-item
      data-index={index}
    >
      <NavLink
        to={item.to}
        end={end}
        data-tooltip={item.label}
        className={({ isActive }) => {
          const classes = ['app-sidebar-link', 'tools-sidebar-link'];
          if (isActive) classes.push('active');
          if (isDragging) classes.push('tools-sidebar-link--floating');
          if (isPinEnter) classes.push('tools-sidebar-link--pin-enter');
          return classes.join(' ');
        }}
        style={isDragging ? {
          position: 'fixed',
          left: Math.max(dragState.x, 88),
          top: dragState.y,
          transform: 'translate(-50%, -50%)',
          zIndex: 60,
        } : undefined}
        onPointerDown={(e) => onPointerDown(e, index)}
        onClick={(e) => {
          if (dragState?.moved) e.preventDefault();
        }}
        draggable={false}
      >
        {({ isActive }) => {
          const strokeActive = item.sidebarIconActive === 'stroke';
          return (
            <Icon
              size={20}
              strokeWidth={isActive ? (strokeActive ? 2.25 : 2) : 1.75}
              fill={isActive && !strokeActive ? 'currentColor' : 'none'}
            />
          );
        }}
      </NavLink>
    </div>
  );
}

export default function ToolsSidebarNav({ items }) {
  const navRef = useRef(null);
  const reorder = useReorderPinnedTools();
  const lastPinnedToolId = useUiStore((s) => s.lastPinnedToolId);
  const dragRef = useRef(null);
  const [dragState, setDragState] = useState(null);
  const [gapMarkers, setGapMarkers] = useState([]);

  const clearDrag = useCallback(() => {
    dragRef.current = null;
    setDragState(null);
    setGapMarkers([]);
  }, []);

  useEffect(() => {
    const onPointerUp = (e) => {
      const drag = dragRef.current;
      if (!drag) return;

      if (drag.popped && navRef.current) {
        const gapIndex = computeGapIndex(navRef.current, e.clientY);
        const fromGap = drag.index;
        const wouldMove = gapIndex !== fromGap && gapIndex !== fromGap + 1;
        if (wouldMove) {
          reorder.mutate({ fromIndex: drag.index, gapIndex });
        }
      }

      clearDrag();
    };

    const onPointerMove = (e) => {
      const drag = dragRef.current;
      if (!drag) return;

      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      const moved = drag.moved || Math.abs(dx) > 3 || Math.abs(dy) > 3;
      let popped = drag.popped;

      if (!popped && Math.abs(dx) >= HORIZONTAL_POP_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        popped = true;
      }

      let dropGap = drag.dropGap;
      if (popped && navRef.current) {
        dropGap = computeGapIndex(navRef.current, e.clientY);
        setGapMarkers(measureGapBoundaries(navRef.current));
      }

      dragRef.current = {
        ...drag,
        moved,
        popped,
        x: e.clientX,
        y: e.clientY,
        dropGap,
      };

      if (popped) {
        setDragState({
          index: drag.index,
          popped: true,
          x: e.clientX,
          y: e.clientY,
          moved,
          dropGap,
        });
      } else if (moved) {
        setDragState({
          index: drag.index,
          popped: false,
          moved: true,
        });
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [reorder, clearDrag]);

  const handlePointerDown = (e, index) => {
    if (e.button !== 0) return;
    dragRef.current = {
      index,
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      popped: false,
      moved: false,
      dropGap: index,
    };
    setDragState(null);
    setGapMarkers([]);
  };

  const navRect = navRef.current?.getBoundingClientRect();

  return (
    <nav ref={navRef} className="app-sidebar-nav app-sidebar-nav--tools">
      {items.map((item, index) => (
        <ToolsSidebarNavItem
          key={item.toolId ?? item.to}
          item={item}
          index={index}
          dragState={dragState}
          onPointerDown={handlePointerDown}
          isPinEnter={item.toolId === lastPinnedToolId}
        />
      ))}

      {dragState?.popped && navRect && gapMarkers.length > 0 && (
        <div className="tools-sidebar-gap-layer" aria-hidden>
          {gapMarkers.map(({ gap, y }) => (
            <div
              key={`gap-${gap}`}
              className={`tools-sidebar-gap-marker${dragState.dropGap === gap ? ' active' : ''}`}
              style={{ top: y - navRect.top }}
            />
          ))}
        </div>
      )}
    </nav>
  );
}
