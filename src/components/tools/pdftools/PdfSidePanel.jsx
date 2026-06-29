import { useMemo } from 'react';
import { ChevronUp, ChevronDown, X } from 'lucide-react';
import { EDIT_SUBTITLE } from '@/lib/tools/pdftools/constants';
import {
  rangesAtBreaks, rangesEveryN, rangesEveryPage, parseRangeInput,
} from '@/lib/tools/pdftools/pdf-operations';

/**
 * @param {object} props
 */
export default function PdfSidePanel({
  toolId,
  files,
  orderedFiles,
  totalPages,
  pageOrder,
  selected,
  splitMode,
  setSplitMode,
  splitEveryN,
  setSplitEveryN,
  splitRangesText,
  setSplitRangesText,
  splitPreview,
  onRemoveFile,
  onMoveFile,
  processing,
  primaryLabel,
  onPrimary,
  primaryDisabled,
  error,
}) {
  const selectedCount = selected.size;

  const selectedPageNumbers = useMemo(() =>
    [...selected].map((key) => pageOrder.indexOf(key) + 1).filter((n) => n > 0).sort((a, b) => a - b),
  [selected, pageOrder]);

  return (
    <aside className="pdf-side-panel">
      <h3 className="pdf-side-title">Summary</h3>

      {error && <p className="pdf-side-error">{error}</p>}

      {toolId === 'merge' && (
        <>
          <dl className="pdf-side-stats">
            <div><dt>Files</dt><dd>{files.length}</dd></div>
            <div><dt>Total pages</dt><dd>{totalPages}</dd></div>
          </dl>
          {orderedFiles.length > 0 && (
            <div className="pdf-side-section">
              <h4>Merge order</h4>
              <ul className="pdf-file-order-list">
                {orderedFiles.map((file, i) => (
                  <li key={file.id}>
                    <span className="pdf-file-order-name" title={file.name}>{file.name}</span>
                    <span className="pdf-file-order-meta">{file.pageCount} pg</span>
                    <div className="pdf-file-order-actions">
                      <button type="button" className="pdf-icon-btn" disabled={i === 0} onClick={() => onMoveFile(i, i - 1)} aria-label="Move up">
                        <ChevronUp size={14} />
                      </button>
                      <button type="button" className="pdf-icon-btn" disabled={i === orderedFiles.length - 1} onClick={() => onMoveFile(i, i + 1)} aria-label="Move down">
                        <ChevronDown size={14} />
                      </button>
                      <button type="button" className="pdf-icon-btn" onClick={() => onRemoveFile(file.id)} aria-label="Remove file">
                        <X size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {toolId === 'split' && (
        <>
          <dl className="pdf-side-stats">
            <div><dt>Pages</dt><dd>{totalPages}</dd></div>
            <div><dt>Output files</dt><dd>{splitPreview?.length ?? '—'}</dd></div>
          </dl>
          <div className="pdf-side-section">
            <h4>Split method</h4>
            <div className="pdf-side-radio-group">
              {[
                { id: 'every', label: 'After every page' },
                { id: 'everyN', label: 'Every N pages' },
                { id: 'selected', label: 'At selected pages' },
                { id: 'ranges', label: 'By page ranges' },
              ].map((opt) => (
                <label key={opt.id} className="pdf-side-radio">
                  <input
                    type="radio"
                    name="splitMode"
                    checked={splitMode === opt.id}
                    onChange={() => setSplitMode(opt.id)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
            {splitMode === 'everyN' && (
              <label className="pdf-side-field">
                Pages per file
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={splitEveryN}
                  onChange={(e) => setSplitEveryN(Math.max(1, Number(e.target.value) || 1))}
                />
              </label>
            )}
            {splitMode === 'ranges' && (
              <label className="pdf-side-field">
                Ranges (e.g. 1-3, 5-8)
                <input
                  type="text"
                  value={splitRangesText}
                  onChange={(e) => setSplitRangesText(e.target.value)}
                  placeholder="1-3, 5-8"
                />
              </label>
            )}
            {splitMode === 'selected' && (
              <p className="pdf-side-hint">
                Click pages in the preview to mark split points (splits after selected pages).
              </p>
            )}
          </div>
          {splitPreview?.length > 0 && (
            <div className="pdf-side-section">
              <h4>Output preview</h4>
              <ul className="pdf-split-preview-list">
                {splitPreview.map((r, i) => (
                  <li key={i}>
                    File {i + 1}: pages {r.start}–{r.end}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {toolId === 'rearrange' && (
        <dl className="pdf-side-stats">
          <div><dt>Pages</dt><dd>{totalPages}</dd></div>
        </dl>
      )}

      {toolId === 'remove' && (
        <>
          <dl className="pdf-side-stats">
            <div><dt>Marked for removal</dt><dd>{selectedCount}</dd></div>
            <div><dt>Remaining pages</dt><dd>{Math.max(0, totalPages - selectedCount)}</dd></div>
          </dl>
          <p className="pdf-side-hint">Click pages to mark them for removal.</p>
        </>
      )}

      {toolId === 'extract' && (
        <>
          <dl className="pdf-side-stats">
            <div><dt>Selected pages</dt><dd>{selectedCount}</dd></div>
          </dl>
          {selectedPageNumbers.length > 0 && (
            <p className="pdf-side-hint">
              Pages: {selectedPageNumbers.join(', ')}
            </p>
          )}
          <p className="pdf-side-hint">Output will be one PDF with the selected pages.</p>
        </>
      )}

      {toolId === 'rotate' && (
        <>
          <dl className="pdf-side-stats">
            <div><dt>Pages to rotate</dt><dd>{selectedCount || totalPages}</dd></div>
          </dl>
          <p className="pdf-side-hint">
            Select pages or rotate all. Use toolbar buttons to rotate left/right.
          </p>
        </>
      )}

      {toolId === 'edit' && (
        <>
          <p className="pdf-side-subtitle">{EDIT_SUBTITLE}</p>
          <p className="pdf-side-hint">
            Add annotations and overlays. This does not rewrite existing PDF text.
          </p>
          <dl className="pdf-side-stats">
            <div><dt>Pages</dt><dd>{totalPages}</dd></div>
          </dl>
        </>
      )}

      <div className="pdf-side-actions">
        <button
          type="button"
          className="pdf-btn pdf-btn--primary pdf-btn--block"
          disabled={primaryDisabled || processing}
          onClick={onPrimary}
        >
          {processing ? 'Processing…' : primaryLabel}
        </button>
      </div>
    </aside>
  );
}

export function computeSplitPreview(totalPages, splitMode, splitEveryN, splitRangesText, selected, pageOrder) {
  try {
    if (splitMode === 'every') return rangesEveryPage(totalPages);
    if (splitMode === 'everyN') return rangesEveryN(totalPages, splitEveryN);
    if (splitMode === 'ranges') return parseRangeInput(splitRangesText, totalPages);
    if (splitMode === 'selected') {
      const breaks = [...selected]
        .map((key) => pageOrder.indexOf(key) + 1)
        .filter((n) => n > 0 && n < totalPages);
      return rangesAtBreaks(totalPages, breaks);
    }
    return [];
  } catch {
    return null;
  }
}
