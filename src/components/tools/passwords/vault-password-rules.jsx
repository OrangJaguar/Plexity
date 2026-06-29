import { AuthFieldRules } from '@/components/auth/AuthFieldRules';

function ruleState(value, focused, test) {
  const hasInput = value.length > 0;
  if (!hasInput && !focused) return 'idle';
  if (!hasInput && focused) return 'idle';
  return test(value) ? 'pass' : 'fail';
}

export function buildVaultMasterPasswordRules(password, focused) {
  const value = password ?? '';
  return [
    {
      label: 'At least 12 characters',
      state: ruleState(value, focused, (v) => v.length >= 12),
    },
    {
      label: 'Contains a letter',
      state: ruleState(value, focused, (v) => /[a-zA-Z]/.test(v)),
    },
    {
      label: 'Contains a number',
      state: ruleState(value, focused, (v) => /\d/.test(v)),
    },
    {
      label: 'Uppercase and lowercase letters',
      state: ruleState(value, focused, (v) => /[a-z]/.test(v) && /[A-Z]/.test(v)),
    },
    {
      label: 'Symbol or space allowed (recommended)',
      state: ruleState(value, focused, (v) => v.length === 0 || /[^a-zA-Z0-9]/.test(v) || /\s/.test(v)),
    },
  ];
}

export function buildVaultConfirmPasswordRules(password, confirmPassword, focused) {
  const value = confirmPassword ?? '';
  return [
    {
      label: 'Passwords must match',
      state: ruleState(value, focused, (v) => v.length > 0 && v === password),
    },
  ];
}

export function allVaultMasterRulesPass(password, confirmPassword) {
  const rules = buildVaultMasterPasswordRules(password, true).slice(0, 4);
  const confirm = buildVaultConfirmPasswordRules(password, confirmPassword, true);
  return rules.every((r) => r.state === 'pass') && confirm.every((r) => r.state === 'pass');
}

export { AuthFieldRules };
