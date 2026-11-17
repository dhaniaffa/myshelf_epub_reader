import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as dbModule from '@/lib/db';
import {
  createCoverUrl,
  getCoverUrlFromCache,
  revokeCoverCache,
  useCoverUrl,
  useWarmCoverCache,
  warmCoverCache,
} from './cover';

describe('Cover Utility & Hook (src/lib/cover.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    revokeCoverCache();
  });

  describe('createCoverUrl', () => {
    it('returns null for null or undefined input', () => {
      expect(createCoverUrl(null)).toBeNull();
      expect(createCoverUrl(undefined)).toBeNull();
      expect(createCoverUrl('')).toBeNull();
    });

    it('returns string input directly if already a string URL', () => {
      const url = 'https://example.com/cover.jpg';
      expect(createCoverUrl(url)).toBe(url);
    });

    it('creates object URL from Blob instance', () => {
      const createObjectURLMock = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:mock-blob-url');
      const blob = new Blob(['test'], { type: 'image/jpeg' });

      const result = createCoverUrl(blob);
      expect(createObjectURLMock).toHaveBeenCalledWith(blob);
      expect(result).toBe('blob:mock-blob-url');
    });

    it('creates object URL from Uint8Array or ArrayBuffer', () => {
      const createObjectURLMock = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:mock-buffer-url');
      const u8 = new Uint8Array([1, 2, 3]);

      const result = createCoverUrl(u8);
      expect(createObjectURLMock).toHaveBeenCalled();
      expect(result).toBe('blob:mock-buffer-url');
    });

    it('creates object URL from serialized JSON Buffer { type: Buffer, data: [...] }', () => {
      const createObjectURLMock = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:mock-serialized-url');
      const serialized = { type: 'Buffer', data: [10, 20, 30] };

      const result = createCoverUrl(serialized);
      expect(createObjectURLMock).toHaveBeenCalled();
      expect(result).toBe('blob:mock-serialized-url');
    });
  });

  describe('useCoverUrl hook', () => {
    it('returns direct URL immediately without fetching from IndexedDB', () => {
      const directUrl = 'https://example.com/cover.jpg';
      const { result } = renderHook(() => useCoverUrl(directUrl));
      expect(result.current).toBe(directUrl);
    });

    it('fetches cover blob from isolated covers table when passed a bookId', async () => {
      const dummyBlob = new Blob(['cover-data'], { type: 'image/jpeg' });
      vi.spyOn(dbModule, 'getBookCover').mockResolvedValue(dummyBlob);
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:book-cover-id-1');

      const { result } = renderHook(() => useCoverUrl('book-1'));

      await waitFor(() => {
        expect(result.current).toBe('blob:book-cover-id-1');
      });

      expect(getCoverUrlFromCache('book-1')).toBe('blob:book-cover-id-1');
    });

    it('resolves synchronously from in-memory cache if book cover was previously loaded', async () => {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:cached-cover');
      const dummyBlob = new Blob(['cached'], { type: 'image/jpeg' });
      vi.spyOn(dbModule, 'getBookCover').mockResolvedValue(dummyBlob);

      // Render first time and wait for it to load into cache
      const { result: firstResult } = renderHook(() => useCoverUrl('book-cached'));
      await waitFor(() => {
        expect(firstResult.current).toBe('blob:cached-cover');
      });

      // Second render with the same book ID resolves synchronously with cached URL
      const { result: secondResult } = renderHook(() => useCoverUrl('book-cached'));
      expect(secondResult.current).toBe('blob:cached-cover');
    });

    it('falls back to legacyCover if isolated cover record is not in db.covers', async () => {
      vi.spyOn(dbModule, 'getBookCover').mockResolvedValue(null);
      const fallbackBlob = new Blob(['legacy-cover'], { type: 'image/jpeg' });
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:legacy-fallback');

      const { result } = renderHook(() => useCoverUrl('book-legacy-id', fallbackBlob));

      await waitFor(() => {
        expect(result.current).toBe('blob:legacy-fallback');
      });
    });

    it('handles legacy invocation with Blob as first argument', async () => {
      const directBlob = new Blob(['direct'], { type: 'image/jpeg' });
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:direct-blob-url');

      const { result } = renderHook(() => useCoverUrl(directBlob));

      await waitFor(() => {
        expect(result.current).toBe('blob:direct-blob-url');
      });
    });
  });

  describe('revokeCoverCache', () => {
    it('revokes specific cached cover URL and clears from map', async () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-revoke');

      // Populate cache by calling hook or mocking
      const dummyBlob = new Blob(['test'], { type: 'image/jpeg' });
      vi.spyOn(dbModule, 'getBookCover').mockResolvedValue(dummyBlob);

      // Render hook and wait for cache population
      const { result } = renderHook(() => useCoverUrl('book-to-revoke'));
      await waitFor(() => {
        expect(result.current).toBe('blob:test-revoke');
      });

      revokeCoverCache('book-to-revoke');
      expect(revokeSpy).toHaveBeenCalledWith('blob:test-revoke');
      expect(getCoverUrlFromCache('book-to-revoke')).toBeNull();
    });

    it('revokes all cached cover URLs when called without parameters', () => {
      revokeCoverCache();
      expect(getCoverUrlFromCache('any-book')).toBeNull();
    });
  });

  describe('warmCoverCache & useWarmCoverCache (requestIdleCallback)', () => {
    let originalRic: typeof window.requestIdleCallback | undefined;
    let originalCic: typeof window.cancelIdleCallback | undefined;

    beforeEach(() => {
      originalRic = window.requestIdleCallback;
      originalCic = window.cancelIdleCallback;

      window.requestIdleCallback = vi.fn((cb: IdleRequestCallback) => {
        return setTimeout(() => {
          cb({ didTimeout: false, timeRemaining: () => 15 });
        }, 10) as unknown as number;
      });

      window.cancelIdleCallback = vi.fn((id: number) => {
        clearTimeout(id);
      });
    });

    afterEach(() => {
      if (originalRic) {
        window.requestIdleCallback = originalRic;
      } else {
        delete (window as unknown as { requestIdleCallback?: unknown }).requestIdleCallback;
      }
      if (originalCic) {
        window.cancelIdleCallback = originalCic;
      } else {
        delete (window as unknown as { cancelIdleCallback?: unknown }).cancelIdleCallback;
      }
    });

    it('pre-warms uncached covers during idle callback and adds to coverUrlCache', async () => {
      const dummyBlob1 = new Blob(['blob1'], { type: 'image/jpeg' });
      const dummyBlob2 = new Blob(['blob2'], { type: 'image/jpeg' });
      const bulkMap = new Map<string, Blob>([
        ['warm-1', dummyBlob1],
        ['warm-2', dummyBlob2],
      ]);

      vi.spyOn(dbModule, 'getBookCoversBulk').mockResolvedValue(bulkMap);
      vi.spyOn(URL, 'createObjectURL').mockImplementation((blob: Blob | MediaSource) =>
        blob === dummyBlob1 ? 'blob:warmed-1' : 'blob:warmed-2'
      );

      // Mock requestIdleCallback to capture callback
      let idleCallback: ((deadline: IdleDeadline) => void) | null = null;
      vi.spyOn(window, 'requestIdleCallback').mockImplementation((cb: IdleRequestCallback) => {
        idleCallback = cb;
        return 123;
      });

      const cancel = warmCoverCache(['warm-1', 'warm-2']);
      expect(idleCallback).not.toBeNull();

      // Trigger the idle callback
      if (idleCallback) {
        await (idleCallback as (deadline: IdleDeadline) => Promise<void> | void)({
          didTimeout: false,
          timeRemaining: () => 15,
        });
      }

      expect(getCoverUrlFromCache('warm-1')).toBe('blob:warmed-1');
      expect(getCoverUrlFromCache('warm-2')).toBe('blob:warmed-2');
      cancel();
    });

    it('skips candidates that are already present in coverUrlCache', async () => {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:already-cached');
      const dummyBlob = new Blob(['cached'], { type: 'image/jpeg' });
      vi.spyOn(dbModule, 'getBookCover').mockResolvedValue(dummyBlob);

      // Populate one book in cache first
      const { result } = renderHook(() => useCoverUrl('pre-cached'));
      await waitFor(() => {
        expect(result.current).toBe('blob:already-cached');
      });

      const bulkSpy = vi.spyOn(dbModule, 'getBookCoversBulk').mockResolvedValue(new Map());

      let idleCallback: ((deadline: IdleDeadline) => void) | null = null;
      vi.spyOn(window, 'requestIdleCallback').mockImplementation((cb: IdleRequestCallback) => {
        idleCallback = cb;
        return 456;
      });

      warmCoverCache(['pre-cached']);
      // All items were already cached, so no idle task is scheduled
      expect(idleCallback).toBeNull();
      expect(bulkSpy).not.toHaveBeenCalled();
    });

    it('cancels pending idle task when cancel callback is called', () => {
      const cancelSpy = vi.spyOn(window, 'cancelIdleCallback');
      vi.spyOn(window, 'requestIdleCallback').mockReturnValue(789);

      const cancel = warmCoverCache(['book-cancel-1', 'book-cancel-2']);
      cancel();

      expect(cancelSpy).toHaveBeenCalledWith(789);
    });

    it('falls back to setTimeout when requestIdleCallback is not available', async () => {
      delete (window as unknown as { requestIdleCallback?: unknown }).requestIdleCallback;

      const dummyBlob = new Blob(['fallback'], { type: 'image/jpeg' });
      vi.spyOn(dbModule, 'getBookCoversBulk').mockResolvedValue(new Map([['fb-1', dummyBlob]]));
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fb-1-url');

      const setTimeoutSpy = vi.spyOn(window, 'setTimeout');

      const cancel = warmCoverCache(['fb-1']);
      expect(setTimeoutSpy).toHaveBeenCalled();
      cancel();
    });

    it('useWarmCoverCache hook schedules and cleans up idle pre-warming', () => {
      const cancelSpy = vi.spyOn(window, 'cancelIdleCallback');
      vi.spyOn(window, 'requestIdleCallback').mockReturnValue(999);

      const { unmount } = renderHook(() => useWarmCoverCache(['hook-1', 'hook-2'], true));
      unmount();

      expect(cancelSpy).toHaveBeenCalledWith(999);
    });
  });
});
