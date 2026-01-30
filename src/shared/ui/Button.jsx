import { forwardRef } from 'react';

const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  ...props
}, ref) => {
  const baseStyles = 'font-medium transition-all inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-tahoe-accent text-white hover:opacity-90',
    secondary: 'bg-tahoe-border text-tahoe-fg hover:bg-tahoe-hover',
    ghost: 'text-tahoe-fg hover:bg-tahoe-hover',
  };

  const sizes = {
    sm: 'h-7 px-3 text-xs rounded-md',
    md: 'h-9 px-5 text-sm rounded-lg',
    lg: 'h-11 px-6 text-base rounded-lg',
  };

  return (
    <button
      ref={ref}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
