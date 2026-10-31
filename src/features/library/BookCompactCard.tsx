import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  CheckSquare,
  Info,
  MoreVertical,
  Square,
  Tag,
  Trash2,
} from 'lucide-react';

import { useCoverUrl } from '@/lib/cover';
import { db } from '@/lib/db';
import { readMetadata } from '@/lib/epub';
import { navigate } from '@/lib/route';
import { useClickOutside } from '@/lib/useClickOutside';
import { toast } from '@/store/toast';

import type { Book } from '@/types';

interface BookCompactCardProps {
  book: Book;
  onDeleteRequest: (book: Book) => void;
  onShowDetails?: (book: Book) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (bookId: string) => void;
}

export const BookCompactCard: React.FC<BookCompactCardProps> = ({
  book,
  onDeleteRequest,
  onShowDetails,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
}) => {
  const coverUrl = useCoverUrl(book.cover);
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

  const handleCardClick = () => {
    if (isSelectionMode) {
      onToggleSelect?.(book.id);
      return;
    }
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }
    navigate(`/read/${book.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group bg-surface-container-low hover:bg-surface-container relative flex cursor-pointer flex-col rounded-xl border transition-all duration-200 select-none hover:-translate-y-0.5 hover:shadow-md ${
        isSelectionMode
          ? isSelected
            ? 'border-rose-500 bg-rose-500/5 ring-2 ring-rose-500'
            : 'border-outline-variant/60 hover:border-primary/60'
          : 'border-outline-variant/30 hover:border-primary/40'
      } ${menuOpen ? 'z-40' : ''}`}
    >
      {/* Cover Aspect Ratio 2:3 */}
      <div className="relative aspect-2/3 w-full">
        <div className="bg-surface-container-high relative flex h-full w-full items-center justify-center overflow-hidden rounded-t-xl">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={book.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-103"
              loading="lazy"
            />
          ) : (
            <div className="from-primary/15 via-secondary/10 to-tertiary/20 text-on-surface flex h-full w-full flex-col justify-between bg-linear-to-br p-2.5">
              <div className="bg-primary/20 text-primary flex h-6 w-6 items-center justify-center rounded-full">
                <BookOpen size={13} />
              </div>
              <div>
                <h4 className="line-clamp-2 text-xs leading-tight font-bold">{book.title}</h4>
                <p className="text-on-surface-variant mt-0.5 line-clamp-1 text-[10px]">
                  {book.author}
                </p>
              </div>
              <div className="text-outline font-mono text-[8px] tracking-wider uppercase">
                {book.publishedYear ? `Tahun ${book.publishedYear}` : 'MyShelf'}
              </div>
            </div>
          )}

          {/* Book spine light sheen */}
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-2 bg-linear-to-r from-black/25 via-white/10 to-transparent" />

          {/* Format Badge (PDF / EPUB) */}
          <div className="absolute top-1 left-1 z-20">
            <span
              className={`py-0.2 rounded px-1 font-mono text-[8px] font-bold tracking-wider uppercase shadow-xs ${
                book.format === 'pdf'
                  ? 'bg-rose-600/90 text-white'
                  : 'bg-black/50 text-white/90 backdrop-blur-xs'
              }`}
            >
              {book.format === 'pdf' ? 'PDF' : 'EPUB'}
            </span>
          </div>

          {/* Micro Progress Bar Line */}
          <div className="absolute inset-x-0 bottom-0 z-20 h-1 bg-black/40">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Selection Checkbox (when in selection mode) or More Actions Button */}
        {isSelectionMode ? (
          <div className="absolute top-1 right-1 z-30">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-lg border shadow-sm transition-all ${
                isSelected
                  ? 'scale-105 border-rose-600 bg-rose-500 text-white shadow-md'
                  : 'border-white/40 bg-black/50 text-white/70 backdrop-blur-md hover:bg-black/70'
              }`}
            >
              {isSelected ? <CheckSquare size={14} className="text-white" /> : <Square size={14} />}
            </div>
          </div>
        ) : (
          <div
            ref={menuRef}
            className="absolute top-1 right-1 z-30"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-black/40 text-white shadow-sm backdrop-blur-md transition-colors hover:bg-black/70 active:scale-95"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              aria-label="Menu opsi buku"
            >
              <MoreVertical size={12} />
            </button>

            {menuOpen && (
              <div className="bg-surface-container-highest border-outline-variant/40 animate-fade-in pointer-events-auto absolute right-0 z-50 mt-1 w-36 rounded-xl border py-1.5 text-xs shadow-xl sm:w-44">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onShowDetails?.(book);
                  }}
                  className="hover:bg-surface-container text-on-surface flex w-full cursor-pointer items-center gap-2 px-2.5 py-1.5 text-left sm:px-3 sm:py-2"
                >
                  <Info size={13} className="text-primary shrink-0" />
                  <span className="truncate">Tentang Buku</span>
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onShowDetails?.(book);
                  }}
                  className="hover:bg-surface-container text-on-surface flex w-full cursor-pointer items-center gap-2 px-2.5 py-1.5 text-left sm:px-3 sm:py-2"
                >
                  <Tag size={13} className="text-primary shrink-0" />
                  <span className="truncate">Kelola Tag</span>
                </button>
                <button
                  onClick={handleToggleCompleted}
                  className="hover:bg-surface-container text-on-surface flex w-full cursor-pointer items-center gap-2 px-2.5 py-1.5 text-left sm:px-3 sm:py-2"
                >
                  <CheckCircle2 size={13} className="shrink-0 text-emerald-500" />
                  <span className="truncate">
                    {book.status === 'completed' ? 'Batal Selesai' : 'Tandai Selesai'}
                  </span>
                </button>
                <div className="border-outline-variant/30 my-1 border-t" />
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onDeleteRequest(book);
                  }}
                  className="hover:bg-error-container/30 text-error flex w-full cursor-pointer items-center gap-2 px-2.5 py-1.5 text-left sm:px-3 sm:py-2"
                >
                  <Trash2 size={13} className="shrink-0" />
                  <span className="truncate">Hapus Buku</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Book compact info below cover */}
      <div className="flex flex-1 flex-col justify-between p-2">
        <div className="space-y-0.5">
          <h3 className="text-on-surface group-hover:text-primary line-clamp-2 text-[11px] leading-tight font-semibold transition-colors sm:text-xs">
            {book.title}
          </h3>
          <p className="text-on-surface-variant truncate text-[10px] sm:text-[11px]">
            {book.author || 'Penulis Tidak Diketahui'}
          </p>
        </div>

        <div className="border-outline-variant/15 text-on-surface-variant mt-1.5 flex items-center justify-between border-t pt-1 text-[9px]">
          <span className="font-mono uppercase opacity-70">
            {progressPercent > 0 ? `${progressPercent}%` : book.format}
          </span>
          {book.status === 'completed' ? (
            <span className="inline-flex items-center gap-0.5 font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={9} /> Selesai
            </span>
          ) : book.publishedYear ? (
            <span className="opacity-70">{book.publishedYear}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
};
