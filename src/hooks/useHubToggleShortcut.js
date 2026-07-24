import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getToolsHome, isToolsRoute } from '@/lib/tools/tool-routes';
import { useOptionalToolSurface } from '@/hooks/useToolSurface';

const APP_HOME = '/';

function isEditableTarget(target) {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

/**
 * Cmd/Ctrl+Shift+K toggles between the marketing landing page and Tools home.
 * From an admin tool surface, returns to the public tools home (exits admin shell).
 * Does not navigate between tools while staying in-admin — use the sidebar for that.
 */
export function useHubToggleShortcut() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdminSurface } = useOptionalToolSurface();

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!(e.metaKey || e.ctrlKey) || !e.shiftKey || e.key.toLowerCase() !== 'k') return;
      if (isEditableTarget(e.target)) return;

      e.preventDefault();

      const inTools = isToolsRoute(location.pathname);
      if (inTools) {
        navigate(APP_HOME);
        return;
      }
      navigate(getToolsHome(isAdminSurface ? { surface: 'admin' } : { surface: 'public' }));
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [location.pathname, navigate, isAdminSurface]);
}
