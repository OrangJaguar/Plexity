import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createUserPreferencesOnSignup } from '@/api/entities/preferences';
import { queryClient } from '@/lib/query-client';
import { clearInMemoryUserQueries, clearLegacyPersistedCache } from '@/lib/query-persist';
import { clearOnboardingDoneLocally } from '@/lib/onboardingStorage';
import { trackProductEvent } from '@/lib/analytics';
import { syncAuthUserFullName, refreshAuthUser } from '@/api/auth/userProfile';
import { useUsernameAvailability } from '@/hooks/useUsernameAvailability';
import { isValidUsernameFormat, normalizeUsername } from '@/utils/schemas/preferences';
import { isValidSignupPassword, passwordsMatch } from '@/utils/schemas/password';
import {
  AuthFieldRules,
  allRulesPass,
  buildConfirmPasswordRules,
  buildPasswordRules,
  buildUsernameRules,
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

function UsernameStatus({ status }) {
  if (status === 'checking') return <span className="auth-username-status checking">Checking…</span>;
  if (status === 'available') return <span className="auth-username-status available">✓ Available</span>;
  if (status === 'taken') return <span className="auth-username-status taken">✗ Taken</span>;
  if (status === 'invalid') return <span className="auth-username-status taken">Invalid format</span>;
  return null;
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
  const [username, setUsername] = useState('');
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  const [legalAgreed, setLegalAgreed] = useState(false);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const inputRefs = useRef([]);
  const pendingUsernameRef = useRef('');

  const activeTab = allowTabSwitch ? tab : defaultTab;
  const isSignup = activeTab === 'signup';
  const usernameStatus = useUsernameAvailability(username, {
    enabled: isSignup && step === 'form',
  });

  const usernameRules = buildUsernameRules(username, usernameFocused);
  const passwordRules = buildPasswordRules(password, passwordFocused);
  const confirmRules = buildConfirmPasswordRules(password, confirmPassword, confirmPasswordFocused);
  const showUsernameRules = isSignup && (usernameFocused || username.length > 0);
  const showPasswordRules = isSignup && (passwordFocused || password.length > 0);
  const showConfirmRules = isSignup && (confirmPasswordFocused || confirmPassword.length > 0);

  function resetMessages() { setError(''); setInfo(''); }

  function handleDigitChange(idx, val) {
    const char = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = char;
    setDigits(next);
    if (char && idx < 5) inputRefs.current[idx + 1]?.focus();
  }

  function handleDigitKeyDown(idx, e) {
    if (e.key === 'Backspace') {
      if (digits[idx]) {
        const next = [...digits]; next[idx] = ''; setDigits(next);
      } else if (idx > 0) {
        inputRefs.current[idx - 1]?.focus();
      }
    }
  }

  function handleDigitPaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = ['', '', '', '', '', ''];
    pasted.split('').forEach((c, i) => { next[i] = c; });
    setDigits(next);
    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
  }

  const otpCode = digits.join('');

  const signupReady = isSignup
    && allRulesPass(usernameRules)
    && isValidUsernameFormat(username)
    && usernameStatus === 'available'
    && allRulesPass(passwordRules)
    && isValidSignupPassword(password)
    && allRulesPass(confirmRules)
    && passwordsMatch(password, confirmPassword)
    && legalAgreed;

  async function handleSubmit(e) {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      if (activeTab === 'login') {
        await base44.auth.loginViaEmailPassword(email, password);
        const user = await base44.auth.me();
        onSuccess(user);
      } else {
        if (!signupReady) {
          setError('Please fix the highlighted fields and accept the terms.');
          setLoading(false);
          return;
        }
        const normalized = normalizeUsername(username);
        pendingUsernameRef.current = normalized;
        await base44.auth.register({ email, password, full_name: normalized });
        setInfo('Code sent! Check your email.');
        setStep('verify');
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.data?.message || err?.message || 'Something went wrong.';
      const msgStr = typeof msg === 'string' ? msg : 'Something went wrong.';
      if (/verif|otp|code/i.test(msgStr)) {
        setInfo('Check your email for a verification code.');
        setStep('verify');
      } else {
        setError(msgStr);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    if (otpCode.length < 6) { setError('Please enter all 6 digits.'); return; }
    resetMessages();
    setLoading(true);
    try {
      const response = await base44.auth.verifyOtp({ email, otpCode });
      const token = response?.access_token || response?.token || response?.data?.access_token;
      if (token) base44.auth.setToken(token);
      const user = await base44.auth.me();
      const chosenUsername = pendingUsernameRef.current || normalizeUsername(username);
      if (chosenUsername) {
        await createUserPreferencesOnSignup({
          username: chosenUsername,
          userEmail: user.email,
        });
        try {
          await syncAuthUserFullName(chosenUsername);
        } catch {
          // UserPreferences.username still saved; SyncUserDisplayName repairs on next load
        }
      }
      clearOnboardingDoneLocally(user.email);
      clearInMemoryUserQueries(queryClient);
      clearLegacyPersistedCache();
      const refreshedUser = await refreshAuthUser();
      if (activeTab === 'signup') {
        trackProductEvent('signup_complete');
      }
      onSuccess(refreshedUser ?? user);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.data?.message || err?.message || 'Invalid code. Try again.';
      setError(typeof msg === 'string' ? msg : 'Invalid code. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    resetMessages();
    setLoading(true);
    try {
      await base44.auth.resendOtp(email);
      setInfo('New code sent!');
    } catch (err) {
      const msg = err?.response?.data?.message || err?.data?.message || err?.message || 'Could not resend code.';
      setError(typeof msg === 'string' ? msg : 'Could not resend code.');
    } finally {
      setLoading(false);
    }
  }

  function resetSignupFields() {
    setConfirmPassword('');
    setUsernameFocused(false);
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

      {step === 'verify' ? (
        <>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            A 6-digit code was sent to <strong style={{ color: 'var(--text-main)' }}>{email}</strong>.
          </p>
          <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(i, e)}
                  onPaste={i === 0 ? handleDigitPaste : undefined}
                  autoFocus={i === 0}
                  style={{
                    width: 44, height: 52, textAlign: 'center', fontSize: '1.4rem', fontWeight: 700,
                    fontFamily: 'var(--font-mono)', background: 'var(--surface)',
                    border: `1px solid ${d ? 'var(--text-main)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)', color: 'var(--text-main)', outline: 'none',
                    caretColor: 'transparent',
                  }}
                />
              ))}
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading || otpCode.length < 6} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? 'Verifying…' : 'Verify & Sign In'}
            </button>
          </form>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', justifyContent: 'center' }}>
            <button type="button" onClick={handleResend} disabled={loading} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline' }}>
              Resend code
            </button>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>·</span>
            <button type="button" onClick={() => { setStep('form'); resetMessages(); setDigits(['', '', '', '', '', '']); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline' }}>
              Back
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
            {isSignup && (
              <div className="veridian-form-field auth-field-block" style={{ margin: 0 }}>
                <label htmlFor="auth-username">Username</label>
                <input
                  id="auth-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(normalizeUsername(e.target.value))}
                  onFocus={() => setUsernameFocused(true)}
                  onBlur={() => setUsernameFocused(false)}
                  placeholder="your_username"
                  required
                  autoFocus
                  autoComplete="username"
                  spellCheck={false}
                />
                {showUsernameRules && (
                  <AuthFieldRules rules={usernameRules} columns={1} />
                )}
                <UsernameStatus status={usernameStatus} />
              </div>
            )}
            <div className="veridian-form-field auth-field-block" style={{ margin: 0 }}>
              <label htmlFor="auth-email">Email</label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus={!isSignup}
                autoComplete="email"
              />
            </div>
            <div className="veridian-form-field auth-field-block" style={{ margin: 0 }}>
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
              <div className="veridian-form-field auth-field-block" style={{ margin: 0 }}>
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
              className="btn btn-primary auth-submit-btn"
              disabled={loading || (isSignup && !signupReady)}
            >
              {loading ? 'Please wait…' : activeTab === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {!allowTabSwitch && (
            <p style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {activeTab === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <Link to={activeTab === 'login' ? '/signup' : '/signin'} style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '0.75rem', textDecoration: 'underline' }}>
                {activeTab === 'login' ? 'Sign up' : 'Sign in'}
              </Link>
            </p>
          )}

          {allowTabSwitch && (
            <p style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
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
