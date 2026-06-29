import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function ToolsModal({ open, onOpenChange, title, children, maxWidth = '440px', className = '' }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`tools-modal-content tools-modal-dialog${className ? ` ${className}` : ''}`}
        style={{ maxWidth }}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="tools-modal-header">
          <DialogTitle className="tools-modal-title">{title}</DialogTitle>
        </DialogHeader>
        <div className="tools-modal-body">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
