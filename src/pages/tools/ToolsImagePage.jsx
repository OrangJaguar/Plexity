import ToolsPageShell from '@/pages/tools/ToolsPageShell';
import ImageContent from '@/components/tools/image/ImageContent';
import ToolsDesktopOnlyContent from '@/components/tools/shared/ToolsDesktopOnlyContent';
import { useIsMobile } from '@/hooks/use-mobile';

export default function ToolsImagePage() {
  const isMobile = useIsMobile();

  return (
    <ToolsPageShell className="tools-page--image tools-page--immersive">
      {isMobile ? (
        <ToolsDesktopOnlyContent
          title="Image"
          lead="Image editing needs a roomy canvas and precise pointer control. On phones, use Converter for format changes — open Image on a computer for crop, annotate, and enhance."
        />
      ) : (
        <ImageContent />
      )}
    </ToolsPageShell>
  );
}
