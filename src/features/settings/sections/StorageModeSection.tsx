import React from 'react';
import { Database, HardDrive, HelpCircle, Link2 } from 'lucide-react';

import { isWebBrowser } from '@/lib/platform';
import { useSettingsStore } from '@/store/settings';

export const StorageModeSection: React.FC = () => {
  const isWeb = isWebBrowser();
  const importStorageMode = useSettingsStore((s) => s.importStorageMode || 'linked');
  const setImportStorageMode = useSettingsStore((s) => s.setImportStorageMode);

  return (
    <section className="bg-surface-container-low border-outline-variant/30 rounded-3xl border p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl">
            <HardDrive size={20} />
          </div>
          <div>
            <h2 className="text-on-surface text-base font-semibold">Mode Penyimpanan Buku</h2>
            <p className="text-on-surface-variant text-xs">
              Strategi alokasi memori berkas EPUB & PDF saat ditambahkan ke rak buku
            </p>
          </div>
        </div>
      </div>

      {isWeb ? (
        <div className="bg-surface-container-high border-outline-variant/30 text-on-surface-variant flex items-start gap-3 rounded-2xl border p-4 text-xs">
          <HelpCircle size={18} className="text-primary mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-on-surface font-medium">Otomatis Vault Mode (IndexedDB)</p>
            <p className="leading-relaxed">
              Pada Web Browser, berkas buku disalin seutuhnya ke penyimpanan lokal terisolasi
              (IndexedDB) demi mematuhi batasan keamanan browser dan menjamin buku dapat dibaca 100%
              offline.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Linked Mode Option */}
          <button
            type="button"
            onClick={() => setImportStorageMode('linked')}
            className={`flex w-full items-start gap-3.5 rounded-2xl border p-4 text-left transition-all ${
              importStorageMode === 'linked'
                ? 'bg-primary/10 border-primary text-on-surface shadow-xs'
                : 'bg-surface-container hover:bg-surface-container-high border-outline-variant/30 text-on-surface-variant'
            }`}
          >
            <div
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                importStorageMode === 'linked'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-high text-on-surface-variant'
              }`}
            >
              <Link2 size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-on-surface text-sm font-semibold">
                  Tautkan Berkas Langsung
                </span>
                <span className="bg-primary/20 text-primary rounded-full px-2 py-0.5 font-mono text-[10px] font-bold">
                  Rekomendasi (Hemat Ruang)
                </span>
              </div>
              <p className="text-on-surface-variant mt-1 text-xs leading-relaxed">
                Hanya mencatat lokasi berkas di sistem (0 MB duplikasi). Menghemat kapasitas disk
                perangkat Anda.
              </p>
            </div>
          </button>

          {/* Vault Mode Option */}
          <button
            type="button"
            onClick={() => setImportStorageMode('vault')}
            className={`flex w-full items-start gap-3.5 rounded-2xl border p-4 text-left transition-all ${
              importStorageMode === 'vault'
                ? 'bg-primary/10 border-primary text-on-surface shadow-xs'
                : 'bg-surface-container hover:bg-surface-container-high border-outline-variant/30 text-on-surface-variant'
            }`}
          >
            <div
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                importStorageMode === 'vault'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-high text-on-surface-variant'
              }`}
            >
              <Database size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-on-surface text-sm font-semibold">Salin ke Aplikasi</span>
                <span className="bg-surface-container-highest text-on-surface-variant rounded-full px-2 py-0.5 font-mono text-[10px] font-medium">
                  Aman
                </span>
              </div>
              <p className="text-on-surface-variant mt-1 text-xs leading-relaxed">
                Menyalin berkas seutuhnya ke penyimpanan internal MyShelf. Berkas asli di luar aman
                meski dipindahkan atau dihapus.
              </p>
            </div>
          </button>
        </div>
      )}
    </section>
  );
};
