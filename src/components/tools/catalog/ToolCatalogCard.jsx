import { useNavigate } from 'react-router-dom';
import { Info, Star } from 'lucide-react';
import { usePinnedTools } from '@/hooks/queries/usePinnedTools';
import { useTogglePinnedTool } from '@/hooks/mutations/useTogglePinnedTool';
import { isToolPinned } from '@/lib/tools/pinned-tools';

export default function ToolCatalogCard({ tool, onPreview }) {
  const navigate = useNavigate();
  const { pinnedToolIds } = usePinnedTools();
  const togglePin = useTogglePinnedTool();
  const pinned = isToolPinned(tool.id, pinnedToolIds);
  const Icon = tool.icon;

  const handleCardClick = (e) => {
    if (e.target.closest('button')) return;
    navigate(tool.route);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      if (e.target.closest('button')) return;
      e.preventDefault();
      navigate(tool.route);
    }
  };

  return (
    <article
      className="tools-catalog-card"
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
    >
      <div className="tools-catalog-card-head">
        <div className="tools-catalog-card-icon" aria-hidden>
          <Icon size={20} />
        </div>
        <h3 className="tools-catalog-card-title">{tool.label}</h3>
      </div>
      <p className="tools-catalog-card-desc">{tool.description}</p>
      <div className="tools-catalog-card-actions">
        <button
          type="button"
          className="tools-catalog-icon-btn"
          aria-label={`Preview ${tool.label}`}
          onClick={(e) => {
            e.stopPropagation();
            onPreview(tool);
          }}
        >
          <Info size={15} />
        </button>
        <button
          type="button"
          className={`tools-catalog-icon-btn tools-catalog-star-btn${pinned ? ' pinned' : ''}`}
          aria-label={pinned ? `Unpin ${tool.label} from sidebar` : `Pin ${tool.label} to sidebar`}
          aria-pressed={pinned}
          onClick={(e) => {
            e.stopPropagation();
            togglePin.mutate(tool.id);
          }}
        >
          <Star size={15} fill={pinned ? 'currentColor' : 'none'} />
        </button>
      </div>
    </article>
  );
}
