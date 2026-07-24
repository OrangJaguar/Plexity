/**
 * Shared placeholder for tools that are catalogued but not built yet.
 * @param {{ title: string, icon: import('lucide-react').LucideIcon, lead: string, bullets?: string[] }} props
 */
export default function ToolsComingSoonContent({ title, icon: Icon, lead, bullets = [] }) {
  return (
    <div className="tools-coming-soon-shell">
      <div className="tools-box">
        {Icon ? (
          <div className="tools-coming-soon-icon" aria-hidden>
            <Icon size={28} />
          </div>
        ) : null}
        <h1 className="tools-coming-soon-title">{title}</h1>
        <p className="tools-coming-soon-badge">Coming soon</p>
        <p className="tools-coming-soon-lead">{lead}</p>
        {bullets.length > 0 ? (
          <ul className="tools-coming-soon-list">
            {bullets.map((item) => (
              <li key={item}>
                <span className="tools-coming-soon-bullet" aria-hidden>•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
