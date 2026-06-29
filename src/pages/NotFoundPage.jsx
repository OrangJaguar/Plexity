import { Link } from 'react-router-dom';
import { usePageMeta } from '@/hooks/usePageMeta';

export default function NotFoundPage() {
  usePageMeta({
    title: 'Page not found',
    description: 'The page you are looking for does not exist on Veridian Tools.',
  });

  return (
    <div className="not-found-page">
      <h1 className="not-found-title">Page not found</h1>
      <p className="not-found-lead">
        The page you are looking for does not exist or may have moved.
      </p>
      <div className="not-found-actions">
        <Link to="/" className="btn btn-primary">Return home</Link>
        <Link to="/tools/dashboard" className="btn">Open dashboard</Link>
      </div>
    </div>
  );
}
