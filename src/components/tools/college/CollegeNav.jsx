import { COLLEGE_SECTIONS } from '@/lib/tools/college/college-model';

export default function CollegeNav({ active, onChange }) {
  return (
    <nav className="college-nav" aria-label="College application sections">
      {COLLEGE_SECTIONS.map((section) => (
        <button
          key={section.id}
          type="button"
          className={active === section.id ? 'active' : ''}
          onClick={() => onChange(section.id)}
        >
          {section.label}
        </button>
      ))}
    </nav>
  );
}
