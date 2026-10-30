import React from 'react';
import { HardDrive, ShieldCheck } from 'lucide-react';

import type { StorageInfo } from '../hooks/useStorageEstimate';

interface StorageQuotaSectionProps {
  storageInfo: StorageInfo;
  onRequestPersist: () => Promise<void> | void;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const StorageQuotaSection: React.FC<StorageQuotaSectionProps> = ({
  storageInfo,
  onRequestPersist,
}) => {
  return (
    <section className="bg-surface-container border-outline-variant/30 space-y-4 rounded-3xl border p-6 shadow-xs sm:p-7">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
            <HardDrive size={20} />
          </div>
          <div>
            <h2 className="text-on-surface text-base font-bold">Penyimpanan Offline (IndexedDB)</h2>
            <p className="text-on-surface-variant text-xs">
              Kapasitas penyimpanan lokal peramban tempat seluruh berkas dan riwayat disimpan.
            </p>
          </div>
        </div>

        {storageInfo.isPersistent ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck size={14} /> Persisten
          </span>
        ) : (
          <button
            type="button"
            onClick={onRequestPersist}
            className="text-primary bg-primary/10 hover:bg-primary/20 cursor-pointer rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors"
          >
            Kunci Persisten
          </button>
        )}
      </div>

      <div className="bg-surface-container-high border-outline-variant/20 space-y-2 rounded-2xl border p-4">
        <div className="text-on-surface-variant flex justify-between text-xs">
          <span>
            Terpakai: <strong className="text-on-surface">{formatBytes(storageInfo.usage)}</strong>
          </span>
          <span>
            Kuota: <strong className="text-on-surface">{formatBytes(storageInfo.quota)}</strong>
          </span>
        </div>
        <div className="bg-surface-container-highest h-2.5 w-full overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(1, storageInfo.percent))}%` }}
          />
        </div>
        <p className="text-on-surface-variant pt-1 text-[11px]">
          Data buku dan riwayat membaca disimpan secara permanen pada memori perangkat Anda.
        </p>
      </div>
    </section>
  );
};
