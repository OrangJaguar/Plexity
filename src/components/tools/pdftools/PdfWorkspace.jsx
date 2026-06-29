import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { downloadPdf, downloadMultiplePdfs } from '@/lib/tools/pdftools/pdf-download';
import {
  ArrowLeft, Upload, RotateCcw, Download,
} from 'lucide-react';
import { usePdfWorkspace } from '@/hooks/usePdfWorkspace';
import { getPdfTool } from '@/lib/tools/pdftools/constants';
import PdfUploadZone from '@/components/tools/pdftools/PdfUploadZone';
import PdfPageGrid from '@/components/tools/pdftools/PdfPageGrid';
import PdfSidePanel, { computeSplitPreview } from '@/components/tools/pdftools/PdfSidePanel';
import PdfResultPanel from '@/components/tools/pdftools/PdfResultPanel';
import PdfEditCanvas from '@/components/tools/pdftools/PdfEditCanvas';
import PdfPrivacyNote from '@/components/tools/pdftools/PdfPrivacyNote';
import { parsePageKey } from '@/lib/tools/pdftools/pdf-session';
import {
  mergePdfs, reorderPages, removePages, extractPages, applyRotations,
  splitByRanges, applyAnnotations,
} from '@/lib/tools/pdftools/pdf-operations';
import { outputFilename } from '@/lib/tools/pdftools/pdf-download';
import { getPageCount } from '@/lib/tools/pdftools/pdf-render';
import { PDF_ROUTE } from '@/lib/tools/tool-routes';

/**
 * @param {{ toolId: import('@/lib/tools/pdftools/constants').PdfToolId }} props
 */
export default function PdfWorkspace({ toolId }) {
  const navigate = useNavigate();
  const tool = getPdfTool(toolId);
  const ws = usePdfWorkspace(toolId);

  const [splitMode, setSplitMode] = useState('everyN');
  const [splitEveryN, setSplitEveryN] = useState(5);
  const [splitRangesText, setSplitRangesText] = useState('');
  const [annotations, setAnnotations] = useState({});

  const hasFiles = ws.files.length > 0;
  const isEdit = toolId === 'edit';

  const splitPreview = useMemo(() => {
    if (toolId !== 'split' || !hasFiles) return [];
    return computeSplitPreview(
      ws.totalPages, splitMode, splitEveryN, splitRangesText, ws.selected, ws.pageOrder,
    ) ?? [];
  }, [toolId, hasFiles, ws.totalPages, splitMode, splitEveryN, splitRangesText, ws.selected, ws.pageOrder]);

  const fileGroups = useMemo(() => {
    if (toolId !== 'merge') return null;
    return ws.orderedFiles.map((file) => ({
      fileId: file.id,
      name: file.name,
      pageKeys: ws.pageOrder.filter((k) => k.startsWith(`${file.id}:`)),
    }));
  }, [toolId, ws.orderedFiles, ws.pageOrder]);

  const selectionMode = useMemo(() => {
    if (toolId === 'remove') return 'remove';
    if (toolId === 'extract' || toolId === 'split') return 'extract';
    if (toolId === 'rotate') return 'select';
    return 'none';
  }, [toolId]);

  const runPrimary = useCallback(async () => {
    ws.setError(null);
    ws.setProcessing(true);
    try {
      if (toolId === 'merge') {
        if (ws.files.length < 2) throw new Error('Add at least two PDFs to merge.');
        const ordered = ws.orderedFiles.map((f) => ({ data: f.data }));
        const data = await mergePdfs(ordered);
        const pageCount = await getPageCount(data);
        ws.setResult({
          type: 'single',
          name: outputFilename('merged', 'merged'),
          data,
          pageCount,
        });
      }

      if (toolId === 'split') {
        if (!splitPreview?.length) throw new Error('Configure a valid split before continuing.');
        const file = ws.files[0];
        const parts = await splitByRanges(file.data, splitPreview);
        const withCounts = await Promise.all(parts.map(async (p) => ({
          ...p,
          pageCount: await getPageCount(p.data),
        })));
        ws.setResult({ type: 'multi', files: withCounts });
      }

      if (toolId === 'rearrange') {
        const file = ws.files[0];
        const order = ws.pageOrder.map((k) => parsePageKey(k).pageIndex);
        const rotMap = {};
        ws.pages.forEach((p) => {
          if (p.rotation) rotMap[p.pageIndex] = p.rotation;
        });
        const data = await reorderPages(file.data, order, rotMap);
        ws.setResult({
          type: 'single',
          name: outputFilename(file.name, 'reordered'),
          data,
          pageCount: order.length,
        });
      }

      if (toolId === 'remove') {
        if (!ws.selected.size) throw new Error('Select at least one page to remove.');
        const file = ws.files[0];
        const indices = [...ws.selected].map((k) => parsePageKey(k).pageIndex);
        const data = await removePages(file.data, indices);
        const pageCount = await getPageCount(data);
        ws.setResult({
          type: 'single',
          name: outputFilename(file.name, 'cleaned'),
          data,
          pageCount,
        });
      }

      if (toolId === 'extract') {
        if (!ws.selected.size) throw new Error('Select at least one page to extract.');
        const file = ws.files[0];
        const indices = [...ws.selected].map((k) => parsePageKey(k).pageIndex);
        const data = await extractPages(file.data, indices);
        ws.setResult({
          type: 'single',
          name: outputFilename(file.name, 'extracted'),
          data,
          pageCount: indices.length,
        });
      }

      if (toolId === 'rotate') {
        const file = ws.files[0];
        const rotMap = {};
        const keys = ws.selected.size ? [...ws.selected] : ws.pageOrder;
        keys.forEach((k) => {
          const page = ws.pages.find((p) => p.key === k);
          if (page?.rotation) rotMap[page.pageIndex] = page.rotation;
        });
        const data = await applyRotations(file.data, rotMap);
        ws.setResult({
          type: 'single',
          name: outputFilename(file.name, 'rotated'),
          data,
          pageCount: file.pageCount,
        });
      }

      if (toolId === 'edit') {
        const file = ws.files[0];
        const data = await applyAnnotations(file.data, annotations);
        ws.setResult({
          type: 'single',
          name: outputFilename(file.name, 'edited'),
          data,
          pageCount: file.pageCount,
        });
      }
    } catch (err) {
      ws.setError(err instanceof Error ? err.message : 'Processing failed.');
    } finally {
      ws.setProcessing(false);
    }
  }, [toolId, ws, splitPreview, annotations]);

  const primaryDisabled = useMemo(() => {
    if (!hasFiles) return true;
    if (toolId === 'merge' && ws.files.length < 2) return true;
    if (toolId === 'remove' && !ws.selected.size) return true;
    if (toolId === 'extract' && !ws.selected.size) return true;
    if (toolId === 'split' && !splitPreview?.length) return true;
    return false;
  }, [hasFiles, toolId, ws.files.length, ws.selected.size, splitPreview]);

  const primaryLabel = useMemo(() => {
    const map = {
      merge: 'Merge PDF',
      split: 'Split PDF',
      rearrange: 'Save reordered PDF',
      remove: 'Create new PDF',
      extract: 'Extract pages',
      rotate: 'Save rotated PDF',
      edit: 'Save edited PDF',
    };
    return map[toolId] ?? 'Process';
  }, [toolId]);

  if (!tool) {
    return (
      <div className="pdf-workspace">
        <p>Unknown tool.</p>
        <button type="button" className="pdf-btn" onClick={() => navigate(PDF_ROUTE)}>
          Back to PDF tools
        </button>
      </div>
    );
  }

  return (
    <div className="pdf-workspace">
      <header className="pdf-action-bar">
        <div className="pdf-action-bar-left">
          <button type="button" className="pdf-btn pdf-btn--ghost" onClick={() => navigate(PDF_ROUTE)}>
            <ArrowLeft size={16} /> Tools
          </button>
          <h2>{tool.name}</h2>
          {toolId === 'edit' && <span className="pdf-action-sub">{tool.description.split('—')[0]}</span>}
        </div>
        <div className="pdf-action-bar-right">
          {hasFiles && (
            <>
              <label className="pdf-btn pdf-btn--secondary pdf-btn--file">
                <Upload size={14} /> {tool.multiFile ? 'Add files' : 'Replace'}
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple={tool.multiFile}
                  hidden
                  onChange={(e) => {
                    if (!e.target.files?.length) return;
                    if (!tool.multiFile) ws.reset();
                    void ws.addFiles([...e.target.files]);
                    e.target.value = '';
                  }}
                />
              </label>
              <button type="button" className="pdf-btn pdf-btn--ghost" onClick={ws.reset}>
                <RotateCcw size={14} /> Reset
              </button>
            </>
          )}
          {ws.result && (
            <button
              type="button"
              className="pdf-btn pdf-btn--primary"
              onClick={() => {
                if (ws.result?.type === 'single') {
                  downloadPdf(ws.result.data, ws.result.name);
                } else if (ws.result?.type === 'multi') {
                  void downloadMultiplePdfs(ws.result.files);
                }
              }}
            >
              <Download size={14} /> Download
            </button>
          )}
        </div>
      </header>

      <div className="pdf-workspace-body">
        <main className="pdf-preview-area">
          {ws.result ? (
            <PdfResultPanel
              result={ws.result}
              onStartOver={ws.reset}
              onSwitchTool={() => navigate(PDF_ROUTE)}
            />
          ) : !hasFiles ? (
            <PdfUploadZone
              onFiles={(f) => void ws.addFiles(f)}
              multiFile={tool.multiFile}
              hint={tool.fileHint}
              loading={ws.loading}
            />
          ) : isEdit ? (
            <PdfEditCanvas
              fileData={ws.files[0].data}
              pageCount={ws.files[0].pageCount}
              annotations={annotations}
              onChange={setAnnotations}
            />
          ) : (
            <PdfPageGrid
              pages={ws.pages}
              pageOrder={ws.pageOrder}
              selected={ws.selected}
              onToggle={ws.togglePage}
              onReorder={toolId === 'rearrange' ? ws.movePage : undefined}
              selectionMode={selectionMode}
              markedKeys={toolId === 'remove' || toolId === 'extract' || (toolId === 'split' && splitMode === 'selected')
                ? ws.selected : undefined}
              showRotate={toolId === 'rotate' || toolId === 'rearrange'}
              onRotate={ws.rotateSelected}
              groupByFile={fileGroups}
            />
          )}
          {ws.error && !ws.result && <p className="pdf-preview-error">{ws.error}</p>}
        </main>

        {hasFiles && !ws.result && (
          <PdfSidePanel
            toolId={toolId}
            files={ws.files}
            orderedFiles={ws.orderedFiles}
            totalPages={ws.totalPages}
            pageOrder={ws.pageOrder}
            selected={ws.selected}
            splitMode={splitMode}
            setSplitMode={setSplitMode}
            splitEveryN={splitEveryN}
            setSplitEveryN={setSplitEveryN}
            splitRangesText={splitRangesText}
            setSplitRangesText={setSplitRangesText}
            splitPreview={splitPreview}
            onRemoveFile={ws.removeFile}
            onMoveFile={ws.moveFile}
            processing={ws.processing}
            primaryLabel={primaryLabel}
            onPrimary={runPrimary}
            primaryDisabled={primaryDisabled}
            error={ws.error}
          />
        )}
      </div>

      <PdfPrivacyNote compact />
    </div>
  );
}
