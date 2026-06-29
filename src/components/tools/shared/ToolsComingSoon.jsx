import ToolsBox from '@/components/tools/shared/ToolsBox';

export default function ToolsComingSoon({ icon: Icon, title, lead, features = [] }) {
  return (
    <div className="tools-coming-soon-shell">
      <ToolsBox>
        {Icon && (
          <div className="tools-coming-soon-icon">
            <Icon size={28} strokeWidth={1.5} />
          </div>
        )}
        <h2 className="tools-coming-soon-title">{title}</h2>
        {lead && <p className="tools-coming-soon-lead">{lead}</p>}
        {features.length > 0 && (
          <ul className="tools-coming-soon-list">
            {features.map((feature) => (
              <li key={feature}>
                <span className="tools-coming-soon-bullet" aria-hidden>•</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="tools-coming-soon-badge">Coming soon</p>
      </ToolsBox>
    </div>
  );
}
