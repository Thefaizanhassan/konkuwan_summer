import { useQuery } from '@tanstack/react-query';
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

export default function Dashboard() {
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
  const recentOrders = data?.data?.recent_orders || [];
  const topProducts = data?.data?.top_products || [];
  const revenueChart = (data?.data?.revenue_chart || []).map(d => ({
    month: new Date(d.month).toLocaleString('default', { month: 'short' }),
    revenue: Math.round(Number(d.revenue) / 1000),
  }));

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
            Dashboard <small className="font-body text-base font-normal ml-2" style={{ color: '#7b8a76' }}>Konkuwan Herbs</small>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold" style={{ color: '#1c2e1f' }}>Welcome, {name}</p>
            <p className="text-xs capitalize" style={{ color: '#7b8a76' }}>
              {user?.profile?.role?.replace(/_/g, ' ') || 'Admin'}
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
          label="Revenue (MTD)"
          value={`₹${Number(kpi.revenue_mtd || 0).toLocaleString('en-IN')}`}
          trend={fmtTrend(kpi.revenue_trend)} trendUp={(kpi.revenue_trend ?? 0) >= 0}
        />
        <KPICard
          label="Orders (MTD)"
          value={kpi.orders_mtd ?? 0}
          trend={fmtTrend(kpi.orders_trend)} trendUp={(kpi.orders_trend ?? 0) >= 0}
        />
        <KPICard
          label="Total Customers"
          value={kpi.total_customers ?? 0}
          trend={fmtTrend(kpi.customers_trend)} trendUp={(kpi.customers_trend ?? 0) >= 0}
        />
      </div>

      {/* Chart + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-7 mb-8">
        {/* Chart */}
        <div className="rounded-2xl p-6" style={{ background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl" style={{ color: '#1c2e1f' }}>Revenue Last 12 Months</h3>
            <div className="flex items-center gap-2 text-xs" style={{ color: '#5f7059' }}>
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: '#2a5e3a' }} />
              Monthly revenue
            </div>
          </div>
          <div style={{ height: 220 }}>
            {revenueChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueChart} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6f7a6a', fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6f7a6a', fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}K`} />
                  <Tooltip
                    contentStyle={{ background: '#1c2e1f', border: 'none', borderRadius: 8, color: '#f4efe6', fontSize: 12 }}
                    formatter={v => [`₹${v}K`, 'Revenue']}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#1f4a2a"
                    strokeWidth={2.5}
                    dot={{ fill: '#1f4a2a', strokeWidth: 2, stroke: '#fff', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted">No revenue data yet</div>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="rounded-2xl p-6" style={{ background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
          <h3 className="font-display text-xl mb-4" style={{ color: '#1c2e1f' }}>Top Products</h3>
          {topProducts.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">No sales data yet</p>
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
            <h3 className="font-display text-xl mb-4" style={{ color: '#1c2e1f' }}>Expenses by Category</h3>
            {expenseCats.length === 0 ? (
              <p className="text-sm text-muted text-center py-8">No expense data yet</p>
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
            <h3 className="font-display text-xl mb-1" style={{ color: '#1c2e1f' }}>Farmers by Crop</h3>
            <p className="text-xs mb-4" style={{ color: '#7b8a76' }}>Total enrolled: {farmData?.total_farmers ?? 0}</p>
            {farmersByCrop.length === 0 ? (
              <p className="text-sm text-muted text-center py-8">No farmers enrolled yet</p>
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

      {/* Recent Orders */}
      <div className="rounded-2xl p-6" style={{ background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-xl" style={{ color: '#1c2e1f' }}>Recent Orders</h3>
          <Link to="/admin/orders" className="text-sm font-medium" style={{ color: '#4a6a4f', borderBottom: '1px dashed #b7cbb0' }}>
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ece6dc' }}>
                {['Customer', 'Status', 'Total', 'Date'].map(h => (
                  <th key={h} className="text-left pb-3 font-semibold text-xs uppercase tracking-wide pr-4" style={{ color: '#52674c' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-sm text-muted">No orders yet</td></tr>
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
        <KPICard title="Revenue (MTD)" value={`₹${kpi.revenue_mtd.toLocaleString()}`} />
        <KPICard title="Orders (MTD)" value={kpi.orders_mtd} />
        <KPICard title="Total Customers" value={kpi.total_customers} />
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