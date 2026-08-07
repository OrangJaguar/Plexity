import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PublicOnly from '@/components/routing/PublicOnly';
import { completePasswordReset } from '@/api/auth/password';
import { getSupabase, isSupabaseConfigured } from '@/api/supabaseClient';
import { isValidSignupPassword, passwordsMatch } from '@/utils/schemas/password';
import {
  AuthFieldRules,
  allRulesPass,
  buildConfirmPasswordRules,
  buildPasswordRules,
} from '@/components/auth/AuthFieldRules';

export default function ResetPasswordPage() {
  const navigate = useNavigate();

  const [readySession, setReadySession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setReadySession(false);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      const { data } = await getSupabase().auth.getSession();
      if (!cancelled && data.session) setReadySession(true);
    })();

    const { data: sub } = getSupabase().auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReadySession(true);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const passwordRules = buildPasswordRules(password, passwordFocused);
  const confirmRules = buildConfirmPasswordRules(password, confirmPassword, confirmFocused);
  const ready = readySession
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
      await completePasswordReset({ newPassword: password });
      navigate('/signin', { replace: true, state: { message: 'Password updated. Sign in with your new password.' } });
    } catch (err) {
      const msg = err?.message;
      setError(typeof msg === 'string' ? msg : 'Could not reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  }

  if (!readySession) {
    return (
      <PublicOnly>
        <div className="reset-password-page">
          <h1 className="reset-password-title">Opening reset link…</h1>
          <p className="reset-password-lead">
            If nothing happens, request a new password reset email.
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
      </div>
    </PublicOnly>
  );
}
