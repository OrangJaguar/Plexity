import { useAdminConverterPlaylistWorkspace } from '@/hooks/useAdminConverterPlaylistWorkspace';
import { useAdminConverterPackage } from '@/hooks/useAdminConverterPackage';
import ConverterPlaylistItemPicker from '@/components/tools/converter/ConverterPlaylistItemPicker';
import ConverterPackagePanel from '@/components/tools/converter/ConverterPackagePanel';
import ToolCapability from '@/components/tools/shared/ToolCapability';
import { CONVERTER_PACKAGE_CREATE_CAPABILITY } from '@/lib/tools/tool-capabilities';
import { AUDIO_VIDEO_MODES } from '@/lib/tools/converter/remote-job-schema.js';

/**
 * Admin-only playlist/feed discovery panel (Plan 6).
 * Dynamically loaded — never statically in the public converter graph beyond lazy boundary.
 */
export default function ConverterPlaylistDiscoveryPanel() {
  const playlist = useAdminConverterPlaylistWorkspace();
  const pkg = useAdminConverterPackage({
    batchId: playlist.batchId,
    readyCount: playlist.readyCount,
    selectedCount: playlist.selectedCount || playlist.childJobs.length,
    device: typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
      ? 'mobile'
      : 'desktop',
  });

  return (
    <section className="tools-converter-playlist" aria-labelledby="converter-playlist-heading">
      <h2 id="converter-playlist-heading">Playlist & feed discovery</h2>
      <p className="tools-converter-url-privacy">
        Admin only: playlist, channel, and feed discovery runs on temporary private servers.
        Selected items are processed securely and deleted automatically. This is not a public
        downloader. Local file conversion remains on this device.
      </p>

      <label htmlFor="converter-playlist-url" className="tools-converter-url-paste-label">
        Playlist, channel, or feed URL
      </label>
      <input
        id="converter-playlist-url"
        className="tools-converter-url-paste"
        type="url"
        value={playlist.url}
        onChange={(e) => playlist.setUrl(e.target.value)}
        placeholder="https://www.youtube.com/playlist?list=…"
        disabled={playlist.busy}
      />

      <fieldset className="tools-converter-url-acks" disabled={playlist.busy}>
        <legend>Acknowledgments</legend>
        <label className="tools-converter-url-ack">
          <input
            type="checkbox"
            checked={playlist.acks.sourceRights}
            onChange={(e) => playlist.setAck('sourceRights', e.target.checked)}
          />
          I am authorized to process these sources.
        </label>
        <label className="tools-converter-url-ack">
          <input
            type="checkbox"
            checked={playlist.acks.youtubeTermsRisk}
            onChange={(e) => playlist.setAck('youtubeTermsRisk', e.target.checked)}
          />
          I understand YouTube/feed extraction is admin-only and carries Terms risk.
        </label>
        {(playlist.includeThumbnails || playlist.includeSubtitles) && (
          <label className="tools-converter-url-ack">
            <input
              type="checkbox"
              checked={playlist.acks.sidecarDisclosure}
              onChange={(e) => playlist.setAck('sidecarDisclosure', e.target.checked)}
            />
            Include provider-supplied thumbnails/subtitles as temporary sidecars when available.
          </label>
        )}
      </fieldset>

      <div className="tools-converter-url-actions">
        <button
          type="button"
          className="tools-converter-btn tools-converter-btn-primary"
          disabled={playlist.busy || !playlist.url.trim()}
          onClick={() => void playlist.startDiscovery()}
        >
          Start discovery
        </button>
        {playlist.discovery && !['cancelled', 'failed'].includes(String(playlist.discovery.status)) && (
          <button
            type="button"
            className="tools-converter-btn"
            disabled={playlist.busy}
            onClick={() => void playlist.cancelDiscovery()}
          >
            Cancel discovery
          </button>
        )}
      </div>

      {playlist.statusMessage && (
        <p className="tools-converter-live" aria-live="polite">{playlist.statusMessage}</p>
      )}
      {playlist.error && (
        <p className="tools-converter-error" role="alert">{playlist.error}</p>
      )}

      {playlist.discovery && (
        <p className="tools-converter-muted">
          Discovery {playlist.discovery.status}
          {playlist.discovery.itemCount != null ? ` · ${playlist.discovery.itemCount} items` : ''}
          {playlist.discovery.truncated ? ' · truncated at cap' : ''}
        </p>
      )}

      {playlist.allItems.length > 0 && (
        <>
          <ConverterPlaylistItemPicker
            items={playlist.items}
            selectedCount={playlist.selectedCount}
            query={playlist.query}
            onQueryChange={playlist.setQuery}
            onSelectAll={playlist.selectAll}
            onToggleItem={playlist.toggleItem}
            disabled={playlist.busy}
          />

          <div className="tools-converter-playlist-settings">
            <h3>Batch settings</h3>
            <label>
              Mode
              <select
                value={playlist.mode}
                onChange={(e) => playlist.setMode(/** @type {'audio'|'video'} */ (e.target.value))}
                disabled={playlist.busy}
              >
                {Object.entries(AUDIO_VIDEO_MODES).map(([id, meta]) => (
                  <option key={id} value={id}>{meta.label}</option>
                ))}
              </select>
            </label>
            <label>
              Filename template
              <input
                type="text"
                value={playlist.numberingPolicy}
                onChange={(e) => playlist.setNumberingPolicy(e.target.value)}
                disabled={playlist.busy}
              />
            </label>
            <label className="tools-converter-url-ack">
              <input
                type="checkbox"
                checked={playlist.includeThumbnails}
                onChange={(e) => playlist.setIncludeThumbnails(e.target.checked)}
              />
              Include thumbnails
            </label>
            <label className="tools-converter-url-ack">
              <input
                type="checkbox"
                checked={playlist.includeSubtitles}
                onChange={(e) => playlist.setIncludeSubtitles(e.target.checked)}
              />
              Include subtitles (provider-supplied only)
            </label>
            <label className="tools-converter-url-ack">
              <input
                type="checkbox"
                checked={playlist.includeMetadata}
                onChange={(e) => playlist.setIncludeMetadata(e.target.checked)}
              />
              Include metadata sidecars
            </label>
            <button
              type="button"
              className="tools-converter-btn tools-converter-btn-primary"
              disabled={playlist.busy || playlist.selectedCount === 0}
              onClick={() => void playlist.confirmBatch()}
            >
              Process selected ({playlist.selectedCount})
            </button>
          </div>
        </>
      )}

      {playlist.batchId && (
        <div className="tools-converter-remote-queue">
          <h3>Batch jobs</h3>
          <p className="tools-converter-muted">
            Ready {playlist.readyCount} · Failed {playlist.failedCount} · Total {playlist.childJobs.length}
            {playlist.batchPaused ? ' · paused' : ''}
          </p>
          <div className="tools-converter-url-actions">
            {!playlist.batchPaused ? (
              <button type="button" className="tools-converter-btn" onClick={() => void playlist.pauseBatch()}>
                Pause
              </button>
            ) : (
              <button type="button" className="tools-converter-btn" onClick={() => void playlist.resumeBatch()}>
                Resume
              </button>
            )}
            <button type="button" className="tools-converter-btn" onClick={() => void playlist.retryFailed()}>
              Retry failed
            </button>
          </div>
          <ul className="tools-converter-remote-job-list">
            {playlist.childJobs.map((job) => (
              <li key={String(job.jobId)}>
                {job.redactedSourceLabel || job.jobId}
                {' '}
                ·
                {job.status}
                {job.errorCode ? ` · ${job.errorCode}` : ''}
              </li>
            ))}
          </ul>

          <ToolCapability name={CONVERTER_PACKAGE_CREATE_CAPABILITY}>
            <ConverterPackagePanel
              packageHook={pkg}
              readyCount={playlist.readyCount}
              selectedCount={playlist.childJobs.length}
            />
          </ToolCapability>
        </div>
      )}
    </section>
  );
}
