import { Link } from 'react-router-dom';
import { CalendarClock } from 'lucide-react';
import ToolsBox from '@/components/tools/shared/ToolsBox';

export default function ScheduleSetupPrompt() {
  return (
    <ToolsBox className="tools-schedule-setup-prompt">
      <div className="tools-schedule-setup-prompt-inner">
        <div className="tools-schedule-setup-prompt-icon" aria-hidden>
          <CalendarClock size={28} />
        </div>
        <h3 className="tools-schedule-setup-prompt-title">Set up your weekly schedule</h3>
        <p className="tools-schedule-setup-prompt-lead">
          Add school, work, or recurring classes so Dashboard can show what you&apos;re in now.
        </p>
        <Link to="/settings?setup=schedule" className="btn btn-primary btn-sm">
          Set up schedule
        </Link>
      </div>
    </ToolsBox>
  );
}
