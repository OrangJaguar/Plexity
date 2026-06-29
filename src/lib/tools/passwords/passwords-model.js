export const VAULT_VERSION = 1;

export const DEFAULT_FOLDERS = [
  { id: 'personal', name: 'Personal', order: 0 },
  { id: 'school', name: 'School', order: 1 },
  { id: 'work', name: 'Work', order: 2 },
  { id: 'dev', name: 'Dev', order: 3 },
  { id: 'finance', name: 'Finance', order: 4 },
];

export const LOGIN_TYPES = [
  { id: 'email', label: 'Email' },
  { id: 'username', label: 'Username' },
  { id: 'phone', label: 'Phone' },
  { id: 'custom', label: 'Custom' },
];

export function emptyVaultPayload() {
  return {
    version: VAULT_VERSION,
    settings: {
      autoLockMinutes: 5,
    },
    folders: DEFAULT_FOLDERS.map((f) => ({ ...f })),
    credentials: [],
  };
}

export function newCredential(partial = {}) {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: partial.title || '',
    url: partial.url || '',
    username: partial.username || '',
    email: partial.email || '',
    phone: partial.phone || '',
    primaryLoginType: partial.primaryLoginType || 'email',
    primaryLoginLabel: partial.primaryLoginLabel || '',
    password: partial.password || '',
    notes: partial.notes || '',
    tags: Array.isArray(partial.tags) ? partial.tags.filter(Boolean) : [],
    folderId: partial.folderId || 'personal',
    favorite: Boolean(partial.favorite),
    customFields: Array.isArray(partial.customFields) ? partial.customFields : [],
    createdAt: partial.createdAt || now,
    updatedAt: partial.updatedAt || now,
    lastUsedAt: partial.lastUsedAt || null,
  };
}

export function newCustomField(partial = {}) {
  return {
    id: crypto.randomUUID(),
    label: partial.label || '',
    value: partial.value || '',
    secret: partial.secret !== false,
  };
}

export function normalizeVaultPayload(data) {
  const base = emptyVaultPayload();
  if (!data || typeof data !== 'object') return base;

  return {
    version: VAULT_VERSION,
    settings: {
      autoLockMinutes: data.settings?.autoLockMinutes ?? 5,
    },
    folders: Array.isArray(data.folders) && data.folders.length
      ? data.folders.map(normalizeFolder)
      : base.folders,
    credentials: Array.isArray(data.credentials)
      ? data.credentials.map(normalizeCredential).sort((a, b) => b.updatedAt - a.updatedAt)
      : [],
  };
}

function normalizeFolder(f) {
  return {
    id: f.id || crypto.randomUUID(),
    name: f.name || 'Folder',
    order: typeof f.order === 'number' ? f.order : 0,
  };
}

function normalizeCredential(c) {
  return {
    id: c.id || crypto.randomUUID(),
    title: c.title || '',
    url: c.url || '',
    username: c.username || '',
    email: c.email || '',
    phone: c.phone || '',
    primaryLoginType: c.primaryLoginType || 'email',
    primaryLoginLabel: c.primaryLoginLabel || '',
    password: c.password || '',
    notes: c.notes || '',
    tags: Array.isArray(c.tags) ? c.tags.filter(Boolean) : [],
    folderId: c.folderId || 'personal',
    favorite: Boolean(c.favorite),
    customFields: Array.isArray(c.customFields)
      ? c.customFields.map((cf) => ({
        id: cf.id || crypto.randomUUID(),
        label: cf.label || '',
        value: cf.value || '',
        secret: cf.secret !== false,
      }))
      : [],
    createdAt: c.createdAt || Date.now(),
    updatedAt: c.updatedAt || Date.now(),
    lastUsedAt: c.lastUsedAt || null,
  };
}

export function primaryLoginPreview(cred) {
  switch (cred.primaryLoginType) {
    case 'username':
      return cred.username || cred.email || cred.phone || '—';
    case 'phone':
      return cred.phone || cred.email || cred.username || '—';
    case 'custom':
      return cred.primaryLoginLabel || cred.username || cred.email || '—';
    default:
      return cred.email || cred.username || cred.phone || '—';
  }
}

export function filterCredentials(credentials, { search = '', folderId = '', tag = '', favoritesOnly = false }) {
  const q = search.trim().toLowerCase();
  return credentials.filter((c) => {
    if (favoritesOnly && !c.favorite) return false;
    if (folderId && c.folderId !== folderId) return false;
    if (tag && !c.tags.includes(tag)) return false;
    if (!q) return true;
    const hay = [
      c.title,
      c.url,
      c.username,
      c.email,
      c.phone,
      c.notes,
      ...c.tags,
    ].join(' ').toLowerCase();
    return hay.includes(q);
  });
}

export function collectTags(credentials) {
  const set = new Set();
  credentials.forEach((c) => c.tags.forEach((t) => set.add(t)));
  return [...set].sort();
}

export function passwordHealthReport(credentials) {
  const passwordMap = new Map();
  const now = Date.now();
  const yearMs = 365 * 24 * 60 * 60 * 1000;

  credentials.forEach((c) => {
    if (!c.password) return;
    if (!passwordMap.has(c.password)) passwordMap.set(c.password, []);
    passwordMap.get(c.password).push(c.id);
  });

  const reused = [];
  const weak = [];
  const stale = [];
  const incomplete = [];

  credentials.forEach((c) => {
    const ids = passwordMap.get(c.password);
    if (c.password && ids && ids.length > 1) reused.push(c.id);
    if (c.password && c.password.length < 12) weak.push(c.id);
    if (c.updatedAt && now - c.updatedAt > yearMs) stale.push(c.id);
    if (!c.password || !primaryLoginPreview(c) || primaryLoginPreview(c) === '—') incomplete.push(c.id);
  });

  return {
    reused: [...new Set(reused)],
    weak: [...new Set(weak)],
    stale: [...new Set(stale)],
    incomplete: [...new Set(incomplete)],
    total: credentials.length,
  };
}

export function isWeakPassword(password) {
  if (!password) return true;
  if (password.length < 12) return true;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const variety = [hasLower, hasUpper, hasDigit].filter(Boolean).length;
  return variety < 2;
}

export function parseCredentialCsv(text) {
  const lines = (text || '').split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const rows = lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = cells[i]?.trim() || ''; });
    return row;
  });
  return { headers, rows };
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export function mapCsvRowToCredential(row) {
  const pick = (...keys) => {
    for (const k of keys) {
      const val = row[k];
      if (val) return val;
    }
    return '';
  };

  const title = pick('title', 'name', 'account', 'site') || 'Imported login';
  const email = pick('email', 'e-mail');
  const username = pick('username', 'user', 'login');

  return newCredential({
    title,
    url: pick('url', 'website', 'login_uri', 'web address'),
    username,
    email,
    password: pick('password', 'pass'),
    notes: pick('notes', 'note', 'extra', 'comments'),
    primaryLoginType: email ? 'email' : username ? 'username' : 'email',
  });
}

export function credentialsToCsv(credentials) {
  const header = 'title,url,username,email,password,notes,tags';
  const lines = credentials.map((c) => [
    csvEscape(c.title),
    csvEscape(c.url),
    csvEscape(c.username),
    csvEscape(c.email),
    csvEscape(c.password),
    csvEscape(c.notes),
    csvEscape(c.tags.join('; ')),
  ].join(','));
  return [header, ...lines].join('\n');
}

function csvEscape(value) {
  const s = value || '';
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
