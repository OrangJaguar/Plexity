export const CATALOG_SORT_OPTIONS = [
  { value: 'name-asc', label: 'Name (A–Z)' },
  { value: 'name-desc', label: 'Name (Z–A)' },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'popular', label: 'Most popular' },
];

export default function ToolCatalogToolbar({ search, onSearchChange, sort, onSortChange }) {
  return (
    <div className="tools-catalog-toolbar">
      <input
        type="search"
        className="tools-catalog-search"
        placeholder="Search tools…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        aria-label="Search tools"
      />
      <select
        className="tools-catalog-sort"
        value={sort}
        onChange={(e) => onSortChange(e.target.value)}
        aria-label="Sort tools"
      >
        {CATALOG_SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
