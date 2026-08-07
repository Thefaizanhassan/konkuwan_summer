const supabase = require('../config/supabaseAdmin');
const AppError = require('../utils/AppError');
const { BILLABLE_ORDER_STATUSES } = require('../utils/orderStatus');
const { resolvePeriod, selectableFinancialYears, fyMonthBounds } = require('../utils/financialYear');
const { filterDashboardForWidgets } = require('../utils/dashboardWidgets');

const monthStart = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const ymd = (d) => d.toISOString().slice(0, 10);
const pct = (cur, prev) => (prev > 0 ? Number((((cur - prev) / prev) * 100).toFixed(1)) : null);

exports.getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();
    // Every figure below is scoped to one resolved period — annual, quarterly
    // or monthly on the Indian financial year — and compared against the
    // equivalent previous period rather than always "last month".
    const range = resolvePeriod(req.query, now);

    const [{ data: billableRange }, { data: ordersInRange }, { data: ordersPrevRange }, { count: totalCustomers }, { count: custBeforeRange }] =
      await Promise.all([
        // Revenue counts confirmed/dispatched/delivered — matching Finance.
        // Filtering to 'delivered' alone reported 0 for every order that had
        // been invoiced but not yet marked delivered.
        supabase.from('orders').select('total_amount, order_date, status, customer_id').in('status', BILLABLE_ORDER_STATUSES)
          .gte('order_date', range.start).lte('order_date', range.end),
        // Every status, not just the non-cancelled ones: the pipeline chart needs
        // cancellations too, and deriving both from one result keeps the KPI and
        // the chart describing the same set of orders.
        supabase.from('orders').select('id, status')
          .gte('order_date', range.start).lte('order_date', range.end),
        supabase.from('orders').select('id, total_amount, status')
          .gte('order_date', range.previous.start).lte('order_date', range.previous.end),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase.from('customers').select('id', { count: 'exact', head: true }).lt('created_at', `${range.start}T00:00:00Z`),
      ]);

    const revMTD = (billableRange || []).reduce((s, o) => s + Number(o.total_amount || 0), 0);
    const ordersMTD = (ordersInRange || []).filter((o) => o.status !== 'cancelled').length;

    const revPrev = (ordersPrevRange || []).filter((o) => BILLABLE_ORDER_STATUSES.includes(o.status)).reduce((s, o) => s + Number(o.total_amount || 0), 0);
    const ordersPrev = (ordersPrevRange || []).filter((o) => o.status !== 'cancelled').length;

    // Chart granularity follows the period: a year or quarter is plotted month
    // by month, a single month day by day. Both series come from the one
    // `billableRange` result, so switching costs no extra request and the two
    // can never disagree.
    const buckets = {};
    const dayBuckets = {};
    (billableRange || []).forEach((o) => {
      const month = o.order_date.slice(0, 7);
      const day = o.order_date.slice(0, 10);
      const amount = Number(o.total_amount || 0);
      buckets[month] = (buckets[month] || 0) + amount;
      dayBuckets[day] = (dayBuckets[day] || 0) + amount;
    });
    // A month with no sales must still appear on an annual chart, otherwise the
    // line silently skips it and the shape lies.
    const chartMonths = [];
    if (range.grain === 'month') {
      const span = range.period === 'year' ? [1, 12] : [(range.quarter - 1) * 3 + 1, (range.quarter - 1) * 3 + 3];
      for (let m = span[0]; m <= span[1]; m++) {
        const b = fyMonthBounds(range.fy, m);
        // A month that has not started yet is not "a month with no sales" — it
        // is not a data point at all. Plotting it drew a line to zero for the
        // rest of the financial year.
        if (b.start > range.end) break;
        const key = b.start.slice(0, 7);
        chartMonths.push({ month: `${key}-01`, revenue: buckets[key] || 0 });
      }
    }
    const revenue_chart = range.grain === 'month'
      ? chartMonths
      : Object.entries(buckets).sort().map(([month, revenue]) => ({ month: `${month}-01`, revenue }));
    // Only days that actually have revenue; the client fills the rest of the
    // month with zeroes so a quiet month still renders a full axis.
    const revenue_daily = Object.entries(dayBuckets).sort().map(([date, revenue]) => ({ date, revenue }));

    // Recent 5 orders
    const { data: recent } = await supabase
      .from('orders')
      .select('id, status, total_amount, order_date, customer:customers(company_name)')
      .order('created_at', { ascending: false })
      .limit(5);
    const recent_orders = (recent || []).map((o) => ({ ...o, Customer: o.customer }));

    // Top products for the selected period, on the same billable statuses.
    const { data: items } = await supabase
      .from('order_items')
      .select('quantity, product_name, product:products(name, unit), order:orders!inner(status, order_date)')
      .in('order.status', BILLABLE_ORDER_STATUSES)
      .gte('order.order_date', range.start)
      .lte('order.order_date', range.end);
    const prodMap = {};
    (items || []).forEach((it) => {
      const name = it.product?.name || it.product_name || '—';
      if (!prodMap[name]) prodMap[name] = { product_name: name, total_quantity: 0, Product: it.product };
      prodMap[name].total_quantity += Number(it.quantity || 0);
    });
    const top_products = Object.values(prodMap).sort((a, b) => b.total_quantity - a.total_quantity).slice(0, 5);

    // ── Operational overview: products, inquiries, farmers, farm finance ──
    const startOfMonth = range.start;
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
      supabase.from('farmers').select('id, crop, area_decimal, farmer_type, farmer_visits(date)'),
      supabase.from('expenses').select('type, amount').gte('date', range.start).lte('date', range.end),
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

    // Two different questions, so two different counts.
    //
    // The pipeline chart answers "how did THIS period's orders break down", so
    // it follows the period selector like every other widget — it used to show
    // every order ever regardless of the period, which made the chart the one
    // thing on the page that never changed.
    const statusDist = {};
    (ordersInRange || []).forEach(o => { statusDist[o.status] = (statusDist[o.status] || 0) + 1; });
 
    // "Needs attention" asks "what is sitting in draft right now", which is a
    // standing alert and deliberately not period-scoped — a draft from March is
    // still unconfirmed in August.
    const draftOrdersAllTime = (allOrderStatuses || []).filter(o => o.status === 'draft').length;
 
    const cultivatedAcres = (cropSetups || []).reduce((s, c) => s + Number(c.area_acres || 0), 0);

    // Headline business metrics that are safe to share with a stakeholder.
    const billableCount = (billableRange || []).length;
    const averageOrderValue = billableCount ? Math.round(revMTD / billableCount) : 0;
    const deliveredCount = (billableRange || []).filter((o) => o.status === 'delivered').length;
    const fulfilmentRate = billableCount ? Number(((deliveredCount / billableCount) * 100).toFixed(1)) : null;
 
    // Farmers grouped by crop — the "distribution by crop" widget.
    const cropCounts = {};
    (farmerRows || []).forEach((f) => {
      if (!f.crop) return;
      cropCounts[f.crop] = (cropCounts[f.crop] || 0) + 1;
    });
    const farmer_distribution = Object.entries(cropCounts)
      .map(([crop, count]) => ({ crop, count }))
      .sort((a, b) => b.count - a.count);
 
    // Share of this period's buyers who bought more than once in it. Scoped to
    // the period like everything else, so switching to a quarter re-reads it
    // rather than mixing a lifetime figure into a quarterly view.
    const ordersPerCustomer = {};
    (billableRange || []).forEach((o) => {
      if (!o.customer_id) return;
      ordersPerCustomer[o.customer_id] = (ordersPerCustomer[o.customer_id] || 0) + 1;
    });
    const buyers = Object.values(ordersPerCustomer);
    const repeatCustomerRate = buyers.length
      ? Number(((buyers.filter((n) => n > 1).length / buyers.length) * 100).toFixed(1))
      : 0;
 
    const payload = {
      data: {
        // What the numbers below are actually for. The client shows this and
        // uses `financial_years` to populate the picker.
        period: {
          period: range.period,
          fy: range.fy,
          quarter: range.quarter,
          month: range.month,
          label: range.label,
          start: range.start,
          end: range.end,
          grain: range.grain,
          compared_to: range.previous.label,
          // The UI says "as of <date>" when the period is still running, so the
          // reader knows a part-year figure is not a whole-year one.
          partial: Boolean(range.partial),
          as_of: range.as_of || null,
          full_end: range.full_end || range.end,
          empty: Boolean(range.empty),
        },
        financial_years: selectableFinancialYears(now),
        kpi: {
          revenue_mtd: revMTD,
          orders_mtd: ordersMTD,
          total_customers: totalCustomers || 0,
          revenue_trend: pct(revMTD, revPrev),
          orders_trend: pct(ordersMTD, ordersPrev),
          customers_trend: pct(totalCustomers || 0, custBeforeRange || 0),
          average_order_value: averageOrderValue,
          fulfilment_rate: fulfilmentRate,
          repeat_customer_rate: repeatCustomerRate,
        },
        farmer_distribution,
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
          draft_orders: draftOrdersAllTime,
        },
        order_status_distribution: Object.entries(statusDist).map(([status, count]) => ({ status, count })),
        recent_activity: recentAudit || [],
        recent_orders,
        top_products,
        revenue_chart,
        revenue_daily,
      },
    };
 
    // A stakeholder sees only what an administrator granted them. The filter
    // runs here, on the server: hiding cards in the UI while still shipping the
    // numbers would not be a permission at all.
    const profile = req.user?.profile;
    if (profile?.role === 'stakeholder') {
      return res.json({
        success: true,
        restricted: true,
        data: filterDashboardForWidgets(payload.data, profile.dashboard_widgets || []),
      });
    }
 
    res.json({ success: true, ...payload });
  } catch (err) { next(err); }
};

// Revenue report (period series + summary)
exports.getRevenueReport = async (req, res, next) => {
  try {
    const { from, to, status, period = 'month' } = req.query;
    // Default to every billable status so this report agrees with the
    // dashboard and Finance; an explicit ?status= still narrows it.
    let q = supabase.from('orders').select('total_amount, order_date');
    q = status ? q.eq('status', status) : q.in('status', BILLABLE_ORDER_STATUSES);
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
    const totalRevenue = (data || []).filter((o) => BILLABLE_ORDER_STATUSES.includes(o.status)).reduce((s, o) => s + Number(o.total_amount || 0), 0);
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