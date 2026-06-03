export default function KPICard({ title, value, trend }) {
  return (
    <div className="bg-white p-6 rounded-sm border border-border">
      <p className="text-xs uppercase tracking-wider text-muted">{title}</p>
      <p className="text-2xl font-bold text-forest mt-1">{value}</p>
      {trend && <p className="text-sm text-sage mt-2">{trend}</p>}
    </div>
  );
}