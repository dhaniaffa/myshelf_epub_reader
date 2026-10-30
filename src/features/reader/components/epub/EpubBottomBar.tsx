import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { IconButton } from '@/components/ui';

export interface EpubBottomBarProps {
  showBars: boolean;
  percentage: number;
  formattedPageRange: string;
  totalPages: number;
  totalLocations: number;
  currentLocation?: number;
  chapterTitle?: string;
  formattedRemainingTime: string | null;
  onPrev: () => void;
  onNext: () => void;
  onGoToPercentage: (pct: number) => void;
}

export const EpubBottomBar: React.FC<EpubBottomBarProps> = ({
  showBars,
  percentage,
  formattedPageRange,
  totalPages,
  totalLocations,
  currentLocation,
  chapterTitle,
  formattedRemainingTime,
  onPrev,
  onNext,
  onGoToPercentage,
}) => {
  return (
    <footer
      className={`bg-surface-container/95 border-outline-variant/30 fixed inset-x-0 bottom-0 z-30 flex flex-col gap-2 border-t px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] backdrop-blur-md transition-transform duration-300 sm:px-8 sm:pb-3 ${
        showBars ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      {/* Slider & Quick Page Step */}
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3 sm:gap-4">
        <IconButton size="sm" onClick={onPrev} title="Halaman Sebelumnya">
          <ChevronLeft size={20} />
        </IconButton>

        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={percentage}
          onChange={(e) => onGoToPercentage(parseFloat(e.target.value))}
          title={`Halaman ${formattedPageRange}${totalPages > 0 ? ` / ${totalPages}` : ''} (${Math.round(percentage * 100)}%)`}
          className="accent-primary bg-surface-container-highest h-1.5 flex-1 cursor-pointer appearance-none rounded-lg"
        />

        <IconButton size="sm" onClick={onNext} title="Halaman Berikutnya">
          <ChevronRight size={20} />
        </IconButton>
      </div>

      {/* Reading Progress Indicator */}
      <div className="text-on-surface-variant mx-auto flex w-full max-w-3xl items-center justify-between gap-2.5 px-1 text-[11px] select-none sm:px-2 sm:text-xs">
        {/* Chapter / Book Title */}
        <span
          className="min-w-0 flex-1 truncate text-left font-medium"
          title={chapterTitle || 'Membaca'}
        >
          {chapterTitle || 'Membaca'}
        </span>

        {/* Page Info, Percentage, and Time Badge */}
        <div className="flex shrink-0 items-center gap-2 font-medium whitespace-nowrap">
          {totalPages > 0 ? (
            <span>
              <span className="hidden sm:inline">Hal </span>
              <span className="text-on-surface font-semibold">{formattedPageRange}</span>
              <span className="opacity-70"> / {totalPages}</span>
            </span>
          ) : totalLocations > 0 ? (
            <span>
              <span className="hidden sm:inline">Lokasi </span>
              <span className="text-on-surface font-semibold">{currentLocation}</span>
              <span className="opacity-70"> / {totalLocations}</span>
            </span>
          ) : null}

          <span className="bg-outline-variant/40 h-3 w-px shrink-0 opacity-60" />

          <span className="text-on-surface font-bold">{Math.round(percentage * 100)}%</span>

          {formattedRemainingTime && (
            <span
              className="text-primary bg-primary/10 rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
              title={`Estimasi waktu tersisa: ${formattedRemainingTime}`}
            >
              {formattedRemainingTime}
            </span>
          )}
        </div>
      </div>
    </footer>
  );
};
