const STORAGE_KEY = 'plexity.unitsUi';

const DEFAULTS = {
  pinnedPairs: [],
  history: [],
};

const MAX_HISTORY = 30;

export function readUnitsUiPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function writeUnitsUiPrefs(patch) {
  const next = { ...readUnitsUiPrefs(), ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
  return next;
}

export function addPinnedPair(pair) {
  const prefs = readUnitsUiPrefs();
  const exists = prefs.pinnedPairs.some(
    (p) => p.category === pair.category && p.from === pair.from && p.to === pair.to,
  );
  if (exists) return prefs;
  const pinnedPairs = [{ id: crypto.randomUUID(), ...pair }, ...prefs.pinnedPairs].slice(0, 12);
  return writeUnitsUiPrefs({ pinnedPairs });
}

export function removePinnedPair(id) {
  const prefs = readUnitsUiPrefs();
  return writeUnitsUiPrefs({
    pinnedPairs: prefs.pinnedPairs.filter((p) => p.id !== id),
  });
}

export function addHistoryEntry(entry) {
  const prefs = readUnitsUiPrefs();
  const key = `${entry.category}:${entry.amount}:${entry.from}:${entry.to}`;
  const filtered = prefs.history.filter(
    (h) => `${h.category}:${h.amount}:${h.from}:${h.to}` !== key,
  );
  const history = [{ id: crypto.randomUUID(), at: Date.now(), ...entry }, ...filtered].slice(0, MAX_HISTORY);
  return writeUnitsUiPrefs({ history });
}

export function clearHistory() {
  return writeUnitsUiPrefs({ history: [] });
}

export function removeHistoryEntry(id) {
  const prefs = readUnitsUiPrefs();
  return writeUnitsUiPrefs({
    history: prefs.history.filter((h) => h.id !== id),
  });
}
