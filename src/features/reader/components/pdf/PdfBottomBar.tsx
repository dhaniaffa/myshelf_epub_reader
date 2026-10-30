import React from 'react';
import { FileText, Maximize2, ScrollText, ZoomIn, ZoomOut } from 'lucide-react';

export interface PdfBottomBarProps {
  show: boolean;
  isEink: boolean;
  currentPage: number;
  totalPages: number;
  percentage: number;
  readingSpeedWpm: number;
  scrollMode: 'vertical' | 'single';
  fitMode: 'width' | 'page' | 'custom';
  scale: number;
  onJumpToPage: (page: number) => void;
  onToggleScrollMode: () => void;
  onToggleFitMode: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

export const PdfBottomBar: React.FC<PdfBottomBarProps> = ({
  show,
  isEink,
  currentPage,
  totalPages,
  percentage,
  readingSpeedWpm,
  scrollMode,
  fitMode,
  scale,
  onJumpToPage,
  onToggleScrollMode,
  onToggleFitMode,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}) => {
  const estimatedRemainingMinutes =
    totalPages > currentPage
      ? Math.max(1, Math.round(((totalPages - currentPage) * 250) / (readingSpeedWpm || 220)))
      : null;

  return (
    <footer
      className={`fixed inset-x-0 bottom-0 z-30 select-none ${
        isEink
          ? 'bg-surface border-on-surface border-t-2'
          : 'bg-surface-container/95 border-outline-variant/30 border-t backdrop-blur-md'
      } flex flex-col gap-2 px-3 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] transition-transform duration-300 sm:px-4 sm:py-2.5 ${
        show ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      {/* 1. Jump to Page & Reading Progress Slider */}
      <div className="mx-auto flex w-full max-w-xl items-center gap-2 sm:gap-3">
        <span className="text-on-surface-variant min-w-[48px] shrink-0 text-left font-mono text-[11px] font-medium">
          {currentPage} <span className="opacity-60">/ {totalPages}</span>
        </span>
        <input
          type="range"
          min={1}
          max={totalPages || 1}
          value={currentPage}
          onChange={(e) => onJumpToPage(parseInt(e.target.value, 10))}
          className="accent-primary bg-surface-container-highest h-1.5 flex-1 cursor-pointer rounded-lg"
          aria-label="Penggeser Halaman"
        />
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-on-surface min-w-[30px] text-right font-mono text-[11px] font-semibold">
            {Math.round(percentage * 100)}%
          </span>
          {estimatedRemainingMinutes !== null && (
            <span className="text-primary bg-primary/10 rounded-md px-1.5 py-0.5 font-sans text-[10px] font-medium whitespace-nowrap">
              ~{estimatedRemainingMinutes} mnt
            </span>
          )}
        </div>
      </div>

      {/* 2. Controls Toolbar: Scroll Mode, Fit Mode & Compact Zoom Stepper */}
      <div className="border-outline-variant/20 mx-auto flex w-full max-w-xl items-center justify-between gap-1.5 border-t pt-1.5 sm:gap-2">
        {/* Left: Reading Modes */}
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          {/* Scroll Mode Toggle */}
          <button
            type="button"
            onClick={onToggleScrollMode}
            className="bg-surface-container-highest hover:bg-surface-container text-on-surface inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors"
            title="Ganti Mode Tampilan (Scroll Vertikal / Per Halaman)"
          >
            {scrollMode === 'vertical' ? (
              <>
                <ScrollText size={14} className="text-primary shrink-0" />
                <span className="hidden sm:inline">Scroll </span>
                <span>Vertikal</span>
              </>
            ) : (
              <>
                <FileText size={14} className="text-primary shrink-0" />
                <span>Per Halaman</span>
              </>
            )}
          </button>

          {/* Fit Width Toggle */}
          <button
            type="button"
            onClick={onToggleFitMode}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              fitMode === 'width'
                ? 'bg-primary/15 text-primary font-semibold'
                : 'bg-surface-container-highest hover:bg-surface-container text-on-surface'
            }`}
            title="Mode Lebar Halaman Penuh"
          >
            <Maximize2 size={13} className="shrink-0" />
            <span>Pas Lebar</span>
          </button>
        </div>

        {/* Right: Integrated Zoom Stepper Pill */}
        <div className="bg-surface-container-highest border-outline-variant/30 flex shrink-0 items-center rounded-lg border p-0.5 shadow-2xs">
          <button
            type="button"
            onClick={onZoomOut}
            className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container flex h-6 w-6 cursor-pointer items-center justify-center rounded transition-colors active:scale-95"
            title="Perkecil (-)"
            aria-label="Perkecil"
          >
            <ZoomOut size={13} />
          </button>
          <button
            type="button"
            onClick={onResetZoom}
            className="text-on-surface hover:bg-surface-container cursor-pointer px-1.5 font-mono text-[11px] font-semibold transition-colors"
            title="Reset Ukuran (100%)"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            type="button"
            onClick={onZoomIn}
            className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container flex h-6 w-6 cursor-pointer items-center justify-center rounded transition-colors active:scale-95"
            title="Perbesar (+)"
            aria-label="Perbesar"
          >
            <ZoomIn size={13} />
          </button>
        </div>
      </div>
    </footer>
  );
};
