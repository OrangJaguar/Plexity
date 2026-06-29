export default function ToolsTabs({ tabs, active, onChange, className = 'tools-tabs' }) {
  return (
    <div className={className}>
      {tabs.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          className={`tools-tab${active === id ? ' active' : ''}`}
          onClick={() => onChange(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
