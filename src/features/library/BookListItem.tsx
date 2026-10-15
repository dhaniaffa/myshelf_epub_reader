import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  HardDrive,
  Info,
  MoreVertical,
  Play,
  Trash2,
  User,
} from 'lucide-react';

import { Button, IconButton } from '@/components/ui';
import { useCoverUrl } from '@/lib/cover';
import { db } from '@/lib/db';
import { formatFileSize, readMetadata } from '@/lib/epub';
import { navigate } from '@/lib/route';
import { useClickOutside } from '@/lib/useClickOutside';
import { toast } from '@/store/toast';

import type { Book } from '@/types';

interface BookListItemProps {
  book: Book;
  onDeleteRequest: (book: Book) => void;
  onShowDetails?: (book: Book) => void;
}

export const BookListItem: React.FC<BookListItemProps> = ({
  book,
  onDeleteRequest,
  onShowDetails,
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

  const handleItemClick = () => {
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }
    navigate(`/read/${book.id}`);
  };

  return (
    <div
      onClick={handleItemClick}
      className="group bg-surface-container-low hover:bg-surface-container border-outline-variant/30 hover:border-primary/40 flex cursor-pointer items-center gap-3.5 rounded-2xl border p-3 transition-all duration-200 select-none hover:-translate-y-0.5 hover:shadow-md sm:gap-5 sm:p-4.5"
    >
      {/* Cover Aspect Ratio 2:3 */}
      <div className="bg-surface-container-high border-outline-variant/20 relative aspect-2/3 w-16 shrink-0 overflow-hidden rounded-xl border shadow-sm transition-shadow group-hover:shadow-md sm:w-20">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={book.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="from-primary/15 via-secondary/10 to-tertiary/20 text-on-surface flex h-full w-full flex-col justify-between bg-linear-to-br p-2">
            <div className="bg-primary/20 text-primary mx-auto mt-2 flex h-6 w-6 items-center justify-center rounded-full">
              <BookOpen size={13} />
            </div>
            <div className="text-outline mb-1 text-center font-mono text-[9px] tracking-wider uppercase">
              {book.format === 'pdf' ? 'PDF' : 'EPUB'}
            </div>
          </div>
        )}

        {/* Subtle spine shadow */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-linear-to-r from-black/25 via-white/10 to-transparent" />

        {/* Small bottom progress line */}
        <div className="absolute inset-x-0 bottom-0 z-10 h-1 bg-black/40">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Book Information */}
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <h3 className="text-on-surface group-hover:text-primary line-clamp-1 text-sm leading-snug font-bold transition-colors sm:text-base">
            {book.title}
          </h3>
          <div className="text-on-surface-variant mt-1 flex items-center gap-1.5 text-xs">
            <User size={12} className="shrink-0 opacity-70" />
            <span className="line-clamp-1">{book.author}</span>
          </div>
        </div>

        {/* Metadata Badges */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {/* Format Badge */}
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
              book.format === 'pdf'
                ? 'border border-rose-500/30 bg-rose-500/15 text-rose-600 dark:text-rose-400'
                : 'bg-primary/10 text-primary border-primary/20 border'
            }`}
          >
            {book.format === 'pdf' ? 'PDF' : 'EPUB'}
          </span>

          {/* File size badge */}
          {book.fileSize ? (
            <span
              className="text-on-surface-variant bg-surface-container-highest/80 border-outline-variant/30 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[11px]"
              title={`Ukuran Berkas: ${formatFileSize(book.fileSize)}`}
            >
              <HardDrive size={11} className="text-primary shrink-0" />
              <span>{formatFileSize(book.fileSize)}</span>
            </span>
          ) : null}

          {/* Published Year */}
          {book.publishedYear && (
            <span
              className="text-on-surface-variant bg-surface-container-highest/80 border-outline-variant/30 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px]"
              title={`Tahun Terbit: ${book.publishedYear}`}
            >
              <Calendar size={11} className="shrink-0 opacity-70" />
              <span>{book.publishedYear}</span>
            </span>
          )}

          {/* Reading Time */}
          {formatReadingTime(book.readingTimeSeconds) && (
            <span className="text-on-surface-variant bg-surface-container-highest/80 border-outline-variant/30 hidden items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] md:inline-flex">
              <Clock size={11} className="shrink-0 opacity-70" />
              <span>{formatReadingTime(book.readingTimeSeconds)}</span>
            </span>
          )}

          {/* Status Badge */}
          {book.status === 'completed' ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
              <CheckCircle2 size={10} /> Selesai
            </span>
          ) : book.status === 'reading' ? (
            <span className="text-primary bg-primary/10 border-primary/20 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium">
              Sedang Dibaca
            </span>
          ) : (
            <span className="text-on-surface-variant/80 bg-surface-container-highest border-outline-variant/30 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium">
              Belum Dibaca
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="flex max-w-xs items-center gap-2.5 pt-0.5">
          <div className="bg-surface-container-highest h-1.5 flex-1 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-primary shrink-0 font-mono text-[11px] font-bold">
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* Right Action Buttons */}
      <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="filled"
          size="sm"
          icon={<Play size={13} fill="currentColor" />}
          className="shadow-xs hover:shadow-sm"
          onClick={() => navigate(`/read/${book.id}`)}
        >
          Baca
        </Button>

        {/* Context Menu */}
        <div ref={menuRef} className="relative">
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
            <MoreVertical size={16} />
          </IconButton>

          {menuOpen && (
            <div className="bg-surface-container-highest border-outline-variant/40 animate-fade-in pointer-events-auto absolute right-0 z-50 mt-1 w-44 rounded-xl border py-1.5 text-xs shadow-xl">
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
    </div>
  );
};
