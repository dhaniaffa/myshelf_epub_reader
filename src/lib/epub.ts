import ePub from 'epubjs';
import JSZip from 'jszip';

import { yieldToMain } from '@/lib/asyncPool';

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
  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    return coverBlob;
  }

  return new Promise((resolve) => {
    let settled = false;
    const url = URL.createObjectURL(coverBlob);

    const finish = (result: Blob) => {
      if (!settled) {
        settled = true;
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
        resolve(result);
      }
    };

    // Safety fallback: if image loading takes longer than 2.5s, return original blob
    const timer = setTimeout(() => {
      finish(coverBlob);
    }, 2500);

    const img = new Image();

    img.onload = () => {
      clearTimeout(timer);
      const imgWidth = Math.max(1, img.width || 300);
      const imgHeight = Math.max(1, img.height || 450);
      const scale = Math.min(1, maxWidth / imgWidth);
      const targetWidth = Math.round(imgWidth * scale);
      const targetHeight = Math.round(imgHeight * scale);

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx || typeof canvas.toBlob !== 'function') {
        finish(coverBlob);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      canvas.toBlob(
        (blob) => {
          finish(blob || coverBlob);
        },
        'image/jpeg',
        0.85
      );
    };

    img.onerror = () => {
      clearTimeout(timer);
      finish(coverBlob);
    };

    img.src = url;
  });
}

export interface ExtractedMetadata {
  title: string;
  author: string;
  cover: Blob | null;
  publishedYear: string | null;
  publisher?: string | null;
  description?: string | null;
  language?: string | null;
  identifier?: string | null;
}

export interface FullBookMetadata extends ExtractedMetadata {
  publisher?: string | null;
  description?: string | null;
  language?: string | null;
  identifier?: string | null;
  rights?: string | null;
}

/**
 * Resolves relative path inside EPUB zip archive
 */
function resolveZipPath(basePath: string, relativePath: string): string {
  if (relativePath.startsWith('/')) {
    return relativePath.slice(1);
  }
  const baseDir = basePath.includes('/')
    ? basePath.substring(0, basePath.lastIndexOf('/') + 1)
    : '';
  const combined = baseDir + relativePath;
  const parts = combined.split('/');
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === '.' || part === '') continue;
    if (part === '..') {
      resolved.pop();
    } else {
      resolved.push(part);
    }
  }
  return decodeURIComponent(resolved.join('/'));
}

/**
 * Robust XML text extractor handling namespace prefixes, default namespaces, and local names
 */
function getXmlText(
  doc: Document,
  tag: string,
  ns = 'http://purl.org/dc/elements/1.1/'
): string | null {
  const byNs = doc.getElementsByTagNameNS(ns, tag);
  if (byNs.length > 0 && byNs[0].textContent) {
    const val = byNs[0].textContent.trim();
    if (val) return val;
  }
  const byPrefixed = doc.getElementsByTagName(`dc:${tag}`);
  if (byPrefixed.length > 0 && byPrefixed[0].textContent) {
    const val = byPrefixed[0].textContent.trim();
    if (val) return val;
  }
  const byLocal = doc.getElementsByTagName(tag);
  if (byLocal.length > 0 && byLocal[0].textContent) {
    const val = byLocal[0].textContent.trim();
    if (val) return val;
  }
  return null;
}

/**
 * Finds cover image href in OPF manifest (EPUB 3 properties, EPUB 2 meta, or fallback)
 */
function findCoverItemHref(doc: Document): string | null {
  const items = Array.from(doc.getElementsByTagName('item'));

  // 1. EPUB 3: item with properties="cover-image"
  const epub3Cover = items.find((item) => {
    const props = item.getAttribute('properties') || '';
    return props.split(/\s+/).includes('cover-image');
  });
  if (epub3Cover) {
    const href = epub3Cover.getAttribute('href');
    if (href) return href;
  }

  // 2. EPUB 2: <meta name="cover" content="item-id">
  const metaElements = Array.from(doc.getElementsByTagName('meta'));
  const coverMeta = metaElements.find((m) => m.getAttribute('name')?.toLowerCase() === 'cover');
  if (coverMeta) {
    const coverId = coverMeta.getAttribute('content');
    if (coverId) {
      const coverItem = items.find((item) => item.getAttribute('id') === coverId);
      if (coverItem) {
        const href = coverItem.getAttribute('href');
        if (href) return href;
      }
    }
  }

  // 3. Fallback: item in manifest with media-type starting with "image/" whose id or href contains "cover"
  const fallbackCover = items.find((item) => {
    const mediaType = (item.getAttribute('media-type') || '').toLowerCase();
    if (!mediaType.startsWith('image/')) return false;
    const id = (item.getAttribute('id') || '').toLowerCase();
    const href = (item.getAttribute('href') || '').toLowerCase();
    return id.includes('cover') || href.includes('cover');
  });
  if (fallbackCover) {
    return fallbackCover.getAttribute('href') || null;
  }

  return null;
}

/**
 * Ultra-fast targeted EPUB metadata extraction by parsing ONLY container.xml, content.opf,
 * and the single cover image directly from ZIP central directory headers without decompressing
 * book chapters, fonts, or SVGs (prevents main thread freezing on large EPUBs).
 */
export async function readFastEpubMetadata(
  buffer: ArrayBuffer,
  options?: { extractCover?: boolean }
): Promise<FullBookMetadata | null> {
  const shouldExtractCover = options?.extractCover ?? true;

  try {
    await yieldToMain();

    const zip = await JSZip.loadAsync(buffer);

    // 1. Locate and parse META-INF/container.xml
    const containerEntry =
      zip.file('META-INF/container.xml') ||
      zip.file('meta-inf/container.xml') ||
      zip.file(/meta-inf\/container\.xml$/i)[0];

    if (!containerEntry) return null;

    const containerXml = await containerEntry.async('string');
    const containerDoc = new DOMParser().parseFromString(containerXml, 'application/xml');
    const rootfile = containerDoc.querySelector('rootfile');
    const opfPath = rootfile?.getAttribute('full-path');
    if (!opfPath) return null;

    // 2. Locate and parse the package OPF file
    const opfEntry =
      zip.file(opfPath) ||
      zip.file(decodeURIComponent(opfPath)) ||
      zip.file(new RegExp(opfPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'))[0];

    if (!opfEntry) return null;

    const opfXml = await opfEntry.async('string');
    const opfDoc = new DOMParser().parseFromString(opfXml, 'application/xml');

    // 3. Extract core metadata
    const title = getXmlText(opfDoc, 'title') || 'Tanpa Judul';
    const author = getXmlText(opfDoc, 'creator') || 'Penulis Tidak Dikenal';
    const publisher = getXmlText(opfDoc, 'publisher');
    const description = getXmlText(opfDoc, 'description');
    const language = getXmlText(opfDoc, 'language');
    const identifier = getXmlText(opfDoc, 'identifier');
    const rights = getXmlText(opfDoc, 'rights');

    let publishedYear: string | null = null;
    const dateRaw = getXmlText(opfDoc, 'date');
    if (dateRaw) {
      const match = String(dateRaw).match(/\b(19\d\d|20\d\d)\b/);
      if (match) {
        publishedYear = match[1];
      }
    }

    // 4. Extract and resize cover image (if requested)
    let coverBlob: Blob | null = null;
    if (shouldExtractCover) {
      const coverHref = findCoverItemHref(opfDoc);
      if (coverHref) {
        const fullCoverPath = resolveZipPath(opfPath, coverHref);
        const coverEntry =
          zip.file(fullCoverPath) ||
          zip.file(decodeURIComponent(fullCoverPath)) ||
          zip.file(new RegExp(fullCoverPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'))[0];

        if (coverEntry) {
          const rawBlob = await coverEntry.async('blob');
          if (rawBlob) {
            await yieldToMain();
            coverBlob = await resizeCoverBlob(rawBlob, 360);
          }
        }
      }
    }

    await yieldToMain();

    return {
      title,
      author,
      cover: coverBlob,
      publishedYear,
      publisher,
      description,
      language,
      identifier,
      rights,
    };
  } catch (err) {
    console.warn('[EPUB Fast Parser] Fallback ke engine ePub.js:', err);
    return null;
  }
}

/**
 * Extracts title, creator, and cover from an EPUB file.
 * Prioritizes fast targeted zip header extraction with fallback to ePub.js.
 */
export async function readMetadata(buffer: ArrayBuffer): Promise<ExtractedMetadata> {
  try {
    const fast = await readFastEpubMetadata(buffer, { extractCover: true });
    if (fast) return fast;
  } catch {
    // Fall through to legacy engine
  }

  return readLegacyMetadata(buffer);
}

async function readLegacyMetadata(buffer: ArrayBuffer): Promise<ExtractedMetadata> {
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

    const publisher = metadata?.publisher ? String(metadata.publisher).trim() : null;
    const description = metadata?.description ? String(metadata.description).trim() : null;
    const language = metadata?.language ? String(metadata.language).trim() : null;
    const identifier = metadata?.identifier ? String(metadata.identifier).trim() : null;

    return {
      title: title || 'Tanpa Judul',
      author: author || 'Penulis Tidak Dikenal',
      cover: coverBlob,
      publishedYear,
      publisher,
      description,
      language,
      identifier,
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
export async function readFullMetadata(
  buffer: ArrayBuffer,
  options?: { extractCover?: boolean }
): Promise<FullBookMetadata> {
  try {
    const fast = await readFastEpubMetadata(buffer, options);
    if (fast) return fast;
  } catch {
    // Fall through to legacy engine
  }

  return readLegacyFullMetadata(buffer, options);
}

async function readLegacyFullMetadata(
  buffer: ArrayBuffer,
  options?: { extractCover?: boolean }
): Promise<FullBookMetadata> {
  const createBook = ePub as unknown as (data: ArrayBuffer) => ExtendedEpubBook;
  const book = createBook(buffer);

  try {
    const metadata = await book.loaded.metadata;
    let coverBlob: Blob | null = null;

    if (options?.extractCover) {
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
