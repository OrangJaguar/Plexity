import { useMemo, useRef, useState } from 'react';
import { Film, Image as ImageIcon, Music, Upload } from 'lucide-react';
import ToolsLocalDropzone from '@/components/tools/shared/ToolsLocalDropzone';

/**
 * @param {object} props
 */
export default function VideoMediaBin({
  media,
  accept,
  onFiles,
  onPlace,
  importing,
  rejections,
  empty,
  usedMediaIds,
}) {
  const dragIdRef = useRef(/** @type {string | null} */ (null));
  const [dragOver, setDragOver] = useState(false);
  const [query, setQuery] = useState('');
  const [usageFilter, setUsageFilter] = useState(/** @type {'all'|'used'|'unused'} */ ('all'));

  const usedSet = useMemo(() => new Set(usedMediaIds || []), [usedMediaIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (media || []).filter((m) => {
      if (q && !String(m.name || '').toLowerCase().includes(q)) return false;
      const used = usedSet.has(m.id);
      if (usageFilter === 'used' && !used) return false;
      if (usageFilter === 'unused' && used) return false;
      return true;
    });
  }, [media, query, usageFilter, usedSet]);

  if (empty) {
    return (
      <div className="tools-video-media-bin tools-video-media-bin--empty">
        <ToolsLocalDropzone
          title="Add video, audio, or images"
          hint="Files stay on this device. Drop media to start editing."
          accept={accept}
          loading={importing}
          onFiles={onFiles}
        >
          {rejections?.length ? (
            <ul className="tools-video-rejections">
              {rejections.map((r) => (
                <li key={r.id}>{r.name}: {r.message}</li>
              ))}
            </ul>
          ) : null}
        </ToolsLocalDropzone>
      </div>
    );
  }

  return (
    <aside className="tools-video-media-bin">
      <div className="tools-video-media-bin-head">
        <h2>Media</h2>
        <label className="pdf-btn pdf-btn--ghost pdf-btn--sm">
          <Upload size={14} />
          Import
          <input
            type="file"
            accept={accept}
            multiple
            hidden
            onChange={(e) => {
              const files = e.target.files ? [...e.target.files] : [];
              e.target.value = '';
              if (files.length) onFiles(files);
            }}
          />
        </label>
      </div>
      <div className="tools-video-media-filters">
        <input
          type="search"
          className="tools-video-media-search"
          placeholder="Search media"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search media"
        />
        <select
          value={usageFilter}
          onChange={(e) => setUsageFilter(/** @type {'all'|'used'|'unused'} */ (e.target.value))}
          aria-label="Filter by usage"
        >
          <option value="all">All</option>
          <option value="used">Used</option>
          <option value="unused">Unused</option>
        </select>
      </div>
      {rejections?.length ? (
        <ul className="tools-video-rejections">
          {rejections.map((r) => (
            <li key={r.id}>{r.name}: {r.message}</li>
          ))}
        </ul>
      ) : null}
      <div
        className={`tools-video-media-grid${dragOver ? ' is-dragover' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const files = [...(e.dataTransfer?.files || [])];
          if (files.length) onFiles(files);
        }}
      >
        {filtered.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`tools-video-media-thumb${usedSet.has(m.id) ? ' is-used' : ' is-unused'}`}
            draggable
            title={`${m.name} — double-click to place`}
            onDragStart={(e) => {
              dragIdRef.current = m.id;
              e.dataTransfer.setData('application/x-plexity-media', m.id);
              e.dataTransfer.effectAllowed = 'copy';
            }}
            onDoubleClick={() => onPlace(m.id)}
          >
            {m.kind === 'image' || m.kind === 'video' ? (
              m.kind === 'image' ? (
                <img src={m.objectUrl} alt="" />
              ) : (
                <video src={m.objectUrl} muted preload="metadata" />
              )
            ) : (
              <span className="tools-video-media-icon" aria-hidden>
                <Music size={22} />
              </span>
            )}
            <span className="tools-video-media-kind" aria-hidden>
              {m.kind === 'video' ? <Film size={12} /> : m.kind === 'audio' ? <Music size={12} /> : <ImageIcon size={12} />}
            </span>
            <span className="tools-video-media-name">{m.name}</span>
          </button>
        ))}
        {!filtered.length ? <p className="tools-video-inspector-hint">No media matches.</p> : null}
      </div>
    </aside>
  );
}
