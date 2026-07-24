/**
 * Playlist item picker with search, select all/none, keyboard-friendly controls.
 */
export default function ConverterPlaylistItemPicker({
  items,
  selectedCount,
  query,
  onQueryChange,
  onSelectAll,
  onToggleItem,
  disabled = false,
}) {
  return (
    <div className="tools-converter-playlist-picker" role="region" aria-labelledby="playlist-picker-heading">
      <div className="tools-converter-url-import-header">
        <h3 id="playlist-picker-heading">Select items</h3>
        <span className="tools-converter-muted">{selectedCount} selected</span>
      </div>

      <label htmlFor="playlist-search" className="tools-converter-url-paste-label">
        Search / filter
      </label>
      <input
        id="playlist-search"
        type="search"
        className="tools-converter-url-paste"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        disabled={disabled}
        placeholder="Filter by title"
      />

      <div className="tools-converter-url-actions">
        <button type="button" className="tools-converter-btn" disabled={disabled} onClick={() => onSelectAll(true)}>
          Select all
        </button>
        <button type="button" className="tools-converter-btn" disabled={disabled} onClick={() => onSelectAll(false)}>
          Select none
        </button>
      </div>

      <ul className="tools-converter-playlist-item-list">
        {items.map((item) => (
          <li key={item.itemId}>
            <label className="tools-converter-url-ack">
              <input
                type="checkbox"
                checked={Boolean(item.selected)}
                disabled={disabled}
                onChange={(e) => onToggleItem(item.itemId, e.target.checked)}
              />
              <span>
                {item.redactedTitle}
                <span className="tools-converter-muted">
                  {' '}
                  ·
                  {item.durationBucket}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      {!items.length && (
        <p className="tools-converter-muted">No items match this filter.</p>
      )}
    </div>
  );
}
