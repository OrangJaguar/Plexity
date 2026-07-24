import { useEffect, useState } from 'react';
import {
  IMAGE_FILTER_PRESETS,
  listFilterCategories,
  renderFilterThumbnail,
} from '@/lib/tools/image/image-filters.js';
import { ImageToolPanelShell } from '@/components/tools/image/tools/ImageToolPanelShell';

export default function FiltersPanel({
  layer,
  filterDraft,
  setFilterDraft,
  onBack,
  onReset,
  onDone,
}) {
  const [thumbs, setThumbs] = useState(/** @type {Record<string, string>} */ ({}));
  const categories = listFilterCategories();

  useEffect(() => {
    if (!layer?.source) {
      setThumbs({});
      return undefined;
    }
    let cancelled = false;
    const next = {};
    for (const preset of IMAGE_FILTER_PRESETS) {
      const canvas = renderFilterThumbnail(layer.source, preset.id);
      next[preset.id] = canvas.toDataURL('image/jpeg', 0.7);
    }
    if (!cancelled) setThumbs(next);
    return () => { cancelled = true; };
  }, [layer?.id, layer?.source]);

  return (
    <ImageToolPanelShell title="Filters" onBack={onBack} onReset={onReset} onDone={onDone}>
      <button
        type="button"
        className="pdf-btn pdf-btn--ghost pdf-btn--sm tools-image-filter-remove"
        onClick={() => setFilterDraft(null)}
      >
        Remove
      </button>
      {categories.map((category) => (
        <div key={category} className="tools-image-filter-cat">
          <h4>{category}</h4>
          <div className="tools-image-filter-grid">
            {IMAGE_FILTER_PRESETS.filter((p) => p.category === category).map((preset) => {
              const active = (filterDraft || 'none') === preset.id
                || (!filterDraft && preset.id === 'none');
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`tools-image-filter-thumb${active ? ' is-active' : ''}`}
                  onClick={() => setFilterDraft(preset.id === 'none' ? null : preset.id)}
                >
                  {thumbs[preset.id] ? (
                    <img src={thumbs[preset.id]} alt="" />
                  ) : (
                    <span className="tools-image-filter-thumb-ph" />
                  )}
                  <span>{preset.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </ImageToolPanelShell>
  );
}
