export const STOCKS_SECTIONS = [
  { id: 'overview', label: 'Overview', path: '' },
  { id: 'screener', label: 'Screener', path: 'screener' },
  { id: 'watchlist', label: 'Watchlist', path: 'watchlist' },
  { id: 'research', label: 'Research', path: 'research' },
  { id: 'earnings', label: 'Earnings', path: 'earnings' },
];

export const STOCK_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'financials', label: 'Financials' },
  { id: 'earnings', label: 'Earnings' },
  { id: 'news', label: 'News' },
  { id: 'analysis', label: 'Analysis' },
];

export const CHART_RANGES = [
  { id: '1d', label: '1D', range: '1d', interval: '5m' },
  { id: '5d', label: '5D', range: '5d', interval: '15m' },
  { id: '1mo', label: '1M', range: '1mo', interval: '1d' },
  { id: '6mo', label: '6M', range: '6mo', interval: '1d' },
  { id: 'ytd', label: 'YTD', range: 'ytd', interval: '1d' },
  { id: '1y', label: '1Y', range: '1y', interval: '1d' },
  { id: '5y', label: '5Y', range: '5y', interval: '1wk' },
  { id: 'max', label: 'MAX', range: 'max', interval: '1mo' },
];

export const SENTIMENTS = [
  { id: 'bullish', label: 'Bullish' },
  { id: 'neutral', label: 'Neutral' },
  { id: 'bearish', label: 'Bearish' },
];

export const RESEARCH_TAGS = [
  'AI', 'Semis', 'Fintech', 'Biotech', 'Value', 'Momentum',
  'Earnings watch', 'Potential buy', 'Too expensive', 'Needs work',
];

export const INDEX_SYMBOLS = [
  { symbol: '^GSPC', label: 'S&P 500' },
  { symbol: '^IXIC', label: 'Nasdaq' },
  { symbol: '^DJI', label: 'Dow' },
  { symbol: '^VIX', label: 'VIX' },
];

export function emptyStocksWorkspace() {
  return {
    version: 1,
    watchlist: [],
    research: {},
    compareSymbols: [],
    priceAlerts: [],
    updatedAt: Date.now(),
  };
}

export function normalizeStocksWorkspace(data) {
  const base = emptyStocksWorkspace();
  if (!data || typeof data !== 'object') return base;
  return {
    ...base,
    ...data,
    watchlist: Array.isArray(data.watchlist) ? data.watchlist : [],
    research: data.research && typeof data.research === 'object' ? data.research : {},
    compareSymbols: Array.isArray(data.compareSymbols) ? data.compareSymbols.slice(0, 4) : [],
    priceAlerts: Array.isArray(data.priceAlerts) ? data.priceAlerts.slice(0, 50) : [],
    updatedAt: data.updatedAt || Date.now(),
  };
}

export function emptyResearchNote() {
  return {
    thesis: '',
    bullCase: '',
    bearCase: '',
    risks: '',
    catalysts: '',
    valuation: '',
    buyConditions: '',
    sellConditions: '',
    management: '',
    competitors: '',
    sentiment: 'neutral',
    tags: [],
    pinned: false,
    updatedAt: Date.now(),
  };
}

export function normalizeResearchNote(note) {
  const base = emptyResearchNote();
  if (!note || typeof note !== 'object') return base;
  return {
    ...base,
    ...note,
    tags: Array.isArray(note.tags) ? note.tags : [],
    updatedAt: note.updatedAt || Date.now(),
  };
}

export function newWatchlistItem(symbol, name = '') {
  return {
    id: crypto.randomUUID(),
    symbol: symbol.toUpperCase(),
    name,
    note: '',
    priority: false,
    order: Date.now(),
    addedAt: Date.now(),
    shares: null,
    costBasis: null,
  };
}

const RECENT_STOCKS_KEY = 'plexity-stocks-recent';
const MAX_RECENT_STOCKS = 8;

export function loadRecentStocks() {
  try {
    const raw = localStorage.getItem(RECENT_STOCKS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT_STOCKS) : [];
  } catch {
    return [];
  }
}

export function clearRecentStocks() {
  localStorage.removeItem(RECENT_STOCKS_KEY);
}

export function trackRecentStock(symbol, name = '') {
  const sym = symbol?.toUpperCase();
  if (!sym) return;
  const prev = loadRecentStocks().filter((r) => r.symbol !== sym);
  const next = [{ symbol: sym, name: name || sym }, ...prev].slice(0, MAX_RECENT_STOCKS);
  localStorage.setItem(RECENT_STOCKS_KEY, JSON.stringify(next));
}

const PRESETS_KEY = 'plexity-stocks-screener-presets';

export const BUILTIN_SCREENER_PRESETS = [
  { id: 'large-cap', name: 'Large cap', filters: { minMarketCap: 10e9 } },
  { id: 'mid-cap', name: 'Mid cap', filters: { minMarketCap: 2e9, maxMarketCap: 10e9 } },
  { id: 'high-volume', name: 'High volume', filters: { minVolume: 5e6 } },
  { id: 'dividend', name: 'Dividend', filters: { minDivYield: 2 } },
  { id: 'tech', name: 'Technology', filters: { sector: 'Technology' } },
  { id: 'value', name: 'Value (low P/E)', filters: { maxPe: 20, minMarketCap: 1e9 } },
];

export function loadScreenerPresets() {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    const custom = raw ? JSON.parse(raw) : [];
    return [...BUILTIN_SCREENER_PRESETS, ...(Array.isArray(custom) ? custom : [])];
  } catch {
    return [...BUILTIN_SCREENER_PRESETS];
  }
}

export function saveCustomScreenerPreset(preset) {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    const custom = raw ? JSON.parse(raw) : [];
    const next = [{ id: crypto.randomUUID(), ...preset }, ...(Array.isArray(custom) ? custom : [])].slice(0, 12);
    localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
}

export function fiftyTwoWeekPosition(price, low, high) {
  if (price == null || low == null || high == null || high <= low) return null;
  return ((price - low) / (high - low)) * 100;
}

export function portfolioPl(shares, costBasis, price) {
  if (!shares || costBasis == null || price == null) return null;
  const cost = shares * costBasis;
  const value = shares * price;
  const pl = value - cost;
  const plPct = cost ? (pl / cost) * 100 : 0;
  return { value, cost, pl, plPct };
}

export function newPriceAlert(symbol, { above, below } = {}) {
  return {
    id: crypto.randomUUID(),
    symbol: symbol.toUpperCase(),
    above: above ?? null,
    below: below ?? null,
    createdAt: Date.now(),
  };
}
