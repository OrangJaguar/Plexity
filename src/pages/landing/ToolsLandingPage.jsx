import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function ToolsLandingPage() {
  const { user, isLoading } = useAuth();

  return (
    <div className="tools-landing">
      <section className="tools-landing-hero">
        <p className="tools-landing-eyebrow">Veridian Tools</p>
        <h1>Your student productivity suite</h1>
        <p className="tools-landing-lead">
          Tasks, calendar, focus, grades, PDF tools, stocks, and more — one workspace built for school.
        </p>
        <div className="tools-landing-actions">
          {!isLoading && user ? (
            <Link to="/tools/dashboard" className="btn btn-primary">
              Open Dashboard
            </Link>
          ) : (
            <>
              <Link to="/tools/dashboard" className="btn btn-primary">
                Explore Tools
              </Link>
              <Link to="/signin" className="btn">
                Sign in
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
