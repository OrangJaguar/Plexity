import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Consume one-shot command bar handoff from location.state.
 * @param {string|string[]|null} expectedType - 'task' | 'event' | 'action' | array of types
 */
export function useCommandBarDraft(expectedType) {
  const location = useLocation();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(null);
  const [action, setAction] = useState(null);

  useEffect(() => {
    const cb = location.state?.commandBar;
    if (!cb) return;

    const types = Array.isArray(expectedType) ? expectedType : [expectedType];
    if (!types.includes(cb.type)) return;

    if (cb.type === 'action') {
      setAction({ actionId: cb.actionId, payload: cb.payload || {} });
    } else if (cb.draft) {
      setDraft(cb.draft);
    }

    navigate(location.pathname, { replace: true, state: {} });
  }, [expectedType, location.pathname, location.state, navigate]);

  const clearDraft = () => setDraft(null);
  const clearAction = () => setAction(null);

  return { draft, clearDraft, action, clearAction };
}

/** @deprecated use useCommandBarDraft with type 'action' */
export function useCommandBarAction(expectedActionId) {
  const { action, clearAction } = useCommandBarDraft('action');
  const matched = action?.actionId === expectedActionId ? action : null;
  return { action: matched, clearAction };
}
