export default function Select({ children, className = '', ...props }) {
  return (
    <select
      {...props}
      className={`w-full border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest/50 ${className}`}
    >
      {children}
    </select>
  );
}