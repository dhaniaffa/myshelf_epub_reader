import { db, requestPersistentStorage } from '@/lib/db';
import { hashBuffer, readMetadata } from '@/lib/epub';
import { readNativeBookBinary } from '@/lib/nativeFiles';
import { readPdfMetadata } from '@/lib/pdf';

import type { NativePickedBook } from '@/lib/nativeFiles';
import type { Book, BookFormat, BookStorageMode } from '@/types';

export interface ImportResult {
  total: number;
  imported: number;
  duplicates: number;
  failed: number;
  books: Book[];
}

export interface ImportBookOptions {
  storageMode?: BookStorageMode;
  filePaths?: Record<string, string>;
  sourceUris?: Record<string, string>;
  onProgress?: (processed: number, total: number, fileName?: string) => void;
  signal?: AbortSignal;
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
  optionsOrProgress?:
    ImportBookOptions | ((processed: number, total: number, fileName?: string) => void),
  signal?: AbortSignal
): Promise<ImportResult> {
  const options: ImportBookOptions =
    typeof optionsOrProgress === 'function'
      ? { onProgress: optionsOrProgress, signal }
      : optionsOrProgress || {};

  const onProgress = options.onProgress;
  const abortSignal = options.signal || signal;
  const storageMode: BookStorageMode = options.storageMode || 'vault';
  const filePaths = options.filePaths || {};
  const sourceUris = options.sourceUris || {};
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
    if (abortSignal?.aborted) {
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
          storageMode,
          filePath: filePaths[file.name] || null,
          sourceUri: sourceUris[file.name] || null,
        };

        // Only store Blob in db.files when in vault mode.
        // In linked mode, omit db.files storage to eliminate 100% of storage duplication.
        if (storageMode === 'vault') {
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
        }

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

/**
 * Imports books selected via native file pickers (Desktop / Android SAF)
 * with support for either 'linked' (zero-copy) or 'vault' (copy into IDB) storage mode.
 */
export async function importNativePickedBooks(
  picked: NativePickedBook[],
  storageMode: BookStorageMode = 'linked',
  onProgress?: (processed: number, total: number, fileName?: string) => void,
  signal?: AbortSignal
): Promise<ImportResult> {
  const files: File[] = [];
  const filePaths: Record<string, string> = {};
  const sourceUris: Record<string, string> = {};

  for (let i = 0; i < picked.length; i++) {
    if (signal?.aborted) break;
    const item = picked[i];
    try {
      if (onProgress) {
        onProgress(i, picked.length, `Membaca ${item.name}...`);
      }

      const dummyBook: Book = {
        id: '',
        title: item.name,
        author: '',
        cover: null,
        progress: 0,
        lastCfi: null,
        readingTimeSeconds: 0,
        status: 'unread',
        addedAt: Date.now(),
        lastReadAt: null,
        totalLocations: null,
        filePath: item.path,
        sourceUri: item.uri,
      };

      const buffer = await readNativeBookBinary(dummyBook);
      const isPdf = item.name.toLowerCase().endsWith('.pdf');
      const mimeType = isPdf ? 'application/pdf' : 'application/epub+zip';
      const file = new File([buffer], item.name, { type: mimeType });

      files.push(file);
      if (item.path) filePaths[item.name] = item.path;
      if (item.uri) sourceUris[item.name] = item.uri;
    } catch (err) {
      console.warn(`Gagal membaca stream berkas ${item.name}:`, err);
    }
  }

  if (files.length === 0) {
    return {
      total: picked.length,
      imported: 0,
      duplicates: 0,
      failed: picked.length,
      books: [],
    };
  }

  return importBookFiles(files, {
    storageMode,
    filePaths,
    sourceUris,
    onProgress,
    signal,
  });
}
