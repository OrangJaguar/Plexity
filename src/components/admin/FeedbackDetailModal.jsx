import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useUpdateFeedback } from '@/hooks/mutations/useUpdateFeedback';
import { FEEDBACK_STATUSES } from '@/lib/feedback/constants';
import { TOOL_REGISTRY } from '@/lib/tools/registry';

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString();
}

export default function FeedbackDetailModal({ item, onClose }) {
  const updateMutation = useUpdateFeedback();
  const [status, setStatus] = useState(item.status || 'new');
  const [adminNotes, setAdminNotes] = useState(item.adminNotes || '');

  useEffect(() => {
    setStatus(item.status || 'new');
    setAdminNotes(item.adminNotes || '');
  }, [item]);

  async function handleSave(e) {
    e.preventDefault();
    await updateMutation.mutateAsync({
      id: item.id,
      patch: { status, adminNotes },
    });
    onClose();
  }

  const toolLabel = item.toolId
    ? TOOL_REGISTRY.find((t) => t.id === item.toolId)?.label || item.toolId
    : null;

  return (
    <div className="admin-feedback-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="admin-feedback-modal"
        role="dialog"
        aria-labelledby="feedback-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="admin-feedback-modal-header">
          <div>
            <p className="admin-feedback-modal-eyebrow"><code>{item.requestId}</code></p>
            <h2 id="feedback-detail-title">{item.subject}</h2>
          </div>
          <button type="button" className="admin-feedback-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="admin-feedback-modal-meta">
          <span>{item.type}</span>
          <span>{item.userEmail}</span>
          <span>{formatDate(item.createdAt)}</span>
          {toolLabel && <span>{toolLabel}</span>}
          {item.severity && <span>Severity: {item.severity}</span>}
        </div>

        <div className="admin-feedback-modal-body">
          <section>
            <h3>Message</h3>
            <p className="admin-feedback-modal-block">{item.message}</p>
          </section>

          {item.type === 'bug' && (
            <>
              {item.stepsToReproduce && (
                <section>
                  <h3>Steps to reproduce</h3>
                  <p className="admin-feedback-modal-block">{item.stepsToReproduce}</p>
                </section>
              )}
              {item.expectedBehavior && (
                <section>
                  <h3>Expected</h3>
                  <p className="admin-feedback-modal-block">{item.expectedBehavior}</p>
                </section>
              )}
              {item.actualBehavior && (
                <section>
                  <h3>Actual</h3>
                  <p className="admin-feedback-modal-block">{item.actualBehavior}</p>
                </section>
              )}
            </>
          )}

          {(item.pageUrl || item.userAgent) && (
            <section className="admin-feedback-modal-tech">
              {item.pageUrl && <p><strong>Page:</strong> {item.pageUrl}</p>}
              {item.userAgent && <p><strong>UA:</strong> {item.userAgent}</p>}
            </section>
          )}

          <form onSubmit={handleSave} className="admin-feedback-modal-form">
            <label className="admin-feedback-modal-field">
              <span>Status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                {FEEDBACK_STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </label>
            <label className="admin-feedback-modal-field">
              <span>Admin notes</span>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={4}
                placeholder="Internal notes (not visible to submitter)"
              />
            </label>
            <div className="admin-feedback-modal-actions">
              <button type="button" className="btn" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
