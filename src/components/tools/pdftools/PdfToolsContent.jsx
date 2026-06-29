import { Navigate, Route, Routes } from 'react-router-dom';
import PdfEditor from '@/components/tools/pdftools/PdfEditor';
import { PDF_ROUTE } from '@/lib/tools/tool-routes';

export default function PdfToolsContent() {
  return (
    <div className="pdf-tools-shell">
      <Routes>
        <Route index element={<PdfEditor />} />
        <Route path="*" element={<Navigate to={PDF_ROUTE} replace />} />
      </Routes>
    </div>
  );
}
