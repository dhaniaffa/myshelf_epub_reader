import { beforeEach, describe, expect, it, vi } from 'vitest';

import { importBookFiles, importNativePickedBooks } from './importBooks';

import type { Book, BookFile } from '@/types';

// Mock in-memory Dexie database tables
const booksMap = new Map<string, Book>();
const filesMap = new Map<string, BookFile>();

vi.mock('./db', () => ({
  db: {
    books: {
      toArray: vi.fn().mockImplementation(async () => Array.from(booksMap.values())),
      get: vi.fn().mockImplementation(async (id: string) => booksMap.get(id)),
      put: vi.fn().mockImplementation(async (book: Book) => {
        booksMap.set(book.id, book);
        return book.id;
      }),
    },
    files: {
      get: vi.fn().mockImplementation(async (id: string) => filesMap.get(id)),
      put: vi.fn().mockImplementation(async (file: BookFile) => {
        filesMap.set(file.id, file);
        return file.id;
      }),
    },
  },
  requestPersistentStorage: vi.fn().mockResolvedValue(true),
}));

// Mock metadata extractors
vi.mock('./epub', () => ({
  cleanBookFileName: (s: string) => s,
  hashBuffer: vi.fn().mockImplementation(async (file: File) => `hash-${file.name}`),
  readMetadata: vi.fn().mockResolvedValue({
    title: 'Buku EPUB Uji',
    author: 'Penulis Uji',
    cover: null,
    publishedYear: '2026',
  }),
}));

vi.mock('./pdf', () => ({
  readPdfMetadata: vi.fn().mockResolvedValue({
    title: 'Buku PDF Uji',
    author: 'Penulis PDF',
    cover: null,
    publishedYear: '2026',
    totalPages: 42,
  }),
}));

vi.mock('./nativeFiles', () => ({
  readNativeBookBinary: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
}));

describe('Import Engine Storage Modes & Concurrency (src/lib/importBooks.ts)', () => {
  beforeEach(() => {
    booksMap.clear();
    filesMap.clear();
    vi.clearAllMocks();
  });

  it('omits db.files storage completely when storageMode is linked (Zero-Copy)', async () => {
    const fakeEpubFile = new File(['fake epub binary'], 'novel.epub', {
      type: 'application/epub+zip',
    });

    const result = await importBookFiles([fakeEpubFile], {
      storageMode: 'linked',
      filePaths: { 'novel.epub': '/home/user/Books/novel.epub' },
    });

    expect(result.imported).toBe(1);

    // Verify metadata saved in db.books
    const savedBook = booksMap.get('hash-novel.epub');
    expect(savedBook).toBeDefined();
    expect(savedBook?.storageMode).toBe('linked');
    expect(savedBook?.filePath).toBe('/home/user/Books/novel.epub');

    // CRITICAL: Verify db.files is EMPTY (0 MB duplikasi)
    const savedFile = filesMap.get('hash-novel.epub');
    expect(savedFile).toBeUndefined();
  });

  it('saves blob in db.files when storageMode is vault (Managed Vault)', async () => {
    const fakeEpubFile = new File(['fake epub binary'], 'vault_novel.epub', {
      type: 'application/epub+zip',
    });

    const result = await importBookFiles([fakeEpubFile], {
      storageMode: 'vault',
    });

    expect(result.imported).toBe(1);

    // Verify metadata saved in db.books
    const savedBook = booksMap.get('hash-vault_novel.epub');
    expect(savedBook).toBeDefined();
    expect(savedBook?.storageMode).toBe('vault');

    // Verify db.files CONTAINS the binary buffer
    const savedFile = filesMap.get('hash-vault_novel.epub');
    expect(savedFile).toBeDefined();
    expect(savedFile?.buffer).toBeDefined();
  });

  it('imports multiple files concurrently and reports progress', async () => {
    const files = [
      new File(['1'], 'book1.epub', { type: 'application/epub+zip' }),
      new File(['2'], 'book2.epub', { type: 'application/epub+zip' }),
      new File(['3'], 'book3.epub', { type: 'application/epub+zip' }),
      new File(['4'], 'book4.epub', { type: 'application/epub+zip' }),
    ];

    const progressCalls: number[] = [];
    const result = await importBookFiles(files, {
      storageMode: 'linked',
      concurrency: 2,
      onProgress: (current, total) => {
        expect(total).toBe(4);
        progressCalls.push(current);
      },
    });

    expect(result.total).toBe(4);
    expect(result.imported).toBe(4);
    expect(result.duplicates).toBe(0);
    expect(progressCalls.length).toBeGreaterThanOrEqual(4);
  });

  it('detects duplicates fast and skips duplicate processing', async () => {
    const file1 = new File(['content-same'], 'same.epub', { type: 'application/epub+zip' });
    const file2 = new File(['content-same'], 'same.epub', { type: 'application/epub+zip' });

    // First import
    await importBookFiles([file1], { storageMode: 'linked' });

    // Second import with identical file
    const result = await importBookFiles([file2], { storageMode: 'linked' });
    expect(result.imported).toBe(0);
    expect(result.duplicates).toBe(1);
  });

  it('imports picked native books with streaming concurrency', async () => {
    const picked = [
      { name: 'native1.epub', path: '/path/native1.epub', size: 1000 },
      { name: 'native2.pdf', path: '/path/native2.pdf', size: 2000 },
    ];

    const result = await importNativePickedBooks(picked, 'linked');
    expect(result.total).toBe(2);
    expect(result.imported).toBe(2);
    expect(result.duplicates).toBe(0);
  });
});
