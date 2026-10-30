import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  HardDrive,
  Info,
  MoreVertical,
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

interface BookCardProps {
  book: Book;
  onDeleteRequest: (book: Book) => void;
  onShowDetails?: (book: Book) => void;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onDeleteRequest, onShowDetails }) => {
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

  const formatReadingTime = (seconds: number) => {
    if (!seconds || seconds < 60) return null;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins} mnt dibaca`;
    const hours = (mins / 60).toFixed(1);
    return `${hours} jam dibaca`;
  };

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
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }
    navigate(`/read/${book.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group bg-surface-container-low hover:bg-surface-container border-outline-variant/30 hover:border-primary/40 relative flex cursor-pointer flex-col rounded-2xl border transition-all duration-200 select-none hover:-translate-y-1 hover:shadow-xl ${
        menuOpen ? 'z-40' : ''
      }`}
    >
      {/* Cover Aspect Ratio 2:3 */}
      <div className="relative aspect-2/3 w-full">
        <div className="bg-surface-container-high relative flex h-full w-full items-center justify-center overflow-hidden rounded-t-2xl">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={book.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-104"
              loading="lazy"
            />
          ) : (
            <div className="from-primary/15 via-secondary/10 to-tertiary/20 text-on-surface flex h-full w-full flex-col justify-between bg-linear-to-br p-4">
              <div className="bg-primary/20 text-primary flex h-8 w-8 items-center justify-center rounded-full">
                <BookOpen size={16} />
              </div>
              <div>
                <h4 className="line-clamp-3 text-sm leading-snug font-bold">{book.title}</h4>
                <p className="text-on-surface-variant mt-1 line-clamp-1 text-xs">{book.author}</p>
              </div>
              <div className="text-outline font-mono text-[10px] tracking-wider uppercase">
                {book.publishedYear ? `Tahun ${book.publishedYear}` : 'MyShelf EPUB'}
              </div>
            </div>
          )}

          {/* Book spine light sheen */}
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-2.5 bg-linear-to-r from-black/25 via-white/10 to-transparent" />

          {/* Format Badge (PDF / EPUB) */}
          <div className="absolute top-1.5 left-1.5 z-20">
            <span
              className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider uppercase shadow-xs ${
                book.format === 'pdf'
                  ? 'bg-rose-600/90 text-white'
                  : 'bg-black/50 text-white/90 backdrop-blur-xs'
              }`}
            >
              {book.format === 'pdf' ? 'PDF' : 'EPUB'}
            </span>
          </div>

          {/* Progress badge at bottom of cover (only shown when reading progress exists) */}
          {progressPercent > 0 && (
            <div className="absolute inset-x-0 bottom-1.5 z-20 flex items-center justify-between px-2 text-[10px] text-white">
              <span className="rounded bg-black/65 px-1.5 py-0.5 font-mono text-[9px] font-medium backdrop-blur-xs">
                {progressPercent}%
              </span>
              {formatReadingTime(book.readingTimeSeconds) && (
                <span className="hidden rounded bg-black/65 px-1.5 py-0.5 text-[9px] backdrop-blur-xs sm:inline-block">
                  {formatReadingTime(book.readingTimeSeconds)}
                </span>
              )}
            </div>
          )}

          {/* HOVER OVERLAY: Displays Full Title, Author, and Year */}
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between bg-black/85 p-3.5 text-white opacity-0 backdrop-blur-xs transition-all duration-200 group-hover:opacity-100">
            <div className="space-y-2 overflow-y-auto pr-1">
              <div className="text-primary-container text-[10px] font-semibold tracking-wider uppercase">
                Detail Buku
              </div>
              {/* Judul Lengkap Tanpa Terpotong */}
              <h4 className="wrap-break-words text-xs leading-snug font-bold sm:text-sm">
                {book.title}
              </h4>
              {/* Author */}
              <div className="flex items-center gap-1.5 text-xs text-white/90">
                <User size={12} className="text-primary-container shrink-0" />
                <span className="line-clamp-2 leading-tight">{book.author}</span>
              </div>
              {/* Tahun Terbit */}
              <div className="flex items-center gap-1.5 text-xs text-white/90">
                <Calendar size={12} className="text-primary-container shrink-0" />
                <span>
                  {book.publishedYear ? `Tahun ${book.publishedYear}` : 'Tahun tidak diketahui'}
                </span>
              </div>
              {/* File Size */}
              {book.fileSize ? (
                <div className="flex items-center gap-1.5 text-xs text-white/90">
                  <HardDrive size={12} className="text-primary-container shrink-0" />
                  <span>{formatFileSize(book.fileSize)}</span>
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between border-t border-white/15 pt-2 text-[11px] text-white/80">
              <span>{progressPercent}% selesai</span>
              <span className="text-primary-container font-semibold">Buka Buku →</span>
            </div>
          </div>

          {/* Progress Bar Line */}
          <div className="absolute inset-x-0 bottom-0 z-20 h-1 bg-black/40">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* More Actions Button (placed outside overflow-hidden so the dropdown is never clipped) */}
        <div
          ref={menuRef}
          className="absolute top-1.5 right-1.5 z-30"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/40 text-white shadow-sm backdrop-blur-md transition-colors hover:bg-black/70 active:scale-95"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            aria-label="Menu opsi buku"
          >
            <MoreVertical size={14} />
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
                <Info size={14} className="text-primary shrink-0" />
                <span className="truncate">Tentang Buku</span>
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onShowDetails?.(book);
                }}
                className="hover:bg-surface-container text-on-surface flex w-full cursor-pointer items-center gap-2 px-2.5 py-2 text-left sm:px-3"
              >
                <Tag size={14} className="text-primary shrink-0" />
                <span className="truncate">Kelola Tag</span>
              </button>
              <button
                onClick={handleToggleCompleted}
                className="hover:bg-surface-container text-on-surface flex w-full cursor-pointer items-center gap-2 px-2.5 py-2 text-left sm:px-3"
              >
                <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
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
                <Trash2 size={14} className="shrink-0" />
                <span className="truncate">Hapus Buku</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Book info below cover */}
      <div className="flex flex-1 flex-col justify-between p-2.5 sm:p-3">
        <div className="space-y-0.5">
          <h3 className="text-on-surface group-hover:text-primary line-clamp-2 min-h-9 text-xs leading-snug font-semibold transition-colors sm:text-sm">
            {book.title}
          </h3>
          <p className="text-on-surface-variant truncate text-[11px] sm:text-xs">
            {book.author || 'Penulis Tidak Diketahui'}
          </p>
          {book.tags && book.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {book.tags.slice(0, 2).map((t) => (
                <span
                  key={t}
                  className="bg-primary/10 text-primary rounded-md px-1.5 py-0.5 text-[9px] font-medium"
                >
                  {t}
                </span>
              ))}
              {book.tags.length > 2 && (
                <span className="text-on-surface-variant/60 self-center text-[9px] font-medium">
                  +{book.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="border-outline-variant/15 text-on-surface-variant mt-2 flex items-center justify-between gap-1 border-t pt-1.5 text-[10px]">
          <span className="font-mono text-[9px] font-medium uppercase opacity-70">
            {book.format} · {book.fileSize ? formatFileSize(book.fileSize) : ''}
          </span>
          {book.status === 'completed' ? (
            <span className="inline-flex items-center gap-0.5 font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={10} /> Selesai
            </span>
          ) : book.publishedYear ? (
            <span className="opacity-70">{book.publishedYear}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
};
