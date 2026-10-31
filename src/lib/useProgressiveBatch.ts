import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface UseProgressiveBatchOptions {
  /**
   * Initial number of items to render on first paint.
   * Default: 48 (divisible by 2, 3, 4, 6, 8 for responsive grid alignment).
   */
  initialBatchSize?: number;
  /**
   * Number of items to append on each progressive scroll step.
   * Default: 36 (divisible by 2, 3, 4, 6 for complete rows).
   */
  batchIncrement?: number;
  /**
   * IntersectionObserver rootMargin (pre-loads before hitting bottom).
   * Default: '400px'.
   */
  rootMargin?: string;
}

export interface UseProgressiveBatchReturn<T> {
  /** Currently sliced items to render in the DOM */
  displayedItems: T[];
  /** Whether there are more items to load */
  hasMore: boolean;
  /** Total count of items */
  totalCount: number;
  /** Number of currently displayed items */
  visibleCount: number;
  /** Manually trigger loading the next batch */
  loadMore: () => void;
  /** Reset visible count back to initial batch size */
  reset: () => void;
  /** Callback ref to attach to the sentinel DOM element */
  sentinelRef: (node: HTMLElement | null) => void;
}

/**
 * Custom React hook for progressive batch rendering (Infinite Scrolling).
 * Solves DOM Overload when rendering large collections of books without
 * layout shifting or heavyweight virtual windowing dependencies.
 */
export function useProgressiveBatch<T>(
  items: T[],
  options?: UseProgressiveBatchOptions
): UseProgressiveBatchReturn<T> {
  const initialBatchSize = options?.initialBatchSize ?? 48;
  const batchIncrement = options?.batchIncrement ?? 36;
  const rootMargin = options?.rootMargin ?? '400px';

  // Synchronously adjust state during render if items reference changes (search, filter, sort)
  const [prevItems, setPrevItems] = useState<T[]>(items);
  const [visibleCount, setVisibleCount] = useState<number>(initialBatchSize);

  if (items !== prevItems) {
    setPrevItems(items);
    setVisibleCount(initialBatchSize);
  }

  const observerRef = useRef<IntersectionObserver | null>(null);
  const itemsRef = useRef<T[]>(items);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const totalCount = items.length;
  const hasMore = visibleCount < totalCount;

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => {
      const currentLength = itemsRef.current.length;
      if (prev >= currentLength) return prev;
      return Math.min(prev + batchIncrement, currentLength);
    });
  }, [batchIncrement]);

  const reset = useCallback(() => {
    setVisibleCount(initialBatchSize);
  }, [initialBatchSize]);

  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      if (!node || typeof IntersectionObserver === 'undefined') return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          const first = entries[0];
          if (first?.isIntersecting) {
            loadMore();
          }
        },
        { rootMargin }
      );

      observerRef.current.observe(node);
    },
    [loadMore, rootMargin]
  );

  // Clean up observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, []);

  const displayedItems = useMemo(() => {
    return items.slice(0, visibleCount);
  }, [items, visibleCount]);

  return {
    displayedItems,
    hasMore,
    totalCount,
    visibleCount: Math.min(visibleCount, totalCount),
    loadMore,
    reset,
    sentinelRef,
  };
}
