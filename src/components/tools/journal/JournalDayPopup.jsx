import { useMemo, useRef, useState } from 'react';
import ToolsModal from '@/components/tools/shared/ToolsModal';
import JournalMoodIcon from '@/components/tools/journal/JournalMoodIcon';
import {
  JOURNAL_COMMENT_MAX,
  plainOffsetFromSelection,
  stripJournalHtml,
} from '@/lib/tools/journal-text';
import { doesEventOccurOnDay, normalizeCalendarEvent } from '@/lib/tools/calendar-repeat';
import { parseLocalDateKey, toLocalDateKey } from '@/lib/tools/date';

function formatEventTime(evt) {
  if (evt.allDay) return 'All day';
  const start = evt.displayStart || new Date(evt.start);
  return start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function tasksForDate(tasks, dateKey) {
  return (tasks || []).filter((task) => {
    if (!task.due) return false;
    const dueKey = toLocalDateKey(new Date(task.due));
    return dueKey === dateKey;
  });
}

function eventsForDate(events, dateKey) {
  const day = parseLocalDateKey(dateKey);
  return (events || [])
    .map(normalizeCalendarEvent)
    .filter((evt) => doesEventOccurOnDay(evt, day))
    .map((evt) => ({
      ...evt,
      displayStart: evt.displayStart || new Date(evt.start),
    }))
    .sort((a, b) => a.displayStart - b.displayStart);
}

export default function JournalDayPopup({
  open,
  onOpenChange,
  dateKey,
  entry,
  isToday,
  tasks,
  events,
  onSaveComments,
}) {
  const bodyRef = useRef(null);
  const [draftComment, setDraftComment] = useState('');
  const [selection, setSelection] = useState(null);
  const [saving, setSaving] = useState(false);

  const title = dateKey
    ? parseLocalDateKey(dateKey).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })
    : 'Journal Entry';

  const dayTasks = useMemo(() => tasksForDate(tasks, dateKey), [tasks, dateKey]);
  const dayEvents = useMemo(() => eventsForDate(events, dateKey), [events, dateKey]);
  const comments = entry?.comments || [];
  const plain = stripJournalHtml(entry?.content || '');
  const canComment = !isToday && plain.length > 0;

  const handleSelection = () => {
    if (!canComment) return;
    const sel = window.getSelection();
    if (!sel?.rangeCount || sel.isCollapsed) {
      setSelection(null);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!bodyRef.current?.contains(range.commonAncestorContainer)) {
      setSelection(null);
      return;
    }
    const offsets = plainOffsetFromSelection(bodyRef.current, range);
    if (!offsets.text.trim()) {
      setSelection(null);
      return;
    }
    setSelection(offsets);
  };

  const handleAddComment = async () => {
    if (!selection || !draftComment.trim() || !onSaveComments) return;
    const text = draftComment.trim().slice(0, JOURNAL_COMMENT_MAX);
    const next = [
      ...comments,
      {
        id: `c-${Date.now()}`,
        highlightStart: selection.start,
        highlightEnd: selection.end,
        text,
        createdAt: Date.now(),
      },
    ];
    setSaving(true);
    try {
      await onSaveComments(dateKey, next);
      setDraftComment('');
      setSelection(null);
      window.getSelection()?.removeAllRanges();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ToolsModal open={open} onOpenChange={onOpenChange} title={title} maxWidth="1100px">
      <div className="tools-journal-day-popup">
        <div className="tools-journal-day-cols">
          <aside className="tools-journal-day-col tools-journal-day-col--side">
            <h4>Tasks</h4>
            {dayTasks.length ? dayTasks.map((task) => (
              <div key={task.taskId} className="tools-journal-day-item">
                <span>{task.completed ? '✓' : '○'}</span>
                <span>{task.title}</span>
              </div>
            )) : <p className="tools-journal-day-empty">No tasks due</p>}
            <h4>Events</h4>
            {dayEvents.length ? dayEvents.map((evt) => (
              <div key={`${evt.eventId}-${dateKey}`} className="tools-journal-day-item">
                <span className="tools-journal-day-time">{formatEventTime(evt)}</span>
                <span>{evt.title}</span>
              </div>
            )) : <p className="tools-journal-day-empty">No events</p>}
          </aside>

          <section className="tools-journal-day-col tools-journal-day-col--center">
            {entry?.mood ? (
              <div className="tools-journal-day-mood"><JournalMoodIcon mood={entry.mood} size={18} /> {entry.mood}</div>
            ) : null}
            {plain ? (
              <div
                ref={bodyRef}
                className="tools-journal-day-body"
                onMouseUp={handleSelection}
                onKeyUp={handleSelection}
                dangerouslySetInnerHTML={{ __html: entry.content }}
              />
            ) : (
              <p className="tools-journal-modal-empty">No entry for this day.</p>
            )}
            {canComment && selection ? (
              <div className="tools-journal-comment-compose">
                <p className="tools-journal-comment-quote">&ldquo;{selection.text.slice(0, 120)}{selection.text.length > 120 ? '…' : ''}&rdquo;</p>
                <textarea
                  className="tools-journal-comment-input"
                  rows={3}
                  maxLength={JOURNAL_COMMENT_MAX}
                  placeholder="Add a comment on this highlight…"
                  value={draftComment}
                  onChange={(e) => setDraftComment(e.target.value)}
                />
                <div className="tools-journal-comment-actions">
                  <span>{draftComment.length}/{JOURNAL_COMMENT_MAX}</span>
                  <button type="button" className="tools-journal-comment-btn" disabled={saving || !draftComment.trim()} onClick={handleAddComment}>
                    {saving ? 'Saving…' : 'Save comment'}
                  </button>
                </div>
              </div>
            ) : null}
            {isToday ? (
              <p className="tools-journal-modal-readonly-hint">
                Read-only preview. Edit today&apos;s note in the main journal area.
              </p>
            ) : null}
          </section>

          <aside className="tools-journal-day-col tools-journal-day-col--side">
            <h4>Comments</h4>
            {!comments.length ? (
              <p className="tools-journal-day-empty">
                {canComment ? 'Highlight text to add a comment.' : 'No comments yet.'}
              </p>
            ) : (
              <ul className="tools-journal-comments-list">
                {comments.map((comment) => (
                  <li key={comment.id} className="tools-journal-comment-card">
                    <p className="tools-journal-comment-card-text">{comment.text}</p>
                    <span className="tools-journal-comment-card-meta">
                      {new Date(comment.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>

        <div className="tools-journal-day-stats-strip">
          <span>Study stats</span>
          <span className="tools-journal-day-stats-placeholder">Coming soon — time on task, sessions, focus blocks</span>
        </div>
      </div>
    </ToolsModal>
  );
}
