import React, { useCallback, useEffect, useState } from 'react';
import { BookOpen, Globe, Search, X } from 'lucide-react';

import { Button } from '@/components/ui';
import { CatalogBookCard } from '@/features/catalog/CatalogBookCard';
import { fetchOpenLibraryBooks, OPEN_LIBRARY_CURATED_TOPICS } from '@/lib/openlibrary';

import type { CatalogBook } from '@/types';
import type { BaseCatalogViewProps } from './types';

export const OpenLibraryView: React.FC<BaseCatalogViewProps> = ({
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
  const [topic, setTopic] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [hasNext, setHasNext] = useState<boolean>(false);
  const [totalCount, setTotalCount] = useState<number>(0);

  const loadOpenLibrary = useCallback(
    async (pageToLoad = 1, append = false) => {
      setLoading(true);
      onLoadingChange?.(true);
      setError(null);
      try {
        const res = await fetchOpenLibraryBooks({
          search,
          topic,
          page: pageToLoad,
          limit: 24,
        });

        setTotalCount(res.count);
        setHasNext(res.hasNext);
        setPage(pageToLoad);

        if (append) {
          setBooks((prev) => [...prev, ...res.books]);
        } else {
          setBooks(res.books);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Gagal memuat katalog Open Library');
      } finally {
        setLoading(false);
        onLoadingChange?.(false);
      }
    },
    [search, topic, onLoadingChange]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadOpenLibrary(1, false);
    }, 0);
    return () => clearTimeout(timer);
  }, [loadOpenLibrary, topic, refreshTrigger]);

  return (
    <div className="space-y-4">
      {/* Unified Search Input with Integrated Search Button */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void loadOpenLibrary(1, false);
        }}
        className="bg-surface-container border-outline-variant/40 focus-within:border-primary relative flex items-center rounded-2xl border shadow-xs transition-colors"
      >
        <Search size={18} className="text-on-surface-variant/70 ml-3.5 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari jutaan buku di Open Library & Internet Archive (contoh: Tolkien, Dracula)..."
          className="text-on-surface placeholder:text-on-surface-variant/60 w-full bg-transparent px-3 py-2.5 text-xs focus:outline-hidden sm:text-sm"
        />
        {search && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setTimeout(() => void loadOpenLibrary(1, false), 50);
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
        {OPEN_LIBRARY_CURATED_TOPICS.map((t) => {
          const isActive = topic === t.id && !search;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTopic(t.id);
                setSearch('');
                setPage(1);
              }}
              className={`shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-xs transition-all ${
                isActive
                  ? 'bg-primary text-on-primary border-primary font-semibold shadow-xs'
                  : 'bg-surface-container/70 hover:bg-surface-container text-on-surface-variant border-outline-variant/30 font-medium'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Meta Information / Filter summary */}
      <div className="text-on-surface-variant flex items-center justify-between px-1 text-xs">
        <span className="flex items-center gap-1.5">
          <Globe size={13} className="text-primary" />
          {search ? (
            <span>
              Hasil untuk <b className="text-on-surface">&ldquo;{search}&rdquo;</b>
            </span>
          ) : (
            <span>
              Kategori:{' '}
              <b className="text-on-surface">
                {OPEN_LIBRARY_CURATED_TOPICS.find((t) => t.id === topic)?.label || 'Populer'}
              </b>
            </span>
          )}
        </span>

        {totalCount > 0 && (
          <span className="text-[11px] opacity-75">
            Tersedia ~{totalCount.toLocaleString()} naskah digital
          </span>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-error-container/20 border-error-container/40 flex flex-col items-center justify-center gap-2 rounded-2xl border p-6 text-center">
          <p className="text-error text-xs font-medium sm:text-sm">{error}</p>
          <button
            type="button"
            onClick={() => void loadOpenLibrary(page, false)}
            className="bg-primary hover:bg-primary/90 text-on-primary mt-1 cursor-pointer rounded-xl px-4 py-1.5 text-xs font-semibold"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Books Grid with Responsive columns */}
      {loading && books.length === 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface-container/50 border-outline-variant/20 flex animate-pulse flex-col rounded-2xl border p-2.5 sm:p-3"
            >
              <div className="bg-surface-container-highest mb-2.5 aspect-2/3 w-full rounded-xl sm:mb-3" />
              <div className="bg-surface-container-highest mb-2 h-3.5 w-3/4 rounded-md" />
              <div className="bg-surface-container-highest mb-3 h-3 w-1/2 rounded-md" />
              <div className="bg-surface-container-highest mt-auto h-7 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : books.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {books.map((book) => {
              const isDownloaded = existingBookTitles.has(book.title.trim().toLowerCase());
              const isDownloading = downloadingId === book.id;

              return (
                <CatalogBookCard
                  key={book.id}
                  book={book}
                  isDownloading={isDownloading}
                  isDownloaded={isDownloaded}
                  onDownload={onDownloadBook}
                  onOpenDetails={onOpenDetails}
                  onRead={onReadBook}
                />
              );
            })}
          </div>

          {/* Pagination Controls */}
          <div className="border-outline-variant/20 flex items-center justify-between border-t pt-4">
            <Button
              variant="outlined"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => {
                const prevPage = page - 1;
                void loadOpenLibrary(prevPage, false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-xs"
            >
              Sebelumnya
            </Button>

            <span className="text-on-surface-variant text-xs font-medium">Halaman {page}</span>

            <Button
              variant="outlined"
              size="sm"
              disabled={!hasNext || loading}
              onClick={() => {
                const nextPage = page + 1;
                void loadOpenLibrary(nextPage, false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-xs"
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      ) : !loading && !error ? (
        <div className="text-on-surface-variant py-16 text-center">
          <BookOpen size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">Tidak ada buku yang ditemukan di Open Library.</p>
          <p className="mt-1 text-xs opacity-75">
            Coba kata kunci lain atau pilih salah satu kategori populer di atas.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setTopic('all');
            }}
            className="bg-surface-container-high hover:bg-surface-container-highest text-on-surface mt-4 cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold"
          >
            Tampilkan Koleksi Populer
          </button>
        </div>
      ) : null}
    </div>
  );
};
