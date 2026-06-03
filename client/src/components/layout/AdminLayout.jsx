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
}