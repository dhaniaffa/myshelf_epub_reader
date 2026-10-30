import React from 'react';
import { RotateCcw } from 'lucide-react';

import { Button, Sheet } from '@/components/ui';
import { useSettingsReset } from './hooks/useSettingsReset';
import { EinkOptimizationSection } from './sections/EinkOptimizationSection';
import { EpubLayoutSection } from './sections/EpubLayoutSection';
import { EpubTypographySection } from './sections/EpubTypographySection';
import { PdfLayoutSection } from './sections/PdfLayoutSection';
import { PdfPageColorSection } from './sections/PdfPageColorSection';
import { PdfZoomSection } from './sections/PdfZoomSection';
import { ReaderThemeSection } from './sections/ReaderThemeSection';

export interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
  onFlashRefresh?: () => void;
  format?: 'epub' | 'pdf';
  // PDF specific controls (when opened from PDF reader)
  pdfScrollMode?: 'vertical' | 'single';
  onPdfScrollModeChange?: (mode: 'vertical' | 'single') => void;
  pdfFitMode?: 'width' | 'page' | 'custom';
  onPdfFitModeChange?: (mode: 'width' | 'page') => void;
  pdfScale?: number;
  onPdfScaleChange?: (scale: number) => void;
  onPdfZoomIn?: () => void;
  onPdfZoomOut?: () => void;
  onPdfResetZoom?: () => void;
}

export const SettingsSheet: React.FC<SettingsSheetProps> = ({
  open,
  onClose,
  onFlashRefresh,
  format = 'epub',
  pdfScrollMode,
  onPdfScrollModeChange,
  pdfFitMode,
  onPdfFitModeChange,
  pdfScale,
  onPdfScaleChange,
  onPdfZoomIn,
  onPdfZoomOut,
  onPdfResetZoom,
}) => {
  const isPdf = format === 'pdf';
  const { handleResetSettings } = useSettingsReset({
    format,
    onPdfResetZoom,
    onPdfFitModeChange,
    onPdfScrollModeChange,
  });

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isPdf ? 'Pengaturan PDF' : 'Pengaturan EPUB'}
      footer={
        <div className="flex w-full items-center justify-between">
          <Button
            variant="text"
            size="sm"
            icon={<RotateCcw size={14} />}
            onClick={handleResetSettings}
          >
            Atur Ulang
          </Button>
          <Button variant="filled" size="sm" onClick={onClose}>
            Selesai
          </Button>
        </div>
      }
    >
      <div className="space-y-6 pb-2">
        {!isPdf ? (
          <div className="animate-fade-in space-y-6">
            <ReaderThemeSection label="Tema Tampilan" />
            <EpubLayoutSection />
            <EpubTypographySection />
            <EinkOptimizationSection format="epub" onFlashRefresh={onFlashRefresh} />
          </div>
        ) : (
          <div className="animate-fade-in space-y-6">
            <ReaderThemeSection
              label="Tema Pembaca"
              description="Warna tema untuk antarmuka pembaca dan bilah menu."
            />
            <PdfPageColorSection />
            <PdfLayoutSection
              scrollMode={pdfScrollMode}
              onScrollModeChange={onPdfScrollModeChange}
              fitMode={pdfFitMode}
              onFitModeChange={onPdfFitModeChange}
            />
            <PdfZoomSection
              scale={pdfScale}
              onScaleChange={onPdfScaleChange}
              onZoomIn={onPdfZoomIn}
              onZoomOut={onPdfZoomOut}
              onResetZoom={onPdfResetZoom}
            />
            <EinkOptimizationSection format="pdf" onFlashRefresh={onFlashRefresh} />
          </div>
        )}
      </div>
    </Sheet>
  );
};
