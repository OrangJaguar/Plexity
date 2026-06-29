import { create } from 'zustand';

const TOOLS_CHROME_STORAGE_KEY = 'veridian.toolsChromeCollapsed';

function readToolsChromeCollapsed() {
  try {
    return localStorage.getItem(TOOLS_CHROME_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeToolsChromeCollapsed(collapsed) {
  try {
    localStorage.setItem(TOOLS_CHROME_STORAGE_KEY, collapsed ? 'true' : 'false');
  } catch {
    /* ignore */
  }
}

export const useUiStore = create((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  immersiveChrome: false,
  setImmersiveChrome: (immersive) => set({ immersiveChrome: immersive }),
  toolsChromeCollapsed: readToolsChromeCollapsed(),
  setToolsChromeCollapsed: (collapsed) => {
    writeToolsChromeCollapsed(collapsed);
    set({ toolsChromeCollapsed: collapsed });
  },
  lastPinnedToolId: null,
  setLastPinnedToolId: (toolId) => {
    set({ lastPinnedToolId: toolId });
    if (toolId) {
      window.setTimeout(() => {
        set((state) => (state.lastPinnedToolId === toolId
          ? { lastPinnedToolId: null }
          : state));
      }, 480);
    }
  },
}));
