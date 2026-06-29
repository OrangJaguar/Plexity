import { useMemo, useState, useEffect } from 'react';
import { TOOL_REGISTRY } from '@/lib/tools/registry';
import ToolCatalogToolbar from '@/components/tools/catalog/ToolCatalogToolbar';
import ToolCatalogCard from '@/components/tools/catalog/ToolCatalogCard';
import ToolPreviewModal from '@/components/tools/catalog/ToolPreviewModal';
import { useCommandBarDraft } from '@/hooks/useCommandBarDraft';

function sortTools(tools, sort) {
  const list = [...tools];
  switch (sort) {
    case 'name-desc':
      return list.sort((a, b) => b.label.localeCompare(a.label));
    case 'newest':
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case 'oldest':
      return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    case 'popular':
      return list.sort((a, b) => a.popularityRank - b.popularityRank);
    case 'name-asc':
    default:
      return list.sort((a, b) => a.label.localeCompare(b.label));
  }
}

export default function ToolsCatalogContent() {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name-asc');
  const [previewTool, setPreviewTool] = useState(null);
  const { action, clearAction } = useCommandBarDraft('action');

  useEffect(() => {
    if (action?.actionId === 'pinTool') {
      setSearch(action.payload?.toolName || '');
      clearAction();
    }
  }, [action, clearAction]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = TOOL_REGISTRY;
    if (q) {
      list = list.filter(
        (t) => t.label.toLowerCase().includes(q)
          || t.description.toLowerCase().includes(q)
          || t.id.includes(q),
      );
    }
    return sortTools(list, sort);
  }, [search, sort]);

  return (
    <div className="tools-catalog-shell">
      <ToolCatalogToolbar
        search={search}
        onSearchChange={setSearch}
        sort={sort}
        onSortChange={setSort}
      />
      <div className="tools-catalog-grid">
        {filtered.length === 0 ? (
          <p className="tools-empty-hint">No tools match your search.</p>
        ) : (
          filtered.map((tool) => (
            <ToolCatalogCard
              key={tool.id}
              tool={tool}
              onPreview={setPreviewTool}
            />
          ))
        )}
      </div>
      <ToolPreviewModal
        tool={previewTool}
        open={Boolean(previewTool)}
        onOpenChange={(open) => { if (!open) setPreviewTool(null); }}
      />
    </div>
  );
}
