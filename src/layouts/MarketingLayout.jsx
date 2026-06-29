import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SiteHeader from '@/components/layout/SiteHeader';
import AppFooter from '@/components/layout/AppFooter';
import { applyThemeFromStorage } from '@/lib/theme';

const LOGO_ROUTES = new Set(['/feedback']);

export default function MarketingLayout() {
  const location = useLocation();

  useEffect(() => {
    applyThemeFromStorage();
  }, []);

  return (
    <div className="site-layout">
      <SiteHeader showLogo={LOGO_ROUTES.has(location.pathname)} />
      <div className="site-layout-body">
        <Outlet />
      </div>
      <AppFooter />
    </div>
  );
}
