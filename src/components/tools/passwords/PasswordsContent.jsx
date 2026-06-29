import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import PasswordsWorkspace from '@/components/tools/passwords/PasswordsWorkspace';
import VaultSetupWizard from '@/components/tools/passwords/VaultSetupWizard';
import VaultUnlockScreen from '@/components/tools/passwords/VaultUnlockScreen';
import { useToolsPasswords } from '@/hooks/queries/useToolsPasswords';
import { useVaultSession } from '@/hooks/useVaultSession';
import VeridianLoading from '@/components/shared/VeridianLoading';

export default function PasswordsContent() {
  const { envelope, isLoading, saveEnvelope, isSaving } = useToolsPasswords();
  const [unlocking, setUnlocking] = useState(false);
  const [setupSaving, setSetupSaving] = useState(false);

  const session = useVaultSession({
    autoLockMinutes: 5,
    onAutoLock: () => toast.message('Vault locked'),
  });

  const handleSetupComplete = async ({ envelope: env, vaultKey, vaultData }) => {
    setSetupSaving(true);
    try {
      await saveEnvelope(env);
      session.unlockSession(vaultKey, vaultData);
      toast.success('Vault created — save your recovery key offline');
    } finally {
      setSetupSaving(false);
    }
  };

  const handleUnlock = async (result) => {
    setUnlocking(true);
    try {
      session.unlockSession(result.vaultKey, result.payload);
      toast.success('Vault unlocked');
    } finally {
      setUnlocking(false);
    }
  };

  const persistVault = useCallback(async (dataOverride) => {
    if (!envelope) return;
    await session.persistEncrypted(saveEnvelope, envelope, dataOverride);
  }, [envelope, saveEnvelope, session]);

  if (isLoading) return <VeridianLoading />;

  if (!envelope) {
    return <VaultSetupWizard onComplete={handleSetupComplete} saving={setupSaving} />;
  }

  if (!session.isUnlocked) {
    return (
      <VaultUnlockScreen
        envelope={envelope}
        onUnlock={handleUnlock}
        unlocking={unlocking}
      />
    );
  }

  return (
    <PasswordsWorkspace
      vaultData={session.vaultData}
      envelope={envelope}
      onUpdateVault={session.updateVaultData}
      onPersist={persistVault}
      onLock={session.lock}
      touchActivity={session.touchActivity}
    />
  );
}
