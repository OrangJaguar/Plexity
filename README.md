# Plexity

A free, no-AI student workspace — everyday utilities rebuilt in one fast shell. Built and operated by Sanskar Gupta.

Plexity is a single-page React app where students can manage school life, personal planning, and lightweight utilities without bloated UIs or chatbot features. Open a tool, do the thing, leave.

**Live:** [plexity.base44.app](https://plexity.base44.app)

## What it does

Plexity bundles **16 tools** behind one sidebar, catalog, and global command bar (`Cmd+K` / `/`):

| Tool | Route | Summary |
|------|-------|---------|
| **Dashboard** | `/dashboard` | Class countdown, schedule blocks, daily debrief, weather/stocks/habits panel |
| **Tasks** | `/tasks` | Agenda with priorities, subtasks, drag reorder, sort/filter |
| **Calendar** | `/calendar` | Week grid with drag create/resize, repeats, month view |
| **Focus** | `/focus` | Live clock and Pomodoro timer with today's schedule as context |
| **Journal** | `/journal` | Daily reflections, mood/tags, autosave, streaks, search |
| **Goals** | `/goals` | North Star → pillars → weekly check-ins |
| **Profile** | `/profile` | Personal hub for bio, education, projects, links |
| **Lists** | `/lists` | Topics → lists → items (movies, books, restaurants, prompts, custom) |
| **Passwords** | `/passwords` | Client-side encrypted vault (separate master password, recovery key) |
| **Calculator** | `/calculator` | Desmos-style graphing calculator with tables and analysis |
| **Grades** | `/grades` | Import LMS gradebook paste, letter grades by quarter |
| **PDF** | `/pdf` | Merge, split, reorder, rotate, annotate — all in-browser |
| **Stocks** | `/stocks` | Screener, watchlist, charts, company research (not trading) |
| **Typing** | `/typing` | Timed typing tests with WPM and accuracy |
| **College** | `/college` | Application planner — schools, essays, activities, deadlines |
| **Units** | `/units` | Length, weight, volume, time, temperature, currency conversion |

Additional routes: `/catalog` (tool browser), `/settings`, `/feedback`, `/admin/feedback` (admin only), plus auth and legal pages.

### Command bar

The global command bar parses natural language and slash commands — no LLM:

- `/task`, `/event`, `/goto`, `/ask` and voice aliases
- Schedule queries ("What is free tomorrow afternoon?")
- Page-aware placeholders and draft previews before saving

### Data & privacy

- **Guest mode:** All tools work without an account. Data stays in `localStorage` on the current device.
- **Signed in:** Tasks, calendar, journal, focus, goals, lists, grades, profile, college, calculator, stocks workspace, and preferences sync via Base44 cloud entities.
- **Local-only by design:** PDF edits never leave the browser. The password vault encrypts on-device; Plexity syncs ciphertext only.

## Tech stack

### Frontend

- **React 18** + **Vite 6** (ESM, HMR)
- **React Router 6** — marketing layout + tools app shell + admin
- **TanStack React Query** — server state, cache persistence per user
- **Zustand** — UI chrome (sidebar collapse, etc.)
- **Tailwind CSS 3** + **shadcn/ui** (New York style) + **Lucide** icons
- **next-themes** — light/dark mode
- **Zod** — validation
- **Sonner** — toasts

### Notable libraries

- **KaTeX** — math rendering (calculator)
- **Three.js** — 3D graphing (calculator)
- **Recharts** — charts (stocks, grades)
- **pdf-lib** + **pdfjs-dist** — PDF workspace
- **chrono-node** — natural-language date parsing (command bar, calendar)
- **react-resizable-panels** — resizable tool layouts

### Backend & platform

- **[Base44](https://base44.com)** — auth, entity storage, serverless functions
  - `@base44/sdk` + `@base44/vite-plugin` for local dev and deployment
  - Entity schemas in `base44/entities/` (tasks, calendar, journal, grades, college, etc.)
  - Server functions in `base44/functions/`:
    - `toolsMarketData` — Yahoo Finance proxy with crumb session
    - `submitFeedback` — user feedback intake
- **TypeScript** — Base44 functions and shared server utilities (`base44/functions/_shared/`)

### Tooling

- **Vitest** — unit tests (`src/lib/tools/`, API helpers)
- **Oxlint** — linting
- **TypeScript** (`tsc` via `jsconfig.json`) — JSDoc type-checking on `src/`

## Project structure

```
├── App.jsx                 # Base44 platform entry (re-exports src/App.jsx)
├── src/
│   ├── App.jsx             # App shell (providers, router, toaster)
│   ├── AppRoutes.jsx       # All routes
│   ├── api/                # Base44 client, entity CRUD, guest/cloud storage bridge
│   ├── components/         # UI, tools, command bar, auth, app shell
│   ├── hooks/              # React Query hooks, auth, speech recognition
│   ├── layouts/            # MarketingLayout, ToolsAppShell, AdminLayout
│   ├── lib/                # Tool logic (calculator engine, command parser, PDF ops, etc.)
│   ├── pages/              # Landing, auth, legal, tools, admin
│   ├── providers/          # AuthProvider, QueryProvider
│   └── store/              # Zustand stores
├── base44/
│   ├── entities/           # Cloud entity JSON schemas
│   ├── functions/          # Deno serverless functions
│   └── config.jsonc        # Base44 app config
├── scripts/                # Data import utilities (college scorecard CSV)
└── public/                 # Static assets (focus audio, etc.)
```

## Getting started

### Prerequisites

- Node.js 18+
- npm

### Local development

```bash
npm install
cp .env.example .env   # optional for local Base44 connection
npm run dev
```

The dev server proxies `/yahoo-finance` to Yahoo's API for stock data during local development.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build |
| `npm run test` | Run Vitest unit tests |
| `npm run lint` | Run Oxlint |
| `npm run typecheck` | Type-check `src/` with `tsc` |

### Environment variables

See `.env.example`. For local dev, set `VITE_BASE44_APP_ID` to match `base44/.app.jsonc`. Base44 preview injects these automatically when deployed.

## Principles

- **Fast on purpose** — no page reloads, no feature tours
- **One place** — shared shell, shortcuts, and UI patterns across tools
- **Algorithms, not AI** — deterministic parsing and schedule math
- **Your data, bounded** — guest mode by default; sign in only for cross-device sync
- **Free** — no paywalled core utilities

## License

Private project. All rights reserved unless otherwise noted.
