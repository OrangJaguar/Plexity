/** Vite dev middleware: attach Yahoo crumb for quoteSummary & screener POST. */
const UA = 'Mozilla/5.0 (compatible; Plexity/1.0)';

function needsCrumb(path, method = 'GET') {
  if (path.includes('/quoteSummary/')) return true;
  if (method === 'POST' && path.includes('/screener') && !path.includes('/predefined/')) return true;
  return false;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export function yahooCrumbProxy() {
  const cache = { cookie: '', crumb: '', at: 0 };

  async function refresh() {
    const fc = await fetch('https://fc.yahoo.com/', { headers: { 'User-Agent': UA }, redirect: 'follow' });
    const parts = [];
    if (typeof fc.headers.getSetCookie === 'function') {
      for (const c of fc.headers.getSetCookie()) {
        const bit = c.split(';')[0]?.trim();
        if (bit) parts.push(bit);
      }
    } else {
      const raw = fc.headers.get('set-cookie');
      if (raw) parts.push(raw.split(';')[0]?.trim());
    }
    cache.cookie = parts.filter(Boolean).join('; ');
    const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: { 'User-Agent': UA, Cookie: cache.cookie },
    });
    if (!crumbRes.ok) throw new Error('Yahoo crumb failed');
    cache.crumb = (await crumbRes.text()).trim();
    cache.at = Date.now();
  }

  return {
    name: 'yahoo-crumb-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const rawUrl = req.url || '';
        if (!rawUrl.startsWith('/yahoo-finance')) return next();

        const path = rawUrl.replace(/^\/yahoo-finance/, '').split('?')[0];
        const qs = rawUrl.includes('?') ? rawUrl.slice(rawUrl.indexOf('?')) : '';
        if (!needsCrumb(path, req.method)) return next();

        try {
          if (!cache.crumb || Date.now() - cache.at > 25 * 60 * 1000) await refresh();
          const sep = qs ? '&' : '?';
          const target = `https://query1.finance.yahoo.com${path}${qs}${sep}crumb=${encodeURIComponent(cache.crumb)}`;
          const headers = { 'User-Agent': UA, Cookie: cache.cookie };
          if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'];

          const init = { method: req.method || 'GET', headers };
          if (req.method === 'POST') init.body = await readBody(req);

          let r = await fetch(target, init);
          if (r.status === 401) {
            await refresh();
            const retryUrl = `https://query1.finance.yahoo.com${path}${qs}${sep}crumb=${encodeURIComponent(cache.crumb)}`;
            r = await fetch(retryUrl, init);
          }

          const text = await r.text();
          res.statusCode = r.status;
          res.setHeader('Content-Type', r.headers.get('content-type') || 'application/json');
          res.end(text);
        } catch (err) {
          next(err);
        }
      });
    },
  };
}
