import React from 'react';
import { Bold, RefreshCw, Tablet, Volume2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { useSettingsStore } from '@/store/settings';

export interface EinkOptimizationSectionProps {
  format?: 'epub' | 'pdf';
  onFlashRefresh?: () => void;
}

export const EinkOptimizationSection: React.FC<EinkOptimizationSectionProps> = ({
  format = 'epub',
  onFlashRefresh,
}) => {
  const settings = useSettingsStore();
  const isPdf = format === 'pdf';

  const handleToggleEink = () => {
    const nextVal = !settings.einkMode;
    settings.setEinkMode(nextVal);
    if (nextVal && settings.theme !== 'eink-light' && settings.theme !== 'eink-dark') {
      settings.setTheme('eink-light');
    }
  };

  return (
    <div className="border-outline-variant/30 space-y-3 border-t pt-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Tablet size={15} className="text-primary" />
          <label className="text-on-surface text-xs font-bold tracking-wider uppercase">
            {isPdf ? 'Navigasi & Layar E-Ink PDF' : 'Optimasi E-Ink & E-Reader'}
          </label>
        </div>
        {settings.einkMode && (
          <span className="text-primary bg-primary/10 rounded-full px-2 py-0.5 text-[10px] font-semibold">
            Mode E-Ink Aktif
          </span>
        )}
      </div>

      {/* For PDF: Volume buttons first, or for EPUB: E-Ink toggle first */}
      {!isPdf && (
        <div className="bg-surface-container-low border-outline-variant/30 flex items-center justify-between gap-3 rounded-2xl border p-3">
          <div>
            <div className="text-on-surface text-xs font-bold">
              Mode Layar E-Ink (Bebas Animasi)
            </div>
            <div className="text-on-surface-variant mt-0.5 text-[10px]">
              Menonaktifkan animasi & transisi CSS untuk mencegah flicker dan ghosting pada layar
              e-paper.
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleEink}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              settings.einkMode ? 'bg-primary' : 'bg-surface-container-highest'
            }`}
          >
            <span
              className={`bg-surface pointer-events-none inline-block h-5 w-5 transform rounded-full shadow-xs ring-0 transition duration-200 ease-in-out ${
                settings.einkMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      )}

      {/* Volume Button Navigation Toggle */}
      <div className="bg-surface-container-low border-outline-variant/30 flex items-center justify-between gap-3 rounded-2xl border p-3">
        <div className="flex items-start gap-2.5">
          <Volume2 size={16} className="text-primary mt-0.5 shrink-0" />
          <div>
            <div className="text-on-surface text-xs font-bold">Navigasi Tombol Volume Fisik</div>
            <div className="text-on-surface-variant mt-0.5 text-[10px]">
              Tombol Volume Turun = Halaman Maju, Volume Naik = Halaman Mundur.
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => settings.setVolumeKeysNavigation(!settings.volumeKeysNavigation)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            settings.volumeKeysNavigation ? 'bg-primary' : 'bg-surface-container-highest'
          }`}
        >
          <span
            className={`bg-surface pointer-events-none inline-block h-5 w-5 transform rounded-full shadow-xs ring-0 transition duration-200 ease-in-out ${
              settings.volumeKeysNavigation ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* For PDF: E-Ink toggle */}
      {isPdf && (
        <div className="bg-surface-container-low border-outline-variant/30 flex items-center justify-between gap-3 rounded-2xl border p-3">
          <div>
            <div className="text-on-surface text-xs font-bold">
              Mode Layar E-Ink (Bebas Animasi)
            </div>
            <div className="text-on-surface-variant mt-0.5 text-[10px]">
              Optimasi pembacaan PDF monokrom tanpa transisi berat untuk mencegah ghosting.
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleEink}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              settings.einkMode ? 'bg-primary' : 'bg-surface-container-highest'
            }`}
          >
            <span
              className={`bg-surface pointer-events-none inline-block h-5 w-5 transform rounded-full shadow-xs ring-0 transition duration-200 ease-in-out ${
                settings.einkMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      )}

      {/* Font Boldness Options (EPUB only) */}
      {!isPdf && (
        <div className="space-y-1.5">
          <div className="text-on-surface flex items-center gap-1.5 text-xs font-semibold">
            <Bold size={13} className="text-primary" />
            <span>Ketebalan Teks (Font Boldness)</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { val: 'normal', label: 'Normal', desc: 'Standar' },
              { val: 'high', label: 'Tebal', desc: 'Kontras Tinggi' },
              { val: 'maximum', label: 'Maksimum', desc: 'Sangat Pekat' },
            ].map((opt) => {
              const isSelected = (settings.textContrast || 'normal') === opt.val;
              return (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() =>
                    settings.setTextContrast(opt.val as NonNullable<typeof settings.textContrast>)
                  }
                  className={`cursor-pointer rounded-xl border p-2 text-center transition-all ${
                    isSelected
                      ? 'bg-primary-container text-on-primary-container border-primary font-bold shadow-2xs'
                      : 'bg-surface-container-low text-on-surface border-outline-variant/30 hover:bg-surface-container-high'
                  }`}
                >
                  <div className="text-xs leading-tight font-bold">{opt.label}</div>
                  <div className="text-on-surface-variant mt-0.5 text-[9px] opacity-80">
                    {opt.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Clear Screen Button (Flash Screen Refresh) */}
      {onFlashRefresh && (
        <div className="pt-1">
          <Button
            variant="outlined"
            size="sm"
            icon={<RefreshCw size={14} />}
            onClick={onFlashRefresh}
            className="w-full justify-center"
          >
            Bersihkan Layar E-Ink (Hapus Ghosting)
          </Button>
        </div>
      )}
    </div>
  );
};
