export default function Button({
  children, onClick, disabled, secondary, fullWidth,
  type = 'button', className = '', ...rest
}) {
  const base = `
    inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-medium
    transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const primary = `
    text-white focus:ring-forest
    hover:opacity-90 active:scale-[0.98]
  `;
  const secondaryStyle = `
    border focus:ring-forest
    hover:opacity-80
  `;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={secondary
        ? { background: '#fff', border: '1.5px solid #162F22', color: '#162F22' }
        : { background: '#162F22', color: '#fff' }
      }
      className={`${base} ${secondary ? secondaryStyle : primary} ${fullWidth ? 'w-full justify-center' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}