import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

import type { PdfDocumentInfo, PdfOutlineNode } from '@/types/pdfjs';

// Initialize PDF.js Worker for Vite/ESM
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

export const PDF_CMAP_URL =
  typeof window !== 'undefined' ? `${window.location.origin}/cmaps/` : '/cmaps/';

export const PDF_STANDARD_FONT_DATA_URL =
  typeof window !== 'undefined' ? `${window.location.origin}/standard_fonts/` : '/standard_fonts/';

export { pdfjsLib };

export interface PdfExtractedMetadata {
  title: string;
  author: string;
  cover: Blob | null;
  publishedYear: string | null;
  totalPages: number;
  publisher?: string | null;
  description?: string | null;
}

export interface PdfFullMetadata extends PdfExtractedMetadata {
  producer?: string | null;
  creator?: string | null;
  creationDate?: string | null;
  formatVersion?: string | null;
}

export interface PdfOutlineItem {
  id: string;
  label: string;
  pageNumber: number;
  items?: PdfOutlineItem[];
}

/**
 * Strips file extension from filename for book title fallback
 */
function cleanFileName(fileName?: string): string {
  if (!fileName) return 'Dokumen PDF';
  return (
    fileName
      .replace(/\.[^/.]+$/, '')
      .replace(/[-_]/g, ' ')
      .trim() || 'Dokumen PDF'
  );
}

/**
 * Extracts year from PDF date string (e.g. "D:20230501120000Z")
 */
function extractYear(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const match = String(dateStr).match(/\b(19\d\d|20\d\d)\b/);
  return match ? match[1] : null;
}

/**
 * Extracts basic metadata and renders cover image from first page of PDF
 */
export async function readPdfMetadata(
  buffer: ArrayBuffer,
  fileName?: string
): Promise<PdfExtractedMetadata> {
  const fallback: PdfExtractedMetadata = {
    title: cleanFileName(fileName),
    author: 'Penulis Tidak Dikenal',
    cover: null,
    publishedYear: null,
    totalPages: 1,
  };

  try {
    return await Promise.race([
      internalReadPdfMetadata(buffer, fileName),
      new Promise<PdfExtractedMetadata>((resolve) =>
        setTimeout(() => {
          console.warn(
            `[PDF] Ekstraksi metadata untuk ${fileName} melebihi 6 detik, menggunakan fallback.`
          );
          resolve(fallback);
        }, 6000)
      ),
    ]);
  } catch (err) {
    console.warn(`[PDF] Error membaca metadata ${fileName}:`, err);
    return fallback;
  }
}

async function internalReadPdfMetadata(
  buffer: ArrayBuffer,
  fileName?: string
): Promise<PdfExtractedMetadata> {
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    cMapUrl: PDF_CMAP_URL,
    cMapPacked: true,
    standardFontDataUrl: PDF_STANDARD_FONT_DATA_URL,
    disableFontFace: true,
    stopAtErrors: true,
  });

  // Immediately cancel if PDF requests password (do not wait for input)
  loadingTask.onPassword = (updatePassword: (pw: string) => void) => {
    updatePassword('');
  };

  let pdfDoc: pdfjsLib.PDFDocumentProxy | null = null;

  try {
    // 5-second timeout for loading PDF document
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('PDF loading timeout')), 5000);
    });
    pdfDoc = await Promise.race([loadingTask.promise, timeoutPromise]);

    const totalPages = pdfDoc.numPages || 1;
    let title = cleanFileName(fileName);
    let author = 'Penulis Tidak Dikenal';
    let publishedYear: string | null = null;
    let publisher: string | null = null;
    let description: string | null = null;

    try {
      const meta = await pdfDoc.getMetadata();
      const info = meta?.info as PdfDocumentInfo | undefined;
      if (info) {
        if (info.Title && String(info.Title).trim().length > 0) {
          title = String(info.Title).trim();
        }
        if (info.Author && String(info.Author).trim().length > 0) {
          author = String(info.Author).trim();
        }
        if (info.Producer || info.Creator) {
          publisher = String(info.Producer || info.Creator).trim();
        }
        if (info.Subject && String(info.Subject).trim().length > 0) {
          description = String(info.Subject).trim();
        }
        publishedYear = extractYear(info.CreationDate || info.ModDate);
      }
    } catch {
      // Ignore if info metadata is empty
    }

    // Render first page as thumbnail cover
    let coverBlob: Blob | null = null;
    try {
      const firstPage = await pdfDoc.getPage(1);
      const viewport = firstPage.getViewport({ scale: 1 });
      const targetWidth = 360;
      const scale = targetWidth / Math.max(1, viewport.width);
      const thumbViewport = firstPage.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(thumbViewport.width);
      canvas.height = Math.round(thumbViewport.height);
      const ctx = canvas.getContext('2d');

      if (ctx && canvas.width > 0 && canvas.height > 0) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        const renderTask = firstPage.render({
          canvasContext: ctx,
          viewport: thumbViewport,
          canvas,
        });
        try {
          const renderTimeout = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('PDF render timeout')), 3500);
          });
          await Promise.race([renderTask.promise, renderTimeout]);

          coverBlob = await Promise.race([
            new Promise<Blob | null>((resolve) => {
              try {
                canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.85);
              } catch {
                resolve(null);
              }
            }),
            new Promise<Blob | null>((resolve) => setTimeout(() => resolve(null), 2500)),
          ]);
        } catch {
          try {
            renderTask.cancel();
          } catch {
            // ignore
          }
        } finally {
          try {
            firstPage.cleanup();
          } catch {
            // ignore
          }
        }
      }
    } catch (e) {
      console.warn('Gagal merender cover PDF:', e);
      coverBlob = null;
    }

    return {
      title,
      author,
      cover: coverBlob,
      publishedYear,
      totalPages,
      publisher,
      description,
    };
  } catch (err) {
    console.warn(`Gagal memuat metadata PDF untuk ${fileName}, menggunakan fallback:`, err);
    return {
      title: cleanFileName(fileName),
      author: 'Penulis Tidak Dikenal',
      cover: null,
      publishedYear: null,
      totalPages: 1,
    };
  } finally {
    if (pdfDoc) {
      try {
        await pdfDoc.cleanup();
      } catch {
        // ignore
      }
    }
    try {
      // Use timeout to prevent deadlock if worker is awaiting setup capability
      await Promise.race([
        loadingTask.destroy(),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
    } catch {
      // ignore
    }
  }
}

/**
 * Extracts complete metadata for book details dialog
 */
export async function readFullPdfMetadata(
  buffer: ArrayBuffer,
  fileName?: string,
  options?: { extractCover?: boolean }
): Promise<PdfFullMetadata> {
  const shouldExtractCover = options?.extractCover ?? true;
  const basic = shouldExtractCover
    ? await readPdfMetadata(buffer, fileName)
    : {
        title: cleanFileName(fileName),
        author: 'Penulis Tidak Dikenal',
        cover: null,
        publishedYear: null,
        totalPages: 1,
      };

  const bufferCopy = buffer.slice(0);
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(bufferCopy),
    cMapUrl: PDF_CMAP_URL,
    cMapPacked: true,
    standardFontDataUrl: PDF_STANDARD_FONT_DATA_URL,
  });

  try {
    const pdfDoc = await loadingTask.promise;
    const meta = await pdfDoc.getMetadata();
    const info = (meta?.info || {}) as PdfDocumentInfo;

    return {
      ...basic,
      title: info.Title ? String(info.Title).trim() : basic.title,
      author: info.Author ? String(info.Author).trim() : basic.author,
      publishedYear: extractYear(info.CreationDate || info.ModDate) || basic.publishedYear,
      totalPages: pdfDoc.numPages || basic.totalPages,
      producer: info.Producer ? String(info.Producer).trim() : null,
      creator: info.Creator ? String(info.Creator).trim() : null,
      creationDate: info.CreationDate ? String(info.CreationDate).trim() : null,
      formatVersion: info.PDFFormatVersion ? String(info.PDFFormatVersion).trim() : null,
    };
  } catch {
    return {
      ...basic,
      producer: null,
      creator: null,
      creationDate: null,
      formatVersion: null,
    };
  } finally {
    try {
      await Promise.race([
        loadingTask.destroy(),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
    } catch {
      // ignore
    }
  }
}

/**
 * Extracts native PDF outline (TOC) with destination caching & depth limit
 */
export async function extractPdfOutline(
  pdfDoc: pdfjsLib.PDFDocumentProxy
): Promise<PdfOutlineItem[]> {
  try {
    const outline = (await pdfDoc.getOutline()) as PdfOutlineNode[] | null;
    if (!outline || !Array.isArray(outline) || outline.length === 0) {
      return [];
    }

    const destCache = new Map<string, number>();
    let totalItemsProcessed = 0;
    const MAX_ITEMS = 300; // Cap limit so documents with thousands of pages do not block UI

    const resolveItems = async (items: PdfOutlineNode[], depth = 0): Promise<PdfOutlineItem[]> => {
      if (depth > 3 || totalItemsProcessed >= MAX_ITEMS) return [];
      const result: PdfOutlineItem[] = [];

      for (let i = 0; i < items.length; i++) {
        if (totalItemsProcessed >= MAX_ITEMS) break;
        totalItemsProcessed++;

        const item = items[i];
        let pageNumber = 1;

        try {
          if (typeof item.dest === 'string') {
            if (destCache.has(item.dest)) {
              pageNumber = destCache.get(item.dest)!;
            } else {
              const dest = await pdfDoc.getDestination(item.dest);
              if (dest && dest[0]) {
                const pageIdx = await pdfDoc.getPageIndex(dest[0] as { num: number; gen: number });
                pageNumber = pageIdx + 1;
                destCache.set(item.dest, pageNumber);
              }
            }
          } else if (Array.isArray(item.dest) && item.dest[0]) {
            const pageIdx = await pdfDoc.getPageIndex(item.dest[0] as { num: number; gen: number });
            pageNumber = pageIdx + 1;
          }
        } catch {
          pageNumber = 1;
        }

        const childItems =
          item.items && item.items.length > 0 && depth < 3
            ? await resolveItems(item.items, depth + 1)
            : undefined;

        result.push({
          id: `outline-${depth}-${i}-${pageNumber}`,
          label: item.title || `Bagian ${i + 1}`,
          pageNumber,
          items: childItems,
        });
      }

      return result;
    };

    // 5-second maximum timeout for outline extraction
    const timeoutOutline = new Promise<PdfOutlineItem[]>((resolve) => {
      setTimeout(() => resolve([]), 5000);
    });

    return await Promise.race([resolveItems(outline), timeoutOutline]);
  } catch (err) {
    console.warn('Gagal membaca outline PDF:', err);
    return [];
  }
}
