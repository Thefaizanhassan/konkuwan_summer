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