import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import SiteHeader from '@/components/layout/SiteHeader';
import AppFooter from '@/components/layout/AppFooter';
import { applyThemeFromStorage } from '@/lib/theme';

export default function MarketingLayout() {
  useEffect(() => {
    applyThemeFromStorage();
  }, []);

  return (
    <div className="site-layout">
      <SiteHeader />
      <div className="site-layout-body">
        <Outlet />
      </div>
      <AppFooter />
    </div>
  );
}
