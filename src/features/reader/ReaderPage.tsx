import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';

import { EpubReaderView } from '@/features/reader/EpubReaderView';
import { PdfReaderView } from '@/features/reader/PdfReaderView';
import { db } from '@/lib/db';

export interface ReaderPageProps {
  bookId: string;
}

/**
 * Format dispatcher router that selectively loads EpubReaderView or PdfReaderView based on book format.
 */
export const ReaderPage: React.FC<ReaderPageProps> = ({ bookId }) => {
  const book = useLiveQuery(() => db.books.get(bookId), [bookId]);

  if (!book) {
    return (
      <div className="bg-surface text-on-surface flex h-screen w-screen flex-col items-center justify-center gap-3">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-3 border-t-transparent" />
        <p className="text-on-surface-variant text-xs font-medium">Memuat buku...</p>
      </div>
    );
  }

  if (book.format === 'pdf') {
    return <PdfReaderView bookId={bookId} />;
  }

  return <EpubReaderView bookId={bookId} />;
};
