import { useEffect } from 'react';
import { toast } from 'sonner';
import { LOCAL_ONLY_NOTICE_KEY } from '@/lib/storage/guest-store';
import { useAuth } from '@/hooks/useAuth';

const NOTICE_COPY =
  "You're using Veridian locally. Data stays on this device and won't sync across devices until you sign in.";

export default function GuestLocalNotice() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading || isAuthenticated) return;
    try {
      if (localStorage.getItem(LOCAL_ONLY_NOTICE_KEY) === '1') return;
      localStorage.setItem(LOCAL_ONLY_NOTICE_KEY, '1');
      toast.info(NOTICE_COPY, { position: 'top-right', duration: 8000 });
    } catch { /* ignore */ }
  }, [isAuthenticated, isLoading]);

  return null;
}
