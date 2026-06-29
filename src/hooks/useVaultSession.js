import { useCallback, useEffect, useRef, useState } from 'react';
import { encryptVaultPayload } from '@/lib/tools/passwords/vault-crypto';
import { normalizeVaultPayload } from '@/lib/tools/passwords/passwords-model';

export function useVaultSession({ autoLockMinutes = 5, onAutoLock } = {}) {
  const vaultKeyRef = useRef(null);
  const [vaultData, setVaultData] = useState(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const timerRef = useRef(null);

  const lock = useCallback(() => {
    vaultKeyRef.current = null;
    setVaultData(null);
    setIsUnlocked(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    onAutoLock?.();
  }, [onAutoLock]);

  const touchActivity = useCallback(() => {
    if (!isUnlocked) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const ms = Math.max(1, autoLockMinutes) * 60 * 1000;
    timerRef.current = setTimeout(() => lock(), ms);
  }, [autoLockMinutes, isUnlocked, lock]);

  const unlockSession = useCallback((vaultKey, payload) => {
    vaultKeyRef.current = vaultKey;
    setVaultData(normalizeVaultPayload(payload));
    setIsUnlocked(true);
  }, []);

  const updateVaultData = useCallback((updater) => {
    setVaultData((prev) => {
      const next = normalizeVaultPayload(
        typeof updater === 'function' ? updater(prev) : updater,
      );
      return next;
    });
    touchActivity();
  }, [touchActivity]);

  const persistEncrypted = useCallback(async (saveEnvelope, envelopeBase, dataOverride) => {
    const data = normalizeVaultPayload(dataOverride ?? vaultData);
    if (!vaultKeyRef.current || !data) return;
    const vaultCipher = await encryptVaultPayload(vaultKeyRef.current, data);
    await saveEnvelope({
      ...envelopeBase,
      vault: vaultCipher,
      updatedAt: Date.now(),
    });
  }, [vaultData]);

  useEffect(() => {
    if (isUnlocked) touchActivity();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isUnlocked, touchActivity]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && isUnlocked) lock();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [isUnlocked, lock]);

  return {
    isUnlocked,
    vaultData,
    vaultKeyRef,
    unlockSession,
    lock,
    touchActivity,
    updateVaultData,
    persistEncrypted,
    setVaultData,
  };
}
