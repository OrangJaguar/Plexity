import { Link, useLocation } from 'react-router-dom';
import {
  Calendar,
  CheckSquare,
  Command,
  GraduationCap,
  Layers,
  Lock,
  Sparkles,
  Timer,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import VeridianLogo from '@/components/layout/VeridianLogo';

const HIGHLIGHTS = [
  { icon: CheckSquare, label: 'Tasks & goals' },
  { icon: Calendar, label: 'Calendar' },
  { icon: Timer, label: 'Focus timer' },
  { icon: GraduationCap, label: 'Grades & college' },
  { icon: Lock, label: 'Encrypted vault' },
  { icon: Command, label: 'Cmd+K assistant' },
];

export default function LoginPrompt({ action = 'use this feature' }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading || user) return null;

  const redirect = encodeURIComponent(location.pathname + location.search);

  return (
    <div className="tools-auth-gate" role="region" aria-label="Sign in required">
      <div className="tools-auth-gate-card">
        <div className="tools-auth-gate-glow" aria-hidden="true" />

        <div className="tools-auth-gate-visual" aria-hidden="true">
          <div className="tools-auth-gate-orbit tools-auth-gate-orbit--a" />
          <div className="tools-auth-gate-orbit tools-auth-gate-orbit--b" />
          <div className="tools-auth-gate-icon-grid">
            {HIGHLIGHTS.map(({ icon: Icon }, i) => (
              <span key={i} className="tools-auth-gate-icon-cell">
                <Icon size={18} strokeWidth={1.75} />
              </span>
            ))}
          </div>
        </div>

        <div className="tools-auth-gate-body">
          <div className="tools-auth-gate-brand">
            <VeridianLogo size={40} />
            <span className="tools-auth-gate-brand-name">Veridian Tools</span>
          </div>

          <p className="tools-auth-gate-eyebrow">
            <Sparkles size={14} aria-hidden="true" />
            Student productivity suite
          </p>

          <h1 className="tools-auth-gate-title">
            Sign in to <span className="tools-auth-gate-gradient">{action}</span>
          </h1>

          <p className="tools-auth-gate-lead">
            Sixteen fast utilities in one shell — tasks, calendar, focus, journal, PDF tools,
            stocks, calculator, and more. Your workspace syncs securely when you&apos;re signed in.
          </p>

          <ul className="tools-auth-gate-highlights">
            {HIGHLIGHTS.map(({ icon: Icon, label }) => (
              <li key={label}>
                <Icon size={15} strokeWidth={2} aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>

          <div className="tools-auth-gate-sync">
            <Layers size={15} aria-hidden="true" />
            <span>Cloud sync for tasks, calendar, goals &amp; more · vault stays encrypted on your device</span>
          </div>

          <div className="tools-auth-gate-actions">
            <Link to={`/signin?redirect=${redirect}`} className="btn btn-primary tools-auth-gate-btn">
              Sign in
            </Link>
            <Link to="/signup" className="btn tools-auth-gate-btn">
              Create free account
            </Link>
          </div>

          <p className="tools-auth-gate-foot">
            No credit card · Press <kbd>Cmd</kbd>+<kbd>K</kbd> anywhere after sign-in
          </p>
        </div>
      </div>
    </div>
  );
}
