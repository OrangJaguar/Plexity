import { useState } from 'react';
import { KeyRound, Lock } from 'lucide-react';
import { VaultBtn, VaultField, VaultInput, VaultTrustBanner } from '@/components/tools/passwords/passwords-shared';
import {
  unlockVaultWithMasterPassword,
  unlockVaultWithRecoveryKey,
} from '@/lib/tools/passwords/vault-crypto';

export default function VaultUnlockScreen({ envelope, onUnlock, unlocking }) {
  const [mode, setMode] = useState('master');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e?.preventDefault();
    setError('');
    if (!secret.trim()) return;
    try {
      const result = mode === 'master'
        ? await unlockVaultWithMasterPassword(secret, envelope)
        : await unlockVaultWithRecoveryKey(secret, envelope);
      await onUnlock(result);
      setSecret('');
    } catch (err) {
      setError(err?.message || 'Unlock failed.');
    }
  };

  return (
    <div className="vault-locked">
      <div className="vault-locked-card">
        <div className="vault-locked-icon" aria-hidden>
          <Lock size={32} strokeWidth={1.5} />
        </div>
        <h1>Vault locked</h1>
        <p>
          You are signed in to Plexity, but your credentials vault is separate.
          Unlock with your master password to decrypt entries on this device.
        </p>

        <VaultTrustBanner />

        <div className="vault-unlock-tabs">
          <button type="button" className={mode === 'master' ? 'is-active' : ''} onClick={() => { setMode('master'); setError(''); }}>
            Master password
          </button>
          <button type="button" className={mode === 'recovery' ? 'is-active' : ''} onClick={() => { setMode('recovery'); setError(''); }}>
            Recovery key
          </button>
        </div>

        <form className="vault-unlock-form" onSubmit={submit}>
          <VaultField
            label={mode === 'master' ? 'Master password' : 'Recovery key'}
            hint={mode === 'recovery' ? 'Format: VRDN-XXXXX-…' : undefined}
          >
            <VaultInput
              type={mode === 'master' ? 'password' : 'text'}
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              autoComplete="off"
              placeholder={mode === 'master' ? 'Your vault master password' : 'VRDN-…'}
            />
          </VaultField>
          {error ? <p className="vault-error">{error}</p> : null}
          <VaultBtn variant="primary" type="submit" disabled={unlocking || !secret.trim()}>
            <KeyRound size={16} />
            {unlocking ? 'Unlocking…' : 'Unlock vault'}
          </VaultBtn>
        </form>
      </div>
    </div>
  );
}
