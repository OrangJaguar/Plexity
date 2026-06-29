import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ToolsMonthViewDialog from '@/components/tools/shared/ToolsMonthViewDialog';
import JournalDayPopup from '@/components/tools/journal/JournalDayPopup';
import JournalPinGate, { isJournalUnlocked } from '@/components/tools/journal/JournalPinGate';
import JournalMoodIcon from '@/components/tools/journal/JournalMoodIcon';
import { useToolsSettings } from '@/hooks/queries/useToolsSettings';
import { useToolsTasks } from '@/hooks/queries/useToolsTasks';
import { useToolsCalendarEvents } from '@/hooks/queries/useToolsCalendarEvents';
import { JOURNAL_PRESET_TAGS } from '@/lib/tools/tools-settings';
import {
  JOURNAL_MOODS,
  JOURNAL_WORD_MAX,
  JOURNAL_WORD_WARN,
  collectUserJournalTags,
  computeJournalStreak,
  getDailyJournalPrompt,
  getOnThisDayEntry,
  journalPreviewForQuery,
  parseJournalTagsFromPlain,
  stripJournalHtml,
  wordCountFromHtml,
} from '@/lib/tools/journal-text';
import { getTodayKey, parseLocalDateKey, toLocalDateKey } from '@/lib/tools/date';
import { useCommandBarDraft } from '@/hooks/useCommandBarDraft';

function TagAutocomplete({ suggestions, position, onPick }) {
  if (!suggestions.length) return null;
  return (
    <ul
      className="tools-journal-tag-autocomplete"
      style={{ top: position.top, left: position.left }}
    >
      {suggestions.map((tag) => (
        <li key={tag}>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); onPick(tag); }}>
            #{tag}
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function JournalContent({ todayKey, todayEntry, entries, upsertEntry }) {
  const { settings, preferences } = useToolsSettings();
  const { tasks } = useToolsTasks();
  const { events } = useToolsCalendarEvents();

  const editorRef = useRef(null);
  const timerRef = useRef(null);
  const upsertRef = useRef(upsertEntry);
  upsertRef.current = upsertEntry;

  const [unlocked, setUnlocked] = useState(() => isJournalUnlocked());
  const [mood, setMood] = useState('');
  const [pastEntriesExpanded, setPastEntriesExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [saveStatus, setSaveStatus] = useState('saved');
  const [wordCount, setWordCount] = useState(0);
  const [dayOpen, setDayOpen] = useState(false);
  const [dayView, setDayView] = useState({ dateKey: '', entry: null });
  const [monthOpen, setMonthOpen] = useState(false);
  const [tagQuery, setTagQuery] = useState('');
  const [tagMenuPos, setTagMenuPos] = useState({ top: 0, left: 0 });
  const [showTagMenu, setShowTagMenu] = useState(false);
  const { action, clearAction } = useCommandBarDraft('action');

  const pinHash = preferences?.journalPinHash || settings.journalPinHash;
  const needsPin = !!pinHash && !unlocked;

  const allTags = useMemo(() => {
    const userTags = collectUserJournalTags(entries);
    const configured = settings.toolsJournalTags ?? JOURNAL_PRESET_TAGS;
    return [...new Set([...configured, ...userTags])].sort();
  }, [entries, settings.toolsJournalTags]);

  const tagSuggestions = useMemo(() => {
    if (!showTagMenu) return [];
    const q = tagQuery.toLowerCase();
    return allTags.filter((tag) => tag.startsWith(q) && tag !== q).slice(0, 8);
  }, [allTags, showTagMenu, tagQuery]);

  const streak = computeJournalStreak(entries, {
    minWords: settings.journalMinWords,
    graceUsedAt: preferences?.journalGraceUsedAt ?? settings.journalGraceUsedAt,
  });
  const todayMeetsThreshold = wordCount >= settings.journalMinWords;

  const onThisDay = getOnThisDayEntry(entries, todayKey);
  const dailyPrompt = settings.journalDailyPromptEnabled ? getDailyJournalPrompt(todayKey) : null;

  const todayHeading = parseLocalDateKey(todayKey).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const buildPayload = useCallback((content, nextMood = mood) => {
    const plain = stripJournalHtml(content);
    return {
      content,
      mood: nextMood || null,
      tags: parseJournalTagsFromPlain(plain),
      wordCount: wordCountFromHtml(content),
    };
  }, [mood]);

  const saveNow = useCallback(async (content, dayKey, nextMood = mood) => {
    const wc = wordCountFromHtml(content);
    if (wc > JOURNAL_WORD_MAX) return;
    setSaveStatus('saving');
    try {
      await upsertRef.current(dayKey, buildPayload(content, nextMood));
      setSaveStatus('saved');
    } catch {
      setSaveStatus('saved');
    }
    setWordCount(wc);
  }, [buildPayload, mood]);

  useEffect(() => {
    if (!action) return;
    if (action.actionId === 'searchJournal') {
      setSearch(action.payload?.query || '');
      clearAction();
    }
    if (action.actionId === 'journalEntry' && action.payload?.text) {
      const text = action.payload.text;
      if (editorRef.current) {
        editorRef.current.innerHTML = `<p>${text.replace(/</g, '&lt;')}</p>`;
        editorRef.current.focus();
        void saveNow(editorRef.current.innerHTML, getTodayKey());
      }
      clearAction();
    }
  }, [action, clearAction, saveNow]);

  useEffect(() => {
    const content = todayEntry?.content || '';
    if (editorRef.current) {
      editorRef.current.innerHTML = content;
    }
    setMood(todayEntry?.mood || '');
    setWordCount(todayEntry?.wordCount ?? wordCountFromHtml(content));
    setSaveStatus('saved');
  }, [todayKey, todayEntry?.content, todayEntry?.updatedAt, todayEntry?.mood, todayEntry?.wordCount]);

  useEffect(() => {
    const flush = () => {
      if (!editorRef.current || needsPin) return;
      void saveNow(editorRef.current.innerHTML || '', getTodayKey());
    };
    const onHide = () => flush();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      flush();
    };
  }, [saveNow, needsPin]);

  const queueSave = () => {
    const html = editorRef.current?.innerHTML || '';
    const wc = wordCountFromHtml(html);
    if (wc > JOURNAL_WORD_MAX) {
      document.execCommand('undo');
      return;
    }
    setSaveStatus('saving');
    setWordCount(wc);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      saveNow(editorRef.current?.innerHTML || '', getTodayKey());
    }, 260);
  };

  const handleMoodSelect = (nextMood) => {
    const value = mood === nextMood ? '' : nextMood;
    setMood(value);
    void saveNow(editorRef.current?.innerHTML || '', getTodayKey(), value);
  };

  const applyStyle = (cmd) => {
    document.execCommand(cmd, false, null);
    editorRef.current?.focus();
  };

  const detectTagAutocomplete = () => {
    const sel = window.getSelection();
    if (!sel?.rangeCount || !editorRef.current) {
      setShowTagMenu(false);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!range.collapsed) {
      setShowTagMenu(false);
      return;
    }
    const container = range.startContainer;
    if (!container || container.nodeType !== 3) {
      setShowTagMenu(false);
      return;
    }
    const text = container.textContent.slice(0, range.startOffset);
    const match = text.match(/#([a-zA-Z0-9_-]*)$/);
    if (!match) {
      setShowTagMenu(false);
      return;
    }
    const rect = range.getBoundingClientRect();
    const editorRect = editorRef.current.getBoundingClientRect();
    setTagQuery(match[1].toLowerCase());
    setTagMenuPos({
      top: rect.bottom - editorRect.top + 4,
      left: rect.left - editorRect.left,
    });
    setShowTagMenu(true);
  };

  const insertTag = (tag) => {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    const range = sel.getRangeAt(0);
    const container = range.startContainer;
    if (!container || container.nodeType !== 3) return;
    const text = container.textContent;
    const offset = range.startOffset;
    const before = text.slice(0, offset).replace(/#([a-zA-Z0-9_-]*)$/, `#${tag} `);
    const after = text.slice(offset);
    container.textContent = before + after;
    const newOffset = before.length;
    range.setStart(container, newOffset);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    setShowTagMenu(false);
    queueSave();
  };

  const handleAutoFormat = (e) => {
    if (e.key === ' ') {
      const sel = window.getSelection();
      if (!sel?.rangeCount) return;
      const range = sel.getRangeAt(0);
      if (!range.collapsed) return;
      const container = range.startContainer;
      if (!container || container.nodeType !== 3) return;
      const prefix = container.textContent.slice(0, range.startOffset);
      if (prefix === '-') {
        e.preventDefault();
        container.textContent = container.textContent.slice(1);
        document.execCommand('insertUnorderedList', false, null);
      } else if (prefix === '[]') {
        e.preventDefault();
        container.textContent = `☐ ${container.textContent.slice(range.startOffset)}`;
      }
    }
    if (wordCountFromHtml(editorRef.current?.innerHTML || '') >= JOURNAL_WORD_MAX && e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
    }
  };

  const pastEntries = (entries || [])
    .filter((e) => e.dateKey !== todayKey)
    .filter((e) => stripJournalHtml(e.content).length > 0 || e.mood)
    .filter((e) => !search || stripJournalHtml(e.content).toLowerCase().includes(search.toLowerCase()))
    .filter((e) => !tagFilter || (e.tags || []).includes(tagFilter))
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));

  const getJournalDayMeta = useCallback((day, key) => {
    const has = (entries || []).some(
      (e) => e.dateKey === key && (stripJournalHtml(e.content).length > 0 || e.mood),
    );
    return { hasEntry: has };
  }, [entries]);

  const openDay = (dateKey) => {
    const entry = entries.find((e) => e.dateKey === dateKey) || null;
    setDayView({ dateKey, entry });
    setDayOpen(true);
  };

  const handleMonthSelect = (_day, key) => {
    openDay(key);
  };

  const handleSaveComments = async (dateKey, comments) => {
    const entry = entries.find((e) => e.dateKey === dateKey);
    if (!entry) return;
    await upsertEntry(dateKey, {
      content: entry.content,
      mood: entry.mood,
      tags: entry.tags,
      wordCount: entry.wordCount,
      comments,
    });
    setDayView((prev) => (
      prev.dateKey === dateKey ? { ...prev, entry: { ...entry, comments } } : prev
    ));
  };

  const wordCountClass = wordCount >= JOURNAL_WORD_MAX
    ? ' at-max'
    : wordCount >= JOURNAL_WORD_WARN
      ? ' at-warn'
      : '';

  if (needsPin) {
    return <JournalPinGate pinHash={pinHash} onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <div className={`tools-journal-shell${pastEntriesExpanded ? ' past-entries-expanded' : ''}`}>
      {onThisDay ? (
        <div className="tools-journal-on-this-day">
          <strong>On this day</strong>
          <span>
            {parseLocalDateKey(onThisDay.dateKey).getFullYear()} — {stripJournalHtml(onThisDay.content).slice(0, 140)}
            {stripJournalHtml(onThisDay.content).length > 140 ? '…' : ''}
          </span>
          <button type="button" onClick={() => openDay(onThisDay.dateKey)}>Read</button>
        </div>
      ) : null}

      <section className="tools-journal-main">
        <div className="tools-journal-main-head">
          <h3>{todayHeading}</h3>
          <div className="tools-journal-head-actions">
            <div className="tools-journal-mood-row">
              {JOURNAL_MOODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`tools-journal-mood-chip${mood === m.id ? ' active' : ''}`}
                  onClick={() => handleMoodSelect(m.id)}
                  aria-label={m.label}
                  title={m.label}
                >
                  <JournalMoodIcon mood={m.id} size={20} />
                </button>
              ))}
            </div>
            <div className="tools-journal-toolbar">
              <button type="button" className="tools-journal-tool-btn" onClick={() => applyStyle('bold')} aria-label="Bold">B</button>
              <button type="button" className="tools-journal-tool-btn" onClick={() => applyStyle('italic')} aria-label="Italic"><em>I</em></button>
              <button type="button" className="tools-journal-tool-btn" onClick={() => applyStyle('underline')} aria-label="Underline"><u>U</u></button>
            </div>
            <span className="tools-journal-status">
              <span className="tools-journal-cloud">☁</span>
              <span>{saveStatus === 'saving' ? 'Saving...' : 'Saved ✓'}</span>
            </span>
            <span className={`tools-journal-streak-pill${todayMeetsThreshold ? '' : ' below-threshold'}`}>
              🔥 {streak}
              <span className="tools-journal-streak-min"> / {settings.journalMinWords}w</span>
            </span>
          </div>
        </div>

        {dailyPrompt ? (
          <div className="tools-journal-daily-prompt">
            <span>Prompt</span>
            <p>{dailyPrompt}</p>
          </div>
        ) : null}

        <div className="tools-journal-editor-wrap">
          <div
            ref={editorRef}
            className="tools-journal-text"
            contentEditable
            suppressContentEditableWarning
            data-placeholder="Quick reflection. Use #tags inline. What's on your mind today?"
            onInput={() => { queueSave(); detectTagAutocomplete(); }}
            onBlur={() => { saveNow(editorRef.current?.innerHTML || '', getTodayKey()); setShowTagMenu(false); }}
            onKeyDown={handleAutoFormat}
            onKeyUp={detectTagAutocomplete}
          />
          {showTagMenu ? (
            <TagAutocomplete
              suggestions={tagSuggestions}
              position={tagMenuPos}
              onPick={insertTag}
            />
          ) : null}
        </div>

        <div className="tools-journal-meta-row">
          <span className="tools-journal-meta-hint">
            Only <strong>today</strong> is edited here. Past days open in the day view pop-up.
          </span>
          <span className={`tools-journal-word-count${wordCountClass}`}>
            {wordCount} / {JOURNAL_WORD_MAX} words
          </span>
        </div>
      </section>

      <aside className="tools-journal-storage">
        <div className="tools-journal-storage-head">
          <strong>Past entries</strong>
          <input
            className="tools-journal-search"
            type="text"
            placeholder="Search past entries"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="tools-journal-tag-filter"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            aria-label="Filter by tag"
          >
            <option value="">All tags</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>#{tag}</option>
            ))}
          </select>
          <button type="button" className="tools-journal-month-btn" onClick={() => setMonthOpen(true)}>Month</button>
          <button
            type="button"
            className="tools-journal-storage-toggle"
            onClick={(e) => {
              e.stopPropagation();
              setPastEntriesExpanded((v) => !v);
            }}
            aria-label={pastEntriesExpanded ? 'Collapse past entries' : 'Expand past entries'}
            aria-expanded={pastEntriesExpanded}
          >
            {pastEntriesExpanded ? '▾' : '▴'}
          </button>
        </div>
        <div className="tools-journal-list">
          {!pastEntries.length ? (
            <div className="tools-empty-hint">{search || tagFilter ? 'No entries match filters' : 'No other days with saved notes yet.'}</div>
          ) : (
            pastEntries.map((e) => (
              <button
                key={e.dateKey}
                type="button"
                className="tools-journal-entry-btn"
                onClick={() => openDay(e.dateKey)}
              >
                <div className="tools-journal-entry-row">
                  <div className="tools-journal-entry-date">
                    {e.mood ? <span className="tools-journal-entry-mood"><JournalMoodIcon mood={e.mood} size={16} /></span> : null}
                    {parseLocalDateKey(e.dateKey).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                  <div className="tools-journal-entry-tags">
                    {(e.tags || []).slice(0, 3).map((tag) => (
                      <span key={tag} className="tools-journal-tag-chip">#{tag}</span>
                    ))}
                  </div>
                  <div
                    className="tools-journal-entry-preview"
                    dangerouslySetInnerHTML={{ __html: journalPreviewForQuery(e.content, search) }}
                  />
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      <JournalDayPopup
        open={dayOpen}
        onOpenChange={setDayOpen}
        dateKey={dayView.dateKey}
        entry={dayView.entry || entries.find((e) => e.dateKey === dayView.dateKey)}
        isToday={dayView.dateKey === todayKey}
        tasks={tasks}
        events={events}
        onSaveComments={handleSaveComments}
      />
      <ToolsMonthViewDialog
        open={monthOpen}
        onOpenChange={setMonthOpen}
        anchor={parseLocalDateKey(todayKey)}
        todayKey={todayKey}
        onSelectDay={handleMonthSelect}
        getDayMeta={getJournalDayMeta}
        disableFuture
      />
    </div>
  );
}
