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
import LegacyToolsRedirect from '@/components/routing/LegacyToolsRedirect';
import RequireAdmin from '@/components/routing/RequireAdmin';
import AdminLayout from '@/layouts/AdminLayout';
import FeedbackPage from '@/pages/feedback/FeedbackPage';
import AdminFeedbackPage from '@/pages/admin/AdminFeedbackPage';

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
        <Route path="/feedback" element={<FeedbackPage />} />
      </Route>

      <Route element={<RequireAdmin />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<Navigate to="/admin/feedback" replace />} />
          <Route path="/admin/feedback" element={<AdminFeedbackPage />} />
        </Route>
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
        <Route path="/tools/*" element={<LegacyToolsRedirect />} />
      </Route>

      <Route element={<MarketingLayout />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}