import React from 'react';
import { Palette } from 'lucide-react';

import { ThemeSegmented } from '@/components/ThemeSegmented';
import { useSettingsStore } from '@/store/settings';

export const AppearanceSection: React.FC = () => {
  const { theme, setTheme } = useSettingsStore();

  return (
    <section className="bg-surface-container border-outline-variant/30 space-y-4 rounded-3xl border p-6 shadow-xs sm:p-7">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl">
          <Palette size={20} />
        </div>
        <div>
          <h2 className="text-on-surface text-base font-bold">Tema & Warna Tampilan</h2>
          <p className="text-on-surface-variant text-xs">
            Pilih tema warna aplikasi atau sinkronkan dengan tema sistem operasi.
          </p>
        </div>
      </div>

      <div className="w-full pt-2">
        <ThemeSegmented theme={theme} onChange={setTheme} className="w-full" />
      </div>
    </section>
  );
};
