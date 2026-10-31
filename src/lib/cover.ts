import { useEffect, useState } from 'react';

import { getBookCover, onBooksDeleted } from '@/lib/db';

const MAX_COVER_CACHE_ENTRIES = 300;
const coverUrlCache = new Map<string, string>();

// Automatically clean up memory cache when books are removed from DB
onBooksDeleted((bookIds) => {
  for (const id of bookIds) {
    revokeCoverCache(id);
  }
});

/**
 * Returns a cached Object URL for a bookId if it exists in memory.
 */
export function getCoverUrlFromCache(bookId: string): string | null {
  return coverUrlCache.get(bookId) || null;
}

/**
 * Revokes and clears one or all cached Object URLs.
 */
export function revokeCoverCache(bookId?: string): void {
  if (bookId) {
    const url = coverUrlCache.get(bookId);
    if (url && url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // Abaikan error revoke jika sudah tidak valid
      }
    }
    coverUrlCache.delete(bookId);
  } else {
    for (const url of coverUrlCache.values()) {
      if (url && url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // Abaikan
        }
      }
    }
    coverUrlCache.clear();
  }
}

function addToCoverCache(bookId: string, url: string): void {
  // Evict oldest entry if exceeding memory quota
  if (coverUrlCache.size >= MAX_COVER_CACHE_ENTRIES) {
    const oldestKey = coverUrlCache.keys().next().value;
    if (oldestKey) {
      const oldUrl = coverUrlCache.get(oldestKey);
      if (oldUrl && oldUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(oldUrl);
        } catch {
          // Abaikan
        }
      }
      coverUrlCache.delete(oldestKey);
    }
  }
  coverUrlCache.set(bookId, url);
}

/**
 * Safely converts an IndexedDB cover entry (Blob, Uint8Array, ArrayBuffer, base64, or serialized Buffer)
 * into a valid browser Object URL.
 */
export function createCoverUrl(cover: unknown): string | null {
  if (!cover) return null;
  if (typeof cover === 'string') return cover;

  try {
    if (cover instanceof Blob) {
      return URL.createObjectURL(cover);
    }
    if (cover instanceof Uint8Array || cover instanceof ArrayBuffer) {
      const blob = new Blob([cover as BlobPart], { type: 'image/jpeg' });
      return URL.createObjectURL(blob);
    }
    // Handle serialized buffer like { type: 'Buffer', data: [...] } from JSON/IndexedDB
    if (typeof cover === 'object' && 'data' in (cover as Record<string, unknown>)) {
      const data = (cover as { data: number[] }).data;
      if (Array.isArray(data)) {
        const u8 = new Uint8Array(data);
        const blob = new Blob([u8 as BlobPart], { type: 'image/jpeg' });
        return URL.createObjectURL(blob);
      }
    }
  } catch (err) {
    console.warn('Failed to create cover object URL:', err);
  }
  return null;
}

/**
 * React hook that manages cover Object URL creation and lifecycle.
 *
 * Supports:
 * - Lazy loading from isolated `db.covers` table by `bookId`
 * - Synchronous memory cache resolution (0ms, zero flickering on scroll)
 * - Fallback to legacy inline `cover` Blob/Buffer if available
 */
export function useCoverUrl(
  bookIdOrCover?: string | Blob | unknown,
  legacyCover?: unknown
): string | null {
  const isDirectUrl =
    typeof bookIdOrCover === 'string' &&
    (bookIdOrCover.startsWith('blob:') ||
      bookIdOrCover.startsWith('http://') ||
      bookIdOrCover.startsWith('https://') ||
      bookIdOrCover.startsWith('data:'));

  const bookId = typeof bookIdOrCover === 'string' && !isDirectUrl ? bookIdOrCover : null;
  const directCover = !bookId && !isDirectUrl ? bookIdOrCover : null;

  const [asyncUrl, setAsyncUrl] = useState<string | null>(() => {
    if (bookId) {
      const cached = coverUrlCache.get(bookId);
      if (cached) return cached;
      if (legacyCover) return createCoverUrl(legacyCover);
      return null;
    }
    if (directCover) {
      return createCoverUrl(directCover);
    }
    return null;
  });

  useEffect(() => {
    let active = true;

    if (bookId) {
      const cached = coverUrlCache.get(bookId);
      if (cached) {
        return;
      }

      // Fetch asynchronously from isolated covers table in IndexedDB
      getBookCover(bookId)
        .then((blob) => {
          if (!active) return;
          if (blob) {
            const objectUrl = URL.createObjectURL(blob);
            addToCoverCache(bookId, objectUrl);
            setAsyncUrl(objectUrl);
          } else if (legacyCover) {
            // Fallback for older databases or transient imports
            const fallbackUrl = createCoverUrl(legacyCover);
            if (fallbackUrl) {
              addToCoverCache(bookId, fallbackUrl);
              setAsyncUrl(fallbackUrl);
            }
          }
        })
        .catch((err) => {
          console.warn(`Gagal memuat cover untuk buku ${bookId}:`, err);
        });

      return () => {
        active = false;
      };
    }

    if (directCover) {
      const objectUrl = createCoverUrl(directCover);
      Promise.resolve().then(() => {
        if (active) {
          setAsyncUrl(objectUrl);
        }
      });

      return () => {
        active = false;
        if (objectUrl && objectUrl.startsWith('blob:')) {
          setTimeout(() => {
            URL.revokeObjectURL(objectUrl);
          }, 1000);
        }
      };
    }
  }, [bookId, directCover, legacyCover]);

  if (isDirectUrl) {
    return bookIdOrCover as string;
  }

  if (bookId) {
    const cached = coverUrlCache.get(bookId);
    if (cached) return cached;
  }

  return asyncUrl;
}
