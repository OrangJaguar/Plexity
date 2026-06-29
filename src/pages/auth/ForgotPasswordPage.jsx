import { useState } from 'react';
import { Link } from 'react-router-dom';
import PublicOnly from '@/components/routing/PublicOnly';
import { requestPasswordReset } from '@/api/auth/password';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PublicOnly>
      <div className="forgot-password-page">
        <h1 className="forgot-password-title">Reset your password</h1>
        {sent ? (
          <div className="auth-banner auth-banner-info">
            If an account exists for that email, we sent a reset link. Check your inbox and spam folder.
          </div>
        ) : (
          <>
            <p className="forgot-password-lead">
              Enter your email and we&apos;ll send you a link to choose a new password.
            </p>
            {error && <div className="auth-banner auth-banner-error">{error}</div>}
            <form onSubmit={handleSubmit} className="auth-form-fields">
              <div className="app-form-field auth-field-block" style={{ margin: 0 }}>
                <label htmlFor="forgot-email">Email</label>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                  autoComplete="email"
                />
              </div>
              <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          </>
        )}
        <p className="forgot-password-back">
          <Link to="/signin">← Back to sign in</Link>
        </p>
      </div>
    </PublicOnly>
  );
}
