import { useCallback, useEffect, useRef, useState } from 'react';
import { Cloud, Loader2 } from 'lucide-react';
import { normalizeCollegeDocument } from '@/lib/tools/college/college-model';
import CollegeNav from '@/components/tools/college/CollegeNav';
import CollegeOverview from '@/components/tools/college/sections/CollegeOverview';
import CollegeColleges from '@/components/tools/college/sections/CollegeColleges';
import CollegeAcademics from '@/components/tools/college/sections/CollegeAcademics';
import CollegeTesting from '@/components/tools/college/sections/CollegeTesting';
import CollegeActivities from '@/components/tools/college/sections/CollegeActivities';
import CollegeHonors from '@/components/tools/college/sections/CollegeHonors';
import CollegeWriting from '@/components/tools/college/sections/CollegeWriting';
import CollegeRecommendations from '@/components/tools/college/sections/CollegeRecommendations';
import CollegeApplicationInfo from '@/components/tools/college/sections/CollegeApplicationInfo';

export default function CollegeWorkspace({ data, saveDocument }) {
  const [section, setSection] = useState('overview');
  const [writingCollegeId, setWritingCollegeId] = useState(null);
  const [doc, setDoc] = useState(() => normalizeCollegeDocument(data));
  const [saveState, setSaveState] = useState('saved');
  const saveTimer = useRef(null);
  const docRef = useRef(doc);

  docRef.current = doc;

  useEffect(() => {
    if (saveState === 'saving') return;
    setDoc(normalizeCollegeDocument(data));
  }, [data, saveState]);

  const persist = useCallback((next) => {
    setSaveState('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveDocument(next)
        .then(() => setSaveState('saved'))
        .catch(() => setSaveState('error'));
    }, 700);
  }, [saveDocument]);

  const updateDoc = useCallback((patch) => {
    setDoc((prev) => {
      const next = normalizeCollegeDocument({ ...prev, ...patch, updatedAt: Date.now() });
      persist(next);
      return next;
    });
  }, [persist]);

  const navigate = (nextSection) => {
    setSection(nextSection);
  };

  const jumpWriting = (collegeId) => {
    setWritingCollegeId(collegeId);
    setSection('writing');
  };

  return (
    <div className="college-workspace">
      <aside className="college-workspace-nav">
        <div className="college-workspace-brand">
          <div className={`college-save-indicator college-save-indicator--${saveState}`}>
            {saveState === 'saving' ? (
              <Loader2 size={14} className="college-save-spinner" aria-hidden />
            ) : (
              <Cloud size={14} aria-hidden />
            )}
            <span>
              {saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Save failed' : 'Saved'}
            </span>
          </div>
        </div>
        <CollegeNav active={section} onChange={navigate} />
      </aside>

      <main className="college-workspace-main">
        {section === 'overview' && <CollegeOverview doc={doc} onNavigate={navigate} />}
        {section === 'colleges' && (
          <CollegeColleges doc={doc} updateDoc={updateDoc} onJumpWriting={jumpWriting} />
        )}
        {section === 'academics' && <CollegeAcademics doc={doc} updateDoc={updateDoc} />}
        {section === 'testing' && <CollegeTesting doc={doc} updateDoc={updateDoc} />}
        {section === 'activities' && <CollegeActivities doc={doc} updateDoc={updateDoc} />}
        {section === 'honors' && <CollegeHonors doc={doc} updateDoc={updateDoc} />}
        {section === 'writing' && (
          <CollegeWriting doc={doc} updateDoc={updateDoc} focusCollegeId={writingCollegeId} />
        )}
        {section === 'recommendations' && <CollegeRecommendations doc={doc} updateDoc={updateDoc} />}
        {section === 'application-info' && <CollegeApplicationInfo doc={doc} updateDoc={updateDoc} />}
      </main>
    </div>
  );
}
