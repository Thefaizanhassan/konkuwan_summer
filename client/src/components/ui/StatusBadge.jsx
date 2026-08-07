const STATUS_STYLES = {
  draft:      { background: '#eae7e1', color: '#6b6b5e' },
  confirmed:  { background: '#dde9f5', color: '#1c5a7a' },
  dispatched: { background: '#fef3c7', color: '#92400e' },
  delivered:  { background: '#e2f0e0', color: '#1d6b2e' },
  cancelled:  { background: '#fee2e2', color: '#991b1b' },
};

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.draft;
  return (
    <span
      className="inline-block px-3 py-0.5 rounded-full text-xs font-semibold capitalize"
      style={style}
    >
      {status}
    </span>
  );
}