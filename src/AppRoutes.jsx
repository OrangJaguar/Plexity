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
import LegacyToolsRedirect from '@/components/routing/LegacyToolsRedirect';
import RequireAdmin from '@/components/routing/RequireAdmin';
import RequireAuth from '@/components/routing/RequireAuth';
import AdminLayout from '@/layouts/AdminLayout';
import FeedbackPage from '@/pages/feedback/FeedbackPage';
import AdminFeedbackPage from '@/pages/admin/AdminFeedbackPage';
import ToolSurfaceProvider from '@/providers/ToolSurfaceProvider';
import { buildAdminHomeRedirect, buildToolRoutes } from '@/components/routing/buildToolRoutes';
import { ADMIN_BASE_PATH } from '@/lib/tools/tool-surface';

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

      {/* Admin management (Feedback) — dedicated admin chrome */}
      <Route element={<RequireAdmin />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin/feedback" element={<AdminFeedbackPage />} />
        </Route>
      </Route>

      {/* Admin mirrored tools — same ToolsAppShell + same page modules */}
      <Route element={<RequireAdmin />}>
        <Route element={<ToolSurfaceProvider surface="admin" />}>
          <Route element={<ToolsAppShell />}>
            {buildAdminHomeRedirect({ basePath: ADMIN_BASE_PATH, to: '/admin/dashboard' })}
            {buildToolRoutes({ basePath: ADMIN_BASE_PATH })}
          </Route>
        </Route>
      </Route>

      {/* Public tools */}
      <Route element={<ToolSurfaceProvider surface="public" />}>
        <Route element={<ToolsAppShell />}>
          <Route element={<RequireAuth />}>
            {buildToolRoutes({ basePath: '' })}
            <Route path="/tools" element={<Navigate to="/dashboard" replace />} />
            <Route path="/tools/*" element={<LegacyToolsRedirect />} />
          </Route>
        </Route>
      </Route>

      <Route element={<MarketingLayout />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
