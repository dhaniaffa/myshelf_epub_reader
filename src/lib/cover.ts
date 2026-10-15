import { useEffect, useState } from 'react';

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
 * React hook that manages cover Object URL creation and lifecycle cleanup
 * without premature revoking or microtask race conditions.
 */
export function useCoverUrl(cover: unknown): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const objectUrl = createCoverUrl(cover);

    Promise.resolve().then(() => {
      if (active) {
        setUrl(objectUrl);
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
  }, [cover]);

  return url;
}
