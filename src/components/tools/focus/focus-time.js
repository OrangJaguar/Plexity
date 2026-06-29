import { useEffect, useState } from 'react';

export function formatFocusTimer(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatFocusDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function useFocusClock(active) {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, [active]);

  let h = time.getHours();
  const isPm = h >= 12;
  h = h % 12;
  if (h === 0) h = 12;
  const mm = String(time.getMinutes()).padStart(2, '0');
  const ss = String(time.getSeconds()).padStart(2, '0');
  return {
    clock: `${String(h).padStart(2, '0')}:${mm}:${ss}`,
    isPm,
  };
}

export function sendFocusNotification(title, body) {
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, body ? { body } : undefined);
    }
  } catch {
    /* ignore */
  }
}
