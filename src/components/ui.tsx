import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

import { registerBackHandler } from '@/lib/backHandler';

/* =========================================================================
   BUTTON
========================================================================= */
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

/* =========================================================================
   ICON BUTTON
========================================================================= */
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

/* =========================================================================
   DIALOG (MODAL)
========================================================================= */
export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg';
}

export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  children,
  actions,
  maxWidth = 'md',
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';

    const unregisterBack = registerBackHandler(() => {
      onClose();
      return true;
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
      unregisterBack();
    };
  }, [open, onClose]);

  if (!open) return null;

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-xl',
  }[maxWidth];

  const dialogContent = (
    <div
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
      }}
      className="fixed inset-0 z-70 flex items-center justify-center p-3.5 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="animate-fade-in fixed inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      {/* Surface Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        className={`relative z-10 w-full ${maxWidthClass} bg-surface-container-high border-outline-variant/30 animate-slide-up flex max-h-[calc(100dvh-2.5rem)] flex-col rounded-[24px] border p-4.5 shadow-2xl sm:max-h-[88vh] sm:rounded-[28px] sm:p-6`}
      >
        {title && (
          <div className="mb-2 flex shrink-0 items-center justify-between pb-3">
            <h3 className="text-on-surface text-lg font-bold tracking-tight sm:text-xl">{title}</h3>
            <IconButton size="sm" onClick={onClose} aria-label="Tutup">
              <X size={18} />
            </IconButton>
          </div>
        )}
        <div className="text-on-surface-variant flex-1 overflow-y-auto pr-1 text-sm">
          {children}
        </div>
        {actions && (
          <div className="border-outline-variant/20 mt-3 flex shrink-0 items-center justify-end gap-2 border-t pt-4">
            {actions}
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(dialogContent, document.body)
    : dialogContent;
};

/* =========================================================================
   SHEET (BOTTOM SHEET on Mobile, SIDE SHEET on Desktop/Tablet)
========================================================================= */
export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Sheet: React.FC<SheetProps> = ({ open, onClose, title, children, footer }) => {
  useEffect(() => {
    if (!open) return;

    const unregisterBack = registerBackHandler(() => {
      onClose();
      return true;
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      unregisterBack();
    };
  }, [open, onClose]);

  if (!open) return null;

  const sheetContent = (
    <div className="fixed inset-0 z-70 overflow-hidden">
      {/* Backdrop */}
      <div
        className="animate-fade-in fixed inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity"
        onClick={onClose}
      />

      {/* Mobile: Bottom Sheet | Desktop: Side Sheet */}
      <div className="bg-surface-container border-outline-variant/30 animate-slide-up fixed inset-x-0 bottom-0 flex h-[82vh] max-h-[85vh] flex-col rounded-t-[28px] border-t shadow-2xl transition-transform md:inset-x-auto md:top-0 md:right-0 md:bottom-0 md:h-full md:max-h-full md:w-105 md:rounded-t-none md:rounded-l-[28px] md:border-t-0 md:border-l lg:w-115">
        {/* Mobile drag handle */}
        <div className="bg-outline-variant mx-auto my-2 h-1 w-10 shrink-0 rounded-full md:hidden" />

        {/* Sheet Header */}
        <div className="border-outline-variant/20 flex shrink-0 items-center justify-between border-b px-4 py-3 sm:px-6">
          <div className="text-on-surface text-base font-semibold">{title}</div>
          <IconButton size="sm" onClick={onClose} aria-label="Tutup Panel">
            <X size={18} />
          </IconButton>
        </div>

        {/* Sheet Body */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">{children}</div>

        {/* Sheet Footer */}
        {footer && (
          <div className="border-outline-variant/20 bg-surface-container-high/50 border-t p-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(sheetContent, document.body) : sheetContent;
};

/* =========================================================================
   SEGMENTED BUTTON
========================================================================= */
export interface SegmentOption<T extends string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

export interface SegmentedButtonProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedButton<T extends string>({
  options,
  value,
  onChange,
  className = '',
}: SegmentedButtonProps<T>) {
  return (
    <div
      className={`bg-surface-container-high border-outline-variant/30 inline-flex rounded-full border p-1 ${className}`}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150 select-none ${
              isSelected
                ? 'bg-primary-container text-on-primary-container font-semibold shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest'
            }`}
          >
            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* =========================================================================
   FILTER CHIP
========================================================================= */
export interface ChipProps {
  label: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  count?: number;
}

export const Chip: React.FC<ChipProps> = ({ label, selected = false, onClick, count }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors select-none ${
        selected
          ? 'bg-secondary-container text-on-secondary-container border-transparent font-semibold shadow-2xs'
          : 'bg-surface-container-low text-on-surface-variant border-outline-variant/40 hover:bg-surface-container'
      }`}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={`py-0.2 rounded-full px-1.5 text-[10px] ${
            selected
              ? 'bg-secondary/20 text-on-secondary-container'
              : 'bg-outline-variant/30 text-on-surface-variant'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
};

/* =========================================================================
   SLIDER
========================================================================= */
export interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  valueDisplay?: string | number;
  onChange: (value: number) => void;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  valueDisplay,
  onChange,
}) => {
  return (
    <div className="space-y-1.5">
      <div className="text-on-surface-variant flex items-center justify-between text-xs">
        <span>{label}</span>
        <span className="text-on-surface font-semibold">{valueDisplay ?? value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="accent-primary bg-surface-container-highest h-1.5 w-full cursor-pointer appearance-none rounded-lg"
      />
    </div>
  );
};
