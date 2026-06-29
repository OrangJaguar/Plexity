import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera, Cloud, ExternalLink, GraduationCap, Link2, Loader2, Sparkles, User,
} from 'lucide-react';
import {
  ProfileExternalLink,
  ProfileField,
  ProfileInfoRow,
  ProfileInput,
  ProfileRepeatableActions,
  ProfileRepeatableRemove,
  ProfileSectionCard,
  ProfileTagEditor,
  ProfileTagList,
  ProfileTextarea,
} from '@/components/tools/profile/profile-shared';
import {
  HIGHLIGHT_SUGGESTIONS,
  LINK_PRESETS,
  newEducationEntry,
  newExperience,
  newHighlight,
  newProfileLink,
  normalizeProfileDocument,
  resizePhotoFile,
  sectionHasContent,
} from '@/lib/tools/profile/profile-model';

const SECTIONS = {
  HEADER: 'header',
  HIGHLIGHTS: 'highlights',
  FOCUS: 'focus',
  BASIC: 'basic',
  ABOUT: 'about',
  INTERESTS: 'interests',
  EDUCATION: 'education',
  EXPERIENCES: 'experiences',
  LINKS: 'links',
};

function initialsFromName(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return null;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function ProfileWorkspace({ data, saveDocument }) {
  const [doc, setDoc] = useState(() => normalizeProfileDocument(data));
  const [editingSection, setEditingSection] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saveState, setSaveState] = useState('saved');
  const photoInputRef = useRef(null);

  useEffect(() => {
    if (saveState === 'saving' || editingSection) return;
    setDoc(normalizeProfileDocument(data));
  }, [data, saveState, editingSection]);

  const persist = useCallback(async (next) => {
    setSaveState('saving');
    try {
      await saveDocument(next);
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }, [saveDocument]);

  const startEdit = (section, buildDraft) => {
    setEditingSection(section);
    setDraft(buildDraft ? buildDraft(doc) : structuredClone(doc));
  };

  const cancelEdit = () => {
    setEditingSection(null);
    setDraft(null);
  };

  const saveSection = async (mergeFn) => {
    const next = normalizeProfileDocument(mergeFn(doc, draft));
    setDoc(next);
    setEditingSection(null);
    setDraft(null);
    await persist(next);
  };

  const updateDraft = (updater) => {
    setDraft((prev) => (typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }));
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const dataUrl = await resizePhotoFile(file);
    if (!dataUrl) return;
    const next = normalizeProfileDocument({
      ...doc,
      header: { ...doc.header, photoDataUrl: dataUrl },
      updatedAt: Date.now(),
    });
    setDoc(next);
    await persist(next);
  };

  const removePhoto = async () => {
    const next = normalizeProfileDocument({
      ...doc,
      header: { ...doc.header, photoDataUrl: null },
      updatedAt: Date.now(),
    });
    setDoc(next);
    await persist(next);
  };

  const header = doc.header;
  const initials = initialsFromName(header.name);
  const heroFilled = Boolean(header.name || header.headline || header.bioShort || header.photoDataUrl);

  return (
    <div className="profile-workspace">
      <div className="profile-workspace-toolbar">
        <p className="profile-workspace-lead">
          Your personal reference hub — identity, background, and context in one place.
        </p>
        <span className={`profile-save-indicator profile-save-indicator--${saveState}`}>
          {saveState === 'saving' ? <Loader2 size={14} className="profile-spin" aria-hidden /> : <Cloud size={14} aria-hidden />}
          {saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Save failed' : 'Saved'}
        </span>
      </div>

      <section className={`profile-hero ${editingSection === SECTIONS.HEADER ? 'profile-hero--editing' : ''}`}>
        <div className="profile-hero-avatar-wrap">
          <div className="profile-hero-avatar" aria-hidden={!header.photoDataUrl && !initials}>
            {header.photoDataUrl ? (
              <img src={header.photoDataUrl} alt="" />
            ) : initials ? (
              <span>{initials}</span>
            ) : (
              <User size={28} strokeWidth={1.5} />
            )}
          </div>
          <div className="profile-hero-avatar-actions">
            <button
              type="button"
              className="profile-avatar-btn"
              onClick={() => photoInputRef.current?.click()}
              aria-label="Upload profile photo"
            >
              <Camera size={14} />
            </button>
            {header.photoDataUrl ? (
              <button type="button" className="profile-avatar-btn profile-avatar-btn--muted" onClick={removePhoto}>
                Remove
              </button>
            ) : null}
          </div>
          <input ref={photoInputRef} type="file" accept="image/*" className="profile-sr-only" onChange={handlePhotoSelect} />
        </div>

        <div className="profile-hero-copy">
          {editingSection === SECTIONS.HEADER ? (
            <div className="profile-hero-edit">
              <ProfileField label="Name">
                <ProfileInput
                  value={draft?.name || ''}
                  onChange={(e) => updateDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder="Your name"
                  autoFocus
                />
              </ProfileField>
              <ProfileField label="Headline" hint="A short identity line — role, focus, or how you describe yourself">
                <ProfileInput
                  value={draft?.headline || ''}
                  onChange={(e) => updateDraft((d) => ({ ...d, headline: e.target.value }))}
                  placeholder="Student · builder · researcher"
                />
              </ProfileField>
              <ProfileField label="Short bio" hint="One or two sentences — who you are at a glance">
                <ProfileTextarea
                  rows={3}
                  value={draft?.bioShort || ''}
                  onChange={(e) => updateDraft((d) => ({ ...d, bioShort: e.target.value }))}
                  placeholder="A quick intro that answers “who is this person?”"
                />
              </ProfileField>
              <div className="profile-hero-edit-actions">
                <button type="button" className="profile-btn profile-btn--ghost profile-btn--sm" onClick={cancelEdit}>Cancel</button>
                <button
                  type="button"
                  className="profile-btn profile-btn--primary profile-btn--sm"
                  onClick={() => saveSection((current, d) => ({
                    ...current,
                    header: { ...current.header, name: d.name, headline: d.headline, bioShort: d.bioShort },
                  }))}
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="profile-hero-topline">
                <div>
                  <h1 className="profile-hero-name">{header.name || 'Your name'}</h1>
                  {header.headline ? <p className="profile-hero-headline">{header.headline}</p> : null}
                </div>
                <button
                  type="button"
                  className="profile-btn profile-btn--ghost profile-btn--sm"
                  onClick={() => startEdit(SECTIONS.HEADER, (d) => ({ ...d.header }))}
                >
                  {heroFilled ? 'Edit' : 'Add details'}
                </button>
              </div>
              {header.bioShort ? (
                <p className="profile-hero-bio">{header.bioShort}</p>
              ) : !heroFilled ? (
                <p className="profile-hero-placeholder">Add your name, a headline, and a short bio to make this feel like yours.</p>
              ) : null}
            </>
          )}
        </div>
      </section>

      {(sectionHasContent('highlights', doc) || editingSection === SECTIONS.HIGHLIGHTS) && (
        <ProfileSectionCard
          title="Key facts"
          hint="A few high-signal items that define where you are right now"
          editing={editingSection === SECTIONS.HIGHLIGHTS}
          onEdit={() => startEdit(SECTIONS.HIGHLIGHTS, (d) => (
            d.highlights.length
              ? [...d.highlights]
              : HIGHLIGHT_SUGGESTIONS.map((s) => newHighlight(s)).slice(0, 3)
          ))}
          onCancel={cancelEdit}
          onSave={() => saveSection((current, items) => ({
            ...current,
            highlights: items.filter((h) => h.label.trim() || h.value.trim()),
          }))}
          isEmpty={!sectionHasContent('highlights', doc)}
          emptyTitle="Surface a few defining facts"
          emptyLead="Current focus, main project, target path — 3 to 5 items max."
          emptyAction="Add key facts"
          className="profile-section-card--highlights"
          editChildren={editingSection === SECTIONS.HIGHLIGHTS ? (
            <div className="profile-highlights-edit">
              {(Array.isArray(draft) ? draft : []).map((item, idx) => (
                <div key={item.id} className="profile-highlight-edit-row">
                  <ProfileInput
                    value={item.label}
                    onChange={(e) => updateDraft((items) => items.map((h, i) => (i === idx ? { ...h, label: e.target.value } : h)))}
                    placeholder="Label (e.g. Current focus)"
                  />
                  <ProfileInput
                    value={item.value}
                    onChange={(e) => updateDraft((items) => items.map((h, i) => (i === idx ? { ...h, value: e.target.value } : h)))}
                    placeholder="Value"
                  />
                  <ProfileRepeatableRemove
                    onClick={() => updateDraft((items) => items.filter((_, i) => i !== idx))}
                  />
                </div>
              ))}
              {(Array.isArray(draft) ? draft : []).length < 5 ? (
                <ProfileRepeatableActions
                  addLabel="Add fact"
                  onAdd={() => updateDraft((items) => [...(Array.isArray(items) ? items : []), newHighlight()])}
                />
              ) : null}
            </div>
          ) : null}
        >
          <div className="profile-highlights-grid">
            {doc.highlights.filter((h) => h.label || h.value).map((h) => (
              <div key={h.id} className="profile-highlight-chip">
                <Sparkles size={14} aria-hidden />
                <div>
                  <span className="profile-highlight-label">{h.label}</span>
                  <span className="profile-highlight-value">{h.value}</span>
                </div>
              </div>
            ))}
          </div>
        </ProfileSectionCard>
      )}

      {!sectionHasContent('highlights', doc) && editingSection !== SECTIONS.HIGHLIGHTS ? (
        <button
          type="button"
          className="profile-optional-strip"
          onClick={() => startEdit(SECTIONS.HIGHLIGHTS, () => HIGHLIGHT_SUGGESTIONS.map((s) => newHighlight(s)).slice(0, 3))}
        >
          <Sparkles size={15} aria-hidden />
          Add optional key facts
        </button>
      ) : null}

      <ProfileSectionCard
        title="Current focus"
        hint="Light-touch context only — deep goal planning lives on Goals"
        editing={editingSection === SECTIONS.FOCUS}
        onEdit={() => startEdit(SECTIONS.FOCUS, (d) => d.currentFocus)}
        onCancel={cancelEdit}
        onSave={() => saveSection((current, value) => ({ ...current, currentFocus: value }))}
        isEmpty={!sectionHasContent('focus', doc)}
        emptyTitle="What are you mainly working on?"
        emptyLead="A sentence or two — not a full planning board."
        emptyAction="Add focus"
        editChildren={editingSection === SECTIONS.FOCUS ? (
          <ProfileTextarea
            rows={3}
            value={typeof draft === 'string' ? draft : ''}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. Building a research portfolio while finishing junior year"
          />
        ) : null}
      >
        <p className="profile-focus-text">{doc.currentFocus}</p>
      </ProfileSectionCard>

      <ProfileSectionCard
        title="Basic info"
        hint="Core identity details — factual and easy to skim"
        editing={editingSection === SECTIONS.BASIC}
        onEdit={() => startEdit(SECTIONS.BASIC, (d) => ({ ...d.basicInfo }))}
        onCancel={cancelEdit}
        onSave={() => saveSection((current, info) => ({ ...current, basicInfo: info }))}
        isEmpty={!sectionHasContent('basic', doc)}
        emptyTitle="Add a personal snapshot"
        emptyLead="Location, school, graduation year, and a few descriptors."
        editChildren={editingSection === SECTIONS.BASIC ? (
          <div className="profile-basic-edit">
            <div className="profile-field-grid">
              <ProfileField label="Location">
                <ProfileInput
                  value={draft?.location || ''}
                  onChange={(e) => updateDraft((d) => ({ ...d, location: e.target.value }))}
                  placeholder="City, state or region"
                />
              </ProfileField>
              <ProfileField label="School">
                <ProfileInput
                  value={draft?.school || ''}
                  onChange={(e) => updateDraft((d) => ({ ...d, school: e.target.value }))}
                  placeholder="Current or most recent school"
                />
              </ProfileField>
              <ProfileField label="Education status">
                <ProfileInput
                  value={draft?.educationStatus || ''}
                  onChange={(e) => updateDraft((d) => ({ ...d, educationStatus: e.target.value }))}
                  placeholder="e.g. High school junior, Gap year"
                />
              </ProfileField>
              <ProfileField label="Graduation year">
                <ProfileInput
                  value={draft?.graduationYear || ''}
                  onChange={(e) => updateDraft((d) => ({ ...d, graduationYear: e.target.value }))}
                  placeholder="2027"
                />
              </ProfileField>
              <ProfileField label="Age range" hint="Optional — only if you want it here">
                <ProfileInput
                  value={draft?.ageRange || ''}
                  onChange={(e) => updateDraft((d) => ({ ...d, ageRange: e.target.value }))}
                  placeholder="e.g. 16–17"
                />
              </ProfileField>
            </div>
            <ProfileField label="Descriptors" hint="A few broad labels — comma separated">
              <ProfileTagEditor
                value={draft?.descriptors || []}
                onChange={(descriptors) => updateDraft((d) => ({ ...d, descriptors }))}
                placeholder="curious, hands-on, visual learner…"
              />
            </ProfileField>
          </div>
        ) : null}
      >
        <div className="profile-basic-view">
          <ProfileInfoRow label="Location" value={doc.basicInfo.location} />
          <ProfileInfoRow label="School" value={doc.basicInfo.school} />
          <ProfileInfoRow label="Status" value={doc.basicInfo.educationStatus} />
          <ProfileInfoRow label="Graduation" value={doc.basicInfo.graduationYear} />
          <ProfileInfoRow label="Age range" value={doc.basicInfo.ageRange} />
          {doc.basicInfo.descriptors?.length ? (
            <div className="profile-basic-descriptors">
              <span className="profile-info-row-label">Descriptors</span>
              <ProfileTagList tags={doc.basicInfo.descriptors} />
            </div>
          ) : null}
        </div>
      </ProfileSectionCard>

      <ProfileSectionCard
        title="About"
        hint="A richer personal description — mission, interests, or how you see yourself"
        editing={editingSection === SECTIONS.ABOUT}
        onEdit={() => startEdit(SECTIONS.ABOUT, (d) => d.about)}
        onCancel={cancelEdit}
        onSave={() => saveSection((current, value) => ({ ...current, about: value }))}
        isEmpty={!sectionHasContent('about', doc)}
        emptyTitle="Add a short bio"
        emptyLead="Personal statement, mission summary, or casual intro — your call."
        editChildren={editingSection === SECTIONS.ABOUT ? (
          <ProfileTextarea
            rows={6}
            value={typeof draft === 'string' ? draft : ''}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Who you are, what you care about, what you're building toward…"
          />
        ) : null}
      >
        <p className="profile-about-text">{doc.about}</p>
      </ProfileSectionCard>

      <ProfileSectionCard
        title="Interests & focus areas"
        hint="Subjects and domains you genuinely care about"
        editing={editingSection === SECTIONS.INTERESTS}
        onEdit={() => startEdit(SECTIONS.INTERESTS, (d) => [...d.interests])}
        onCancel={cancelEdit}
        onSave={() => saveSection((current, tags) => ({ ...current, interests: tags }))}
        isEmpty={!sectionHasContent('interests', doc)}
        emptyTitle="Add a few areas you care about"
        emptyLead="AI, education, design, volleyball, investing — whatever shapes you."
        editChildren={editingSection === SECTIONS.INTERESTS ? (
          <ProfileTagEditor
            value={Array.isArray(draft) ? draft : []}
            onChange={setDraft}
            placeholder="Type an interest and press Enter…"
          />
        ) : null}
      >
        <ProfileTagList tags={doc.interests} emptyLabel="No interests added yet" />
      </ProfileSectionCard>

      <ProfileSectionCard
        title="Education"
        hint="School background — flexible, not a full transcript"
        editing={editingSection === SECTIONS.EDUCATION}
        onEdit={() => startEdit(SECTIONS.EDUCATION, (d) => (
          d.education.length ? [...d.education] : [newEducationEntry()]
        ))}
        onCancel={cancelEdit}
        onSave={() => saveSection((current, entries) => ({
          ...current,
          education: entries.filter((e) => e.school || e.program || e.notes),
        }))}
        isEmpty={!sectionHasContent('education', doc)}
        emptyTitle="Add your school background"
        emptyLead="Current school, programs, coursework highlights, or certifications."
        className="profile-section-card--education"
        editChildren={editingSection === SECTIONS.EDUCATION ? (
          <div className="profile-repeatable-stack">
            {(Array.isArray(draft) ? draft : []).map((entry, idx) => (
              <div key={entry.id} className="profile-repeatable-card">
                <div className="profile-field-grid">
                  <ProfileField label="School">
                    <ProfileInput
                      value={entry.school}
                      onChange={(e) => updateDraft((items) => items.map((it, i) => (i === idx ? { ...it, school: e.target.value } : it)))}
                    />
                  </ProfileField>
                  <ProfileField label="Program / degree">
                    <ProfileInput
                      value={entry.program}
                      onChange={(e) => updateDraft((items) => items.map((it, i) => (i === idx ? { ...it, program: e.target.value } : it)))}
                    />
                  </ProfileField>
                  <ProfileField label="Focus area">
                    <ProfileInput
                      value={entry.focus}
                      onChange={(e) => updateDraft((items) => items.map((it, i) => (i === idx ? { ...it, focus: e.target.value } : it)))}
                    />
                  </ProfileField>
                  <ProfileField label="Graduation year">
                    <ProfileInput
                      value={entry.graduationYear}
                      onChange={(e) => updateDraft((items) => items.map((it, i) => (i === idx ? { ...it, graduationYear: e.target.value } : it)))}
                    />
                  </ProfileField>
                </div>
                <ProfileField label="Coursework highlights">
                  <ProfileTextarea
                    rows={2}
                    value={entry.coursework}
                    onChange={(e) => updateDraft((items) => items.map((it, i) => (i === idx ? { ...it, coursework: e.target.value } : it)))}
                  />
                </ProfileField>
                <ProfileField label="Certifications">
                  <ProfileInput
                    value={entry.certifications}
                    onChange={(e) => updateDraft((items) => items.map((it, i) => (i === idx ? { ...it, certifications: e.target.value } : it)))}
                  />
                </ProfileField>
                <ProfileField label="Notes">
                  <ProfileTextarea
                    rows={2}
                    value={entry.notes}
                    onChange={(e) => updateDraft((items) => items.map((it, i) => (i === idx ? { ...it, notes: e.target.value } : it)))}
                  />
                </ProfileField>
                <ProfileRepeatableRemove onClick={() => updateDraft((items) => items.filter((_, i) => i !== idx))} />
              </div>
            ))}
            <ProfileRepeatableActions onAdd={() => updateDraft((items) => [...(Array.isArray(items) ? items : []), newEducationEntry()])} />
          </div>
        ) : null}
      >
        <div className="profile-education-list">
          {doc.education.map((entry) => (
            <article key={entry.id} className="profile-education-item">
              <div className="profile-education-item-head">
                <GraduationCap size={18} aria-hidden />
                <div>
                  <h3>{entry.school || 'School'}</h3>
                  {entry.program ? <p className="profile-education-program">{entry.program}</p> : null}
                </div>
                {entry.graduationYear ? <span className="profile-education-year">{entry.graduationYear}</span> : null}
              </div>
              {entry.focus ? <p className="profile-education-focus">{entry.focus}</p> : null}
              {entry.coursework ? <p className="profile-education-detail"><strong>Coursework:</strong> {entry.coursework}</p> : null}
              {entry.certifications ? <p className="profile-education-detail"><strong>Certifications:</strong> {entry.certifications}</p> : null}
              {entry.notes ? <p className="profile-education-notes">{entry.notes}</p> : null}
            </article>
          ))}
        </div>
      </ProfileSectionCard>

      <ProfileSectionCard
        title="Projects & experience"
        hint="Things you've built, led, researched, or contributed to"
        editing={editingSection === SECTIONS.EXPERIENCES}
        onEdit={() => startEdit(SECTIONS.EXPERIENCES, (d) => (
          d.experiences.length ? [...d.experiences] : [newExperience()]
        ))}
        onCancel={cancelEdit}
        onSave={() => saveSection((current, items) => ({
          ...current,
          experiences: items.filter((e) => e.title || e.description),
        }))}
        isEmpty={!sectionHasContent('experiences', doc)}
        emptyTitle="List a project you're proud of"
        emptyLead="Startups, research, leadership, competitions, volunteer work — anything that matters."
        className="profile-section-card--experiences"
        editChildren={editingSection === SECTIONS.EXPERIENCES ? (
          <div className="profile-repeatable-stack">
            {(Array.isArray(draft) ? draft : []).map((item, idx) => (
              <div key={item.id} className="profile-repeatable-card profile-repeatable-card--experience">
                <div className="profile-field-grid">
                  <ProfileField label="Title">
                    <ProfileInput
                      value={item.title}
                      onChange={(e) => updateDraft((items) => items.map((it, i) => (i === idx ? { ...it, title: e.target.value } : it)))}
                      placeholder="Project or role name"
                    />
                  </ProfileField>
                  <ProfileField label="Descriptor">
                    <ProfileInput
                      value={item.descriptor}
                      onChange={(e) => updateDraft((items) => items.map((it, i) => (i === idx ? { ...it, descriptor: e.target.value } : it)))}
                      placeholder="Founder · Lead researcher · Captain"
                    />
                  </ProfileField>
                  <ProfileField label="Time frame">
                    <ProfileInput
                      value={item.timeframe}
                      onChange={(e) => updateDraft((items) => items.map((it, i) => (i === idx ? { ...it, timeframe: e.target.value } : it)))}
                      placeholder="2024 – present"
                    />
                  </ProfileField>
                  <ProfileField label="Link">
                    <ProfileInput
                      value={item.link}
                      onChange={(e) => updateDraft((items) => items.map((it, i) => (i === idx ? { ...it, link: e.target.value } : it)))}
                      placeholder="https://…"
                    />
                  </ProfileField>
                </div>
                <ProfileField label="Description">
                  <ProfileTextarea
                    rows={3}
                    value={item.description}
                    onChange={(e) => updateDraft((items) => items.map((it, i) => (i === idx ? { ...it, description: e.target.value } : it)))}
                  />
                </ProfileField>
                <ProfileRepeatableRemove onClick={() => updateDraft((items) => items.filter((_, i) => i !== idx))} />
              </div>
            ))}
            <ProfileRepeatableActions addLabel="Add project or experience" onAdd={() => updateDraft((items) => [...(Array.isArray(items) ? items : []), newExperience()])} />
          </div>
        ) : null}
      >
        <div className="profile-experience-list">
          {doc.experiences.map((item) => (
            <article key={item.id} className="profile-experience-item">
              <div className="profile-experience-item-head">
                <div>
                  <h3>
                    {item.link ? (
                      <ProfileExternalLink href={item.link}>{item.title}</ProfileExternalLink>
                    ) : (
                      item.title
                    )}
                  </h3>
                  {item.descriptor ? <p className="profile-experience-descriptor">{item.descriptor}</p> : null}
                </div>
                {item.timeframe ? <span className="profile-experience-time">{item.timeframe}</span> : null}
              </div>
              {item.description ? <p className="profile-experience-desc">{item.description}</p> : null}
              {item.link ? (
                <a href={item.link.startsWith('http') ? item.link : `https://${item.link}`} target="_blank" rel="noopener noreferrer" className="profile-experience-link">
                  <ExternalLink size={13} aria-hidden />
                  View link
                </a>
              ) : null}
            </article>
          ))}
        </div>
      </ProfileSectionCard>

      <ProfileSectionCard
        title="Links"
        hint="Important destinations — portfolio, GitHub, LinkedIn, and more"
        editing={editingSection === SECTIONS.LINKS}
        onEdit={() => startEdit(SECTIONS.LINKS, (d) => (
          d.links.length ? [...d.links] : [newProfileLink(LINK_PRESETS[0])]
        ))}
        onCancel={cancelEdit}
        onSave={() => saveSection((current, items) => ({
          ...current,
          links: items.filter((l) => l.url.trim()),
        }))}
        isEmpty={!sectionHasContent('links', doc)}
        emptyTitle="Add your core links"
        emptyLead="Website, GitHub, portfolio — keep the essentials in one place."
        editChildren={editingSection === SECTIONS.LINKS ? (
          <div className="profile-repeatable-stack">
            {(Array.isArray(draft) ? draft : []).map((link, idx) => (
              <div key={link.id} className="profile-link-edit-row">
                <ProfileInput
                  value={link.label}
                  onChange={(e) => updateDraft((items) => items.map((it, i) => (i === idx ? { ...it, label: e.target.value } : it)))}
                  placeholder="Label"
                />
                <ProfileInput
                  value={link.url}
                  onChange={(e) => updateDraft((items) => items.map((it, i) => (i === idx ? { ...it, url: e.target.value } : it)))}
                  placeholder="https://…"
                />
                <ProfileRepeatableRemove onClick={() => updateDraft((items) => items.filter((_, i) => i !== idx))} />
              </div>
            ))}
            <ProfileRepeatableActions
              addLabel="Add link"
              onAdd={() => updateDraft((items) => [...(Array.isArray(items) ? items : []), newProfileLink()])}
            />
          </div>
        ) : null}
      >
        <ul className="profile-links-list">
          {doc.links.filter((l) => l.url).map((link) => (
            <li key={link.id}>
              <Link2 size={15} aria-hidden />
              <ProfileExternalLink href={link.url}>
                {link.label || link.url}
              </ProfileExternalLink>
            </li>
          ))}
        </ul>
      </ProfileSectionCard>
    </div>
  );
}
