import { PREFS_KEY } from './constants-storage';

export function persistThemeToStorage(themeDark) {
  try {
    const existing = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...existing, themeDark }));
  } catch {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ themeDark }));
  }
}

export function applyThemeDark(dark) {
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.classList.toggle('light', !dark);
}

export function applyThemeFromPreferences(prefs) {
  const dark = prefs?.themeDark !== false;
  applyThemeDark(dark);
  persistThemeToStorage(dark);
}

export function applyThemeFromStorage() {
  try {
    const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    const dark = prefs.themeDark !== false;
    applyThemeDark(dark);
  } catch {
    applyThemeDark(true);
  }
}
