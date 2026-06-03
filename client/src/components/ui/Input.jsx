export default function Input({ className = '', ...props }) {
  return (
    <input
      {...props}
      className={`w-full border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest/50 ${className}`}
    />
  );
}