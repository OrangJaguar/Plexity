import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

const VERIDIAN_STUDY_ORIGIN = import.meta.env.VITE_VERIDIAN_APP_URL || 'https://veridian.app';

export default function StudyRedirectPage() {
  const { sessionId } = useParams();

  useEffect(() => {
    if (!sessionId) return;
    window.location.href = `${VERIDIAN_STUDY_ORIGIN.replace(/\/$/, '')}/study/${sessionId}`;
  }, [sessionId]);

  return (
    <div className="login-prompt">
      <p>Opening study session in Veridian…</p>
    </div>
  );
}
