import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowUpCircle,
  Clock,
  Download,
  FolderCheck,
  FolderOpen,
  FolderSync,
  Gauge,
  HardDrive,
  Info,
  Palette,
  RefreshCw,
  ShieldCheck,
  Sliders,
  Sparkles,
  Unlink,
  Upload,
} from 'lucide-react';

import { ThemeSegmented } from '@/components/ThemeSegmented';
import { Button } from '@/components/ui';
import { UpdateDialog } from '@/components/UpdateDialog';
import { APP_FULL_NAME, APP_VERSION } from '@/config';
import { exportBackupJson, importBackupJson } from '@/lib/backup';
import { getStorageEstimate, requestPersistentStorage } from '@/lib/db';
import {
  connectLocalFolder,
  disconnectLocalFolder,
  getLocalFolder,
  isFileSystemAccessSupported,
  isFolderSyncRunning,
  syncLocalFolder,
  updateFolderOptions,
} from '@/lib/fileSystemSync';
import { importBookFiles } from '@/lib/importBooks';
import { checkForAppUpdate } from '@/lib/updater';
import { useSettingsStore } from '@/store/settings';
import { useSyncStore } from '@/store/sync';
import { toast } from '@/store/toast';

import type { AppUpdateInfo } from '@/lib/updater';

export const SettingsPage: React.FC = () => {
  const {
    theme,
    setTheme,
    dailyGoalMinutes,
    setDailyGoalMinutes,
    readingSpeedWpm,
    setReadingSpeedWpm,
    autoUpdateEnabled = true,
    setAutoUpdateEnabled,
  } = useSettingsStore();

  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);

  const [storageInfo, setStorageInfo] = useState<{
    usage: number;
    quota: number;
    percent: number;
    isPersistent: boolean;
  }>({ usage: 0, quota: 0, percent: 0, isPersistent: false });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const refreshStorage = useCallback(async () => {
    try {
      const info = await getStorageEstimate();
      setStorageInfo(info);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getStorageEstimate()
      .then((info) => {
        if (active) setStorageInfo(info);
      })
      .catch(console.error);

    return () => {
      active = false;
    };
  }, []);

  const handleRequestPersist = async () => {
    const success = await requestPersistentStorage();
    if (success) {
      toast.success('Penyimpanan persisten diizinkan oleh browser');
    } else {
      toast.info('Browser mengelola penyimpanan secara otomatis');
    }
    refreshStorage();
  };

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
      refreshStorage();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membaca berkas cadangan');
    } finally {
      setLoading(false);
    }
  };

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

  const syncFolder = useLiveQuery(() => getLocalFolder(), []);
  const isSupported = isFileSystemAccessSupported();
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const syncProgress = useSyncStore((s) => s.progress);
  const cancelSync = useSyncStore((s) => s.cancelSync);
  const folderFallbackInputRef = useRef<HTMLInputElement>(null);

  const handleCancelSync = () => {
    cancelSync();
    toast.info('Sinkronisasi dibatalkan');
  };

  const handleConnectFolder = async () => {
    if (isFolderSyncRunning()) {
      toast.info('Sinkronisasi sedang berlangsung di latar belakang...');
      return;
    }
    try {
      const folder = await connectLocalFolder();
      toast.success(`Folder "${folder.name}" berhasil dihubungkan`);
      const res = await syncLocalFolder();
      if (res.imported > 0) {
        toast.success(`Sinkronisasi selesai: ${res.imported} buku baru ditambahkan`);
      } else {
        toast.info(`Sinkronisasi selesai: ${res.totalFound} berkas diperiksa, tidak ada buku baru`);
      }
      refreshStorage();
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      toast.error('Gagal menghubungkan folder');
    }
  };

  const handleSyncNow = async () => {
    if (isFolderSyncRunning()) {
      toast.info('Sinkronisasi sedang berlangsung di latar belakang...');
      return;
    }
    try {
      const res = await syncLocalFolder();
      if (!res.success) {
        toast.error(res.error || 'Gagal menyinkronkan folder');
        return;
      }
      let msg = `Sinkronisasi selesai: ${res.imported} buku baru ditambahkan`;
      if (res.duplicates > 0) {
        msg += `, ${res.duplicates} buku sudah ada`;
      }
      if (res.backupWritten) {
        msg += ' & cadangan diperbarui';
      }
      toast.success(msg);
      refreshStorage();
    } catch {
      toast.error('Gagal menyinkronkan folder lokal');
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectLocalFolder();
      toast.info('Koneksi folder lokal diputuskan');
    } catch {
      toast.error('Gagal memutuskan koneksi folder');
    }
  };

  const handleToggleAutoSync = async (checked: boolean) => {
    await updateFolderOptions({ autoSyncOnLaunch: checked });
  };

  const handleToggleAutoBackup = async (checked: boolean) => {
    await updateFolderOptions({ autoBackupEnabled: checked });
  };

  const handleFallbackFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const syncStore = useSyncStore.getState();
    const signal = syncStore.startSync();
    syncStore.updateProgress({ phase: 'importing', current: 0, total: files.length });
    try {
      const res = await importBookFiles(
        files,
        (curr, tot, name) => {
          syncStore.updateProgress({
            phase: 'importing',
            current: curr,
            total: tot,
            fileName: name,
          });
        },
        signal
      );
      if (res.imported > 0) {
        toast.success(`Berhasil mengimpor ${res.imported} buku baru dari folder`);
      } else if (res.duplicates > 0) {
        toast.info(`Semua ${res.duplicates} buku dalam folder sudah ada di perpustakaan`);
      }
      if (res.failed > 0) {
        toast.warning(`${res.failed} berkas bukan format buku yang didukung`);
      }
      refreshStorage();
    } catch {
      toast.error('Gagal mengimpor buku dari folder');
    } finally {
      syncStore.stopSync();
      if (folderFallbackInputRef.current) folderFallbackInputRef.current.value = '';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const goalPresets = [10, 15, 20, 30, 45, 60];

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
        {/* 1. THEME & DISPLAY */}
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

        {/* 2. PREFERENSI MEMBACA */}
        <section className="bg-surface-container border-outline-variant/30 space-y-6 rounded-3xl border p-6 shadow-xs sm:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
              <Sliders size={20} />
            </div>
            <div>
              <h2 className="text-on-surface text-base font-bold">Preferensi Membaca</h2>
              <p className="text-on-surface-variant text-xs">
                Sesuaikan target konsistensi harian dan kecepatan kalkulasi estimasi waktu membaca.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 pt-1 md:grid-cols-2">
            {/* Target Harian */}
            <div className="bg-surface-container-high border-outline-variant/20 space-y-3 rounded-2xl border p-5">
              <div className="flex items-center justify-between">
                <span className="text-on-surface flex items-center gap-1.5 text-xs font-semibold">
                  <Clock size={16} className="text-primary" /> Target Membaca Harian
                </span>
                <span className="text-primary font-mono text-xs font-bold">
                  {dailyGoalMinutes || 20} mnt/hari
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {goalPresets.map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDailyGoalMinutes(mins)}
                    className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                      (dailyGoalMinutes || 20) === mins
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'bg-surface-container-highest text-on-surface hover:opacity-80'
                    }`}
                  >
                    {mins} mnt
                  </button>
                ))}
              </div>
            </div>

            {/* Reading Speed (WPM) */}
            <div className="bg-surface-container-high border-outline-variant/20 space-y-3 rounded-2xl border p-5">
              <div className="flex items-center justify-between">
                <span className="text-on-surface flex items-center gap-1.5 text-xs font-semibold">
                  <Gauge size={16} className="text-primary" /> Kecepatan Membaca (WPM)
                </span>
                <span className="text-primary font-mono text-xs font-bold">
                  {readingSpeedWpm || 220} wpm
                </span>
              </div>
              <div className="space-y-1">
                <input
                  type="range"
                  min={100}
                  max={450}
                  step={10}
                  value={readingSpeedWpm || 220}
                  onChange={(e) => setReadingSpeedWpm(parseInt(e.target.value, 10))}
                  className="accent-primary bg-surface-container-highest h-2 w-full cursor-pointer rounded-lg"
                  aria-label="Kecepatan Membaca WPM"
                />
                <div className="text-on-surface-variant flex justify-between text-[10px] font-medium">
                  <span>100 Santai</span>
                  <span>220 Normal</span>
                  <span>450 Cepat</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. SINKRONISASI FOLDER LOKAL (FILE SYSTEM ACCESS API) */}
        <section className="bg-surface-container border-outline-variant/30 space-y-5 rounded-3xl border p-6 shadow-xs sm:p-7">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <FolderSync size={20} />
              </div>
              <div>
                <h2 className="text-on-surface text-base font-bold">
                  {isSupported
                    ? 'Sinkronisasi Folder Lokal (Desktop)'
                    : 'Penyimpanan & Impor Buku Lokal'}
                </h2>
                <p className="text-on-surface-variant text-xs">
                  {isSupported
                    ? 'Hubungkan folder komputer (Dropbox, Syncthing, ~/Books) untuk mendeteksi & menyinkronkan buku otomatis.'
                    : 'Impor berkas buku (.epub dan .pdf) dari folder penyimpanan perangkat ke perpustakaan offline.'}
                </p>
              </div>
            </div>

            {isSupported && syncFolder && (
              <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-600 sm:self-auto dark:text-emerald-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Terhubung
              </span>
            )}
          </div>

          {!isSupported ? (
            <div className="bg-surface-container-high border-outline-variant/20 space-y-3 rounded-2xl border p-4">
              <div className="flex items-start gap-3">
                <Info size={18} className="mt-0.5 shrink-0 text-amber-500" />
                <div className="space-y-1">
                  <p className="text-on-surface text-xs font-semibold">
                    Impor Buku dari Folder Perangkat
                  </p>
                  <p className="text-on-surface-variant text-xs leading-relaxed">
                    Pada perangkat seluler / Android, sistem keamanan Scoped Storage mengisolasi
                    akses folder langsung. Buku diimpor dan disimpan secara privat di dalam basis
                    data offline perangkat. Anda dapat memilih dan mengimpor banyak berkas buku
                    sekaligus dari folder penyimpanan Anda:
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center">
                <Button
                  variant="tonal"
                  size="sm"
                  icon={<FolderOpen size={15} />}
                  onClick={() => folderFallbackInputRef.current?.click()}
                  disabled={isSyncing}
                >
                  Pilih & Impor Banyak Buku
                </Button>
                <span className="text-on-surface-variant text-[11px]">
                  (Tekan lama berkas pada pengelola berkas untuk memilih banyak buku)
                </span>
                <input
                  ref={folderFallbackInputRef}
                  type="file"
                  multiple
                  accept=".epub,.pdf,application/epub+zip,application/pdf"
                  className="hidden"
                  onChange={handleFallbackFolderSelect}
                />
              </div>
            </div>
          ) : !syncFolder ? (
            <div className="bg-surface-container-high border-outline-variant/20 space-y-4 rounded-2xl border p-5">
              <div className="text-on-surface-variant grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
                <div className="bg-surface-container/60 flex items-start gap-2.5 rounded-xl p-3">
                  <FolderOpen size={16} className="text-primary mt-0.5 shrink-0" />
                  <div>
                    <strong className="text-on-surface block font-medium">Folder Bebas</strong>
                    Folder dokumen biasa atau folder cloud lokal (Dropbox, Syncthing, Nextcloud).
                  </div>
                </div>
                <div className="bg-surface-container/60 flex items-start gap-2.5 rounded-xl p-3">
                  <Sparkles size={16} className="text-primary mt-0.5 shrink-0" />
                  <div>
                    <strong className="text-on-surface block font-medium">Deteksi Otomatis</strong>
                    Memindai rekursif seluruh berkas .epub dan .pdf di dalam subfolder & kategori.
                  </div>
                </div>
                <div className="bg-surface-container/60 flex items-start gap-2.5 rounded-xl p-3">
                  <ShieldCheck size={16} className="text-primary mt-0.5 shrink-0" />
                  <div>
                    <strong className="text-on-surface block font-medium">100% Privat</strong>
                    Handle folder disimpan di IndexedDB perangkat, berkas tidak pernah diunggah ke
                    server luar.
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-start justify-between gap-3 pt-1 sm:flex-row sm:items-center">
                <p className="text-on-surface-variant text-xs">
                  Klik tombol di samping untuk memilih folder buku dari komputer Anda:
                </p>
                <Button
                  variant="filled"
                  size="sm"
                  icon={<FolderOpen size={15} />}
                  onClick={handleConnectFolder}
                  disabled={isSyncing}
                  className="w-full sm:w-auto"
                >
                  {isSyncing ? 'Menghubungkan...' : 'Hubungkan Folder Buku'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Folder Details Box */}
              <div className="bg-surface-container-high border-outline-variant/20 space-y-4 rounded-2xl border p-4 sm:p-5">
                <div className="border-outline-variant/20 flex flex-col justify-between gap-3 border-b pb-3 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                      <FolderCheck size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-on-surface-variant text-xs font-medium">
                          Folder Terhubung:
                        </span>
                        <span className="text-on-surface bg-surface-container max-w-50 truncate rounded-md px-2 py-0.5 font-mono text-xs font-bold sm:max-w-xs">
                          {syncFolder.name}
                        </span>
                      </div>
                      <p className="text-on-surface-variant mt-0.5 text-[11px]">
                        Ditemukan {syncFolder.bookCount} berkas buku (
                        {syncFolder.lastSyncedAt
                          ? `Terakhir disinkronkan: ${new Date(syncFolder.lastSyncedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}`
                          : 'Belum disinkronkan'}
                        )
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {isSyncing ? (
                      <Button
                        variant="outlined"
                        size="sm"
                        className="text-error border-error/30 hover:bg-error/10"
                        onClick={handleCancelSync}
                      >
                        Batal
                      </Button>
                    ) : (
                      <Button
                        variant="filled"
                        size="sm"
                        icon={<RefreshCw size={14} />}
                        onClick={handleSyncNow}
                      >
                        Sinkronkan Sekarang
                      </Button>
                    )}
                    <Button
                      variant="outlined"
                      size="sm"
                      icon={<FolderOpen size={14} />}
                      onClick={handleConnectFolder}
                      disabled={isSyncing}
                    >
                      Ganti
                    </Button>
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      disabled={isSyncing}
                      className="text-error hover:bg-error/10 cursor-pointer rounded-xl p-2 text-xs transition-colors disabled:opacity-50"
                      title="Putuskan koneksi folder"
                    >
                      <Unlink size={16} />
                    </button>
                  </div>
                </div>

                {/* Progress bar during sync */}
                {isSyncing && (
                  <div className="bg-surface-container border-primary/20 animate-slide-up space-y-1.5 rounded-xl border p-3">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-on-surface max-w-50 truncate font-medium sm:max-w-md">
                        {syncProgress.phase === 'scanning'
                          ? `Memindai direktori folder... (${syncProgress.foundCount} berkas ditemukan)`
                          : syncProgress.fileName
                            ? `Memproses: ${syncProgress.fileName}`
                            : 'Memproses berkas...'}
                      </span>
                      {syncProgress.phase === 'importing' && syncProgress.total > 0 && (
                        <span className="text-primary shrink-0 font-mono font-bold">
                          {syncProgress.current} / {syncProgress.total}
                        </span>
                      )}
                    </div>
                    <div className="bg-surface-container-highest h-1.5 w-full overflow-hidden rounded-full">
                      {syncProgress.phase === 'scanning' ? (
                        <div className="from-primary/40 via-primary to-primary/40 h-full w-2/5 animate-pulse rounded-full bg-linear-to-r" />
                      ) : (
                        <div
                          className="bg-primary h-full rounded-full transition-all duration-200"
                          style={{
                            width: `${Math.round((syncProgress.current / Math.max(1, syncProgress.total)) * 100)}%`,
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Automation Toggles */}
                <div className="grid grid-cols-1 gap-4 pt-1 md:grid-cols-2">
                  {/* Toggle 1: Auto Sync on Launch */}
                  <div className="bg-surface-container/60 border-outline-variant/20 flex items-start justify-between gap-3 rounded-xl border p-3.5">
                    <div className="space-y-0.5">
                      <span className="text-on-surface block text-xs font-semibold">
                        Sinkronisasi Saat Buka Aplikasi
                      </span>
                      <p className="text-on-surface-variant text-[11px] leading-relaxed">
                        Otomatis memindai folder dan menambahkan buku baru saat My Shelf dibuka.
                      </p>
                    </div>
                    <label className="relative mt-0.5 inline-flex shrink-0 cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={syncFolder.autoSyncOnLaunch ?? true}
                        onChange={(e) => handleToggleAutoSync(e.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="bg-surface-container-highest peer peer-checked:bg-primary h-5 w-9 rounded-full peer-focus:outline-none after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white" />
                    </label>
                  </div>

                  {/* Toggle 2: Auto Backup to Folder */}
                  <div className="bg-surface-container/60 border-outline-variant/20 flex items-start justify-between gap-3 rounded-xl border p-3.5">
                    <div className="space-y-0.5">
                      <span className="text-on-surface block text-xs font-semibold">
                        Simpan Cadangan ke Folder Ini
                      </span>
                      <p className="text-on-surface-variant text-[11px] leading-relaxed">
                        Tulis berkas{' '}
                        <code className="bg-surface-container rounded px-1 py-0.5 font-mono text-[10px]">
                          myshelf-backup.json
                        </code>{' '}
                        (catatan & progres) langsung di folder lokal.
                      </p>
                    </div>
                    <label className="relative mt-0.5 inline-flex shrink-0 cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={syncFolder.autoBackupEnabled ?? false}
                        onChange={(e) => handleToggleAutoBackup(e.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="bg-surface-container-highest peer peer-checked:bg-primary h-5 w-9 rounded-full peer-focus:outline-none after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white" />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 4. BROWSER STORAGE */}
        <section className="bg-surface-container border-outline-variant/30 space-y-4 rounded-3xl border p-6 shadow-xs sm:p-7">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
                <HardDrive size={20} />
              </div>
              <div>
                <h2 className="text-on-surface text-base font-bold">
                  Penyimpanan Offline (IndexedDB)
                </h2>
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
                onClick={handleRequestPersist}
                className="text-primary bg-primary/10 hover:bg-primary/20 cursor-pointer rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors"
              >
                Kunci Persisten
              </button>
            )}
          </div>

          <div className="bg-surface-container-high border-outline-variant/20 space-y-2 rounded-2xl border p-4">
            <div className="text-on-surface-variant flex justify-between text-xs">
              <span>
                Terpakai:{' '}
                <strong className="text-on-surface">{formatBytes(storageInfo.usage)}</strong>
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

        {/* 5. CADANGAN & PEMULIHAN DATA */}
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
              Berkas cadangan tidak mengikutsertakan berkas buku biner mentah sehingga berukuran
              ringan dan mudah disimpan atau dipindahkan antar perangkat.
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

        {/* 6. PEMBARUAN APLIKASI (AUTO UPDATER) */}
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
                Versi terpasang:{' '}
                <span className="text-on-surface font-semibold">v{APP_VERSION}</span>
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

        {/* 7. ABOUT MY SHELF */}
        <section className="bg-surface-container-low border-outline-variant/20 flex items-start gap-4 rounded-3xl border p-6">
          <div className="bg-primary/10 text-primary mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl">
            <Info size={20} />
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
              (Client-Side). Seluruh berkas, riwayat membaca, catatan, dan statistik tersimpan aman
              di perangkat lokal Anda tanpa pengumpulan telemetri atau pelacakan.
            </p>
            <div className="text-primary flex items-center gap-2 pt-2 text-[11px] font-medium">
              <Sparkles size={14} />
              <span>Mendukung Progressive Web App (PWA) & Penggunaan Luring (Offline) Penuh</span>
            </div>
          </div>
        </section>
      </div>

      <UpdateDialog
        open={updateDialogOpen}
        onClose={() => setUpdateDialogOpen(false)}
        updateInfo={updateInfo}
      />
    </div>
  );
};
