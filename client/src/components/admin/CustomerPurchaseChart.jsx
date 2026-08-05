import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList,
} from 'recharts';
import apiClient from '../../services/api';
 
// How many bars fit before names become unreadable. Beyond this the user pages
// with ‹ / › rather than the chart squeezing everything in.
const PAGE = 8;
 
const SORTS = {
  value: (a, b) => b.total_spent - a.total_spent,
  orders: (a, b) => b.order_count - a.order_count,
  name: (a, b) => a.company_name.localeCompare(b.company_name),
};
 
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const shortMoney = (n) => {
  const v = Number(n) || 0;
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${Math.round(v / 1000)}K`;
  return `₹${v}`;
};
 
export default function CustomerPurchaseChart() {
  const { t } = useTranslation();
  const [sort, setSort] = useState('value');
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(true);
 
  // Reuses the existing customer-insights endpoint — it already returns
  // total_spent and order_count per customer, so no new API was needed.
  const { data, isLoading } = useQuery({
    queryKey: ['customer-insights'],
    queryFn: () => apiClient.get('/admin/analytics/customers').then((r) => r.data.data),
    staleTime: 60_000,
  });
 
  // Customers who have never bought anything would be a row of zero-height
  // bars, so they are left out of a purchase chart.
  const rows = useMemo(() => {
    const withPurchases = (data || []).filter((c) => Number(c.total_spent) > 0);
    return [...withPurchases].sort(SORTS[sort]);
  }, [data, sort]);
 
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE));
  // Changing the sort can leave the page index past the end.
  const safePage = Math.min(page, pageCount - 1);
  const slice = rows.slice(safePage * PAGE, safePage * PAGE + PAGE);
 
  const chartData = slice.map((c) => ({
    name: c.company_name.length > 18 ? `${c.company_name.slice(0, 17)}…` : c.company_name,
    fullName: c.company_name,
    value: Number(c.total_spent) || 0,
    orders: Number(c.order_count) || 0,
  }));
 
  if (isLoading) {
    return (
      <div className="rounded-2xl p-6 mb-6 flex items-center justify-center" style={{ background: '#fff', height: 160 }}>
        <div className="w-6 h-6 border-2 border-forest border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
 
  return (
    <section className="rounded-2xl p-5 sm:p-6 mb-6" style={{ background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h3 className="font-display text-lg" style={{ color: '#1c2e1f' }}>{t('customers.analytics')}</h3>
          <p className="text-xs" style={{ color: '#9aa694' }}>{t('customers.purchaseByCustomer')}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs" style={{ color: '#6a7a63' }}>{t('customers.sortBy')}</label>
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(0); }}
            className="border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-forest/20"
          >
            <option value="value">{t('customers.sortValue')}</option>
            <option value="orders">{t('customers.sortOrders')}</option>
            <option value="name">{t('customers.sortName')}</option>
          </select>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg"
            style={{ background: 'rgba(22,47,34,0.06)', color: '#2a5e3a' }}
          >
            {open ? t('customers.hideChart') : t('customers.showChart')}
          </button>
        </div>
      </div>
 
      {!open ? null : rows.length === 0 ? (
        <p className="text-sm text-center py-10" style={{ color: '#9aa694' }}>{t('customers.noCustomerData')}</p>
      ) : (
        <>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 24, right: 8, bottom: 40, left: -4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#6f7a6a', fontFamily: 'DM Sans' }}
                  axisLine={false} tickLine={false}
                  interval={0} angle={-30} textAnchor="end" height={60}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6f7a6a', fontFamily: 'DM Sans' }}
                  axisLine={false} tickLine={false} tickFormatter={shortMoney}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(22,47,34,0.04)' }}
                  contentStyle={{ background: '#1c2e1f', border: 'none', borderRadius: 8, color: '#f4efe6', fontSize: 12 }}
                  // The axis shows a truncated name; the tooltip shows all of it.
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
                  formatter={(v, _n, item) => [
                    `${inr(v)} · ${t('customers.ordersLabel', { count: item?.payload?.orders ?? 0 })}`,
                    t('customers.sortValue'),
                  ]}
                />
                <Bar dataKey="value" fill="#2a5e3a" radius={[6, 6, 0, 0]} maxBarSize={56}>
                  {/* Order count sits above each bar, as specified. */}
                  <LabelList
                    dataKey="orders"
                    position="top"
                    formatter={(v) => t('customers.ordersLabel', { count: v })}
                    style={{ fontSize: 10, fill: '#6a7a63', fontFamily: 'DM Sans' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
 
          {rows.length > PAGE && (
            <div className="flex items-center justify-center gap-4 mt-2">
              <button
                type="button"
                onClick={() => setPage(Math.max(0, safePage - 1))}
                disabled={safePage === 0}
                aria-label="Previous"
                className="w-8 h-8 rounded-full border border-border disabled:opacity-30 hover:bg-cream transition"
              >
                ‹
              </button>
              <span className="text-xs" style={{ color: '#6a7a63' }}>
                {t('customers.showingRange', {
                  from: safePage * PAGE + 1,
                  to: Math.min((safePage + 1) * PAGE, rows.length),
                  total: rows.length,
                })}
              </span>
              <button
                type="button"
                onClick={() => setPage(Math.min(pageCount - 1, safePage + 1))}
                disabled={safePage >= pageCount - 1}
                aria-label="Next"
                className="w-8 h-8 rounded-full border border-border disabled:opacity-30 hover:bg-cream transition"
              >
                ›
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}