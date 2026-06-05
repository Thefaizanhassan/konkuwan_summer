export default function KPICard({ title, value, trend, trendUp = true }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6"
      style={{
        background: '#ffffff',
        boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
        border: '1px solid rgba(0,0,0,0.02)',
      }}
    >
      <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: '#162F22', opacity: 0.15 }} />
      <div className="absolute -top-2 -right-2 w-16 h-16 rounded-full" style={{ background: '#162F22', opacity: 0.03 }} />

      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium" style={{ color: '#6a7a63' }}>{title}</span>
        {trend && (
          <span
            className="flex items-center gap-1 text-xs font-semibold px-3 py-0.5 rounded-full"
            style={{ background: 'rgba(22,47,34,0.06)', color: '#3f6b4a' }}
          >
            {trendUp ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>
      <p className="text-3xl font-bold tracking-tight" style={{ color: '#1c2e1f', fontFamily: "'DM Sans',sans-serif" }}>
        {value}
      </p>
    </div>
  );
}

/* initial code
export default function KPICard({ title, value, trend }) {
  return (
    <div className="bg-white p-6 rounded-sm border border-border">
      <p className="text-xs uppercase tracking-wider text-muted">{title}</p>
      <p className="text-2xl font-bold text-forest mt-1">{value}</p>
      {trend && <p className="text-sm text-sage mt-2">{trend}</p>}
    </div>
  );
}
*/