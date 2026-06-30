/**
 * Yahoo Finance market data (unofficial). Dev proxy for public endpoints; authenticated via toolsMarketData.
 */
import { base44 } from '@/api/base44Client';

const UA = 'Mozilla/5.0 (compatible; Plexity/1.0)';

const SUMMARY_MODULES = [
  'price', 'summaryDetail', 'defaultKeyStatistics', 'assetProfile',
  'financialData', 'earnings', 'calendarEvents', 'earningsHistory',
  'recommendationTrend',
  'incomeStatementHistory', 'incomeStatementHistoryQuarterly',
  'cashflowStatementHistory', 'cashflowStatementHistoryQuarterly',
  'balanceSheetHistory', 'balanceSheetHistoryQuarterly',
].join(',');

const CORE_MODULES = 'price,summaryDetail,defaultKeyStatistics,assetProfile,financialData,calendarEvents,earningsHistory,earnings,recommendationTrend';

/** Unwrap Yahoo `{ raw, fmt }` wrappers and coerce to a finite number. */
function yahooNum(value) {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'object') {
    if (value.raw != null) return yahooNum(value.raw);
    if (value.fmt != null) return yahooNum(value.fmt);
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function isDevProxy() {
  return import.meta.env.DEV;
}

function needsYahooAuth(path, method = 'GET') {
  if (path.includes('/quoteSummary/')) return true;
  if (method === 'POST' && path.includes('/screener') && !path.includes('/predefined/')) return true;
  return false;
}

async function yahooFetchRemote(path, { method = 'GET', body } = {}) {
  const res = await base44.functions.invoke('toolsMarketData', {
    action: 'yahoo',
    path,
    method,
    body,
  });
  if (res?.error) throw new Error(res.error.message || 'Market data unavailable');
  return res.data;
}

async function yahooGet(path) {
  if (isDevProxy()) {
    const res = await fetch(`/yahoo-finance${path}`, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`Market data unavailable (${res.status})`);
    return res.json();
  }
  return yahooFetchRemote(path, { method: 'GET' });
}

async function yahooPost(path, body) {
  if (isDevProxy()) {
    const res = await fetch(`/yahoo-finance${path}`, {
      method: 'POST',
      headers: { 'User-Agent': UA, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Market data unavailable (${res.status})`);
    return res.json();
  }
  return yahooFetchRemote(path, { method: 'POST', body });
}

function metaStatsFromChart(meta) {
  if (!meta) return {};
  return {
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
    volume: meta.regularMarketVolume,
    dayHigh: meta.regularMarketDayHigh,
    dayLow: meta.regularMarketDayLow,
  };
}

function getEtSession(ts) {
  const et = new Date(new Date(ts * 1000).toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const m = et.getHours() * 60 + et.getMinutes();
  if (m >= 4 * 60 && m < 9 * 60 + 30) return 'pre';
  if (m >= 9 * 60 + 30 && m < 16 * 60) return 'regular';
  if (m >= 16 * 60 && m < 20 * 60) return 'after';
  return 'other';
}

function formatChartTimeLabel(ts, intraday) {
  const d = new Date(ts * 1000);
  if (intraday) {
    return d.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function compressIntradayPoints(points) {
  const pre = points.filter((p) => p.session === 'pre');
  const reg = points.filter((p) => p.session === 'regular');
  const aft = points.filter((p) => p.session === 'after');
  const PRE_W = 0.18;
  const REG_W = 0.64;
  const AFT_W = 0.18;

  const place = (arr, start, width) => {
    if (!arr.length) return [];
    const step = arr.length > 1 ? width / (arr.length - 1) : 0;
    return arr.map((p, i) => ({
      ...p,
      cx: start + i * step,
      label: formatChartTimeLabel(p.t, true),
    }));
  };

  const placed = [
    ...place(pre, 0, PRE_W),
    ...place(reg, PRE_W, REG_W),
    ...place(aft, PRE_W + REG_W, AFT_W),
  ];

  return {
    points: placed,
    sessions: {
      pre: { start: 0, end: PRE_W },
      regular: { start: PRE_W, end: PRE_W + REG_W },
      after: { start: PRE_W + REG_W, end: PRE_W + REG_W + AFT_W },
    },
  };
}

function parseConsensus(recTrend, financial) {
  const trend = recTrend?.trend?.[0];
  if (!trend && !financial?.targetMeanPrice) return null;
  const bullish = (trend?.strongBuy || 0) + (trend?.buy || 0);
  const bearish = (trend?.strongSell || 0) + (trend?.sell || 0);
  const neutral = trend?.hold || 0;
  const total = bullish + bearish + neutral;
  return {
    bullish,
    bearish,
    neutral,
    total,
    rating: financial?.recommendationKey,
    targetLow: yahooNum(financial?.targetLowPrice),
    targetHigh: yahooNum(financial?.targetHighPrice),
    targetMean: yahooNum(financial?.targetMeanPrice),
    analysts: yahooNum(financial?.numberOfAnalystOpinions),
  };
}

function profileFromChartMeta(meta) {
  if (!meta) return {};
  return {
    sector: meta.sector,
    industry: meta.industry,
    description: meta.longBusinessSummary,
  };
}

function parseChartQuote(data, symbol) {
  const result = data?.chart?.result?.[0];
  const meta = result?.meta;
  if (!meta) return null;

  const price = meta.regularMarketPrice ?? meta.previousClose;
  const prev = meta.chartPreviousClose ?? meta.previousClose;
  const change = prev ? ((price - prev) / prev) * 100 : 0;
  const changeAmount = prev ? price - prev : 0;
  const quotes = result?.indicators?.quote?.[0] || {};
  const opens = quotes.open || [];
  const dayOpen = meta.regularMarketOpen ?? opens.find((o) => o != null);

  return {
    symbol: symbol.toUpperCase(),
    name: meta.shortName || meta.longName || symbol,
    price,
    change,
    changeAmount,
    volume: meta.regularMarketVolume,
    exchange: meta.exchangeName || meta.fullExchangeName,
    currency: meta.currency,
    marketState: meta.marketState,
    updatedAt: meta.regularMarketTime || Date.now() / 1000,
    dayOpen,
    previousClose: prev,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
    stats: metaStatsFromChart(meta),
    profile: profileFromChartMeta(meta),
  };
}

function parseSparkRow(row) {
  const resp = row?.response?.[0];
  const meta = resp?.meta;
  if (!meta?.regularMarketPrice) return null;

  const price = meta.regularMarketPrice;
  const prev = meta.chartPreviousClose ?? meta.previousClose;
  const change = prev ? ((price - prev) / prev) * 100 : 0;
  const quotes = resp?.indicators?.quote?.[0] || {};
  const closes = (quotes.close || []).filter((c) => c != null);
  const opens = quotes.open || [];
  const dayOpen = meta.regularMarketOpen ?? opens.find((o) => o != null);

  return {
    symbol: (row.symbol || meta.symbol || '').toUpperCase(),
    name: meta.shortName || meta.longName || row.symbol,
    price,
    change,
    changeAmount: prev ? price - prev : null,
    volume: meta.regularMarketVolume,
    dayOpen,
    previousClose: prev,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
    dayHigh: meta.regularMarketDayHigh,
    dayLow: meta.regularMarketDayLow,
    sparkline: closes.slice(-40),
    stats: metaStatsFromChart(meta),
  };
}

/** Batch quotes + mini sparklines (faster for watchlists). */
export async function fetchSparkQuotes(symbols = [], range = '5d', interval = '15m') {
  const unique = [...new Set(symbols.map((s) => s?.trim().toUpperCase()).filter(Boolean))];
  if (!unique.length) return [];

  const chunks = [];
  for (let i = 0; i < unique.length; i += 25) {
    chunks.push(unique.slice(i, i + 25));
  }

  const results = [];
  for (const chunk of chunks) {
    try {
      const data = await yahooGet(
        `/v7/finance/spark?symbols=${chunk.map(encodeURIComponent).join(',')}&range=${range}&interval=${interval}`,
      );
      (data?.spark?.result || []).forEach((row) => {
        const parsed = parseSparkRow(row);
        if (parsed) results.push(parsed);
      });
    } catch {
      const fallback = await Promise.all(chunk.map((sym) => fetchQuote(sym).catch(() => null)));
      fallback.filter(Boolean).forEach((q) => results.push({ ...q, sparkline: [] }));
    }
  }
  return results;
}

export async function fetchQuote(symbol) {
  const sym = symbol.trim().toUpperCase();
  const data = await yahooGet(`/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`);
  return parseChartQuote(data, sym);
}

export async function fetchQuotes(symbols = []) {
  if (symbols.length > 1) {
    try {
      return await fetchSparkQuotes(symbols);
    } catch {
      /* fall through */
    }
  }
  const unique = [...new Set(symbols.map((s) => s?.trim().toUpperCase()).filter(Boolean))];
  const results = await Promise.all(
    unique.map(async (sym) => {
      try {
        return await fetchQuote(sym);
      } catch {
        return { symbol: sym, price: null, change: null, name: sym };
      }
    }),
  );
  return results;
}

export async function fetchChart(symbol, range = '1y', interval = '1d') {
  const sym = symbol.trim().toUpperCase();
  const intraday = range === '1d';
  const chartInterval = intraday ? '5m' : interval;
  const includePrePost = intraday;
  const data = await yahooGet(
    `/v8/finance/chart/${encodeURIComponent(sym)}?interval=${chartInterval}&range=${range}&includePrePost=${includePrePost}`,
  );
  const result = data?.chart?.result?.[0];
  if (!result) return { points: [], meta: null, sessions: null, intraday: false };

  const timestamps = result.timestamp || [];
  const quotes = result.indicators?.quote?.[0] || {};
  const closes = quotes.close || [];
  const volumes = quotes.volume || [];
  const opens = quotes.open || [];
  const meta = result.meta || {};

  let points = timestamps.map((t, i) => ({
    t,
    close: closes[i],
    open: opens[i],
    volume: volumes[i],
    session: intraday ? getEtSession(t) : 'regular',
  })).filter((p) => p.close != null && p.session !== 'other');

  const prevClose = meta.chartPreviousClose ?? meta.previousClose;
  const dayOpen = meta.regularMarketOpen
    ?? opens.find((o) => o != null)
    ?? prevClose
    ?? points[0]?.open
    ?? points[0]?.close;

  let sessions = null;
  if (intraday && points.length) {
    const compressed = compressIntradayPoints(points);
    points = compressed.points;
    sessions = compressed.sessions;
  } else {
    points = points.map((p) => ({
      ...p,
      cx: p.t,
      label: formatChartTimeLabel(p.t, false),
    }));
  }

  const lastClose = points[points.length - 1]?.close;
  const ref = prevClose ?? dayOpen;
  const isUp = lastClose != null && ref != null ? lastClose >= ref : true;

  return {
    currency: meta.currency,
    points,
    sessions,
    intraday,
    meta: { ...meta, dayOpen, prevClose, isUp },
  };
}

export async function searchSymbols(query) {
  const q = query?.trim();
  if (!q) return [];
  const data = await yahooGet(
    `/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=12&newsCount=0`,
  );
  return (data?.quotes || [])
    .filter((row) => row.symbol && (row.quoteType === 'EQUITY' || row.quoteType === 'ETF'))
    .map((row) => ({
      symbol: row.symbol.toUpperCase(),
      name: row.shortname || row.longname || row.symbol,
      exchange: row.exchDisp || row.exchange,
      type: row.quoteType,
    }));
}

export async function searchSymbolsWithQuotes(query) {
  const rows = await searchSymbols(query);
  if (!rows.length) return rows;
  try {
    const quotes = await fetchSparkQuotes(rows.map((r) => r.symbol), '1d', '5m');
    const map = Object.fromEntries(quotes.map((q) => [q.symbol, q]));
    return rows.map((r) => ({
      ...r,
      price: map[r.symbol]?.price ?? null,
      change: map[r.symbol]?.change ?? null,
    }));
  } catch {
    return rows;
  }
}

export async function fetchMovers(scrId = 'day_gainers', count = 25) {
  const data = await yahooGet(
    `/v1/finance/screener/predefined/saved?scrIds=${scrId}&count=${count}`,
  );
  const quotes = data?.finance?.result?.[0]?.quotes || [];
  return quotes.map(parseScreenerQuote);
}

function parseScreenerQuote(q) {
  return {
    symbol: q.symbol,
    name: q.shortName || q.longName || q.symbol,
    price: q.regularMarketPrice,
    change: q.regularMarketChangePercent,
    changeAmount: q.regularMarketChange,
    volume: q.regularMarketVolume,
    marketCap: q.marketCap,
    pe: q.trailingPE ?? q.forwardPE,
    sector: q.sector,
    industry: q.industry,
  };
}

export async function runScreener(filters = {}, count = 200) {
  const operands = [];

  if (filters.sector && filters.sector !== 'all') {
    operands.push({ operator: 'eq', operands: ['sector', filters.sector] });
  }
  if (filters.exchange && filters.exchange !== 'all') {
    operands.push({ operator: 'eq', operands: ['exchange', filters.exchange] });
  }
  if (filters.minMarketCap) {
    operands.push({ operator: 'gt', operands: ['intradaymarketcap', filters.minMarketCap] });
  }
  if (filters.maxMarketCap) {
    operands.push({ operator: 'lt', operands: ['intradaymarketcap', filters.maxMarketCap] });
  }
  if (filters.minPrice) {
    operands.push({ operator: 'gt', operands: ['intradayprice', filters.minPrice] });
  }
  if (filters.maxPrice) {
    operands.push({ operator: 'lt', operands: ['intradayprice', filters.maxPrice] });
  }
  if (filters.minVolume) {
    operands.push({ operator: 'gt', operands: ['dayvolume', filters.minVolume] });
  }
  if (filters.minPe) {
    operands.push({ operator: 'gt', operands: ['peratio.lasttwelvemonths', filters.minPe] });
  }
  if (filters.maxPe) {
    operands.push({ operator: 'lt', operands: ['peratio.lasttwelvemonths', filters.maxPe] });
  }
  if (filters.minDivYield) {
    operands.push({ operator: 'gt', operands: ['dividendyield', filters.minDivYield / 100] });
  }

  const body = {
    size: count,
    offset: 0,
    sortField: filters.sortField || 'percentchange',
    sortType: filters.sortType || 'DESC',
    quoteType: 'EQUITY',
    query: operands.length
      ? { operator: 'AND', operands }
      : { operator: 'AND', operands: [{ operator: 'gt', operands: ['intradaymarketcap', 100e6] }] },
  };

  try {
    const data = await yahooPost('/v1/finance/screener', body);
    const quotes = data?.finance?.result?.[0]?.quotes || [];
    return quotes.map(parseScreenerQuote);
  } catch {
    const [gainers, active] = await Promise.all([
      fetchMovers('day_gainers', Math.min(count, 50)),
      fetchMovers('most_actives', Math.min(count, 50)),
    ]);
    const seen = new Set();
    return [...gainers, ...active].filter((r) => {
      if (seen.has(r.symbol)) return false;
      seen.add(r.symbol);
      return true;
    }).slice(0, count);
  }
}

function mergeSummaryWithChart(summary, chartQuote) {
  if (!chartQuote) return summary;
  return {
    ...summary,
    price: summary.price ?? chartQuote.price,
    change: summary.change ?? chartQuote.change,
    changeAmount: summary.changeAmount ?? chartQuote.changeAmount,
    name: summary.name || chartQuote.name,
    exchange: summary.exchange || chartQuote.exchange,
    profile: {
      ...chartQuote.profile,
      ...summary.profile,
      description: summary.profile?.description || chartQuote.profile?.description,
    },
    stats: {
      ...chartQuote.stats,
      ...summary.stats,
      fiftyTwoWeekHigh: summary.stats?.fiftyTwoWeekHigh ?? chartQuote.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: summary.stats?.fiftyTwoWeekLow ?? chartQuote.fiftyTwoWeekLow,
      volume: summary.stats?.volume ?? chartQuote.volume,
    },
  };
}

function buildEnrichedSummary(chartQuote, sym) {
  return {
    symbol: sym,
    name: chartQuote.name || sym,
    exchange: chartQuote.exchange,
    price: chartQuote.price,
    change: chartQuote.change,
    changeAmount: chartQuote.changeAmount,
    updatedAt: chartQuote.updatedAt,
    profile: chartQuote.profile || {},
    stats: {
      ...chartQuote.stats,
      volume: chartQuote.volume,
      fiftyTwoWeekHigh: chartQuote.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: chartQuote.fiftyTwoWeekLow,
    },
    earnings: { history: [] },
    financials: { annual: [], quarterly: [] },
  };
}

function parseQuoteSummary(data, sym) {
  const r = data?.quoteSummary?.result?.[0];
  if (!r) throw new Error('No data for symbol');

  const price = r.price || {};
  const summary = r.summaryDetail || {};
  const stats = r.defaultKeyStatistics || {};
  const profile = r.assetProfile || {};
  const financial = r.financialData || {};
  const calendar = r.calendarEvents || {};
  const earningsHist = r.earningsHistory?.history || [];
  const earnings = r.earnings?.earningsChart || {};

  const regular = yahooNum(price.regularMarketPrice);
  const prev = yahooNum(price.regularMarketPreviousClose) ?? yahooNum(summary.previousClose);
  const changePct = prev ? ((regular - prev) / prev) * 100 : 0;

  return {
    symbol: sym,
    name: price.shortName || price.longName || sym,
    exchange: price.exchangeName || price.exchange,
    price: regular,
    change: changePct,
    changeAmount: regular != null && prev != null ? regular - prev : null,
    currency: price.currency,
    marketState: price.marketState,
    updatedAt: price.regularMarketTime,
    preMarketPrice: yahooNum(price.preMarketPrice),
    preMarketChange: yahooNum(price.preMarketChangePercent),
    postMarketPrice: yahooNum(price.postMarketPrice),
    postMarketChange: yahooNum(price.postMarketChangePercent),

    profile: {
      sector: profile.sector,
      industry: profile.industry,
      website: profile.website,
      country: profile.country,
      city: profile.city,
      state: profile.state,
      employees: profile.fullTimeEmployees,
      ceo: profile.companyOfficers?.[0]?.name,
      description: profile.longBusinessSummary,
      ipoDate: stats.ipoDate?.raw,
    },

    stats: {
      marketCap: yahooNum(summary.marketCap) ?? yahooNum(stats.marketCap),
      enterpriseValue: yahooNum(stats.enterpriseValue),
      pe: yahooNum(summary.trailingPE) ?? yahooNum(stats.trailingPE) ?? yahooNum(financial.forwardPE),
      forwardPe: yahooNum(summary.forwardPE),
      eps: yahooNum(stats.trailingEps) ?? yahooNum(financial.epsTrailingTwelveMonths),
      beta: yahooNum(summary.beta) ?? yahooNum(stats.beta),
      dividendYield: yahooNum(summary.dividendYield),
      fiftyTwoWeekLow: yahooNum(summary.fiftyTwoWeekLow),
      fiftyTwoWeekHigh: yahooNum(summary.fiftyTwoWeekHigh),
      fiftyDayAverage: yahooNum(summary.fiftyDayAverage),
      twoHundredDayAverage: yahooNum(summary.twoHundredDayAverage),
      avgVolume: yahooNum(summary.averageVolume) ?? yahooNum(summary.averageVolume10days),
      volume: yahooNum(price.regularMarketVolume),
      open: yahooNum(price.regularMarketOpen) ?? yahooNum(summary.regularMarketOpen),
      previousClose: prev,
      dayHigh: yahooNum(price.regularMarketDayHigh) ?? yahooNum(summary.dayHigh),
      dayLow: yahooNum(price.regularMarketDayLow) ?? yahooNum(summary.dayLow),
      revenue: yahooNum(financial.totalRevenue),
      grossMargins: yahooNum(financial.grossMargins),
      operatingMargins: yahooNum(financial.operatingMargins),
      profitMargins: yahooNum(financial.profitMargins),
      revenueGrowth: yahooNum(financial.revenueGrowth),
      earningsGrowth: yahooNum(financial.earningsGrowth),
      freeCashflow: yahooNum(financial.freeCashflow),
      operatingCashflow: yahooNum(financial.operatingCashflow),
      totalCash: yahooNum(financial.totalCash),
      totalDebt: yahooNum(financial.totalDebt),
      returnOnEquity: yahooNum(financial.returnOnEquity),
      targetMeanPrice: yahooNum(financial.targetMeanPrice),
      recommendationKey: financial.recommendationKey,
    },

    consensus: parseConsensus(r.recommendationTrend, financial),

    earnings: {
      nextDate: calendar.earnings?.earningsDate?.[0]?.raw,
      nextDateFmt: calendar.earnings?.earningsDate?.[0]?.fmt,
      epsAvg: calendar.earnings?.earningsAverage?.raw,
      epsLow: calendar.earnings?.earningsLow?.raw,
      epsHigh: calendar.earnings?.earningsHigh?.raw,
      revenueAvg: calendar.earnings?.revenueAverage?.raw,
      history: earningsHist.map((h) => ({
        quarter: h.quarter?.fmt,
        epsActual: h.epsActual?.raw,
        epsEstimate: h.epsEstimate?.raw,
        surprisePct: h.surprisePercent?.raw,
        revenueActual: h.revenueActual?.raw,
        revenueEstimate: h.revenueEstimate?.raw,
      })),
      quarterly: earnings.quarterly || [],
    },

    financials: {
      annual: parseStatements(r.incomeStatementHistory?.incomeStatementHistory),
      quarterly: parseStatements(r.incomeStatementHistoryQuarterly?.incomeStatementHistory),
      cashflowAnnual: parseCashflow(r.cashflowStatementHistory?.cashflowStatements),
      cashflowQuarterly: parseCashflow(r.cashflowStatementHistoryQuarterly?.cashflowStatements),
      balanceAnnual: parseBalance(r.balanceSheetHistory?.balanceSheetStatements),
    },
  };
}

export async function fetchQuoteSummary(symbol) {
  const sym = symbol.trim().toUpperCase();

  const chartQuote = await fetchQuote(sym).catch(() => null);

  const tryModules = [SUMMARY_MODULES, CORE_MODULES];
  for (const modules of tryModules) {
    try {
      const data = await yahooGet(
        `/v10/finance/quoteSummary/${encodeURIComponent(sym)}?modules=${modules}`,
      );
      const parsed = parseQuoteSummary(data, sym);
      return mergeSummaryWithChart(parsed, chartQuote);
    } catch {
      /* try next */
    }
  }

  if (chartQuote?.price) {
    return buildEnrichedSummary(chartQuote, sym);
  }
  throw new Error(`Could not load ${sym}`);
}

function parseStatements(rows = []) {
  return rows.map((row) => ({
    date: row.endDate?.fmt || row.endDate?.raw,
    revenue: row.totalRevenue?.raw,
    grossProfit: row.grossProfit?.raw,
    operatingIncome: row.operatingIncome?.raw,
    netIncome: row.netIncome?.raw,
    ebit: row.ebit?.raw,
  })).reverse();
}

function parseCashflow(rows = []) {
  return rows.map((row) => ({
    date: row.endDate?.fmt || row.endDate?.raw,
    operatingCashflow: row.totalCashFromOperatingActivities?.raw,
    freeCashflow: row.freeCashFlow?.raw,
    capitalExpenditures: row.capitalExpenditures?.raw,
  })).reverse();
}

function parseBalance(rows = []) {
  return rows.map((row) => ({
    date: row.endDate?.fmt || row.endDate?.raw,
    totalAssets: row.totalAssets?.raw,
    totalLiab: row.totalLiab?.raw,
    cash: row.cash?.raw,
    totalDebt: row.shortLongTermDebt?.raw,
  })).reverse();
}

export async function fetchNews(symbol, count = 12) {
  const sym = symbol?.trim();
  const q = sym || 'stock market';
  const data = await yahooGet(
    `/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=0&newsCount=${count}`,
  );
  return (data?.news || []).map((n) => ({
    title: n.title,
    publisher: n.publisher,
    link: n.link,
    publishedAt: n.providerPublishTime,
    thumbnail: n.thumbnail?.resolutions?.[0]?.url,
    type: n.relatedTickers?.length ? 'company' : 'market',
  }));
}

export async function fetchMarketNews(count = 15) {
  return fetchNews('market', count);
}

export const SECTOR_ETFS = [
  { sector: 'Technology', symbol: 'XLK' },
  { sector: 'Healthcare', symbol: 'XLV' },
  { sector: 'Financials', symbol: 'XLF' },
  { sector: 'Consumer Disc.', symbol: 'XLY' },
  { sector: 'Industrials', symbol: 'XLI' },
  { sector: 'Comm. Services', symbol: 'XLC' },
  { sector: 'Consumer Staples', symbol: 'XLP' },
  { sector: 'Energy', symbol: 'XLE' },
  { sector: 'Materials', symbol: 'XLB' },
  { sector: 'Real Estate', symbol: 'XLRE' },
  { sector: 'Utilities', symbol: 'XLU' },
];

export async function fetchSectorPerformance() {
  const symbols = SECTOR_ETFS.map((s) => s.symbol);
  const quotes = await fetchSparkQuotes(symbols, '1d', '5m');
  const bySymbol = Object.fromEntries(quotes.map((q) => [q.symbol, q]));
  return SECTOR_ETFS.map(({ sector, symbol }) => ({
    sector,
    symbol,
    change: bySymbol[symbol]?.change ?? null,
    price: bySymbol[symbol]?.price ?? null,
  }));
}

export const SCREENER_SECTORS = [
  'Technology', 'Healthcare', 'Financial Services', 'Consumer Cyclical',
  'Industrials', 'Communication Services', 'Consumer Defensive', 'Energy',
  'Basic Materials', 'Real Estate', 'Utilities',
];

export function secEdgarUrl(symbol, name) {
  const sym = symbol?.toUpperCase();
  return `https://www.sec.gov/edgar/search/#/q=${encodeURIComponent(sym || name || '')}`;
}

export function yahooProfileUrl(symbol) {
  return `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}/profile`;
}