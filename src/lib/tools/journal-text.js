import { toLocalDateKey, parseLocalDateKey, addDays, getTodayKey } from './date';
import { JOURNAL_PROMPTS } from './tools-settings';

export const JOURNAL_MOODS = [
  { id: 'great', emoji: '😄', label: 'Great' },
  { id: 'good', emoji: '🙂', label: 'Good' },
  { id: 'neutral', emoji: '😐', label: 'Neutral' },
  { id: 'rough', emoji: '😕', label: 'Rough' },
  { id: 'bad', emoji: '😞', label: 'Bad' },
];

export const JOURNAL_WORD_WARN = 2000;
export const JOURNAL_WORD_MAX = 2500;
export const JOURNAL_COMMENT_MAX = 350;

const MOOD_EMOJI = Object.fromEntries(JOURNAL_MOODS.map((m) => [m.id, m.emoji]));

export function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function stripJournalHtml(html) {
  if (typeof document === 'undefined') {
    return (html || '').replace(/<[^>]*>/g, '').trim();
  }
  const div = document.createElement('div');
  div.innerHTML = html || '';
  return (div.textContent || '').trim();
}

export function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function firstSentencePreview(text) {
  const clean = stripJournalHtml(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return 'No entry yet';
  const parts = clean.split(/(?<=[.!?])\s+/);
  return (parts[0] || clean).slice(0, 180);
}

export function journalPreviewForQuery(content, query) {
  const clean = stripJournalHtml(content || '').replace(/\s+/g, ' ').trim();
  if (!clean) return 'No entry yet';
  if (!query) return escapeHtml(firstSentencePreview(clean));
  const re = new RegExp(escapeRegExp(query), 'i');
  const match = clean.match(re);
  if (!match || match.index == null) return escapeHtml(firstSentencePreview(clean));
  const start = Math.max(0, match.index - 26);
  const end = Math.min(clean.length, match.index + match[0].length + 26);
  const seg = clean.slice(start, end);
  const localIdx = match.index - start;
  const before = escapeHtml(seg.slice(0, localIdx));
  const hit = escapeHtml(seg.slice(localIdx, localIdx + match[0].length));
  const after = escapeHtml(seg.slice(localIdx + match[0].length));
  return `${start > 0 ? '...' : ''}${before}<mark class="tools-journal-match-mark">${hit}</mark>${after}${end < clean.length ? '...' : ''}`;
}

export function wordCountFromHtml(html) {
  const plain = stripJournalHtml(html || '');
  return (plain.match(/\S+/g) || []).length;
}

export function moodEmoji(mood) {
  return MOOD_EMOJI[mood] || '';
}

export function parseJournalTagsFromPlain(plain) {
  const tags = new Set();
  const re = /(?:^|\s)#([a-zA-Z][a-zA-Z0-9_-]{0,31})/g;
  let match = re.exec(plain || '');
  while (match) {
    tags.add(match[1].toLowerCase());
    match = re.exec(plain || '');
  }
  return [...tags];
}

export function collectUserJournalTags(entries) {
  const tags = new Set();
  (entries || []).forEach((entry) => {
    (entry.tags || []).forEach((tag) => tags.add(tag));
  });
  return [...tags];
}

export function entryQualifiesForStreak(entry, minWords) {
  if (!entry) return false;
  const wc = entry.wordCount ?? wordCountFromHtml(entry.content || '');
  return wc >= minWords;
}

export function isGraceAvailable(graceUsedAt) {
  if (!graceUsedAt) return true;
  const daysSince = (Date.now() - graceUsedAt) / (1000 * 60 * 60 * 24);
  return daysSince >= 30;
}

export function computeJournalStreak(entries, { minWords = 50, graceUsedAt = null } = {}) {
  const map = {};
  (entries || []).forEach((entry) => {
    map[entry.dateKey] = entry;
  });

  let cursor = parseLocalDateKey(getTodayKey());
  if (!entryQualifiesForStreak(map[toLocalDateKey(cursor)], minWords)) {
    cursor = addDays(cursor, -1);
  }

  let streak = 0;
  let graceUsedInWalk = false;

  for (let i = 0; i < 3650; i += 1) {
    const key = toLocalDateKey(cursor);
    const entry = map[key];
    if (entryQualifiesForStreak(entry, minWords)) {
      streak += 1;
    } else if (!graceUsedInWalk && isGraceAvailable(graceUsedAt)) {
      graceUsedInWalk = true;
      streak += 1;
    } else {
      break;
    }
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function getDailyJournalPrompt(dateKey) {
  const d = parseLocalDateKey(dateKey);
  const idx = (d.getFullYear() * 366 + d.getMonth() * 31 + d.getDate()) % JOURNAL_PROMPTS.length;
  return JOURNAL_PROMPTS[idx];
}

export function getOnThisDayEntry(entries, todayKey) {
  const today = parseLocalDateKey(todayKey);
  const priorKey = toLocalDateKey(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()));
  return (entries || []).find((entry) => entry.dateKey === priorKey && stripJournalHtml(entry.content).length > 0) || null;
}

export function hashJournalPin(pin) {
  let hash = 5381;
  for (let i = 0; i < pin.length; i += 1) {
    hash = ((hash << 5) + hash) ^ pin.charCodeAt(i);
  }
  return `j${(hash >>> 0).toString(36)}`;
}

export function sortJournalDateKeysDesc(keys) {
  return [...keys].sort((a, b) => b.localeCompare(a));
}

export function plainOffsetFromSelection(root, range) {
  if (!root || !range) return { start: 0, end: 0, text: '' };
  const preRange = document.createRange();
  preRange.selectNodeContents(root);
  preRange.setEnd(range.startContainer, range.startOffset);
  const start = preRange.toString().length;
  const text = range.toString();
  return { start, end: start + text.length, text };
}
