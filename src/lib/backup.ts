import { db } from '@/lib/db';

import type { Annotation, BackupData, Book } from '@/types';

/**
 * Downloads a string as a file in the browser
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Menghasilkan string JSON cadangan aplikasi
 */
export async function generateBackupJsonString(): Promise<string> {
  const books = await db.books.toArray();
  const bookmarks = await db.bookmarks.toArray();
  const annotations = await db.annotations.toArray();

  // Strip cover (Blob) from books list to create lightweight JSON
  const cleanBooks = books.map((book) => {
    const copy = { ...book } as Partial<Book>;
    delete copy.cover;
    return copy as Omit<Book, 'cover'>;
  });

  const backupData: BackupData = {
    version: 1,
    exportedAt: Date.now(),
    books: cleanBooks,
    bookmarks,
    annotations,
  };

  return JSON.stringify(backupData, null, 2);
}

/**
 * Exports JSON backup (book metadata, bookmarks, highlights & notes)
 */
export async function exportBackupJson(): Promise<void> {
  const jsonString = await generateBackupJsonString();
  const dateStr = new Date().toISOString().split('T')[0];
  downloadFile(jsonString, `myshelf-backup-${dateStr}.json`, 'application/json');
}

/**
 * Imports JSON backup into IndexedDB
 */
export async function importBackupJson(file: File): Promise<{
  restoredBookmarks: number;
  restoredAnnotations: number;
  matchedBooks: number;
}> {
  const text = await file.text();
  const data = JSON.parse(text) as BackupData;

  if (!data || !Array.isArray(data.books)) {
    throw new Error('Format berkas cadangan tidak valid');
  }

  let restoredBookmarks = 0;
  let restoredAnnotations = 0;
  let matchedBooks = 0;

  await db.transaction('rw', [db.books, db.bookmarks, db.annotations], async () => {
    // Update book progress if corresponding book exists in database
    for (const b of data.books) {
      const existing = await db.books.get(b.id);
      if (existing) {
        matchedBooks++;
        await db.books.update(b.id, {
          progress: b.progress ?? existing.progress,
          lastCfi: b.lastCfi ?? existing.lastCfi,
          readingTimeSeconds: Math.max(b.readingTimeSeconds || 0, existing.readingTimeSeconds || 0),
          status: b.status ?? existing.status,
          lastReadAt: b.lastReadAt
            ? Math.max(b.lastReadAt, existing.lastReadAt || 0)
            : existing.lastReadAt,
        });
      }
    }

    // Masukkan penanda
    if (Array.isArray(data.bookmarks)) {
      for (const bm of data.bookmarks) {
        if (bm.id && bm.bookId && bm.cfi) {
          await db.bookmarks.put(bm);
          restoredBookmarks++;
        }
      }
    }

    // Masukkan anotasi
    if (Array.isArray(data.annotations)) {
      for (const ann of data.annotations) {
        if (ann.id && ann.bookId && ann.cfiRange) {
          await db.annotations.put(ann);
          restoredAnnotations++;
        }
      }
    }
  });

  return { restoredBookmarks, restoredAnnotations, matchedBooks };
}

/**
 * Exports highlights & notes of a book to Markdown format
 */
export function exportAnnotationsMarkdown(book: Book, annotations: Annotation[]): void {
  const dateStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  let md = `# Catatan & Kutipan: ${book.title}\n`;
  md += `**Penulis:** ${book.author}  \n`;
  md += `**Tanggal Ekspor:** ${dateStr}  \n`;
  md += `**Total Kutipan:** ${annotations.length}\n\n---\n\n`;

  // Sort by creation timestamp
  const sorted = [...annotations].sort((a, b) => a.createdAt - b.createdAt);

  // Kelompokkan per bab
  const byChapter: Record<string, Annotation[]> = {};
  for (const item of sorted) {
    const ch = item.chapter || 'Bab Tanpa Judul';
    if (!byChapter[ch]) byChapter[ch] = [];
    byChapter[ch].push(item);
  }

  for (const [chapter, items] of Object.entries(byChapter)) {
    md += `## ${chapter}\n\n`;
    for (const ann of items) {
      md += `> "${ann.text.trim()}"\n\n`;
      if (ann.note && ann.note.trim()) {
        md += `**Catatan:** ${ann.note.trim()}\n\n`;
      }
      const itemDate = new Date(ann.createdAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      md += `*Warna: ${ann.color} · ${itemDate}*\n\n---\n\n`;
    }
  }

  const safeTitle = book.title.replace(/[\\/:*?"<>|]/g, '').slice(0, 40);
  downloadFile(md, `${safeTitle} - Catatan.md`, 'text/markdown;charset=utf-8');
}
