import React from 'react';

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
