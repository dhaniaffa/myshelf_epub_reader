import React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'standard' | 'filled' | 'tonal' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  children,
  variant = 'standard',
  size = 'md',
  active = false,
  className = '',
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center rounded-full transition-all duration-150 select-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 active:scale-95';

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
  }[size];

  const variantClasses = {
    standard: active
      ? 'bg-primary/15 text-primary'
      : 'text-on-surface-variant hover:text-on-surface hover:bg-on-surface/8',
    filled: 'bg-primary text-on-primary hover:opacity-95',
    tonal: 'bg-secondary-container text-on-secondary-container hover:opacity-90',
    outlined: 'border border-outline/30 text-on-surface-variant hover:bg-on-surface/8',
  }[variant];

  return (
    <button className={`${base} ${sizeClasses} ${variantClasses} ${className}`} {...props}>
      {children}
    </button>
  );
};
