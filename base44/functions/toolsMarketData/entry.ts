/**
 * toolsMarketData — self-contained Yahoo Finance proxy.
 *
 * IMPORTANT (Base44 deploy): Do not import from ../_shared or sibling folders.
 * Each function deploys as a standalone bundle; relative imports outside this
 * directory fail at boot time in production.
 */

const YAHOO_HOSTS = ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"];

const DEFAULT_UA = "Mozilla/5.0 (compatible; Plexity/1.0; +https://plexity.base44.app)";

let sessionCookie = "";
let sessionCrumb = "";
let sessionAt = 0;

function marketDataUserAgent(): string {
  const configured = Deno.env.get("MARKET_DATA_USER_AGENT")?.trim();
  if (configured) return configured.slice(0, 256);

  const appName = Deno.env.get("APP_NAME")?.trim() || "Plexity";
  const appVersion = Deno.env.get("APP_VERSION")?.trim() || "1";
  const contact = Deno.env.get("APP_CONTACT_URL")?.trim() || "https://plexity.base44.app";

  return `Mozilla/5.0 (compatible; ${appName}/${appVersion}; +${contact})`;
}

/** Merge Set-Cookie headers from a response into a name→value cookie jar. */
function mergeCookiesIntoJar(res: Response, jar: Record<string, string>) {
  let rawCookies: string[] = [];
  if (typeof res.headers.getSetCookie === "function") {
    rawCookies = res.headers.getSetCookie();
  } else {
    const raw = res.headers.get("set-cookie");
    if (raw) rawCookies = [raw];
  }
  for (const c of rawCookies) {
    const bit = c.split(";")[0]?.trim();
    if (!bit) continue;
    const eqIdx = bit.indexOf("=");
    if (eqIdx === -1) continue;
    const name = bit.slice(0, eqIdx).trim();
    const value = bit.slice(eqIdx + 1).trim();
    if (name) jar[name] = value;
  }
}

function jarToString(jar: Record<string, string>): string {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
}

/**
 * Acquire a Yahoo crumb by visiting the Yahoo Finance homepage first.
 * The homepage sets the A1/A3/GUC cookies that the crumb endpoint requires;
 * fetching fc.yahoo.com alone does not, which is why crumb issuance fails
 * from cloud IPs.
 */
async function refreshYahooSession() {
  const userAgent = marketDataUserAgent() || DEFAULT_UA;
  const browserHeaders: Record<string, string> = {
    "User-Agent": userAgent,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Upgrade-Insecure-Requests": "1",
  };

  const cookieJar: Record<string, string> = {};

  // Step 1: Visit the Yahoo Finance homepage — collects cookies AND the page
  // HTML contains the crumb embedded in a <script> tag, letting us avoid the
  // rate-limited getcrumb endpoint entirely.
  let pageHtml = "";
  try {
    const homeRes = await fetch("https://finance.yahoo.com/", {
      headers: browserHeaders,
      redirect: "follow",
    });
    mergeCookiesIntoJar(homeRes, cookieJar);
    pageHtml = await homeRes.text();
  } catch {
    /* homepage may be slow — continue with getcrumb fallback */
  }

  sessionCookie = jarToString(cookieJar);

  // Step 2: Try extracting the crumb directly from the homepage HTML.
  const crumbMatch = pageHtml.match(/"crumb"\s*:\s*"([^"]+)"/);
  if (crumbMatch) {
    sessionCrumb = crumbMatch[1];
    sessionAt = Date.now();
    return;
  }

  // Step 3: Fall back to the getcrumb endpoint on both hosts.
  for (const host of ["query2", "query1"]) {
    try {
      const crumbRes = await fetch(`https://${host}.finance.yahoo.com/v1/test/getcrumb`, {
        headers: { ...browserHeaders, Cookie: sessionCookie },
      });
      if (crumbRes.ok) {
        sessionCrumb = (await crumbRes.text()).trim();
        sessionAt = Date.now();
        return;
      }
    } catch {
      /* try next host */
    }
  }

  throw new Error("Failed to obtain market data session");
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

  const userAgent = marketDataUserAgent() || DEFAULT_UA;
  const headers: Record<string, string> = { "User-Agent": userAgent };
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
          headers: { ...headers, "User-Agent": userAgent, Cookie: sessionCookie },
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