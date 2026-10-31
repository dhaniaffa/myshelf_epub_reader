import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'filled' | 'tonal' | 'outlined' | 'text' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'filled',
  size = 'md',
  icon,
  className = '',
  disabled,
  type = 'button',
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center gap-2 font-medium rounded-full transition-all duration-150 select-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]';

  const sizeClasses = {
    sm: 'text-xs px-3.5 py-1.5 min-h-8',
    md: 'text-sm px-5 py-2.5 min-h-10',
    lg: 'text-base px-6 py-3 min-h-12',
  }[size];

  const variantClasses = {
    filled:
      'bg-primary text-on-primary hover:opacity-95 shadow-xs hover:shadow-sm active:opacity-90',
    tonal: 'bg-secondary-container text-on-secondary-container hover:opacity-90 active:opacity-80',
    outlined: 'border border-outline/40 text-primary hover:bg-primary/5 active:bg-primary/10',
    text: 'text-primary hover:bg-primary/8 active:bg-primary/15',
    danger: 'bg-error text-on-error hover:opacity-90 active:opacity-80',
  }[variant];

  return (
    <button
      type={type}
      className={`${base} ${sizeClasses} ${variantClasses} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};
