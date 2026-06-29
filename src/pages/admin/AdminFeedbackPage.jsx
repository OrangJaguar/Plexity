import { useMemo, useState } from 'react';
import { useAdminFeedback } from '@/hooks/queries/useAdminFeedback';
import FeedbackDetailModal from '@/components/admin/FeedbackDetailModal';
import { FEEDBACK_STATUSES, FEEDBACK_TYPES } from '@/lib/feedback/constants';
import AppLoading from '@/components/shared/AppLoading';

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString();
}

export default function AdminFeedbackPage() {
  const { data: rows = [], isLoading, isError } = useAdminFeedback();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...rows]
      .filter((row) => {
        if (typeFilter !== 'all' && row.type !== typeFilter) return false;
        if (statusFilter !== 'all' && row.status !== statusFilter) return false;
        if (!q) return true;
        const hay = [
          row.requestId,
          row.subject,
          row.userEmail,
          row.message,
          row.toolId,
        ].join(' ').toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }, [rows, search, typeFilter, statusFilter]);

  if (isLoading) return <AppLoading />;
  if (isError) {
    return <p className="admin-feedback-error">Could not load feedback inbox.</p>;
  }

  return (
    <div className="admin-feedback-page">
      <header className="admin-feedback-header">
        <h1>Feedback inbox</h1>
        <p>{filtered.length} of {rows.length} submissions</p>
      </header>

      <div className="admin-feedback-filters">
        <input
          type="search"
          className="admin-feedback-search"
          placeholder="Search request ID, subject, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All types</option>
          {FEEDBACK_TYPES.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          {FEEDBACK_STATUSES.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="admin-feedback-table-wrap">
        <table className="admin-feedback-table">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Type</th>
              <th>Status</th>
              <th>Subject</th>
              <th>From</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="admin-feedback-empty">No feedback matches your filters.</td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr
                  key={row.id}
                  className="admin-feedback-row"
                  onClick={() => setSelected(row)}
                >
                  <td><code>{row.requestId}</code></td>
                  <td>{row.type}</td>
                  <td><span className={`admin-feedback-status admin-feedback-status--${row.status}`}>{row.status}</span></td>
                  <td>{row.subject}</td>
                  <td>{row.userEmail}</td>
                  <td>{formatDate(row.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <FeedbackDetailModal
          item={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
