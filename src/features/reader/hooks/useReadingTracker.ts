import { useCallback, useEffect, useRef } from 'react';

import { db, recordReadingTime } from '@/lib/db';

interface UseReadingTrackerOptions {
  bookId: string;
}

export function useReadingTracker({ bookId }: UseReadingTrackerOptions) {
  const readingTimerRef = useRef<number | null>(null);
  const saveDebounceRef = useRef<number | null>(null);

  // Reading time timer (every 5 seconds)
  useEffect(() => {
    readingTimerRef.current = window.setInterval(() => {
      recordReadingTime(bookId, 5).catch((err) => {
        console.warn('Failed to record reading time log:', err);
      });
    }, 5000);

    return () => {
      if (readingTimerRef.current) clearInterval(readingTimerRef.current);
    };
  }, [bookId]);

  // Debounced (700ms) reading position saver to Dexie
  const debouncedSavePosition = useCallback(
    (cfi: string, pct: number) => {
      if (saveDebounceRef.current) {
        clearTimeout(saveDebounceRef.current);
      }
      saveDebounceRef.current = window.setTimeout(async () => {
        await db.books.update(bookId, {
          lastCfi: cfi,
          progress: pct,
          lastReadAt: Date.now(),
          status: pct >= 0.98 ? 'completed' : 'reading',
        });
      }, 700);
    },
    [bookId]
  );

  return {
    debouncedSavePosition,
  };
}
