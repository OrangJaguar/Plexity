import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Download, LayoutGrid, Maximize2, RotateCcw, Search, Upload,
} from 'lucide-react';
import { usePdfEditor } from '@/hooks/usePdfEditor';
import { buildPdfFromVirtualPages } from '@/lib/tools/pdftools/pdf-operations';
import { downloadPdf } from '@/lib/tools/pdftools/pdf-download';
import { ensurePdfJs } from '@/lib/tools/pdftools/pdfjs-setup';
import { getPageCount } from '@/lib/tools/pdftools/pdf-render';
import PdfUploadZone from '@/components/tools/pdftools/PdfUploadZone';
import PdfPageStrip from '@/components/tools/pdftools/PdfPageStrip';
import PdfExpandedView from '@/components/tools/pdftools/PdfExpandedView';
import PdfSummaryPanel from '@/components/tools/pdftools/PdfSummaryPanel';
import PdfResultPanel from '@/components/tools/pdftools/PdfResultPanel';
import PdfTextSearch from '@/components/tools/pdftools/PdfTextSearch';
import PdfPrivacyNote from '@/components/tools/pdftools/PdfPrivacyNote';

function sanitizeFilename(name) {
  const base = (name || 'document').replace(/\.pdf$/i, '').replace(/[^\w\s.-]/g, '').trim() || 'document';
  return `${base}.pdf`;
}

export default function PdfEditor() {
  const ws = usePdfEditor();
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrollToKey, setScrollToKey] = useState(null);
  const [exportName, setExportName] = useState('document');
  const [partNames, setPartNames] = useState(/** @type {Record<number, string>} */({}));
  const hasFiles = ws.files.length > 0;

  useEffect(() => {
    void ensurePdfJs();
  }, []);

  const buildOpts = useMemo(() => ({
    rotations: ws.rotationsMap,
    annotationsByKey: ws.annotations,
    layoutsByKey: ws.pageLayouts,
  }), [ws.rotationsMap, ws.annotations, ws.pageLayouts]);

  useEffect(() => {
    if (ws.files.length === 1) {
      setExportName(ws.files[0].name.replace(/\.pdf$/i, ''));
    } else if (ws.files.length > 1) {
      setExportName('combined-document');
    }
  }, [ws.files]);

  useEffect(() => {
    setPartNames((prev) => {
      const next = { ...prev };
      ws.splitPreview.forEach((_, i) => {
        if (!next[i]) next[i] = `part-${i + 1}`;
      });
      return next;
    });
  }, [ws.splitPreview.length]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f' && hasFiles) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasFiles]);

  const handleExtract = useCallback(async (key) => {
    const ref = ws.virtualPageRefs.find((r) => r.key === key);
    if (!ref) return;
    ws.setProcessing(true);
    ws.setError(null);
    try {
      const data = await buildPdfFromVirtualPages([ref], ws.fileDataMap, buildOpts);
      downloadPdf(data, sanitizeFilename(`${exportName}-page`));
    } catch (err) {
      ws.setError(err instanceof Error ? err.message : 'Extract failed.');
    } finally {
      ws.setProcessing(false);
    }
  }, [ws, buildOpts, exportName]);

  const handleDownloadMerged = useCallback(async () => {
    if (!ws.virtualPageRefs.length) return;
    ws.setProcessing(true);
    ws.setError(null);
    try {
      const data = await buildPdfFromVirtualPages(ws.virtualPageRefs, ws.fileDataMap, buildOpts);
      const pageCount = await getPageCount(data, 'merged-export');
      ws.setResult({
        type: 'single',
        name: sanitizeFilename(exportName),
        data,
        pageCount,
      });
    } catch (err) {
      ws.setError(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      ws.setProcessing(false);
    }
  }, [ws, buildOpts, exportName]);

  const handleDownloadPart = useCallback(async (partIndex) => {
    const range = ws.splitPreview[partIndex];
    if (!range) return;
    ws.setProcessing(true);
    ws.setError(null);
    try {
      const slice = ws.virtualPageRefs.slice(range.start - 1, range.end);
      const data = await buildPdfFromVirtualPages(slice, ws.fileDataMap, buildOpts);
      const partLabel = partNames[partIndex] || `part-${partIndex + 1}`;
      downloadPdf(data, sanitizeFilename(partLabel));
    } catch (err) {
      ws.setError(err instanceof Error ? err.message : 'Download failed.');
    } finally {
      ws.setProcessing(false);
    }
  }, [ws, buildOpts, partNames]);

  const openExpanded = useCallback((key) => {
    ws.setActivePageKey(key);
    setScrollToKey(key);
    ws.setViewMode('expanded');
  }, [ws]);

  const jumpToPage = useCallback((key) => {
    openExpanded(key);
  }, [openExpanded]);

  return (
    <div className={`pdf-editor${hasFiles ? ' pdf-editor--active' : ' pdf-editor--empty'}`}>
      <header className="pdf-editor-header">
        <h1 className="pdf-editor-title">PDF</h1>
        <p className="pdf-editor-subtitle">Merge, split, rearrange, and annotate PDFs</p>
        {hasFiles && (
          <div className="pdf-editor-header-actions">
            <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" onClick={() => setSearchOpen(true)}>
              <Search size={14} /> Search
            </button>
            <label className="pdf-btn pdf-btn--secondary pdf-btn--file pdf-btn--sm">
              <Upload size={14} /> Add files
              <input
                type="file"
                accept="application/pdf,.pdf"
                multiple
                hidden
                onChange={(e) => {
                  if (!e.target.files?.length) return;
                  void ws.addFiles([...e.target.files]);
                  e.target.value = '';
                }}
              />
            </label>
            <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" onClick={ws.reset}>
              <RotateCcw size={14} /> Reset
            </button>
            {ws.result && (
              <button
                type="button"
                className="pdf-btn pdf-btn--primary pdf-btn--sm"
                onClick={() => {
                  if (ws.result?.type === 'single') downloadPdf(ws.result.data, ws.result.name);
                }}
              >
                <Download size={14} /> Download
              </button>
            )}
          </div>
        )}
      </header>

      {hasFiles && !ws.result && (
        <div className="pdf-editor-toolbar">
          <div className="pdf-view-toggle">
            <button
              type="button"
              className={ws.viewMode === 'grid' ? 'is-active' : ''}
              onClick={() => ws.setViewMode('grid')}
            >
              <LayoutGrid size={14} /> Thumbnails
            </button>
            <button
              type="button"
              className={ws.viewMode === 'expanded' ? 'is-active' : ''}
              onClick={() => ws.setViewMode('expanded')}
            >
              <Maximize2 size={14} /> Large view
            </button>
          </div>
          <p className="pdf-editor-toolbar-hint">
            {ws.viewMode === 'grid'
              ? 'Drag pages to reorder · Click scissors between pages to split · Editing available in large view'
              : 'Annotate the active page with the toolbar below · Scroll to browse all pages'}
          </p>
        </div>
      )}

      <div className={`pdf-editor-body${hasFiles && !ws.result ? ' pdf-editor-body--split' : ''}`}>
        <main className="pdf-preview-area">
          {ws.result ? (
            <PdfResultPanel
              result={ws.result}
              onStartOver={ws.reset}
            />
          ) : !hasFiles ? (
            <PdfUploadZone
              onFiles={(f) => void ws.addFiles(f)}
              multiFile
              hint="Upload one or more PDF files"
              loading={ws.loading}
              fullWidth
            />
          ) : ws.viewMode === 'expanded' ? (
            <PdfExpandedView
              pageOrder={ws.pageOrder}
              pages={ws.pages}
              fileMap={ws.fileMap}
              activePageKey={ws.activePageKey}
              scrollToKey={scrollToKey}
              onActiveChange={ws.setActivePageKey}
              onScrollDone={() => setScrollToKey(null)}
              annotations={ws.annotations}
              onAnnotationsChange={(key, anns) => ws.setAnnotations((prev) => ({ ...prev, [key]: anns }))}
              onPageLayout={ws.setPageLayout}
            />
          ) : (
            <PdfPageStrip
              pages={ws.pages}
              pageOrder={ws.pageOrder}
              splitBreaks={ws.splitAfterKeys}
              onToggleSplit={ws.toggleSplitAfter}
              onReorder={ws.movePage}
              onDelete={ws.deletePage}
              onExtract={handleExtract}
              onRotate={ws.rotatePage}
              onOpenExpanded={openExpanded}
              onRetryThumb={ws.retryThumb}
              groupByFile={ws.files.length > 1 ? ws.fileGroups : undefined}
            />
          )}
          {ws.error && !ws.result && <p className="pdf-preview-error">{ws.error}</p>}
        </main>

        {hasFiles && !ws.result && (
          <PdfSummaryPanel
            files={ws.files}
            orderedFiles={ws.orderedFiles}
            totalPages={ws.totalPages}
            splitPreview={ws.splitPreview}
            splitAfterKeys={ws.splitAfterKeys}
            processing={ws.processing}
            error={ws.error}
            exportName={exportName}
            onExportNameChange={setExportName}
            partNames={partNames}
            onPartNameChange={(i, name) => setPartNames((prev) => ({ ...prev, [i]: name }))}
            onRemoveFile={ws.removeFile}
            onMoveFile={ws.moveFile}
            onDownloadMerged={handleDownloadMerged}
            onDownloadPart={handleDownloadPart}
          />
        )}
      </div>

      <PdfPrivacyNote />

      <PdfTextSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        pageOrder={ws.pageOrder}
        pages={ws.pages}
        fileMap={ws.fileMap}
        onJumpToPage={jumpToPage}
      />
    </div>
  );
}
