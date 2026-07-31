import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import logo from '../../assets/konkuwan_logo_white.svg';

// labelKey resolves through i18n so the menu follows the selected language.
const menuItems = [
  { to: '/admin', labelKey: 'nav.dashboard',   icon: '📊', end: true  },
  { to: '/admin/products',  labelKey: 'nav.products',  icon: '🌿' },
  { to: '/admin/orders',    labelKey: 'nav.orders',    icon: '📦' },
  { to: '/admin/customers', labelKey: 'nav.customers', icon: '👥' },
  { to: '/admin/inquiries', labelKey: 'nav.inquiries', icon: '📬' },
  { to: '/admin/challans',  labelKey: 'nav.challans',  icon: '📥' },
  { to: '/admin/finance',   labelKey: 'nav.finance',   icon: '💰' },
  { to: '/admin/farm',      labelKey: 'nav.farm',      icon: '🚜' },
  { to: '/admin/users',     labelKey: 'nav.users',     icon: '👤', roles: ['super_admin'] },
  { to: '/admin/audit-logs',labelKey: 'nav.auditLogs', icon: '📜' },
  { to: '/admin/settings',  labelKey: 'nav.settings',  icon: '⚙️', roles: ['super_admin'] },
];

// Tooltip shown on hover when the sidebar is collapsed (icons-only mode).
function Tip({ label, show }) {
  if (!show) return null;
  return (
    <span
      className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium
                 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg"
      style={{ background: '#0F1A13', color: '#EAF0EC' }}
      role="tooltip"
    >
      {label}
    </span>
  );
}
 
export default function Sidebar({ open, onClose, collapsed = false, onToggleCollapse }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const userRole = user?.profile?.role;

  const visible = menuItems.filter(
    item => !item.roles || item.roles.includes(userRole)
  );

  const initials = (user?.profile?.name || user?.email || 'A')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  // Collapsed only applies on large screens; the mobile drawer is always full width.
  const collapsedCls = collapsed ? 'lg:w-[72px]' : 'lg:w-64';
 
  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-50 w-64 ${collapsedCls} flex flex-col
        transition-all duration-300
        lg:translate-x-0
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}
      style={{ background: '#162F22', color: '#cfdfd4' }}
    >
      {/* Logo + collapse toggle */}
      <div
        className={`border-b flex items-center ${collapsed ? 'lg:justify-center lg:px-2' : 'justify-between'} px-6 pt-7 pb-6`}
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <div className={collapsed ? 'lg:hidden' : ''}>
          <img src={logo} alt="Konkuwan Herbs" className="h-8 opacity-90" />
          <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {t('nav.portal')}
          </p>
        </div>
        {/* Collapse toggle — desktop only */}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
          title={collapsed ? t('nav.expand') : t('nav.collapse')}
          className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition flex-shrink-0"
        >
          {collapsed ? '»' : '«'}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto overflow-x-visible">
        {visible.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onClose}
            title={t(item.labelKey)}
            className={({ isActive }) => `
              group relative flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium
              transition-all duration-150
              ${collapsed ? 'px-3 lg:justify-center' : 'px-3'}
              ${isActive
                ? 'bg-white/12 text-white'
                : 'text-white/70 hover:bg-white/7 hover:text-white'
              }
            `}
          >
            <span className="text-base w-5 text-center flex-shrink-0">{item.icon}</span>
            <span className={collapsed ? 'lg:hidden' : ''}>{t(item.labelKey)}</span>
            <Tip label={t(item.labelKey)} show={collapsed} />
          </NavLink>
        ))}
      </nav>

      {/* User + logout */}
      <div className={`py-4 border-t ${collapsed ? 'px-2' : 'px-4'}`} style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className={`flex items-center gap-3 mb-3 ${collapsed ? 'lg:justify-center' : ''}`}>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: '#dce5d3', color: '#1c2e1f' }}
            title={user?.profile?.name || user?.email}
          >
            {initials}
          </div>
          <div className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
            <p className="text-sm text-white/90 truncate font-medium">
              {user?.profile?.name || user?.email?.split('@')[0]}
            </p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {t(`users.roles.${userRole || 'viewer'}`, (userRole || 'viewer').replace(/_/g, ' '))}
            </p>
          </div>
        </div>
        <NavLink
          to="/admin/account"
          onClick={onClose}
          title={t('nav.myAccount')}
          className={`group relative w-full flex items-center gap-2 py-2 rounded-xl text-sm transition-all mb-1 ${collapsed ? 'px-3 lg:justify-center' : 'px-3'}`}
          style={{ color: 'rgba(255,255,255,0.6)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.95)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
        >
          <span className="w-5 text-center flex-shrink-0">⚙</span>
          <span className={collapsed ? 'lg:hidden' : ''}>{t('nav.myAccount')}</span>
          <Tip label={t('nav.myAccount')} show={collapsed} />
        </NavLink>
        <button
          onClick={logout}
          title={t('nav.logout')}
          className={`group relative w-full flex items-center gap-2 py-2 rounded-xl text-sm transition-all ${collapsed ? 'px-3 lg:justify-center' : 'px-3'}`}
          style={{ color: 'rgba(255,255,255,0.5)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.9)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
        >
          <span className="w-5 text-center flex-shrink-0">→</span>
          <span className={collapsed ? 'lg:hidden' : ''}>{t('nav.logout')}</span>
          <Tip label={t('nav.logout')} show={collapsed} />
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