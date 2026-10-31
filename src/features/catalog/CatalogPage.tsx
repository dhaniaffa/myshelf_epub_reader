import React, { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Plus, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { AddSourceDialog } from '@/features/catalog/AddSourceDialog';
import { CatalogBookDetailsDialog } from '@/features/catalog/CatalogBookDetailsDialog';
import { CatalogHubView } from '@/features/catalog/CatalogHubView';
import { CustomFeedDialog } from '@/features/catalog/CustomFeedDialog';
import { CATALOG_SOURCES } from '@/features/catalog/sources';
import {
  GutenbergView,
  OpdsFeedView,
  OpenLibraryView,
  StandardEbooksView,
} from '@/features/catalog/views';
import { registerBackHandler } from '@/lib/backHandler';
import { db, DEFAULT_OPDS_FEEDS } from '@/lib/db';
import { importBookFiles } from '@/lib/importBooks';
import { fetchWithCorsProxy } from '@/lib/proxy';
import { navigate, navigateBack } from '@/lib/route';
import { toast } from '@/store/toast';

import type { CatalogSourceId } from '@/features/catalog/sources';
import type { CatalogBook, OpdsFeed } from '@/types';

interface CatalogPageProps {
  sourceId?: string;
}

export const CatalogPage: React.FC<CatalogPageProps> = ({ sourceId }) => {
  // Active catalog source: derived directly from sourceId prop
  const activeSource: CatalogSourceId | null = (sourceId as CatalogSourceId) || null;

  const currentSourceConfig = useMemo(() => {
    return CATALOG_SOURCES.find((s) => s.id === activeSource) || null;
  }, [activeSource]);

  // Dialog state
  const [addSourceDialogOpen, setAddSourceDialogOpen] = useState(false);
  const [customFeedDialogOpen, setCustomFeedDialogOpen] = useState(false);
  const [selectedBookForDetails, setSelectedBookForDetails] = useState<CatalogBook | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Loading state and refresh trigger for active view
  const [isSourceLoading, setIsSourceLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Existing books in Dexie MyShelf
  const existingBooks = useLiveQuery(() => db.books.toArray(), []);
  const existingBookTitles = useMemo(() => {
    return new Set((existingBooks || []).map((b) => b.title.trim().toLowerCase()));
  }, [existingBooks]);

  // Seed default feeds and migrate legacy feeds in DB
  useEffect(() => {
    db.opds_feeds.toArray().then((existing) => {
      const needsUpdate =
        existing.length === 0 ||
        existing.some(
          (f) =>
            f.url.includes('gutendex.com') ||
            f.url.includes('feedbooks.com') ||
            f.url === 'https://standardebooks.org/feeds/opds'
        );
      if (needsUpdate) {
        const customFeeds = existing.filter((f) => f.isCustom);
        db.opds_feeds.clear().then(() => {
          db.opds_feeds.bulkPut([...DEFAULT_OPDS_FEEDS, ...customFeeds]);
        });
      }
    });
  }, []);

  // Refresh handler for Top Bar refresh button
  const handleRefreshCurrent = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  // Navigate to specific source
  const handleSelectSource = (id: CatalogSourceId) => {
    navigate(`catalog/${id}`);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Back to Hub source directory
  const handleBackToHub = () => {
    navigateBack('catalog');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Back button handler for Android & Desktop Escape when viewing a specific source
  useEffect(() => {
    if (!activeSource) return;

    const unregister = registerBackHandler(() => {
      handleBackToHub();
      return true;
    });

    return unregister;
  }, [activeSource]);

  // Download & Import Book to Dexie
  const handleDownloadBook = async (book: CatalogBook) => {
    if (downloadingId) return;

    try {
      setDownloadingId(book.id);
      toast.info(`Mengunduh "${book.title}"...`);

      let blob: Blob;
      try {
        const res = await fetchWithCorsProxy(book.downloadUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        blob = await res.blob();

        // Validate if response is HTML error page or text instead of book binary
        if (blob.type.includes('html') || blob.size < 4000) {
          const sample = await blob.text();
          if (
            sample.includes('401') ||
            sample.includes('403') ||
            sample.includes('Unauthorized') ||
            sample.includes('<html') ||
            sample.includes('<!DOCTYPE')
          ) {
            throw new Error(
              'Buku ini memerlukan izin akses khusus atau pinjaman digital di Internet Archive.'
            );
          }
        }
      } catch (err: unknown) {
        throw new Error(
          err instanceof Error
            ? err.message
            : 'Gagal mengunduh berkas. Pastikan server mengizinkan akses unduhan.',
          { cause: err }
        );
      }

      const ext = book.format === 'pdf' ? 'pdf' : 'epub';
      const cleanName = book.title.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'book';
      const file = new File([blob], `${cleanName}.${ext}`, {
        type: book.format === 'pdf' ? 'application/pdf' : 'application/epub+zip',
      });

      const importResult = await importBookFiles([file]);

      if (importResult.imported > 0 && importResult.books[0]) {
        const savedBook = importResult.books[0];
        toast.success(`"${book.title}" berhasil ditambahkan ke MyShelf!`);
        if (selectedBookForDetails?.id === book.id) {
          setSelectedBookForDetails(null);
        }
        setTimeout(() => {
          if (window.confirm(`"${book.title}" berhasil diunduh. Buka dan baca buku sekarang?`)) {
            navigate(`read/${savedBook.id}`);
          }
        }, 300);
      } else {
        toast.error(`Gagal memproses berkas "${book.title}"`);
      }
    } catch (err: unknown) {
      console.error('Gagal mengunduh buku katalog:', err);
      toast.error(err instanceof Error ? err.message : `Gagal mengunduh "${book.title}"`);
    } finally {
      setDownloadingId(null);
    }
  };

  // Navigate directly to reader if book is already downloaded
  const handleReadDownloadedBook = (book: CatalogBook) => {
    const existing = (existingBooks || []).find(
      (b) => b.title.trim().toLowerCase() === book.title.trim().toLowerCase()
    );
    if (existing) {
      navigate(`read/${existing.id}`);
    } else {
      toast.info('Buku belum tersedia secara lokal');
    }
  };

  // Add custom OPDS feed
  const handleAddCustomFeed = async (title: string, url: string) => {
    const newFeed: OpdsFeed = {
      id: `custom-feed-${Date.now()}`,
      title,
      url,
      icon: '🌐',
      isCustom: true,
      createdAt: Date.now(),
    };
    await db.opds_feeds.put(newFeed);
    toast.success(`Feed OPDS "${title}" berhasil disimpan`);
    navigate('catalog/opds');
  };

  // Shared props for all catalog sub-views
  const sharedViewProps = {
    existingBookTitles,
    downloadingId,
    onDownloadBook: handleDownloadBook,
    onOpenDetails: setSelectedBookForDetails,
    onReadBook: handleReadDownloadedBook,
    refreshTrigger,
    onLoadingChange: setIsSourceLoading,
  };

  return (
    <div className="bg-surface text-on-surface flex min-h-screen flex-col">
      {/* 1. TOP APP BAR */}
      <header className="bg-surface/90 border-outline-variant/20 sticky top-0 z-30 flex items-center justify-between gap-3 border-b px-4 py-3 backdrop-blur-md sm:px-8">
        <div className="flex min-w-0 items-center gap-2.5">
          {!activeSource ? (
            /* Hub Mode: Back to MyShelf button on mobile */
            <>
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
                  Katalog Buku
                </h1>
                <p className="text-on-surface-variant hidden text-xs sm:block">
                  Pusat katalog & perpustakaan digital terbuka
                </p>
              </div>
            </>
          ) : (
            /* Source Detail Mode: Back to Hub button */
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={handleBackToHub}
                className="hover:bg-surface-container text-on-surface flex cursor-pointer items-center gap-1.5 rounded-xl px-2 py-1.5 text-xs font-semibold transition-colors active:scale-95"
                title="Kembali ke Daftar Sumber"
              >
                <ArrowLeft size={18} className="text-primary" />
                <span className="hidden sm:inline">Sumber</span>
              </button>

              <div className="bg-outline-variant/40 h-4 w-px" />

              <div className="min-w-0">
                <h1 className="text-on-surface flex items-center gap-2 truncate text-sm font-bold tracking-tight sm:text-base">
                  {currentSourceConfig?.icon && (
                    <currentSourceConfig.icon size={18} className="shrink-0" />
                  )}
                  <span>{currentSourceConfig?.name || 'Katalog Sumber'}</span>
                  {currentSourceConfig?.badge && (
                    <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase">
                      {currentSourceConfig.badge}
                    </span>
                  )}
                </h1>
              </div>
            </div>
          )}
        </div>

        {/* Action Header Button */}
        {activeSource ? (
          <button
            type="button"
            onClick={handleRefreshCurrent}
            disabled={isSourceLoading}
            className="hover:bg-surface-container text-on-surface-variant hover:text-on-surface border-outline-variant/30 flex cursor-pointer items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
            title="Segarkan konten katalog"
          >
            <RefreshCw size={13} className={isSourceLoading ? 'text-primary animate-spin' : ''} />
            <span className="hidden sm:inline">Segarkan</span>
          </button>
        ) : (
          <Button
            variant="tonal"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => setCustomFeedDialogOpen(true)}
            className="text-xs"
          >
            Tambah Feed
          </Button>
        )}
      </header>

      {/* 2. MAIN CONTENT AREA */}
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-5 p-4 pb-28 sm:p-8 sm:pb-16">
        {/* VIEW 1: CATALOG HUB (SOURCE LIST) */}
        {!activeSource && (
          <CatalogHubView
            onSelectSource={handleSelectSource}
            onOpenAddCustomFeed={() => setCustomFeedDialogOpen(true)}
            onOpenAddSourceInfo={() => setAddSourceDialogOpen(true)}
          />
        )}

        {/* VIEW 2: PROJECT GUTENBERG */}
        {activeSource === 'gutenberg' && <GutenbergView {...sharedViewProps} />}

        {/* VIEW 3: STANDARD EBOOKS */}
        {activeSource === 'standardebooks' && <StandardEbooksView {...sharedViewProps} />}

        {/* VIEW 4: CUSTOM & COMMUNITY OPDS FEEDS */}
        {activeSource === 'opds' && (
          <OpdsFeedView
            {...sharedViewProps}
            onOpenAddCustomFeed={() => setCustomFeedDialogOpen(true)}
          />
        )}

        {/* VIEW 5: OPEN LIBRARY (INTERNET ARCHIVE) */}
        {activeSource === 'openlibrary' && <OpenLibraryView {...sharedViewProps} />}
      </main>

      {/* Book Details Dialog */}
      <CatalogBookDetailsDialog
        book={selectedBookForDetails}
        onClose={() => setSelectedBookForDetails(null)}
        isDownloading={downloadingId === selectedBookForDetails?.id}
        isDownloaded={
          !!selectedBookForDetails &&
          existingBookTitles.has(selectedBookForDetails.title.trim().toLowerCase())
        }
        onDownload={handleDownloadBook}
        onRead={handleReadDownloadedBook}
      />

      {/* Add Custom Feed Dialog */}
      <CustomFeedDialog
        open={customFeedDialogOpen}
        onClose={() => setCustomFeedDialogOpen(false)}
        onAddFeed={handleAddCustomFeed}
      />

      {/* Guide Dialog for Adding New Source */}
      <AddSourceDialog
        open={addSourceDialogOpen}
        onClose={() => setAddSourceDialogOpen(false)}
        onOpenCustomFeed={() => setCustomFeedDialogOpen(true)}
      />
    </div>
  );
};
