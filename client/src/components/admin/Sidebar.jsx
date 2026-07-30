import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import logo from '../../assets/konkuwan_logo_white.svg';

const menuItems = [
  { to: '/admin', label: 'Dashboard',   icon: '📊', end: true  },
  { to: '/admin/products',  label: 'Products',  icon: '🌿' },
  { to: '/admin/orders',    label: 'Orders',    icon: '📦' },
  { to: '/admin/customers', label: 'Customers', icon: '👥' },
  { to: '/admin/inquiries', label: 'Inquiries', icon: '📬' },
  { to: '/admin/challans',  label: 'Delivery Challan', icon: '📥' },
  { to: '/admin/finance',   label: 'Finance',   icon: '💰' },
  { to: '/admin/farm',      label: 'Farm Ops',  icon: '🚜' },
  { to: '/admin/users',     label: 'Users',     icon: '👤', roles: ['super_admin'] },
  { to: '/admin/audit-logs',label: 'Audit Logs',icon: '📜' },
  { to: '/admin/settings',  label: 'Settings',  icon: '⚙️', roles: ['super_admin'] },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const userRole = user?.profile?.role;

  const visible = menuItems.filter(
    item => !item.roles || item.roles.includes(userRole)
  );

  const initials = (user?.profile?.name || user?.email || 'A')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-50 w-64 flex flex-col
        transition-transform duration-300
        lg:translate-x-0
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}
      style={{ background: '#162F22', color: '#cfdfd4' }}
    >
      {/* Logo */}
      <div className="px-6 pt-7 pb-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <img src={logo} alt="Konkuwan Herbs" className="h-8 opacity-90" />
        </div>
        <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
          B2B Admin Portal
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visible.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onClose}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
              transition-all duration-150
              ${isActive
                ? 'bg-white/12 text-white'
                : 'text-white/70 hover:bg-white/7 hover:text-white'
              }
            `}
          >
            <span className="text-base w-5 text-center">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User + logout */}
      <div className="px-4 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: '#dce5d3', color: '#1c2e1f' }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-white/90 truncate font-medium">
              {user?.profile?.name || user?.email?.split('@')[0]}
            </p>
            <p className="text-xs capitalize" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {userRole?.replace(/_/g, ' ') || 'viewer'}
            </p>
          </div>
        </div>
        <NavLink
          to="/admin/account"
          onClick={onClose}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all mb-1"
          style={{ color: 'rgba(255,255,255,0.6)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.95)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
        >
          <span>⚙</span> My Account
        </NavLink>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all"
          style={{ color: 'rgba(255,255,255,0.5)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.9)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
        >
          <span>→</span> Logout
        </button>
      </div>
    </aside>
  );
}

/* initial code
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
*/