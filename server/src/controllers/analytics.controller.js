const supabase = require('../config/supabaseAdmin');
const AppError = require('../utils/AppError');

const monthStart = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const ymd = (d) => d.toISOString().slice(0, 10);
const pct = (cur, prev) => (prev > 0 ? Number((((cur - prev) / prev) * 100).toFixed(1)) : null);

exports.getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();
    const somThis = monthStart(now);
    const somPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const eomPrev = new Date(now.getFullYear(), now.getMonth(), 0);
    const twelveAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    // Pull the slices we need (small dataset; aggregate in JS)
    const [{ data: deliveredYear }, { data: ordersThisMonth }, { data: ordersPrevMonth }, { count: totalCustomers }, { count: custBeforeThis }] =
      await Promise.all([
        supabase.from('orders').select('total_amount, order_date, status').eq('status', 'delivered').gte('order_date', ymd(twelveAgo)),
        supabase.from('orders').select('id, status').neq('status', 'cancelled').gte('order_date', ymd(somThis)),
        supabase.from('orders').select('id, total_amount, status').gte('order_date', ymd(somPrev)).lte('order_date', ymd(eomPrev)),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase.from('customers').select('id', { count: 'exact', head: true }).lt('created_at', somThis.toISOString()),
      ]);

    const revMTD = (deliveredYear || []).filter((o) => o.order_date >= ymd(somThis)).reduce((s, o) => s + Number(o.total_amount || 0), 0);
    const ordersMTD = (ordersThisMonth || []).length;

    const revPrev = (ordersPrevMonth || []).filter((o) => o.status === 'delivered').reduce((s, o) => s + Number(o.total_amount || 0), 0);
    const ordersPrev = (ordersPrevMonth || []).filter((o) => o.status !== 'cancelled').length;

    // Revenue chart: monthly buckets over last 12 months
    const buckets = {};
    (deliveredYear || []).forEach((o) => {
      const key = o.order_date.slice(0, 7); // YYYY-MM
      buckets[key] = (buckets[key] || 0) + Number(o.total_amount || 0);
    });
    const revenue_chart = Object.entries(buckets).sort().map(([month, revenue]) => ({ month: `${month}-01`, revenue }));

    // Recent 5 orders
    const { data: recent } = await supabase
      .from('orders')
      .select('id, status, total_amount, order_date, customer:customers(company_name)')
      .order('created_at', { ascending: false })
      .limit(5);
    const recent_orders = (recent || []).map((o) => ({ ...o, Customer: o.customer }));

    // Top products this month (join items -> orders filtered to delivered/this month)
    const { data: items } = await supabase
      .from('order_items')
      .select('quantity, product:products(name, unit), order:orders!inner(status, order_date)')
      .eq('order.status', 'delivered')
      .gte('order.order_date', ymd(somThis));
    const prodMap = {};
    (items || []).forEach((it) => {
      const name = it.product?.name || '—';
      if (!prodMap[name]) prodMap[name] = { product_name: name, total_quantity: 0, Product: it.product };
      prodMap[name].total_quantity += Number(it.quantity || 0);
    });
    const top_products = Object.values(prodMap).sort((a, b) => b.total_quantity - a.total_quantity).slice(0, 5);

    // ── Operational overview: products, inquiries, farmers, farm finance ──
    const startOfMonth = ymd(somThis);
    const [
      { count: productsTotal }, { count: productsActive },
      { count: inquiriesNew }, { count: inquiriesTotal },
      { data: farmerRows },
      { data: monthExp },
      { count: leadsPotential },
      { data: allOrderStatuses },
      { data: cropSetups },
      { data: recentAudit },
    ] = await Promise.all([
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('contact_submissions').select('id', { count: 'exact', head: true }).eq('status', 'new'),
      supabase.from('contact_submissions').select('id', { count: 'exact', head: true }),
      supabase.from('farmers').select('id, area_decimal, farmer_type, farmer_visits(date)'),
      supabase.from('expenses').select('type, amount').gte('date', startOfMonth),
      supabase.from('customers').select('id', { count: 'exact', head: true }).eq('lead_status', 'potential_lead'),
      supabase.from('orders').select('status'),
      supabase.from('crop_setups').select('crop_id, area_acres, planting_date'),
      supabase.from('audit_logs').select('action, entity_type, created_at, user:profiles(name)').order('created_at', { ascending: false }).limit(8),
    ]);
 
    const farmersTotal = (farmerRows || []).length;
    const farmArea = (farmerRows || []).reduce((s, f) => s + Number(f.area_decimal || 0), 0);
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
    const farmersNeedingVisit = (farmerRows || []).filter(f => {
      const visits = f.farmer_visits || [];
      if (!visits.length) return true;
      return !visits.some(v => v.date >= twoWeeksAgo);
    }).length;
 
    const expensesMTD = (monthExp || []).filter(e => e.type === 'expense').reduce((s, e) => s + Number(e.amount || 0), 0);
    const loggedRevenueMTD = (monthExp || []).filter(e => e.type === 'revenue').reduce((s, e) => s + Number(e.amount || 0), 0);
 
    const statusDist = {};
    (allOrderStatuses || []).forEach(o => { statusDist[o.status] = (statusDist[o.status] || 0) + 1; });
 
    const cultivatedAcres = (cropSetups || []).reduce((s, c) => s + Number(c.area_acres || 0), 0);

    res.json({
      success: true,
      data: {
        kpi: {
          revenue_mtd: revMTD,
          orders_mtd: ordersMTD,
          total_customers: totalCustomers || 0,
          revenue_trend: pct(revMTD, revPrev),
          orders_trend: pct(ordersMTD, ordersPrev),
          customers_trend: pct(totalCustomers || 0, custBeforeThis || 0),
        },
        overview: {
          products_total: productsTotal || 0,
          products_active: productsActive || 0,
          inquiries_new: inquiriesNew || 0,
          inquiries_total: inquiriesTotal || 0,
          potential_leads: leadsPotential || 0,
          farmers_total: farmersTotal,
          farmers_needing_visit: farmersNeedingVisit,
          farm_area_decimal: farmArea,
          cultivated_acres: cultivatedAcres,
          crops_tracked: (cropSetups || []).length,
          expenses_mtd: expensesMTD,
          farm_revenue_logged_mtd: loggedRevenueMTD,
          draft_orders: statusDist.draft || 0,
        },
        order_status_distribution: Object.entries(statusDist).map(([status, count]) => ({ status, count })),
        recent_activity: recentAudit || [],
        recent_orders,
        top_products,
        revenue_chart,
      },
    });
  } catch (err) { next(err); }
};

// Revenue report (period series + summary)
exports.getRevenueReport = async (req, res, next) => {
  try {
    const { from, to, status = 'delivered', period = 'month' } = req.query;
    let q = supabase.from('orders').select('total_amount, order_date').eq('status', status);
    if (from) q = q.gte('order_date', from);
    if (to) q = q.lte('order_date', to);
    const { data, error } = await q;
    if (error) return next(new AppError(error.message, 500));

    const sliceLen = period === 'year' ? 4 : period === 'day' ? 10 : 7;
    const buckets = {};
    (data || []).forEach((o) => {
      const k = o.order_date.slice(0, sliceLen);
      if (!buckets[k]) buckets[k] = { period: k, revenue: 0, order_count: 0 };
      buckets[k].revenue += Number(o.total_amount || 0);
      buckets[k].order_count += 1;
    });
    const series = Object.values(buckets).sort((a, b) => a.period.localeCompare(b.period));
    const totalRevenue = (data || []).reduce((s, o) => s + Number(o.total_amount || 0), 0);
    const totalOrders = (data || []).length;

    res.json({
      success: true,
      data: {
        series,
        summary: {
          total_revenue: totalRevenue,
          total_orders: totalOrders,
          average_order_value: totalOrders ? totalRevenue / totalOrders : 0,
        },
      },
    });
  } catch (err) { next(err); }
};

// Sales report (status distribution)
exports.getSalesReport = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    let q = supabase.from('orders').select('status, total_amount, order_date');
    if (from) q = q.gte('order_date', from);
    if (to) q = q.lte('order_date', to);
    const { data, error } = await q;
    if (error) return next(new AppError(error.message, 500));

    const nonCancelled = (data || []).filter((o) => o.status !== 'cancelled');
    const totalRevenue = (data || []).filter((o) => o.status === 'delivered').reduce((s, o) => s + Number(o.total_amount || 0), 0);
    const dist = {};
    (data || []).forEach((o) => { dist[o.status] = (dist[o.status] || 0) + 1; });

    res.json({
      success: true,
      data: {
        total_orders: nonCancelled.length,
        total_revenue: totalRevenue,
        average_order_value: nonCancelled.length ? totalRevenue / nonCancelled.length : 0,
        status_distribution: Object.entries(dist).map(([status, count]) => ({ status, count })),
      },
    });
  } catch (err) { next(err); }
};

// Customer insights (orders + spend per customer)
exports.getCustomerInsights = async (req, res, next) => {
  try {
    const { data: customers, error } = await supabase.from('customers').select('id, company_name');
    if (error) return next(new AppError(error.message, 500));
    const { data: orders } = await supabase.from('orders').select('customer_id, total_amount, order_date, status').neq('status', 'cancelled');

    const byCust = {};
    (orders || []).forEach((o) => {
      if (!byCust[o.customer_id]) byCust[o.customer_id] = { order_count: 0, total_spent: 0, last_order_date: null };
      const b = byCust[o.customer_id];
      b.order_count += 1;
      b.total_spent += Number(o.total_amount || 0);
      if (!b.last_order_date || o.order_date > b.last_order_date) b.last_order_date = o.order_date;
    });

    const rows = (customers || []).map((c) => {
      const b = byCust[c.id] || { order_count: 0, total_spent: 0, last_order_date: null };
      return {
        ...c,
        order_count: b.order_count,
        total_spent: b.total_spent,
        last_order_date: b.last_order_date,
        average_order_value: b.order_count ? b.total_spent / b.order_count : 0,
      };
    }).sort((a, b) => b.total_spent - a.total_spent);

    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// Product performance
exports.getProductPerformance = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('order_items')
      .select('quantity, unit_price, line_total, product:products(id, name, slug, is_active), order:orders!inner(status)')
      .neq('order.status', 'cancelled');
    if (error) return next(new AppError(error.message, 500));

    const byProd = {};
    (data || []).forEach((it) => {
      const p = it.product;
      if (!p) return;
      if (!byProd[p.id]) byProd[p.id] = { Product: p, total_quantity_sold: 0, total_revenue: 0, times_ordered: 0 };
      const b = byProd[p.id];
      b.total_quantity_sold += Number(it.quantity || 0);
      b.total_revenue += Number(it.line_total || 0);
      b.times_ordered += 1;
    });
    const rows = Object.values(byProd).sort((a, b) => b.total_quantity_sold - a.total_quantity_sold);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// Inventory report
exports.getInventoryReport = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('inventory').select('product_id, quantity, updated_at:created_at, product:products(name, unit)');
    if (error) return next(new AppError(error.message, 500));
    const byProd = {};
    (data || []).forEach((row) => {
      if (!byProd[row.product_id]) byProd[row.product_id] = { product_id: row.product_id, Product: row.product, total_stock: 0 };
      byProd[row.product_id].total_stock += Number(row.quantity || 0);
    });
    res.json({ success: true, data: Object.values(byProd) });
  } catch (err) { next(err); }
};

// Order trends
exports.getOrderTrends = async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;
    const sliceLen = period === 'year' ? 4 : period === 'day' ? 10 : 7;
    const { data, error } = await supabase.from('orders').select('order_date, status').neq('status', 'cancelled');
    if (error) return next(new AppError(error.message, 500));
    const buckets = {};
    (data || []).forEach((o) => { const k = o.order_date.slice(0, sliceLen); buckets[k] = (buckets[k] || 0) + 1; });
    const order_counts = Object.entries(buckets).sort().map(([period, count]) => ({ period, count }));
    res.json({ success: true, data: { order_counts, avg_delivery_days: 0 } });
  } catch (err) { next(err); }
};

// Pricing history
exports.getPricingHistory = async (req, res, next) => {
  try {
    const { product_id } = req.query;
    let q = supabase.from('pricing_history').select('*, product:products(id, name, slug)').order('effective_date', { ascending: false });
    if (product_id) q = q.eq('product_id', product_id);
    const { data, error } = await q;
    if (error) return next(new AppError(error.message, 500));
    res.json({ success: true, data });
  } catch (err) { next(err); }
};