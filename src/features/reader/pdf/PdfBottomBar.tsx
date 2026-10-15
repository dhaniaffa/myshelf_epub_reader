import React from 'react';
import { FileText, Maximize2, ScrollText, ZoomIn, ZoomOut } from 'lucide-react';

import { IconButton } from '@/components/ui';

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
      } flex flex-col gap-2 px-4 py-2.5 transition-transform duration-300 ${
        show ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="mx-auto flex w-full max-w-xl items-center gap-3">
        {/* Jump to Page Slider */}
        <span className="text-on-surface-variant shrink-0 font-mono text-[11px]">
          {currentPage} / {totalPages}
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
          <span className="text-on-surface-variant font-mono text-[11px]">
            {Math.round(percentage * 100)}%
          </span>
          {estimatedRemainingMinutes !== null && (
            <span className="text-primary bg-primary/10 rounded-md px-1.5 py-0.5 font-sans text-[10px]">
              ~{estimatedRemainingMinutes} mnt
            </span>
          )}
        </div>
      </div>

      {/* Zoom, Fit Mode & Scroll Mode Controls */}
      <div className="border-outline-variant/20 flex flex-wrap items-center justify-center gap-2 border-t pt-1">
        {/* Scroll Mode Toggle */}
        <button
          type="button"
          onClick={onToggleScrollMode}
          className="bg-surface-container-highest hover:bg-surface-container text-on-surface inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium"
          title="Ganti Mode Tampilan (Scroll Vertikal / Per Halaman)"
        >
          {scrollMode === 'vertical' ? (
            <>
              <ScrollText size={14} className="text-primary" />
              <span>Scroll Vertikal</span>
            </>
          ) : (
            <>
              <FileText size={14} className="text-primary" />
              <span>Per Halaman</span>
            </>
          )}
        </button>

        {/* Fit Width Button */}
        <button
          type="button"
          onClick={onToggleFitMode}
          className={`hover:bg-surface-container inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ${
            fitMode === 'width'
              ? 'bg-primary/15 text-primary'
              : 'bg-surface-container-highest text-on-surface'
          }`}
          title="Mode Lebar Halaman Penuh"
        >
          <Maximize2 size={13} />
          <span>Pas Lebar</span>
        </button>

        <div className="bg-outline-variant/30 mx-1 h-4 w-px" />

        {/* Zoom Buttons */}
        <IconButton size="sm" onClick={onZoomOut} title="Perkecil (-)">
          <ZoomOut size={16} />
        </IconButton>
        <button
          type="button"
          onClick={onResetZoom}
          className="bg-surface-container-highest hover:bg-surface-container text-on-surface cursor-pointer rounded px-2 py-1 font-mono text-xs font-medium"
          title="Reset Ukuran (100%)"
        >
          {Math.round(scale * 100)}%
        </button>
        <IconButton size="sm" onClick={onZoomIn} title="Perbesar (+)">
          <ZoomIn size={16} />
        </IconButton>
      </div>
    </footer>
  );
};
