'use client';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  loading?: boolean;
  children: React.ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'default',
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = `
    rounded-lg font-[family-name:var(--font-inter)] font-medium
    transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
    flex items-center justify-center gap-2
  `;

  const sizes = {
    default: 'px-4 py-2 text-sm',
    sm: 'px-3 py-1.5 text-xs',
    lg: 'px-6 py-3 text-base',
    icon: 'p-2 w-10 h-10',
  };

  const variants = {
    primary: `
      bg-[var(--color-accent)] text-white
      hover:bg-[var(--color-secondary)]
      active:scale-95
    `,
    secondary: `
      border-2 border-[var(--color-secondary)] text-[var(--color-secondary)]
      hover:bg-[var(--color-secondary)] hover:text-white
    `,
    danger: `
      bg-red-600 text-white
      hover:bg-red-700
    `,
    destructive: `
      bg-red-600 text-white
      hover:bg-red-700
    `,
    ghost: `
      text-[var(--color-gray)] hover:bg-[var(--color-light-bg)]
    `,
    outline: `
      border-2 border-gray-300 text-gray-700
      hover:bg-gray-100
    `,
  };

  return (
    <button
      className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
