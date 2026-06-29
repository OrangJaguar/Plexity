export default function ToolsBox({ title, children, className = '', onClick, role, tabIndex }) {
  const interactive = typeof onClick === 'function';
  return (
    <div
      className={`tools-box${className ? ` ${className}` : ''}${interactive ? ' tools-box--clickable' : ''}`}
      onClick={onClick}
      onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(e); } : undefined}
      role={role || (interactive ? 'button' : undefined)}
      tabIndex={tabIndex ?? (interactive ? 0 : undefined)}
    >
      {title ? <div className="tools-title">{title}</div> : null}
      {children}
    </div>
  );
}
