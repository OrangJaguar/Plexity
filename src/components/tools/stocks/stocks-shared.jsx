import { formatChange, formatPrice, changeClass } from '@/lib/tools/stocks/stocks-format';

export function StocksDataNotice({ updatedAt, className = '' }) {
  return (
    <p className={`stocks-data-notice ${className}`.trim()}>
      For research use · Data may be delayed ·
      {updatedAt ? ` Last updated ${new Date(updatedAt * 1000).toLocaleTimeString()}` : ' Not real-time'}
    </p>
  );
}

export function StocksChange({ value, amount, className = '' }) {
  if (value == null) return <span className={`stocks-change ${className}`}>—</span>;
  return (
    <span className={`stocks-change ${changeClass(value)} ${className}`}>
      {formatChange(value)}
      {amount != null && <span className="stocks-change-amt"> ({formatPrice(Math.abs(amount))})</span>}
    </span>
  );
}

export function StocksTable({
  columns, rows, onRowClick, emptyMessage = 'No results.', sortKey, sortDir, onSort, highlightIndex,
}) {
  return (
    <div className="stocks-table-wrap">
      <table className="stocks-table">
        <thead>
          <tr>
            {columns.map((col) => {
              const sortable = col.sortable && onSort;
              const active = sortable && sortKey === col.sortKey;
              return (
                <th
                  key={col.key}
                  className={[
                    col.align === 'right' ? 'stocks-table-num' : '',
                    sortable ? 'stocks-table-th--sortable' : '',
                    active ? 'stocks-table-th--active' : '',
                  ].filter(Boolean).join(' ')}
                >
                  {sortable ? (
                    <button
                      type="button"
                      className="stocks-table-sort-btn"
                      onClick={() => onSort(col.sortKey)}
                      aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    >
                      {col.label}
                      {active && <span className="stocks-table-sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                    </button>
                  ) : col.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="stocks-table-empty">{emptyMessage}</td></tr>
          ) : rows.map((row, idx) => (
            <tr
              key={row.id || row.symbol}
              className={[
                onRowClick ? 'stocks-table-row--click' : '',
                highlightIndex === idx ? 'stocks-table-row--highlight' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td key={col.key} className={col.align === 'right' ? 'stocks-table-num' : ''}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StocksPanel({ title, children, action, className = '' }) {
  return (
    <section className={`stocks-panel${className ? ` ${className}` : ''}`}>
      <header className="stocks-panel-head">
        <h3>{title}</h3>
        {action}
      </header>
      <div className="stocks-panel-body">{children}</div>
    </section>
  );
}

export function StocksKpi({ label, value, sub, trend }) {
  return (
    <div className="stocks-kpi">
      <span className="stocks-kpi-label">{label}</span>
      <strong className="stocks-kpi-value">{value}</strong>
      {sub != null && (
        <span className={`stocks-kpi-sub ${trend ? changeClass(trend) : ''}`}>{sub}</span>
      )}
    </div>
  );
}

export function StocksLoader() {
  return <div className="stocks-loader">Loading market data…</div>;
}

export function StocksError({ message, onRetry }) {
  return (
    <div className="stocks-error">
      <p>{message || 'Could not load market data.'}</p>
      {onRetry && <button type="button" className="stocks-btn stocks-btn--ghost" onClick={onRetry}>Retry</button>}
    </div>
  );
}
