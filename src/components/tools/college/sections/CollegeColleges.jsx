import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import {
  CollegeCard, CollegePageHeader,
  CollegeSelect,
} from '@/components/tools/college/college-shared';
import CollegeDetailModal from '@/components/tools/college/CollegeDetailModal';
import {
  getCatalogCardStats,
  getCatalogCollege, getCatalogPlatforms, getCatalogRegions, getCatalogStates,
  resolveCollegeName, searchCatalog,
} from '@/lib/tools/college/college-catalog';
import {
  APPLICATION_ROUNDS, APPLICATION_STATUSES, newMyCollege, newSupplemental,
} from '@/lib/tools/college/college-model';
import {
  classificationLabel, getEffectiveClassification, suggestClassification,
} from '@/lib/tools/college/college-classify';
import { getCollegeDeadline } from '@/lib/tools/college/college-stats';

const PAGE_SIZE = 48;

export default function CollegeColleges({ doc, updateDoc, onJumpWriting }) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState('all');
  const [region, setRegion] = useState('all');
  const [type, setType] = useState('all');
  const [platform, setPlatform] = useState('all');
  const [testPolicy, setTestPolicy] = useState('all');
  const [acceptanceBand, setAcceptanceBand] = useState('all');
  const [page, setPage] = useState(0);
  const [modalCatalogId, setModalCatalogId] = useState(null);
  const [listModalId, setListModalId] = useState(null);

  const results = useMemo(() => searchCatalog({
    query, state, region, type, platform, testPolicy, acceptanceBand,
  }), [query, state, region, type, platform, testPolicy, acceptanceBand]);

  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const pageResults = results.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const myColleges = doc.myColleges || [];
  const modalCollege = modalCatalogId ? getCatalogCollege(modalCatalogId) : null;
  const listCollege = listModalId ? myColleges.find((c) => c.id === listModalId) : null;
  const listCatalog = listCollege?.catalogId ? getCatalogCollege(listCollege.catalogId) : null;
  const activeCollege = listCatalog ?? modalCollege;
  const activeMyCollege = listCollege ?? myColleges.find((c) => c.catalogId === modalCatalogId) ?? null;

  const addCollege = (catalogId) => {
    const cat = getCatalogCollege(catalogId);
    if (!cat || myColleges.some((c) => c.catalogId === catalogId)) return;
    const entry = newMyCollege(catalogId, cat);
    const suggested = suggestClassification(cat, doc.academics, doc.testing);
    if (suggested) entry.classification = suggested;
    updateDoc({ myColleges: [...myColleges, entry] });
    setListModalId(entry.id);
    setModalCatalogId(catalogId);
  };

  const updateCollege = (id, patch) => {
    updateDoc({
      myColleges: myColleges.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  };

  const removeCollege = (id) => {
    updateDoc({
      myColleges: myColleges.filter((c) => c.id !== id),
      supplementals: (doc.supplementals || []).filter((s) => s.collegeId !== id),
    });
    setListModalId(null);
    if (modalCatalogId && myColleges.find((c) => c.id === id)?.catalogId === modalCatalogId) {
      setModalCatalogId(null);
    }
  };

  const addSupplemental = () => {
    if (!activeMyCollege) return;
    const item = newSupplemental(activeMyCollege.id);
    updateDoc({ supplementals: [...(doc.supplementals || []), item] });
  };

  const closeModal = () => {
    setModalCatalogId(null);
    setListModalId(null);
  };

  const openCatalog = (catalogId) => {
    setModalCatalogId(catalogId);
    setListModalId(myColleges.find((c) => c.catalogId === catalogId)?.id ?? null);
  };

  const deadline = activeMyCollege ? getCollegeDeadline(activeMyCollege) : null;
  const effectiveClass = activeMyCollege
    ? getEffectiveClassification(activeMyCollege, doc.academics, doc.testing)
    : null;
  const suggested = activeCollege
    ? suggestClassification(activeCollege, doc.academics, doc.testing)
    : null;

  const resetPage = () => setPage(0);

  return (
    <div className="college-section">
      <CollegePageHeader
        title="Colleges"
        description="Search schools, build your list, and classify reach / target / safety."
      />

      <div className="college-colleges-main college-colleges-main--full">
        <div className="college-search-bar">
          <Search size={16} />
          <input
            className="college-search-input"
            placeholder="Search by name, city, or state…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); resetPage(); }}
          />
        </div>

        <div className="college-filter-row">
          <div className="college-filter-chips">
            <CollegeSelect value={state} onChange={(e) => { setState(e.target.value); resetPage(); }}>
              <option value="all">All states</option>
              {getCatalogStates().map((s) => <option key={s} value={s}>{s}</option>)}
            </CollegeSelect>
            <CollegeSelect value={region} onChange={(e) => { setRegion(e.target.value); resetPage(); }}>
              <option value="all">All regions</option>
              {getCatalogRegions().map((r) => <option key={r} value={r}>{r}</option>)}
            </CollegeSelect>
            <CollegeSelect value={type} onChange={(e) => { setType(e.target.value); resetPage(); }}>
              <option value="all">All types</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </CollegeSelect>
            <CollegeSelect value={platform} onChange={(e) => { setPlatform(e.target.value); resetPage(); }}>
              <option value="all">All platforms</option>
              {getCatalogPlatforms().map((p) => <option key={p} value={p}>{p}</option>)}
            </CollegeSelect>
            <CollegeSelect value={testPolicy} onChange={(e) => { setTestPolicy(e.target.value); resetPage(); }}>
              <option value="all">All test policies</option>
              <option value="optional">Test optional</option>
              <option value="required">Test required</option>
              <option value="blind">Test blind</option>
            </CollegeSelect>
            <CollegeSelect value={acceptanceBand} onChange={(e) => { setAcceptanceBand(e.target.value); resetPage(); }}>
              <option value="all">All selectivity</option>
              <option value="ultra">Ultra selective (&lt;15%)</option>
              <option value="selective">Selective (15–40%)</option>
              <option value="moderate">Moderate (40–70%)</option>
              <option value="open">More open (70%+)</option>
            </CollegeSelect>
          </div>
        </div>

        <div className="college-catalog-meta">
          <span>{results.length.toLocaleString()} schools</span>
          {results.length > PAGE_SIZE && (
            <div className="college-catalog-pagination">
              <button
                type="button"
                className="college-icon-btn"
                disabled={page <= 0}
                onClick={() => setPage((p) => p - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <span>
                {page + 1}
                {' / '}
                {pageCount}
              </span>
              <button
                type="button"
                className="college-icon-btn"
                disabled={page >= pageCount - 1}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="college-catalog-grid college-catalog-grid--browse">
          {pageResults.map((c) => {
            const added = myColleges.some((m) => m.catalogId === c.id);
            const cardStats = getCatalogCardStats(c);
            return (
              <article
                key={c.id}
                className="college-catalog-card college-catalog-card--clickable"
                onClick={() => openCatalog(c.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openCatalog(c.id);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="college-catalog-card-head">
                  <h4>{c.name}</h4>
                  <span className="college-muted">
                    {c.city ? `${c.city}, ` : ''}
                    {c.state}
                    {' · '}
                    {c.type}
                  </span>
                </div>
                <div className="college-catalog-stats college-catalog-stats--grid">
                  {cardStats.map((s) => (
                    <span key={s.label}>
                      <em>{s.label}</em>
                      {' '}
                      {s.value}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  className={`college-btn college-btn--sm${added ? ' is-added' : ''}`}
                  disabled={added}
                  onClick={(e) => { e.stopPropagation(); addCollege(c.id); }}
                >
                  {added ? 'On list' : 'Add'}
                </button>
              </article>
            );
          })}
        </div>

        {pageResults.length === 0 && (
          <p className="college-muted college-catalog-empty">No schools match your filters.</p>
        )}

        <CollegeCard title="Your college list">
          {myColleges.length ? (
            <table className="college-table">
              <thead>
                <tr>
                  <th>School</th>
                  <th>Class</th>
                  <th>Round</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {myColleges.map((c) => (
                  <tr
                    key={c.id}
                    className={listModalId === c.id ? 'active' : ''}
                    onClick={() => {
                      setListModalId(c.id);
                      setModalCatalogId(c.catalogId);
                    }}
                  >
                    <td>{resolveCollegeName(c)}</td>
                    <td>{classificationLabel(getEffectiveClassification(c, doc.academics, doc.testing))}</td>
                    <td>{APPLICATION_ROUNDS.find((r) => r.id === c.applicationRound)?.label || c.applicationRound}</td>
                    <td>{APPLICATION_STATUSES.find((s) => s.id === c.applicationStatus)?.label}</td>
                    <td>
                      <button
                        type="button"
                        className="college-icon-btn"
                        onClick={(e) => { e.stopPropagation(); removeCollege(c.id); }}
                      >
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="college-muted">Search above and add schools to your list.</p>
          )}
        </CollegeCard>
      </div>

      {activeCollege && (
        <CollegeDetailModal
          college={activeCollege}
          myCollege={activeMyCollege}
          onClose={closeModal}
          onAdd={() => addCollege(activeCollege.id)}
          onUpdateCollege={updateCollege}
          onRemoveCollege={removeCollege}
          onAddSupplemental={addSupplemental}
          onJumpWriting={() => {
            if (activeMyCollege) onJumpWriting?.(activeMyCollege.id);
            closeModal();
          }}
          added={myColleges.some((m) => m.catalogId === activeCollege.id)}
          suggested={suggested ? classificationLabel(suggested) : null}
          effectiveClass={effectiveClass}
          deadline={deadline}
        />
      )}
    </div>
  );
}
