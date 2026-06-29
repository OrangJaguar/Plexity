import { ArrowRight } from 'lucide-react';
import CollegePrivacyNotice from '@/components/tools/college/CollegePrivacyNotice';
import { CollegeCard, CollegeKpi, CollegePageHeader } from '@/components/tools/college/college-shared';
import { computeCollegeOverview } from '@/lib/tools/college/college-stats';
import { classificationLabel } from '@/lib/tools/college/college-classify';
import { resolveCollegeName } from '@/lib/tools/college/college-catalog';

export default function CollegeOverview({ doc, onNavigate }) {
  const stats = computeCollegeOverview(doc);

  return (
    <div className="college-section">
      <CollegePageHeader
        title="Overview"
        description="Your application command center — track progress and see what to do next."
      />
      <CollegePrivacyNotice compact />

      <div className="college-kpi-row">
        <CollegeKpi label="Colleges" value={stats.totalColleges} />
        <CollegeKpi label="Reach" value={stats.classificationCounts.reach || 0} />
        <CollegeKpi label="Target" value={stats.classificationCounts.target || 0} />
        <CollegeKpi label="Safety" value={stats.classificationCounts.safety || 0} />
        <CollegeKpi label="Started" value={stats.applicationsStarted} sub="applications" />
        <CollegeKpi label="Essays" value={stats.essaysDrafted} sub="drafted" />
        <CollegeKpi label="Supplementals" value={stats.supplementalsRemaining} sub="remaining" />
        <CollegeKpi label="Recs pending" value={stats.recsPending} />
      </div>

      <div className="college-overview-grid">
        <CollegeCard title="What to do next">
          {stats.nextActions.length ? (
            <ul className="college-action-list">
              {stats.nextActions.map((action) => (
                <li key={action.text}>
                  <button type="button" className="college-action-btn" onClick={() => onNavigate(action.section)}>
                    <span>{action.text}</span>
                    <ArrowRight size={14} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="college-muted">You are in good shape. Keep refining essays and deadlines.</p>
          )}
        </CollegeCard>

        <CollegeCard title="Upcoming deadlines">
          {stats.upcomingDeadlines.length ? (
            <ul className="college-deadline-list">
              {stats.upcomingDeadlines.map((d, i) => (
                <li key={`${d.label}-${i}`}>
                  <span className="college-deadline-date">{d.label}</span>
                  <span className="college-deadline-meta">
                    {d.date?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="college-muted">Add schools with application rounds to see deadlines.</p>
          )}
        </CollegeCard>

        <CollegeCard title="Your list">
          {(doc.myColleges || []).length ? (
            <ul className="college-mini-list">
              {doc.myColleges.slice(0, 8).map((c) => (
                <li key={c.id}>
                  <span>{resolveCollegeName(c)}</span>
                  <span className="college-tag">{classificationLabel(c.classification) || '—'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="college-muted">No schools yet. Start in Colleges.</p>
          )}
        </CollegeCard>

        <CollegeCard title="Writing progress">
          <div className="college-writing-summary">
            <div>
              <span className="college-muted">Main essays</span>
              <strong>{(doc.mainEssays || []).filter((e) => (e.content || '').trim()).length}</strong>
            </div>
            <div>
              <span className="college-muted">Supplementals drafted</span>
              <strong>{(doc.supplementals || []).filter((s) => (s.draftText || '').trim()).length}</strong>
            </div>
            <div>
              <span className="college-muted">Checklist open</span>
              <strong>{stats.checklistOpen}</strong>
            </div>
          </div>
        </CollegeCard>
      </div>
    </div>
  );
}
