# Plan 04 — Auth cutover to Supabase Auth

## Goal

Replace Base44 auth with Supabase Auth while keeping the same React surface (`useAuth`, `RequireAuth`, `RequireAdmin`).

## Adjustments (from Plans 01–03)

- `requireAuth` / session cache live in `src/api/auth/session.js` (shared with data adapter).
- Admin role: **`profiles.role = 'admin'`** only (not app_metadata).
- Supabase signup uses **email confirmation link** (no 6-digit OTP). Base44 OTP path kept when provider is `base44`.
- Password reset redirect: `{origin}/reset-password` (Supabase recovery session).
- Feedback/admin API still Base44 until Plan 05 — admin chrome may open but feedback list can fail until then.

## Achievements

- [x] `useCurrentUser` / `AuthProvider` / `requireAuth` dual-provider
- [x] `AuthForm` login/signup/check-email (Supabase) + OTP (Base44)
- [x] Password reset / change via Supabase
- [x] `syncAuthUserFullName` → metadata + `profiles.full_name`
- [x] `signOut` clears cache + Supabase session
- [x] Preferences created on successful signup session

## Status: **COMPLETE** — waiting on ★ MANUAL C

## ★ MANUAL C (do this now)

1. Edit `.env`:
   ```bash
   VITE_DATA_PROVIDER=supabase
   ```
2. Restart `npm run dev`
3. Sign up with your email (confirm link if Supabase asks, then sign in)
4. SQL Editor:
   ```sql
   update public.profiles
   set role = 'admin'
   where email = 'YOUR_EMAIL@example.com';
   ```
5. Refresh → you should pass `RequireAdmin`
6. Smoke: Dashboard + create a task → check `tools_task` in Table Editor
7. Optional Auth settings: Site URL = `http://localhost:5173` (or your Vite port); Redirect URLs include that origin + `/reset-password`
8. Tell agent: **MANUAL C done — execute Plan 05**

## Out of scope

- Edge functions (Plan 05)
- Removing `@base44/sdk`
