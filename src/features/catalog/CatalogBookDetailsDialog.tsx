import React, { useState } from 'react';
import { BookOpen, Check, Download, DownloadCloud, Globe, Tag, User } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';

import type { CatalogBook } from '@/types';

interface CatalogBookDetailsDialogProps {
  book: CatalogBook | null;
  onClose: () => void;
  isDownloading: boolean;
  isDownloaded: boolean;
  onDownload: (book: CatalogBook) => void;
  onRead: (book: CatalogBook) => void;
}

export const CatalogBookDetailsDialog: React.FC<CatalogBookDetailsDialogProps> = ({
  book,
  onClose,
  isDownloading,
  isDownloaded,
  onDownload,
  onRead,
}) => {
  const [imgError, setImgError] = useState(false);

  if (!book) return null;

  return (
    <Dialog open={!!book} onClose={onClose} title="Detail Buku">
      <div className="space-y-6">
        {/* Header Preview */}
        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-start sm:text-left">
          {/* Cover Container */}
          <div className="bg-surface-container-highest flex aspect-2/3 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-md sm:w-32">
            {book.coverUrl && !imgError ? (
              <img
                src={book.coverUrl}
                alt={book.title}
                onError={() => setImgError(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="bg-surface-container-high flex h-full w-full flex-col items-center justify-center p-2 text-center">
                <BookOpen size={28} className="text-on-surface-variant/40 mb-1" />
                <span className="text-on-surface-variant line-clamp-2 text-[10px]">
                  {book.title}
                </span>
              </div>
            )}
          </div>

          {/* Title & Author */}
          <div className="flex-1 space-y-2">
            <div className="inline-flex items-center gap-2">
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                  book.format === 'pdf'
                    ? 'bg-rose-500/20 text-rose-500'
                    : 'bg-primary/20 text-primary'
                }`}
              >
                {book.format}
              </span>
              {book.source === 'gutenberg' && (
                <span className="bg-surface-container-highest text-on-surface-variant rounded-md px-2 py-0.5 text-[10px] font-medium">
                  Project Gutenberg
                </span>
              )}
              {book.source === 'openlibrary' && (
                <span className="rounded-md bg-indigo-500/15 px-2 py-0.5 text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
                  Open Library (Internet Archive)
                </span>
              )}
            </div>

            <h2 className="text-on-surface text-base leading-snug font-bold sm:text-lg">
              {book.title}
            </h2>

            <div className="text-on-surface-variant flex items-center justify-center gap-1.5 text-xs sm:justify-start">
              <User size={14} className="shrink-0" />
              <span>{book.author}</span>
            </div>

            {book.downloadCount !== undefined && book.downloadCount > 0 && (
              <p className="text-on-surface-variant flex items-center justify-center gap-1 pt-1 text-xs sm:justify-start">
                <Download size={13} className="text-primary" />
                <span>Diunduh lebih dari {book.downloadCount.toLocaleString()} kali</span>
              </p>
            )}
          </div>
        </div>

        {/* Synopsis / Summary */}
        <div className="space-y-2">
          <h4 className="text-on-surface text-xs font-semibold tracking-wider uppercase">
            Sinopsis & Ringkasan
          </h4>
          <div className="bg-surface-container/50 text-on-surface-variant max-h-44 overflow-y-auto rounded-xl p-3.5 text-xs leading-relaxed sm:text-sm">
            {book.summary ? (
              <p>{book.summary}</p>
            ) : (
              <p className="text-on-surface-variant/60 italic">
                Tidak ada deskripsi sinopsis untuk buku domain publik ini.
              </p>
            )}
          </div>
        </div>

        {/* Additional Metadata Grid */}
        <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
          {book.language && (
            <div className="bg-surface-container/40 flex items-center gap-2.5 rounded-lg p-2.5">
              <Globe size={15} className="text-primary shrink-0" />
              <div>
                <p className="text-on-surface-variant text-[10px]">Bahasa</p>
                <p className="text-on-surface font-medium uppercase">{book.language}</p>
              </div>
            </div>
          )}

          {book.subjects && book.subjects.length > 0 && (
            <div className="bg-surface-container/40 col-span-1 flex items-start gap-2.5 rounded-lg p-2.5 sm:col-span-2">
              <Tag size={15} className="text-primary mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-on-surface-variant mb-1 text-[10px]">Subjek & Kategori</p>
                <div className="flex flex-wrap gap-1">
                  {book.subjects.slice(0, 4).map((subj, idx) => (
                    <span
                      key={idx}
                      className="bg-surface-container-highest text-on-surface-variant rounded-md px-2 py-0.5 text-[10px]"
                    >
                      {subj}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="border-outline-variant/30 flex items-center justify-end gap-3 border-t pt-3">
          <Button variant="text" size="sm" onClick={onClose}>
            Tutup
          </Button>

          {isDownloaded ? (
            <Button
              variant="filled"
              size="sm"
              icon={<Check size={16} />}
              onClick={() => {
                onClose();
                onRead(book);
              }}
            >
              Buka Buku
            </Button>
          ) : isDownloading ? (
            <Button variant="filled" size="sm" disabled>
              <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Mengunduh berkas...</span>
            </Button>
          ) : (
            <Button
              variant="filled"
              size="sm"
              icon={<DownloadCloud size={16} />}
              onClick={() => onDownload(book)}
            >
              Unduh ke MyShelf
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
};
