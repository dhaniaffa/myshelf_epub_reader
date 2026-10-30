import React from 'react';
import { Check, Monitor } from 'lucide-react';

import { useSettingsStore } from '@/store/settings';
import { PDF_PAGE_COLOR_OPTIONS } from '../constants';

export const PdfPageColorSection: React.FC = () => {
  const settings = useSettingsStore();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-on-surface text-xs font-semibold tracking-wider uppercase">
          Warna Halaman PDF
        </label>
        <span className="text-on-surface-variant text-[10px] font-medium">
          {(settings.pdfPageColor || 'auto') === 'light'
            ? 'Putih / Terang (Asli)'
            : (settings.pdfPageColor || 'auto') === 'dark'
              ? 'Gelap / Malam (Invert)'
              : (settings.pdfPageColor || 'auto') === 'sepia'
                ? 'Sepia Hangat'
                : 'Otomatis (Ikuti Tema)'}
        </span>
      </div>
      <p className="text-on-surface-variant text-[11px]">
        Warna lembar dokumen PDF (halaman bisa tetap putih meski tema gelap, atau sebaliknya).
      </p>
      <div className="grid grid-cols-4 gap-2.5">
        {PDF_PAGE_COLOR_OPTIONS.map((opt) => {
          const isSelected = (settings.pdfPageColor || 'auto') === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              title={opt.fullName}
              onClick={() => settings.setPdfPageColor(opt.id)}
              className={`group flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl p-1 transition-all ${
                isSelected ? 'scale-102' : 'opacity-85 hover:scale-101 hover:opacity-100'
              }`}
            >
              <div
                className={`relative flex aspect-square w-full items-center justify-center rounded-2xl border text-sm font-bold shadow-xs transition-all ${
                  isSelected
                    ? 'ring-primary ring-offset-surface-container border-primary shadow-sm ring-2 ring-offset-2'
                    : 'border-outline-variant/40 hover:border-outline'
                } ${opt.isAuto ? 'bg-surface-container-high text-on-surface' : ''}`}
                style={
                  opt.bg && opt.fg
                    ? {
                        backgroundColor: opt.bg,
                        color: opt.fg,
                      }
                    : undefined
                }
              >
                {opt.isAuto ? (
                  <Monitor size={18} className="opacity-80" />
                ) : (
                  <>
                    <span className="font-serif text-base tracking-tight">Aa</span>
                    {opt.accent && (
                      <span
                        className="absolute bottom-1.5 left-1.5 h-2 w-2 rounded-full shadow-xs"
                        style={{ backgroundColor: opt.accent }}
                      />
                    )}
                  </>
                )}
                {isSelected && (
                  <div className="bg-primary text-on-primary absolute top-1.5 right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full shadow-xs">
                    <Check size={9} strokeWidth={3.5} />
                  </div>
                )}
              </div>
              <span
                className={`max-w-full truncate text-center text-[11px] ${
                  isSelected ? 'text-primary font-bold' : 'text-on-surface-variant font-medium'
                }`}
              >
                {opt.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
