import { useCallback, useRef } from 'react';

import type { SearchResult } from '@/types';
import type { ExtendedEpubBook, ExtendedSection } from '@/types/epubjs';
import type { Book as EpubBook } from 'epubjs';

interface UseReaderSearchOptions {
  bookRef: React.RefObject<EpubBook | null>;
}

export function useReaderSearch({ bookRef }: UseReaderSearchOptions) {
  const searchAbortRef = useRef<AbortController | null>(null);

  const searchBook = useCallback(
    async (query: string, onMatchFound: (result: SearchResult) => void, onComplete: () => void) => {
      if (!bookRef.current || !query.trim()) return;
      const book = bookRef.current;

      // Abort previous search if still running
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
      }
      const controller = new AbortController();
      searchAbortRef.current = controller;

      try {
        const spine = (book as unknown as ExtendedEpubBook).spine;
        if (!spine || !spine.spineItems) {
          onComplete();
          return;
        }

        let totalFound = 0;
        for (const item of spine.spineItems as ExtendedSection[]) {
          if (controller.signal.aborted || totalFound >= 250) break;

          await item.load(book.load.bind(book));
          const matches = await item.find(query.trim());
          item.unload();

          if (matches && matches.length > 0) {
            for (const match of matches) {
              if (controller.signal.aborted) break;
              totalFound++;
              onMatchFound({
                cfi: match.cfi,
                excerpt: match.excerpt,
                chapterTitle: item.href || '',
              });
            }
          }
        }
      } catch (err) {
        console.error('Pencarian buku dibatalkan / gagal:', err);
      } finally {
        onComplete();
      }
    },
    [bookRef]
  );

  return {
    searchBook,
  };
}
