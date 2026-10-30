import React from 'react';
import { BookOpen, Maximize2, Minimize2, Scroll } from 'lucide-react';

import { useSettingsStore } from '@/store/settings';

import type { PdfFitMode, PdfScrollMode } from '@/types';

export interface PdfLayoutSectionProps {
  scrollMode?: PdfScrollMode;
  onScrollModeChange?: (mode: PdfScrollMode) => void;
  fitMode?: 'width' | 'page' | 'custom';
  onFitModeChange?: (mode: 'width' | 'page') => void;
}

export const PdfLayoutSection: React.FC<PdfLayoutSectionProps> = ({
  scrollMode,
  onScrollModeChange,
  fitMode,
  onFitModeChange,
}) => {
  const settings = useSettingsStore();

  const currentPdfScrollMode: PdfScrollMode = scrollMode || settings.pdfScrollMode || 'vertical';
  const currentPdfFitMode: 'width' | 'page' | 'custom' = fitMode || settings.pdfFitMode || 'width';

  const handlePdfScrollModeSelect = (mode: PdfScrollMode) => {
    settings.setPdfScrollMode(mode);
    onScrollModeChange?.(mode);
  };

  const handlePdfFitModeSelect = (mode: PdfFitMode) => {
    settings.setPdfFitMode(mode);
    onFitModeChange?.(mode);
  };

  return (
    <>
      {/* PDF SCROLL MODE */}
      <div className="space-y-2">
        <label className="text-on-surface block text-xs font-semibold tracking-wider uppercase">
          Mode Aliran Halaman PDF
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handlePdfScrollModeSelect('vertical')}
            className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
              currentPdfScrollMode === 'vertical'
                ? 'bg-primary-container text-on-primary-container border-primary ring-primary font-semibold shadow-xs ring-1'
                : 'bg-surface-container-low text-on-surface border-outline-variant/30 hover:bg-surface-container-high'
            }`}
          >
            <div
              className={`shrink-0 rounded-xl p-2 transition-colors ${
                currentPdfScrollMode === 'vertical'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-highest text-on-surface-variant'
              }`}
            >
              <Scroll size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs leading-tight font-bold">Scroll Vertikal</div>
              <div
                className={`mt-0.5 text-[10px] leading-tight ${
                  currentPdfScrollMode === 'vertical'
                    ? 'text-on-primary-container/80'
                    : 'text-on-surface-variant'
                }`}
              >
                Halaman mengalir ke bawah
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handlePdfScrollModeSelect('single')}
            className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
              currentPdfScrollMode === 'single'
                ? 'bg-primary-container text-on-primary-container border-primary ring-primary font-semibold shadow-xs ring-1'
                : 'bg-surface-container-low text-on-surface border-outline-variant/30 hover:bg-surface-container-high'
            }`}
          >
            <div
              className={`shrink-0 rounded-xl p-2 transition-colors ${
                currentPdfScrollMode === 'single'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-highest text-on-surface-variant'
              }`}
            >
              <BookOpen size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs leading-tight font-bold">Per Halaman</div>
              <div
                className={`mt-0.5 text-[10px] leading-tight ${
                  currentPdfScrollMode === 'single'
                    ? 'text-on-primary-container/80'
                    : 'text-on-surface-variant'
                }`}
              >
                Buka satu demi satu
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* PDF PAGE FIT MODE */}
      <div className="space-y-2">
        <label className="text-on-surface block text-xs font-semibold tracking-wider uppercase">
          Kesesuaian Ukuran Layar (Fit Mode)
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handlePdfFitModeSelect('width')}
            className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
              currentPdfFitMode === 'width'
                ? 'bg-primary-container text-on-primary-container border-primary ring-primary font-semibold shadow-xs ring-1'
                : 'bg-surface-container-low text-on-surface border-outline-variant/30 hover:bg-surface-container-high'
            }`}
          >
            <div
              className={`shrink-0 rounded-xl p-2 transition-colors ${
                currentPdfFitMode === 'width'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-highest text-on-surface-variant'
              }`}
            >
              <Maximize2 size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs leading-tight font-bold">Pas Lebar (Fit Width)</div>
              <div
                className={`mt-0.5 text-[10px] leading-tight ${
                  currentPdfFitMode === 'width'
                    ? 'text-on-primary-container/80'
                    : 'text-on-surface-variant'
                }`}
              >
                Teks maksimal selebar layar
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handlePdfFitModeSelect('page')}
            className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
              currentPdfFitMode === 'page'
                ? 'bg-primary-container text-on-primary-container border-primary ring-primary font-semibold shadow-xs ring-1'
                : 'bg-surface-container-low text-on-surface border-outline-variant/30 hover:bg-surface-container-high'
            }`}
          >
            <div
              className={`shrink-0 rounded-xl p-2 transition-colors ${
                currentPdfFitMode === 'page'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-highest text-on-surface-variant'
              }`}
            >
              <Minimize2 size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs leading-tight font-bold">Satu Lembar (Fit Page)</div>
              <div
                className={`mt-0.5 text-[10px] leading-tight ${
                  currentPdfFitMode === 'page'
                    ? 'text-on-primary-container/80'
                    : 'text-on-surface-variant'
                }`}
              >
                Seluruh halaman terlihat utuh
              </div>
            </div>
          </button>
        </div>
      </div>
    </>
  );
};
