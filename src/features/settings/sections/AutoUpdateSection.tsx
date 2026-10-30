import React, { useState } from 'react';
import { ArrowUpCircle, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui';
import { UpdateDialog } from '@/components/UpdateDialog';
import { APP_VERSION } from '@/config';
import { checkForAppUpdate } from '@/lib/updater';
import { useSettingsStore } from '@/store/settings';
import { toast } from '@/store/toast';

import type { AppUpdateInfo } from '@/lib/updater';

export const AutoUpdateSection: React.FC = () => {
  const { autoUpdateEnabled = true, setAutoUpdateEnabled } = useSettingsStore();

  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);

  const handleCheckUpdate = async () => {
    try {
      setIsCheckingUpdate(true);
      const update = await checkForAppUpdate();
      if (update) {
        setUpdateInfo(update);
        setUpdateDialogOpen(true);
      } else {
        toast.success(`Aplikasi sudah menggunakan versi terbaru (v${APP_VERSION})`);
      }
    } catch {
      toast.error('Gagal memeriksa pembaruan. Periksa koneksi internet Anda.');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  return (
    <>
      <section className="bg-surface-container-low border-outline-variant/20 space-y-4 rounded-3xl border p-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl">
            <ArrowUpCircle size={20} />
          </div>
          <div>
            <h2 className="text-on-surface text-base font-bold">Pembaruan Aplikasi</h2>
            <p className="text-on-surface-variant text-xs">
              Kelola pembaruan otomatis dan periksa versi rilis terbaru untuk Desktop & Android.
            </p>
          </div>
        </div>

        <div className="bg-surface-container-high border-outline-variant/20 space-y-4 rounded-2xl border p-4">
          {/* Toggle Row */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-on-surface text-sm font-semibold">Pembaruan Otomatis</span>
              <p className="text-on-surface-variant text-xs leading-relaxed">
                Periksa pembaruan secara otomatis saat aplikasi dibuka dan pasang versi terbaru.
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={autoUpdateEnabled}
              onClick={() => setAutoUpdateEnabled(!autoUpdateEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                autoUpdateEnabled ? 'bg-primary' : 'bg-surface-container-highest'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  autoUpdateEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Check Button & Version Info */}
          <div className="border-outline-variant/15 flex flex-col items-start justify-between gap-3 border-t pt-3 sm:flex-row sm:items-center">
            <div className="text-on-surface-variant text-xs">
              Versi terpasang: <span className="text-on-surface font-semibold">v{APP_VERSION}</span>
            </div>

            <Button
              variant="tonal"
              size="sm"
              icon={<RefreshCw size={15} className={isCheckingUpdate ? 'animate-spin' : ''} />}
              onClick={handleCheckUpdate}
              disabled={isCheckingUpdate}
            >
              {isCheckingUpdate ? 'Memeriksa...' : 'Periksa Pembaruan Sekarang'}
            </Button>
          </div>
        </div>
      </section>

      <UpdateDialog
        open={updateDialogOpen}
        onClose={() => setUpdateDialogOpen(false)}
        updateInfo={updateInfo}
      />
    </>
  );
};
