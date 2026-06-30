# Plexity

**A personal OS for the tools I actually use every day — rebuilt cleaner.**

[plexity.tools](https://plexity.tools) · Always Free · No AI · Side Project

---

## What it is

Plexity is a full-stack personal productivity shell. Instead of bouncing between five different apps for tasks, grades, notes, a calculator, and a PDF tool, everything lives in one dark, minimal interface built exactly the way I want it.

It started as scratching my own itches. It became a real app.

---

## Tools inside Plexity

| Tool | What it does |
|------|-------------|
| **Tasks** | Add, manage, and track to-dos with natural language date parsing |
| **Calendar** | View and manage your schedule in one place |
| **Goals** | Set and track long-term goals |
| **Lists** | Simple, fast list-making |
| **Journal** | Private daily journaling |
| **Grades** | Track your GPA and grades across courses |
| **Focus** | Distraction-free focus timer |
| **Calculator** | Clean calculator with math rendering (KaTeX) |
| **PDF Tools** | View, edit, and manipulate PDFs in-browser |
| **Stocks** | Quick stock lookups |
| **Typing** | Typing speed practice |
| **Units** | Unit converter |
| **Passwords** | Local password manager |
| **College** | College-specific planning tools |
| **Catalog** | Browse and launch all tools from one place |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 18 + Vite |
| **Routing** | React Router v6 |
| **Styling** | Tailwind CSS + tailwind-merge + tailwindcss-animate |
| **State** | Zustand (global) + TanStack Query v5 (server state) |
| **Backend/DB** | Base44 SDK |
| **Forms/Validation** | Zod |
| **Date parsing** | chrono-node (natural language) |
| **Math rendering** | KaTeX |
| **PDF** | pdf-lib + pdfjs-dist |
| **Charts** | Recharts |
| **3D** | Three.js |
| **UI primitives** | Radix UI + Lucide React + Sonner (toasts) |
| **Testing** | Vitest |
| **Linting** | oxlint |

---

## Running locally

```bash
# Clone
git clone https://github.com/OrangJaguar/Plexity.git
cd Plexity

# Install
npm install

# Environment variables
cp .env.example .env.local
# Fill in required Base44 / API keys

# Dev server
npm run dev
# → http://localhost:5173
```

### Other scripts

```bash
npm run build      # Production build
npm run preview    # Preview production build
npm run test       # Run Vitest tests
npm run lint       # Run oxlint
npm run typecheck  # TypeScript check
```


## Why I built this

I wanted one place where I could open my laptop and have everything I need — not a different tab for every micro-tool. Plexity is that place for me. It's also a real project to work on frontend architecture, state management, and product design with actual stakes.

It's free, it has no AI features, and it's a side project first.

---

## Status

**Active.** I use it daily and add tools when I need them.

- Built and maintained by [Sanskar Gupta](https://github.com/OrangJaguar)  
- Live at [plexity.tools](https://plexity.tools)
