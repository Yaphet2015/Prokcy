import { forwardRef } from 'react';

const Input = forwardRef(({
  type = 'text',
  placeholder = '',
  value = '',
  onChange,
  disabled = false,
  className = '',
  ...props
}, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`
        h-9 px-3 rounded-lg
        bg-tahoe-bg/50 border border-tahoe-border
        text-tahoe-fg placeholder:text-tahoe-subtle
        focus:border-tahoe-accent focus:ring-2 focus:ring-tahoe-accent/20
        outline-none transition-all
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export default Input;
