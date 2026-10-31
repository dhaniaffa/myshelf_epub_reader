import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, BookOpen, ChevronRight, FolderOpen, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { CatalogBookCard } from '@/features/catalog/CatalogBookCard';
import { db, DEFAULT_OPDS_FEEDS } from '@/lib/db';
import { fetchOpdsFeed } from '@/lib/opds';
import { toast } from '@/store/toast';

import type { OpdsFeed, OpdsFeedResult, OpdsNavigationLink } from '@/types';
import type { BaseCatalogViewProps } from './types';

interface OpdsFeedViewProps extends BaseCatalogViewProps {
  onOpenAddCustomFeed: () => void;
}

export const OpdsFeedView: React.FC<OpdsFeedViewProps> = ({
  existingBookTitles,
  downloadingId,
  onDownloadBook,
  onOpenDetails,
  onReadBook,
  refreshTrigger,
  onLoadingChange,
  onOpenAddCustomFeed,
}) => {
  const [selectedFeedUrl, setSelectedFeedUrl] = useState<string>(
    'https://www.gutenberg.org/ebooks/search.opds/?sort_order=downloads'
  );
  const [opdsHistory, setOpdsHistory] = useState<{ title: string; url: string }[]>([]);
  const [opdsResult, setOpdsResult] = useState<OpdsFeedResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OPDS feeds stored in Dexie
  const dbFeeds = useLiveQuery(() => db.opds_feeds.toArray(), []);
  const feeds = useMemo<OpdsFeed[]>(() => {
    if (dbFeeds && dbFeeds.length > 0) return dbFeeds;
    return DEFAULT_OPDS_FEEDS;
  }, [dbFeeds]);

  const loadOpds = useCallback(
    async (url: string) => {
      setLoading(true);
      onLoadingChange?.(true);
      setError(null);
      try {
        const res = await fetchOpdsFeed(url);
        setOpdsResult(res);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Gagal memuat feed OPDS');
      } finally {
        setLoading(false);
        onLoadingChange?.(false);
      }
    },
    [onLoadingChange]
  );

  useEffect(() => {
    if (selectedFeedUrl) {
      const timer = setTimeout(() => {
        void loadOpds(selectedFeedUrl);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [loadOpds, selectedFeedUrl, refreshTrigger]);

  const handleDeleteCustomFeed = async (feedId: string) => {
    await db.opds_feeds.delete(feedId);
    toast.info('Feed OPDS kustom telah dihapus');
  };

  const handleNavigateOpdsSub = (sub: OpdsNavigationLink) => {
    if (opdsResult) {
      setOpdsHistory((prev) => [
        ...prev,
        { title: opdsResult.title || 'Katalog', url: selectedFeedUrl },
      ]);
    }
    setSelectedFeedUrl(sub.href);
  };

  const handleOpdsBackHistory = () => {
    if (opdsHistory.length === 0) return;
    const prevHistory = [...opdsHistory];
    const last = prevHistory.pop();
    if (last) {
      setOpdsHistory(prevHistory);
      setSelectedFeedUrl(last.url);
    }
  };

  return (
    <div className="space-y-4">
      {/* Feed Selector & Add Custom Feed Button */}
      <div className="bg-surface-container/60 border-outline-variant/30 flex flex-col items-stretch justify-between gap-3 rounded-2xl border p-3.5 sm:flex-row sm:items-center">
        <div className="flex flex-1 scrollbar-none items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {feeds.map((feed) => {
            const isSelected = selectedFeedUrl === feed.url;
            return (
              <div
                key={feed.id}
                className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-primary text-on-primary border-primary shadow-xs'
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface border-outline-variant/30'
                }`}
                onClick={() => {
                  setOpdsHistory([]);
                  setSelectedFeedUrl(feed.url);
                }}
              >
                <span>{feed.icon || '📚'}</span>
                <span>{feed.title}</span>
                {feed.isCustom && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDeleteCustomFeed(feed.id);
                    }}
                    className="text-on-primary/70 ml-1 hover:text-white"
                    title="Hapus Feed"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <Button
          variant="filled"
          size="sm"
          icon={<Plus size={15} />}
          onClick={onOpenAddCustomFeed}
          className="shrink-0 text-xs"
        >
          Tambah Feed OPDS
        </Button>
      </div>

      {/* Breadcrumb Navigation for Nested Subsections */}
      {opdsHistory.length > 0 && (
        <div className="text-on-surface-variant flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={handleOpdsBackHistory}
            className="text-primary flex cursor-pointer items-center gap-1 font-medium hover:underline"
          >
            <ArrowLeft size={13} />
            <span>Kembali</span>
          </button>
          <ChevronRight size={13} className="text-outline-variant" />
          <span className="text-on-surface truncate font-semibold">
            {opdsResult?.title || 'Sub-Kategori'}
          </span>
        </div>
      )}

      {/* OPDS Error Message */}
      {error && (
        <div className="bg-error-container text-on-error-container border-error/20 flex items-center justify-between rounded-2xl border p-4 text-xs sm:text-sm">
          <span>{error}</span>
          <Button variant="outlined" size="sm" onClick={() => void loadOpds(selectedFeedUrl)}>
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Subsections (Categories/Sub-catalogs) */}
      {opdsResult?.subsections && opdsResult.subsections.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-on-surface-variant flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase">
            <FolderOpen size={14} className="text-primary" />
            <span>Kategori & Sub-Katalog</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {opdsResult.subsections.map((sub, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleNavigateOpdsSub(sub)}
                className="bg-surface-container hover:bg-surface-container-high border-outline-variant/30 text-on-surface flex cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-medium shadow-xs transition-colors"
              >
                <span>{sub.title}</span>
                <ChevronRight size={13} className="text-on-surface-variant" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* OPDS Books Grid */}
      {opdsResult?.books && opdsResult.books.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-on-surface-variant text-xs font-semibold tracking-wider uppercase">
            Daftar Buku ({opdsResult.books.length})
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {opdsResult.books.map((book) => {
              const isDownloaded = existingBookTitles.has(book.title.trim().toLowerCase());
              const isDownloading = downloadingId === book.id;
              return (
                <CatalogBookCard
                  key={book.id}
                  book={book}
                  isDownloaded={isDownloaded}
                  isDownloading={isDownloading}
                  onDownload={onDownloadBook}
                  onOpenDetails={onOpenDetails}
                  onRead={onReadBook}
                />
              );
            })}
          </div>
        </div>
      ) : !loading &&
        opdsResult &&
        (!opdsResult.subsections || opdsResult.subsections.length === 0) ? (
        <div className="text-on-surface-variant py-16 text-center">
          <BookOpen size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">Tidak ada buku dalam feed ini.</p>
        </div>
      ) : null}

      {/* OPDS Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-3 border-t-transparent" />
          <p className="text-on-surface-variant text-xs font-medium">Memuat feed OPDS...</p>
        </div>
      )}
    </div>
  );
};
