import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../admin/Sidebar';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen" style={{ background: '#F4EFE6' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-border">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-cream"
            aria-label="Open menu"
          >
            <span className="block w-5 h-0.5 bg-forest mb-1" />
            <span className="block w-5 h-0.5 bg-forest mb-1" />
            <span className="block w-5 h-0.5 bg-forest" />
          </button>
          <span className="font-display text-forest text-lg">Konkuwan Admin</span>
        </div>

        <main className="flex-1 p-6 md:p-8 lg:p-10 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/* initial code
import { Outlet } from 'react-router-dom';
import Sidebar from '../admin/Sidebar';

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-cream">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10 lg:ml-64">
        <Outlet />
      </main>
    </div>
  );
}*/