import { Link } from 'react-router-dom';
import {
  KeyRound,
  LayoutDashboard,
  ListChecks,
  Sparkles,
  Target,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import VeridianLogo from '@/components/layout/VeridianLogo';
import { TOOL_REGISTRY } from '@/lib/tools/registry';

const FEATURED_IDS = ['dashboard', 'tasks', 'calendar', 'focus', 'goals', 'passwords'];

const HIGHLIGHTS = [
  {
    icon: LayoutDashboard,
    title: 'One dashboard',
    text: 'Class countdown, schedule blocks, and a daily intel strip — weather, habits, stocks, and priorities.',
  },
  {
    icon: ListChecks,
    title: 'School-first tools',
    text: 'Tasks, calendar, grades, journal, and focus — built around how students actually plan their week.',
  },
  {
    icon: KeyRound,
    title: 'Private by design',
    text: 'Password vault encrypts on your device before anything is stored. Your secrets stay yours.',
  },
];

export default function ToolsLandingPage() {
  const { user, isLoading } = useAuth();
  const featured = FEATURED_IDS
    .map((id) => TOOL_REGISTRY.find((tool) => tool.id === id))
    .filter(Boolean);

  return (
    <div className="tools-landing">
      <section className="tools-landing-hero">
        <div className="tools-landing-hero-inner">
          <VeridianLogo size={48} className="tools-landing-logo" />
          <p className="tools-landing-eyebrow">Veridian Tools</p>
          <h1>Your student productivity suite</h1>
          <p className="tools-landing-lead">
            Tasks, calendar, focus, grades, PDF tools, stocks, and more — one workspace built for school.
            Sign in to sync tasks and calendar across devices.
          </p>
          <div className="tools-landing-actions">
            {!isLoading && user ? (
              <>
                <Link to="/tools/dashboard" className="btn btn-primary">
                  Open Dashboard
                </Link>
                <Link to="/tools/catalog" className="btn">
                  Browse all tools
                </Link>
              </>
            ) : (
              <>
                <Link to="/signup" className="btn btn-primary">
                  Get started free
                </Link>
                <Link to="/tools/dashboard" className="btn">
                  Explore tools
                </Link>
                <Link to="/signin" className="btn btn-subtle">
                  Sign in
                </Link>
              </>
            )}
          </div>
          <p className="tools-landing-hint">
            <Sparkles size={14} aria-hidden />
            {' '}
            Press
            {' '}
            <kbd>Cmd</kbd>
            +
            <kbd>K</kbd>
            {' '}
            anywhere in the app for the command bar.
          </p>
        </div>
      </section>

      <section className="tools-landing-section">
        <h2 className="tools-landing-section-title">Built for the school week</h2>
        <div className="tools-landing-highlights">
          {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
            <article key={title} className="tools-landing-highlight">
              <div className="tools-landing-highlight-icon" aria-hidden>
                <Icon size={22} strokeWidth={1.75} />
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="tools-landing-section">
        <div className="tools-landing-section-head">
          <h2 className="tools-landing-section-title">Popular tools</h2>
          <Link to="/tools/catalog" className="tools-landing-link">
            View full catalog →
          </Link>
        </div>
        <div className="tools-landing-tool-grid">
          {featured.map((tool) => {
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

      <section className="tools-landing-cta">
        <div className="tools-landing-cta-inner">
          <Target size={28} strokeWidth={1.5} aria-hidden />
          <h2>Ready when you are</h2>
          <p>
            Start with the dashboard, pin your favorites, and tune your schedule in settings.
            No clutter — just tools that stay out of your way.
          </p>
          <Link to={user ? '/tools/dashboard' : '/signup'} className="btn btn-primary">
            {user ? 'Go to dashboard' : 'Create your account'}
          </Link>
        </div>
      </section>
    </div>
  );
}
