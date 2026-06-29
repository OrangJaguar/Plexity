function RuleIcon({ state }) {
  if (state === 'pass') {
    return (
      <span className="auth-rule-icon pass" aria-hidden="true">
        ✓
      </span>
    );
  }
  if (state === 'fail') {
    return (
      <span className="auth-rule-icon fail" aria-hidden="true">
        ✗
      </span>
    );
  }
  return <span className="auth-rule-icon idle" aria-hidden="true">○</span>;
}

function ruleState(value, focused, test) {
  const hasInput = value.length > 0;
  if (!hasInput && !focused) return 'idle';
  if (!hasInput && focused) return 'idle';
  return test(value) ? 'pass' : 'fail';
}

export function AuthFieldRules({ rules, columns = 1 }) {
  return (
    <ul className={`auth-field-rules cols-${columns}`} aria-live="polite">
      {rules.map(({ label, state }) => (
        <li key={label} className={`auth-field-rule state-${state}`}>
          <RuleIcon state={state} />
          <span>{label}</span>
        </li>
      ))}
    </ul>
  );
}

export function buildJourneyTitleRules(title, focused) {
  const value = title ?? '';
  return [
    {
      label: '3–50 characters',
      state: ruleState(value, focused, (v) => v.trim().length >= 3 && v.trim().length <= 50),
    },
    {
      label: 'Starts with a letter or number',
      state: ruleState(value, focused, (v) => /^[A-Za-z0-9]/.test(v.trim())),
    },
    {
      label: 'Letters, numbers, spaces, hyphens, and & only',
      state: ruleState(
        value,
        focused,
        (v) => v.trim().length === 0 || /^[A-Za-z0-9][A-Za-z0-9\s\-&]*$/.test(v.trim()),
      ),
    },
  ];
}

export function buildUsernameRules(username, focused) {
  const value = username ?? '';
  return [
    {
      label: 'Must start with a letter',
      state: ruleState(value, focused, (v) => /^[a-z]/.test(v)),
    },
    {
      label: '3–20 characters',
      state: ruleState(value, focused, (v) => v.length >= 3 && v.length <= 20),
    },
    {
      label: 'Letters, numbers, _ and . only',
      state: ruleState(value, focused, (v) => v.length === 0 || /^[a-z0-9_.]*$/.test(v)),
    },
  ];
}

export function buildPasswordRules(password, focused) {
  const value = password ?? '';
  return [
    {
      label: 'At least 8 characters',
      state: ruleState(value, focused, (v) => v.length >= 8),
    },
    {
      label: 'Contains a letter',
      state: ruleState(value, focused, (v) => /[a-zA-Z]/.test(v)),
    },
    {
      label: 'Contains a number',
      state: ruleState(value, focused, (v) => /\d/.test(v)),
    },
  ];
}

export function buildConfirmPasswordRules(password, confirmPassword, focused) {
  const value = confirmPassword ?? '';
  return [
    {
      label: 'Passwords must match',
      state: ruleState(value, focused, (v) => v.length > 0 && v === password),
    },
  ];
}

export function allRulesPass(rules) {
  return rules.every((r) => r.state === 'pass');
}
