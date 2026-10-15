import { generateBackupJsonString } from '@/lib/backup';
import { db } from '@/lib/db';
import { importBookFiles } from '@/lib/importBooks';
import { useSyncStore } from '@/store/sync';

import type { LocalSyncFolder } from '@/types';

export const PRIMARY_SYNC_FOLDER_ID = 'primary_library';
export const BACKUP_FILENAME = 'myshelf-backup.json';

declare global {
  interface Window {
    showDirectoryPicker?: (options?: {
      id?: string;
      mode?: 'read' | 'readwrite';
      startIn?: 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
    }) => Promise<FileSystemDirectoryHandle>;
  }
}

/**
 * Checks if browser/platform supports the File System Access API (showDirectoryPicker).
 * Note: showDirectoryPicker is only supported on Chromium Desktop (Chrome/Edge/Brave on Windows/macOS/Linux).
 * On Android, iOS, or mobile WebViews, this API is not supported by the platform.
 */
export function isFileSystemAccessSupported(): boolean {
  if (typeof window === 'undefined') return false;

  // Deteksi lingkungan mobile (Android, iOS/iPadOS, Windows Mobile)
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    ('maxTouchPoints' in navigator &&
      navigator.maxTouchPoints > 2 &&
      /Macintosh/i.test(navigator.userAgent));
  if (isMobile) return false;

  return typeof window.showDirectoryPicker === 'function';
}

const IGNORED_DIR_NAMES = new Set([
  '.git',
  '.svn',
  '.hg',
  '.stfolder',
  '.stversions',
  '.dropbox.cache',
  '.obsidian',
  '.vscode',
  '.idea',
  '.trash',
  '$recycle.bin',
  'node_modules',
  'dist',
  'build',
  'cache',
  '__pycache__',
]);

interface PermissionDescriptor {
  mode?: 'read' | 'readwrite';
}

interface QueryableHandle {
  queryPermission?(descriptor?: PermissionDescriptor): Promise<PermissionState>;
  requestPermission?(descriptor?: PermissionDescriptor): Promise<PermissionState>;
}

// Active sync flag to prevent race conditions / concurrent sync runs
let isSyncInProgress = false;

export function isFolderSyncRunning(): boolean {
  return isSyncInProgress;
}

/**
 * Verifies or requests folder access permissions
 */
export async function verifyFolderPermission(
  handle: FileSystemDirectoryHandle,
  readWrite = false,
  promptUser = true
): Promise<boolean> {
  const options: PermissionDescriptor = {
    mode: readWrite ? 'readwrite' : 'read',
  };
  const queryable = handle as unknown as QueryableHandle;
  try {
    if (typeof queryable.queryPermission === 'function') {
      const state = await queryable.queryPermission(options);
      if (state === 'granted') {
        return true;
      }
      // If auto-sync without user gesture, do not call requestPermission (will error in browser)
      if (!promptUser) {
        return false;
      }
    }
    if (promptUser && typeof queryable.requestPermission === 'function') {
      const status = await queryable.requestPermission(options);
      return status === 'granted';
    }
    return true;
  } catch (err) {
    console.warn('Gagal meminta izin akses folder:', err);
    return false;
  }
}

/**
 * Recursively scans .epub and .pdf files from FileSystemDirectoryHandle
 */
export async function scanFilesRecursive(
  dirHandle: FileSystemDirectoryHandle,
  depth = 0,
  maxDepth = 6,
  signal?: AbortSignal,
  onFileFound?: (count: number, currentName?: string) => void
): Promise<File[]> {
  if (signal?.aborted || depth > maxDepth) return [];

  const files: File[] = [];

  try {
    // values() is an async iterable on FileSystemDirectoryHandle
    for await (const entry of (
      dirHandle as unknown as { values(): AsyncIterable<FileSystemHandle> }
    ).values()) {
      if (signal?.aborted) break;

      if (entry.kind === 'file') {
        const name = entry.name.toLowerCase();
        // Ignore hidden files, macOS AppleDouble (._*), lock files, and temp files
        if (entry.name.startsWith('.') || entry.name.startsWith('~') || name.includes('.tmp.')) {
          continue;
        }
        if (name.endsWith('.epub') || name.endsWith('.pdf')) {
          try {
            const fileHandle = entry as FileSystemFileHandle;
            const file = await fileHandle.getFile();
            files.push(file);
            if (onFileFound) {
              onFileFound(files.length, entry.name);
            }
          } catch (e) {
            console.warn('Gagal membaca file dari direktori:', entry.name, e);
          }
        }
      } else if (entry.kind === 'directory') {
        const dirName = entry.name.toLowerCase();
        if (dirName.startsWith('.') || IGNORED_DIR_NAMES.has(dirName)) {
          continue;
        }
        try {
          const subFiles = await scanFilesRecursive(
            entry as FileSystemDirectoryHandle,
            depth + 1,
            maxDepth,
            signal,
            onFileFound
          );
          files.push(...subFiles);
        } catch (e) {
          console.warn('Gagal memindai subdirektori:', entry.name, e);
        }
      }

      // Yield to event loop so directory scanning does not freeze UI
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  } catch (err) {
    console.warn('Gagal membaca direktori handle:', err);
  }

  return files;
}

/**
 * Writes JSON backup directly into local folder (myshelf-backup.json)
 */
export async function writeBackupToFolder(dirHandle: FileSystemDirectoryHandle): Promise<boolean> {
  try {
    const hasWritePerm = await verifyFolderPermission(dirHandle, true);
    if (!hasWritePerm) {
      console.warn('Izin tulis folder tidak diizinkan oleh pengguna.');
      return false;
    }

    const jsonString = await generateBackupJsonString();
    const fileHandle = await dirHandle.getFileHandle(BACKUP_FILENAME, { create: true });
    // createWritable is available on FileSystemFileHandle in modern browsers
    const writable = await (
      fileHandle as unknown as {
        createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }>;
      }
    ).createWritable();
    await writable.write(jsonString);
    await writable.close();
    return true;
  } catch (err) {
    console.error('Gagal menulis cadangan ke folder lokal:', err);
    return false;
  }
}

/**
 * Gets currently connected folder configuration
 */
export async function getLocalFolder(): Promise<LocalSyncFolder | undefined> {
  if (!isFileSystemAccessSupported()) return undefined;
  return await db.sync_folders.get(PRIMARY_SYNC_FOLDER_ID);
}

/**
 * Opens OS folder picker dialog and stores handle into IndexedDB
 */
export async function connectLocalFolder(options?: {
  autoSyncOnLaunch?: boolean;
  autoBackupEnabled?: boolean;
}): Promise<LocalSyncFolder> {
  if (!isFileSystemAccessSupported() || !window.showDirectoryPicker) {
    throw new Error('File System Access API tidak didukung pada peramban ini');
  }

  const handle = await window.showDirectoryPicker({
    id: 'myshelf-library',
    mode: options?.autoBackupEnabled ? 'readwrite' : 'read',
    startIn: 'documents',
  });

  const existing = await db.sync_folders.get(PRIMARY_SYNC_FOLDER_ID);

  const folder: LocalSyncFolder = {
    id: PRIMARY_SYNC_FOLDER_ID,
    name: handle.name,
    handle,
    connectedAt: Date.now(),
    lastSyncedAt: null,
    bookCount: existing?.bookCount || 0,
    autoSyncOnLaunch: options?.autoSyncOnLaunch ?? existing?.autoSyncOnLaunch ?? true,
    autoBackupEnabled: options?.autoBackupEnabled ?? existing?.autoBackupEnabled ?? false,
  };

  await db.sync_folders.put(folder);
  return folder;
}

/**
 * Disconnects local folder from application
 */
export async function disconnectLocalFolder(): Promise<void> {
  await db.sync_folders.delete(PRIMARY_SYNC_FOLDER_ID);
}

/**
 * Memperbarui preferensi folder lokal
 */
export async function updateFolderOptions(
  options: Partial<Pick<LocalSyncFolder, 'autoSyncOnLaunch' | 'autoBackupEnabled'>>
): Promise<void> {
  const folder = await getLocalFolder();
  if (!folder) return;
  await db.sync_folders.update(PRIMARY_SYNC_FOLDER_ID, options);
}

export interface SyncResult {
  success: boolean;
  totalFound: number;
  imported: number;
  duplicates: number;
  failed: number;
  backupWritten?: boolean;
  error?: string;
}

/**
 * Performs full synchronization with local folder:
 * 1. Verifikasi izin
 * 2. Scan files (.epub and .pdf)
 * 3. Import new books into library
 * 4. Write backup if option enabled
 * 5. Update lastSyncedAt and bookCount
 */
export async function syncLocalFolder(
  onProgress?: (current: number, total: number, fileName?: string) => void,
  signal?: AbortSignal,
  isAutoSync = false
): Promise<SyncResult> {
  // Prevent parallel execution if sync is already running
  if (isSyncInProgress) {
    console.warn('Sinkronisasi folder lokal sedang berjalan, permintaan baru diabaikan.');
    return {
      success: false,
      totalFound: 0,
      imported: 0,
      duplicates: 0,
      failed: 0,
      error: 'Sinkronisasi sedang berlangsung di latar belakang',
    };
  }

  isSyncInProgress = true;
  const syncStore = useSyncStore.getState();
  const internalSignal = syncStore.startSync();

  // Merge caller signal with internal signal (abort if either triggers)
  const isAborted = () => signal?.aborted || internalSignal.aborted;

  try {
    const folder = await getLocalFolder();
    if (!folder) {
      return {
        success: false,
        totalFound: 0,
        imported: 0,
        duplicates: 0,
        failed: 0,
        error: 'Belum ada folder yang terhubung',
      };
    }

    // Verify access permissions (do not force prompt on launch auto-sync)
    const hasPerm = await verifyFolderPermission(
      folder.handle,
      !!folder.autoBackupEnabled,
      !isAutoSync
    );
    if (!hasPerm) {
      return {
        success: false,
        totalFound: 0,
        imported: 0,
        duplicates: 0,
        failed: 0,
        error: isAutoSync
          ? 'Memerlukan izin buka folder'
          : 'Izin akses ke folder tidak diberikan oleh browser',
      };
    }

    // Scan book files (.epub & .pdf) with live UI feedback
    syncStore.updateProgress({ phase: 'scanning', foundCount: 0 });
    const files = await scanFilesRecursive(
      folder.handle,
      0,
      6,
      signal || internalSignal,
      (count, name) => {
        syncStore.updateProgress({ phase: 'scanning', foundCount: count, fileName: name });
      }
    );

    if (isAborted()) {
      return {
        success: false,
        totalFound: files.length,
        imported: 0,
        duplicates: 0,
        failed: 0,
        error: 'Sinkronisasi dibatalkan oleh pengguna',
      };
    }

    let imported = 0;
    let duplicates = 0;
    let failed = 0;

    if (files.length > 0) {
      syncStore.updateProgress({
        phase: 'importing',
        current: 0,
        total: files.length,
      });

      const res = await importBookFiles(
        files,
        (current, total, fileName) => {
          syncStore.updateProgress({
            phase: 'importing',
            current,
            total,
            fileName,
          });
          if (onProgress) {
            onProgress(current, total, fileName);
          }
        },
        signal || internalSignal
      );
      imported = res.imported;
      duplicates = res.duplicates;
      failed = res.failed;
    }

    if (isAborted()) {
      return {
        success: false,
        totalFound: files.length,
        imported,
        duplicates,
        failed,
        error: 'Sinkronisasi dibatalkan oleh pengguna',
      };
    }

    // Write backup file if enabled
    let backupWritten = false;
    if (folder.autoBackupEnabled) {
      backupWritten = await writeBackupToFolder(folder.handle);
    }

    // Save sync status
    await db.sync_folders.update(PRIMARY_SYNC_FOLDER_ID, {
      lastSyncedAt: Date.now(),
      bookCount: files.length,
    });

    return {
      success: true,
      totalFound: files.length,
      imported,
      duplicates,
      failed,
      backupWritten,
    };
  } finally {
    isSyncInProgress = false;
    syncStore.stopSync();
  }
}
