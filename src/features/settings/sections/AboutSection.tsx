import React from 'react';
import { Sparkles } from 'lucide-react';

import { AppLogo } from '@/components/icons/AppLogo';
import { APP_FULL_NAME, APP_VERSION } from '@/config';

export const AboutSection: React.FC = () => {
  return (
    <section className="bg-surface-container-low border-outline-variant/20 flex items-start gap-4 rounded-3xl border p-6">
      <div className="bg-primary/10 text-primary mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl">
        <AppLogo size={24} className="text-primary" />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <h3 className="text-on-surface text-base font-bold">{APP_FULL_NAME}</h3>
          <span className="text-on-surface-variant bg-surface-container-highest rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold">
            v{APP_VERSION}
          </span>
        </div>
        <p className="text-on-surface-variant text-xs leading-relaxed">
          Aplikasi pembaca buku digital (EPUB & PDF) modern yang berjalan 100% di browser Anda
          (Client-Side). Seluruh berkas, riwayat membaca, catatan, dan statistik tersimpan aman di
          perangkat lokal Anda tanpa pengumpulan telemetri atau pelacakan.
        </p>
        <div className="text-primary flex items-center gap-2 pt-2 text-[11px] font-medium">
          <Sparkles size={14} />
          <span>Mendukung Progressive Web App (PWA) & Penggunaan Luring (Offline) Penuh</span>
        </div>
      </div>
    </section>
  );
};
