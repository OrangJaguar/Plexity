import { useEffect } from 'react';
import {
  CollegeField, CollegeGrid, CollegeInput, CollegeSelect, CollegeTextarea,
} from '@/components/tools/college/college-shared';
import {
  APPLICATION_ROUNDS, APPLICATION_STATUSES, CLASSIFICATIONS,
} from '@/lib/tools/college/college-model';
import { classificationLabel } from '@/lib/tools/college/college-classify';
import {
  formatAcceptanceRate,
  formatActRange,
  formatEnrollment,
  formatGradRate,
  formatMoney,
  formatNetPrice,
  formatRetentionRate,
  formatSatRange,
  formatSetting,
  formatTuition,
  getStickerTuition,
} from '@/lib/tools/college/college-catalog';

/**
 * @param {{ college: import('@/lib/tools/college/college-catalog').CatalogCollege | null }} props
 */
function Stat({ label, value, highlight }) {
  if (value == null || value === '—') return null;
  return (
    <div className={`college-modal-stat${highlight ? ' college-modal-stat--highlight' : ''}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/**
 * @param {{ title: string, children: import('react').ReactNode }} props
 */
function Section({ title, children }) {
  return (
    <section className="college-modal-section">
      <h4>{title}</h4>
      <dl className="college-modal-stats">{children}</dl>
    </section>
  );
}

/**
 * @param {{
 *   college: import('@/lib/tools/college/college-catalog').CatalogCollege,
 *   myCollege?: object | null,
 *   doc?: object,
 *   onClose: () => void,
 *   onAdd?: () => void,
 *   onUpdateCollege?: (id: string, patch: object) => void,
 *   onRemoveCollege?: (id: string) => void,
 *   onAddSupplemental?: () => void,
 *   onJumpWriting?: () => void,
 *   added?: boolean,
 *   suggested?: string | null,
 *   effectiveClass?: string | null,
 *   deadline?: { label: string } | null,
 * }} props
 */
export default function CollegeDetailModal({
  college,
  myCollege,
  doc,
  onClose,
  onAdd,
  onUpdateCollege,
  onRemoveCollege,
  onAddSupplemental,
  onJumpWriting,
  added,
  suggested,
  effectiveClass,
  deadline,
}) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const location = [college.city, college.state].filter(Boolean).join(', ');
  const sticker = getStickerTuition(college);

  return (
    <div className="college-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="college-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="college-modal-title"
      >
        <header className="college-modal-header">
          <div className="college-modal-header-main">
            <h2 id="college-modal-title">{college.name}</h2>
            <p className="college-modal-sub">
              {location}
              {college.type && (
                <>
                  {' · '}
                  <span className="college-modal-type">{college.type}</span>
                </>
              )}
              {college.setting && (
                <>
                  {' · '}
                  {formatSetting(college.setting)}
                </>
              )}
            </p>
            {college.website && (
              <a
                className="college-modal-link"
                href={college.website}
                target="_blank"
                rel="noopener noreferrer"
              >
                {college.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>
          <button type="button" className="college-icon-btn college-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="college-modal-kpis">
          <Stat label="Admit rate" value={formatAcceptanceRate(college.acceptanceRate)} highlight />
          <Stat label="Avg net price" value={formatNetPrice(college.netPrice)} highlight />
          <Stat label="4-yr grad rate" value={formatGradRate(college.gradRate4yr)} highlight />
          <Stat label="Retention" value={formatRetentionRate(college.retentionRate)} />
          <Stat label="Median earnings" value={formatMoney(college.medianEarnings10yr, '/yr')} />
          <Stat label="Undergrads" value={college.enrollment ? formatEnrollment(college.enrollment) : null} />
        </div>

        <div className="college-modal-body">
          <Section title="Admissions">
            <Stat label="Acceptance rate" value={formatAcceptanceRate(college.acceptanceRate)} />
            <Stat label="SAT middle 50%" value={formatSatRange(college)} />
            <Stat label="ACT middle 50%" value={formatActRange(college)} />
            <Stat label="Test policy" value={college.testPolicy} />
          </Section>

          <Section title="Cost & aid">
            {college.type === 'public' && (
              <Stat label="In-state tuition" value={formatTuition(college.tuitionInState)} />
            )}
            <Stat label="Sticker price" value={formatTuition(sticker)} />
            <Stat label="Average net price" value={formatNetPrice(college.netPrice)} />
            <Stat label="Median debt at graduation" value={formatMoney(college.medianDebt)} />
          </Section>

          <Section title="Outcomes">
            <Stat label="4-year graduation rate" value={formatGradRate(college.gradRate4yr)} />
            <Stat label="First-year retention" value={formatRetentionRate(college.retentionRate)} />
            <Stat label="Median earnings (10 yrs)" value={formatMoney(college.medianEarnings10yr, '/yr')} />
          </Section>

          <Section title="Campus">
            <Stat label="Undergraduate enrollment" value={college.enrollment?.toLocaleString()} />
            <Stat label="Student–faculty ratio" value={college.studentFacultyRatio ? `${college.studentFacultyRatio}:1` : null} />
            <Stat label="Setting" value={college.setting ? formatSetting(college.setting) : null} />
            <Stat label="Region" value={college.region} />
            {college.honorsCollege && <Stat label="Honors college" value="Yes" />}
          </Section>

          <Section title="Application">
            <Stat label="Platform" value={college.platform} />
            <Stat label="Regular decision" value={college.rdDeadline} />
            {college.eaDeadline && <Stat label="Early action" value={college.eaDeadline} />}
            {college.edDeadline && <Stat label="Early decision" value={college.edDeadline} />}
          </Section>

          {myCollege && onUpdateCollege && (
            <section className="college-modal-section college-modal-section--list">
              <h4>Your list</h4>
              {suggested && !myCollege.classificationManual && (
                <p className="college-suggestion">
                  Suggested: <strong>{suggested}</strong> based on your profile.
                </p>
              )}
              <div className="college-modal-list-fields">
                <CollegeListFields
                  myCollege={myCollege}
                  onUpdate={(patch) => onUpdateCollege(myCollege.id, patch)}
                  deadline={deadline}
                  effectiveClass={effectiveClass}
                />
              </div>
              <div className="college-detail-actions">
                <div className="college-detail-actions-start">
                  <button type="button" className="college-btn college-btn--sm" onClick={onAddSupplemental}>
                    Add supplemental
                  </button>
                  <button type="button" className="college-btn college-btn--sm" onClick={onJumpWriting}>
                    Open supplementals
                  </button>
                  {onRemoveCollege && (
                    <button
                      type="button"
                      className="college-btn college-btn--sm college-btn--ghost"
                      onClick={() => onRemoveCollege(myCollege.id)}
                    >
                      Remove from list
                    </button>
                  )}
                </div>
                <button type="button" className="college-btn college-btn--primary college-btn--sm" onClick={onClose}>
                  Done
                </button>
              </div>
            </section>
          )}
        </div>

        <footer className="college-modal-footer">
          <p className="college-modal-source">
            Admissions & outcomes from U.S. College Scorecard. Deadlines & test policies may vary by year.
          </p>
          <div className="college-modal-footer-actions">
            {!myCollege && onAdd && (
              <button
                type="button"
                className={`college-btn${added ? ' is-added' : ''}`}
                disabled={added}
                onClick={onAdd}
              >
                {added ? 'On your list' : 'Add to my list'}
              </button>
            )}
            {(myCollege || added) && (
              <button type="button" className="college-btn college-btn--primary" onClick={onClose}>
                Done
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

function CollegeListFields({ myCollege, onUpdate, deadline, effectiveClass }) {
  return (
    <CollegeGrid cols={1}>
      <CollegeField label="Classification">
        <CollegeSelect
          value={myCollege.classification || ''}
          onChange={(e) => onUpdate({
            classification: e.target.value || null,
            classificationManual: true,
          })}
        >
          <option value="">Unclassified</option>
          {CLASSIFICATIONS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </CollegeSelect>
        {effectiveClass && (
          <span className="college-muted" style={{ fontSize: '0.72rem' }}>
            Current: {classificationLabel(effectiveClass)}
          </span>
        )}
      </CollegeField>
      <CollegeField label="Application round">
        <CollegeSelect
          value={myCollege.applicationRound}
          onChange={(e) => onUpdate({ applicationRound: e.target.value })}
        >
          {APPLICATION_ROUNDS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </CollegeSelect>
      </CollegeField>
      <CollegeField label="Status">
        <CollegeSelect
          value={myCollege.applicationStatus}
          onChange={(e) => onUpdate({ applicationStatus: e.target.value })}
        >
          {APPLICATION_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </CollegeSelect>
      </CollegeField>
      {deadline && (
        <CollegeField label="Deadline">
          <CollegeInput readOnly value={deadline.label === 'Rolling' ? 'Rolling' : deadline.label} />
        </CollegeField>
      )}
      <CollegeField label="Test scores">
        <CollegeSelect
          value={myCollege.testSubmit}
          onChange={(e) => onUpdate({ testSubmit: e.target.value })}
        >
          <option value="undecided">Undecided</option>
          <option value="submit">Submit scores</option>
          <option value="withhold">Withhold scores</option>
        </CollegeSelect>
      </CollegeField>
      <CollegeField label="Why this school">
        <CollegeTextarea
          rows={2}
          value={myCollege.whyThisSchool}
          onChange={(e) => onUpdate({ whyThisSchool: e.target.value })}
        />
      </CollegeField>
      <CollegeField label="Notes">
        <CollegeTextarea
          rows={2}
          value={myCollege.notes}
          onChange={(e) => onUpdate({ notes: e.target.value })}
        />
      </CollegeField>
    </CollegeGrid>
  );
}
