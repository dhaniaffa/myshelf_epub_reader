import React from 'react';

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
