import { useState, useEffect } from 'react';
import { checkUsernameAvailable } from '@/api/entities/preferences';
import { isValidUsernameFormat, normalizeUsername } from '@/utils/schemas/preferences';

export function useUsernameAvailability(username, { enabled = true, excludeEmail } = {}) {
  const [status, setStatus] = useState('idle'); // idle | checking | available | taken | invalid

  useEffect(() => {
    const normalized = normalizeUsername(username);
    if (!enabled || !normalized) {
      setStatus('idle');
      return undefined;
    }

    if (!isValidUsernameFormat(normalized)) {
      setStatus('invalid');
      return undefined;
    }

    setStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const result = await checkUsernameAvailable(normalized, { excludeEmail });
        setStatus(result.available ? 'available' : 'taken');
      } catch {
        setStatus('available');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username, enabled, excludeEmail]);

  return status;
}
