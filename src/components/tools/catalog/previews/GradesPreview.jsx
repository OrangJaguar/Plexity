import { letterGradeClass } from '@/lib/tools/grade-colors';

const COURSES = [
  { letter: 'B+', name: 'Algebra II', meta: 'Q2 · 4 assignments', pct: '87.2%' },
  { letter: 'A-', name: 'AP English', meta: 'Q2 · 6 assignments', pct: '91.4%' },
];

export default function GradesPreview() {
  return (
    <div className="tools-preview-scale tools-preview-grades">
      <div className="tools-grades-shell tools-preview-grades-shell">
        <header className="tools-grades-head">
          <h1>Grades</h1>
          <p className="tools-muted">Q2 · 6 classes</p>
        </header>
        <div className="tools-grades-preview-cards tools-preview-grades-cards">
          {COURSES.map((course) => (
            <button key={course.name} type="button" className="tools-grade-course-card tools-grade-course-card--preview">
              <span className={`tools-grade-letter tools-grade-letter--card ${letterGradeClass(course.letter)}`}>
                {course.letter}
              </span>
              <span className="tools-grade-course-card-body">
                <span className="tools-grade-course-name">{course.name}</span>
                <span className="tools-grade-course-meta">{course.meta}</span>
              </span>
              <span className="tools-grade-course-pct">{course.pct}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
