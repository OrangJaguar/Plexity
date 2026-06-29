import { Suspense, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ToolsModal from '@/components/tools/shared/ToolsModal';
import AppLoading from '@/components/shared/AppLoading';

export default function ToolPreviewModal({ tool, open, onOpenChange }) {
  const navigate = useNavigate();
  const [PreviewComponent, setPreviewComponent] = useState(null);

  useEffect(() => {
    if (!open || !tool) {
      setPreviewComponent(null);
      return;
    }
    let cancelled = false;
    tool.loadPreview().then((mod) => {
      if (!cancelled) setPreviewComponent(() => mod.default);
    });
    return () => { cancelled = true; };
  }, [open, tool]);

  if (!tool) return null;

  return (
    <ToolsModal open={open} onOpenChange={onOpenChange} title={tool.label} maxWidth="820px" className="tools-catalog-preview-modal">
      <div className="tools-catalog-preview-wrap">
        <Suspense fallback={<AppLoading />}>
          {PreviewComponent ? <PreviewComponent /> : <AppLoading />}
        </Suspense>
      </div>
      {tool.longDescription && (
        <p className="tools-catalog-preview-desc">{tool.longDescription}</p>
      )}
      <div className="tools-form-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            onOpenChange(false);
            navigate(tool.route);
          }}
        >
          Open tool
        </button>
      </div>
    </ToolsModal>
  );
}
