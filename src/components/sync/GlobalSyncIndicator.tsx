import React from 'react';
import { BookOpen, FolderSync, Loader2, X } from 'lucide-react';

import { useSyncStore } from '@/store/sync';

export const GlobalSyncIndicator: React.FC = () => {
  const { isSyncing, progress, cancelSync } = useSyncStore();

  if (!isSyncing) return null;

  const isScanning = progress.phase === 'scanning';
  const percentage =
    progress.total > 0 ? Math.min(100, Math.round((progress.current / progress.total) * 100)) : 0;

  return (
    <aside
      aria-label="Status Sinkronisasi Folder"
      className="animate-slide-up bg-surface-container-high/95 dark:bg-surface-container-highest/95 border-outline-variant/40 fixed right-4 bottom-4 z-40 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2.5 rounded-2xl border p-3.5 shadow-xl backdrop-blur-md transition-all sm:w-88"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <Loader2 size={16} className="animate-spin" />
          </div>
          <div className="min-w-0">
            <h2 className="text-on-surface truncate text-xs font-semibold">
              {isScanning ? 'Memindai Folder Lokal...' : 'Menyinkronkan Buku...'}
            </h2>
            <p className="text-on-surface-variant truncate text-[11px]">
              {isScanning
                ? `${progress.foundCount} berkas terdeteksi`
                : `${progress.current} dari ${progress.total} buku (${percentage}%)`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={cancelSync}
          className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors"
          title="Batalkan sinkronisasi"
        >
          <X size={14} />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="bg-surface-container-highest dark:bg-surface-container h-1.5 w-full overflow-hidden rounded-full">
        {isScanning ? (
          <div className="from-primary/40 via-primary to-primary/40 h-full w-2/5 animate-pulse rounded-full bg-linear-to-r" />
        ) : (
          <div
            className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${percentage}%` }}
          />
        )}
      </div>

      {/* File Detail */}
      {!isScanning && progress.fileName && (
        <div className="text-on-surface-variant flex items-center gap-1.5 text-[11px]">
          <BookOpen size={12} className="shrink-0 opacity-70" />
          <span className="truncate font-mono" title={progress.fileName}>
            {progress.fileName}
          </span>
        </div>
      )}

      {isScanning && (
        <div className="text-on-surface-variant flex items-center gap-1.5 text-[11px]">
          <FolderSync size={12} className="shrink-0 opacity-70" />
          <span className="truncate">Mencari berkas .epub dan .pdf...</span>
        </div>
      )}
    </aside>
  );
};
