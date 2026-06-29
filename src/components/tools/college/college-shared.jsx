export function formatCardTitle(title) {
  if (!title) return '';
  return title
    .split(/\s+/)
    .map((word) => {
      if (word === '&') return word;
      if (!word.length) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

export function CollegeField({ label, hint, children }) {
  return (
    <label className="college-field">
      <span className="college-field-label">{label}</span>
      {hint ? <span className="college-field-hint">{hint}</span> : null}
      {children}
    </label>
  );
}

export function CollegePageHeader({ title, description }) {
  return (
    <header className="college-page-header">
      <h2>{title}</h2>
      {description ? <p className="college-page-header-desc">{description}</p> : null}
    </header>
  );
}

export function CollegeStatusChip({ status, map = {} }) {
  const label = map[status] || (status || '').replace(/_/g, ' ');
  return <span className={`college-status-chip college-status-chip--${status || 'default'}`}>{label}</span>;
}

export function CharCounter({ value, max, warnAt }) {
  const len = (value || '').length;
  const cls = len > max ? 'over' : warnAt && len >= warnAt ? 'warn' : '';
  return (
    <span className={`college-char-counter ${cls}`}>
      {len}
      /
      {max}
    </span>
  );
}

export function CollegeCard({ title, children, className = '' }) {
  return (
    <section className={`college-card ${className}`.trim()}>
      {title ? <h3 className="college-card-title">{formatCardTitle(title)}</h3> : null}
      <div className="college-card-body">{children}</div>
    </section>
  );
}

export function CollegeGrid({ children, cols = 2 }) {
  return (
    <div className={`college-grid college-grid--${cols}`}>
      {children}
    </div>
  );
}

export function CollegeInput(props) {
  return <input className="college-input" {...props} />;
}

export function CollegeTextarea(props) {
  return <textarea className="college-input college-textarea" {...props} />;
}

export function CollegeSelect({ children, ...props }) {
  return <select className="college-input college-select" {...props}>{children}</select>;
}

export function CollegeKpi({ label, value, sub }) {
  return (
    <div className="college-kpi">
      <span className="college-kpi-label">{label}</span>
      <strong className="college-kpi-value">{value}</strong>
      {sub ? <span className="college-kpi-sub">{sub}</span> : null}
    </div>
  );
}
