# Deploy Plexity on Vercel + Supabase

Production stack: **Vite SPA on Vercel** → **Supabase** (Auth, Postgres, Edge Functions).

Custom domain: **https://plexity.tools**  
Vercel default: **https://plexity.vercel.app** (use your actual `*.vercel.app` hostname if different)

## 1. Local `.env` (already required)

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_DATA_PROVIDER=supabase
VITE_CONVERTER_SERVER_FEATURES=false
```

`VITE_CONVERTER_SERVER_FEATURES` is optional locally (defaults to `false`). Base44 `VITE_BASE44_*` lines are unused and can stay or be deleted.

## 2. Vercel project

1. Import the GitHub repo in Vercel.
2. Framework: **Vite** (or rely on `vercel.json`).
3. Build: `npm run build` · Output: `dist` · Node: **22+**
4. Environment Variables (Production + Preview):

| Variable | Value |
|----------|--------|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → API → `anon` `public` key |
| `VITE_DATA_PROVIDER` | `supabase` |
| `VITE_CONVERTER_SERVER_FEATURES` | `false` |

Do **not** put `SUPABASE_SERVICE_ROLE_KEY` in Vercel.

5. Deploy once so `https://plexity.vercel.app` (or your project URL) works.

## 3. Custom domain `plexity.tools`

1. In **Base44**: remove / disconnect `plexity.tools` (DNS must point at Vercel, not Base44).
2. In **Vercel** → Project → Settings → Domains → add `plexity.tools` and `www.plexity.tools` if you use www.
3. At your domain registrar, set the DNS records Vercel shows (usually A/CNAME). Wait until Vercel shows the domain as Valid.
4. Prefer apex `https://plexity.tools` as the canonical site (redirect www → apex or vice versa in Vercel).

## 4. Supabase Auth URL configuration

**Authentication → URL Configuration**

### Site URL (canonical production)

```
https://plexity.tools
```

### Redirect URLs (add every line)

```
http://localhost:5173/**
http://localhost:5173/reset-password
http://127.0.0.1:5173/**
http://127.0.0.1:5173/reset-password
https://plexity.vercel.app/**
https://plexity.vercel.app/reset-password
https://plexity.tools/**
https://plexity.tools/reset-password
https://www.plexity.tools/**
https://www.plexity.tools/reset-password
```

If your Vercel preview/production hostname differs (e.g. `plexity-xxx.vercel.app`), add that host the same way:

```
https://YOUR-PROJECT.vercel.app/**
https://YOUR-PROJECT.vercel.app/reset-password
```

## 5. Smoke after cutover

- [ ] `https://plexity.tools` loads the Vercel deploy (not Base44)
- [ ] Sign up / confirm email / sign in
- [ ] Password reset email lands on `/reset-password`
- [ ] Save data in one synced tool
- [ ] Stocks / feedback / admin feedback
- [ ] Optional: freeze or disable the old Base44 app

## Edge Functions

Stay in Supabase (`tools-market-data`, `submit-feedback`, `admin-api`). Secrets are set in Supabase, not Vercel.
