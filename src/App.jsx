import { Routes, Route, Navigate } from 'react-router-dom';
import MarketingLayout from '@/layouts/MarketingLayout';
import ToolsAppShell from '@/layouts/ToolsAppShell';
import ToolsLandingPage from '@/pages/landing/ToolsLandingPage';
import SignInPage from '@/pages/auth/SignInPage';
import SignUpPage from '@/pages/auth/SignUpPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import NotFoundPage from '@/pages/NotFoundPage';
import StudyRedirectPage from '@/pages/StudyRedirectPage';
import ToolsDashboardPage from '@/pages/tools/ToolsDashboardPage';
import ToolsTasksPage from '@/pages/tools/ToolsTasksPage';
import ToolsCalendarPage from '@/pages/tools/ToolsCalendarPage';
import ToolsFocusPage from '@/pages/tools/ToolsFocusPage';
import ToolsGradesPage from '@/pages/tools/ToolsGradesPage';
import ToolsPdfToolsPage from '@/pages/tools/ToolsPdfToolsPage';
import ToolsStocksPage from '@/pages/tools/ToolsStocksPage';
import ToolsTypingPage from '@/pages/tools/ToolsTypingPage';
import ToolsCollegePage from '@/pages/tools/ToolsCollegePage';
import ToolsUnitsPage from '@/pages/tools/ToolsUnitsPage';
import ToolsJournalPage from '@/pages/tools/ToolsJournalPage';
import ToolsGoalsPage from '@/pages/tools/ToolsGoalsPage';
import ToolsProfileToolPage from '@/pages/tools/ToolsProfileToolPage';
import ToolsListsPage from '@/pages/tools/ToolsListsPage';
import ToolsPasswordsPage from '@/pages/tools/ToolsPasswordsPage';
import ToolsCalculatorPage from '@/pages/tools/ToolsCalculatorPage';
import ToolsCatalogPage from '@/pages/tools/ToolsCatalogPage';
import ToolsSettingsPage from '@/pages/tools/ToolsSettingsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<MarketingLayout />}>
        <Route path="/" element={<ToolsLandingPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      <Route element={<ToolsAppShell />}>
        <Route path="/tools" element={<Navigate to="/tools/dashboard" replace />} />
        <Route path="/tools/dashboard" element={<ToolsDashboardPage />} />
        <Route path="/tools/tasks" element={<ToolsTasksPage />} />
        <Route path="/tools/calendar" element={<ToolsCalendarPage />} />
        <Route path="/tools/focus" element={<ToolsFocusPage />} />
        <Route path="/tools/grades" element={<ToolsGradesPage />} />
        <Route path="/tools/pdf/*" element={<ToolsPdfToolsPage />} />
        <Route path="/tools/pdftools/*" element={<Navigate to="/tools/pdf" replace />} />
        <Route path="/tools/stocks/*" element={<ToolsStocksPage />} />
        <Route path="/tools/typing" element={<ToolsTypingPage />} />
        <Route path="/tools/college" element={<ToolsCollegePage />} />
        <Route path="/tools/units" element={<ToolsUnitsPage />} />
        <Route path="/tools/journal" element={<ToolsJournalPage />} />
        <Route path="/tools/goals" element={<ToolsGoalsPage />} />
        <Route path="/tools/profile" element={<ToolsProfileToolPage />} />
        <Route path="/tools/lists" element={<ToolsListsPage />} />
        <Route path="/tools/passwords" element={<ToolsPasswordsPage />} />
        <Route path="/tools/calculator" element={<ToolsCalculatorPage />} />
        <Route path="/tools/catalog" element={<ToolsCatalogPage />} />
        <Route path="/tools/settings" element={<ToolsSettingsPage />} />
        <Route path="/study/:sessionId" element={<StudyRedirectPage />} />
      </Route>

      <Route element={<MarketingLayout />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
