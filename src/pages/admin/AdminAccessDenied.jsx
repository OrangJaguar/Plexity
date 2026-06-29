import { Link } from 'react-router-dom';

export default function AdminAccessDenied() {
  return (
    <div className="admin-access-denied">
      <h1>Access denied</h1>
      <p>You need an admin account to view this page.</p>
      <Link to="/" className="btn btn-primary">Back home</Link>
    </div>
  );
}
