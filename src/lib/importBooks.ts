import { asyncPool, yieldToMain } from '@/lib/asyncPool';
import { db, requestPersistentStorage } from '@/lib/db';
import { hashBuffer, readMetadata } from '@/lib/epub';
import { readNativeBookBinary } from '@/lib/nativeFiles';
import { readPdfMetadata } from '@/lib/pdf';

import type { NativePickedBook } from '@/lib/nativeFiles';
import type { Book, BookFormat, BookStorageMode } from '@/types';

export const DEFAULT_IMPORT_CONCURRENCY = 3;

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
  concurrency?: number;
}

interface ProcessFileContext {
  storageMode: BookStorageMode;
  filePath?: string;
  sourceUri?: string;
  existingSizeAndTitleSet: Set<string>;
  processingHashes: Set<string>;
  abortSignal?: AbortSignal;
}

interface ProcessFileResult {
  status: 'imported' | 'duplicate' | 'failed';
  book?: Book;
  error?: unknown;
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
 * Processes a single book file: hashes, detects duplicates, parses metadata & cover,
 * and persists to IndexedDB according to storageMode.
 */
async function processSingleFile(file: File, ctx: ProcessFileContext): Promise<ProcessFileResult> {
  if (ctx.abortSignal?.aborted) {
    return { status: 'failed' };
  }

  const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
  const format: BookFormat = isPdf ? 'pdf' : 'epub';
  const cleanName = cleanBookFileName(file.name).toLowerCase();
  const sizeAndTitleKey = `${file.size}_${cleanName}`;

  // Fast duplicate detection (matching size and name)
  if (file.size > 0 && ctx.existingSizeAndTitleSet.has(sizeAndTitleKey)) {
    return { status: 'duplicate' };
  }

  try {
    // Compute hash directly from File/Blob (sampling 6MB if file > 8MB)
    const hash = await hashBuffer(file);
    if (ctx.abortSignal?.aborted) return { status: 'failed' };

    // Check if another concurrent task is currently importing this same hash
    if (ctx.processingHashes.has(hash)) {
      ctx.existingSizeAndTitleSet.add(sizeAndTitleKey);
      return { status: 'duplicate' };
    }
    ctx.processingHashes.add(hash);

    // Check if hash already exists in IndexedDB
    const existing = await db.books.get(hash);
    if (existing) {
      ctx.existingSizeAndTitleSet.add(sizeAndTitleKey);
      return { status: 'duplicate' };
    }

    let title = cleanBookFileName(file.name);
    let author = 'Penulis Tidak Dikenal';
    let cover: Blob | null = null;
    let publishedYear: string | null = null;
    let totalLocations: number | null = null;
    let publisher: string | null = null;
    let description: string | null = null;
    let language: string | null = null;
    let identifier: string | null = null;

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
        publisher = pdfMeta.publisher || null;
        description = pdfMeta.description || null;
      } else {
        const epubMeta = await readMetadata(buffer.slice(0));
        title = epubMeta.title || title;
        author = epubMeta.author || author;
        cover = epubMeta.cover;
        publishedYear = epubMeta.publishedYear;
        publisher = epubMeta.publisher || null;
        description = epubMeta.description || null;
        language = epubMeta.language || null;
        identifier = epubMeta.identifier || null;
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
      publisher,
      description,
      language,
      identifier,
      fileSize: file.size,
      format,
      storageMode: ctx.storageMode,
      filePath: ctx.filePath || null,
      sourceUri: ctx.sourceUri || null,
    };

    // Only store Blob in db.files when in vault mode.
    // In linked mode, omit db.files storage to eliminate storage duplication.
    if (ctx.storageMode === 'vault') {
      const fileToSave: Blob = file;
      await Promise.race([
        db.files.put({ id: hash, buffer: fileToSave }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout menyimpan berkas ke IndexedDB (>25s)')), 25000)
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

    ctx.existingSizeAndTitleSet.add(sizeAndTitleKey);
    return { status: 'imported', book: newBook };
  } catch (err) {
    console.error(`Gagal mengimpor berkas ${format.toUpperCase()}:`, file.name, err);
    return { status: 'failed', error: err };
  }
}

/**
 * Imports book files (EPUB and PDF) into IndexedDB with bounded parallel concurrency.
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
  const concurrency = options.concurrency ?? DEFAULT_IMPORT_CONCURRENCY;

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
  const processingHashes = new Set<string>();

  let processedCount = 0;

  // Process files in bounded parallel concurrency
  await asyncPool(
    concurrency,
    fileArray,
    async (file) => {
      if (abortSignal?.aborted) return;

      const singleResult = await processSingleFile(file, {
        storageMode,
        filePath: filePaths[file.name],
        sourceUri: sourceUris[file.name],
        existingSizeAndTitleSet,
        processingHashes,
        abortSignal,
      });

      processedCount++;

      if (singleResult.status === 'imported' && singleResult.book) {
        result.imported++;
        result.books.push(singleResult.book);
      } else if (singleResult.status === 'duplicate') {
        result.duplicates++;
      } else if (singleResult.status === 'failed') {
        result.failed++;
      }

      if (onProgress) {
        onProgress(processedCount, fileArray.length, file.name);
      }

      // Yield briefly to main thread to allow UI rendering & event handling
      await yieldToMain();
    },
    abortSignal
  );

  return result;
}

// Alias for backward compatibility
export const importEpubFiles = importBookFiles;

/**
 * Imports books selected via native file pickers (Desktop / Android SAF)
 * with bounded parallel concurrency and streaming memory reclamation.
 */
export async function importNativePickedBooks(
  picked: NativePickedBook[],
  storageMode: BookStorageMode = 'linked',
  onProgress?: (processed: number, total: number, fileName?: string) => void,
  signal?: AbortSignal,
  options?: { concurrency?: number }
): Promise<ImportResult> {
  const concurrency = options?.concurrency ?? DEFAULT_IMPORT_CONCURRENCY;

  // Filter valid book files
  const validPicked = picked.filter((p) => {
    const name = p.name.toLowerCase();
    if (p.name.startsWith('.') || p.name.startsWith('~') || name.includes('.tmp.')) {
      return false;
    }
    return name.endsWith('.epub') || name.endsWith('.pdf');
  });

  const result: ImportResult = {
    total: validPicked.length,
    imported: 0,
    duplicates: 0,
    failed: 0,
    books: [],
  };

  if (validPicked.length === 0) {
    return result;
  }

  requestPersistentStorage().catch(() => {});

  const existingBooks = await db.books.toArray();
  const existingSizeAndTitleSet = new Set(
    existingBooks.map((b) => `${b.fileSize}_${cleanBookFileName(b.title).toLowerCase()}`)
  );
  const processingHashes = new Set<string>();

  let processedCount = 0;

  // Stream each file through bounded concurrency pool instead of loading all files into RAM at once
  await asyncPool(
    concurrency,
    validPicked,
    async (item) => {
      if (signal?.aborted) return;

      const cleanName = cleanBookFileName(item.name).toLowerCase();
      const sizeKey = item.size && item.size > 0 ? `${item.size}_${cleanName}` : null;

      // Fast detection before reading file binary from disk/SAF stream
      if (sizeKey && existingSizeAndTitleSet.has(sizeKey)) {
        result.duplicates++;
        processedCount++;
        if (onProgress) {
          onProgress(processedCount, validPicked.length, item.name);
        }
        return;
      }

      try {
        if (onProgress) {
          onProgress(processedCount, validPicked.length, `Membaca ${item.name}...`);
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

        const singleResult = await processSingleFile(file, {
          storageMode,
          filePath: item.path,
          sourceUri: item.uri,
          existingSizeAndTitleSet,
          processingHashes,
          abortSignal: signal,
        });

        if (singleResult.status === 'imported' && singleResult.book) {
          result.imported++;
          result.books.push(singleResult.book);
        } else if (singleResult.status === 'duplicate') {
          result.duplicates++;
        } else if (singleResult.status === 'failed') {
          result.failed++;
        }
      } catch (err) {
        console.warn(`Gagal membaca stream berkas native ${item.name}:`, err);
        result.failed++;
      }

      processedCount++;
      if (onProgress) {
        onProgress(processedCount, validPicked.length, item.name);
      }

      await yieldToMain();
    },
    signal
  );

  return result;
}
