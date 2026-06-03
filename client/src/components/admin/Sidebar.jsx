import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const menuItems = [
  { to: '/admin', label: 'Dashboard', icon: '📊', roles: [] },
  { to: '/admin/products', label: 'Products', icon: '🌿', roles: ['super_admin', 'product_manager'] },
  { to: '/admin/orders', label: 'Orders', icon: '📦', roles: ['super_admin', 'order_manager'] },
  { to: '/admin/customers', label: 'Customers', icon: '👥', roles: ['super_admin', 'order_manager'] },
  { to: '/admin/farm', label: 'Farm Ops', icon: '🚜', roles: ['super_admin', 'farm_manager'] },
  { to: '/admin/users', label: 'Users', icon: '👤', roles: ['super_admin'] },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: '📜', roles: ['super_admin', 'order_manager', 'viewer'] },
  { to: '/admin/settings', label: 'Settings', icon: '⚙️', roles: ['super_admin'] },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const userRole = user?.profile?.role;

  const visibleItems = menuItems.filter(
    (item) => item.roles.length === 0 || item.roles.includes(userRole)
  );

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-forest text-white/80 flex flex-col">
      <div className="p-6 border-b border-white/10">
        <h1 className="font-display text-xl text-white">Konkuwan Admin</h1>
        <p className="text-xs text-white/50 mt-1">{user?.profile?.name || user?.email}</p>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/admin'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-sm text-sm transition ${
                isActive ? 'bg-white/10 text-white' : 'hover:bg-white/5'
              }`
            }
          >
            <span>{item.icon}</span> {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-white/10">
        <button onClick={logout} className="text-sm text-white/50 hover:text-white transition">
          Logout
        </button>
      </div>
    </aside>
  );
}