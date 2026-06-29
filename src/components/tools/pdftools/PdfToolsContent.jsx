import { Navigate, Route, Routes } from 'react-router-dom';
import PdfEditor from '@/components/tools/pdftools/PdfEditor';

export default function PdfToolsContent() {
  return (
    <div className="pdf-tools-shell">
      <Routes>
        <Route index element={<PdfEditor />} />
        <Route path="*" element={<Navigate to="/tools/pdf" replace />} />
      </Routes>
    </div>
  );
}
