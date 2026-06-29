import {
  LayoutDashboard,
  ListChecks,
  Calendar,
  Target,
  Flag,
  GraduationCap,
  BookOpen,
  CircleUser,
  ClipboardList,
  FileStack,
  CandlestickChart,
  Keyboard,
  School,
  Scale,
  KeyRound,
  Calculator,
} from 'lucide-react';

/** @typedef {'dashboard'|'tasks'|'calendar'|'focus'|'goals'|'grades'|'journal'|'profile'|'lists'|'passwords'|'calculator'|'pdftools'|'stocks'|'typing'|'college'|'units'} ToolId */

/**
 * @typedef {Object} ToolDefinition
 * @property {ToolId} id
 * @property {string} route
 * @property {string} label
 * @property {import('lucide-react').LucideIcon} icon
 * @property {string} description
 * @property {string} longDescription
 * @property {string} createdAt ISO date
 * @property {number} popularityRank lower = more popular
 * @property {boolean} defaultPinned
 * @property {() => Promise<{ default: import('react').ComponentType }>} loadPreview
 */

export const TOOL_CATALOG_ROUTE = '/catalog';

export const TOOL_REGISTRY = [
  {
    id: 'dashboard',
    route: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    description: 'Live class countdown, schedule blocks, and a daily intelligence panel.',
    longDescription:
      'See your current class, mod window, and time until the next block. Expand inline schedule, run a Daily Debrief, and skim weather, stocks, habits, and priority tasks from the intelligence panel — all on one screen.',
    createdAt: '2025-06-01',
    popularityRank: 1,
    defaultPinned: true,
    loadPreview: () => import('@/components/tools/catalog/previews/DashboardPreview'),
  },
  {
    id: 'tasks',
    route: '/tasks',
    label: 'Tasks',
    icon: ListChecks,
    description: 'Agenda task list with priorities, subtasks, sort/filter, and drag reorder.',
    longDescription:
      'Manage homework and to-dos in one place. Set due dates, estimates, class tags, and priority dots. Add subtasks, drag to reorder, sort by due date or priority, and check off with a quick completion animation.',
    createdAt: '2025-06-01',
    popularityRank: 2,
    defaultPinned: true,
    loadPreview: () => import('@/components/tools/catalog/previews/TasksPreview'),
  },
  {
    id: 'calendar',
    route: '/calendar',
    label: 'Calendar',
    icon: Calendar,
    description: 'Week grid planner with drag create, resize, repeats, and color blocks.',
    longDescription:
      'Plan your week in a time-grid view. Drag to create, move, or resize events; set repeating rules; link journeys; and switch to month view. Events feed Dashboard debrief and Focus context.',
    createdAt: '2025-06-02',
    popularityRank: 3,
    defaultPinned: true,
    loadPreview: () => import('@/components/tools/catalog/previews/CalendarPreview'),
  },
  {
    id: 'focus',
    route: '/focus',
    label: 'Focus',
    icon: Target,
    description: 'Live clock and Pomodoro timer with today\'s schedule as quiet context.',
    longDescription:
      'Switch between a large live clock and a configurable Pomodoro work/break timer. During sessions, see today\'s tasks and events as gentle context so you stay oriented without breaking focus.',
    createdAt: '2025-06-03',
    popularityRank: 4,
    defaultPinned: true,
    loadPreview: () => import('@/components/tools/catalog/previews/FocusPreview'),
  },
  {
    id: 'goals',
    route: '/goals',
    label: 'Goals',
    icon: Flag,
    description: 'Personal strategy from North Star to weekly check-ins.',
    longDescription:
      'Clarify long-term direction through pillars and a flexible roadmap, define your current season, then run a calm weekly check-in loop. Built for thoughtful ambition — not habit gamification or generic goal lists.',
    createdAt: '2026-06-23',
    popularityRank: 12,
    defaultPinned: false,
    loadPreview: () => import('@/components/tools/catalog/previews/GoalsPreview'),
  },
  {
    id: 'journal',
    route: '/journal',
    label: 'Journal',
    icon: BookOpen,
    description: 'Daily reflections with mood, tags, autosave, streaks, and search.',
    longDescription:
      'Write a daily reflection with formatting, mood chips, and tags. Entries autosave as you type. Browse past days, search and filter history, and use the month grid to jump to any date. Streak counter keeps the habit visible.',
    createdAt: '2025-06-04',
    popularityRank: 5,
    defaultPinned: true,
    loadPreview: () => import('@/components/tools/catalog/previews/JournalPreview'),
  },
  {
    id: 'profile',
    route: '/profile',
    label: 'Profile',
    icon: CircleUser,
    description: 'A personal hub for identity, background, projects, and links.',
    longDescription:
      'Keep the important context about who you are in one calm, organized place — bio, interests, education, projects, and links. A private reference snapshot, not a social profile or goals planner.',
    createdAt: '2026-06-23',
    popularityRank: 13,
    defaultPinned: false,
    loadPreview: () => import('@/components/tools/catalog/previews/ProfilePreview'),
  },
  {
    id: 'lists',
    route: '/lists',
    label: 'Lists',
    icon: ClipboardList,
    description: 'Personal collections for movies, books, restaurants, prompts, and more.',
    longDescription:
      'Organize life across Topics → Lists → Items. Use smart templates for movies, books, restaurants, foods, and prompts — or start custom. Rate, tag, filter, and revisit what matters without spreadsheet complexity.',
    createdAt: '2026-06-23',
    popularityRank: 14,
    defaultPinned: false,
    loadPreview: () => import('@/components/tools/catalog/previews/ListsPreview'),
  },
  {
    id: 'passwords',
    route: '/passwords',
    label: 'Passwords',
    icon: KeyRound,
    description: 'Zero-knowledge encrypted vault for passwords and secure notes.',
    longDescription:
      'Client-side encrypted credentials vault with a separate master password, recovery key, auto-lock, password health, CSV import, and fast search — Plexity syncs encrypted data only.',
    createdAt: '2026-06-23',
    popularityRank: 15,
    defaultPinned: false,
    loadPreview: () => import('@/components/tools/catalog/previews/PasswordsPreview'),
  },
  {
    id: 'calculator',
    route: '/calculator',
    label: 'Calculator',
    icon: Calculator,
    description: 'Desmos-style graphing calculator with expressions, tables, and interactive analysis.',
    longDescription:
      'A focused graphing calculator — plot functions and points, build editable tables, find roots and intersections automatically, and customize axes from a clean full-screen workspace.',
    createdAt: '2026-06-23',
    popularityRank: 16,
    defaultPinned: false,
    loadPreview: () => import('@/components/tools/catalog/previews/CalculatorPreview'),
  },
  {
    id: 'grades',
    route: '/grades',
    label: 'Grades',
    icon: GraduationCap,
    description: 'Import LMS grades, track letter grades, and view by quarter.',
    longDescription:
      'Import assignment scores from your school gradebook paste, review before saving, and see letter grades per class and grading period. Manage your course list and drill into each period\'s assignments.',
    createdAt: '2025-06-05',
    popularityRank: 6,
    defaultPinned: false,
    loadPreview: () => import('@/components/tools/catalog/previews/GradesPreview'),
  },
  {
    id: 'pdftools',
    route: '/pdf',
    label: 'PDF',
    icon: FileStack,
    description: 'Unified PDF editor — merge, split, reorder, rotate, and annotate locally.',
    longDescription:
      'Upload PDFs into one workspace: thumbnail or large view, drag to reorder, split with click-to-cut dividers, rotate, extract, delete, and annotate. Everything runs locally in your browser — files never leave your device.',
    createdAt: '2026-06-01',
    popularityRank: 7,
    defaultPinned: false,
    loadPreview: () => import('@/components/tools/catalog/previews/PdfToolsPreview'),
  },
  {
    id: 'stocks',
    route: '/stocks',
    label: 'Stocks',
    icon: CandlestickChart,
    description: 'Stock research workspace — screener, watchlist, charts, and company deep dives.',
    longDescription:
      'Market overview, screener, watchlist, earnings calendar, and per-stock pages with charts, financials, analyst consensus, news, and structured research notes. Built for idea discovery — not trading.',
    createdAt: '2026-06-02',
    popularityRank: 8,
    defaultPinned: false,
    loadPreview: () => import('@/components/tools/catalog/previews/StocksToolPreview'),
  },
  {
    id: 'typing',
    route: '/typing',
    label: 'Typing',
    icon: Keyboard,
    description: 'Practice typing with live WPM, accuracy, and timed tests.',
    longDescription:
      'A lightweight typing trainer inspired by Monkeytype. Run timed tests, track words per minute and accuracy, and reset for another round whenever you want to warm up.',
    createdAt: '2026-06-03',
    popularityRank: 9,
    defaultPinned: false,
    loadPreview: () => import('@/components/tools/catalog/previews/TypingPreview'),
  },
  {
    id: 'college',
    route: '/college',
    label: 'College',
    icon: School,
    description: 'College application workspace — list, essays, activities, and deadlines.',
    longDescription:
      'Plan your entire application in one place: search and classify schools, track academics and testing, build your top 10 activities and five honors, draft personal statements and supplementals, manage recommenders, and check off what you need for official portals.',
    createdAt: '2026-06-04',
    popularityRank: 10,
    defaultPinned: false,
    loadPreview: () => import('@/components/tools/catalog/previews/CollegePreview'),
  },
  {
    id: 'units',
    route: '/units',
    label: 'Units',
    icon: Scale,
    description: 'Convert length, weight, volume, time, temperature, and currency.',
    longDescription:
      'Quick unit conversions across everyday categories — miles to kilometers, pounds to kilograms, Fahrenheit to Celsius, and common currencies with approximate exchange rates.',
    createdAt: '2026-06-05',
    popularityRank: 11,
    defaultPinned: false,
    loadPreview: () => import('@/components/tools/catalog/previews/UnitsPreview'),
  },
];

const REGISTRY_ORDER = Object.fromEntries(
  TOOL_REGISTRY.map((t, i) => [t.id, i]),
);

/** @param {ToolId} id */
export function getToolById(id) {
  return TOOL_REGISTRY.find((t) => t.id === id) ?? null;
}

/** @param {ToolId[]} pinnedToolIds */
export function sortToolsByRegistryOrder(tools) {
  return [...tools].sort(
    (a, b) => (REGISTRY_ORDER[a.id] ?? 99) - (REGISTRY_ORDER[b.id] ?? 99),
  );
}

/** @param {ToolId[]} pinnedToolIds */
export function getToolsByIds(pinnedToolIds) {
  const byId = new Map(TOOL_REGISTRY.map((t) => [t.id, t]));
  return pinnedToolIds.map((id) => byId.get(id)).filter(Boolean);
}
