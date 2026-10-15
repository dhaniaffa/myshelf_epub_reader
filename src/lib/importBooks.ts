import { db, requestPersistentStorage } from '@/lib/db';
import { hashBuffer, readMetadata } from '@/lib/epub';
import { readPdfMetadata } from '@/lib/pdf';

import type { Book, BookFormat } from '@/types';

export interface ImportResult {
  total: number;
  imported: number;
  duplicates: number;
  failed: number;
  books: Book[];
}

function cleanBookFileName(fileName: string): string {
  return (
    fileName
      .replace(/\.[^/.]+$/, '')
      .replace(/[-_]/g, ' ')
      .trim() || 'Tanpa Judul'
  );
}

/**
 * Imports book files (EPUB and PDF) into IndexedDB
 */
export async function importBookFiles(
  files: File[] | FileList,
  onProgress?: (processed: number, total: number, fileName?: string) => void,
  signal?: AbortSignal
): Promise<ImportResult> {
  const fileArray = Array.from(files).filter((f) => {
    const name = f.name.toLowerCase();
    // Ignore hidden files, lock files, macOS AppleDouble files (._*), and temp files
    if (f.name.startsWith('.') || f.name.startsWith('~') || name.includes('.tmp.')) {
      return false;
    }
    return (
      name.endsWith('.epub') ||
      name.endsWith('.pdf') ||
      f.type === 'application/epub+zip' ||
      f.type === 'application/pdf'
    );
  });

  const result: ImportResult = {
    total: fileArray.length,
    imported: 0,
    duplicates: 0,
    failed: 0,
    books: [],
  };

  if (fileArray.length === 0) {
    return result;
  }

  // Request storage persistence upfront on import
  requestPersistentStorage().catch(() => {});

  // Fetch existing books from IndexedDB for fast duplicate detection without reading disk buffer
  const existingBooks = await db.books.toArray();
  const existingSizeAndTitleSet = new Set(
    existingBooks.map((b) => `${b.fileSize}_${cleanBookFileName(b.title).toLowerCase()}`)
  );

  for (let i = 0; i < fileArray.length; i++) {
    if (signal?.aborted) {
      console.log('Impor berkas dihentikan atas permintaan pengguna (aborted).');
      break;
    }

    const file = fileArray[i];
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
    const format: BookFormat = isPdf ? 'pdf' : 'epub';

    if (onProgress) {
      onProgress(i, fileArray.length, file.name);
    }

    // Fast detection if file already exists in library (matching size and name)
    const cleanName = cleanBookFileName(file.name).toLowerCase();
    const sizeAndTitleKey = `${file.size}_${cleanName}`;
    if (file.size > 0 && existingSizeAndTitleSet.has(sizeAndTitleKey)) {
      result.duplicates++;
      if (onProgress) {
        onProgress(i + 1, fileArray.length, file.name);
      }
      continue;
    }

    try {
      // Compute hash directly from File/Blob (sampling 6MB if file > 8MB)
      const hash = await hashBuffer(file);

      // Check if hash already exists in IndexedDB
      const existing = await db.books.get(hash);
      if (existing) {
        existingSizeAndTitleSet.add(sizeAndTitleKey);
        result.duplicates++;
      } else {
        let title = cleanBookFileName(file.name);
        let author = 'Penulis Tidak Dikenal';
        let cover: Blob | null = null;
        let publishedYear: string | null = null;
        let totalLocations: number | null = null;

        // Read temporary buffer only for metadata & cover extraction
        try {
          const buffer = await Promise.race([
            file.arrayBuffer(),
            new Promise<ArrayBuffer>((_, reject) =>
              setTimeout(() => reject(new Error('Timeout membaca berkas dari disk (>30s)')), 30000)
            ),
          ]);

          if (isPdf) {
            const pdfMeta = await readPdfMetadata(buffer, file.name);
            title = pdfMeta.title || title;
            author = pdfMeta.author || author;
            cover = pdfMeta.cover;
            publishedYear = pdfMeta.publishedYear;
            totalLocations = pdfMeta.totalPages;
          } else {
            const epubMeta = await readMetadata(buffer.slice(0));
            title = epubMeta.title || title;
            author = epubMeta.author || author;
            cover = epubMeta.cover;
            publishedYear = epubMeta.publishedYear;
          }
        } catch (metaErr) {
          console.warn(
            `Gagal membaca metadata spesifik untuk ${file.name}, menggunakan nama berkas:`,
            metaErr
          );
        }

        const newBook: Book = {
          id: hash,
          title,
          author,
          cover,
          progress: 0,
          lastCfi: isPdf ? 'page:1' : null,
          readingTimeSeconds: 0,
          status: 'unread',
          addedAt: Date.now(),
          lastReadAt: null,
          totalLocations,
          publishedYear,
          fileSize: file.size,
          format,
        };

        // Store directly as Blob in IndexedDB to avoid Chromium 128MB Mojo IPC limit
        const fileToSave: Blob = file;
        await Promise.race([
          db.files.put({ id: hash, buffer: fileToSave }),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error('Timeout menyimpan berkas ke IndexedDB (>25s)')),
              25000
            )
          ),
        ]);

        await Promise.race([
          db.books.put(newBook),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error('Timeout menyimpan metadata buku ke IndexedDB (>10s)')),
              10000
            )
          ),
        ]);

        // Save to detection set so subsequent iterations recognize this book
        existingSizeAndTitleSet.add(sizeAndTitleKey);

        result.imported++;
        result.books.push(newBook);
      }
    } catch (err) {
      console.error(`Gagal mengimpor berkas ${format.toUpperCase()}:`, file.name, err);
      result.failed++;
    }

    if (onProgress) {
      onProgress(i + 1, fileArray.length, file.name);
    }

    // Yield to browser main thread to keep loading UI smooth and responsive
    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  return result;
}

// Alias for backward compatibility
export const importEpubFiles = importBookFiles;
