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