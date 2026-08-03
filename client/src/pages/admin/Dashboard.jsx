import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../services/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, Legend,
} from 'recharts';


const STATUS_COLORS = {
  delivered:  { bg: '#e2f0e0', color: '#1d6b2e' },
  confirmed:  { bg: '#dde9f5', color: '#1c5a7a' },
  dispatched: { bg: '#fef3c7', color: '#92400e' },
  draft:      { bg: '#eae7e1', color: '#6b6b5e' },
  cancelled:  { bg: '#fee2e2', color: '#991b1b' },
};

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.draft;
  return (
    <span
      className="inline-block px-3 py-0.5 rounded-full text-xs font-semibold capitalize"
      style={{ background: s.bg, color: s.color }}
    >
      {status}
    </span>
  );
}

// Severity palette. High is a genuine warning red, medium the dashboard's
// existing amber, low a calm sage so a single overdue visit does not read as
// an emergency.
const SEVERITY = {
  high: { bg: '#FDF2F1', border: '#F0C9C5', accent: '#B3261E', chipBg: '#F7DBD8', text: '#7A1C16' },
  medium: { bg: '#FFF8EC', border: '#F3D9A4', accent: '#B45309', chipBg: '#FBEBD0', text: '#7C4A03' },
  low: { bg: '#F2F7F2', border: '#CFE0D2', accent: '#2B5240', chipBg: '#DFEBE1', text: '#24422F' },
};
 
// The "⚠ Needs attention" panel: one card per outstanding item, ordered by
// severity so the most urgent thing is always first.
export function NeedsAttention({ overview, t }) {
  const inquiries = overview.inquiries_new ?? 0;
  const drafts = overview.draft_orders ?? 0;
  const visits = overview.farmers_needing_visit ?? 0;
 
  const items = [
    inquiries > 0 && {
      key: 'inquiries',
      icon: '✉',
      count: inquiries,
      title: t('dashboard.attentionInquiriesTitle'),
      desc: t('dashboard.attentionInquiriesDesc'),
      // Unanswered enquiries are lost revenue, and they age badly.
      severity: inquiries >= 3 ? 'high' : 'medium',
      to: '/admin/inquiries',
    },
    drafts > 0 && {
      key: 'drafts',
      icon: '📄',
      count: drafts,
      title: t('dashboard.attentionDraftsTitle'),
      desc: t('dashboard.attentionDraftsDesc'),
      severity: drafts >= 5 ? 'high' : 'medium',
      to: '/admin/orders',
    },
    visits > 0 && {
      key: 'visits',
      icon: '🌱',
      count: visits,
      title: t('dashboard.attentionVisitsTitle'),
      desc: t('dashboard.attentionVisitsDesc'),
      severity: visits >= 5 ? 'medium' : 'low',
      to: '/admin/farm',
    },
  ].filter(Boolean);
 
  if (items.length === 0) return null;
 
  const rank = { high: 0, medium: 1, low: 2 };
  items.sort((a, b) => rank[a.severity] - rank[b.severity]);
  const worst = items[0].severity;
  const priorityLabel = { high: t('dashboard.priorityHigh'), medium: t('dashboard.priorityMedium'), low: t('dashboard.priorityLow') };
 
  return (
    <section
      className="rounded-2xl p-5 sm:p-6 mb-8"
      style={{ background: '#fff', border: `1px solid ${SEVERITY[worst].border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}
      aria-label={t('dashboard.needsAttention')}
    >
      <div className="flex items-baseline justify-between gap-3 mb-4 flex-wrap">
        <h3 className="font-display text-lg flex items-center gap-2" style={{ color: '#1c2e1f' }}>
          <span aria-hidden="true" style={{ color: SEVERITY[worst].accent }}>⚠</span>
          {t('dashboard.needsAttention')}
        </h3>
        <span className="text-xs" style={{ color: '#7b8a76' }}>
          {t('dashboard.attentionSubtitle', { count: items.length })}
        </span>
      </div>
 
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item) => {
          const c = SEVERITY[item.severity];
          return (
            <Link
              key={item.key}
              to={item.to}
              className="group flex flex-col rounded-xl p-4 transition hover:shadow-md focus:outline-none focus:ring-2"
              style={{ background: c.bg, border: `1px solid ${c.border}` }}
            >
              <div className="flex items-start gap-3">
                <span
                  className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-base"
                  style={{ background: c.chipBg }}
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-2xl font-bold leading-none" style={{ color: c.accent }}>{item.count}</span>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                      style={{ background: c.chipBg, color: c.text }}
                    >
                      {priorityLabel[item.severity]}
                    </span>
                  </div>
                  <p className="text-sm font-semibold mt-1" style={{ color: c.text }}>{item.title}</p>
                  <p className="text-xs mt-0.5 leading-snug" style={{ color: '#6a7a63' }}>{item.desc}</p>
                </div>
              </div>
              <span
                className="mt-3 self-start text-xs font-semibold inline-flex items-center gap-1"
                style={{ color: c.accent }}
              >
                {t('dashboard.reviewCta')}
                <span className="transition-transform group-hover:translate-x-0.5" aria-hidden="true">→</span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function KPICard({ label, value, trend, trendUp }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6"
      style={{
        background: '#fff',
        boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
        border: '1px solid rgba(0,0,0,0.02)',
      }}
    >
      {/* bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: '#162F22', opacity: 0.15 }} />
      {/* faded circle */}
      <div className="absolute -top-2 -right-2 w-16 h-16 rounded-full" style={{ background: '#162F22', opacity: 0.03 }} />

      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium" style={{ color: '#6a7a63' }}>{label}</span>
        {trend && (
          <span
            className="flex items-center gap-1 text-xs font-semibold px-3 py-0.5 rounded-full"
            style={{ background: 'rgba(22,47,34,0.06)', color: '#3f6b4a' }}
          >
            {trendUp ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>
      <div className="text-3xl font-bold tracking-tight" style={{ color: '#1c2e1f', fontFamily: "'DM Sans',sans-serif" }}>
        {value}
      </div>
    </div>
  );
}

const fmtTrend = (t) => (t == null ? null : `${t > 0 ? '+' : ''}${t}%`);

// One formatter for both chart views so the axis and tooltip never disagree.
const fmtMoney = (v) => {
  const n = Number(v) || 0;
  return n >= 1000 ? `₹${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : `₹${n}`;
};

export default function Dashboard() {
  const { t } = useTranslation();
  // null = 12-month overview; 'YYYY-MM' = drilled into that month.
  const [drillMonth, setDrillMonth] = useState(null);
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiClient.get('/admin/analytics/dashboard').then(r => r.data),
    staleTime: 60_000,
    // retry: false, may need to commented out
  });

  const { data: farmData } = useQuery({
    queryKey: ['farm-analytics'],
    queryFn: () => apiClient.get('/admin/farm/analytics').then(r => r.data.data),
    staleTime: 60_000,
    retry: false,
  });
  const expenseCats = farmData?.expense_by_category || [];
  const farmersByCrop = farmData?.farmers_by_crop || [];
  const PALETTE = ['#162F22', '#4A7860', '#6A9E7A', '#B8844A', '#C8A84B', '#8FA98F', '#D9CDB8', '#3B5747'];

  const kpi = data?.data?.kpi || {};
  const overview = data?.data?.overview || {};
  const statusDist = data?.data?.order_status_distribution || [];
  const recentActivity = data?.data?.recent_activity || [];
  const recentOrders = data?.data?.recent_orders || [];
  const topProducts = data?.data?.top_products || [];
  // Monthly series. `key` is the YYYY-MM used to drill down; `label` is what
  // the axis shows. Revenue stays in rupees and is formatted at render time,
  // so the monthly and daily views share one scale and one tooltip format.
  const revenueChart = (data?.data?.revenue_chart || []).map(d => ({
    key: String(d.month).slice(0, 7),
    label: new Date(d.month).toLocaleString('default', { month: 'short' }),
    revenue: Number(d.revenue) || 0,
  }));
  const revenueDaily = data?.data?.revenue_daily || [];
 
  // Every day of the drilled-in month, including days with no sales, so a
  // quiet month still renders a full axis instead of a single floating point.
  const dailyChart = (() => {
    if (!drillMonth) return [];
    const [y, m] = drillMonth.split('-').map(Number);
    const byDate = Object.fromEntries(revenueDaily.map(d => [d.date, Number(d.revenue) || 0]));
    return Array.from({ length: new Date(y, m, 0).getDate() }, (_, i) => {
      const date = `${drillMonth}-${String(i + 1).padStart(2, '0')}`;
      return { key: date, label: String(i + 1), revenue: byDate[date] || 0 };
    });
  })();
 
  const isDrilled = Boolean(drillMonth);
  const chartData = isDrilled ? dailyChart : revenueChart;
  const drillMonthLabel = drillMonth
    ? new Date(`${drillMonth}-01`).toLocaleString('default', { month: 'long', year: 'numeric' })
    : '';
  const monthHasSales = dailyChart.some(d => d.revenue > 0);

  const name = user?.profile?.name || user?.email?.split('@')[0] || 'Admin';
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-forest border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl" style={{ color: '#1c2e1f' }}>
            {t('dashboard.title')} <small className="font-body text-base font-normal ml-2" style={{ color: '#7b8a76' }}>Konkuwan Herbs</small>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold" style={{ color: '#1c2e1f' }}>{t('dashboard.welcome', { name })}</p>
            <p className="text-xs" style={{ color: '#7b8a76' }}>
              {user?.profile?.role ? t(`users.roles.${user.profile.role}`, user.profile.role.replace(/_/g, ' ')) : 'Admin'}
            </p>
          </div>
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0"
            style={{ background: '#dce5d3', color: '#1c2e1f', border: '2px solid #c5d3ba' }}
          >
            {initials}
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <KPICard
          label={t('dashboard.revenueMtd')}
          value={`₹${Number(kpi.revenue_mtd || 0).toLocaleString('en-IN')}`}
          trend={fmtTrend(kpi.revenue_trend)} trendUp={(kpi.revenue_trend ?? 0) >= 0}
        />
        <KPICard
          label={t('dashboard.ordersMtd')}
          value={kpi.orders_mtd ?? 0}
          trend={fmtTrend(kpi.orders_trend)} trendUp={(kpi.orders_trend ?? 0) >= 0}
        />
        <KPICard
          label={t('dashboard.totalCustomers')}
          value={kpi.total_customers ?? 0}
          trend={fmtTrend(kpi.customers_trend)} trendUp={(kpi.customers_trend ?? 0) >= 0}
        />
      </div>

      {/* Operational overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {[
          { label: t('dashboard.productsCard'), value: `${overview.products_active ?? 0}/${overview.products_total ?? 0}`, sub: t('dashboard.productsSub'), to: '/admin/products' },
          { label: t('dashboard.potentialLeads'), value: overview.potential_leads ?? 0, sub: t('dashboard.potentialLeadsSub'), to: '/admin/customers' },
          { label: t('dashboard.newInquiries'), value: overview.inquiries_new ?? 0, sub: t('dashboard.inquiriesSub', { count: overview.inquiries_total ?? 0 }), to: '/admin/inquiries', alert: (overview.inquiries_new ?? 0) > 0 },
          { label: t('dashboard.farmers'), value: overview.farmers_total ?? 0, sub: t('dashboard.farmersSub', { count: Number(overview.farm_area_decimal || 0).toFixed(0) }), to: '/admin/farm' },
          { label: t('dashboard.cultivated'), value: `${Number(overview.cultivated_acres || 0)} ac`, sub: t('dashboard.cultivatedSub', { count: overview.crops_tracked ?? 0 }), to: '/admin/farm' },
          { label: t('dashboard.farmExpenses'), value: `₹${Number(overview.expenses_mtd || 0).toLocaleString('en-IN')}`, sub: t('dashboard.farmExpensesSub', { amount: `₹${Number(overview.farm_revenue_logged_mtd || 0).toLocaleString('en-IN')}` }), to: '/admin/farm' },
        ].map(card => (
          <Link key={card.label} to={card.to}
            className="rounded-2xl p-4 block hover:shadow-md transition"
            style={{ background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.03)', border: card.alert ? '1px solid #f3d9a4' : '1px solid rgba(0,0,0,0.02)' }}
          >
            <p className="text-xs font-medium" style={{ color: '#6a7a63' }}>{card.label}</p>
            <p className="text-xl font-bold mt-1" style={{ color: card.alert ? '#92400e' : '#1c2e1f' }}>{card.value}</p>
            <p className="text-[11px] mt-0.5" style={{ color: '#9aa694' }}>{card.sub}</p>
          </Link>
        ))}
      </div>
 
      {/* Needs attention */}
      <NeedsAttention overview={overview} t={t} />

      {/* Chart + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-7 mb-8">
        {/* Chart */}
        <div className="rounded-2xl p-6" style={{ background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <h3 className="font-display text-xl truncate" style={{ color: '#1c2e1f' }}>
                {isDrilled ? drillMonthLabel : t('dashboard.revenue12')}
              </h3>
              {isDrilled && (
                <button
                  type="button"
                  onClick={() => setDrillMonth(null)}
                  className="text-xs font-semibold px-2.5 py-1 rounded-full transition hover:opacity-80 flex-shrink-0"
                  style={{ background: 'rgba(22,47,34,0.06)', color: '#2a5e3a' }}
                >
                  ← {t('dashboard.backToMonths')}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs flex-shrink-0" style={{ color: '#5f7059' }}>
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: '#2a5e3a' }} />
              {isDrilled ? t('dashboard.dailyRevenue') : t('dashboard.monthlyRevenue')}
            </div>
          </div>
          <div style={{ height: 220 }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 4, right: 4, bottom: 0, left: -10 }}
                  // Clicking a month swaps in that month's daily series. The
                  // data is already loaded, so this makes no extra request.
                  onClick={(e) => {
                    if (isDrilled) return;
                    const key = e?.activePayload?.[0]?.payload?.key;
                    if (key) setDrillMonth(key);
                  }}
                  style={{ cursor: isDrilled ? 'default' : 'pointer' }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6f7a6a', fontFamily: 'DM Sans' }} axisLine={false} tickLine={false}
                    interval={isDrilled ? 2 : 0} />
                  <YAxis tick={{ fontSize: 11, fill: '#6f7a6a', fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} tickFormatter={fmtMoney} />
                  <Tooltip
                    contentStyle={{ background: '#1c2e1f', border: 'none', borderRadius: 8, color: '#f4efe6', fontSize: 12 }}
                    labelFormatter={(label) => (isDrilled ? `${label} ${drillMonthLabel}` : label)}
                    formatter={(v) => [fmtMoney(v), t('dashboard.monthlyRevenue')]}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#1f4a2a"
                    strokeWidth={4}
                    dot={isDrilled ? false : { fill: '#1f4a2a', strokeWidth: 2, stroke: '#fff', r: 5 }}
                    activeDot={{ r: 7, strokeWidth: 2, stroke: '#fff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted">{t('dashboard.noRevenue')}</div>
            )}
          </div>
          {/* A month with no sales still draws a full flat axis, so say why. */}
          {isDrilled && !monthHasSales && (
            <p className="text-xs text-center mt-2" style={{ color: '#9aa694' }}>
              {t('dashboard.noRevenueMonth', { month: drillMonthLabel })}
            </p>
          )}
          {!isDrilled && revenueChart.length > 0 && (
            <p className="text-xs text-center mt-2" style={{ color: '#9aa694' }}>
              {t('dashboard.clickMonthHint')}
            </p>
          )}
        </div>

        {/* Top Products */}
        <div className="rounded-2xl p-6" style={{ background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
          <h3 className="font-display text-xl mb-4" style={{ color: '#1c2e1f' }}>{t('dashboard.topProducts')}</h3>
          {topProducts.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">{t('dashboard.noSales')}</p>
          ) : (
            <ul className="divide-y" style={{ borderColor: '#f0ebe2' }}>
              {topProducts.map((p, i) => (
                <li key={i} className="flex items-center justify-between py-2.5">
                  <span className="font-display text-base" style={{ color: '#1e2e1c' }}>
                    {p.Product?.name || p.product_name || '—'}
                  </span>
                  <span
                    className="text-sm font-bold px-4 py-0.5 rounded-full"
                    style={{ background: 'rgba(22,47,34,0.05)', color: '#1f4a2a' }}
                  >
                    {Number(p.total_quantity || 0).toFixed(0)} {p.Product?.unit || 'kg'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Operations analytics */}
      {(expenseCats.length > 0 || farmersByCrop.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-7 mb-8">
          <div className="rounded-2xl p-6" style={{ background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
            <h3 className="font-display text-xl mb-4" style={{ color: '#1c2e1f' }}>{t('dashboard.expensesByCategory')}</h3>
            {expenseCats.length === 0 ? (
              <p className="text-sm text-muted text-center py-8">{t('dashboard.noExpenses')}</p>
            ) : (
              <>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expenseCats} dataKey="total" nameKey="category"
                           innerRadius={55} outerRadius={85} paddingAngle={2}>
                        {expenseCats.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => `₹${Number(v).toLocaleString('en-IN')}`} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <table className="w-full text-sm mt-2">
                  <tbody>
                    {expenseCats.map((c, i) => (
                      <tr key={c.category} style={{ borderTop: '1px solid #f1ebe2' }}>
                        <td className="py-1.5 capitalize">
                          <span className="inline-block w-2.5 h-2.5 rounded-full mr-2" style={{ background: PALETTE[i % PALETTE.length] }} />
                          {c.category}
                        </td>
                        <td className="py-1.5 text-right font-semibold" style={{ color: '#1c2e1f' }}>
                          ₹{Number(c.total).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>

          <div className="rounded-2xl p-6" style={{ background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
            <h3 className="font-display text-xl mb-1" style={{ color: '#1c2e1f' }}>{t('dashboard.farmersByCrop')}</h3>
            <p className="text-xs mb-4" style={{ color: '#7b8a76' }}>{t('dashboard.totalEnrolled', { count: farmData?.total_farmers ?? 0 })}</p>
            {farmersByCrop.length === 0 ? (
              <p className="text-sm text-muted text-center py-8">{t('dashboard.noFarmers')}</p>
            ) : (
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={farmersByCrop} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                    <XAxis dataKey="crop" tick={{ fontSize: 11, fill: '#6f7a6a' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6f7a6a' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v, name) => name === 'count' ? [v, 'Farmers'] : [`${v} dec`, 'Area']} />
                    <Bar dataKey="count" fill="#4A7860" radius={[4, 4, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Order pipeline + Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-7 mb-8">
        <div className="rounded-2xl p-6" style={{ background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
          <h3 className="font-display text-xl mb-4" style={{ color: '#1c2e1f' }}>{t('dashboard.orderPipeline')}</h3>
          {statusDist.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">{t('dashboard.noOrders')}</p>
          ) : (
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusDist} dataKey="count" nameKey="status" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {statusDist.map((s, i) => (
                      <Cell key={i} fill={{ delivered: '#2a5e3a', confirmed: '#1c5a7a', dispatched: '#b8860b', draft: '#8a8a7a', cancelled: '#a33' }[s.status] || PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12, textTransform: 'capitalize' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
 
        <div className="rounded-2xl p-6" style={{ background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl" style={{ color: '#1c2e1f' }}>{t('dashboard.recentActivity')}</h3>
            <Link to="/admin/audit-logs" className="text-sm font-medium" style={{ color: '#4a6a4f', borderBottom: '1px dashed #b7cbb0' }}>
              {t('dashboard.allLogs')} →
            </Link>
          </div>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">{t('dashboard.noActivity')}</p>
          ) : (
            <ul className="divide-y" style={{ borderColor: '#f0ebe2' }}>
              {recentActivity.map((a, i) => (
                <li key={i} className="py-2 flex items-center justify-between text-sm">
                  <span>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mr-2 ${
                      a.action === 'CREATE' ? 'bg-green-100 text-green-700'
                      : a.action === 'DELETE' || a.action === 'DEACTIVATE' ? 'bg-red-100 text-red-700'
                      : 'bg-blue-100 text-blue-700'
                    }`}>{a.action}</span>
                    <span className="capitalize">{a.entity_type}</span>
                    {a.user?.name && <span className="text-muted"> · {a.user.name}</span>}
                  </span>
                  <span className="text-xs text-muted whitespace-nowrap">
                    {new Date(a.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
 
      {/* Recent Orders */}
      <div className="rounded-2xl p-6" style={{ background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-xl" style={{ color: '#1c2e1f' }}>{t('dashboard.recentOrders')}</h3>
          <Link to="/admin/orders" className="text-sm font-medium" style={{ color: '#4a6a4f', borderBottom: '1px dashed #b7cbb0' }}>
            {t('dashboard.viewAll')} →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ece6dc' }}>
                {[t('dashboard.customer'), t('common.status'), t('common.total'), t('common.date')].map(h => (
                  <th key={h} className="text-left pb-3 font-semibold text-xs uppercase tracking-wide pr-4" style={{ color: '#52674c' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-sm text-muted">{t('dashboard.noOrders')}</td></tr>
              ) : recentOrders.map((order, i) => (
                <tr key={order.id}
                  className="transition-colors"
                  style={{
                    borderBottom: i < recentOrders.length - 1 ? '1px solid #f1ebe2' : 'none',
                    background: i % 2 === 1 ? '#faf8f4' : '#fff',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f4f0e8'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 1 ? '#faf8f4' : '#fff'}
                >
                  <td className="py-3 pr-4 font-medium" style={{ color: '#1f2e1c' }}>
                    {order.Customer?.company_name || '—'}
                  </td>
                  <td className="py-3 pr-4"><StatusBadge status={order.status} /></td>
                  <td className="py-3 pr-4 font-semibold" style={{ color: '#1c2e1f' }}>
                    ₹{Number(order.total_amount || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 text-xs" style={{ color: '#5c6e56' }}>
                    {new Date(order.order_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/*
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/api';
import KPICard from '../../components/admin/KPICard';
import StatusBadge from '../../components/ui/StatusBadge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiClient.get('/admin/analytics/dashboard').then(res => res.data),
  });

  if (isLoading) return <div>Loading dashboard...</div>;

  const { kpi, recent_orders, top_products, revenue_chart } = data.data;

  return (
    <div>
      <h2 className="font-display text-3xl text-forest mb-8">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <KPICard title={t('dashboard.revenueMtd')} value={`₹${kpi.revenue_mtd.toLocaleString()}`} />
        <KPICard title={t('dashboard.ordersMtd')} value={kpi.orders_mtd} />
        <KPICard title={t('dashboard.totalCustomers')} value={kpi.total_customers} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-sm border border-border">
          <h3 className="font-display text-xl text-forest mb-4">Revenue Last 12 Months</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={revenue_chart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tickFormatter={(d) => new Date(d).toLocaleString('default', { month: 'short', year: '2-digit' })} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#4A7860" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-sm border border-border">
          <h3 className="font-display text-xl text-forest mb-4">Top Products (MTD)</h3>
          <ul className="space-y-2">
            {top_products?.map(p => (
              <li key={p.product_id} className="flex justify-between text-sm">
                <span>{p.Product?.name}</span>
                <span className="text-sage">{p.total_quantity} {p.Product?.unit}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-white p-6 rounded-sm border border-border">
        <h3 className="font-display text-xl text-forest mb-4">Recent Orders</h3>
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr><th>Customer</th><th>Status</th><th>Total</th><th>Date</th></tr>
          </thead>
          <tbody>
            {recent_orders?.map(order => (
              <tr key={order.id} className="border-t">
                <td className="py-2">{order.Customer?.company_name}</td>
                <td><StatusBadge status={order.status} /></td>
                <td>₹{order.total_amount}</td>
                <td>{new Date(order.order_date).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
*/