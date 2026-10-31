import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, CheckCircle2, Info, MoreVertical, Trash2 } from 'lucide-react';

import { IconButton } from '@/components/ui/IconButton';
import { useCoverUrl } from '@/lib/cover';
import { db } from '@/lib/db';
import { formatFileSize, readMetadata } from '@/lib/epub';
import { navigate } from '@/lib/route';
import { useClickOutside } from '@/lib/useClickOutside';
import { toast } from '@/store/toast';

import type { Book } from '@/types';

interface BookCompactRowProps {
  book: Book;
  onDeleteRequest: (book: Book) => void;
  onShowDetails?: (book: Book) => void;
}

export const BookCompactRow: React.FC<BookCompactRowProps> = ({
  book,
  onDeleteRequest,
  onShowDetails,
}) => {
  const coverUrl = useCoverUrl(book.id, book.cover);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, () => setMenuOpen(false), menuOpen);

  // Backfill publishedYear & fileSize for existing books if not stored
  useEffect(() => {
    if (book.publishedYear === undefined || book.fileSize === undefined) {
      db.files.get(book.id).then(async (file) => {
        if (file?.buffer) {
          const updates: Partial<Book> = {};
          if (book.fileSize === undefined) {
            updates.fileSize =
              file.buffer instanceof Blob ? file.buffer.size : file.buffer.byteLength;
          }
          if (book.publishedYear === undefined && book.format !== 'pdf') {
            const raw = file.buffer instanceof Blob ? await file.buffer.arrayBuffer() : file.buffer;
            readMetadata(raw)
              .then((meta) => {
                updates.publishedYear = meta.publishedYear || null;
                db.books.update(book.id, updates);
              })
              .catch(() => {
                if (Object.keys(updates).length > 0) {
                  db.books.update(book.id, updates);
                }
              });
          } else if (Object.keys(updates).length > 0) {
            db.books.update(book.id, updates);
          }
        }
      });
    }
  }, [book.id, book.publishedYear, book.fileSize, book.format]);

  const progressPercent = Math.round((book.progress || 0) * 100);

  const handleToggleCompleted = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    const nextStatus = book.status === 'completed' ? 'reading' : 'completed';
    await db.books.update(book.id, {
      status: nextStatus,
      progress: nextStatus === 'completed' ? 1 : book.progress,
    });
    toast.info(
      nextStatus === 'completed'
        ? 'Ditandai selesai dibaca'
        : 'Status dikembalikan ke sedang dibaca'
    );
  };

  const handleRowClick = () => {
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }
    navigate(`/read/${book.id}`);
  };

  return (
    <div
      onClick={handleRowClick}
      className="group hover:bg-surface-container/70 flex cursor-pointer items-center gap-3 px-3.5 py-2.5 transition-colors select-none sm:gap-4 sm:px-4"
    >
      {/* Mini Cover (Aspect 2:3) */}
      <div className="bg-surface-container-high border-outline-variant/30 relative h-12 w-8.5 shrink-0 overflow-hidden rounded-lg border shadow-xs">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={book.title}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="from-primary/20 to-secondary/20 text-primary flex h-full w-full items-center justify-center bg-linear-to-br">
            <BookOpen size={12} />
          </div>
        )}
      </div>

      {/* Title & Author */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="text-on-surface group-hover:text-primary truncate text-xs font-semibold transition-colors sm:text-sm">
            {book.title}
          </h4>
          <span
            className={`py-0.2 shrink-0 rounded px-1 font-mono text-[8px] font-bold uppercase ${
              book.format === 'pdf'
                ? 'border border-rose-500/30 bg-rose-500/15 text-rose-600 dark:text-rose-400'
                : 'bg-surface-container-highest text-on-surface-variant'
            }`}
          >
            {book.format === 'pdf' ? 'PDF' : 'EPUB'}
          </span>
          {book.status === 'completed' && (
            <span className="xs:inline-flex py-0.2 hidden shrink-0 rounded-full bg-emerald-500/10 px-1.5 text-[9px] font-bold text-emerald-600">
              Selesai
            </span>
          )}
        </div>
        <p className="text-on-surface-variant mt-0.5 truncate text-[11px]">{book.author}</p>
      </div>

      {/* Published Year (Tablet/Desktop) */}
      <div className="text-on-surface-variant/80 hidden w-16 shrink-0 text-center text-xs font-medium sm:block">
        {book.publishedYear || '-'}
      </div>

      {/* File Size */}
      <div className="text-on-surface-variant w-16 shrink-0 text-right font-mono text-xs font-medium sm:w-20">
        {book.fileSize ? formatFileSize(book.fileSize) : '-'}
      </div>

      {/* Progress */}
      <div className="flex w-18 shrink-0 items-center justify-end gap-2 sm:w-24">
        <div className="xs:block bg-surface-container-highest hidden h-1.5 flex-1 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-on-surface-variant font-mono text-[11px] font-semibold">
          {progressPercent}%
        </span>
      </div>

      {/* Context Menu Button */}
      <div
        ref={menuRef}
        className="relative flex w-8 shrink-0 items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <IconButton
          size="sm"
          variant="standard"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          className="text-on-surface-variant hover:text-on-surface"
          aria-label="Menu opsi buku"
        >
          <MoreVertical size={15} />
        </IconButton>

        {menuOpen && (
          <div className="bg-surface-container-highest border-outline-variant/40 animate-fade-in pointer-events-auto absolute top-full right-0 z-50 mt-1 w-44 rounded-xl border py-1.5 text-xs shadow-xl">
            <button
              onClick={() => {
                setMenuOpen(false);
                onShowDetails?.(book);
              }}
              className="hover:bg-surface-container text-on-surface flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left"
            >
              <Info size={14} className="text-primary" />
              <span>Tentang Buku</span>
            </button>
            <button
              onClick={handleToggleCompleted}
              className="hover:bg-surface-container text-on-surface flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left"
            >
              <CheckCircle2 size={14} className="text-emerald-500" />
              <span>{book.status === 'completed' ? 'Batal Selesai' : 'Tandai Selesai'}</span>
            </button>
            <div className="border-outline-variant/30 my-1 border-t" />
            <button
              onClick={() => {
                setMenuOpen(false);
                onDeleteRequest(book);
              }}
              className="hover:bg-error-container/30 text-error flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left"
            >
              <Trash2 size={14} />
              <span>Hapus Buku</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
