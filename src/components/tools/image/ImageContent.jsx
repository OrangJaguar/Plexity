import { useEffect } from 'react';
import ImageUploadZone from '@/components/tools/image/ImageUploadZone';
import ImageTopBar from '@/components/tools/image/ImageTopBar';
import ImageToolRail from '@/components/tools/image/ImageToolRail';
import ImageCanvas from '@/components/tools/image/ImageCanvas';
import ImageZoomBar from '@/components/tools/image/ImageZoomBar';
import ImageDownloadModal from '@/components/tools/image/ImageDownloadModal';
import ImageAnnotatePill from '@/components/tools/image/ImageAnnotatePill';
import ImageSelectionPill from '@/components/tools/image/ImageSelectionPill';
import ImageContextMenu from '@/components/tools/image/ImageContextMenu';
import ImageNestedEditModal from '@/components/tools/image/ImageNestedEditModal';
import PdfPrivacyNote from '@/components/tools/pdftools/PdfPrivacyNote';
import { useImageWorkspace } from '@/hooks/useImageWorkspace';
import { clampCropRect } from '@/lib/tools/image/image-crop.js';

export default function ImageContent() {
  const ws = useImageWorkspace();
  const isEmpty = ws.isEmpty;
  const annotateActive = ws.activeTool === 'annotate';

  useEffect(() => {
    if (isEmpty) return undefined;
    const onPaste = (event) => {
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;
      }
      const fileList = event.clipboardData?.files;
      if (fileList?.length) {
        event.preventDefault();
        void ws.addFiles([...fileList]);
        return;
      }
      // layer paste via clipboard API is handled by context menu / Ctrl handled below
    };
    const onKey = (e) => {
      const target = e.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;
      }
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        ws.copySelected();
      }
      if (meta && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        ws.pasteClipboard();
      }
      if (meta && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        ws.duplicateSelected();
      }
    };
    window.addEventListener('paste', onPaste);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('paste', onPaste);
      window.removeEventListener('keydown', onKey);
    };
  }, [isEmpty, ws]);

  return (
    <div className={`pdf-editor tools-image-workspace${isEmpty ? ' pdf-editor--empty' : ' pdf-editor--active'}`}>
      {!isEmpty && (
        <ImageTopBar
          title={ws.rawDoc.title}
          onTitleChange={ws.setTitle}
          dims={ws.metaLabel.dims}
          size={ws.metaLabel.size}
          canUndo={ws.canUndo}
          canRedo={ws.canRedo}
          onUndo={ws.undo}
          onRedo={ws.redo}
          comparing={ws.comparing}
          onCompareDown={() => ws.setComparing(true)}
          onCompareUp={() => ws.setComparing(false)}
          onCompareToggle={() => ws.setCompareLocked((v) => !v)}
          onAddFiles={ws.addFiles}
          accept={ws.acceptAttribute}
          onReset={ws.reset}
          onDownload={() => ws.setDownloadOpen(true)}
        />
      )}

      <div className={`pdf-editor-body${isEmpty ? '' : ' tools-image-body'}`}>
        {isEmpty ? (
          <main className="pdf-preview-area">
            <ImageUploadZone
              accept={ws.acceptAttribute}
              onFiles={ws.addFiles}
              onPaste={ws.pasteFromClipboard}
              rejections={ws.rejections}
            />
          </main>
        ) : (
          <>
            <aside className="tools-image-rail">
              <ImageToolRail workspace={ws} />
            </aside>
            <main className="tools-image-stage-col">
              {ws.warnings.length > 0 && (
                <ul className="tools-image-warnings" aria-live="polite">
                  {ws.warnings.map((w) => <li key={w}>{w}</li>)}
                </ul>
              )}
              {annotateActive && (
                <ImageAnnotatePill
                  annotateMode={ws.annotateMode}
                  drawColor={ws.drawColor}
                  setDrawColor={ws.setDrawColor}
                  drawWidth={ws.drawWidth}
                  setDrawWidth={ws.setDrawWidth}
                  textStyle={ws.textStyle}
                  setTextStyle={ws.setTextStyle}
                  redactMode={ws.redactMode}
                  setRedactMode={ws.setRedactMode}
                  redactStrength={ws.redactStrength}
                  setRedactStrength={ws.setRedactStrength}
                  selectedText={ws.selected?.type === 'text' ? ws.selected : null}
                  onPatchSelectedText={ws.patchSelectedText}
                />
              )}
              {!annotateActive && (ws.activeTool === 'home' || ws.activeTool === 'layers' || ws.activeTool === 'elements')
                && ws.selected && !ws.selected.isBackground && (
                <ImageSelectionPill
                  selected={ws.selected}
                  onDuplicate={ws.duplicateSelected}
                  onDelete={ws.deleteSelected}
                  onPatchShape={ws.patchSelectedShape}
                  onPatchText={ws.patchSelectedText}
                />
              )}
              <ImageCanvas
                composite={ws.composite}
                zoom={ws.zoom}
                setZoom={ws.setZoom}
                pan={ws.pan}
                setPan={ws.setPan}
                selected={ws.selected}
                transformEnabled={ws.activeTool === 'home' || ws.activeTool === 'layers' || ws.activeTool === 'elements'}
                onTransform={ws.updateSelectedTransform}
                onTransformCommit={ws.pushTransformCommit}
                onTransformBegin={ws.beginTransform}
                onSelectLayer={ws.selectLayer}
                doc={ws.doc}
                eraserActive={ws.activeTool === 'eraser'}
                onErasePaint={ws.paintEraser}
                onEraseCommit={ws.commitEraserStroke}
                cropDraft={ws.activeTool === 'crop' ? ws.cropDraft : null}
                cropSource={ws.selected?.originalSource || ws.selected?.source || null}
                onCropChange={(rect) => {
                  const src = ws.selected?.originalSource || ws.selected?.source;
                  if (!src) return;
                  ws.setCropDraft(clampCropRect(rect, src.width, src.height));
                }}
                cropRotation={ws.cropRotation}
                annotateActive={annotateActive}
                annotateMode={ws.annotateMode}
                onDrawStart={ws.drawStrokeStart}
                onDrawMove={ws.drawStrokeMove}
                onDrawEnd={ws.drawStrokeEnd}
                liveStroke={ws.liveStroke}
                brushPreview={ws.brushPreview}
                onPlaceText={ws.placeTextAt}
                onPlaceRedact={ws.placeRedactRect}
                fitZoomKey={ws.fitZoomKey}
                editingTextId={ws.editingTextId}
                onEditText={(id) => {
                  ws.selectLayer(id);
                  ws.setEditingTextId(id);
                }}
                onPatchText={ws.patchSelectedText}
                onFinishTextEdit={() => ws.setEditingTextId(null)}
                onContextMenu={({ clientX, clientY, layerId }) => {
                  ws.setContextMenu({ x: clientX, y: clientY, layerId });
                  if (layerId) ws.selectLayer(layerId);
                }}
              />
              <ImageZoomBar zoom={ws.zoom} setZoom={ws.setZoom} />
            </main>
          </>
        )}
      </div>

      <PdfPrivacyNote compact={!isEmpty} />

      <ImageDownloadModal
        open={ws.downloadOpen}
        onClose={() => ws.setDownloadOpen(false)}
        onDownload={ws.download}
      />

      <ImageContextMenu
        open={Boolean(ws.contextMenu)}
        x={ws.contextMenu?.x || 0}
        y={ws.contextMenu?.y || 0}
        layer={ws.contextMenu?.layerId
          ? ws.doc.layers.find((l) => l.id === ws.contextMenu.layerId)
          : ws.selected}
        onClose={() => ws.setContextMenu(null)}
        onCopy={ws.copySelected}
        onPaste={ws.pasteClipboard}
        onDuplicate={ws.duplicateSelected}
        onDelete={ws.deleteSelected}
        onLayerZ={ws.layerZ}
        onAlign={ws.alignSelected}
        onFlip={ws.flipSelected}
        onLock={ws.setSelectedLocked}
        onEdit={ws.openNestedEdit}
        onSetBackground={ws.promoteBackground}
      />

      <ImageNestedEditModal
        open={ws.nestedEditOpen}
        layer={ws.selected?.type === 'image' ? ws.selected : null}
        onClose={() => ws.setNestedEditOpen(false)}
        onSave={ws.saveNestedEdit}
      />
    </div>
  );
}
