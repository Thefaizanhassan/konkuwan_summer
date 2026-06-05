export default function Input({ className = '', ...props }) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl px-3.5 py-2.5 text-sm transition focus:outline-none focus:ring-2 ${className}`}
      style={{
        border: '1px solid #d8d0c4',
        color: '#1c2e1f',
        background: '#fff',
        '--tw-ring-color': 'rgba(22,47,34,0.25)',
      }}
    />
  );
}

/* initial code
export default function Input({ className = '', ...props }) {
  return (
    <input
      {...props}
      className={`w-full border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest/50 ${className}`}
    />
  );
}
*/