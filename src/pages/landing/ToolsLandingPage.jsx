import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Binary,
  Box,
  Command,
  Hammer,
  Heart,
  Layers,
  LayoutGrid,
  Sparkles,
  Wrench,
  Zap,
  CircleAlert,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePageMeta } from '@/hooks/usePageMeta';
import { TOOL_CATALOG_ROUTE, TOOL_REGISTRY } from '@/lib/tools/registry';
import { usePinnedTools } from '@/hooks/queries/usePinnedTools';

const ORIGIN_STEPS = [
  {
    id: 'notice',
    label: '01',
    icon: CircleAlert,
    title: 'Hit a wall',
    text: 'A calendar that fights you. A PDF site that wants your email. Three menus to add homework.',
  },
  {
    id: 'rebuild',
    label: '02',
    icon: Hammer,
    title: 'Rebuild it',
    text: 'Strip the noise. Wire it with date parsing, schedule math, and local search — no chatbot.',
  },
  {
    id: 'collect',
    label: '03',
    icon: LayoutGrid,
    title: 'One shell',
    text: 'Pin what you open daily. Same shortcuts, same UI. A small ecosystem that grows with you.',
  },
];

const PRINCIPLES = [
  {
    icon: Zap,
    title: 'Fast on purpose',
    text: 'No page reloads, no feature tours. Open a tool, do the thing, leave.',
  },
  {
    icon: Layers,
    title: 'One place',
    text: `${TOOL_REGISTRY.length} utilities in a single workspace — sidebar, catalog, Cmd+K.`,
  },
  {
    icon: Binary,
    title: 'Algorithms, not AI',
    text: 'The command bar parses text, queries your schedule, and runs deterministic logic. Nothing is “generated.”',
  },
  {
    icon: Box,
    title: 'Your data, bounded',
    text: 'Sign in to use the workspace. Tasks, calendar, and preferences sync to your account; the vault stays encrypted on your device.',
  },
];

const COMMAND_DEMO = [
  { cmd: '/task Chem lab report due Friday', tag: 'Parse', label: 'Add task' },
  { cmd: '/goto calendar', tag: 'Route', label: 'Open tool' },
  { cmd: 'What is free tomorrow afternoon?', tag: 'Query', label: 'Schedule' },
];

const SYNC_SIGNED_IN = [
  'All tools require a free account',
  'Tasks, calendar, journal, focus',
  'Goals, lists, grades, profile',
  'College planner, calculator, stocks workspace',
  'Schedule & preferences',
];
const SYNC_LOCAL = ['Password vault (encrypted on device)', 'PDF edits (in-browser only)'];
const TOOLS_COLLECTION_ID = 'tools-collection';

function scrollToToolsCollection() {
  document.getElementById(TOOLS_COLLECTION_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function useScrollReveal() {
  useEffect(() => {
    const nodes = document.querySelectorAll('.tools-landing-scroll-reveal');
    if (!nodes.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -48px 0px' },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);
}

export default function ToolsLandingPage() {
  const { user, isLoading } = useAuth();
  const { pinnedTools } = usePinnedTools();
  const [demoIndex, setDemoIndex] = useState(0);
  const [originStep, setOriginStep] = useState(0);
  const demo = COMMAND_DEMO[demoIndex];

  usePageMeta({
    description:
      'Plexity — a free, no-AI student workspace. One person rebuilding everyday utilities cleaner, in one place.',
    canonicalPath: '/',
  });

  useScrollReveal();

  const appEntryRoute = pinnedTools.length > 0
    ? pinnedTools[0].route
    : TOOL_CATALOG_ROUTE;

  useEffect(() => {
    const id = window.setInterval(() => {
      setDemoIndex((i) => (i + 1) % COMMAND_DEMO.length);
    }, 6500);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setOriginStep((i) => (i + 1) % ORIGIN_STEPS.length);
    }, 5200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="tools-landing">
      <section className="tools-landing-hero tools-landing-reveal">
        <div className="tools-landing-hero-grid">
          <div className="tools-landing-hero-copy">
            <div className="tools-landing-badges">
              <span className="tools-landing-badge tools-landing-badge--pledge">
                <Heart size={12} aria-hidden />
                Always free
              </span>
              <span className="tools-landing-badge">No AI</span>
              <span className="tools-landing-badge">Side project</span>
            </div>
            <h1>
              Tools I use every day —
              <br />
              <span className="tools-landing-gradient">rebuilt cleaner.</span>
            </h1>
            <p className="tools-landing-lead">
              Plexity is me scratching my own itches: apps that feel bloated, flows that
              waste clicks, utilities scattered across tabs. I remake the ones I rely on, collect
              them in one shell, and ship them because it&apos;s fun — not because I&apos;m trying
              to sell you a platform.
            </p>
            <div className="tools-landing-actions">
              {!isLoading && user ? (
                <>
                  <Link to={appEntryRoute} className="btn btn-primary tools-landing-btn">
                    Open workspace
                    <ArrowRight size={16} aria-hidden />
                  </Link>
                  <Link to="/catalog" className="btn tools-landing-btn-secondary">
                    Browse tools
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/signup" className="btn btn-primary tools-landing-btn">
                    Create account
                    <ArrowRight size={16} aria-hidden />
                  </Link>
                  <button
                    type="button"
                    className="btn tools-landing-btn-secondary"
                    onClick={scrollToToolsCollection}
                  >
                    Browse tools
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="tools-landing-command-demo" aria-label="Command bar preview">
            <div className="tools-landing-command-chrome">
              <Sparkles size={15} aria-hidden />
              <span>Command bar</span>
              <span className="tools-landing-command-note">not a chatbot</span>
              <kbd>Cmd</kbd>
              <kbd>K</kbd>
            </div>
            <div className="tools-landing-command-input" key={demoIndex}>
              <span className="tools-landing-command-tag">{demo.tag}</span>
              <span className="tools-landing-command-text">{demo.cmd}</span>
              <span className="tools-landing-command-cursor" aria-hidden />
            </div>
            <div className="tools-landing-command-tabs" role="tablist" aria-label="Command examples">
              {COMMAND_DEMO.map((item, i) => (
                <button
                  key={item.label}
                  type="button"
                  role="tab"
                  aria-selected={i === demoIndex}
                  className={`tools-landing-command-tab${i === demoIndex ? ' is-active' : ''}`}
                  onClick={() => setDemoIndex(i)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="tools-landing-section tools-landing-section--origin tools-landing-scroll-reveal">
        <div className="tools-landing-section-intro">
          <p className="tools-landing-eyebrow">The origin loop</p>
          <h2>How a tool ends up here</h2>
          <p>
            Every feature started as friction in real life — built because something annoyed me
            on a Tuesday, not because a roadmap said so.
          </p>
        </div>
        <div className="tools-landing-origin-track" role="tablist" aria-label="Build process">
          {ORIGIN_STEPS.map((step, i) => {
            const Icon = step.icon;
            const isActive = i === originStep;
            return (
              <div key={step.id} className="tools-landing-origin-track-cell">
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`tools-landing-origin-card${isActive ? ' is-active' : ''}`}
                  onClick={() => setOriginStep(i)}
                >
                  <div className="tools-landing-origin-card-head">
                    <span className="tools-landing-origin-card-num">{step.label}</span>
                    <span className="tools-landing-origin-card-icon" aria-hidden>
                      <Icon size={15} strokeWidth={1.75} />
                    </span>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="tools-landing-section tools-landing-no-ai tools-landing-scroll-reveal">
        <div className="tools-landing-no-ai-inner">
          <div className="tools-landing-no-ai-copy">
            <p className="tools-landing-eyebrow">Under the hood</p>
            <h2>No AI. Just logic you can follow.</h2>
            <p>
              No LLM calls, no opaque models guessing at your week. Cmd+K runs local parsers and
              queries on data you already own — chrono for dates, your schedule for free time,
              your tasks for what&apos;s due.
            </p>
          </div>

          <div className="tools-landing-flow-card" aria-hidden>
            <div className="tools-landing-flow-track">
              <div className="tools-landing-flow-node">
                <span className="tools-landing-flow-node-label">Input</span>
                <span className="tools-landing-flow-node-value">Your tasks &amp; calendar</span>
              </div>
              <span className="tools-landing-flow-arrow" />
              <div className="tools-landing-flow-node">
                <span className="tools-landing-flow-node-label">Engine</span>
                <span className="tools-landing-flow-node-value">Parse · query · route</span>
              </div>
              <span className="tools-landing-flow-arrow" />
              <div className="tools-landing-flow-node">
                <span className="tools-landing-flow-node-label">Output</span>
                <span className="tools-landing-flow-node-value">Deterministic answer</span>
              </div>
            </div>
            <p className="tools-landing-flow-foot">No external AI — ever</p>
          </div>

          <ul className="tools-landing-no-ai-chips">
            <li><Wrench size={13} aria-hidden /> Slash commands</li>
            <li><Command size={13} aria-hidden /> Schedule queries</li>
            <li><Binary size={13} aria-hidden /> Plain math &amp; APIs</li>
          </ul>
        </div>
      </section>

      <section className="tools-landing-pledge tools-landing-scroll-reveal">
        <div className="tools-landing-pledge-inner">
          <p className="tools-landing-eyebrow">The pledge</p>
          <h2>Free isn&apos;t a trial. It&apos;s the deal.</h2>
          <p>
            Plexity will stay free. No paywalled core utilities, no selling your homework
            data to train models — there aren&apos;t any models. I build this because I use it
            every day and I&apos;d rather share a clean workspace than gate it.
          </p>
          <p className="tools-landing-pledge-aside">
            If that ever changes, I&apos;ll say so plainly. Until then: use it, break it, tell me
            what&apos;s rough.
          </p>
        </div>
      </section>

      <section className="tools-landing-section tools-landing-scroll-reveal">
        <div className="tools-landing-section-intro">
          <h2>Built to stay out of your way</h2>
          <p>
            Same dark minimal shell everywhere. Pin what you need, ignore the rest. Fast enough to
            open between lectures.
          </p>
        </div>
        <div className="tools-landing-pillars">
          {PRINCIPLES.map(({ icon: Icon, title, text }) => (
            <article key={title} className="tools-landing-pillar">
              <div className="tools-landing-pillar-icon" aria-hidden>
                <Icon size={20} strokeWidth={1.75} />
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id={TOOLS_COLLECTION_ID} className="tools-landing-section tools-landing-scroll-reveal">
        <div className="tools-landing-section-head">
          <div>
            <h2 className="tools-landing-section-title">The collection</h2>
            <p className="tools-landing-section-sub">
              {TOOL_REGISTRY.length} tools and counting — each one a remake of something I got tired
              of fighting. Pin favorites from the catalog.
            </p>
          </div>
          {user ? (
            <Link to="/catalog" className="tools-landing-link">
              Open catalog
              <ArrowRight size={14} aria-hidden />
            </Link>
          ) : (
            <button type="button" className="tools-landing-link" onClick={scrollToToolsCollection}>
              Browse tools
              <ArrowRight size={14} aria-hidden />
            </button>
          )}
        </div>
        <div className="tools-landing-tool-grid">
          {TOOL_REGISTRY.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link key={tool.id} to={tool.route} className="tools-landing-tool-card">
                <span className="tools-landing-tool-icon" aria-hidden>
                  <Icon size={20} strokeWidth={1.75} />
                </span>
                <span className="tools-landing-tool-label">{tool.label}</span>
                <span className="tools-landing-tool-desc">{tool.description}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="tools-landing-section tools-landing-sync tools-landing-scroll-reveal">
        <div className="tools-landing-section-intro">
          <h2>Data, honestly</h2>
          <p>
            Create a free account to open any tool. Your workspace syncs across devices;
            a few features (vault, PDF edits) always stay on this browser.
          </p>
        </div>
        <div className="tools-landing-sync-grid tools-landing-sync-grid--three">
          <div className="tools-landing-sync-card">
            <h3>Signed in</h3>
            <ul>
              {SYNC_SIGNED_IN.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div className="tools-landing-sync-card">
            <h3>Always local</h3>
            <ul>
              {SYNC_LOCAL.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </div>
        <p className="tools-landing-sync-note">
          <Link to="/privacy">Privacy policy</Link>
          {' '}
          — cloud rows are scoped to your account; vault keys never leave this device.
        </p>
      </section>

      <section className="tools-landing-cta-band tools-landing-scroll-reveal">
        <div className="tools-landing-cta-inner">
          <h2>Try the workspace</h2>
          <p>
            Pin a few tools, hit Cmd+K once, see if it sticks. No upsell at the end — just a
            collection that keeps growing as I find more everyday problems worth fixing.
          </p>
          <Link
            to={user ? appEntryRoute : '/signup'}
            className="btn btn-primary tools-landing-btn"
          >
            {user ? 'Open workspace' : 'Create free account'}
            <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </section>
    </div>
  );
}
