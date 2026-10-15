import React, { useState } from 'react';
import { BookOpen, Check, Download, DownloadCloud } from 'lucide-react';

import { Button } from '@/components/ui';

import type { CatalogBook } from '@/types';

interface CatalogBookCardProps {
  book: CatalogBook;
  isDownloading: boolean;
  isDownloaded: boolean;
  onDownload: (book: CatalogBook) => void;
  onOpenDetails: (book: CatalogBook) => void;
  onRead: (book: CatalogBook) => void;
}

export const CatalogBookCard: React.FC<CatalogBookCardProps> = ({
  book,
  isDownloading,
  isDownloaded,
  onDownload,
  onOpenDetails,
  onRead,
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={() => onOpenDetails(book)}
      className="group bg-surface-container/60 hover:bg-surface-container border-outline-variant/30 hover:border-outline-variant/60 flex cursor-pointer flex-col rounded-2xl border p-2.5 text-left shadow-xs transition-all duration-200 hover:shadow-md sm:p-3"
    >
      {/* Cover Container */}
      <div className="bg-surface-container-highest relative mb-2.5 flex aspect-2/3 w-full items-center justify-center overflow-hidden rounded-xl shadow-xs sm:mb-3">
        {book.coverUrl && !imgError ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            loading="lazy"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-102"
          />
        ) : (
          <div className="from-surface-container-high to-surface-container-highest flex h-full w-full flex-col items-center justify-center bg-linear-to-br p-4 text-center">
            <BookOpen size={32} className="text-on-surface-variant/40 mb-2" />
            <p className="text-on-surface-variant line-clamp-2 text-[11px] font-semibold">
              {book.title}
            </p>
          </div>
        )}

        {/* Format Badge */}
        <div className="absolute top-2 left-2">
          <span
            className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase shadow-xs backdrop-blur-md ${
              book.format === 'pdf'
                ? 'bg-rose-500/90 text-white'
                : 'bg-black/70 text-white dark:bg-white/80 dark:text-black'
            }`}
          >
            {book.format}
          </span>
        </div>

        {/* Download Count Chip */}
        {book.downloadCount !== undefined && book.downloadCount > 0 && (
          <div className="absolute right-2 bottom-2 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white backdrop-blur-md">
            <Download size={10} />
            <span>{book.downloadCount.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Book Metadata */}
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <h3
            className="text-on-surface group-hover:text-primary mb-1 line-clamp-2 min-h-9 text-xs leading-snug font-semibold transition-colors sm:text-sm"
            title={book.title}
          >
            {book.title}
          </h3>
          <p className="text-on-surface-variant mb-2 line-clamp-1 text-[11px]" title={book.author}>
            {book.author}
          </p>
        </div>

        {/* Action Button */}
        <div className="border-outline-variant/20 mt-auto border-t pt-2">
          {isDownloaded ? (
            <Button
              variant="tonal"
              size="sm"
              className="w-full text-xs font-medium"
              icon={<Check size={14} className="text-primary" />}
              onClick={(e) => {
                e.stopPropagation();
                onRead(book);
              }}
            >
              Baca
            </Button>
          ) : isDownloading ? (
            <Button variant="outlined" size="sm" className="w-full text-xs" disabled>
              <div className="border-primary mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-t-transparent" />
              <span>Mengunduh...</span>
            </Button>
          ) : (
            <Button
              variant="outlined"
              size="sm"
              className="hover:border-primary hover:text-primary w-full text-xs font-medium"
              icon={<DownloadCloud size={14} />}
              onClick={(e) => {
                e.stopPropagation();
                onDownload(book);
              }}
            >
              Unduh
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
