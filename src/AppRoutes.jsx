import { Routes, Route, Navigate } from 'react-router-dom';
import MarketingLayout from '@/layouts/MarketingLayout';
import ToolsAppShell from '@/layouts/ToolsAppShell';
import ToolsLandingPage from '@/pages/landing/ToolsLandingPage';
import SignInPage from '@/pages/auth/SignInPage';
import SignUpPage from '@/pages/auth/SignUpPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import TermsPage from '@/pages/legal/TermsPage';
import PrivacyPage from '@/pages/legal/PrivacyPage';
import NotFoundPage from '@/pages/NotFoundPage';
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

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<MarketingLayout />}>
        <Route path="/" element={<ToolsLandingPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
      </Route>

      <Route element={<ToolsAppShell />}>
        <Route path="/dashboard" element={<ToolsDashboardPage />} />
        <Route path="/tasks" element={<ToolsTasksPage />} />
        <Route path="/calendar" element={<ToolsCalendarPage />} />
        <Route path="/focus" element={<ToolsFocusPage />} />
        <Route path="/grades" element={<ToolsGradesPage />} />
        <Route path="/pdf/*" element={<ToolsPdfToolsPage />} />
        <Route path="/stocks/*" element={<ToolsStocksPage />} />
        <Route path="/typing" element={<ToolsTypingPage />} />
        <Route path="/college" element={<ToolsCollegePage />} />
        <Route path="/units" element={<ToolsUnitsPage />} />
        <Route path="/journal" element={<ToolsJournalPage />} />
        <Route path="/goals" element={<ToolsGoalsPage />} />
        <Route path="/profile" element={<ToolsProfileToolPage />} />
        <Route path="/lists" element={<ToolsListsPage />} />
        <Route path="/passwords" element={<ToolsPasswordsPage />} />
        <Route path="/calculator" element={<ToolsCalculatorPage />} />
        <Route path="/catalog" element={<ToolsCatalogPage />} />
        <Route path="/settings" element={<ToolsSettingsPage />} />

        {/* Legacy /tools/* redirects — keeps old links working */}
        <Route path="/tools" element={<Navigate to="/dashboard" replace />} />
        <Route path="/tools/dashboard" element={<Navigate to="/dashboard" replace />} />
        <Route path="/tools/tasks" element={<Navigate to="/tasks" replace />} />
        <Route path="/tools/calendar" element={<Navigate to="/calendar" replace />} />
        <Route path="/tools/focus" element={<Navigate to="/focus" replace />} />
        <Route path="/tools/grades" element={<Navigate to="/grades" replace />} />
        <Route path="/tools/pdf" element={<Navigate to="/pdf" replace />} />
        <Route path="/tools/pdftools" element={<Navigate to="/pdf" replace />} />
        <Route path="/tools/stocks" element={<Navigate to="/stocks" replace />} />
        <Route path="/tools/typing" element={<Navigate to="/typing" replace />} />
        <Route path="/tools/college" element={<Navigate to="/college" replace />} />
        <Route path="/tools/units" element={<Navigate to="/units" replace />} />
        <Route path="/tools/journal" element={<Navigate to="/journal" replace />} />
        <Route path="/tools/goals" element={<Navigate to="/goals" replace />} />
        <Route path="/tools/profile" element={<Navigate to="/profile" replace />} />
        <Route path="/tools/lists" element={<Navigate to="/lists" replace />} />
        <Route path="/tools/passwords" element={<Navigate to="/passwords" replace />} />
        <Route path="/tools/calculator" element={<Navigate to="/calculator" replace />} />
        <Route path="/tools/catalog" element={<Navigate to="/catalog" replace />} />
        <Route path="/tools/settings" element={<Navigate to="/settings" replace />} />
      </Route>

      <Route element={<MarketingLayout />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}