// The single registry of dashboard widgets a stakeholder can be granted.
//
// A stakeholder is an investor, advisor or board member: they get business
// visibility without operational access. Anything that would expose cash
// position, individual expenses, staff activity or a farmer's personal details
// is deliberately absent from this list and cannot be granted at all.
//
// `paths` are the keys inside the dashboard payload that the widget needs.
// Filtering happens on the SERVER (see filterDashboardForWidgets): hiding a
// card in the UI while the API still returns the numbers is not a permission,
// because anyone can open the network tab.
 
const DASHBOARD_WIDGETS = [
  // ── Revenue ──
  { key: 'revenue_period', group: 'revenue', paths: ['kpi.revenue_mtd', 'kpi.revenue_trend'] },
  { key: 'revenue_trends', group: 'revenue', paths: ['revenue_chart', 'revenue_daily'] },
  { key: 'average_order_value', group: 'revenue', paths: ['kpi.average_order_value'] },
 
  // ── Orders ──
  { key: 'orders_period', group: 'orders', paths: ['kpi.orders_mtd', 'kpi.orders_trend'] },
  { key: 'order_status_mix', group: 'orders', paths: ['order_status_distribution'] },
  { key: 'fulfilment_rate', group: 'orders', paths: ['kpi.fulfilment_rate'] },
 
  // ── Customers ──
  { key: 'customers_total', group: 'customers', paths: ['kpi.total_customers', 'kpi.customers_trend'] },
  { key: 'repeat_customer_rate', group: 'customers', paths: ['kpi.repeat_customer_rate'] },
 
  // ── Products ──
  { key: 'products_summary', group: 'products', paths: ['overview.products_total', 'overview.products_active'] },
  { key: 'top_products', group: 'products', paths: ['top_products'] },
 
  // ── Farm ──
  { key: 'farmers_total', group: 'farm', paths: ['overview.farmers_total'] },
  { key: 'farmer_distribution_by_crop', group: 'farm', paths: ['farmer_distribution'] },
  { key: 'cultivated_area', group: 'farm', paths: ['overview.cultivated_acres', 'overview.crops_tracked'] },
];
 
// Future Work — deliberately NOT grantable yet.
//
// A widget in the list above is a promise: tick it and the stakeholder sees
// that metric. These four have no data behind them in the dashboard payload,
// so offering them would save a permission that renders nothing:
//
//   customer_analytics   per-customer purchase breakdown. Exists as its own
//                        endpoint (/admin/analytics/customers) and is drawn on
//                        the Customers page, which no stakeholder can reach.
//                        Needs the series folded into the dashboard payload.
//   farmer_coverage      coverage vs target. Lives in Farm Ops and reads
//                        farmer_targets, which the dashboard does not query.
//   warehouse_summary    needs a stock balance. Nothing computes one — challans
//                        record movement, not holdings. See TASKS.md §0.
//   inventory_movement   same gap: movement in/out per warehouse per period.
//
// Add the data to the payload first, then add the key here — not the reverse.
 
const WIDGET_KEYS = DASHBOARD_WIDGETS.map((w) => w.key);
 
// Always sent, whatever the grants: without these the page cannot render a
// heading or a period switcher. They carry no business figures.
const ALWAYS_ALLOWED = ['period', 'financial_years'];
 
function getByPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
 
function setByPath(obj, path, value) {
  const parts = path.split('.');
  const last = parts.pop();
  const target = parts.reduce((o, k) => (o[k] = o[k] || {}), obj);
  target[last] = value;
}
 
/**
 * Reduce a full dashboard payload to only what these widget keys allow.
 * Unknown keys are ignored rather than trusted.
 */
function filterDashboardForWidgets(payload, widgetKeys) {
  const granted = new Set(Array.isArray(widgetKeys) ? widgetKeys : []);
  const out = {};
 
  ALWAYS_ALLOWED.forEach((k) => {
    if (payload[k] !== undefined) out[k] = payload[k];
  });
 
  DASHBOARD_WIDGETS.filter((w) => granted.has(w.key)).forEach((w) => {
    w.paths.forEach((path) => {
      const value = getByPath(payload, path);
      if (value !== undefined) setByPath(out, path, value);
    });
  });
 
  // Tells the client which cards to render; it never has to guess.
  out.granted_widgets = DASHBOARD_WIDGETS.filter((w) => granted.has(w.key)).map((w) => w.key);
  return out;
}
 
module.exports = { DASHBOARD_WIDGETS, WIDGET_KEYS, filterDashboardForWidgets, ALWAYS_ALLOWED };