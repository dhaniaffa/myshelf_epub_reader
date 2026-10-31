import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowUpDown,
  BookOpen,
  Compass,
  FolderOpen,
  FolderSync,
  Grid3X3,
  Image,
  LayoutGrid,
  Library,
  List,
  Loader,
  Loader2,
  Plus,
  Search,
  Tag,
  UploadCloud,
  X,
} from 'lucide-react';

import { AppLogo } from '@/components/icons/AppLogo';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { APP_CONFIG, APP_NAME, APP_SUBTITLE } from '@/config';
import { BookCard } from '@/features/library/BookCard';
import { BookCompactCard } from '@/features/library/BookCompactCard';
import { BookCoverCard } from '@/features/library/BookCoverCard';
import { BookDetailsDialog } from '@/features/library/BookDetailsDialog';
import { BookListItem } from '@/features/library/BookListItem';
import { HeroCard } from '@/features/library/HeroCard';
import { ManageCollectionsDialog } from '@/features/library/ManageCollectionsDialog';
import { db, deleteBook } from '@/lib/db';
import {
  connectLocalFolder,
  getLocalFolder,
  isFileSystemAccessSupported,
  syncLocalFolder,
} from '@/lib/fileSystemSync';
import { importEpubFiles } from '@/lib/importBooks';
import { navigate } from '@/lib/route';
import { useSyncStore } from '@/store/sync';
import { toast } from '@/store/toast';

import type { Book, BookStatus, BookViewMode } from '@/types';

export const LibraryPage: React.FC = () => {
  const rawBooks = useLiveQuery(() => db.books.toArray(), []);
  const isLoadingBooks = rawBooks === undefined;
  const books = useMemo(() => rawBooks || [], [rawBooks]);
  const syncFolder = useLiveQuery(() => getLocalFolder(), []);
  const collections = useLiveQuery(() => db.collections.orderBy('createdAt').toArray(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | BookStatus>('all');
  const [selectedCollection, setSelectedCollection] = useState<string | 'all'>('all');
  const [manageCollectionsOpen, setManageCollectionsOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'lastRead' | 'title' | 'added'>('lastRead');
  const [viewMode, setViewMode] = useState<BookViewMode>(() => {
    const saved = localStorage.getItem(APP_CONFIG.storageKeys.viewMode);
    if (
      saved === 'compact' ||
      saved === 'comfortable' ||
      saved === 'cover-only' ||
      saved === 'list'
    ) {
      return saved;
    }
    // Backward compatibility with legacy 'grid' setting
    if (saved === 'grid') return 'comfortable';
    return 'comfortable';
  });
  const [isImporting, setIsImporting] = useState(false);
  const isFolderSyncing = useSyncStore((s) => s.isSyncing);
  const syncProgress = useSyncStore((s) => s.progress);
  const cancelSync = useSyncStore((s) => s.cancelSync);
  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
    fileName?: string;
  } | null>(null);
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);
  const [selectedBookForDetails, setSelectedBookForDetails] = useState<Book | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Auto-sync on launch if enabled on connected folder
  const hasAutoSyncedRef = useRef(false);
  useEffect(() => {
    if (hasAutoSyncedRef.current || !syncFolder || !syncFolder.autoSyncOnLaunch) return;
    hasAutoSyncedRef.current = true;
    syncLocalFolder(undefined, undefined, true)
      .then((res) => {
        if (res.success && res.imported > 0) {
          toast.success(`Sinkronisasi folder otomatis: ${res.imported} buku baru ditambahkan`);
        }
      })
      .catch((err) => {
        console.warn('Sinkronisasi otomatis saat mulai dilewati:', err);
      });
  }, [syncFolder]);

  const handleQuickSync = async () => {
    if (!syncFolder || isFolderSyncing) return;
    try {
      const res = await syncLocalFolder();
      if (!res.success) {
        toast.error(res.error || 'Gagal menyinkronkan folder');
        return;
      }
      if (res.imported > 0) {
        toast.success(`Sinkronisasi selesai: ${res.imported} buku baru ditambahkan`);
      } else {
        toast.info(`Folder "${syncFolder.name}" up-to-date (${res.totalFound} berkas diperiksa)`);
      }
    } catch {
      toast.error('Gagal menyinkronkan folder lokal');
    }
  };

  const handleViewModeChange = (mode: BookViewMode) => {
    setViewMode(mode);
    localStorage.setItem(APP_CONFIG.storageKeys.viewMode, mode);
  };

  // Find last read book for "Continue Reading" card
  const continueReadingBook = useMemo(() => {
    const withLastRead = books.filter((b) => b.lastReadAt && b.progress < 1);
    if (withLastRead.length === 0) return null;
    return withLastRead.sort((a, b) => (b.lastReadAt || 0) - (a.lastReadAt || 0))[0];
  }, [books]);

  // Filter and sort books
  const filteredBooks = useMemo(() => {
    return books
      .filter((book) => {
        const matchesSearch =
          book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          book.author.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || book.status === statusFilter;
        const matchesCollection =
          selectedCollection === 'all' ||
          (book.tags && Array.isArray(book.tags) && book.tags.includes(selectedCollection));
        return matchesSearch && matchesStatus && matchesCollection;
      })
      .sort((a, b) => {
        if (sortBy === 'lastRead') {
          return (b.lastReadAt || 0) - (a.lastReadAt || 0);
        }
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        }
        return b.addedAt - a.addedAt;
      });
  }, [books, searchQuery, statusFilter, selectedCollection, sortBy]);

  const handleFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsImporting(true);
    setImportProgress({ current: 0, total: files.length });

    try {
      const res = await importEpubFiles(files, (curr, tot, fileName) => {
        setImportProgress({ current: curr, total: tot, fileName });
      });

      if (res.imported > 0) {
        toast.success(`Berhasil menambahkan ${res.imported} buku ke perpustakaan`);
      }
      if (res.duplicates > 0) {
        toast.warning(`${res.duplicates} buku sudah ada di perpustakaan (duplikat diabaikan)`);
      }
      if (res.failed > 0) {
        toast.error(`${res.failed} berkas gagal dibaca sebagai buku valid`);
      }
    } catch {
      toast.error('Terjadi kesalahan saat memproses berkas buku');
    } finally {
      setIsImporting(false);
      setImportProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!bookToDelete) return;
    try {
      await deleteBook(bookToDelete.id);
      toast.info(`Buku "${bookToDelete.title}" telah dihapus`);
    } catch {
      toast.error('Gagal menghapus buku');
    } finally {
      setBookToDelete(null);
    }
  };

  return (
    <div
      className="bg-surface flex min-h-screen flex-col"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsDragging(false);
      }}
      onDrop={handleDrop}
    >
      {/* Overlay Drag Active */}
      {isDragging && (
        <div className="bg-primary/20 border-primary pointer-events-none fixed inset-0 z-50 flex items-center justify-center border-4 border-dashed backdrop-blur-xs">
          <div className="bg-surface-container text-primary animate-slide-up flex flex-col items-center gap-3 rounded-3xl p-8 shadow-2xl">
            <UploadCloud size={56} className="animate-bounce" />
            <h3 className="text-xl font-bold">Lepaskan berkas EPUB di sini</h3>
            <p className="text-on-surface-variant text-xs">
              Buku akan langsung disimpan ke perangkat Anda
            </p>
          </div>
        </div>
      )}

      {/* App Bar */}
      <header className="bg-surface/90 border-outline-variant/20 sticky top-0 z-30 flex items-center justify-between gap-3 border-b px-3.5 py-2.5 backdrop-blur-md sm:px-8 sm:py-3.5">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="bg-primary-container text-on-primary-container flex h-9 w-9 items-center justify-center rounded-xl shadow-xs sm:h-10 sm:w-10 sm:rounded-2xl lg:hidden">
            <AppLogo size={22} className="text-on-primary-container" />
          </div>
          <div>
            <h1 className="text-on-surface flex items-center gap-2 text-base font-bold tracking-tight sm:text-lg">
              <span className="lg:hidden">{APP_NAME}</span>
              <span className="hidden lg:inline">Rak Koleksi Buku</span>
              <span className="text-primary bg-primary/10 border-primary/20 hidden rounded-full border px-2 py-0.5 text-[10px] font-semibold sm:inline-flex lg:hidden">
                {APP_SUBTITLE}
              </span>
            </h1>
            <p className="text-on-surface-variant text-[11px] sm:text-xs">
              {books.length} {books.length === 1 ? 'buku' : 'buku'} tersimpan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {syncFolder && (
            <button
              type="button"
              onClick={handleQuickSync}
              disabled={isFolderSyncing}
              className="bg-surface-container-high border-outline-variant/30 text-on-surface hover:bg-surface-container-highest inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
              title={`Sinkronkan dari folder lokal: ${syncFolder.name}`}
            >
              {isFolderSyncing ? (
                <Loader size={14} className="animate-spin text-teal-600 dark:text-teal-400" />
              ) : (
                <FolderSync size={14} className="text-teal-600 dark:text-teal-400" />
              )}
              <span className="hidden max-w-28 truncate sm:inline">{syncFolder.name}</span>
              <span className="sm:hidden">Sinkron</span>
            </button>
          )}

          <Button
            variant="filled"
            size="sm"
            icon={<UploadCloud size={16} />}
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
          >
            <span className="hidden sm:inline">Impor Berkas</span>
            <span className="sm:hidden">Impor</span>
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".epub,.pdf,application/epub+zip,application/pdf"
            className="hidden"
            onClick={(e) => {
              (e.currentTarget as HTMLInputElement).value = '';
            }}
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-4 p-3.5 sm:space-y-7 sm:p-8">
        {/* Progress Sinkronisasi Folder Lokal */}
        {isFolderSyncing && (
          <div className="animate-slide-up flex flex-col gap-2 rounded-2xl border border-teal-500/30 bg-teal-500/10 p-4 shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 overflow-hidden">
                <Loader2
                  size={18}
                  className="shrink-0 animate-spin text-teal-600 dark:text-teal-400"
                />
                <div className="min-w-0">
                  <span className="text-on-surface text-sm font-semibold">
                    {syncProgress.phase === 'scanning'
                      ? 'Memindai folder lokal...'
                      : 'Menyinkronkan buku ke perpustakaan...'}
                  </span>
                  <p className="text-on-surface-variant truncate text-xs">
                    {syncProgress.phase === 'scanning'
                      ? `${syncProgress.foundCount} berkas .epub dan .pdf terdeteksi`
                      : `${syncProgress.fileName || 'Memproses berkas...'} (${syncProgress.current} dari ${syncProgress.total})`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={cancelSync}
                className="text-on-surface-variant hover:text-on-surface shrink-0 cursor-pointer text-xs font-medium underline"
              >
                Batalkan
              </button>
            </div>
            {syncProgress.phase === 'importing' && syncProgress.total > 0 && (
              <div className="bg-surface-container-highest h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full bg-teal-600 transition-all duration-300 ease-out dark:bg-teal-400"
                  style={{
                    width: `${Math.min(100, Math.round((syncProgress.current / syncProgress.total) * 100))}%`,
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Progress Impor Indicator */}
        {isImporting && (
          <div className="bg-primary-container/30 border-primary/20 animate-slide-up flex flex-col gap-2 rounded-2xl border p-4 shadow-xs">
            <div className="flex items-center gap-3 overflow-hidden">
              <Loader2 size={18} className="text-primary shrink-0 animate-spin" />
              <div className="min-w-0 flex-1">
                <span className="text-on-surface text-sm font-semibold">
                  Memproses berkas buku...
                </span>
                {importProgress && (
                  <p className="text-on-surface-variant truncate text-xs">
                    {importProgress.fileName || 'Membaca metadata berkas...'} (
                    {importProgress.current} dari {importProgress.total})
                  </p>
                )}
              </div>
            </div>
            {importProgress && importProgress.total > 0 && (
              <div className="bg-surface-container-highest h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
                  style={{
                    width: `${Math.min(100, Math.round((importProgress.current / importProgress.total) * 100))}%`,
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Hero Card: Lanjutkan Membaca */}
        {continueReadingBook && <HeroCard book={continueReadingBook} />}

        {/* Filters and Controls Toolbar */}
        <div className="space-y-2.5 sm:space-y-3.5">
          {/* Top Row: Search Bar + Sort & View Controls */}
          <div className="flex flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-center sm:gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                size={16}
                className="text-on-surface-variant pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 sm:left-3.5 sm:size-4.5"
              />
              <input
                type="text"
                placeholder="Cari judul buku atau nama penulis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-surface-container-low text-on-surface border-outline-variant/30 focus:border-primary focus:ring-primary/20 placeholder:text-on-surface-variant/60 h-10 w-full rounded-xl border pr-8 pl-9 text-xs shadow-2xs transition-all focus:ring-2 focus:outline-none sm:h-11 sm:rounded-2xl sm:pr-9 sm:pl-10 sm:text-sm sm:shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer rounded-full p-1 transition-colors sm:right-3"
                  title="Hapus pencarian"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Right Controls: Sort & View Mode Switcher */}
            <div className="flex items-center justify-between gap-2 sm:justify-end sm:gap-2.5">
              {/* Sort Selector */}
              <div className="bg-surface-container-low border-outline-variant/30 flex h-9 flex-1 items-center rounded-xl border px-2.5 shadow-2xs sm:h-11 sm:flex-initial sm:rounded-2xl sm:px-3.5 sm:shadow-xs">
                <ArrowUpDown
                  size={14}
                  className="text-on-surface-variant mr-1.5 shrink-0 sm:mr-2 sm:size-3.75"
                />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'lastRead' | 'title' | 'added')}
                  className="text-on-surface w-full cursor-pointer border-none bg-transparent pr-1 text-xs font-medium focus:outline-none sm:text-sm"
                >
                  <option value="lastRead" className="bg-surface-container text-on-surface">
                    Terakhir Dibaca
                  </option>
                  <option value="title" className="bg-surface-container text-on-surface">
                    Judul (A-Z)
                  </option>
                  <option value="added" className="bg-surface-container text-on-surface">
                    Terbaru Ditambahkan
                  </option>
                </select>
              </div>

              {/* View Mode Switcher */}
              <div className="bg-surface-container-low border-outline-variant/30 flex h-9 shrink-0 items-center rounded-xl border p-0.5 shadow-2xs sm:h-11 sm:rounded-2xl sm:p-1 sm:shadow-xs">
                <button
                  type="button"
                  title="Compact Grid"
                  onClick={() => handleViewModeChange('compact')}
                  className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-all sm:h-9 sm:w-9 sm:rounded-xl ${
                    viewMode === 'compact'
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  }`}
                >
                  <Grid3X3 size={15} className="sm:size-4.25" />
                </button>
                <button
                  type="button"
                  title="Comfortable Grid"
                  onClick={() => handleViewModeChange('comfortable')}
                  className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-all sm:h-9 sm:w-9 sm:rounded-xl ${
                    viewMode === 'comfortable'
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  }`}
                >
                  <LayoutGrid size={15} className="sm:size-4.25" />
                </button>
                <button
                  type="button"
                  title="Cover Only"
                  onClick={() => handleViewModeChange('cover-only')}
                  className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-all sm:h-9 sm:w-9 sm:rounded-xl ${
                    viewMode === 'cover-only'
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  }`}
                >
                  <Image size={15} className="sm:size-4.25" />
                </button>
                <button
                  type="button"
                  title="List View"
                  onClick={() => handleViewModeChange('list')}
                  className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-all sm:h-9 sm:w-9 sm:rounded-xl ${
                    viewMode === 'list'
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  }`}
                >
                  <List size={15} className="sm:size-4.25" />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Row: Status Filter Tabs */}
          <div className="flex scrollbar-none items-center gap-2 overflow-x-auto pb-0.5 select-none sm:gap-2.5 sm:pb-1">
            {[
              { id: 'all' as const, label: 'Semua', count: books.length },
              {
                id: 'reading' as const,
                label: 'Sedang Dibaca',
                count: books.filter((b) => b.status === 'reading').length,
              },
              {
                id: 'unread' as const,
                label: 'Belum Dibaca',
                count: books.filter((b) => b.status === 'unread').length,
              },
              {
                id: 'completed' as const,
                label: 'Selesai',
                count: books.filter((b) => b.status === 'completed').length,
              },
            ].map((f) => {
              const isSelected = statusFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  className={`inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs transition-all select-none sm:h-10 sm:gap-2 sm:rounded-2xl sm:px-4 sm:text-sm ${
                    isSelected
                      ? 'bg-primary text-on-primary font-semibold shadow-2xs sm:shadow-xs'
                      : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface border-outline-variant/30 border'
                  }`}
                >
                  <span>{f.label}</span>
                  <span
                    className={`py-0.2 rounded-full px-1.5 text-[10px] font-bold sm:px-2 sm:py-0.5 sm:text-xs ${
                      isSelected
                        ? 'bg-on-primary/20 text-on-primary'
                        : 'bg-surface-container-highest text-on-surface-variant'
                    }`}
                  >
                    {f.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Collection / Tag Filter Bar */}
          <div className="flex scrollbar-none items-center gap-1.5 overflow-x-auto pb-0.5 select-none sm:gap-2 sm:pb-1">
            <button
              type="button"
              onClick={() => setSelectedCollection('all')}
              className={`inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-full px-2.5 text-[11px] transition-all select-none sm:h-8 sm:px-3 sm:text-xs ${
                selectedCollection === 'all'
                  ? 'bg-secondary-container text-on-secondary-container font-semibold shadow-2xs'
                  : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface border-outline-variant/30 border'
              }`}
            >
              <span>Semua Koleksi</span>
            </button>

            {collections?.map((col) => {
              const isSelected = selectedCollection === col.name;
              const count = books.filter((b) => b.tags?.includes(col.name)).length;
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setSelectedCollection(isSelected ? 'all' : col.name)}
                  className={`inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-[11px] transition-all select-none sm:h-8 sm:px-3 sm:text-xs ${
                    isSelected
                      ? 'bg-secondary-container text-on-secondary-container font-semibold shadow-2xs'
                      : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface border-outline-variant/30 border'
                  }`}
                >
                  <Tag
                    size={11}
                    className={isSelected ? 'text-on-secondary-container' : 'text-primary/70'}
                  />
                  <span>{col.name}</span>
                  <span
                    className={`py-0.2 rounded-full px-1.5 text-[9px] font-bold ${
                      isSelected
                        ? 'bg-on-secondary-container/20 text-on-secondary-container'
                        : 'bg-surface-container-highest text-on-surface-variant'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setManageCollectionsOpen(true)}
              className="hover:border-primary/50 hover:text-primary text-on-surface-variant/80 border-outline-variant/40 bg-surface-container-low/60 inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-full border border-dashed px-2.5 text-[11px] font-medium transition-all sm:h-8 sm:px-3 sm:text-xs"
              title="Kelola Koleksi & Rak Kustom"
            >
              <Plus size={12} />
              <span>Kelola Koleksi</span>
            </button>
          </div>
        </div>

        {/* Book Grid / Loading / Empty States */}
        {isLoadingBooks ? (
          /* Shimmer Skeleton Loader matching active viewMode */
          <div className="space-y-6">
            {viewMode === 'compact' && (
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3.5 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
                {Array.from({ length: 14 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-surface-container-low border-outline-variant/30 flex flex-col overflow-hidden rounded-xl border"
                  >
                    <div className="bg-surface-container-high/80 aspect-2/3 w-full animate-pulse" />
                    <div className="space-y-1.5 p-2">
                      <div className="bg-surface-container-highest/80 h-3 w-4/5 animate-pulse rounded" />
                      <div className="bg-surface-container-high h-2 w-1/2 animate-pulse rounded" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {viewMode === 'comfortable' && (
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-surface-container-low border-outline-variant/30 flex flex-col overflow-hidden rounded-2xl border"
                  >
                    <div className="bg-surface-container-high/80 aspect-2/3 w-full animate-pulse" />
                    <div className="space-y-2 p-3">
                      <div className="bg-surface-container-highest/80 h-3.5 w-4/5 animate-pulse rounded" />
                      <div className="bg-surface-container-high h-2.5 w-1/2 animate-pulse rounded" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {viewMode === 'cover-only' && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-surface-container-high/80 aspect-2/3 w-full animate-pulse rounded-2xl shadow-md"
                  />
                ))}
              </div>
            )}
            {viewMode === 'list' && (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-surface-container-low border-outline-variant/30 flex items-center gap-4 rounded-2xl border p-3.5"
                  >
                    <div className="bg-surface-container-high/80 h-20 w-14 shrink-0 animate-pulse rounded-xl" />
                    <div className="flex-1 space-y-2.5">
                      <div className="bg-surface-container-highest/80 h-4 w-3/5 animate-pulse rounded" />
                      <div className="bg-surface-container-high h-3 w-2/5 animate-pulse rounded" />
                      <div className="bg-surface-container-high/60 h-2.5 w-1/4 animate-pulse rounded" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : books.length === 0 ? (
          /* Empty Library State */
          <div className="mx-auto flex max-w-xl flex-col items-center justify-center space-y-5 px-4 py-16 text-center">
            <div className="bg-surface-container-high text-primary mb-1 flex h-20 w-20 items-center justify-center rounded-full shadow-inner">
              <Library size={36} />
            </div>
            <h3 className="text-on-surface text-xl font-bold">Library Anda masih kosong</h3>
            <p className="text-on-surface-variant max-w-md text-sm leading-relaxed">
              Mulai membaca dengan menyeret berkas{' '}
              <code className="bg-surface-container rounded px-1.5 py-0.5 text-xs">.epub</code> atau{' '}
              <code className="bg-surface-container rounded px-1.5 py-0.5 text-xs">.pdf</code> ke
              halaman ini atau klik tombol di bawah untuk memilih berkas dari{' '}
              {isFileSystemAccessSupported() ? 'komputer' : 'perangkat'} Anda.
            </p>
            <div className="flex w-full flex-col flex-wrap items-center justify-center gap-3.5 pt-2 sm:w-auto sm:flex-row">
              <Button
                variant="filled"
                size="md"
                icon={<UploadCloud size={18} />}
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="w-full whitespace-nowrap shadow-xs hover:shadow-sm sm:w-auto"
              >
                {isImporting
                  ? 'Mengimpor...'
                  : isFileSystemAccessSupported()
                    ? 'Pilih Berkas Buku'
                    : 'Pilih Berkas / Banyak Buku'}
              </Button>
              {isFileSystemAccessSupported() && !syncFolder && (
                <Button
                  variant="tonal"
                  size="md"
                  icon={<FolderOpen size={18} />}
                  onClick={async () => {
                    try {
                      const folder = await connectLocalFolder();
                      toast.success(`Folder "${folder.name}" berhasil dihubungkan`);
                      const res = await syncLocalFolder();
                      if (res.imported > 0) {
                        toast.success(`Berhasil menambahkan ${res.imported} buku`);
                      }
                    } catch (err: unknown) {
                      if (err instanceof Error && err.name === 'AbortError') return;
                      toast.error('Gagal menghubungkan folder');
                    }
                  }}
                  disabled={isFolderSyncing}
                  className="w-full whitespace-nowrap sm:w-auto"
                >
                  Hubungkan Folder Lokal
                </Button>
              )}
              <Button
                variant="outlined"
                size="md"
                icon={<Compass size={18} />}
                onClick={() => navigate('catalog')}
                className="w-full whitespace-nowrap sm:w-auto"
              >
                Jelajahi Katalog Buku
              </Button>
            </div>
            {!isFileSystemAccessSupported() && (
              <p className="text-on-surface-variant/75 text-xs">
                💡 <span className="font-medium">Tips Android:</span> Tekan lama berkas buku di
                pengelola berkas perangkat untuk memilih banyak buku sekaligus.
              </p>
            )}
          </div>
        ) : filteredBooks.length === 0 ? (
          /* Empty Search / Filter State */
          <div className="text-on-surface-variant space-y-2 py-16 text-center">
            <BookOpen size={36} className="mx-auto mb-2 opacity-40" />
            <p className="text-on-surface text-base font-medium">Tidak ada buku yang sesuai</p>
            <p className="text-xs">Coba ganti kata kunci pencarian atau ubah filter status.</p>
          </div>
        ) : (
          /* Book List Render based on viewMode */
          <>
            {viewMode === 'compact' && (
              <div className="animate-fade-in grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3.5 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
                {filteredBooks.map((book) => (
                  <BookCompactCard
                    key={book.id}
                    book={book}
                    onDeleteRequest={setBookToDelete}
                    onShowDetails={setSelectedBookForDetails}
                  />
                ))}
              </div>
            )}

            {viewMode === 'comfortable' && (
              <div className="animate-fade-in grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {filteredBooks.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    onDeleteRequest={setBookToDelete}
                    onShowDetails={setSelectedBookForDetails}
                  />
                ))}
              </div>
            )}

            {viewMode === 'cover-only' && (
              <div className="animate-fade-in grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5">
                {filteredBooks.map((book) => (
                  <BookCoverCard
                    key={book.id}
                    book={book}
                    onDeleteRequest={setBookToDelete}
                    onShowDetails={setSelectedBookForDetails}
                  />
                ))}
              </div>
            )}

            {viewMode === 'list' && (
              <div className="animate-fade-in flex flex-col gap-3">
                {filteredBooks.map((book) => (
                  <BookListItem
                    key={book.id}
                    book={book}
                    onDeleteRequest={setBookToDelete}
                    onShowDetails={setSelectedBookForDetails}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!bookToDelete}
        onClose={() => setBookToDelete(null)}
        title="Hapus Buku?"
        maxWidth="sm"
        actions={
          <>
            <Button variant="text" size="sm" onClick={() => setBookToDelete(null)}>
              Batal
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteConfirm}>
              Hapus Selamanya
            </Button>
          </>
        }
      >
        <p className="text-on-surface-variant text-sm">
          Apakah Anda yakin ingin menghapus buku{' '}
          <strong className="text-on-surface">"{bookToDelete?.title}"</strong>?
        </p>
        <p className="text-on-surface-variant/80 mt-2 text-xs">
          Seluruh berkas, riwayat progres, penanda, serta sorotan dan catatan untuk buku ini akan
          dihapus dari perangkat Anda secara permanen.
        </p>
      </Dialog>

      {/* Book Details Dialog (About Book) */}
      <BookDetailsDialog
        book={selectedBookForDetails}
        onClose={() => setSelectedBookForDetails(null)}
      />

      {/* Manage Custom Collections Dialog */}
      <ManageCollectionsDialog
        open={manageCollectionsOpen}
        onClose={() => setManageCollectionsOpen(false)}
      />
    </div>
  );
};
