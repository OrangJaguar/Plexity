import { useEffect } from 'react';
import { logClientError } from '@/api/errors/logClientError';

export default function GlobalErrorHandlers() {
  useEffect(() => {
    function onError(event) {
      logClientError({
        message: event.message ?? 'Uncaught error',
        stack: event.error?.stack,
        context: { handler: 'window.onerror', filename: event.filename, lineno: event.lineno },
      });
    }

    function onUnhandledRejection(event) {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason ?? 'Unhandled rejection');
      const stack = reason instanceof Error ? reason.stack : undefined;
      logClientError({
        message,
        stack,
        context: { handler: 'unhandledrejection' },
      });
    }

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return null;
}
