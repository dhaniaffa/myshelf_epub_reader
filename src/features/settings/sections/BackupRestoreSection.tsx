import React, { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { exportBackupJson, importBackupJson } from '@/lib/backup';
import { toast } from '@/store/toast';

interface BackupRestoreSectionProps {
  onRestored?: () => void;
}

export const BackupRestoreSection: React.FC<BackupRestoreSectionProps> = ({ onRestored }) => {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportBackup = async () => {
    try {
      setLoading(true);
      const res = await exportBackupJson();
      if (res === 'cancelled') return;
      if (res === 'shared') {
        toast.success('Pilih folder simpan melalui menu perangkat');
      } else {
        toast.success('Cadangan data berhasil disimpan');
      }
    } catch {
      toast.error('Gagal mengekspor cadangan');
    } finally {
      setLoading(false);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const res = await importBackupJson(file);
      toast.success(
        `Cadangan berhasil dipulihkan: ${res.matchedBooks} buku, ${res.restoredBookmarks} penanda, ${res.restoredAnnotations} kutipan.`
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      onRestored?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membaca berkas cadangan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-surface-container border-outline-variant/30 space-y-4 rounded-3xl border p-6 shadow-xs sm:p-7">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-500">
          <Download size={20} />
        </div>
        <div>
          <h2 className="text-on-surface text-base font-bold">Cadangan & Pemulihan Data</h2>
          <p className="text-on-surface-variant text-xs">
            Ekspor dan impor catatan, sorotan, penanda halaman, dan log membaca ke berkas format
            JSON.
          </p>
        </div>
      </div>

      <div className="bg-surface-container-high border-outline-variant/20 flex flex-col items-center justify-between gap-4 rounded-2xl border p-4 sm:flex-row">
        <p className="text-on-surface-variant text-xs leading-relaxed">
          Berkas cadangan tidak mengikutsertakan berkas buku biner mentah sehingga berukuran ringan
          dan mudah disimpan atau dipindahkan antar perangkat.
        </p>

        <div className="flex w-full shrink-0 items-center gap-2.5 sm:w-auto">
          <Button
            variant="tonal"
            size="sm"
            icon={<Download size={15} />}
            onClick={handleExportBackup}
            disabled={loading}
          >
            Unduh Cadangan
          </Button>

          <Button
            variant="outlined"
            size="sm"
            icon={<Upload size={15} />}
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            Pulihkan
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImportBackup}
          />
        </div>
      </div>
    </section>
  );
};
