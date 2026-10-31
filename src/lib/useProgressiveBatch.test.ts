import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useProgressiveBatch } from './useProgressiveBatch';

describe('useProgressiveBatch', () => {
  let mockObserve: ReturnType<typeof vi.fn>;
  let mockDisconnect: ReturnType<typeof vi.fn>;
  let observerCallback: (entries: Partial<IntersectionObserverEntry>[]) => void;

  beforeEach(() => {
    mockObserve = vi.fn();
    mockDisconnect = vi.fn();

    class MockIntersectionObserver {
      constructor(callback: (entries: Partial<IntersectionObserverEntry>[]) => void) {
        observerCallback = callback;
      }
      observe = mockObserve;
      disconnect = mockDisconnect;
      unobserve = vi.fn();
    }

    window.IntersectionObserver =
      MockIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with sliced items and correct hasMore flag', () => {
    const items = Array.from({ length: 100 }, (_, i) => `item-${i}`);
    const { result } = renderHook(() =>
      useProgressiveBatch(items, { initialBatchSize: 20, batchIncrement: 10 })
    );

    expect(result.current.displayedItems).toHaveLength(20);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.totalCount).toBe(100);
    expect(result.current.visibleCount).toBe(20);
  });

  it('sets hasMore to false when items are fewer than initialBatchSize', () => {
    const items = ['a', 'b', 'c'];
    const { result } = renderHook(() => useProgressiveBatch(items, { initialBatchSize: 10 }));

    expect(result.current.displayedItems).toHaveLength(3);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.visibleCount).toBe(3);
  });

  it('loads more items when loadMore is called', () => {
    const items = Array.from({ length: 50 }, (_, i) => `item-${i}`);
    const { result } = renderHook(() =>
      useProgressiveBatch(items, { initialBatchSize: 20, batchIncrement: 15 })
    );

    act(() => {
      result.current.loadMore();
    });

    expect(result.current.displayedItems).toHaveLength(35);
    expect(result.current.visibleCount).toBe(35);
    expect(result.current.hasMore).toBe(true);

    act(() => {
      result.current.loadMore();
    });

    expect(result.current.displayedItems).toHaveLength(50);
    expect(result.current.visibleCount).toBe(50);
    expect(result.current.hasMore).toBe(false);
  });

  it('resets visibleCount when items array changes (e.g. search or filter)', () => {
    const items1 = Array.from({ length: 60 }, (_, i) => `item-${i}`);
    const { result, rerender } = renderHook(
      ({ items }) => useProgressiveBatch(items, { initialBatchSize: 15, batchIncrement: 10 }),
      { initialProps: { items: items1 } }
    );

    act(() => {
      result.current.loadMore();
    });
    expect(result.current.displayedItems).toHaveLength(25);

    // Filter changes to a new array
    const items2 = ['filtered-1', 'filtered-2', 'filtered-3'];
    rerender({ items: items2 });

    expect(result.current.displayedItems).toHaveLength(3);
    expect(result.current.visibleCount).toBe(3);
    expect(result.current.hasMore).toBe(false);
  });

  it('triggers loadMore when sentinel intersects viewport', () => {
    const items = Array.from({ length: 60 }, (_, i) => `item-${i}`);
    const { result } = renderHook(() =>
      useProgressiveBatch(items, { initialBatchSize: 20, batchIncrement: 10 })
    );

    const dummyNode = document.createElement('div');
    act(() => {
      result.current.sentinelRef(dummyNode);
    });

    expect(mockObserve).toHaveBeenCalledWith(dummyNode);

    // Simulate intersection
    act(() => {
      observerCallback([{ isIntersecting: true } as IntersectionObserverEntry]);
    });

    expect(result.current.displayedItems).toHaveLength(30);
  });

  it('disconnects previous observer when sentinel node changes or unmounts', () => {
    const items = Array.from({ length: 20 }, (_, i) => `item-${i}`);
    const { result, unmount } = renderHook(() => useProgressiveBatch(items));

    const dummyNode = document.createElement('div');
    act(() => {
      result.current.sentinelRef(dummyNode);
    });

    act(() => {
      result.current.sentinelRef(null);
    });
    expect(mockDisconnect).toHaveBeenCalled();

    unmount();
    expect(mockDisconnect).toHaveBeenCalled();
  });
});
