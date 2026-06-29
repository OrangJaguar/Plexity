import { Home, Minus, Plus, Download, Maximize2, Wrench, Keyboard } from 'lucide-react';

export default function GraphToolbar({
  onHome,
  onZoomIn,
  onZoomOut,
  onAutoFit,
  onExport,
  onOpenSettings,
  onToggleKeyboard,
  settingsOpen,
  keyboardOpen,
}) {
  return (
    <div className="calc-graph-toolbar">
      <button type="button" className="calc-toolbar-btn" onClick={onHome} title="Standard view (−10 to 10, −7 to 7)">
        <Home size={16} />
      </button>
      <button type="button" className="calc-toolbar-btn" onClick={onZoomIn} title="Zoom in">
        <Plus size={16} />
      </button>
      <button type="button" className="calc-toolbar-btn" onClick={onZoomOut} title="Zoom out">
        <Minus size={16} />
      </button>
      <button type="button" className="calc-toolbar-btn" onClick={onAutoFit} title="Auto fit">
        <Maximize2 size={16} />
      </button>
      <button
        type="button"
        className={`calc-toolbar-btn ${settingsOpen ? 'is-active' : ''}`}
        onClick={onOpenSettings}
        title="Graph settings"
      >
        <Wrench size={16} />
      </button>
      <button type="button" className="calc-toolbar-btn" onClick={onExport} title="Export PNG">
        <Download size={16} />
      </button>
      <span className="calc-toolbar-sep" />
      <button
        type="button"
        className={`calc-toolbar-btn ${keyboardOpen ? 'is-active' : ''}`}
        onClick={onToggleKeyboard}
        title="Math keyboard"
      >
        <Keyboard size={16} />
      </button>
    </div>
  );
}
