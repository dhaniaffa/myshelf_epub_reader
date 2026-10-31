import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  checkNativeBookExists,
  pickAndScanNativeFolder,
  pickNativeBookFiles,
  readNativeBookBinary,
} from './nativeFiles';
import * as platform from './platform';

import type { Book } from '@/types';

// Mock @tauri-apps/api/core
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

describe('Native Files Abstraction (src/lib/nativeFiles.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as unknown as { AndroidBackupBridge?: unknown }).AndroidBackupBridge;
    delete (window as unknown as { __onAndroidPickBooksResult?: unknown })
      .__onAndroidPickBooksResult;
  });

  describe('pickNativeBookFiles', () => {
    it('returns null on web browser', async () => {
      vi.spyOn(platform, 'isDesktopTauri').mockReturnValue(false);
      vi.spyOn(platform, 'isAndroidNative').mockReturnValue(false);

      const result = await pickNativeBookFiles();
      expect(result).toBeNull();
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('invokes pick_books_dialog and maps results on Desktop Tauri', async () => {
      vi.spyOn(platform, 'isDesktopTauri').mockReturnValue(true);
      vi.spyOn(platform, 'isAndroidNative').mockReturnValue(false);
      mockInvoke.mockResolvedValue(['/home/user/Books/novel.epub', '/home/user/Books/paper.pdf']);

      const result = await pickNativeBookFiles();
      expect(mockInvoke).toHaveBeenCalledWith('pick_books_dialog');
      expect(result).toEqual([
        { path: '/home/user/Books/novel.epub', name: 'novel.epub' },
        { path: '/home/user/Books/paper.pdf', name: 'paper.pdf' },
      ]);
    });

    it('returns null if user cancels dialog on Desktop Tauri', async () => {
      vi.spyOn(platform, 'isDesktopTauri').mockReturnValue(true);
      mockInvoke.mockResolvedValue(null);

      const result = await pickNativeBookFiles();
      expect(result).toBeNull();
    });

    it('bridges through AndroidBackupBridge.pickBooks on Android Native', async () => {
      vi.spyOn(platform, 'isDesktopTauri').mockReturnValue(false);
      vi.spyOn(platform, 'isAndroidNative').mockReturnValue(true);

      const pickBooksMock = vi.fn(() => {
        setTimeout(() => {
          if (window.__onAndroidPickBooksResult) {
            window.__onAndroidPickBooksResult([
              { uri: 'content://books/1', name: 'buku_android.epub', size: 1024 },
            ]);
          }
        }, 10);
      });

      window.AndroidBackupBridge = {
        pickBooks: pickBooksMock,
      };

      const result = await pickNativeBookFiles();
      expect(pickBooksMock).toHaveBeenCalled();
      expect(result).toEqual([{ uri: 'content://books/1', name: 'buku_android.epub', size: 1024 }]);
    });
  });

  describe('pickAndScanNativeFolder', () => {
    it('returns null on web browser', async () => {
      vi.spyOn(platform, 'isDesktopTauri').mockReturnValue(false);
      vi.spyOn(platform, 'isAndroidNative').mockReturnValue(false);

      const result = await pickAndScanNativeFolder();
      expect(result).toBeNull();
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('invokes pick_folder_dialog and scan_directory_books on Desktop Tauri', async () => {
      vi.spyOn(platform, 'isDesktopTauri').mockReturnValue(true);
      vi.spyOn(platform, 'isAndroidNative').mockReturnValue(false);
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'pick_folder_dialog') return Promise.resolve('/home/user/Ebooks');
        if (cmd === 'scan_directory_books')
          return Promise.resolve([
            '/home/user/Ebooks/Philosophy/seneca.epub',
            '/home/user/Ebooks/Tech/rust.pdf',
          ]);
        return Promise.resolve(null);
      });

      const result = await pickAndScanNativeFolder();
      expect(mockInvoke).toHaveBeenCalledWith('pick_folder_dialog');
      expect(mockInvoke).toHaveBeenCalledWith('scan_directory_books', {
        folderPath: '/home/user/Ebooks',
      });
      expect(result).toEqual([
        { path: '/home/user/Ebooks/Philosophy/seneca.epub', name: 'seneca.epub' },
        { path: '/home/user/Ebooks/Tech/rust.pdf', name: 'rust.pdf' },
      ]);
    });

    it('returns null if user cancels folder dialog on Desktop Tauri', async () => {
      vi.spyOn(platform, 'isDesktopTauri').mockReturnValue(true);
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'pick_folder_dialog') return Promise.resolve(null);
        return Promise.resolve(null);
      });

      const result = await pickAndScanNativeFolder();
      expect(result).toBeNull();
      expect(mockInvoke).not.toHaveBeenCalledWith('scan_directory_books', expect.anything());
    });

    it('bridges through AndroidBackupBridge.pickFolder on Android Native', async () => {
      vi.spyOn(platform, 'isDesktopTauri').mockReturnValue(false);
      vi.spyOn(platform, 'isAndroidNative').mockReturnValue(true);

      const pickFolderMock = vi.fn(() => {
        setTimeout(() => {
          if (window.__onAndroidPickFolderResult) {
            window.__onAndroidPickFolderResult([
              { uri: 'content://tree/doc/1', name: 'stoic.epub', size: 2048 },
              { uri: 'content://tree/doc/2', name: 'manual.pdf', size: 4096 },
            ]);
          }
        }, 10);
      });

      window.AndroidBackupBridge = {
        pickFolder: pickFolderMock,
      };

      const result = await pickAndScanNativeFolder();
      expect(pickFolderMock).toHaveBeenCalled();
      expect(result).toEqual([
        { uri: 'content://tree/doc/1', name: 'stoic.epub', size: 2048 },
        { uri: 'content://tree/doc/2', name: 'manual.pdf', size: 4096 },
      ]);
    });
  });

  describe('readNativeBookBinary', () => {
    const dummyBook: Book = {
      id: 'test-book-id',
      title: 'Judul Uji',
      author: 'Penulis',
      cover: null,
      progress: 0,
      lastCfi: null,
      readingTimeSeconds: 0,
      status: 'unread',
      addedAt: Date.now(),
      lastReadAt: null,
      totalLocations: null,
      storageMode: 'linked',
      filePath: '/home/user/buku.epub',
      sourceUri: 'content://media/external/file/10',
    };

    it('reads binary array via Rust invoke on Desktop Tauri', async () => {
      vi.spyOn(platform, 'isDesktopTauri').mockReturnValue(true);
      vi.spyOn(platform, 'isAndroidNative').mockReturnValue(false);

      const fakeBytes = [69, 80, 85, 66]; // 'EPUB'
      mockInvoke.mockResolvedValue(fakeBytes);

      const buffer = await readNativeBookBinary(dummyBook);
      expect(mockInvoke).toHaveBeenCalledWith('read_book_file', {
        filePath: '/home/user/buku.epub',
      });
      expect(new Uint8Array(buffer)).toEqual(new Uint8Array(fakeBytes));
    });

    it('throws FILE_NOT_FOUND when filePath is missing on Desktop Tauri', async () => {
      vi.spyOn(platform, 'isDesktopTauri').mockReturnValue(true);

      await expect(
        readNativeBookBinary({ ...dummyBook, filePath: null, sourceUri: null })
      ).rejects.toThrow('FILE_NOT_FOUND');
    });

    it('reads and decodes base64 stream on Android Native', async () => {
      vi.spyOn(platform, 'isDesktopTauri').mockReturnValue(false);
      vi.spyOn(platform, 'isAndroidNative').mockReturnValue(true);

      const base64Sample = window.btoa('HALO_MY_SHELF');
      window.AndroidBackupBridge = {
        readBookBinaryBase64: vi.fn().mockReturnValue(base64Sample),
      };

      const buffer = await readNativeBookBinary(dummyBook);
      const text = new TextDecoder().decode(buffer);
      expect(text).toBe('HALO_MY_SHELF');
    });
  });

  describe('checkNativeBookExists', () => {
    const dummyBook: Book = {
      id: 'test-id',
      title: 'Judul',
      author: 'A',
      cover: null,
      progress: 0,
      lastCfi: null,
      readingTimeSeconds: 0,
      status: 'unread',
      addedAt: Date.now(),
      lastReadAt: null,
      totalLocations: null,
      storageMode: 'linked',
      filePath: '/var/data/novel.epub',
      sourceUri: 'content://docs/5',
    };

    it('checks file existence via Rust invoke on Desktop', async () => {
      vi.spyOn(platform, 'isDesktopTauri').mockReturnValue(true);
      mockInvoke.mockResolvedValue(true);

      const exists = await checkNativeBookExists(dummyBook);
      expect(mockInvoke).toHaveBeenCalledWith('check_file_exists', {
        filePath: '/var/data/novel.epub',
      });
      expect(exists).toBe(true);
    });

    it('checks URI validity on Android via bridge', async () => {
      vi.spyOn(platform, 'isDesktopTauri').mockReturnValue(false);
      vi.spyOn(platform, 'isAndroidNative').mockReturnValue(true);

      window.AndroidBackupBridge = {
        checkUriValid: vi.fn().mockReturnValue(true),
      };

      const exists = await checkNativeBookExists(dummyBook);
      expect(window.AndroidBackupBridge.checkUriValid).toHaveBeenCalledWith('content://docs/5');
      expect(exists).toBe(true);
    });
  });
});
