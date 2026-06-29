import { useState } from 'react';
import { Check, Copy, KeyRound, Shield } from 'lucide-react';
import VeridianCheckbox from '@/components/shared/form/VeridianCheckbox';
import { VaultBtn, VaultField, VaultInput, VaultTrustBanner, copyToClipboard } from '@/components/tools/passwords/passwords-shared';
import {
  AuthFieldRules,
  allVaultMasterRulesPass,
  buildVaultConfirmPasswordRules,
  buildVaultMasterPasswordRules,
} from '@/components/tools/passwords/vault-password-rules';
import {
  createVaultEnvelope,
  estimateMasterPasswordStrength,
} from '@/lib/tools/passwords/vault-crypto';
import { emptyVaultPayload } from '@/lib/tools/passwords/passwords-model';

export default function VaultSetupWizard({ onComplete, saving }) {
  const [step, setStep] = useState(1);
  const [master, setMaster] = useState('');
  const [confirm, setConfirm] = useState('');
  const [masterFocused, setMasterFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [savedRecovery, setSavedRecovery] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState('');
  const [pendingSetup, setPendingSetup] = useState(null);
  const [error, setError] = useState('');

  const strength = estimateMasterPasswordStrength(master);
  const masterRules = buildVaultMasterPasswordRules(master, masterFocused);
  const confirmRules = buildVaultConfirmPasswordRules(master, confirm, confirmFocused);
  const showMasterRules = masterFocused || master.length > 0;
  const showConfirmRules = confirmFocused || confirm.length > 0;
  const canContinue = allVaultMasterRulesPass(master, confirm) && strength.score >= 2;

  const handleCreate = async () => {
    setError('');
    if (!canContinue) {
      setError('Use a stronger master password and confirm it matches.');
      return;
    }
    try {
      const payload = emptyVaultPayload();
      const result = await createVaultEnvelope(master, payload);
      setPendingSetup(result);
      setRecoveryKey(result.recoveryKey);
      setStep(2);
    } catch (err) {
      setError(err?.message || 'Could not create vault.');
    }
  };

  const finish = async () => {
    if (!savedRecovery || !pendingSetup) {
      setError('Confirm you have saved your recovery key.');
      return;
    }
    setError('');
    try {
      await onComplete({
        envelope: pendingSetup.envelope,
        recoveryKey: pendingSetup.recoveryKey,
        vaultKey: pendingSetup.vaultKey,
        vaultData: emptyVaultPayload(),
      });
    } catch (err) {
      setError(err?.message || 'Setup failed.');
    }
  };

  return (
    <div className="vault-setup">
      <header className="vault-setup-hero">
        <div className="vault-setup-icon" aria-hidden>
          <Shield size={28} strokeWidth={1.5} />
        </div>
        <h1>Create your vault</h1>
        <p>
          Your credentials are encrypted on this device before anything is saved.
          Your master password never leaves your device in a readable form.
        </p>
      </header>

      <VaultTrustBanner />

      {step === 1 ? (
        <div className="vault-setup-panel">
          <h2>Step 1 — Master password</h2>
          <p className="vault-setup-lead">
            Choose a strong passphrase you can remember. We cannot reset this for you — that is what keeps the vault zero-knowledge.
          </p>
          <VaultField label="Master password" hint="Use a long passphrase — symbols and spaces are allowed">
            <VaultInput
              type="password"
              value={master}
              onChange={(e) => setMaster(e.target.value)}
              onFocus={() => setMasterFocused(true)}
              onBlur={() => setMasterFocused(false)}
              autoComplete="new-password"
              placeholder="A long, memorable secret"
            />
          </VaultField>
          {showMasterRules ? <AuthFieldRules rules={masterRules} columns={1} /> : null}
          <div className={`vault-strength vault-strength--${strength.className}`}>
            {strength.label}
          </div>
          <VaultField label="Confirm master password">
            <VaultInput
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onFocus={() => setConfirmFocused(true)}
              onBlur={() => setConfirmFocused(false)}
              autoComplete="new-password"
            />
          </VaultField>
          {showConfirmRules ? <AuthFieldRules rules={confirmRules} columns={1} /> : null}
          {error ? <p className="vault-error">{error}</p> : null}
          <VaultBtn variant="primary" onClick={handleCreate} disabled={!canContinue}>
            Continue
          </VaultBtn>
        </div>
      ) : (
        <div className="vault-setup-panel">
          <h2>Step 2 — Recovery key</h2>
          <p className="vault-setup-lead">
            Save this offline. It is the only way to recover access if you forget your master password — we cannot decrypt your vault for you.
          </p>
          <div className="vault-recovery-key-box">
            <KeyRound size={18} aria-hidden />
            <code>{recoveryKey}</code>
            <VaultBtn variant="ghost" size="sm" onClick={() => copyToClipboard(recoveryKey, 'Recovery key copied')}>
              <Copy size={14} />
              Copy
            </VaultBtn>
          </div>
          <VeridianCheckbox
            checked={savedRecovery}
            onChange={(e) => setSavedRecovery(e.target.checked)}
          >
            I have saved my recovery key somewhere safe
          </VeridianCheckbox>
          {error ? <p className="vault-error">{error}</p> : null}
          <VaultBtn variant="primary" onClick={finish} disabled={!savedRecovery || saving}>
            {saving ? 'Creating vault…' : 'Create vault'}
          </VaultBtn>
        </div>
      )}

      <ul className="vault-setup-steps">
        <li className={step >= 1 ? 'is-done' : ''}><Check size={12} /> Master password</li>
        <li className={step >= 2 ? 'is-done' : ''}><Check size={12} /> Recovery key</li>
      </ul>
    </div>
  );
}
