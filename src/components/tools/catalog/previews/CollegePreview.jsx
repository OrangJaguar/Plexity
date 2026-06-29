import { ArrowRight } from 'lucide-react';
import { CollegeCard, CollegeKpi, CollegePageHeader } from '@/components/tools/college/college-shared';

const NAV = ['Overview', 'Colleges', 'Academics', 'Testing', 'Activities', 'Writing'];

export default function CollegePreview() {
  return (
    <div className="tools-preview-scale tools-preview-college">
      <div className="college-workspace tools-preview-college-workspace">
        <aside className="college-workspace-nav">
          <nav className="college-nav">
            {NAV.map((label) => (
              <button
                key={label}
                type="button"
                className={label === 'Overview' ? 'active' : ''}
                tabIndex={-1}
              >
                {label}
              </button>
            ))}
          </nav>
        </aside>
        <main className="college-workspace-main">
          <div className="college-section">
            <CollegePageHeader
              title="Overview"
              description="Your application command center — track progress and see what to do next."
            />
            <div className="college-kpi-row tools-preview-college-kpis">
              <CollegeKpi label="Colleges" value={8} />
              <CollegeKpi label="Reach" value={3} />
              <CollegeKpi label="Target" value={3} />
              <CollegeKpi label="Safety" value={2} />
              <CollegeKpi label="Essays" value={2} sub="drafted" />
            </div>
            <div className="college-overview-grid">
              <CollegeCard title="What to do next">
                <ul className="college-action-list">
                  <li>
                    <button type="button" className="college-action-btn" tabIndex={-1}>
                      <span>Draft Stanford supplemental #2</span>
                      <ArrowRight size={14} />
                    </button>
                  </li>
                  <li>
                    <button type="button" className="college-action-btn" tabIndex={-1}>
                      <span>Request counselor recommendation</span>
                      <ArrowRight size={14} />
                    </button>
                  </li>
                </ul>
              </CollegeCard>
              <CollegeCard title="Upcoming deadlines">
                <ul className="college-deadline-list">
                  <li>
                    <span className="college-deadline-date">UC Application</span>
                    <span className="college-deadline-meta">Nov 30</span>
                  </li>
                  <li>
                    <span className="college-deadline-date">MIT EA</span>
                    <span className="college-deadline-meta">Nov 1</span>
                  </li>
                </ul>
              </CollegeCard>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
