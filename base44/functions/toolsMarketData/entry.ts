import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";
import { marketDataUserAgent } from "../_shared/marketDataUserAgent.ts";

const YAHOO_HOSTS = ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"];

let sessionCookie = "";
let sessionCrumb = "";
let sessionAt = 0;

function collectCookies(res: Response): string {
  const parts: string[] = [];
  if (typeof res.headers.getSetCookie === "function") {
    for (const c of res.headers.getSetCookie()) {
      const bit = c.split(";")[0]?.trim();
      if (bit) parts.push(bit);
    }
  } else {
    const raw = res.headers.get("set-cookie");
    if (raw) parts.push(raw.split(";")[0]?.trim() || "");
  }
  return parts.filter(Boolean).join("; ");
}

async function refreshYahooSession() {
  const userAgent = marketDataUserAgent();
  const fcRes = await fetch("https://fc.yahoo.com/", {
    headers: { "User-Agent": userAgent },
    redirect: "follow",
  });
  const fcCookies = collectCookies(fcRes);
  if (fcCookies) sessionCookie = fcCookies;

  const crumbRes = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
    headers: { "User-Agent": userAgent, Cookie: sessionCookie },
  });
  if (!crumbRes.ok) throw new Error("Failed to obtain market data session");
  sessionCrumb = (await crumbRes.text()).trim();
  sessionAt = Date.now();
}

function needsCrumb(path: string, method = "GET") {
  if (path.includes("/quoteSummary/")) return true;
  if (method === "POST" && path.includes("/screener") && !path.includes("/predefined/")) return true;
  return false;
}

async function yahooProxy(path: string, method = "GET", body?: unknown) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  let requestPath = cleanPath;

  if (needsCrumb(cleanPath, method)) {
    if (!sessionCrumb || Date.now() - sessionAt > 25 * 60 * 1000) {
      await refreshYahooSession();
    }
    const sep = requestPath.includes("?") ? "&" : "?";
    requestPath = `${requestPath}${sep}crumb=${encodeURIComponent(sessionCrumb)}`;
  }

  const headers: Record<string, string> = { "User-Agent": marketDataUserAgent() };
  if (sessionCookie) headers.Cookie = sessionCookie;
  if (method !== "GET" && body != null) headers["Content-Type"] = "application/json";

  let lastErr: Error | null = null;
  for (const host of YAHOO_HOSTS) {
    try {
      const res = await fetch(`${host}${requestPath}`, {
        method,
        headers,
        body: method !== "GET" && body != null ? JSON.stringify(body) : undefined,
      });

      if (res.status === 401 && needsCrumb(cleanPath, method)) {
        await refreshYahooSession();
        const sep2 = cleanPath.includes("?") ? "&" : "?";
        const retryPath = `${cleanPath}${sep2}crumb=${encodeURIComponent(sessionCrumb)}`;
        const retry = await fetch(`${host}${retryPath}`, {
          method,
          headers: { ...headers, Cookie: sessionCookie },
          body: method !== "GET" && body != null ? JSON.stringify(body) : undefined,
        });
        if (!retry.ok) throw new Error(`Yahoo request failed (${retry.status})`);
        return retry.json();
      }

      if (!res.ok) throw new Error(`Yahoo request failed (${res.status})`);
      return res.json();
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error("Yahoo request failed");
    }
  }
  throw lastErr || new Error("Yahoo request failed");
}

async function yahooSearch(query: string) {
  const data = await yahooProxy(
    `/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`,
  );
  return (data?.quotes || [])
    .filter((row: { symbol?: string; quoteType?: string; typeDisp?: string }) => (
      row.symbol && (row.quoteType === "EQUITY" || row.quoteType === "ETF" || row.typeDisp === "Equity")
    ))
    .map((row: { symbol: string; shortname?: string; longname?: string }) => ({
      symbol: row.symbol.toUpperCase(),
      name: row.shortname || row.longname || row.symbol,
    }))
    .slice(0, 8);
}

async function yahooQuote(symbol: string) {
  const sym = symbol.trim().toUpperCase();
  const data = await yahooProxy(`/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`);
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta?.regularMarketPrice) return { symbol: sym, price: null, change: null };
  const price = meta.regularMarketPrice;
  const prev = meta.chartPreviousClose ?? meta.previousClose;
  const change = prev ? ((price - prev) / prev) * 100 : 0;
  return { symbol: sym, price, change };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) {
      return Response.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === "search") {
      const query = String(body?.query || "").trim();
      if (!query) return Response.json({ results: [] });
      const results = await yahooSearch(query);
      return Response.json({ results });
    }

    if (action === "quotes") {
      const symbols = Array.isArray(body?.symbols) ? body.symbols : [];
      const unique = [...new Set(symbols.map((s: string) => String(s).trim().toUpperCase()).filter(Boolean))].slice(0, 30);
      const results = await Promise.all(
        unique.map(async (sym) => {
          try {
            return await yahooQuote(sym);
          } catch {
            return { symbol: sym, price: null, change: null };
          }
        }),
      );
      return Response.json({ results });
    }

    if (action === "yahoo") {
      const path = String(body?.path || "");
      if (!path) return Response.json({ error: { message: "Missing path" } }, { status: 400 });
      const method = String(body?.method || "GET").toUpperCase();
      const data = await yahooProxy(path, method, body?.body);
      return Response.json({ data });
    }

    return Response.json({ error: { message: "Unknown action" } }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Market data failed";
    return Response.json({ error: { message } }, { status: 500 });
  }
});
