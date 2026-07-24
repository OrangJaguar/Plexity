import { useEffect } from 'react';
import PdfPrivacyNote from '@/components/tools/pdftools/PdfPrivacyNote';
import VideoExportModal from '@/components/tools/video/VideoExportModal';
import VideoInspector from '@/components/tools/video/VideoInspector';
import VideoLeftRail from '@/components/tools/video/VideoLeftRail';
import VideoPlayer from '@/components/tools/video/VideoPlayer';
import VideoResumeBanner from '@/components/tools/video/VideoResumeBanner';
import VideoTimeline from '@/components/tools/video/VideoTimeline';
import VideoTopBar from '@/components/tools/video/VideoTopBar';
import VideoUploadZone from '@/components/tools/video/VideoUploadZone';
import { useVideoWorkspace } from '@/hooks/useVideoWorkspace';
import { useUiStore } from '@/store/uiStore';

export default function VideoContent() {
  const ws = useVideoWorkspace();
  const { isEmpty, project } = ws;
  const setCollapsed = useUiStore((s) => s.setToolsChromeCollapsed);

  useEffect(() => {
    if (!isEmpty) setCollapsed(true);
  }, [isEmpty, setCollapsed]);

  useEffect(() => {
    if (isEmpty && !ws.resumeOffer) return undefined;
    const onKey = (e) => {
      const target = e.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return;
      }
      const meta = e.metaKey || e.ctrlKey;
      if (e.code === 'Space') {
        e.preventDefault();
        ws.togglePlay();
        return;
      }
      if (meta && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        ws.undo();
        return;
      }
      if ((meta && e.key.toLowerCase() === 'z' && e.shiftKey) || (meta && e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        ws.redo();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        ws.removeSelected();
        return;
      }
      if (meta && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        ws.duplicateSelected();
        return;
      }
      if (meta && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        ws.copyStyleFromSelected();
        return;
      }
      if (meta && e.shiftKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        ws.pasteStyleToSelected();
        return;
      }
      if (e.key.toLowerCase() === 'b' && !meta) {
        e.preventDefault();
        ws.splitAtPlayhead();
        return;
      }
      if (e.key.toLowerCase() === 't' && !meta) {
        e.preventDefault();
        ws.addText('Text');
        return;
      }
      if (e.key.toLowerCase() === 'c' && !meta) {
        e.preventDefault();
        ws.addCaption('Caption');
        return;
      }
      if (e.key.toLowerCase() === 'm' && !meta) {
        e.preventDefault();
        ws.placeMarker();
        return;
      }
      if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        ws.setPlaying(false);
        ws.setPlayhead(Math.max(0, project.playheadMs - (e.shiftKey ? 1000 : 100)), { stop: true });
        return;
      }
      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        ws.togglePlay();
        return;
      }
      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        ws.setPlaying(false);
        ws.setPlayhead(project.playheadMs + (e.shiftKey ? 1000 : 100), { stop: true });
        return;
      }
      const step = e.shiftKey ? 10 : 1;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        ws.nudgeSelected(-step, 0);
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        ws.nudgeSelected(step, 0);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        ws.nudgeSelected(0, -step);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        ws.nudgeSelected(0, step);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isEmpty, ws, project.playheadMs]);

  const leftRailProps = {
    railTab: ws.railTab,
    onRailTab: ws.setRailTab,
    project,
    accept: ws.acceptAttribute,
    onPlace: ws.placeMedia,
    onPlaceOverlay: ws.placeOverlayImage,
    importing: ws.importing,
    rejections: ws.rejections,
    onAddText: ws.addText,
    onAddSticker: ws.addSticker,
    onApplyTransition: ws.updateTransition,
    onApplyFilterPreset: ws.applyFilterPreset,
    voStatus: ws.voStatus,
    voLevel: ws.voLevel,
    voError: ws.voError,
    onVoStart: ws.startVo,
    onVoStop: ws.stopVo,
    onVoCancel: ws.cancelVo,
    usedMediaIds: ws.usedMediaIds,
    onAddCaption: () => ws.addCaption('Caption'),
    onImportSrt: ws.importSrt,
    onExportSrt: ws.exportSrt,
    onDictate: ws.dictateCaption,
    dictateSupported: ws.dictateSupported,
    dictating: ws.dictating,
  };

  if (isEmpty) {
    return (
      <div className="pdf-editor tools-video-workspace tools-video-workspace--empty pdf-editor--empty">
        {ws.resumeOffer ? (
          <VideoResumeBanner
            savedAt={ws.resumeOffer.savedAt}
            onResume={ws.resumeProject}
            onDiscard={ws.discardResume}
          />
        ) : null}
        <div className="pdf-editor-body">
          <main className="pdf-preview-area">
            <VideoUploadZone
              accept={ws.acceptAttribute}
              onFiles={(files) => void ws.addFiles(files)}
              loading={ws.importing}
              rejections={ws.rejections}
            />
          </main>
        </div>
        <PdfPrivacyNote />
        <VideoExportModal
          project={project}
          open={ws.exportOpen}
          onClose={() => ws.setExportOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="tools-video-workspace tools-video-workspace--active">
      {ws.resumeOffer ? (
        <VideoResumeBanner
          savedAt={ws.resumeOffer.savedAt}
          onResume={ws.resumeProject}
          onDiscard={ws.discardResume}
        />
      ) : null}

      <VideoTopBar
        title={project.title}
        onTitleChange={ws.setTitle}
        aspectId={project.aspectId}
        onAspectChange={ws.setAspect}
        canUndo={ws.canUndo}
        canRedo={ws.canRedo}
        onUndo={ws.undo}
        onRedo={ws.redo}
        onAddFiles={(files) => void ws.addFiles(files)}
        accept={ws.acceptAttribute}
        onReset={ws.reset}
        onExport={() => ws.setExportOpen(true)}
        disabledExport={project.durationMs <= 0}
      />

      <div className="tools-video-main">
        <VideoLeftRail
          {...leftRailProps}
          empty={false}
          onFiles={(files) => void ws.addFiles(files, { placeOnTimeline: false })}
          onPlace={(id) => ws.placeMedia(id)}
          onPlaceOverlay={(id) => ws.placeOverlayImage(id)}
          hasSelection={Boolean(ws.selectedClip)}
        />
        <VideoPlayer
          project={project}
          playing={ws.playing}
          onTogglePlay={ws.togglePlay}
          onSeek={ws.setPlayhead}
          onTransformLive={ws.applyTransformLive}
          onGestureBegin={ws.beginGesture}
          onGestureEnd={ws.endGesture}
          selectedClipId={project.selectedClipId}
          showSafeMargins={ws.showSafeMargins}
        />
        <VideoInspector
          project={project}
          warnings={ws.warnings}
          onAspectChange={ws.setAspect}
          onVolume={ws.setVolume}
          onOpacity={ws.updateOpacity}
          onTransform={ws.updateTransform}
          onText={ws.updateText}
          onFilter={(presetId) => ws.applyFilterPreset(presetId)}
          onTransition={ws.updateTransition}
          onUnlink={ws.unlinkSelected}
          onDetach={ws.detachSelected}
          onDelete={ws.removeSelected}
          onRippleDelete={ws.rippleRemoveSelected}
          onDeleteMarker={ws.deleteMarker}
          onReplaceMedia={ws.replaceSelectedMedia}
          onSpeed={ws.setSpeed}
          onFreeze={ws.setFreeze}
          onReverse={ws.setReverse}
          onFades={ws.setFades}
          onAudioRole={ws.setAudioRole}
          onDuck={ws.updateDuck}
          showSafeMargins={ws.showSafeMargins}
          onToggleSafeMargins={ws.toggleSafeMargins}
        />
      </div>
      <VideoTimeline
        project={project}
        snapEnabled={ws.snapEnabled}
        onSnapToggle={() => ws.setSnapEnabled((v) => !v)}
        pxPerSecond={ws.pxPerSecond}
        onZoom={ws.setPxPerSecond}
        onSelect={ws.selectClip}
        onPlayhead={ws.setPlayhead}
        onSplit={ws.splitAtPlayhead}
        onDelete={ws.removeSelected}
        onRippleDelete={ws.rippleRemoveSelected}
        onDuplicate={ws.duplicateSelected}
        onDetach={ws.detachSelected}
        onMoveLive={ws.applyClipMoveLive}
        onTrimLive={ws.applyClipTrimLive}
        onGestureBegin={ws.beginGesture}
        onGestureEnd={ws.endGesture}
        onTrackPatch={ws.updateTrack}
        onAddTrack={ws.createTrack}
        onPlaceMedia={ws.placeMedia}
        onAddMarker={ws.placeMarker}
        onTrackSolo={ws.toggleTrackSolo}
      />
      <div className="tools-video-footer">
        <PdfPrivacyNote compact />
      </div>

      <VideoExportModal
        project={project}
        open={ws.exportOpen}
        onClose={() => ws.setExportOpen(false)}
      />
    </div>
  );
}
