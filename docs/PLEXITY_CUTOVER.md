# Plexity external cutover (manual — do last)

Code rebrand is complete. Finish these steps when ready:

1. **Base44 dashboard** — rename app display name to "Plexity"; update hosted URL when subdomain is available.
2. **Production env** — set `VITE_BASE44_APP_BASE_URL` to the new Base44 URL (keep `VITE_BASE44_APP_ID` unchanged).
3. **Redeploy** Base44 functions (`submitFeedback`, `toolsMarketData`) after pull.
4. **GitHub** — rename repository to `plexity`.
5. **Local folder** — rename `veridian-tools` → `plexity`.

After cutover: clear browser site data once to drop any orphan `veridian.*` localStorage keys from old dev sessions.
