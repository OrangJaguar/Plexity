import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Cloud,
  Command,
  Layers,
  Lock,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { TOOL_REGISTRY } from '@/lib/tools/registry';

const PILLARS = [
  {
    icon: Zap,
    title: 'Fast by default',
    text: 'No page reloads, no bloated menus. Open a tool, do the thing, move on.',
  },
  {
    icon: Layers,
    title: 'Everything in one place',
    text: 'Dashboard, tasks, calendar, focus, PDFs, stocks, vault — one shell, one command bar.',
  },
  {
    icon: Command,
    title: 'Assistant everywhere',
    text: 'Press Cmd+K from any screen. Slash commands, quick answers, and actions without hunting.',
  },
  {
    icon: Lock,
    title: 'Your data, scoped to you',
    text: 'Signed-in tools sync through Base44 with per-user security. Vault encrypts before it leaves your device.',
  },
];

const COMMAND_DEMO = [
  { cmd: '/task Finish lab write-up due tomorrow', tag: 'Create', label: 'Create task' },
  { cmd: '/goto calendar', tag: 'Navigate', label: 'Go to calendar' },
  { cmd: 'How many tasks are due today?', tag: 'Ask', label: 'Quick ask' },
];

const SYNC_CLOUD = [
  'Tasks, calendar, journal, focus',
  'Goals, lists, grades, profile',
  'College planner, calculator, stocks workspace',
  'Schedule & preferences',
];
const SYNC_LOCAL = ['Password vault (encrypted on device)', 'PDF edits (in-browser only)'];

export default function ToolsLandingPage() {
  const { user, isLoading } = useAuth();
  const [demoIndex, setDemoIndex] = useState(0);
  const demo = COMMAND_DEMO[demoIndex];

  useEffect(() => {
    const id = window.setInterval(() => {
      setDemoIndex((i) => (i + 1) % COMMAND_DEMO.length);
    }, 6500);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="tools-landing">
      <section className="tools-landing-hero tools-landing-reveal">
        <div className="tools-landing-hero-grid">
          <div className="tools-landing-hero-copy">
            <p className="tools-landing-eyebrow">Rebuilt from the ground up</p>
            <h1>
              Your favorite tools.
              <br />
              <span className="tools-landing-gradient">Better UI. Better flow.</span>
            </h1>
            <p className="tools-landing-lead">
              Veridian Tools isn&apos;t another generic productivity suite — it&apos;s the utilities
              you actually use, redesigned to prioritize speed, clarity, and a command assistant
              that follows you everywhere.
            </p>
            <div className="tools-landing-actions">
              {!isLoading && user ? (
                <>
                  <Link to="/tools/dashboard" className="btn btn-primary tools-landing-btn">
                    Open Dashboard
                    <ArrowRight size={16} aria-hidden />
                  </Link>
                  <Link to="/tools/catalog" className="btn tools-landing-btn-secondary">
                    Browse tools
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/signup" className="btn btn-primary tools-landing-btn">
                    Get started
                    <ArrowRight size={16} aria-hidden />
                  </Link>
                  <Link to="/tools/dashboard" className="btn tools-landing-btn-secondary">
                    Try without account
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="tools-landing-command-demo" aria-label="Command bar preview">
            <div className="tools-landing-command-chrome">
              <Sparkles size={15} aria-hidden />
              <span>Command bar</span>
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

      <section className="tools-landing-section tools-landing-reveal tools-landing-reveal--delay-1">
        <div className="tools-landing-section-intro">
          <h2>One workspace. Zero tab sprawl.</h2>
          <p>
            Pin what you use daily. Jump with the sidebar or Cmd+K. Every tool shares the same
            design language — dark, minimal, and built to feel instant.
          </p>
        </div>
        <div className="tools-landing-pillars">
          {PILLARS.map(({ icon: Icon, title, text }) => (
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

      <section className="tools-landing-section tools-landing-reveal tools-landing-reveal--delay-2">
        <div className="tools-landing-section-head">
          <div>
            <h2 className="tools-landing-section-title">The toolkit</h2>
            <p className="tools-landing-section-sub">
              All {TOOL_REGISTRY.length} tools — pin your favorites from the catalog.
            </p>
          </div>
          <Link to="/tools/catalog" className="tools-landing-link">
            Open catalog
            <ArrowRight size={14} aria-hidden />
          </Link>
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

      <section className="tools-landing-section tools-landing-sync tools-landing-reveal tools-landing-reveal--delay-3">
        <div className="tools-landing-section-intro">
          <h2>
            <Cloud size={22} aria-hidden />
            {' '}
            Data &amp; security
          </h2>
          <p>
            Sign in to sync your workspace across devices. Row-level security on Base44
            ensures only you can access your records.
          </p>
        </div>
        <div className="tools-landing-sync-grid">
          <div className="tools-landing-sync-card">
            <h3>Syncs when signed in</h3>
            <ul>
              {SYNC_CLOUD.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div className="tools-landing-sync-card">
            <h3>Stays on this device</h3>
            <ul>
              {SYNC_LOCAL.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </div>
        <p className="tools-landing-sync-note">
          <Link to="/privacy">Read the privacy policy</Link>
          {' '}
          for full details.
        </p>
      </section>

      <section className="tools-landing-cta-band tools-landing-reveal tools-landing-reveal--delay-4">
        <div className="tools-landing-cta-inner">
          <h2>Ready to move faster?</h2>
          <p>
            Open the dashboard, pin your go-to tools, and hit Cmd+K — you&apos;ll feel the difference
            in the first minute.
          </p>
          <Link
            to={user ? '/tools/dashboard' : '/signup'}
            className="btn btn-primary tools-landing-btn"
          >
            {user ? 'Go to dashboard' : 'Create free account'}
            <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </section>
    </div>
  );
}
