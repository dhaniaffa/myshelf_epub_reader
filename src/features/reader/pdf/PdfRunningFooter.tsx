import React from 'react';

export interface PdfRunningFooterProps {
  showBars: boolean;
  isEink: boolean;
  title?: string;
  currentPage: number;
  totalPages: number;
  percentage: number;
}

export const PdfRunningFooter: React.FC<PdfRunningFooterProps> = ({
  showBars,
  isEink,
  title,
  currentPage,
  totalPages,
  percentage,
}) => {
  return (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-[max(0.625rem,env(safe-area-inset-bottom))] z-10 mx-auto flex max-w-4xl items-center justify-between px-4 text-[11px] transition-opacity duration-300 select-none sm:bottom-3 sm:px-8 ${
        showBars ? 'opacity-0' : 'opacity-100'
      } ${isEink ? 'text-on-surface font-bold' : 'text-on-surface-variant/75 font-medium'}`}
    >
      <span className="max-w-[45%] truncate opacity-85">{title || 'PDF Document'}</span>

      <div className="ml-auto flex shrink-0 items-center gap-2 font-mono text-[11px]">
        <span>
          Hal {currentPage} dari {totalPages}
        </span>
        <span className="text-outline">·</span>
        <span>{Math.round(percentage * 100)}%</span>
      </div>
    </div>
  );
};
