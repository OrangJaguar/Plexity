import { Navigate, Route, Routes } from 'react-router-dom';
import PdfEditor from '@/components/tools/pdftools/PdfEditor';
import { useScopedToolRoutes } from '@/hooks/useScopedToolRoutes';

export default function PdfToolsContent() {
  const { pdfRoute } = useScopedToolRoutes();

  return (
    <div className="pdf-tools-shell">
      <Routes>
        <Route index element={<PdfEditor />} />
        <Route path="*" element={<Navigate to={pdfRoute()} replace />} />
      </Routes>
    </div>
  );
}
