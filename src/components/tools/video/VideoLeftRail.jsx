import VideoMediaBin from '@/components/tools/video/VideoMediaBin';
import VideoCaptionsPanel from '@/components/tools/video/VideoCaptionsPanel';
import VideoVoRecorder from '@/components/tools/video/VideoVoRecorder';
import { VIDEO_FILTER_PRESETS } from '@/lib/tools/video/video-filters.js';
import { VIDEO_TEXT_PRESETS } from '@/lib/tools/video/video-text.js';
import { VIDEO_TRANSITION_TYPES } from '@/lib/tools/video/video-transitions.js';
import { listVideoStickers, stickerDataUrl } from '@/lib/tools/video/video-stickers.js';

const TABS = [
  { id: 'media', label: 'Media' },
  { id: 'audio', label: 'Audio' },
  { id: 'text', label: 'Text' },
  { id: 'captions', label: 'Captions' },
  { id: 'stickers', label: 'Stickers' },
  { id: 'transitions', label: 'Transitions' },
  { id: 'filters', label: 'Filters' },
];

/**
 * @param {object} props
 */
export default function VideoLeftRail({
  railTab,
  onRailTab,
  project,
  accept,
  onFiles,
  onPlace,
  onPlaceOverlay,
  importing,
  rejections,
  empty,
  onAddText,
  onAddSticker,
  onApplyTransition,
  onApplyFilterPreset,
  hasSelection,
  voStatus,
  voLevel,
  voError,
  onVoStart,
  onVoStop,
  onVoCancel,
  usedMediaIds,
  onAddCaption,
  onImportSrt,
  onExportSrt,
  onDictate,
  dictateSupported,
  dictating,
}) {
  const audioMedia = project.media.filter((m) => m.kind === 'audio');
  const imageMedia = project.media.filter((m) => m.kind === 'image');

  if (empty) {
    return (
      <VideoMediaBin
        empty
        media={project.media}
        accept={accept}
        onFiles={onFiles}
        onPlace={onPlace}
        importing={importing}
        rejections={rejections}
      />
    );
  }

  return (
    <aside className="tools-video-left-rail">
      <div className="tools-video-rail-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={railTab === t.id}
            className={`tools-video-rail-tab${railTab === t.id ? ' is-active' : ''}`}
            onClick={() => onRailTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="tools-video-rail-panel">
        {railTab === 'media' ? (
          <VideoMediaBin
            media={project.media}
            accept={accept}
            onFiles={onFiles}
            onPlace={onPlace}
            importing={importing}
            rejections={rejections}
            empty={false}
            usedMediaIds={usedMediaIds}
          />
        ) : null}

        {railTab === 'audio' ? (
          <div className="tools-video-rail-section">
            <VideoVoRecorder
              status={voStatus}
              level={voLevel}
              error={voError}
              onStart={onVoStart}
              onStop={onVoStop}
              onCancel={onVoCancel}
            />
            <h3 className="tools-video-rail-subhead">Audio files</h3>
            <div className="tools-video-media-grid">
              {audioMedia.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="tools-video-media-thumb"
                  onDoubleClick={() => onPlace(m.id)}
                >
                  <span className="tools-video-media-name">{m.name}</span>
                </button>
              ))}
              {!audioMedia.length ? <p className="tools-video-inspector-hint">Import audio or record VO.</p> : null}
            </div>
          </div>
        ) : null}

        {railTab === 'text' ? (
          <div className="tools-video-rail-section">
            <button type="button" className="pdf-btn pdf-btn--secondary pdf-btn--sm" onClick={() => onAddText('Text')}>
              Add text
            </button>
            <div className="tools-video-preset-list">
              {VIDEO_TEXT_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="tools-video-preset-btn"
                  onClick={() => onAddText(p.text, p.style)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {railTab === 'captions' ? (
          <VideoCaptionsPanel
            onAddCue={onAddCaption}
            onImportSrt={onImportSrt}
            onExportSrt={onExportSrt}
            onDictate={onDictate}
            dictateSupported={dictateSupported}
            dictating={dictating}
          />
        ) : null}

        {railTab === 'stickers' ? (
          <div className="tools-video-rail-section">
            <div className="tools-video-sticker-grid">
              {listVideoStickers().map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className="tools-video-sticker-btn"
                  title={g.label}
                  onClick={() => void onAddSticker(g.id)}
                >
                  <img src={stickerDataUrl(g.id)} alt="" />
                </button>
              ))}
            </div>
            {imageMedia.length ? (
              <>
                <h3 className="tools-video-rail-subhead">Images as overlay</h3>
                <div className="tools-video-media-grid">
                  {imageMedia.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className="tools-video-media-thumb"
                      onDoubleClick={() => onPlaceOverlay(m.id)}
                    >
                      <img src={m.objectUrl} alt="" />
                      <span className="tools-video-media-name">{m.name}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        {railTab === 'transitions' ? (
          <div className="tools-video-rail-section">
            <p className="tools-video-inspector-hint">
              {hasSelection ? 'Apply to selected clip’s outgoing edge.' : 'Select a video clip first.'}
            </p>
            <div className="tools-video-preset-list">
              {VIDEO_TRANSITION_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="tools-video-preset-btn"
                  disabled={!hasSelection}
                  onClick={() => onApplyTransition({ type: t.id })}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {railTab === 'filters' ? (
          <div className="tools-video-rail-section">
            <p className="tools-video-inspector-hint">
              {hasSelection ? 'Apply to selected clip.' : 'Select a media clip first.'}
            </p>
            <div className="tools-video-preset-list">
              {VIDEO_FILTER_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="tools-video-preset-btn"
                  disabled={!hasSelection}
                  onClick={() => onApplyFilterPreset(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
