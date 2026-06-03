import Counter from './Counter';

export default function StatsStrip() {
  return (
    <div className="border-t border-b border-border bg-white">
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4">
        {[
          { target: 2500, suffix: '+', label: 'Farming families engaged' },
          { target: 50, suffix: '+', label: 'Manufacturers and exporters served' },
          { target: 8, suffix: '+', label: 'Medicinal crops in supply' },
          { target: 7, suffix: '', label: 'States of operation' },
        ].map((stat) => (
          <div key={stat.label} className="p-6 md:p-10 text-center border-r border-border last:border-r-0">
            <span className="font-display text-4xl md:text-5xl font-medium text-forest">
              <Counter target={stat.target} suffix={stat.suffix} />
            </span>
            <p className="text-sm text-muted mt-2">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}