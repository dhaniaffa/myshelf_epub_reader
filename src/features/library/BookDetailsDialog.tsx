import React, { useEffect, useState } from 'react';
import {
  Bookmark,
  BookOpen,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Globe,
  HardDrive,
  Hash,
  Play,
  RotateCcw,
  User,
} from 'lucide-react';

import { Button, Dialog } from '@/components/ui';
import { useCoverUrl } from '@/lib/cover';
import { db } from '@/lib/db';
import { formatFileSize, readFullMetadata } from '@/lib/epub';
import { readFullPdfMetadata } from '@/lib/pdf';
import { navigate } from '@/lib/route';
import { toast } from '@/store/toast';

import type { FullBookMetadata } from '@/lib/epub';
import type { Book } from '@/types';

interface BookDetailsDialogProps {
  book: Book | null;
  onClose: () => void;
}

interface BookDetailsContentProps {
  book: Book;
  onClose: () => void;
}

const BookDetailsContent: React.FC<BookDetailsContentProps> = ({ book, onClose }) => {
  const coverUrl = useCoverUrl(book.cover);
  const [extraMeta, setExtraMeta] = useState<FullBookMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load complete metadata from EPUB file
  useEffect(() => {
    let isMounted = true;

    db.files
      .get(book.id)
      .then(async (file) => {
        if (!file?.buffer || !isMounted) return;
        const rawBuffer =
          file.buffer instanceof Blob ? await file.buffer.arrayBuffer() : file.buffer;
        if (!isMounted) return;
        if (book.format === 'pdf') {
          return readFullPdfMetadata(rawBuffer, book.title).then((pdfMeta) => ({
            ...pdfMeta,
            publisher: pdfMeta.producer || pdfMeta.creator || null,
            description: null,
            language: null,
            identifier: null,
            rights: null,
          }));
        }
        return readFullMetadata(rawBuffer);
      })
      .then((meta) => {
        if (isMounted && meta) {
          setExtraMeta(meta);
        }
      })
      .catch((err) => {
        console.warn('Gagal memuat metadata lengkap buku:', err);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [book.id, book.format, book.title]);

  const progressPercent = Math.round((book.progress || 0) * 100);

  const formatReadingTime = (seconds: number) => {
    if (!seconds || seconds < 60) return 'Belum pernah dibaca';
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins} menit`;
    const hours = (mins / 60).toFixed(1);
    return `${hours} jam`;
  };

  const handleToggleCompleted = async () => {
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
    onClose();
  };

  const handleStartReading = () => {
    onClose();
    navigate(`/read/${book.id}`);
  };

  const formatDate = (timestamp?: number | null) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Strip description HTML tags if present
  const cleanDescription = (html?: string | null) => {
    if (!html) return null;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

  const descriptionText = cleanDescription(extraMeta?.description);

  return (
    <Dialog
      open={!!book}
      onClose={onClose}
      title="Tentang Buku"
      maxWidth="md"
      actions={
        <div className="flex w-full items-center justify-between">
          <Button
            variant="tonal"
            size="sm"
            onClick={handleToggleCompleted}
            icon={
              book.status === 'completed' ? <RotateCcw size={15} /> : <CheckCircle2 size={15} />
            }
          >
            {book.status === 'completed' ? 'Batal Selesai' : 'Tandai Selesai'}
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="text" size="sm" onClick={onClose}>
              Tutup
            </Button>
            <Button
              variant="filled"
              size="sm"
              onClick={handleStartReading}
              icon={<Play size={15} fill="currentColor" />}
            >
              {book.progress && book.progress > 0 ? 'Lanjutkan Membaca' : 'Mulai Membaca'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6 pt-1">
        {/* Header Block: Book Cover + Primary Info */}
        <div className="flex flex-col items-start gap-5 sm:flex-row">
          {/* Book Cover (2:3) */}
          <div className="bg-surface-container-high border-outline-variant/30 relative mx-auto aspect-2/3 w-28 shrink-0 overflow-hidden rounded-2xl border shadow-lg sm:mx-0 sm:w-36">
            {coverUrl ? (
              <img src={coverUrl} alt={book.title} className="h-full w-full object-cover" />
            ) : (
              <div className="from-primary/20 to-secondary/20 text-primary flex h-full w-full flex-col items-center justify-center bg-linear-to-br p-2 text-center">
                <BookOpen size={28} className="mb-2" />
                <span className="line-clamp-2 text-[10px] leading-tight font-medium">
                  {book.title}
                </span>
              </div>
            )}
          </div>

          {/* Title, Author & Status Badge Info */}
          <div className="w-full flex-1 space-y-2.5 text-center sm:text-left">
            <div>
              <h2 className="text-on-surface text-lg leading-snug font-bold tracking-tight sm:text-xl">
                {book.title}
              </h2>
              <div className="text-on-surface-variant mt-1 flex items-center justify-center gap-1.5 text-sm font-medium sm:justify-start">
                <User size={15} className="text-primary shrink-0" />
                <span>{book.author}</span>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 sm:justify-start">
              {book.status === 'completed' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                  <CheckCircle2 size={13} /> Selesai Dibaca
                </span>
              ) : book.progress && book.progress > 0 ? (
                <span className="text-primary bg-primary/10 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold">
                  <BookOpen size={13} /> Sedang Dibaca
                </span>
              ) : (
                <span className="text-on-surface-variant bg-surface-container-highest inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold">
                  <Bookmark size={13} /> Belum Dibaca
                </span>
              )}

              {book.fileSize ? (
                <span className="text-on-surface-variant bg-surface-container-highest inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-xs font-medium">
                  <HardDrive size={12} /> {formatFileSize(book.fileSize)}
                </span>
              ) : null}
            </div>

            {/* Progres Membaca */}
            <div className="mx-auto max-w-sm pt-2 sm:mx-0">
              <div className="text-on-surface-variant mb-1.5 flex items-center justify-between text-xs font-medium">
                <span>Progres Membaca</span>
                <span className="text-primary font-mono font-bold">{progressPercent}%</span>
              </div>
              <div className="bg-surface-container-highest h-2 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Grid Metadata Terperinci */}
        <div className="bg-surface-container/60 border-outline-variant/20 grid grid-cols-2 gap-3.5 rounded-2xl border p-4 text-xs sm:grid-cols-3">
          <div className="space-y-0.5">
            <span className="text-on-surface-variant/70 flex items-center gap-1">
              <FileText size={13} className="text-primary/70" /> Format Berkas
            </span>
            <p className="text-on-surface font-semibold uppercase">
              {book.format === 'pdf' ? 'Dokumen PDF' : 'EPUB E-Book'}
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-on-surface-variant/70 flex items-center gap-1">
              <Calendar size={13} className="text-primary/70" /> Tahun Terbit
            </span>
            <p className="text-on-surface font-semibold">
              {extraMeta?.publishedYear || book.publishedYear || '-'}
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-on-surface-variant/70 flex items-center gap-1">
              <Building size={13} className="text-primary/70" /> Penerbit
            </span>
            <p
              className="text-on-surface truncate font-semibold"
              title={extraMeta?.publisher || '-'}
            >
              {extraMeta?.publisher || '-'}
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-on-surface-variant/70 flex items-center gap-1">
              <Globe size={13} className="text-primary/70" /> Bahasa
            </span>
            <p className="text-on-surface font-semibold">
              {extraMeta?.language ? extraMeta.language.toUpperCase() : '-'}
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-on-surface-variant/70 flex items-center gap-1">
              <Clock size={13} className="text-primary/70" /> Waktu Baca
            </span>
            <p className="text-on-surface font-semibold">
              {formatReadingTime(book.readingTimeSeconds)}
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-on-surface-variant/70 flex items-center gap-1">
              <Clock size={13} className="text-primary/70" /> Terakhir Dibaca
            </span>
            <p className="text-on-surface font-semibold">{formatDate(book.lastReadAt)}</p>
          </div>

          <div className="space-y-0.5">
            <span className="text-on-surface-variant/70 flex items-center gap-1">
              <Calendar size={13} className="text-primary/70" /> Ditambahkan
            </span>
            <p className="text-on-surface font-semibold">{formatDate(book.addedAt)}</p>
          </div>

          {extraMeta?.identifier && (
            <div className="col-span-2 space-y-0.5 sm:col-span-3">
              <span className="text-on-surface-variant/70 flex items-center gap-1">
                <Hash size={13} className="text-primary/70" /> Pengenal / ISBN
              </span>
              <p
                className="text-on-surface/90 truncate font-mono text-[11px]"
                title={extraMeta.identifier}
              >
                {extraMeta.identifier}
              </p>
            </div>
          )}
        </div>

        {/* Synopsis / Book Summary (if available in EPUB) */}
        {descriptionText && (
          <div className="bg-surface-container-low/80 border-outline-variant/20 space-y-1.5 rounded-2xl border p-4">
            <h4 className="text-on-surface flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase">
              <FileText size={14} className="text-primary" /> Sinopsis / Deskripsi
            </h4>
            <div className="text-on-surface-variant max-h-48 overflow-y-auto pr-2 text-xs leading-relaxed whitespace-pre-line">
              {descriptionText}
            </div>
          </div>
        )}

        {isLoading && !extraMeta && (
          <div className="text-on-surface-variant flex items-center justify-center gap-2 py-2 text-xs">
            <div className="border-primary h-3.5 w-3.5 animate-spin rounded-full border-2 border-t-transparent" />
            <span>Memuat informasi berkas EPUB...</span>
          </div>
        )}
      </div>
    </Dialog>
  );
};

export const BookDetailsDialog: React.FC<BookDetailsDialogProps> = ({ book, onClose }) => {
  if (!book) return null;
  return <BookDetailsContent key={book.id} book={book} onClose={onClose} />;
};
