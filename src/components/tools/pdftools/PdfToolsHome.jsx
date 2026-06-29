import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { PDF_TOOLS } from '@/lib/tools/pdftools/constants';
import PdfPrivacyNote from '@/components/tools/pdftools/PdfPrivacyNote';

export default function PdfToolsHome() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PDF_TOOLS;
    return PDF_TOOLS.filter((t) =>
      t.name.toLowerCase().includes(q)
      || t.description.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="pdf-home">
      <header className="pdf-home-header">
        <div>
          <h1>PDF</h1>
          <p className="pdf-home-lead">Merge, split, rearrange, and annotate PDFs — all in your browser.</p>
        </div>
        <label className="pdf-home-search">
          <Search size={16} aria-hidden />
          <input
            type="search"
            placeholder="Search tools…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </header>

      <div className="pdf-tool-grid">
        {filtered.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              type="button"
              className="pdf-tool-card"
              onClick={() => navigate(`/tools/pdftools/${tool.id}`)}
            >
              <span className="pdf-tool-card-icon"><Icon size={22} aria-hidden /></span>
              <span className="pdf-tool-card-body">
                <strong>{tool.name}</strong>
                <span>{tool.description}</span>
                <span className="pdf-tool-card-meta">
                  {tool.multiFile ? 'Multiple files' : 'One file'}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="pdf-muted">No tools match your search.</p>
      )}

      <PdfPrivacyNote />
    </div>
  );
}
