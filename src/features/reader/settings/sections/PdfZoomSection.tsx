import React from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';

import { useSettingsStore } from '@/store/settings';

export interface PdfZoomSectionProps {
  scale?: number;
  onScaleChange?: (scale: number) => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
}

export const PdfZoomSection: React.FC<PdfZoomSectionProps> = ({
  scale,
  onScaleChange,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}) => {
  const settings = useSettingsStore();
  const currentPdfScale: number = scale !== undefined ? scale : settings.pdfScale || 1.0;

  const handlePdfScaleChange = (newScale: number) => {
    const clamped = Math.max(0.5, Math.min(3.0, Math.round(newScale * 100) / 100));
    settings.setPdfScale(clamped);
    if (onScaleChange) {
      onScaleChange(clamped);
    } else if (clamped === 1.0 && onResetZoom) {
      onResetZoom();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <label className="text-on-surface font-semibold tracking-wider uppercase">
          Perbesaran Dokumen (Zoom)
        </label>
        <span className="text-primary bg-primary/10 rounded-full px-2.5 py-0.5 font-mono text-xs font-bold">
          {Math.round(currentPdfScale * 100)}%
        </span>
      </div>

      <div className="bg-surface-container-low border-outline-variant/30 flex items-center justify-between gap-3 rounded-2xl border p-2.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (onZoomOut) {
                onZoomOut();
              } else {
                settings.setPdfScale(Math.max(0.5, currentPdfScale - 0.15));
              }
            }}
            className="bg-surface-container-high hover:bg-surface-container-highest text-on-surface flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl transition-colors"
            title="Perkecil Dokumen (Zoom Out)"
          >
            <ZoomOut size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (onZoomIn) {
                onZoomIn();
              } else {
                settings.setPdfScale(Math.min(3.0, currentPdfScale + 0.15));
              }
            }}
            className="bg-surface-container-high hover:bg-surface-container-highest text-on-surface flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl transition-colors"
            title="Perbesar Dokumen (Zoom In)"
          >
            <ZoomIn size={16} />
          </button>
        </div>

        <div className="flex items-center gap-1">
          {[0.8, 1.0, 1.25, 1.5].map((s) => {
            const isSelected = Math.abs(currentPdfScale - s) < 0.05;
            return (
              <button
                key={s}
                type="button"
                onClick={() => handlePdfScaleChange(s)}
                className={`cursor-pointer rounded-lg px-2 py-1 font-mono text-[11px] font-semibold transition-all ${
                  isSelected
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'bg-surface-container-highest text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {Math.round(s * 100)}%
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
