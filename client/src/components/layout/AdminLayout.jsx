import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../admin/Sidebar';

const COLLAPSE_KEY = 'kk_sidebar_collapsed';

export default function AdminLayout() {
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer
  // Collapsed (icons-only) state persists across refresh and login
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
  });
 
  useEffect(() => {
    try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0'); } catch { /* ignore */ }
  }, [collapsed]);

  return (
    <div className="flex min-h-screen" style={{ background: '#F4EFE6' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(c => !c)}
      />

      <div className={`flex-1 flex flex-col min-w-0 transition-[margin] duration-300 ${collapsed ? 'lg:ml-[72px]' : 'lg:ml-64'}`}>
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-border">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-cream"
            aria-label={t('nav.openMenu')}
          >
            <span className="block w-5 h-0.5 bg-forest mb-1" />
            <span className="block w-5 h-0.5 bg-forest mb-1" />
            <span className="block w-5 h-0.5 bg-forest" />
          </button>
          <span className="font-display text-forest text-lg">{t('nav.adminTitle')}</span>
        </div>

        <main className="flex-1 p-6 md:p-8 lg:p-10 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}