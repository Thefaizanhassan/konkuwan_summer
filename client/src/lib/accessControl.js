// One table describing which roles may open which admin screen.
//
// This MIRRORS the server's `authorize(...)` lists — it does not replace them.
// The server is the real gate; this exists so the UI stops advertising pages
// the API will refuse, and so a stakeholder cannot render the User Management
// screen by typing the URL.
//
// If you change a role list here, change the matching route file on the server.
// The pairs are listed next to each entry so the two can be checked by eye.
 
export const ROLES = [
  'super_admin',
  'product_manager',
  'order_manager',
  'farm_manager',
  'viewer',
  'stakeholder',
];
 
// Everyone who is staff, i.e. every role except the external stakeholder.
const STAFF = ['super_admin', 'product_manager', 'order_manager', 'farm_manager', 'viewer'];
 
export const ROUTE_ACCESS = {
  // analytics.admin.routes.js — /dashboard
  dashboard: ['super_admin', 'order_manager', 'viewer', 'stakeholder'],
  // product.admin.routes.js
  products: ['super_admin', 'product_manager'],
  // order.admin.routes.js
  orders: ['super_admin', 'order_manager'],
  // customer.admin.routes.js
  customers: ['super_admin', 'order_manager'],
  // contact.admin.routes.js
  inquiries: ['super_admin', 'order_manager'],
  // challan.admin.routes.js
  challans: ['super_admin', 'farm_manager', 'order_manager'],
  // warehouse.admin.routes.js — list is readable by all three
  warehouses: ['super_admin', 'farm_manager', 'order_manager'],
  // farm.admin.routes.js (the Finance screen reads /admin/farm/*)
  finance: ['super_admin', 'farm_manager'],
  farm: ['super_admin', 'farm_manager'],
  // user.admin.routes.js
  users: ['super_admin'],
  // audit.admin.routes.js
  auditLogs: ['super_admin', 'order_manager', 'viewer'],
  // settings.admin.routes.js
  settings: ['super_admin'],
  // me.routes.js — any signed-in user manages their own account
  account: [...STAFF, 'stakeholder'],
};
 
export function canAccess(routeKey, role) {
  const allowed = ROUTE_ACCESS[routeKey];
  return Array.isArray(allowed) && allowed.includes(role);
}
 
/**
 * The screen to send someone to when they land somewhere they cannot open.
 * Everyone with an account can see the dashboard, so it is always a valid
 * destination — but check anyway rather than assuming.
 */
export function landingRouteFor(role) {
  return canAccess('dashboard', role) ? '/admin' : '/admin/account';
}