export default function Button({ children, onClick, disabled, secondary, fullWidth, type = 'button', className = '', ...rest }) {
  const base = `inline-flex items-center justify-center px-5 py-2.5 rounded-sm text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-forest disabled:opacity-50 disabled:cursor-not-allowed`;
  const primary = `bg-forest text-white hover:bg-forest-mid focus:ring-forest`;
  const secondaryStyle = `bg-white text-forest border-2 border-forest hover:bg-cream focus:ring-forest`;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${secondary ? secondaryStyle : primary} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}