import ToolsBox from '@/components/tools/shared/ToolsBox';

export default function DashboardPreview() {
  return (
    <div className="tools-preview-scale tools-preview-dashboard">
      <div className="tools-shell tools-shell-dashboard intel-collapsed tools-preview-dashboard-shell">
        <div className="tools-dashboard-cluster">
          <div className="tools-grid-top">
            <ToolsBox title="NOW">
              <div className="tools-value-sm">AP Chemistry</div>
            </ToolsBox>
            <ToolsBox title="UNTIL">
              <div className="tools-value-sm">7:55 – 8:18 AM</div>
            </ToolsBox>
            <ToolsBox title="NEXT">
              <div className="tools-value-sm">English · 9:00 AM</div>
            </ToolsBox>
          </div>
          <ToolsBox className="tools-countdown-area tools-countdown-area--compact">
            <div className="tools-value tools-countdown-value tools-countdown-value--compact">00:23:14</div>
          </ToolsBox>
        </div>
        <section className="tools-intel-panel collapsed">
          <div className="tools-intel-panel-header">
            <div className="tools-intel-summary-row">
              <span className="tools-intel-summary">2 tasks due · 1 event remaining · ~4h free</span>
              <div className="tools-intel-widget-strip">
                <span className="tools-intel-widget-chip">72°F</span>
                <span className="tools-intel-widget-chip">SPY +0.4%</span>
              </div>
            </div>
            <button type="button" className="tools-intel-toggle-btn" tabIndex={-1} aria-hidden>
              ▾
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
