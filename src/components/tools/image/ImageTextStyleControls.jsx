/**
 * Shared text formatting controls for annotate + selection pills.
 */
export function ImageTextStyleControls({
  text,
  onChange,
  showContent = true,
}) {
  if (!text) return null;

  return (
    <>
      {showContent && (
        <label className="tools-image-pill-field tools-image-pill-field--grow">
          Text
          <input
            type="text"
            value={text.text || ''}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder="Type here…"
            aria-label="Text content"
          />
        </label>
      )}
      <label className="tools-image-pill-field">
        Font
        <select
          value={text.fontFamily}
          onChange={(e) => onChange({ fontFamily: e.target.value })}
        >
          <option value="Inter, system-ui, sans-serif">Inter</option>
          <option value="Georgia, serif">Georgia</option>
          <option value="ui-monospace, monospace">Mono</option>
          <option value="Arial, Helvetica, sans-serif">Arial</option>
          <option value="'Times New Roman', Times, serif">Times</option>
        </select>
      </label>
      <label className="tools-image-pill-field">
        Size
        <input
          type="number"
          min={8}
          max={400}
          value={text.fontSize}
          onChange={(e) => onChange({ fontSize: Number(e.target.value) || 32 })}
        />
      </label>
      <button
        type="button"
        className={`tools-image-pill-toggle${text.fontWeight === 'bold' ? ' is-active' : ''}`}
        onClick={() => onChange({
          fontWeight: text.fontWeight === 'bold' ? 'normal' : 'bold',
        })}
        aria-label="Bold"
      >
        B
      </button>
      <button
        type="button"
        className={`tools-image-pill-toggle${text.fontStyle === 'italic' ? ' is-active' : ''}`}
        onClick={() => onChange({
          fontStyle: text.fontStyle === 'italic' ? 'normal' : 'italic',
        })}
        aria-label="Italic"
      >
        I
      </button>
      <button
        type="button"
        className={`tools-image-pill-toggle${text.underline ? ' is-active' : ''}`}
        onClick={() => onChange({ underline: !text.underline })}
        aria-label="Underline"
      >
        U
      </button>
      <select
        value={text.align}
        onChange={(e) => onChange({ align: e.target.value })}
        aria-label="Align"
      >
        <option value="left">Left</option>
        <option value="center">Center</option>
        <option value="right">Right</option>
      </select>
      <input
        type="color"
        value={text.color?.startsWith('#') ? text.color : '#ffffff'}
        onChange={(e) => onChange({ color: e.target.value })}
        aria-label="Text color"
      />
    </>
  );
}
