import { invoke, isTauri } from '@tauri-apps/api/core';

import { db } from '@/lib/db';

import type { Annotation, BackupData, Book } from '@/types';

export type SaveFileResult = 'saved' | 'shared' | 'downloaded' | 'cancelled';

/**
 * Downloads a string as a file using traditional anchor click
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
 * Saves file via Android native bridge using Storage Access Framework (ACTION_CREATE_DOCUMENT)
 * Allows user to pick destination folder and confirm filename natively on Android.
 */
function saveViaAndroidBridge(
  filename: string,
  content: string,
  mimeType: string
): Promise<SaveFileResult> {
  return new Promise((resolve) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__onAndroidSaveResult = (success: boolean) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__onAndroidSaveResult;
      resolve(success ? 'saved' : 'cancelled');
    };
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bridge = (window as any).AndroidBackupBridge;
      if (typeof bridge.saveFileWithPicker === 'function') {
        bridge.saveFileWithPicker(filename, content, mimeType);
      } else if (typeof bridge.saveFile === 'function') {
        bridge.saveFile(filename, content, mimeType);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as any).__onAndroidSaveResult;
        resolve('cancelled');
      }
    } catch (err) {
      console.warn('AndroidBackupBridge failed:', err);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__onAndroidSaveResult;
      resolve('cancelled');
    }
  });
}

export async function saveFileWithPicker({
  content,
  filename,
  mimeType,
  description = 'Berkas',
  extension = 'json',
}: {
  content: string;
  filename: string;
  mimeType: string;
  description?: string;
  extension?: string;
}): Promise<SaveFileResult> {
  const isMobile =
    typeof navigator !== 'undefined' &&
    (/android|iphone|ipad|ipod/i.test(navigator.userAgent) ||
      ('maxTouchPoints' in navigator &&
        navigator.maxTouchPoints > 2 &&
        /Macintosh/i.test(navigator.userAgent)));

  // Tier 1: Android Native App Bridge (Tauri Android / Storage Access Framework)
  // Lets the user browse and select any folder (Internal Storage, SD Card, etc.)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hasAndroidBridge = typeof window !== 'undefined' && !!(window as any).AndroidBackupBridge;
  if (hasAndroidBridge) {
    return await saveViaAndroidBridge(filename, content, mimeType);
  }

  // Tier 2: Desktop Native Tauri Dialog (Linux Zenity, Windows SaveFileDialog, macOS AppleScript)
  if (isTauri() && !isMobile) {
    try {
      const savedPath = await invoke<string | null>('save_file_dialog', {
        defaultFilename: filename,
        content,
      });
      if (savedPath) {
        return 'saved';
      }
      return 'cancelled';
    } catch (err) {
      console.warn('Native Tauri save dialog failed or cancelled:', err);
    }
  }

  // Tier 3: File System Access API on Desktop Web (Chrome, Edge, Opera, Brave)
  if (!isMobile && typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const picker = (window as any).showSaveFilePicker;
      const handle = await picker({
        suggestedName: filename,
        types: [
          {
            description,
            accept: { [mimeType]: [`.${extension}`] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return 'saved';
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return 'cancelled';
      }
      console.warn('showSaveFilePicker failed:', err);
    }
  }

  // Tier 4: Fallback to standard browser download (Mobile Web / browsers without file picker)
  downloadFile(content, filename, mimeType);
  return 'downloaded';
}

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
 * Allows user to pick destination directory/folder on Desktop and Android
 */
export async function exportBackupJson(): Promise<SaveFileResult> {
  const jsonString = await generateBackupJsonString();
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `myshelf-backup-${dateStr}.json`;

  return saveFileWithPicker({
    content: jsonString,
    filename,
    mimeType: 'application/json',
    description: 'Berkas Cadangan MyShelf (*.json)',
    extension: 'json',
  });
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
 * Pure generator: converts book annotations into a structured Markdown document.
 */
export function generateAnnotationsMarkdown(
  book: Book,
  annotations: Annotation[],
  now: Date = new Date()
): string {
  const dateStr = now.toLocaleDateString('id-ID', {
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

  return md;
}

/**
 * Exports highlights & notes of a book to Markdown format
 * Allows user to pick destination directory/folder on Desktop and Android
 */
export async function exportAnnotationsMarkdown(
  book: Book,
  annotations: Annotation[]
): Promise<SaveFileResult> {
  const md = generateAnnotationsMarkdown(book, annotations);
  const safeTitle = book.title.replace(/[\\/:*?"<>|]/g, '').slice(0, 40);
  const filename = `${safeTitle} - Catatan.md`;

  return saveFileWithPicker({
    content: md,
    filename,
    mimeType: 'text/markdown;charset=utf-8',
    description: 'Catatan Markdown (*.md)',
    extension: 'md',
  });
}
