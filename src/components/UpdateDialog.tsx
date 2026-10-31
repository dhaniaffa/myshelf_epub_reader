import React, { useState } from 'react';
import { Download, ExternalLink, Loader2, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { installAppUpdate, isAndroidPlatform } from '@/lib/updater';
import { toast } from '@/store/toast';

import type { AppUpdateInfo } from '@/lib/updater';

interface UpdateDialogProps {
  open: boolean;
  onClose: () => void;
  updateInfo: AppUpdateInfo | null;
}

export const UpdateDialog: React.FC<UpdateDialogProps> = ({ open, onClose, updateInfo }) => {
  const [isInstalling, setIsInstalling] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [completed, setCompleted] = useState(false);

  if (!open || !updateInfo) return null;

  const isAndroid = isAndroidPlatform();

  const handleInstall = async () => {
    try {
      setIsInstalling(true);
      setProgress(0);

      await installAppUpdate(updateInfo, (percent) => {
        setProgress(percent);
      });

      if (isAndroid) {
        toast.success('Pengunduh paket pembaruan telah dimulai');
        setCompleted(true);
      }
    } catch (err) {
      console.error('Update installation failed:', err);
      toast.error('Gagal memasang pembaruan otomatis. Silakan coba lagi.');
      setIsInstalling(false);
      setProgress(null);
    }
  };

  return (
    <Dialog open={open} onClose={isInstalling ? () => {} : onClose} maxWidth="md">
      <div className="space-y-4 py-1">
        {/* Header Icon & Title */}
        <div className="flex items-start gap-3.5">
          <div className="bg-primary/10 text-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-xs">
            <Sparkles size={24} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-on-surface text-base font-bold">Pembaruan Tersedia</h3>
              <span className="bg-primary text-on-primary rounded-full px-2 py-0.5 text-[11px] font-bold shadow-2xs">
                v{updateInfo.version}
              </span>
            </div>
            <p className="text-on-surface-variant mt-0.5 text-xs">
              Versi saat ini: <span className="font-semibold">v{updateInfo.currentVersion}</span>
              {updateInfo.publishedAt && (
                <span>
                  {' '}
                  · Dirilis pada{' '}
                  {new Date(updateInfo.publishedAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Release Notes Box */}
        <div className="space-y-1.5">
          <label className="text-on-surface-variant block text-xs font-semibold">
            Catatan Pembaruan
          </label>
          <div className="bg-surface-container border-outline-variant/30 text-on-surface max-h-48 overflow-y-auto rounded-2xl border p-3.5 text-xs leading-relaxed whitespace-pre-wrap">
            {updateInfo.releaseNotes}
          </div>
        </div>

        {/* Progress bar if downloading */}
        {isInstalling && (
          <div className="bg-surface-container-high border-outline-variant/30 space-y-2 rounded-2xl border p-3.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-on-surface flex items-center gap-2">
                <Loader2 size={14} className="text-primary animate-spin" />
                {progress !== null && progress >= 100
                  ? 'Menyiapkan pemasangan paket...'
                  : 'Mengunduh berkas pembaruan...'}
              </span>
              {progress !== null && <span className="text-primary">{progress}%</span>}
            </div>

            <div className="bg-surface-container-highest h-2 w-full overflow-hidden rounded-full">
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${progress ?? 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Footer */}
        <div className="border-outline-variant/20 flex items-center justify-end gap-2 border-t pt-3">
          {!isInstalling && (
            <Button variant="text" size="sm" onClick={onClose}>
              Ingatkan Nanti
            </Button>
          )}

          <Button
            variant="filled"
            size="sm"
            icon={
              isInstalling ? (
                <Loader2 size={15} className="animate-spin" />
              ) : isAndroid ? (
                <ExternalLink size={15} />
              ) : (
                <Download size={15} />
              )
            }
            onClick={handleInstall}
            disabled={isInstalling || completed}
          >
            {completed
              ? 'Pemasang Terbuka'
              : isInstalling
                ? 'Memproses...'
                : isAndroid
                  ? 'Unduh & Pasang APK'
                  : 'Perbarui & Pasang Sekarang'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
