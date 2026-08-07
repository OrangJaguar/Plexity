import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createUserPreferencesOnSignup } from '@/api/entities/preferences';
import { queryClient } from '@/lib/query-client';
import { clearInMemoryUserQueries, clearLegacyPersistedCache } from '@/lib/query-persist';
import { trackProductEvent } from '@/lib/analytics';
import { syncAuthUserFullName, refreshAuthUser } from '@/api/auth/userProfile';
import {
  loginWithEmailPassword,
  registerWithEmailPassword,
  resendSignupVerification,
} from '@/api/auth/session';
import { isValidSignupPassword, passwordsMatch } from '@/utils/schemas/password';
import {
  AuthFieldRules,
  allRulesPass,
  buildConfirmPasswordRules,
  buildPasswordRules,
} from '@/components/auth/AuthFieldRules';

function EyeIcon({ visible }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
      {!visible && <line x1="2" y1="2" x2="22" y2="22" />}
    </svg>
  );
}

function displayNameFromEmail(value) {
  const local = String(value || '').split('@')[0]?.trim();
  return local || 'User';
}

function authErrorMessage(err, fallback) {
  const msg = err?.response?.data?.message || err?.data?.message || err?.message || fallback;
  return typeof msg === 'string' ? msg : fallback;
}

async function finishSignupSession(user, email, activeTab, onSuccess) {
  const displayName = displayNameFromEmail(user?.email || email);
  try {
    await createUserPreferencesOnSignup({ userEmail: user.email || email });
  } catch (prefErr) {
    throw new Error(prefErr?.message || 'Could not finish setting up your account. Try again or contact support.');
  }
  try {
    await syncAuthUserFullName(displayName);
  } catch {
    // Preferences still saved; display name sync can retry later
  }
  clearInMemoryUserQueries(queryClient);
  clearLegacyPersistedCache();
  const refreshedUser = await refreshAuthUser();
  if (activeTab === 'signup') {
    trackProductEvent('signup_complete');
  }
  onSuccess(refreshedUser ?? user);
}

export default function AuthForm({
  defaultTab = 'login',
  allowTabSwitch = false,
  onSuccess,
}) {
  const [tab, setTab] = useState(defaultTab);
  const [step, setStep] = useState('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  const [legalAgreed, setLegalAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const activeTab = allowTabSwitch ? tab : defaultTab;
  const isSignup = activeTab === 'signup';

  const passwordRules = buildPasswordRules(password, passwordFocused);
  const confirmRules = buildConfirmPasswordRules(password, confirmPassword, confirmPasswordFocused);
  const showPasswordRules = isSignup && (passwordFocused || password.length > 0);
  const showConfirmRules = isSignup && (confirmPasswordFocused || confirmPassword.length > 0);

  function resetMessages() { setError(''); setInfo(''); }

  const signupReady = isSignup
    && allRulesPass(passwordRules)
    && isValidSignupPassword(password)
    && allRulesPass(confirmRules)
    && passwordsMatch(password, confirmPassword)
    && legalAgreed
    && Boolean(email.trim());

  async function handleSubmit(e) {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      if (activeTab === 'login') {
        const user = await loginWithEmailPassword(email, password);
        // Email-confirm signups finish prefs on first login (no OTP session).
        try {
          await createUserPreferencesOnSignup({ userEmail: user.email });
        } catch {
          // Non-blocking — tools can still create prefs later
        }
        onSuccess(user);
      } else {
        if (!signupReady) {
          setError('Please fix the highlighted fields and accept the terms.');
          setLoading(false);
          return;
        }
        const displayName = displayNameFromEmail(email);
        const { needsEmailConfirmation, user } = await registerWithEmailPassword({
          email,
          password,
          full_name: displayName,
        });

        if (needsEmailConfirmation) {
          setInfo('Check your email for a confirmation link, then sign in.');
          setStep('check-email');
        } else if (user) {
          await finishSignupSession(user, email, activeTab, onSuccess);
        } else {
          setError('Account created but session is missing. Try signing in.');
        }
      }
    } catch (err) {
      setError(authErrorMessage(err, 'Something went wrong.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    resetMessages();
    setLoading(true);
    try {
      await resendSignupVerification(email);
      setInfo('Confirmation email resent.');
    } catch (err) {
      setError(authErrorMessage(err, 'Could not resend.'));
    } finally {
      setLoading(false);
    }
  }

  function resetSignupFields() {
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setPasswordFocused(false);
    setConfirmPasswordFocused(false);
    setLegalAgreed(false);
  }

  return (
    <div className="auth-form">
      {info && (
        <div className="auth-banner auth-banner-info">{info}</div>
      )}
      {error && (
        <div className="auth-banner auth-banner-error">{error}</div>
      )}

      {step === 'check-email' ? (
        <>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            We sent a confirmation link to <strong style={{ color: 'var(--text-main)' }}>{email}</strong>.
            Open it, then come back and sign in.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" onClick={handleResend} disabled={loading} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline' }}>
              Resend email
            </button>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>·</span>
            <button
              type="button"
              onClick={() => { setStep('form'); setTab('login'); resetMessages(); resetSignupFields(); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline' }}
            >
              Back to sign in
            </button>
          </div>
        </>
      ) : (
        <>
          {allowTabSwitch && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', background: 'var(--surface)', borderRadius: '999px', padding: '3px', border: '1px solid var(--border)' }}>
              {['login', 'signup'].map((t) => (
                <button key={t} type="button" onClick={() => { setTab(t); resetMessages(); setShowPassword(false); resetSignupFields(); }} style={{ flex: 1, border: 'none', borderRadius: '999px', padding: '0.45rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', background: tab === t ? 'var(--primary)' : 'transparent', color: tab === t ? 'var(--primary-fg)' : 'var(--text-muted)', transition: 'all 0.15s' }}>
                  {t === 'login' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form-fields">
            <div className="app-form-field auth-field-block" style={{ margin: 0 }}>
              <label htmlFor="auth-email">Email</label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
                autoComplete="email"
              />
            </div>
            <div className="app-form-field auth-field-block" style={{ margin: 0 }}>
              <label htmlFor="auth-password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  placeholder={isSignup ? 'Create a password' : '••••••••'}
                  required
                  minLength={isSignup ? 8 : 1}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  style={{ paddingRight: '2.5rem' }}
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="auth-password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  <EyeIcon visible={showPassword} />
                </button>
              </div>
              {showPasswordRules && (
                <AuthFieldRules rules={passwordRules} columns={1} />
              )}
            </div>
            {isSignup && (
              <div className="app-form-field auth-field-block" style={{ margin: 0 }}>
                <label htmlFor="auth-confirm-password">Confirm password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="auth-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onFocus={() => setConfirmPasswordFocused(true)}
                    onBlur={() => setConfirmPasswordFocused(false)}
                    placeholder="Re-enter your password"
                    required
                    autoComplete="new-password"
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword((v) => !v)} className="auth-password-toggle" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                    <EyeIcon visible={showConfirmPassword} />
                  </button>
                </div>
                {showConfirmRules && (
                  <AuthFieldRules rules={confirmRules} columns={1} />
                )}
              </div>
            )}
            {isSignup && (
              <label className="auth-legal-checkbox">
                <input
                  type="checkbox"
                  checked={legalAgreed}
                  onChange={(e) => setLegalAgreed(e.target.checked)}
                />
                <span>
                  I agree to the{' '}
                  <Link to="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</Link>
                  {' '}and{' '}
                  <Link to="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</Link>
                  , and confirm I am at least 13 years old.
                </span>
              </label>
            )}
            {activeTab === 'login' && (
              <p className="auth-forgot-password">
                <Link to="/forgot-password">Forgot password?</Link>
              </p>
            )}
            <button
              type="submit"
              className="btn btn-primary auth-submit"
              disabled={loading || (isSignup && !signupReady)}
            >
              {loading ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}
            </button>
          </form>
          {allowTabSwitch && (
            <p className="auth-switch-tab">
              {tab === 'login' ? 'Need an account?' : 'Already have an account?'}{' '}
              <button type="button" onClick={() => { setTab(tab === 'login' ? 'signup' : 'login'); resetMessages(); resetSignupFields(); }} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem', padding: 0, textDecoration: 'underline' }}>
                {tab === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          )}
        </>
      )}
    </div>
  );
}