import ToolsPageShell from '@/pages/tools/ToolsPageShell';
import VideoContent from '@/components/tools/video/VideoContent';
import ToolsDesktopOnlyContent from '@/components/tools/shared/ToolsDesktopOnlyContent';
import { useIsMobile } from '@/hooks/use-mobile';

export default function ToolsVideoPage() {
  const isMobile = useIsMobile();

  return (
    <ToolsPageShell className="tools-page--video tools-page--immersive">
      {isMobile ? (
        <ToolsDesktopOnlyContent
          title="Video"
          lead="The video editor is built for desktop timelines, previews, and local export. Phones don’t have the space or power for a usable editing surface."
        />
      ) : (
        <VideoContent />
      )}
    </ToolsPageShell>
  );
}
