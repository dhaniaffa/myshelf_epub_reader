import React, { useCallback, useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';

import { Button } from '@/components/ui';
import { CatalogBookCard } from '@/features/catalog/CatalogBookCard';
import { fetchGutenbergBooks, GUTENBERG_CURATED_TOPICS } from '@/lib/gutenberg';

import type { CatalogBook } from '@/types';
import type { BaseCatalogViewProps } from './types';

export const GutenbergView: React.FC<BaseCatalogViewProps> = ({
  existingBookTitles,
  downloadingId,
  onDownloadBook,
  onOpenDetails,
  onReadBook,
  refreshTrigger,
  onLoadingChange,
}) => {
  const [books, setBooks] = useState<CatalogBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);
  const [totalCount, setTotalCount] = useState<number>(0);

  const loadGutenberg = useCallback(
    async (pageToLoad = 1, append = false) => {
      setLoading(true);
      onLoadingChange?.(true);
      setError(null);
      try {
        const topicObj = GUTENBERG_CURATED_TOPICS.find((t) => t.id === selectedTopic);
        const res = await fetchGutenbergBooks({
          search: searchQuery,
          topic: topicObj?.query || undefined,
          languages: topicObj?.language || undefined,
          page: pageToLoad,
        });

        setTotalCount(res.count);
        setHasNextPage(!!res.next);
        setCurrentPage(pageToLoad);

        if (append) {
          setBooks((prev) => [...prev, ...res.books]);
        } else {
          setBooks(res.books);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Gagal memuat katalog Project Gutenberg');
      } finally {
        setLoading(false);
        onLoadingChange?.(false);
      }
    },
    [selectedTopic, searchQuery, onLoadingChange]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadGutenberg(1, false);
    }, 0);
    return () => clearTimeout(timer);
  }, [loadGutenberg, refreshTrigger]);

  return (
    <div className="space-y-4">
      {/* Unified Search Input with Integrated Search Button */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void loadGutenberg(1, false);
        }}
        className="bg-surface-container border-outline-variant/40 focus-within:border-primary relative flex items-center rounded-2xl border shadow-xs transition-colors"
      >
        <Search size={18} className="text-on-surface-variant/70 ml-3.5 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari judul buku, penulis, atau kata kunci (contoh: Sherlock Holmes, Dracula)..."
          className="text-on-surface placeholder:text-on-surface-variant/60 w-full bg-transparent px-3 py-2.5 text-xs focus:outline-hidden sm:text-sm"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setTimeout(() => void loadGutenberg(1, false), 50);
            }}
            className="text-on-surface-variant hover:text-on-surface mr-1 cursor-pointer p-1"
            title="Hapus pencarian"
          >
            <X size={16} />
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="bg-primary hover:bg-primary/90 text-on-primary mr-1.5 flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold shadow-xs transition-all active:scale-95 disabled:opacity-50"
        >
          {loading ? (
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Search size={13} />
          )}
          <span className="hidden sm:inline">Cari</span>
        </button>
      </form>

      {/* Curated Category Chips */}
      <div className="flex scrollbar-none items-center gap-2 overflow-x-auto pb-1">
        {GUTENBERG_CURATED_TOPICS.map((topic) => {
          const isActive = selectedTopic === topic.id;
          return (
            <button
              key={topic.id}
              type="button"
              onClick={() => {
                setSelectedTopic(topic.id);
                setSearchQuery('');
              }}
              className={`shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-xs transition-all ${
                isActive
                  ? 'bg-primary text-on-primary border-primary font-semibold shadow-xs'
                  : 'bg-surface-container/70 hover:bg-surface-container text-on-surface-variant border-outline-variant/30 font-medium'
              }`}
            >
              {topic.label}
            </button>
          );
        })}
      </div>

      {/* Results Status Header */}
      <div className="text-on-surface-variant flex items-center justify-between px-1 text-xs">
        <span className="font-medium">
          {loading
            ? 'Mencari buku...'
            : totalCount > 0
              ? `Menampilkan ${books.length} dari ${totalCount.toLocaleString()} buku`
              : 'Tidak ada buku ditemukan'}
        </span>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-error-container text-on-error-container border-error/20 flex items-center justify-between rounded-2xl border p-4 text-xs sm:text-sm">
          <span>{error}</span>
          <Button variant="outlined" size="sm" onClick={() => void loadGutenberg(1, false)}>
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Books Grid */}
      {books.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {books.map((book) => {
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
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-12">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-3 border-t-transparent" />
          <p className="text-on-surface-variant text-xs font-medium">
            Memuat buku dari Project Gutenberg...
          </p>
        </div>
      )}

      {/* Load More Button */}
      {!loading && hasNextPage && (
        <div className="flex justify-center pt-4 pb-8">
          <Button
            variant="outlined"
            size="md"
            onClick={() => void loadGutenberg(currentPage + 1, true)}
          >
            Muat Lebih Banyak Buku
          </Button>
        </div>
      )}
    </div>
  );
};
