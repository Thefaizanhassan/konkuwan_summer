export default function Pagination({ current, total, onChange }) {
  if (!total || total <= 1) return null;

  const pages = Array.from({ length: total }, (_, i) => i + 1);

  return (
    <div className="flex justify-center gap-2 mt-5">
      <button
        onClick={() => onChange(Math.max(1, current - 1))}
        disabled={current === 1}
        className="w-8 h-8 rounded-lg text-sm flex items-center justify-center transition disabled:opacity-30"
        style={{ background: '#fff', border: '1px solid #d8d0c4', color: '#52674c' }}
      >
        ‹
      </button>

      {pages.map(page => (
        <button
          key={page}
          onClick={() => onChange(page)}
          className="w-8 h-8 rounded-lg text-sm font-medium flex items-center justify-center transition"
          style={
            page === current
              ? { background: '#162F22', color: '#fff', border: '1px solid #162F22' }
              : { background: '#fff', border: '1px solid #d8d0c4', color: '#52674c' }
          }
        >
          {page}
        </button>
      ))}

      <button
        onClick={() => onChange(Math.min(total, current + 1))}
        disabled={current === total}
        className="w-8 h-8 rounded-lg text-sm flex items-center justify-center transition disabled:opacity-30"
        style={{ background: '#fff', border: '1px solid #d8d0c4', color: '#52674c' }}
      >
        ›
      </button>
    </div>
  );
}

/* initial code
export default function Pagination({ current, total, onChange }) {
  if (!total || total <= 1) return null;
  return (
    <div className="flex justify-center gap-2 mt-4">
      {Array.from({ length: total }, (_, i) => i + 1).map((page) => (
        <button
          key={page}
          onClick={() => onChange(page)}
          className={`w-8 h-8 text-sm rounded-full transition ${
            page === current ? 'bg-forest text-white' : 'bg-white border border-border hover:bg-cream'
          }`}
        >
          {page}
        </button>
      ))}
    </div>
  );
}
*/