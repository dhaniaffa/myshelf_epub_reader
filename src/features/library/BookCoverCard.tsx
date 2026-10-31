import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  CheckSquare,
  HardDrive,
  Info,
  MoreVertical,
  Square,
  Tag,
  Trash2,
  User,
} from 'lucide-react';

import { useCoverUrl } from '@/lib/cover';
import { db } from '@/lib/db';
import { formatFileSize, readMetadata } from '@/lib/epub';
import { navigate } from '@/lib/route';
import { useClickOutside } from '@/lib/useClickOutside';
import { toast } from '@/store/toast';

import type { Book } from '@/types';

interface BookCoverCardProps {
  book: Book;
  onDeleteRequest: (book: Book) => void;
  onShowDetails?: (book: Book) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (bookId: string) => void;
}

export const BookCoverCard: React.FC<BookCoverCardProps> = ({
  book,
  onDeleteRequest,
  onShowDetails,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
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
      title={book.title}
      className={`group relative aspect-2/3 w-full cursor-pointer overflow-hidden rounded-2xl border shadow-lg ring-1 ring-black/5 transition-all duration-300 select-none hover:-translate-y-2 hover:shadow-2xl dark:ring-white/10 ${
        isSelectionMode
          ? isSelected
            ? 'border-rose-500 ring-4 shadow-rose-500/20 ring-rose-500'
            : 'border-outline-variant/60 hover:border-primary/60'
          : 'border-outline-variant/30 hover:border-primary/60'
      } ${menuOpen ? 'z-40' : ''}`}
    >
      {/* Cover Image or Artistic Cloth-Bound Fallback */}
      <div className="bg-surface-container-high relative h-full w-full">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={book.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="from-primary/20 via-secondary/15 to-tertiary/25 text-on-surface flex h-full w-full flex-col justify-between bg-linear-to-br p-4 sm:p-5">
            <div className="bg-primary/25 text-primary flex h-10 w-10 items-center justify-center rounded-xl shadow-xs">
              <BookOpen size={20} />
            </div>
            <div>
              <h4 className="line-clamp-3 text-sm leading-snug font-bold sm:text-base">
                {book.title}
              </h4>
              <p className="text-on-surface-variant mt-1.5 line-clamp-1 text-xs">{book.author}</p>
            </div>
            <div className="text-outline font-mono text-[10px] tracking-wider uppercase">
              {book.publishedYear ? `Tahun ${book.publishedYear}` : 'MyShelf'}
            </div>
          </div>
        )}

        {/* 3D Realistic Book Spine Light Sheen */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-4 bg-linear-to-r from-black/40 via-white/15 to-transparent" />

        {/* Format Badge (PDF / EPUB) */}
        <div className="pointer-events-none absolute top-2.5 left-2.5 z-20">
          <span
            className={`rounded-lg px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider uppercase shadow-md backdrop-blur-xs ${
              book.format === 'pdf' ? 'bg-rose-600/90 text-white' : 'bg-black/60 text-white/95'
            }`}
          >
            {book.format === 'pdf' ? 'PDF' : 'EPUB'}
          </span>
        </div>

        {/* Bottom Floating Info Pill (Progress / Completed / Title) */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-linear-to-t from-black/90 via-black/50 to-transparent p-3 pt-8 transition-opacity duration-200 group-hover:opacity-0">
          <div className="flex items-center justify-between gap-2 text-white">
            {book.status === 'completed' ? (
              <span className="flex items-center gap-1 rounded-md bg-emerald-600/90 px-2 py-0.5 font-mono text-[10px] font-semibold text-white shadow-xs backdrop-blur-xs">
                <CheckCircle2 size={11} /> Selesai
              </span>
            ) : progressPercent > 0 ? (
              <span className="rounded-md bg-black/70 px-2 py-0.5 font-mono text-[10px] font-semibold text-white/90 shadow-xs backdrop-blur-xs">
                {progressPercent}%
              </span>
            ) : (
              <span className="truncate text-xs font-medium text-white/90 drop-shadow-sm sm:hidden">
                {book.title}
              </span>
            )}
            {progressPercent > 0 && (
              <span className="truncate text-[11px] text-white/80 drop-shadow-xs sm:hidden">
                {book.title}
              </span>
            )}
          </div>
        </div>

        {/* Bottom Progress Bar Line */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-1.5 bg-black/40">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Desktop & Tablet Hover Overlay: Full Title, Author, Year, and Quick Read */}
        {!isSelectionMode && (
          <div className="pointer-events-none absolute inset-0 z-15 hidden flex-col justify-between bg-black/85 p-4 text-white opacity-0 backdrop-blur-xs transition-opacity duration-200 group-hover:opacity-100 sm:flex">
            <div className="space-y-2 overflow-y-auto pr-1">
              <span className="text-primary-container font-mono text-[10px] font-semibold tracking-wider uppercase">
                {book.format === 'pdf' ? 'Dokumen PDF' : 'Buku EPUB'}
              </span>
              <h4 className="wrap-break-words text-sm leading-snug font-bold md:text-base">
                {book.title}
              </h4>
              <div className="flex items-center gap-1.5 text-xs text-white/90">
                <User size={13} className="text-primary-container shrink-0" />
                <span className="line-clamp-1">{book.author}</span>
              </div>
              {book.publishedYear && (
                <div className="flex items-center gap-1.5 text-xs text-white/80">
                  <Calendar size={12} className="text-primary-container shrink-0" />
                  <span>Tahun {book.publishedYear}</span>
                </div>
              )}
              {book.fileSize && (
                <div className="flex items-center gap-1.5 text-xs text-white/80">
                  <HardDrive size={12} className="text-primary-container shrink-0" />
                  <span>{formatFileSize(book.fileSize)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-white/15 pt-2.5 text-xs text-white/85">
              <span>{progressPercent > 0 ? `${progressPercent}% dibaca` : 'Mulai Baca'}</span>
              <span className="text-primary-container font-semibold">Buka Buku →</span>
            </div>
          </div>
        )}
      </div>

      {/* Selection Checkbox (when in selection mode) or More Actions 3-Dots Button */}
      {isSelectionMode ? (
        <div className="absolute top-2.5 right-2.5 z-30">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-xl border shadow-md transition-all ${
              isSelected
                ? 'scale-105 border-rose-600 bg-rose-500 text-white'
                : 'border-white/40 bg-black/60 text-white/70 backdrop-blur-md hover:bg-black/80'
            }`}
          >
            {isSelected ? <CheckSquare size={18} className="text-white" /> : <Square size={18} />}
          </div>
        </div>
      ) : (
        <div
          ref={menuRef}
          className="absolute top-2.5 right-2.5 z-30"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white shadow-md backdrop-blur-md transition-colors hover:bg-black/80 active:scale-95"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            aria-label="Menu opsi buku"
          >
            <MoreVertical size={15} />
          </button>

          {menuOpen && (
            <div className="bg-surface-container-highest border-outline-variant/40 animate-fade-in pointer-events-auto absolute right-0 z-50 mt-1 w-36 rounded-xl border py-1.5 text-xs shadow-xl sm:w-44">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onShowDetails?.(book);
                }}
                className="hover:bg-surface-container text-on-surface flex w-full cursor-pointer items-center gap-2 px-2.5 py-2 text-left sm:px-3"
              >
                <Info size={13} className="text-primary shrink-0" />
                <span className="truncate">Tentang Buku</span>
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onShowDetails?.(book);
                }}
                className="hover:bg-surface-container text-on-surface flex w-full cursor-pointer items-center gap-2 px-2.5 py-2 text-left sm:px-3"
              >
                <Tag size={13} className="text-primary shrink-0" />
                <span className="truncate">Kelola Tag</span>
              </button>
              <button
                onClick={handleToggleCompleted}
                className="hover:bg-surface-container text-on-surface flex w-full cursor-pointer items-center gap-2 px-2.5 py-2 text-left sm:px-3"
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
                className="hover:bg-error-container/30 text-error flex w-full cursor-pointer items-center gap-2 px-2.5 py-2 text-left sm:px-3"
              >
                <Trash2 size={13} className="shrink-0" />
                <span className="truncate">Hapus Buku</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
