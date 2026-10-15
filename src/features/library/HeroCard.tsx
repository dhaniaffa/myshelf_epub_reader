import React from 'react';
import { BookOpen, Calendar, Clock, HardDrive, Play, Sparkles, User } from 'lucide-react';

import { Button } from '@/components/ui';
import { useCoverUrl } from '@/lib/cover';
import { formatFileSize } from '@/lib/epub';
import { navigate } from '@/lib/route';

import type { Book } from '@/types';

interface HeroCardProps {
  book: Book;
}

export const HeroCard: React.FC<HeroCardProps> = ({ book }) => {
  const coverUrl = useCoverUrl(book.cover);

  const progressPercent = Math.round((book.progress || 0) * 100);

  const formatReadingTime = (seconds?: number) => {
    if (!seconds || seconds < 60) return null;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins} mnt dibaca`;
    const hours = (mins / 60).toFixed(1);
    return `${hours} jam dibaca`;
  };

  return (
    <section className="border-outline-variant/30 bg-surface-container/70 hover:border-primary/40 group relative overflow-hidden rounded-2xl border p-3.5 shadow-xs backdrop-blur-md transition-all duration-300 select-none hover:shadow-md sm:rounded-3xl sm:p-7">
      {/* Ambient background glow effects */}
      <div className="bg-primary/10 pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full blur-3xl transition-opacity group-hover:opacity-100" />
      <div className="bg-secondary/10 pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full blur-3xl" />

      {/* MOBILE COMPACT VIEW (< sm) */}
      <div
        onClick={() => navigate(`/read/${book.id}`)}
        className="relative z-10 flex cursor-pointer items-center gap-3.5 sm:hidden"
        title={`Lanjutkan membaca "${book.title}"`}
      >
        {/* Cover thumbnail */}
        <div className="border-outline-variant/30 bg-surface-container-high relative aspect-2/3 w-13 shrink-0 overflow-hidden rounded-xl border shadow-sm">
          {coverUrl ? (
            <img src={coverUrl} alt={book.title} className="h-full w-full object-cover" />
          ) : (
            <div className="bg-primary/20 text-primary flex h-full w-full items-center justify-center">
              <BookOpen size={16} />
            </div>
          )}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-linear-to-r from-black/25 to-transparent" />
        </div>

        {/* Info & Progress */}
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-primary bg-primary/10 border-primary/20 py-0.2 inline-flex items-center gap-1 rounded-full border px-2 text-[9px] font-semibold tracking-wider uppercase">
              <Sparkles size={10} className="text-primary" /> Lanjutkan
            </span>
            <span className="text-on-surface-variant font-mono text-[10px]">
              {progressPercent}%
            </span>
            {formatReadingTime(book.readingTimeSeconds) && (
              <span className="text-on-surface-variant/80 text-[10px]">
                · {formatReadingTime(book.readingTimeSeconds)}
              </span>
            )}
          </div>

          <h3 className="text-on-surface line-clamp-1 text-sm font-bold tracking-tight">
            {book.title}
          </h3>

          <p className="text-on-surface-variant line-clamp-1 text-xs">{book.author}</p>

          {/* Mini progress bar */}
          <div className="bg-surface-container-highest mt-1 h-1.5 w-full overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Quick Play Action Button */}
        <div className="bg-primary text-on-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-sm transition-transform group-hover:scale-108">
          <Play size={14} fill="currentColor" className="ml-0.5" />
        </div>
      </div>

      {/* DESKTOP SHOWCASE VIEW (>= sm) */}
      <div className="relative z-10 hidden sm:flex sm:flex-row sm:items-stretch sm:justify-between sm:gap-8">
        {/* Left Information Column */}
        <div className="flex w-full flex-1 flex-col justify-between space-y-4 text-left">
          <div className="space-y-2.5">
            <div className="flex items-center justify-start gap-2">
              <div className="text-primary bg-primary/10 border-primary/20 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold tracking-wider uppercase">
                <Sparkles size={13} className="text-primary" /> Lanjutkan Membaca
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                  book.format === 'pdf'
                    ? 'border border-rose-500/30 bg-rose-500/15 text-rose-600 dark:text-rose-400'
                    : 'bg-primary/10 text-primary border-primary/20 border'
                }`}
              >
                {book.format === 'pdf' ? 'PDF' : 'EPUB'}
              </span>
            </div>

            <h2 className="text-on-surface line-clamp-2 text-xl leading-tight font-extrabold tracking-tight sm:text-2xl lg:text-3xl">
              {book.title}
            </h2>

            <div className="text-on-surface-variant flex flex-wrap items-center justify-start gap-2 pt-1 text-xs sm:text-sm">
              <span className="text-on-surface flex items-center gap-1 font-medium">
                <User size={13} className="opacity-70" />
                <span className="line-clamp-1">{book.author}</span>
              </span>

              {book.publishedYear && (
                <span className="bg-surface-container-highest text-on-surface-variant inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium">
                  <Calendar size={11} className="opacity-70" />
                  {book.publishedYear}
                </span>
              )}

              {book.fileSize ? (
                <span className="bg-surface-container-highest text-on-surface-variant inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-xs">
                  <HardDrive size={11} className="text-primary shrink-0" />
                  {formatFileSize(book.fileSize)}
                </span>
              ) : null}

              {formatReadingTime(book.readingTimeSeconds) && (
                <span className="bg-surface-container-highest text-on-surface-variant hidden items-center gap-1 rounded-md px-2 py-0.5 text-xs md:inline-flex">
                  <Clock size={11} className="opacity-70" />
                  {formatReadingTime(book.readingTimeSeconds)}
                </span>
              )}
            </div>
          </div>

          {/* Progress Bar & Actions */}
          <div className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <div className="text-on-surface-variant flex items-center justify-between text-xs font-medium">
                <span>Progres Terakhir</span>
                <span className="text-primary font-mono text-xs font-bold sm:text-sm">
                  {progressPercent}% selesai
                </span>
              </div>
              <div className="bg-surface-container-highest h-2 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-start pt-1">
              <Button
                variant="filled"
                size="md"
                icon={<Play size={16} fill="currentColor" />}
                onClick={() => navigate(`/read/${book.id}`)}
                className="font-semibold shadow-sm transition-all hover:scale-102 hover:shadow-md"
              >
                Buka Sekarang
              </Button>
            </div>
          </div>
        </div>

        {/* Right Cover Preview */}
        <div
          onClick={() => navigate(`/read/${book.id}`)}
          className="group/cover shrink-0 cursor-pointer"
          title={`Lanjutkan membaca "${book.title}"`}
        >
          <div className="border-outline-variant/30 bg-surface-container-high relative aspect-2/3 w-32 transform overflow-hidden rounded-2xl border shadow-xl transition-all duration-300 group-hover/cover:scale-104 group-hover/cover:rotate-0 sm:w-36 sm:-rotate-2">
            {coverUrl ? (
              <img src={coverUrl} alt={book.title} className="h-full w-full object-cover" />
            ) : (
              <div className="from-primary/20 via-secondary/15 to-tertiary/20 text-on-surface flex h-full w-full flex-col justify-between bg-linear-to-br p-3">
                <div className="bg-primary/20 text-primary flex h-8 w-8 items-center justify-center rounded-full">
                  <BookOpen size={16} />
                </div>
                <div className="line-clamp-3 text-[11px] leading-snug font-bold">{book.title}</div>
                <div className="text-outline font-mono text-[9px] tracking-wider uppercase">
                  EPUB
                </div>
              </div>
            )}
            {/* Book spine lighting sheen */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-linear-to-r from-black/25 via-white/10 to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
};
