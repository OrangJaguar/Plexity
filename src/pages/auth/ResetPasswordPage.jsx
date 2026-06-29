import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import PublicOnly from '@/components/routing/PublicOnly';
import { completePasswordReset } from '@/api/auth/password';
import { isValidSignupPassword, passwordsMatch } from '@/utils/schemas/password';
import {
  AuthFieldRules,
  allRulesPass,
  buildConfirmPasswordRules,
  buildPasswordRules,
} from '@/components/auth/AuthFieldRules';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('reset_token') || searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordRules = buildPasswordRules(password, passwordFocused);
  const confirmRules = buildConfirmPasswordRules(password, confirmPassword, confirmFocused);
  const ready = resetToken
    && allRulesPass(passwordRules)
    && isValidSignupPassword(password)
    && allRulesPass(confirmRules)
    && passwordsMatch(password, confirmPassword);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!ready) return;
    setError('');
    setLoading(true);
    try {
      await completePasswordReset({ resetToken, newPassword: password });
      navigate('/signin', { replace: true, state: { message: 'Password updated. Sign in with your new password.' } });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.data?.message || err?.message;
      setError(typeof msg === 'string' ? msg : 'Could not reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  }

  if (!resetToken) {
    return (
      <PublicOnly>
        <div className="reset-password-page">
          <h1 className="reset-password-title">Invalid reset link</h1>
          <p className="reset-password-lead">
            This password reset link is missing or invalid. Request a new one.
          </p>
          <Link to="/forgot-password" className="btn btn-primary">Request new link</Link>
        </div>
      </PublicOnly>
    );
  }

  return (
    <PublicOnly>
      <div className="reset-password-page">
        <h1 className="reset-password-title">Choose a new password</h1>
        <p className="reset-password-lead">Enter a new password for your account.</p>
        {error && <div className="auth-banner auth-banner-error">{error}</div>}
        <form onSubmit={handleSubmit} className="auth-form-fields">
          <div className="app-form-field auth-field-block" style={{ margin: 0 }}>
            <label htmlFor="reset-password">New password</label>
            <input
              id="reset-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              required
              minLength={8}
              autoComplete="new-password"
              autoFocus
            />
            {(passwordFocused || password.length > 0) && (
              <AuthFieldRules rules={passwordRules} columns={1} />
            )}
          </div>
          <div className="app-form-field auth-field-block" style={{ margin: 0 }}>
            <label htmlFor="reset-confirm">Confirm password</label>
            <input
              id="reset-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onFocus={() => setConfirmFocused(true)}
              onBlur={() => setConfirmFocused(false)}
              required
              autoComplete="new-password"
            />
            {(confirmFocused || confirmPassword.length > 0) && (
              <AuthFieldRules rules={confirmRules} columns={1} />
            )}
          </div>
          <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading || !ready}>
            {loading ? 'Saving…' : 'Update password'}
          </button>
        </form>
        <p className="reset-password-back">
          <Link to="/signin">← Back to sign in</Link>
        </p>
      </div>
    </PublicOnly>
  );
}
