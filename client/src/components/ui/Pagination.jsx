// A windowed pager.
//
// This used to render one button per page. That is fine for eight pages of
// customers and unusable for an audit log, which grows without bound — 200
// pages meant 200 buttons wrapping down the screen. Now it shows first, last,
// and a window around the current page, with ellipses for the gaps.

const WINDOW = 1; // pages either side of the current one
 
function pageList(current, total) {
  const pages = new Set([1, total, current]);
  for (let i = 1; i <= WINDOW; i++) {
    if (current - i >= 1) pages.add(current - i);
    if (current + i <= total) pages.add(current + i);
  }
  const sorted = [...pages].sort((a, b) => a - b);
 
  // Insert a gap marker wherever the sequence jumps.
  const out = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(`gap-${p}`);
    out.push(p);
  });
  return out;
}
 
const btn = 'w-8 h-8 rounded-lg text-sm flex items-center justify-center transition';
const plain = { background: '#fff', border: '1px solid #d8d0c4', color: '#52674c' };
const activeStyle = { background: '#162F22', color: '#fff', border: '1px solid #162F22' };
 
/**
 * Accepts either naming — `current`/`total` (existing call sites) or
 * `page`/`pages`, which is what the API responses are already called.
 */
export default function Pagination({ current, total, page, pages, onChange }) {
  const cur = current ?? page ?? 1;
  const count = total ?? pages ?? 0;
  if (!count || count <= 1) return null;

  return (
    <nav className="flex justify-center items-center gap-2 mt-5 flex-wrap" aria-label="Pagination">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, cur - 1))}
        disabled={cur === 1}
        aria-label="Previous page"
        className={`${btn} disabled:opacity-30`}
        style={plain}
      >
        ‹
      </button>

      {pageList(cur, count).map((p) =>
        typeof p === 'string' ? (
          <span key={p} className="w-6 text-center text-sm select-none" style={{ color: '#9aa694' }} aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === cur ? 'page' : undefined}
            className={`${btn} font-medium`}
            style={p === cur ? activeStyle : plain}
          >
            {p}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onChange(Math.min(count, cur + 1))}
        disabled={cur === count}
        aria-label="Next page"
        className={`${btn} disabled:opacity-30`}
        style={plain}
      >
        ›
      </button>
      </nav>
  );
}