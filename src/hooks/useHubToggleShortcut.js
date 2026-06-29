import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const TOOLS_HOME = '/tools/dashboard';
const APP_HOME = '/';

function isEditableTarget(target) {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

/**
 * Cmd/Ctrl+Shift+K toggles between Veridian study home and Tools dashboard.
 */
export function useHubToggleShortcut() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!(e.metaKey || e.ctrlKey) || !e.shiftKey || e.key.toLowerCase() !== 'k') return;
      if (isEditableTarget(e.target)) return;

      e.preventDefault();

      const inTools = location.pathname.startsWith('/tools');
      navigate(inTools ? APP_HOME : TOOLS_HOME);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [location.pathname, navigate]);
}
