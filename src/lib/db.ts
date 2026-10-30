import Dexie from 'dexie';

import { APP_CONFIG } from '@/config';

import type {
  Annotation,
  Book,
  BookCollection,
  BookFile,
  BookLocations,
  Bookmark,
  DictionaryCacheItem,
  LocalSyncFolder,
  OpdsFeed,
  ReadingLog,
} from '@/types';
import type { Table } from 'dexie';

export class Database extends Dexie {
  books!: Table<Book, string>;
  files!: Table<BookFile, string>;
  locations!: Table<BookLocations, string>;
  bookmarks!: Table<Bookmark, string>;
  annotations!: Table<Annotation, string>;
  dictionary_cache!: Table<DictionaryCacheItem, string>;
  opds_feeds!: Table<OpdsFeed, string>;
  reading_logs!: Table<ReadingLog, string>;
  sync_folders!: Table<LocalSyncFolder, string>;
  collections!: Table<BookCollection, string>;

  constructor(dbName: string = APP_CONFIG.databaseName) {
    super(dbName);
    this.version(1).stores({
      books: 'id, status, lastReadAt, addedAt',
      files: 'id',
      locations: 'bookId',
      bookmarks: 'id, bookId, createdAt',
      annotations: 'id, bookId, createdAt',
    });
    this.version(2).stores({
      dictionary_cache: 'word, lang, cachedAt',
    });
    this.version(3).stores({
      opds_feeds: 'id, title, url, createdAt',
    });
    this.version(4).stores({
      reading_logs: 'id, date, bookId, createdAt',
    });
    this.version(5).stores({
      sync_folders: 'id, name, connectedAt, lastSyncedAt',
    });
    this.version(6).stores({
      books: 'id, status, lastReadAt, addedAt, *tags',
      collections: 'id, name, createdAt',
    });
  }
}

export const DEFAULT_OPDS_FEEDS: OpdsFeed[] = [
  {
    id: 'gutenberg-popular',
    title: 'Project Gutenberg (Populer)',
    url: 'https://www.gutenberg.org/ebooks/search.opds/?sort_order=downloads',
    icon: '🔥',
    isCustom: false,
    createdAt: 1,
  },
  {
    id: 'gutenberg-main',
    title: 'Project Gutenberg (Katalog Lengkap)',
    url: 'https://www.gutenberg.org/ebooks.opds/',
    icon: '📚',
    isCustom: false,
    createdAt: 2,
  },
  {
    id: 'gutenberg-recent',
    title: 'Project Gutenberg (Terbaru)',
    url: 'https://www.gutenberg.org/ebooks/search.opds/?sort_order=release_date',
    icon: '✨',
    isCustom: false,
    createdAt: 3,
  },
  {
    id: 'standardebooks-recent',
    title: 'Standard Ebooks (Rilis Terbuka)',
    url: 'https://standardebooks.org/feeds/atom/new-releases',
    icon: '📖',
    isCustom: false,
    createdAt: 4,
  },
];

export const db = new Database();

/**
 * Atomically delete a book and all associated data in a transaction
 */
export async function deleteBook(id: string): Promise<void> {
  await db.transaction(
    'rw',
    [db.books, db.files, db.locations, db.bookmarks, db.annotations, db.reading_logs],
    async () => {
      await db.books.delete(id);
      await db.files.delete(id);
      await db.locations.where('bookId').equals(id).delete();
      await db.bookmarks.where('bookId').equals(id).delete();
      await db.annotations.where('bookId').equals(id).delete();
      await db.reading_logs.where('bookId').equals(id).delete();
    }
  );
}

/**
 * Format timestamp to local date string 'YYYY-MM-DD'
 */
export function getLocalDateString(timestamp: number = Date.now()): string {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Record reading duration (in seconds) for a book today,
 * also updating total readingTimeSeconds on the book.
 */
export async function recordReadingTime(bookId: string, seconds: number = 5): Promise<void> {
  if (seconds <= 0) return;
  const now = Date.now();
  const dateStr = getLocalDateString(now);
  const logId = `${dateStr}_${bookId}`;

  await db.transaction('rw', [db.books, db.reading_logs], async () => {
    // 1. Update total reading time on the book
    await db.books
      .where(':id')
      .equals(bookId)
      .modify((b) => {
        b.readingTimeSeconds = (b.readingTimeSeconds || 0) + seconds;
        b.lastReadAt = now;
        if (b.status === 'unread') {
          b.status = 'reading';
        }
      });

    // 2. Upsert reading_logs harian
    const existingLog = await db.reading_logs.get(logId);
    if (existingLog) {
      await db.reading_logs.update(logId, {
        durationSeconds: existingLog.durationSeconds + seconds,
        updatedAt: now,
      });
    } else {
      await db.reading_logs.add({
        id: logId,
        date: dateStr,
        bookId,
        durationSeconds: seconds,
        createdAt: now,
        updatedAt: now,
      });
    }
  });
}

/**
 * Check browser IndexedDB storage quota estimate
 */
export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
  percent: number;
  isPersistent: boolean;
}> {
  let usage = 0;
  let quota = 0;
  let isPersistent = false;

  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    usage = estimate.usage || 0;
    quota = estimate.quota || 0;
  }

  if (navigator.storage && navigator.storage.persisted) {
    isPersistent = await navigator.storage.persisted();
  }

  const percent = quota > 0 ? (usage / quota) * 100 : 0;
  return { usage, quota, percent, isPersistent };
}

/**
 * Request persistent storage to prevent browser eviction when disk is low
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persist) {
    return await navigator.storage.persist();
  }
  return false;
}

/**
 * Create a new collection or return existing one if name matches
 */
export async function createCollection(name: string, color?: string): Promise<BookCollection> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Nama koleksi tidak boleh kosong');
  const existing = await db.collections.where('name').equalsIgnoreCase(trimmed).first();
  if (existing) return existing;

  const newCol: BookCollection = {
    id: `col_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: trimmed,
    color,
    createdAt: Date.now(),
  };
  await db.collections.add(newCol);
  return newCol;
}

/**
 * Delete a collection and remove its tag from all books
 */
export async function deleteCollection(id: string): Promise<void> {
  const col = await db.collections.get(id);
  if (!col) return;

  await db.transaction('rw', [db.collections, db.books], async () => {
    await db.collections.delete(id);
    // Remove this tag from any books that have it
    const affectedBooks = await db.books
      .filter((b) => Boolean(b.tags?.includes(col.name)))
      .toArray();
    for (const b of affectedBooks) {
      const updatedTags = (b.tags || []).filter((t) => t !== col.name);
      await db.books.update(b.id, { tags: updatedTags });
    }
  });
}

/**
 * Add a tag to a book, ensuring the collection also exists in the collections table
 */
export async function addTagToBook(bookId: string, tagName: string): Promise<void> {
  const trimmed = tagName.trim();
  if (!trimmed) return;

  await db.transaction('rw', [db.books, db.collections], async () => {
    // 1. Ensure collection exists in collections table
    const existingCol = await db.collections.where('name').equalsIgnoreCase(trimmed).first();
    if (!existingCol) {
      await db.collections.add({
        id: `col_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: trimmed,
        createdAt: Date.now(),
      });
    }

    // 2. Add tag to book
    const book = await db.books.get(bookId);
    if (!book) return;
    const currentTags = book.tags || [];
    if (!currentTags.includes(trimmed)) {
      await db.books.update(bookId, { tags: [...currentTags, trimmed] });
    }
  });
}

/**
 * Remove a tag from a specific book
 */
export async function removeTagFromBook(bookId: string, tagName: string): Promise<void> {
  const book = await db.books.get(bookId);
  if (!book || !book.tags) return;
  const updatedTags = book.tags.filter((t) => t !== tagName);
  await db.books.update(bookId, { tags: updatedTags });
}
