/** @typedef {'movies'|'books'|'restaurants'|'foods'|'prompts'|'custom'} ListTemplateId */

export const LISTS_VERSION = 1;

export const BASE_STATUSES = [
  { id: 'want', label: 'Want to try' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'done', label: 'Done' },
  { id: 'favorite', label: 'Favorite' },
  { id: 'dropped', label: 'Dropped' },
  { id: 'archived', label: 'Archived' },
];

export const LIST_TEMPLATES = {
  movies: {
    id: 'movies',
    label: 'Movies',
    description: 'Track films to watch, ratings, and where to stream.',
    topicNames: ['movies', 'film', 'films'],
    statuses: [
      { id: 'want_to_watch', label: 'Want to watch' },
      { id: 'watching', label: 'Watching' },
      { id: 'watched', label: 'Watched' },
      { id: 'favorite', label: 'Favorite' },
      { id: 'dropped', label: 'Dropped' },
    ],
    defaultStatus: 'want_to_watch',
    extraFields: ['whereToWatch', 'genre', 'dateWatched'],
    emptyHint: 'Add a movie you have been meaning to watch.',
    exampleTitle: 'Dune: Part Two',
  },
  books: {
    id: 'books',
    label: 'Books',
    description: 'Reading list with author, progress, and notes.',
    topicNames: ['books', 'reading'],
    statuses: [
      { id: 'want_to_read', label: 'Want to read' },
      { id: 'reading', label: 'Reading' },
      { id: 'finished', label: 'Finished' },
      { id: 'favorite', label: 'Favorite' },
      { id: 'dropped', label: 'Dropped' },
    ],
    defaultStatus: 'want_to_read',
    extraFields: ['author', 'genre', 'startDate', 'finishDate'],
    emptyHint: 'Add a book you want to read next.',
    exampleTitle: 'The Dispossessed',
  },
  restaurants: {
    id: 'restaurants',
    label: 'Restaurants',
    description: 'Places to try, cuisine, and what to order.',
    topicNames: ['restaurants', 'dining', 'food spots'],
    statuses: [
      { id: 'want_to_try', label: 'Want to try' },
      { id: 'tried', label: 'Tried' },
      { id: 'favorite', label: 'Favorite' },
      { id: 'dropped', label: 'Dropped' },
    ],
    defaultStatus: 'want_to_try',
    extraFields: ['cuisine', 'priceLevel', 'location', 'bestItem', 'dateTried'],
    emptyHint: 'Add a restaurant someone recommended.',
    exampleTitle: 'Katalina\'s Cafe',
  },
  foods: {
    id: 'foods',
    label: 'Foods',
    description: 'Foods tried, favorites, and where you found them.',
    topicNames: ['foods', 'food', 'snacks'],
    statuses: [
      { id: 'want_to_try', label: 'Want to try' },
      { id: 'tried', label: 'Tried' },
      { id: 'favorite', label: 'Favorite' },
    ],
    defaultStatus: 'want_to_try',
    extraFields: ['whereFound'],
    emptyHint: 'Save a food you want to remember.',
    exampleTitle: 'Matcha mochi',
  },
  prompts: {
    id: 'prompts',
    label: 'Prompts',
    description: 'Reusable prompts with platform, results, and revisions.',
    topicNames: ['prompts', 'prompt ideas'],
    statuses: [
      { id: 'saved', label: 'Saved' },
      { id: 'tested', label: 'Tested' },
      { id: 'works_well', label: 'Works well' },
      { id: 'archived', label: 'Archived' },
    ],
    defaultStatus: 'saved',
    extraFields: ['category', 'platform', 'promptText', 'resultRating'],
    emptyHint: 'Save a prompt you want to reuse later.',
    exampleTitle: 'Explain like a tutor',
  },
  custom: {
    id: 'custom',
    label: 'Custom',
    description: 'Flexible list with core fields only.',
    topicNames: [],
    statuses: BASE_STATUSES,
    defaultStatus: 'want',
    extraFields: [],
    emptyHint: 'Add your first item to this list.',
    exampleTitle: 'New item',
  },
};

export const DEFAULT_TOPICS = [
  { name: 'Movies', icon: 'film' },
  { name: 'Books', icon: 'book' },
  { name: 'Restaurants', icon: 'utensils' },
  { name: 'Foods', icon: 'apple' },
  { name: 'Prompts', icon: 'sparkles' },
  { name: 'Ideas', icon: 'lightbulb' },
  { name: 'Places', icon: 'map-pin' },
  { name: 'Articles', icon: 'newspaper' },
];

export const SAVED_VIEWS = [
  { id: 'all', label: 'All' },
  { id: 'to_try', label: 'To try' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'recently_done', label: 'Recently completed' },
  { id: 'top_rated', label: 'Highest rated' },
  { id: 'needs_review', label: 'Needs review' },
];

export const SORT_OPTIONS = [
  { id: 'manual', label: 'Manual order' },
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'updated', label: 'Recently updated' },
  { id: 'alpha', label: 'A → Z' },
  { id: 'rating', label: 'Highest rated' },
  { id: 'status', label: 'Status' },
];

const TEMPLATE_TITLE_PATTERNS = [
  { templateId: 'movies', pattern: /\b(movie|film|watch|watchlist|cinema)\b/i },
  { templateId: 'books', pattern: /\b(book|read|reading|novel)\b/i },
  { templateId: 'restaurants', pattern: /\b(restaurant|dining|eats|brunch|dinner)\b/i },
  { templateId: 'foods', pattern: /\b(food|snack|recipe|dish)\b/i },
  { templateId: 'prompts', pattern: /\b(prompt|prompts|llm|chatgpt|gemini|claude)\b/i },
];

export function emptyListsWorkspace() {
  const now = Date.now();
  const topics = DEFAULT_TOPICS.map((t, i) => newTopic(t.name, { icon: t.icon, order: i, createdAt: now }));
  return {
    version: LISTS_VERSION,
    topics,
    lists: [],
    items: [],
    ui: {
      activeTopicId: topics[0]?.id ?? null,
      activeListId: null,
      viewByList: {},
    },
    updatedAt: now,
  };
}

export function newTopic(name, partial = {}) {
  return {
    id: crypto.randomUUID(),
    name: (name || 'New topic').trim(),
    icon: partial.icon || 'folder',
    order: partial.order ?? Date.now(),
    createdAt: partial.createdAt ?? Date.now(),
    ...partial,
  };
}

export function newList(topicId, title, partial = {}) {
  const templateId = partial.templateId || 'custom';
  const template = LIST_TEMPLATES[templateId] || LIST_TEMPLATES.custom;
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    topicId,
    title: (title || 'New list').trim(),
    description: partial.description || '',
    templateId,
    icon: partial.icon || templateId,
    order: partial.order ?? now,
    createdAt: now,
    updatedAt: now,
  };
}

export function newItem(listId, title, partial = {}) {
  const now = Date.now();
  const templateId = partial.templateId || 'custom';
  const template = LIST_TEMPLATES[templateId] || LIST_TEMPLATES.custom;
  return {
    id: crypto.randomUUID(),
    listId,
    title: (title || '').trim(),
    subtitle: partial.subtitle || '',
    notes: partial.notes || '',
    tags: Array.isArray(partial.tags) ? partial.tags : [],
    status: partial.status || template.defaultStatus,
    rating: partial.rating ?? null,
    isFavorite: !!partial.isFavorite,
    link: partial.link || '',
    dateAdded: partial.dateAdded ?? now,
    updatedAt: partial.updatedAt ?? now,
    targetDate: partial.targetDate ?? null,
    completedDate: partial.completedDate ?? null,
    extra: partial.extra && typeof partial.extra === 'object' ? { ...partial.extra } : {},
    order: partial.order ?? now,
    archived: !!partial.archived,
  };
}

export function normalizeListsWorkspace(data) {
  const base = emptyListsWorkspace();
  if (!data || typeof data !== 'object') return base;

  const topics = Array.isArray(data.topics) && data.topics.length
    ? data.topics.map(normalizeTopic)
    : base.topics;

  const lists = Array.isArray(data.lists) ? data.lists.map(normalizeList) : [];
  const items = Array.isArray(data.items) ? data.items.map(normalizeItem) : [];

  const ui = {
    activeTopicId: data.ui?.activeTopicId ?? topics[0]?.id ?? null,
    activeListId: data.ui?.activeListId ?? null,
    viewByList: data.ui?.viewByList && typeof data.ui.viewByList === 'object' ? data.ui.viewByList : {},
  };

  if (ui.activeTopicId && !topics.some((t) => t.id === ui.activeTopicId)) {
    ui.activeTopicId = topics[0]?.id ?? null;
  }
  if (ui.activeListId && !lists.some((l) => l.id === ui.activeListId)) {
    ui.activeListId = null;
  }

  return {
    version: LISTS_VERSION,
    topics,
    lists,
    items,
    ui,
    updatedAt: data.updatedAt || Date.now(),
  };
}

function normalizeTopic(t) {
  return {
    id: t.id || crypto.randomUUID(),
    name: (t.name || 'Topic').trim(),
    icon: t.icon || 'folder',
    order: typeof t.order === 'number' ? t.order : Date.now(),
    createdAt: t.createdAt || Date.now(),
  };
}

function normalizeList(l) {
  const templateId = LIST_TEMPLATES[l.templateId] ? l.templateId : 'custom';
  return {
    id: l.id || crypto.randomUUID(),
    topicId: l.topicId,
    title: (l.title || 'List').trim(),
    description: l.description || '',
    templateId,
    icon: l.icon || templateId,
    order: typeof l.order === 'number' ? l.order : Date.now(),
    createdAt: l.createdAt || Date.now(),
    updatedAt: l.updatedAt || Date.now(),
  };
}

function normalizeItem(item) {
  return {
    id: item.id || crypto.randomUUID(),
    listId: item.listId,
    title: (item.title || '').trim(),
    subtitle: item.subtitle || '',
    notes: item.notes || '',
    tags: Array.isArray(item.tags) ? item.tags.filter(Boolean) : [],
    status: item.status || 'want',
    rating: item.rating == null ? null : Number(item.rating),
    isFavorite: !!item.isFavorite,
    link: item.link || '',
    dateAdded: item.dateAdded || Date.now(),
    updatedAt: item.updatedAt || Date.now(),
    targetDate: item.targetDate ?? null,
    completedDate: item.completedDate ?? null,
    extra: item.extra && typeof item.extra === 'object' ? item.extra : {},
    order: typeof item.order === 'number' ? item.order : Date.now(),
    archived: !!item.archived,
  };
}

export function getTemplate(templateId) {
  return LIST_TEMPLATES[templateId] || LIST_TEMPLATES.custom;
}

export function getListStatuses(templateId) {
  return getTemplate(templateId).statuses;
}

export function getStatusLabel(templateId, statusId) {
  const match = getListStatuses(templateId).find((s) => s.id === statusId);
  return match?.label || statusId?.replace(/_/g, ' ') || '—';
}

export function suggestTemplate({ topicName = '', listTitle = '' }) {
  const topicLower = topicName.trim().toLowerCase();
  for (const tpl of Object.values(LIST_TEMPLATES)) {
    if (tpl.id === 'custom') continue;
    if (tpl.topicNames.some((n) => topicLower.includes(n) || n.includes(topicLower))) {
      return tpl.id;
    }
  }
  const hay = `${topicName} ${listTitle}`;
  for (const { templateId, pattern } of TEMPLATE_TITLE_PATTERNS) {
    if (pattern.test(hay)) return templateId;
  }
  return 'custom';
}

export function topicTemplateHint(topicName) {
  return suggestTemplate({ topicName, listTitle: '' });
}

export function parseTags(raw) {
  return (raw || '')
    .split(/[,#]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 12);
}

export function collectAllTags(items) {
  const set = new Set();
  items.forEach((item) => item.tags.forEach((t) => set.add(t)));
  return [...set].sort();
}

const TO_TRY_STATUS_IDS = new Set([
  'want', 'want_to_watch', 'want_to_read', 'want_to_try', 'saved',
]);

const DONE_STATUS_IDS = new Set([
  'done', 'watched', 'finished', 'tried', 'works_well',
]);

export function applySavedView(items, viewId, templateId) {
  if (viewId === 'all' || !viewId) return items.filter((i) => !i.archived);

  if (viewId === 'to_try') {
    return items.filter((i) => !i.archived && TO_TRY_STATUS_IDS.has(i.status));
  }
  if (viewId === 'favorites') {
    return items.filter((i) => !i.archived && (i.isFavorite || i.status === 'favorite'));
  }
  if (viewId === 'recently_done') {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return items.filter((i) => !i.archived && i.completedDate && i.completedDate >= cutoff);
  }
  if (viewId === 'top_rated') {
    return items.filter((i) => !i.archived && i.rating != null && i.rating >= 4);
  }
  if (viewId === 'needs_review') {
    return items.filter((i) => !i.archived && !i.notes?.trim() && DONE_STATUS_IDS.has(i.status));
  }
  return items.filter((i) => !i.archived);
}

export function sortItems(items, sortId) {
  const list = [...items];
  switch (sortId) {
    case 'oldest':
      return list.sort((a, b) => a.dateAdded - b.dateAdded);
    case 'updated':
      return list.sort((a, b) => b.updatedAt - a.updatedAt);
    case 'alpha':
      return list.sort((a, b) => a.title.localeCompare(b.title));
    case 'rating':
      return list.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    case 'status':
      return list.sort((a, b) => a.status.localeCompare(b.status));
    case 'newest':
      return list.sort((a, b) => b.dateAdded - a.dateAdded);
    case 'manual':
    default:
      return list.sort((a, b) => a.order - b.order);
  }
}

export function filterItems(items, { status, tag, query }) {
  let out = items;
  if (status) out = out.filter((i) => i.status === status);
  if (tag) out = out.filter((i) => i.tags.includes(tag));
  if (query?.trim()) {
    const q = query.trim().toLowerCase();
    out = out.filter((i) =>
      i.title.toLowerCase().includes(q)
      || i.subtitle.toLowerCase().includes(q)
      || i.notes.toLowerCase().includes(q)
      || i.tags.some((t) => t.includes(q)));
  }
  return out;
}

export function duplicateItem(item) {
  const copy = normalizeItem({
    ...item,
    id: crypto.randomUUID(),
    title: `${item.title} (copy)`,
    dateAdded: Date.now(),
    updatedAt: Date.now(),
    order: Date.now(),
  });
  if (item.extra?.promptText) {
    copy.extra = { ...item.extra };
  }
  return copy;
}

export function listsForTopic(lists, topicId) {
  return lists
    .filter((l) => l.topicId === topicId)
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

export function itemsForList(items, listId) {
  return items.filter((i) => i.listId === listId);
}

export function countItemsInList(items, listId) {
  return items.filter((i) => i.listId === listId && !i.archived).length;
}
