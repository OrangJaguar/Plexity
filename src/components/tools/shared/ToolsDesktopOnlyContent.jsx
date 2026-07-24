import { Monitor } from 'lucide-react';

/**
 * Full-page placeholder when a tool requires a desktop-sized viewport.
 * @param {{ title: string, lead?: string, bullets?: string[] }} props
 */
export default function ToolsDesktopOnlyContent({
  title,
  lead = 'This tool needs a larger screen and more device power than most phones can offer comfortably.',
  bullets = [
    'Open this page on a laptop or desktop browser',
    'Use landscape tablets at full width if available',
    'Phone browsers stay free for lighter tools like Tasks and Converter',
  ],
}) {
  return (
    <div className="tools-coming-soon-shell tools-desktop-only-shell">
      <div className="tools-box">
        <div className="tools-coming-soon-icon" aria-hidden>
          <Monitor size={28} />
        </div>
        <h1 className="tools-coming-soon-title">{title}</h1>
        <p className="tools-coming-soon-badge">Desktop only</p>
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
