import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDown, Cloud, Compass, Flag, Layers, Loader2, Map, Sparkles, Target,
} from 'lucide-react';
import GoalsSetupGuide from '@/components/tools/goals/GoalsSetupGuide';
import GoalsWeeklyCheckin from '@/components/tools/goals/GoalsWeeklyCheckin';
import {
  GoalsBulletList,
  GoalsField,
  GoalsInput,
  GoalsOrderButtons,
  GoalsRepeatableAdd,
  GoalsRepeatableRemove,
  GoalsSectionCard,
  GoalsTagEditor,
  GoalsTagList,
  GoalsTextarea,
  GoalsUncertainToggle,
} from '@/components/tools/goals/goals-shared';
import {
  PILLAR_SUGGESTIONS,
  archiveCurrentSeason,
  newFewYearsMilestone,
  newPillar,
  newTenYearPhase,
  newWeeklyPriority,
  normalizeGoalsDocument,
  parseLinesInput,
  prioritiesFromSeason,
  sectionHasContent,
  weekNeedsCheckIn,
  alignmentLabel,
} from '@/lib/tools/goals/goals-model';
import { ensureWeekKey, formatWeekLabel, getWeekKey } from '@/lib/tools/goals/goals-week';
import { GOALS_SECTION_GUIDES } from '@/lib/tools/goals/goals-section-guides';
import { useCommandBarDraft } from '@/hooks/useCommandBarDraft';

const SECTION = {
  NORTH_STAR: 'northStar',
  PILLARS: 'pillars',
  ROADMAP: 'roadmap',
  SEASON: 'season',
  WEEKLY: 'weekly',
};

const LAYER_NAV = [
  { id: 'goals-strategy', label: 'Strategy' },
  { id: 'goals-roadmap', label: 'Roadmap' },
  { id: 'goals-season', label: 'Season' },
  { id: 'goals-weekly', label: 'This week' },
];

export default function GoalsWorkspace({ data, saveDocument }) {
  const [doc, setDoc] = useState(() => normalizeGoalsDocument(ensureWeekKey(data)));
  const [editingSection, setEditingSection] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saveState, setSaveState] = useState('saved');
  const [checkinOpen, setCheckinOpen] = useState(false);
  const saveTimer = useRef(null);
  const { action, clearAction } = useCommandBarDraft('action');

  const weekKey = doc.weekly.weekKey || getWeekKey();
  const needsCheckIn = weekNeedsCheckIn(doc, weekKey);

  useEffect(() => {
    if (saveState === 'saving' || editingSection || checkinOpen) return;
    setDoc(normalizeGoalsDocument(ensureWeekKey(data)));
  }, [data, saveState, editingSection, checkinOpen]);

  const persist = useCallback((next) => {
    setSaveState('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveDocument(next)
        .then(() => setSaveState('saved'))
        .catch(() => setSaveState('error'));
    }, 500);
  }, [saveDocument]);

  const updateDoc = useCallback((updater) => {
    setDoc((prev) => {
      const next = normalizeGoalsDocument(
        typeof updater === 'function' ? updater(prev) : { ...prev, ...updater, updatedAt: Date.now() },
      );
      persist(next);
      return next;
    });
  }, [persist]);

  const startEdit = (section, buildDraft) => {
    setEditingSection(section);
    setDraft(buildDraft ? buildDraft(doc) : null);
  };

  const cancelEdit = () => {
    setEditingSection(null);
    setDraft(null);
  };

  useEffect(() => {
    if (!action) return;
    if (action.actionId === 'addGoal') {
      startEdit(SECTION.WEEKLY, (d) => [
        ...d.weekly.priorities,
        newWeeklyPriority({ title: action.payload?.title || '' }),
      ]);
      clearAction();
    }
    if (action.actionId === 'logGoal') {
      setCheckinOpen(true);
      clearAction();
    }
    if (action.actionId === 'weeklyReview') {
      setCheckinOpen(true);
      clearAction();
    }
  }, [action, clearAction]);

  const saveSection = (mergeFn) => {
    const next = normalizeGoalsDocument(mergeFn(doc, draft));
    setDoc(next);
    setEditingSection(null);
    setDraft(null);
    persist(next);
  };

  const updateDraft = (updater) => {
    setDraft((prev) => (typeof updater === 'function' ? updater(prev) : updater));
  };

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const goToSetupStep = (stepId) => {
    const map = {
      northStar: 'goals-north-star',
      pillars: 'goals-pillars',
      roadmap: 'goals-roadmap',
      season: 'goals-season',
      weekly: 'goals-weekly',
    };
    scrollTo(map[stepId] || 'goals-north-star');
    if (stepId === 'northStar') startEdit(SECTION.NORTH_STAR, (d) => ({ ...d.northStar }));
    if (stepId === 'pillars') startEdit(SECTION.PILLARS, (d) => (d.pillars.length ? [...d.pillars] : [newPillar()]));
    if (stepId === 'roadmap') startEdit(SECTION.ROADMAP, (d) => ({ ...d.roadmap }));
    if (stepId === 'season') startEdit(SECTION.SEASON, (d) => ({ ...d.currentSeason }));
    if (stepId === 'weekly') startEdit(SECTION.WEEKLY, (d) => [...d.weekly.priorities]);
  };

  const addPriorityFromSeason = () => {
    const existing = new Set(doc.weekly.priorities.map((p) => p.text));
    const fromSeason = prioritiesFromSeason(doc).filter((p) => !existing.has(p.text));
    if (!fromSeason.length) return;
    updateDoc((d) => ({
      ...d,
      weekly: {
        ...d.weekly,
        weekKey,
        priorities: [...d.weekly.priorities, ...fromSeason.slice(0, 3)],
      },
    }));
  };

  const completeCheckIn = ({ checkIn, nextPriorities }) => {
    const nextWeekKey = getWeekKey();
    updateDoc((d) => ({
      ...d,
      checkIns: [checkIn, ...d.checkIns],
      weekly: {
        weekKey: nextWeekKey,
        priorities: nextPriorities,
      },
      setupComplete: true,
      setupStep: 5,
    }));
    setCheckinOpen(false);
  };

  return (
    <div className="goals-workspace">
      <div className="goals-workspace-toolbar">
        <p className="goals-workspace-lead">
          From long-term direction to weekly alignment — strategy that you actually return to.
        </p>
        <span className={`goals-save-indicator goals-save-indicator--${saveState}`}>
          {saveState === 'saving' ? <Loader2 size={14} className="goals-spin" aria-hidden /> : <Cloud size={14} aria-hidden />}
          {saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Save failed' : 'Saved'}
        </span>
      </div>

      <nav className="goals-layer-nav" aria-label="Goal layers">
        {LAYER_NAV.map((item) => (
          <button key={item.id} type="button" className="goals-layer-nav-btn" onClick={() => scrollTo(item.id)}>
            {item.label}
          </button>
        ))}
      </nav>

      <GoalsSetupGuide
        doc={doc}
        onGoToStep={goToSetupStep}
        onDismiss={() => updateDoc((d) => ({ ...d, setupComplete: true }))}
      />

      <div id="goals-strategy" className="goals-strategy-block">
        <div className="goals-block-intro">
          <Compass size={16} aria-hidden />
          <span>Long-term direction · edit occasionally</span>
        </div>

        <GoalsSectionCard
          id="goals-north-star"
          title="North Star"
          hint="What kind of life are you trying to build, and why? Rough is fine."
          guide={GOALS_SECTION_GUIDES.northStar}
          layer="Strategy"
          editing={editingSection === SECTION.NORTH_STAR}
          onEdit={() => startEdit(SECTION.NORTH_STAR, (d) => ({ ...d.northStar }))}
          onCancel={cancelEdit}
          onSave={() => saveSection((current, star) => ({
            ...current,
            northStar: { ...star, updatedAt: Date.now() },
            setupStep: Math.max(current.setupStep, 1),
          }))}
          isEmpty={!sectionHasContent('northStar', doc)}
          emptyTitle="Start with a rough direction"
          emptyLead="Idealistic, practical, or uncertain — write what feels true right now."
          emptyAction="Define North Star"
          editChildren={editingSection === SECTION.NORTH_STAR ? (
            <div className="goals-north-star-edit">
              <GoalsTextarea
                rows={5}
                value={draft?.text || ''}
                onChange={(e) => updateDraft((d) => ({ ...(d || {}), text: e.target.value }))}
                placeholder="e.g. Build a life where I can do meaningful work, stay healthy, and have room to explore…"
              />
              <GoalsUncertainToggle
                checked={Boolean(draft?.uncertain)}
                onChange={(uncertain) => updateDraft((d) => ({ ...(d || {}), uncertain }))}
              />
            </div>
          ) : null}
        >
          {doc.northStar.uncertain && !doc.northStar.text ? (
            <p className="goals-uncertain-note">Direction is still forming — that is okay.</p>
          ) : (
            <p className="goals-north-star-text">{doc.northStar.text}</p>
          )}
        </GoalsSectionCard>

        <GoalsSectionCard
          id="goals-pillars"
          title="Core pillars"
          hint="Major areas of your plan. Order can reflect dependencies — some unlock others."
          guide={GOALS_SECTION_GUIDES.pillars}
          layer="Strategy"
          editing={editingSection === SECTION.PILLARS}
          onEdit={() => startEdit(SECTION.PILLARS, (d) => (d.pillars.length ? [...d.pillars] : [newPillar()]))}
          onCancel={cancelEdit}
          onSave={() => saveSection((current, pillars) => ({
            ...current,
            pillars: pillars.filter((p) => p.title || p.description),
            setupStep: Math.max(current.setupStep, 2),
          }))}
          isEmpty={!sectionHasContent('pillars', doc)}
          emptyTitle="Name what matters most"
          emptyLead="Security, career, health, relationships — your pillars, your order."
          emptyAction="Add pillars"
          editChildren={editingSection === SECTION.PILLARS ? (
            <div className="goals-pillars-edit">
              <div className="goals-pillar-suggestions">
                {PILLAR_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="goals-suggestion-chip"
                    onClick={() => {
                      if ((draft || []).some((p) => p.title === s)) return;
                      updateDraft((items) => [...items, newPillar({ title: s })]);
                    }}
                  >
                    + {s}
                  </button>
                ))}
              </div>
              {(Array.isArray(draft) ? draft : []).map((pillar, idx) => (
                <div key={pillar.id} className="goals-pillar-edit-card">
                  <div className="goals-pillar-edit-head">
                    <GoalsOrderButtons
                      onUp={() => updateDraft((items) => {
                        const next = [...items];
                        if (idx === 0) return items;
                        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                        return next.map((p, i) => ({ ...p, order: Date.now() + i }));
                      })}
                      onDown={() => updateDraft((items) => {
                        const next = [...items];
                        if (idx >= next.length - 1) return items;
                        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                        return next.map((p, i) => ({ ...p, order: Date.now() + i }));
                      })}
                      disableUp={idx === 0}
                      disableDown={idx === (draft || []).length - 1}
                    />
                    <GoalsField label="Pillar">
                      <GoalsInput
                        value={pillar.title}
                        onChange={(e) => updateDraft((items) => items.map((p, i) => (i === idx ? { ...p, title: e.target.value } : p)))}
                      />
                    </GoalsField>
                  </div>
                  <GoalsField label="Why it matters" hint="Optional">
                    <GoalsTextarea
                      rows={2}
                      value={pillar.description}
                      onChange={(e) => updateDraft((items) => items.map((p, i) => (i === idx ? { ...p, description: e.target.value } : p)))}
                    />
                  </GoalsField>
                  <GoalsField label="Dependency note" hint="e.g. Health enables everything else">
                    <GoalsInput
                      value={pillar.dependencyNote}
                      onChange={(e) => updateDraft((items) => items.map((p, i) => (i === idx ? { ...p, dependencyNote: e.target.value } : p)))}
                    />
                  </GoalsField>
                  <GoalsRepeatableRemove onClick={() => updateDraft((items) => items.filter((_, i) => i !== idx))} />
                </div>
              ))}
              <GoalsRepeatableAdd onClick={() => updateDraft((items) => [...(Array.isArray(items) ? items : []), newPillar()])} label="Add pillar" />
            </div>
          ) : null}
        >
          <ol className="goals-pillars-list">
            {doc.pillars.map((pillar, idx) => (
              <li key={pillar.id} className="goals-pillar-item">
                <span className="goals-pillar-rank">{idx + 1}</span>
                <div>
                  <h3>{pillar.title}</h3>
                  {pillar.description ? <p>{pillar.description}</p> : null}
                  {pillar.dependencyNote ? (
                    <p className="goals-pillar-dependency">
                      <ArrowDown size={12} aria-hidden />
                      {pillar.dependencyNote}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </GoalsSectionCard>
      </div>

      <div id="goals-roadmap" className="goals-roadmap-block">
        <div className="goals-block-intro">
          <Map size={16} aria-hidden />
          <span>Roadmap · review sometimes</span>
        </div>

        <GoalsSectionCard
          title="Roadmap"
          hint="Broad phases and next-few-years milestones — a map, not a contract"
          guide={GOALS_SECTION_GUIDES.roadmap}
          layer="Roadmap"
          editing={editingSection === SECTION.ROADMAP}
          onEdit={() => startEdit(SECTION.ROADMAP, (d) => ({
            tenYearPhases: d.roadmap.tenYearPhases.length ? [...d.roadmap.tenYearPhases] : [newTenYearPhase()],
            fewYearsMilestones: d.roadmap.fewYearsMilestones.length ? [...d.roadmap.fewYearsMilestones] : [newFewYearsMilestone()],
          }))}
          onCancel={cancelEdit}
          onSave={() => saveSection((current, roadmap) => ({
            ...current,
            roadmap: {
              tenYearPhases: roadmap.tenYearPhases.filter((p) => p.title || p.mission),
              fewYearsMilestones: roadmap.fewYearsMilestones.filter((m) => m.title),
            },
            setupStep: Math.max(current.setupStep, 3),
          }))}
          isEmpty={!sectionHasContent('roadmap', doc)}
          emptyTitle="Sketch a broad map"
          emptyLead="10-year phases and 2–5 year milestones — eras, not task lists."
          emptyAction="Add roadmap"
          className="goals-section-card--roadmap"
          editChildren={editingSection === SECTION.ROADMAP ? (
            <div className="goals-roadmap-edit">
              <h3 className="goals-roadmap-subtitle">10-year phases</h3>
              {(draft?.tenYearPhases || []).map((phase, idx) => (
                <div key={phase.id} className="goals-roadmap-phase-card">
                  <div className="goals-field-grid">
                    <GoalsField label="Phase name">
                      <GoalsInput
                        value={phase.title}
                        onChange={(e) => updateDraft((r) => ({
                          ...r,
                          tenYearPhases: r.tenYearPhases.map((p, i) => (i === idx ? { ...p, title: e.target.value } : p)),
                        }))}
                        placeholder="Learning / building phase"
                      />
                    </GoalsField>
                    <GoalsField label="Time frame">
                      <GoalsInput
                        value={phase.timeframe}
                        onChange={(e) => updateDraft((r) => ({
                          ...r,
                          tenYearPhases: r.tenYearPhases.map((p, i) => (i === idx ? { ...p, timeframe: e.target.value } : p)),
                        }))}
                        placeholder="Ages 18–22, 2026–2030…"
                      />
                    </GoalsField>
                  </div>
                  <GoalsField label="Mission">
                    <GoalsTextarea
                      rows={2}
                      value={phase.mission}
                      onChange={(e) => updateDraft((r) => ({
                        ...r,
                        tenYearPhases: r.tenYearPhases.map((p, i) => (i === idx ? { ...p, mission: e.target.value } : p)),
                      }))}
                    />
                  </GoalsField>
                  <GoalsField label="Key objectives" hint="One per line">
                    <GoalsTextarea
                      rows={3}
                      value={(phase.objectives || []).join('\n')}
                      onChange={(e) => updateDraft((r) => ({
                        ...r,
                        tenYearPhases: r.tenYearPhases.map((p, i) => (i === idx ? { ...p, objectives: parseLinesInput(e.target.value) } : p)),
                      }))}
                    />
                  </GoalsField>
                  <GoalsField label="Exit criteria" hint="How you'd know this phase is done">
                    <GoalsTextarea
                      rows={2}
                      value={(phase.exitCriteria || []).join('\n')}
                      onChange={(e) => updateDraft((r) => ({
                        ...r,
                        tenYearPhases: r.tenYearPhases.map((p, i) => (i === idx ? { ...p, exitCriteria: parseLinesInput(e.target.value) } : p)),
                      }))}
                    />
                  </GoalsField>
                  <GoalsRepeatableRemove onClick={() => updateDraft((r) => ({
                    ...r,
                    tenYearPhases: r.tenYearPhases.filter((_, i) => i !== idx),
                  }))} />
                </div>
              ))}
              <GoalsRepeatableAdd
                onClick={() => updateDraft((r) => ({ ...r, tenYearPhases: [...r.tenYearPhases, newTenYearPhase()] }))}
                label="Add phase"
              />

              <h3 className="goals-roadmap-subtitle">Next few years</h3>
              {(draft?.fewYearsMilestones || []).map((milestone, idx) => (
                <div key={milestone.id} className="goals-roadmap-milestone-card">
                  <div className="goals-field-grid">
                    <GoalsField label="Milestone">
                      <GoalsInput
                        value={milestone.title}
                        onChange={(e) => updateDraft((r) => ({
                          ...r,
                          fewYearsMilestones: r.fewYearsMilestones.map((m, i) => (i === idx ? { ...m, title: e.target.value } : m)),
                        }))}
                      />
                    </GoalsField>
                    <GoalsField label="Time frame">
                      <GoalsInput
                        value={milestone.timeframe}
                        onChange={(e) => updateDraft((r) => ({
                          ...r,
                          fewYearsMilestones: r.fewYearsMilestones.map((m, i) => (i === idx ? { ...m, timeframe: e.target.value } : m)),
                        }))}
                        placeholder="By 2028, senior year…"
                      />
                    </GoalsField>
                  </div>
                  <GoalsField label="Details">
                    <GoalsTextarea
                      rows={2}
                      value={milestone.description}
                      onChange={(e) => updateDraft((r) => ({
                        ...r,
                        fewYearsMilestones: r.fewYearsMilestones.map((m, i) => (i === idx ? { ...m, description: e.target.value } : m)),
                      }))}
                    />
                  </GoalsField>
                  <GoalsRepeatableRemove onClick={() => updateDraft((r) => ({
                    ...r,
                    fewYearsMilestones: r.fewYearsMilestones.filter((_, i) => i !== idx),
                  }))} />
                </div>
              ))}
              <GoalsRepeatableAdd
                onClick={() => updateDraft((r) => ({ ...r, fewYearsMilestones: [...r.fewYearsMilestones, newFewYearsMilestone()] }))}
                label="Add milestone"
              />
            </div>
          ) : null}
        >
          <div className="goals-roadmap-view">
            {doc.roadmap.tenYearPhases.length > 0 && (
              <div className="goals-roadmap-phases">
                <h3>10-year phases</h3>
                {doc.roadmap.tenYearPhases.map((phase) => (
                  <article key={phase.id} className="goals-phase-card">
                    <header>
                      <h4>{phase.title}</h4>
                      {phase.timeframe ? <span>{phase.timeframe}</span> : null}
                    </header>
                    {phase.mission ? <p className="goals-phase-mission">{phase.mission}</p> : null}
                    <GoalsBulletList items={phase.objectives} />
                    {phase.exitCriteria?.length ? (
                      <p className="goals-phase-exit">
                        <strong>Exit:</strong>
                        {' '}
                        {phase.exitCriteria.join(' · ')}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
            {doc.roadmap.fewYearsMilestones.length > 0 && (
              <div className="goals-roadmap-milestones">
                <h3>Next few years</h3>
                <ul>
                  {doc.roadmap.fewYearsMilestones.map((m) => (
                    <li key={m.id}>
                      <strong>{m.title}</strong>
                      {m.timeframe ? <span>{m.timeframe}</span> : null}
                      {m.description ? <p>{m.description}</p> : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </GoalsSectionCard>
      </div>

      <GoalsSectionCard
        id="goals-season"
        title="Current season"
        hint="What chapter are you in? What deserves disproportionate attention right now?"
        guide={GOALS_SECTION_GUIDES.season}
        layer="Active season"
        active
        editing={editingSection === SECTION.SEASON}
        onEdit={() => startEdit(SECTION.SEASON, (d) => ({ ...d.currentSeason }))}
        onCancel={cancelEdit}
        onSave={() => saveSection((current, season) => ({
          ...current,
          currentSeason: {
            ...season,
            startedAt: season.startedAt || new Date().toISOString().slice(0, 10),
            updatedAt: Date.now(),
          },
          setupStep: Math.max(current.setupStep, 4),
        }))}
        isEmpty={!sectionHasContent('season', doc)}
        emptyTitle="Name your current chapter"
        emptyLead="A season title, what it is about, and a few priority areas."
        emptyAction="Define season"
        className="goals-section-card--season"
        extraActions={sectionHasContent('season', doc) && editingSection !== SECTION.SEASON ? (
          <button
            type="button"
            className="goals-btn goals-btn--ghost goals-btn--sm"
            onClick={() => updateDoc((d) => archiveCurrentSeason(d))}
          >
            Archive season
          </button>
        ) : null}
        editChildren={editingSection === SECTION.SEASON ? (
          <div className="goals-season-edit">
            <GoalsField label="Season title">
              <GoalsInput
                value={draft?.title || ''}
                onChange={(e) => updateDraft((s) => ({ ...(s || {}), title: e.target.value }))}
                placeholder="e.g. Junior year sprint, Research summer"
              />
            </GoalsField>
            <GoalsField label="What this season is about">
              <GoalsTextarea
                rows={3}
                value={draft?.description || ''}
                onChange={(e) => updateDraft((s) => ({ ...(s || {}), description: e.target.value }))}
              />
            </GoalsField>
            <GoalsField label="Priority areas" hint="3–5 areas that deserve extra attention">
              <GoalsTagEditor
                value={draft?.priorityAreas || []}
                onChange={(priorityAreas) => updateDraft((s) => ({ ...(s || {}), priorityAreas }))}
              />
            </GoalsField>
          </div>
        ) : null}
      >
        <div className="goals-season-view">
          <h3 className="goals-season-title">{doc.currentSeason.title}</h3>
          {doc.currentSeason.description ? <p>{doc.currentSeason.description}</p> : null}
          <GoalsTagList tags={doc.currentSeason.priorityAreas} />
        </div>
      </GoalsSectionCard>

      <GoalsSectionCard
        id="goals-weekly"
        title="This week"
        hint={`${formatWeekLabel(weekKey)} · Few priorities, intentionally chosen`}
        guide={GOALS_SECTION_GUIDES.weekly}
        layer="Weekly workspace"
        active
        editing={editingSection === SECTION.WEEKLY}
        onEdit={() => startEdit(SECTION.WEEKLY, (d) => [...d.weekly.priorities])}
        onCancel={cancelEdit}
        onSave={() => saveSection((current, priorities) => ({
          ...current,
          weekly: { weekKey, priorities: priorities.filter((p) => p.text.trim()).slice(0, 6) },
          setupStep: Math.max(current.setupStep, 5),
          setupComplete: true,
        }))}
        isEmpty={!sectionHasContent('weekly', doc)}
        emptyTitle="Choose a few priorities for this week"
        emptyLead="Not a task list — meaningful focuses tied to your season."
        emptyAction="Add priorities"
        className="goals-section-card--weekly"
        extraActions={(
          <>
            {doc.currentSeason.priorityAreas.length > 0 && editingSection !== SECTION.WEEKLY ? (
              <button type="button" className="goals-btn goals-btn--ghost goals-btn--sm" onClick={addPriorityFromSeason}>
                <Layers size={14} aria-hidden />
                From season
              </button>
            ) : null}
          </>
        )}
        editChildren={editingSection === SECTION.WEEKLY ? (
          <div className="goals-weekly-edit">
            <p className="goals-weekly-edit-hint">Keep it to 3–6 priorities. Quality over quantity.</p>
            {(Array.isArray(draft) ? draft : []).map((p, idx) => (
              <div key={p.id} className="goals-weekly-edit-row">
                <GoalsInput
                  value={p.text}
                  onChange={(e) => updateDraft((items) => (Array.isArray(items) ? items : []).map((it, i) => (i === idx ? { ...it, text: e.target.value } : it)))}
                  placeholder="One meaningful priority"
                />
                <GoalsRepeatableRemove onClick={() => updateDraft((items) => (Array.isArray(items) ? items : []).filter((_, i) => i !== idx))} />
              </div>
            ))}
            {(Array.isArray(draft) ? draft : []).length < 6 ? (
              <GoalsRepeatableAdd onClick={() => updateDraft((items) => [...(Array.isArray(items) ? items : []), newWeeklyPriority()])} label="Add priority" />
            ) : null}
          </div>
        ) : null}
      >
        <div className="goals-weekly-view">
          {needsCheckIn && !checkinOpen ? (
            <div className="goals-checkin-cta">
              <div>
                <strong>Ready for your weekly check-in?</strong>
                <p>Review what happened, notice alignment, and reset for next week.</p>
              </div>
              <button type="button" className="goals-btn goals-btn--primary" onClick={() => setCheckinOpen(true)}>
                <Target size={15} aria-hidden />
                Start check-in
              </button>
            </div>
          ) : null}

          {checkinOpen ? (
            <GoalsWeeklyCheckin
              doc={doc}
              weekKey={weekKey}
              onCancel={() => setCheckinOpen(false)}
              onComplete={completeCheckIn}
            />
          ) : (
            <ol className="goals-priority-list">
              {doc.weekly.priorities.map((p, idx) => (
                <li key={p.id}>
                  <span className="goals-priority-num">{idx + 1}</span>
                  <div>
                    <p>{p.text}</p>
                    {p.source === 'carried' ? <span className="goals-priority-meta">Carried forward</span> : null}
                    {p.source === 'season' ? <span className="goals-priority-meta">From season</span> : null}
                  </div>
                </li>
              ))}
            </ol>
          )}

          {!checkinOpen && doc.weekly.priorities.length > 0 && !needsCheckIn ? (
            <button type="button" className="goals-btn goals-btn--ghost goals-btn--sm goals-checkin-secondary" onClick={() => setCheckinOpen(true)}>
              Open check-in
            </button>
          ) : null}
        </div>
      </GoalsSectionCard>

      {doc.checkIns.length > 0 && (
        <section className="goals-history-section">
          <header className="goals-history-head">
            <Flag size={16} aria-hidden />
            <div>
              <h2>Check-in history</h2>
              <p>Patterns over time — drift, blockers, alignment</p>
            </div>
          </header>
          <div className="goals-history-timeline">
            {doc.checkIns.slice(0, 12).map((checkIn) => (
              <article key={checkIn.id} className="goals-history-item">
                <header>
                  <strong>{formatWeekLabel(checkIn.weekKey)}</strong>
                  <time dateTime={new Date(checkIn.completedAt).toISOString()}>
                    {new Date(checkIn.completedAt).toLocaleDateString()}
                  </time>
                </header>
                {checkIn.reflection.movedForward ? (
                  <p><span>Moved forward:</span> {checkIn.reflection.movedForward}</p>
                ) : null}
                {checkIn.reflection.blockers ? (
                  <p><span>Blockers:</span> {checkIn.reflection.blockers}</p>
                ) : null}
                {checkIn.reflection.alignedWithSeason ? (
                  <p>
                    <span>Season alignment:</span>
                    {' '}
                    {alignmentLabel(checkIn.reflection.alignedWithSeason)}
                    {checkIn.reflection.alignmentNote ? ` — ${checkIn.reflection.alignmentNote}` : ''}
                  </p>
                ) : null}
                {checkIn.aiReview?.summary ? (
                  <div className="goals-history-ai">
                    <Sparkles size={13} aria-hidden />
                    <p>{checkIn.aiReview.summary}</p>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      )}

      {doc.seasonHistory.length > 0 && (
        <section className="goals-season-history">
          <h2>Past seasons</h2>
          <ul>
            {doc.seasonHistory.map((s) => (
              <li key={s.id}>
                <strong>{s.title}</strong>
                {s.endedAt ? <span>{s.endedAt}</span> : null}
                {s.description ? <p>{s.description}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
