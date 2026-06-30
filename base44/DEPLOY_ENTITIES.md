# Base44 data entities — deploy checklist

Your Base44 **Data** tab should show **14 custom tables** plus the built-in **User** table (15 total).

If you only see 8, you are missing entities that the app already uses in code. Deploy/sync them from this repo's `base44/entities/` folder.

## Required entities (in repo)

| Entity | Used by |
|--------|---------|
| **UserPreferences** | Username, theme, pinned tools, dashboard widgets, habits, weather, stocks symbols |
| **ToolsTask** | Tasks tool |
| **ToolsCalendarEvent** | Calendar tool |
| **ToolsSchedule** | Dashboard class schedule |
| **ToolsJournalEntry** | Journal tool |
| **ToolsFocusSession** | Focus timer history |
| **ToolsGrades** | Grades tool |
| **ToolsGoals** | Goals tool |
| **ToolsLists** | Lists tool |
| **ToolsProfile** | Profile tool |
| **ToolsCollege** | College planner workspace |
| **ToolsCalculator** | Calculator saved expressions/tables |
| **ToolsStocksWorkspace** | Stocks watchlist and research notes |
| **ToolsFeedback** | User feedback submissions (admin inbox) |

## Server functions

| Function | Purpose |
|----------|---------|
| **submitFeedback** | Auth-gated feedback submission with rate limit and request ID generation |
| **toolsMarketData** | Yahoo market data proxy (public read-only; works for guests) |

### ToolsFeedback RLS

Deploy with entity-level RLS so users can read/update/delete their own rows (`userEmail` match) and admins have full access via `$or` + `user_condition`. Field `adminNotes` is admin-only (field-level RLS). Re-sync `base44/entities/ToolsFeedback.jsonc` after changes.

### toolsMarketData environment (optional)

| Variable | Purpose |
|----------|---------|
| `MARKET_DATA_USER_AGENT` | Full outbound User-Agent override |
| `APP_NAME` / `APP_VERSION` / `APP_CONTACT_URL` | Composed fallback when override unset |

## Built-in (not in `base44/entities/`)

| Table | Purpose |
|-------|---------|
| **User** | Auth email/password; **Name** column = `full_name` (synced from username on signup) |

## Likely missing from your dashboard (deploy these)

If you see 8 tables, you probably have the first group but are **missing**:

- ToolsGoals
- ToolsLists
- ToolsProfile
- ToolsCollege
- ToolsCalculator
- ToolsStocksWorkspace

**Action:** In Base44, sync/deploy entities from `base44/entities/*.jsonc` or create each missing table from the JSONC definitions. Enable RLS on `userEmail` per each file.

## Tools that do NOT need their own entity

| Tool | Storage |
|------|---------|
| Dashboard | Reads Tasks, Schedule, Calendar, UserPreferences |
| Passwords | Encrypted in browser only |
| PDF | In-browser only |
| Typing | Session/local state only |
| Units | Stateless converter |
| Catalog | UI only (pins in UserPreferences) |
| Settings | UserPreferences |

## Removed study entities (safe to delete in Base44)

Journey, Module, Activity, Card, Session — see [ENTITIES_CLEANUP.md](./ENTITIES_CLEANUP.md).
