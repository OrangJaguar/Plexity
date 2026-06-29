import { useEffect, useRef } from 'react';

export default function GraphSettingsModal({
  open,
  settings,
  viewport,
  onClose,
  onChangeSettings,
  onChangeViewport,
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, onClose]);

  if (!open) return null;

  const setBound = (key, value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    onChangeViewport({ ...viewport, [key]: n });
  };

  return (
    <div className="calc-settings-modal" ref={ref} role="dialog" aria-label="Graph settings">
      <h3>Graph settings</h3>

      <label className="calc-settings-row">
        <input
          type="checkbox"
          checked={settings.grid}
          onChange={(e) => onChangeSettings({ grid: e.target.checked })}
        />
        <span>Grid</span>
      </label>

      <div className="calc-settings-section">
        <label className="calc-settings-row">
          <input
            type="checkbox"
            checked={settings.xAxis !== false}
            onChange={(e) => onChangeSettings({ xAxis: e.target.checked })}
          />
          <span>X-axis</span>
        </label>
        <div className="calc-settings-bounds">
          <input
            type="number"
            value={viewport.xMin}
            onChange={(e) => setBound('xMin', e.target.value)}
            aria-label="X minimum"
          />
          <span>≤ x ≤</span>
          <input
            type="number"
            value={viewport.xMax}
            onChange={(e) => setBound('xMax', e.target.value)}
            aria-label="X maximum"
          />
        </div>
      </div>

      <div className="calc-settings-section">
        <label className="calc-settings-row">
          <input
            type="checkbox"
            checked={settings.yAxis !== false}
            onChange={(e) => onChangeSettings({ yAxis: e.target.checked })}
          />
          <span>Y-axis</span>
        </label>
        <div className="calc-settings-bounds">
          <input
            type="number"
            value={viewport.yMin}
            onChange={(e) => setBound('yMin', e.target.value)}
            aria-label="Y minimum"
          />
          <span>≤ y ≤</span>
          <input
            type="number"
            value={viewport.yMax}
            onChange={(e) => setBound('yMax', e.target.value)}
            aria-label="Y maximum"
          />
        </div>
      </div>

      <div className="calc-settings-angle">
        <button
          type="button"
          className={settings.angleMode === 'RAD' ? 'is-active' : ''}
          onClick={() => onChangeSettings({ angleMode: 'RAD' })}
        >
          Radians
        </button>
        <button
          type="button"
          className={settings.angleMode === 'DEG' ? 'is-active' : ''}
          onClick={() => onChangeSettings({ angleMode: 'DEG' })}
        >
          Degrees
        </button>
      </div>
    </div>
  );
}
