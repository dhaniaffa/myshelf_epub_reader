import React from 'react';

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
    <div className="animate-fade-in mx-auto w-full max-w-4xl flex-1 space-y-8 p-4 sm:p-8">
      {/* Page Header */}
      <div>
        <h1 className="text-on-surface flex items-center gap-2.5 text-2xl font-extrabold tracking-tight sm:text-3xl">
          <span>Pengaturan Aplikasi</span>
          <span className="text-primary bg-primary/10 border-primary/20 rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide uppercase">
            Preferences
          </span>
        </h1>
        <p className="text-on-surface-variant mt-1 text-sm">
          Sesuaikan tema visual, preferensi bacaan, penyimpanan offline, serta cadangan data lokal
          Anda.
        </p>
      </div>

      <div className="space-y-6">
        {/* Theme & Display */}
        <AppearanceSection />

        {/* Reading Preferences */}
        <ReadingGoalsSection />

        {/* Local Folder Sync */}
        <FolderSyncSection onStorageChange={refreshStorage} />

        {/* Offline Storage (IndexedDB) */}
        <StorageQuotaSection storageInfo={storageInfo} onRequestPersist={handleRequestPersist} />

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
