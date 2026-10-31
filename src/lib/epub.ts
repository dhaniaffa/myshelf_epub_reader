import ePub from 'epubjs';

import type { ExtendedEpubBook, ExtendedPackagingMetadata } from '@/types/epubjs';

/**
 * Computes SHA-256 hash from ArrayBuffer or Blob/File (optimized for large files to be fast & RAM efficient)
 */
export async function hashBuffer(input: ArrayBuffer | Blob): Promise<string> {
  try {
    const totalBytes = input instanceof Blob ? input.size : input.byteLength;
    let dataToHash: ArrayBuffer;

    if (totalBytes <= 8 * 1024 * 1024) {
      dataToHash = input instanceof Blob ? await input.arrayBuffer() : input;
    } else {
      // Sample start (2MB), middle (2MB), and end (2MB) + byte length
      const sampleSize = 2 * 1024 * 1024;
      let head: Uint8Array;
      let mid: Uint8Array;
      let tail: Uint8Array;

      if (input instanceof Blob) {
        const midOffset = Math.floor(totalBytes / 2) - Math.floor(sampleSize / 2);
        const [headBuf, midBuf, tailBuf] = await Promise.all([
          input.slice(0, sampleSize).arrayBuffer(),
          input.slice(midOffset, midOffset + sampleSize).arrayBuffer(),
          input.slice(totalBytes - sampleSize, totalBytes).arrayBuffer(),
        ]);
        head = new Uint8Array(headBuf);
        mid = new Uint8Array(midBuf);
        tail = new Uint8Array(tailBuf);
      } else {
        head = new Uint8Array(input, 0, sampleSize);
        const midOffset = Math.floor(totalBytes / 2) - Math.floor(sampleSize / 2);
        mid = new Uint8Array(input, midOffset, sampleSize);
        tail = new Uint8Array(input, totalBytes - sampleSize, sampleSize);
      }

      const sizeStr = new TextEncoder().encode(`size:${totalBytes}`);
      const combined = new Uint8Array(sampleSize * 3 + sizeStr.length);
      combined.set(head, 0);
      combined.set(mid, sampleSize);
      combined.set(tail, sampleSize * 2);
      combined.set(sizeStr, sampleSize * 3);
      dataToHash = combined.buffer;
    }

    const digest = await Promise.race([
      crypto.subtle.digest('SHA-256', dataToHash),
      new Promise<ArrayBuffer>((_, reject) =>
        setTimeout(() => reject(new Error('Hash calculation timeout')), 5000)
      ),
    ]);
    const hashArray = Array.from(new Uint8Array(digest));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    console.warn('Gagal menghitung SHA-256 subtle, menggunakan fallback hash cepat:', err);
    const size = input instanceof Blob ? input.size : input.byteLength;
    return `hash_${size}_${Date.now().toString(36)}`;
  }
}

/**
 * Resizes cover image URL into a JPEG Blob scaled to max 360px width
 */
async function resizeCoverBlob(coverBlob: Blob, maxWidth = 360): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(coverBlob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / img.width);
      const targetWidth = Math.round(img.width * scale);
      const targetHeight = Math.round(img.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(coverBlob);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      canvas.toBlob(
        (blob) => {
          resolve(blob || coverBlob);
        },
        'image/jpeg',
        0.85
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(coverBlob);
    };
    img.src = url;
  });
}

export interface ExtractedMetadata {
  title: string;
  author: string;
  cover: Blob | null;
  publishedYear: string | null;
}

export interface FullBookMetadata extends ExtractedMetadata {
  publisher?: string | null;
  description?: string | null;
  language?: string | null;
  identifier?: string | null;
  rights?: string | null;
}

/**
 * Extracts title, creator, and cover from an EPUB file
 */
export async function readMetadata(buffer: ArrayBuffer): Promise<ExtractedMetadata> {
  const createBook = ePub as unknown as (data: ArrayBuffer) => ExtendedEpubBook;
  const book = createBook(buffer);

  try {
    // 5-second timeout for metadata extraction to prevent hanging
    const metadata = await Promise.race([
      book.loaded.metadata,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
    ]);
    let coverBlob: Blob | null = null;

    try {
      const coverUrl = await Promise.race([
        book.coverUrl(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
      ]);
      if (coverUrl) {
        let rawBlob: Blob | null = null;
        const controller = new AbortController();
        const fetchTimer = setTimeout(() => controller.abort(), 3000);
        try {
          const response = await fetch(coverUrl, { signal: controller.signal });
          rawBlob = await response.blob();
        } catch {
          // Fallback to archive direct extraction (e.g. WebKitGTK blob fetch restriction)
          if (book.archive?.getBlob) {
            try {
              rawBlob = await book.archive.getBlob(coverUrl);
            } catch {
              // ignore
            }
          }
        } finally {
          clearTimeout(fetchTimer);
        }

        if (rawBlob) {
          coverBlob = await resizeCoverBlob(rawBlob, 360);
        }
      }
    } catch {
      // Cover not available or failed to load
      coverBlob = null;
    }

    const title = metadata?.title ? String(metadata.title).trim() : 'Tanpa Judul';
    const author = metadata?.creator ? String(metadata.creator).trim() : 'Penulis Tidak Dikenal';

    let publishedYear: string | null = null;
    const metaExt = metadata as ExtendedPackagingMetadata | null;
    const dateRaw = metaExt?.pubdate || metaExt?.date || metaExt?.published;
    if (dateRaw) {
      const match = String(dateRaw).match(/\b(19\d\d|20\d\d)\b/);
      if (match) {
        publishedYear = match[1];
      }
    }

    return {
      title: title || 'Tanpa Judul',
      author: author || 'Penulis Tidak Dikenal',
      cover: coverBlob,
      publishedYear,
    };
  } finally {
    try {
      book.destroy();
    } catch {
      // Abaikan error cleanup
    }
  }
}

/**
 * Mengekstrak seluruh metadata lengkap (termasuk deskripsi, penerbit, bahasa, identifier)
 */
export async function readFullMetadata(buffer: ArrayBuffer): Promise<FullBookMetadata> {
  const createBook = ePub as unknown as (data: ArrayBuffer) => ExtendedEpubBook;
  const book = createBook(buffer);

  try {
    const metadata = await book.loaded.metadata;
    let coverBlob: Blob | null = null;

    try {
      const coverUrl = await book.coverUrl();
      if (coverUrl) {
        let rawBlob: Blob | null = null;
        try {
          const response = await fetch(coverUrl);
          rawBlob = await response.blob();
        } catch {
          if (book.archive?.getBlob) {
            try {
              rawBlob = await book.archive.getBlob(coverUrl);
            } catch {
              // ignore
            }
          }
        }
        if (rawBlob) {
          coverBlob = await resizeCoverBlob(rawBlob, 400);
        }
      }
    } catch {
      coverBlob = null;
    }

    const title = metadata?.title ? String(metadata.title).trim() : 'Tanpa Judul';
    const author = metadata?.creator ? String(metadata.creator).trim() : 'Penulis Tidak Dikenal';

    let publishedYear: string | null = null;
    const metaExt = metadata as ExtendedPackagingMetadata | null;
    const dateRaw = metaExt?.pubdate || metaExt?.date || metaExt?.published;
    if (dateRaw) {
      const match = String(dateRaw).match(/\b(19\d\d|20\d\d)\b/);
      if (match) {
        publishedYear = match[1];
      }
    }

    const publisher = metadata?.publisher ? String(metadata.publisher).trim() : null;
    const description = metadata?.description ? String(metadata.description).trim() : null;
    const language = metadata?.language ? String(metadata.language).trim() : null;
    const identifier = metadata?.identifier ? String(metadata.identifier).trim() : null;
    const rights = metadata?.rights ? String(metadata.rights).trim() : null;

    return {
      title: title || 'Tanpa Judul',
      author: author || 'Penulis Tidak Dikenal',
      cover: coverBlob,
      publishedYear,
      publisher,
      description,
      language,
      identifier,
      rights,
    };
  } finally {
    try {
      book.destroy();
    } catch {
      // ignore
    }
  }
}

/**
 * Formats byte size into human-readable format (B, KB, MB)
 */
export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
