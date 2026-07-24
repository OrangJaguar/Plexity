import { useMemo, useState } from 'react';
import { ArrowLeft, Search, Upload } from 'lucide-react';
import { searchElements, GRAPHIC_CATALOG } from '@/lib/tools/image/image-elements-catalog.js';

const PILLS = [
  { id: 'graphics', label: 'Graphics' },
  { id: 'images', label: 'Images' },
  { id: 'shapes', label: 'Shapes' },
];

export default function ElementsPanel({
  doc,
  onPlaceGraphic,
  onPlaceShape,
  onPlaceSessionImage,
  onUploadImages,
  accept,
  onBack,
}) {
  const [pill, setPill] = useState(/** @type {'graphics'|'images'|'shapes'} */ ('graphics'));
  const [query, setQuery] = useState('');

  const sessionImages = useMemo(
    () => doc.layers
      .filter((l) => l.type === 'image')
      .map((l) => ({ id: l.id, name: l.name })),
    [doc.layers],
  );

  const items = useMemo(
    () => searchElements(pill, query, sessionImages),
    [pill, query, sessionImages],
  );

  return (
    <div className="tools-image-tool-panel">
      <header className="tools-image-tool-panel-head">
        <button type="button" className="tools-image-tool-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={16} />
        </button>
        <h3>Elements</h3>
      </header>
      <div className="tools-image-tool-panel-body">
        <label className="tools-image-elements-search">
          <Search size={14} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search elements"
          />
        </label>
        <div className="tools-image-elements-pills">
          {PILLS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={pill === p.id ? 'is-active' : ''}
              onClick={() => setPill(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {pill === 'images' && (
          <label className="pdf-btn pdf-btn--secondary pdf-btn--sm tools-image-elements-upload">
            <Upload size={14} />
            Upload image
            <input
              type="file"
              accept={accept}
              multiple
              hidden
              onChange={(e) => {
                const files = e.target.files ? [...e.target.files] : [];
                e.target.value = '';
                if (files.length) onUploadImages(files);
              }}
            />
          </label>
        )}

        <div className="tools-image-elements-grid">
          {items.map((item) => {
            if (pill === 'graphics') {
              const g = GRAPHIC_CATALOG.find((x) => x.id === item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  className="tools-image-element-tile"
                  onClick={() => onPlaceGraphic(item.id)}
                >
                  <span
                    className="tools-image-element-thumb"
                    dangerouslySetInnerHTML={{ __html: g?.svg || '' }}
                  />
                  <span>{item.label}</span>
                </button>
              );
            }
            if (pill === 'shapes') {
              return (
                <button
                  key={item.id}
                  type="button"
                  className="tools-image-element-tile"
                  onClick={() => onPlaceShape(item.shape || item.id)}
                >
                  <span className="tools-image-element-thumb tools-image-element-thumb--shape">
                    {item.label.slice(0, 1)}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            }
            return (
              <button
                key={item.id}
                type="button"
                className="tools-image-element-tile"
                onClick={() => onPlaceSessionImage(item.layerId || item.id)}
              >
                <span className="tools-image-element-thumb tools-image-element-thumb--img">Img</span>
                <span>{item.label}</span>
              </button>
            );
          })}
          {items.length === 0 && (
            <p className="tools-image-hint">No matches.</p>
          )}
        </div>
      </div>
    </div>
  );
}
