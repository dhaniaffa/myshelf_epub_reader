import React from 'react';

export interface EpubRunningFooterProps {
  showBars: boolean;
  showTTSBar: boolean;
  isEink: boolean;
  maxWidthClass: string;
  stagePaddingClass: string;
  chapterTitle?: string;
  bookTitle?: string;
  formattedPageRange: string;
  totalPages: number;
  percentage: number;
}

export const EpubRunningFooter: React.FC<EpubRunningFooterProps> = ({
  showBars,
  showTTSBar,
  isEink,
  maxWidthClass,
  stagePaddingClass,
  chapterTitle,
  bookTitle,
  formattedPageRange,
  totalPages,
  percentage,
}) => {
  return (
    <div
      className={`absolute inset-x-0 bottom-2.5 sm:bottom-3 ${maxWidthClass} mx-auto ${stagePaddingClass} pointer-events-none z-10 flex items-center justify-between text-[11px] transition-opacity duration-300 select-none ${
        showBars || showTTSBar ? 'opacity-0' : 'opacity-100'
      } ${isEink ? 'text-on-surface font-bold' : 'text-on-surface-variant/75 font-medium'}`}
    >
      {/* Chapter / Book Title in bottom left corner */}
      <span className="max-w-[45%] truncate opacity-85">{chapterTitle || bookTitle || ''}</span>

      {/* Page Indicator in bottom right corner */}
      <div className="ml-auto flex shrink-0 items-center gap-2 font-mono text-[11px]">
        {totalPages > 0 ? (
          <span className="text-on-surface font-semibold">
            Hal {formattedPageRange} / {totalPages}
          </span>
        ) : (
          <span className="text-on-surface font-semibold">Hal {formattedPageRange}</span>
        )}
        <span className="font-sans text-[10px] opacity-70">· {Math.round(percentage * 100)}%</span>
      </div>
    </div>
  );
};
