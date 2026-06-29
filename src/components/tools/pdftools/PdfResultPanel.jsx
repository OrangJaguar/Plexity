import { Download, CheckCircle2, RotateCcw } from 'lucide-react';
import { downloadPdf, downloadMultiplePdfs } from '@/lib/tools/pdftools/pdf-download';

/**
 * @param {{
 *   result: { type: 'single', name: string, data: Uint8Array, pageCount: number }
 *     | { type: 'multi', files: { name: string, data: Uint8Array, pageCount: number }[] },
 *   onStartOver: () => void,
 *   onSwitchTool?: () => void,
 * }} props
 */
export default function PdfResultPanel({ result, onStartOver, onSwitchTool }) {
  const handleDownload = async () => {
    if (result.type === 'single') {
      downloadPdf(result.data, result.name);
    } else {
      await downloadMultiplePdfs(result.files);
    }
  };

  const fileCount = result.type === 'single' ? 1 : result.files.length;
  const pageCount = result.type === 'single'
    ? result.pageCount
    : result.files.reduce((n, f) => n + f.pageCount, 0);

  return (
    <div className="pdf-result">
      <div className="pdf-result-head">
        <CheckCircle2 size={20} aria-hidden />
        <strong>Ready to download</strong>
      </div>
      <dl className="pdf-result-stats">
        <div><dt>Output files</dt><dd>{fileCount}</dd></div>
        <div><dt>Total pages</dt><dd>{pageCount}</dd></div>
      </dl>
      {result.type === 'multi' && (
        <ul className="pdf-result-files">
          {result.files.map((f) => (
            <li key={f.name}>{f.name} · {f.pageCount} page{f.pageCount !== 1 ? 's' : ''}</li>
          ))}
        </ul>
      )}
      <div className="pdf-result-actions">
        <button type="button" className="pdf-btn pdf-btn--primary" onClick={handleDownload}>
          <Download size={16} /> Download{fileCount > 1 ? ' all' : ''}
        </button>
        <button type="button" className="pdf-btn pdf-btn--secondary" onClick={onStartOver}>
          <RotateCcw size={14} /> Start over
        </button>
        {onSwitchTool && (
          <button type="button" className="pdf-btn pdf-btn--ghost" onClick={onSwitchTool}>
            Switch tool
          </button>
        )}
      </div>
    </div>
  );
}
