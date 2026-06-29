import CollegePrivacyNotice from '@/components/tools/college/CollegePrivacyNotice';
import {
  CollegeCard, CollegeField, CollegePageHeader, CollegeSelect,
} from '@/components/tools/college/college-shared';
import { CHECKLIST_STATUS } from '@/lib/tools/college/college-model';

const SECTION_LABELS = {
  personal: 'Personal details needed',
  family: 'Family details needed',
  school: 'School / counselor details',
  documents: 'Official documents & submission',
};

export default function CollegeApplicationInfo({ doc, updateDoc }) {
  const checklist = doc.applicationChecklist || [];

  const updateItem = (id, status) => {
    updateDoc({
      applicationChecklist: checklist.map((item) => (
        item.id === id ? { ...item, status } : item
      )),
    });
  };

  const sections = Object.keys(SECTION_LABELS);

  return (
    <div className="college-section">
      <CollegePageHeader
        title="Application info"
        description="Track what you need for the real application — without storing sensitive answers here."
      />
      <CollegePrivacyNotice />

      <p className="college-guidance-note">
        Mark each item when you have it ready elsewhere (Common App, Coalition, or school portals).
        Do not enter full addresses, SSNs, or parent employer details in this tool.
      </p>

      {sections.map((section) => {
        const items = checklist.filter((i) => i.section === section);
        if (!items.length) return null;
        return (
          <CollegeCard key={section} title={SECTION_LABELS[section]}>
            <ul className="college-checklist">
              {items.map((item) => (
                <li key={item.id}>
                  <span className="college-checklist-label">{item.label}</span>
                  <CollegeField label="">
                    <CollegeSelect
                      value={item.status || ''}
                      onChange={(e) => updateItem(item.id, e.target.value || null)}
                    >
                      <option value="">Not started</option>
                      {CHECKLIST_STATUS.map((s) => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </CollegeSelect>
                  </CollegeField>
                </li>
              ))}
            </ul>
          </CollegeCard>
        );
      })}
    </div>
  );
}
