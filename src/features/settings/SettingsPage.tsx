import React from 'react';
import { ArrowLeft } from 'lucide-react';

import { IconButton } from '@/components/ui/IconButton';
import { APP_VERSION } from '@/config';
import { isWebBrowser } from '@/lib/platform';
import { navigate } from '@/lib/route';
import { useStorageEstimate } from './hooks/useStorageEstimate';
import {
  AboutSection,
  AppearanceSection,
  AutoUpdateSection,
  BackupRestoreSection,
  FolderSyncSection,
  ReadingGoalsSection,
  StorageQuotaSection,
} from './sections';

export const SettingsPage: React.FC = () => {
  const { storageInfo, refreshStorage, handleRequestPersist } = useStorageEstimate();

  return (
    <div className="bg-surface text-on-surface flex min-h-screen flex-col">
      {/* 1. TOP APP BAR */}
      <header className="bg-surface/90 border-outline-variant/20 sticky top-0 z-30 flex items-center justify-between gap-3 border-b px-4 py-3 backdrop-blur-md sm:px-8">
        <div className="flex min-w-0 items-center gap-2.5">
          {/* Back to MyShelf button on mobile (< 1024px) */}
          <div className="lg:hidden">
            <IconButton
              size="sm"
              onClick={() => navigate('')}
              aria-label="Kembali ke MyShelf"
              title="Kembali ke MyShelf"
            >
              <ArrowLeft size={18} />
            </IconButton>
          </div>
          <div className="min-w-0">
            <h1 className="text-on-surface truncate text-base font-bold tracking-tight sm:text-lg">
              Pengaturan
            </h1>
            <p className="text-on-surface-variant hidden text-xs sm:block">
              Preferensi aplikasi, tema visual, dan pencadangan data
            </p>
          </div>
        </div>

        {/* Action / Badge in Top Bar */}
        <span className="text-on-surface-variant bg-surface-container-high border-outline-variant/30 rounded-full border px-2.5 py-1 font-mono text-[11px] font-semibold">
          v{APP_VERSION}
        </span>
      </header>

      {/* Main Content Area */}
      <div className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-4 sm:p-8">
        {/* Theme & Display */}
        <AppearanceSection />

        {/* Reading Preferences */}
        <ReadingGoalsSection />

        {/* Local Folder Sync */}
        <FolderSyncSection onStorageChange={refreshStorage} />

        {/* Offline Storage (IndexedDB) - Only shown on Web Browser */}
        {isWebBrowser() && (
          <StorageQuotaSection storageInfo={storageInfo} onRequestPersist={handleRequestPersist} />
        )}

        {/* Backup & Restore */}
        <BackupRestoreSection onRestored={refreshStorage} />

        {/* Application Updates */}
        <AutoUpdateSection />

        {/* About Application */}
        <AboutSection />
      </div>
    </div>
  );
};
