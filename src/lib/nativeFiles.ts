import { invoke } from '@tauri-apps/api/core';

import { isAndroidNative, isDesktopTauri } from '@/lib/platform';

import type { Book } from '@/types';

export interface NativePickedBook {
  path?: string; // Desktop canonical path
  uri?: string; // Android content:// URI
  name: string;
  size?: number;
}

/**
 * Base64 helper decoding to Uint8Array/ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}

/**
 * Native file picker for Desktop & Android.
 * Returns null if on web browser (where standard <input type="file"> is used).
 */
export async function pickNativeBookFiles(): Promise<NativePickedBook[] | null> {
  if (isDesktopTauri()) {
    try {
      const paths = await invoke<string[] | null>('pick_books_dialog');
      if (!paths || paths.length === 0) return null;

      return paths.map((filePath) => {
        const name = filePath.split(/[/\\]/).pop() || 'Unknown.epub';
        return {
          path: filePath,
          name,
        };
      });
    } catch (err) {
      console.warn('Gagal memanggil native picker Desktop:', err);
      return null;
    }
  }

  if (isAndroidNative()) {
    if (!window.AndroidBackupBridge?.pickBooks) {
      return null;
    }

    return new Promise((resolve) => {
      let resolved = false;

      const cleanup = () => {
        window.__onAndroidPickBooksResult = null;
      };

      // Timeout fallback in case user dismisses without selection event
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(null);
        }
      }, 60000);

      window.__onAndroidPickBooksResult = (results) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          cleanup();
          if (!results || results.length === 0) {
            resolve(null);
          } else {
            resolve(results);
          }
        }
      };

      window.AndroidBackupBridge?.pickBooks?.();
    });
  }

  return null;
}

/**
 * Native folder picker and recursive scanner for Desktop & Android.
 * User selects a single folder, and all .epub and .pdf files (including subdirectories)
 * are automatically discovered and returned.
 */
export async function pickAndScanNativeFolder(): Promise<NativePickedBook[] | null> {
  if (isDesktopTauri()) {
    try {
      const folderPath = await invoke<string | null>('pick_folder_dialog');
      if (!folderPath) return null;

      const filePaths = await invoke<string[]>('scan_directory_books', { folderPath });
      if (!filePaths || filePaths.length === 0) return [];

      return filePaths.map((filePath) => {
        const name = filePath.split(/[/\\]/).pop() || 'Unknown.epub';
        return {
          path: filePath,
          name,
        };
      });
    } catch (err) {
      console.warn('Gagal memindai folder Desktop:', err);
      return null;
    }
  }

  if (isAndroidNative()) {
    if (!window.AndroidBackupBridge?.pickFolder) {
      return null;
    }

    return new Promise((resolve) => {
      let resolved = false;

      const cleanup = () => {
        window.__onAndroidPickFolderResult = null;
      };

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(null);
        }
      }, 120000);

      window.__onAndroidPickFolderResult = (results, folderUri, folderName) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          cleanup();
          const list = results || [];
          if (folderUri) (list as unknown as Record<string, unknown>).folderUri = folderUri;
          if (folderName) (list as unknown as Record<string, unknown>).folderName = folderName;
          resolve(list);
        }
      };

      window.AndroidBackupBridge?.pickFolder?.();
    });
  }

  return null;
}

/**
 * Silently scans a previously connected Android folder using its granted Tree URI.
 * Does NOT open any native picker UI or interrupt the user.
 */
export async function scanNativeFolderByUri(uriString: string): Promise<NativePickedBook[] | null> {
  if (!isAndroidNative() || !window.AndroidBackupBridge?.scanFolderByUri) {
    return null;
  }

  return new Promise((resolve) => {
    let resolved = false;

    const cleanup = () => {
      window.__onAndroidScanFolderResult = null;
    };

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(null);
      }
    }, 60000);

    window.__onAndroidScanFolderResult = (results) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        cleanup();
        resolve(results || []);
      }
    };

    try {
      window.AndroidBackupBridge?.scanFolderByUri?.(uriString);
    } catch (err) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        cleanup();
        console.warn('Gagal memindai folder Android berdasarkan URI:', err);
        resolve(null);
      }
    }
  });
}

/**
 * Reads binary content directly from native filesystem / SAF URI.
 */
export async function readNativeBookBinary(book: Book): Promise<ArrayBuffer> {
  if (isDesktopTauri()) {
    if (!book.filePath) {
      throw new Error('FILE_NOT_FOUND: Berkas tidak memiliki path sistem lokal');
    }

    try {
      const bytes = await invoke<number[]>('read_book_file', { filePath: book.filePath });
      return Uint8Array.from(bytes).buffer as ArrayBuffer;
    } catch (err) {
      throw new Error(`FILE_NOT_FOUND: ${err instanceof Error ? err.message : String(err)}`, {
        cause: err,
      });
    }
  }

  if (isAndroidNative()) {
    if (!book.sourceUri) {
      throw new Error('FILE_NOT_FOUND: Berkas tidak memiliki Android Content URI');
    }

    const bridge = window.AndroidBackupBridge;
    if (!bridge?.readBookBinaryBase64) {
      throw new Error('NATIVE_BRIDGE_UNAVAILABLE: Android bridge belum terhubung');
    }

    const base64Data = bridge.readBookBinaryBase64(book.sourceUri);
    if (!base64Data) {
      throw new Error('FILE_NOT_FOUND: Gagal membaca aliran berkas dari Android Storage Provider');
    }

    return base64ToArrayBuffer(base64Data);
  }

  throw new Error('UNSUPPORTED_PLATFORM: Platform tidak mendukung pembacaan berkas tertaut');
}

/**
 * Checks whether the physical file or SAF permission is still valid and reachable.
 */
export async function checkNativeBookExists(book: Book): Promise<boolean> {
  if (isDesktopTauri()) {
    if (!book.filePath) return false;
    try {
      return await invoke<boolean>('check_file_exists', { filePath: book.filePath });
    } catch {
      return false;
    }
  }

  if (isAndroidNative()) {
    if (!book.sourceUri) return false;
    try {
      return window.AndroidBackupBridge?.checkUriValid?.(book.sourceUri) ?? false;
    } catch {
      return false;
    }
  }

  return true;
}
