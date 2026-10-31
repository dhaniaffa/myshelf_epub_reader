import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  connectLocalFolder,
  disconnectLocalFolder,
  getLocalFolder,
  isFolderSyncSupported,
  PRIMARY_SYNC_FOLDER_ID,
  updateFolderOptions,
} from './fileSystemSync';
import * as platform from './platform';

import type { LocalSyncFolder } from '@/types';

const syncFoldersMap = new Map<string, LocalSyncFolder>();

vi.mock('./db', () => ({
  db: {
    sync_folders: {
      get: vi.fn().mockImplementation(async (id: string) => syncFoldersMap.get(id)),
      put: vi.fn().mockImplementation(async (folder: LocalSyncFolder) => {
        syncFoldersMap.set(folder.id, folder);
        return folder.id;
      }),
      update: vi.fn().mockImplementation(async (id: string, updates: Partial<LocalSyncFolder>) => {
        const existing = syncFoldersMap.get(id);
        if (existing) {
          syncFoldersMap.set(id, { ...existing, ...updates });
        }
        return 1;
      }),
      delete: vi.fn().mockImplementation(async (id: string) => {
        syncFoldersMap.delete(id);
        return 1;
      }),
    },
  },
}));

const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

vi.mock('./platform', () => ({
  isDesktopTauri: vi.fn(),
  isAndroidNative: vi.fn(),
}));

describe('Local Folder Synchronization (src/lib/fileSystemSync.ts)', () => {
  beforeEach(() => {
    syncFoldersMap.clear();
    vi.clearAllMocks();
  });

  describe('isFolderSyncSupported', () => {
    it('returns true on Desktop Tauri', () => {
      vi.spyOn(platform, 'isDesktopTauri').mockReturnValue(true);
      vi.spyOn(platform, 'isAndroidNative').mockReturnValue(false);
      expect(isFolderSyncSupported()).toBe(true);
    });

    it('returns true on Android Native', () => {
      vi.spyOn(platform, 'isDesktopTauri').mockReturnValue(false);
      vi.spyOn(platform, 'isAndroidNative').mockReturnValue(true);
      expect(isFolderSyncSupported()).toBe(true);
    });
  });

  describe('Desktop Tauri Folder Connection', () => {
    it('connects a local folder using native picker dialog', async () => {
      vi.spyOn(platform, 'isDesktopTauri').mockReturnValue(true);
      vi.spyOn(platform, 'isAndroidNative').mockReturnValue(false);
      mockInvoke.mockResolvedValue('/home/user/MyBooks');

      const folder = await connectLocalFolder();
      expect(mockInvoke).toHaveBeenCalledWith('pick_folder_dialog');
      expect(folder.id).toBe(PRIMARY_SYNC_FOLDER_ID);
      expect(folder.name).toBe('MyBooks');
      expect(folder.path).toBe('/home/user/MyBooks');

      const saved = await getLocalFolder();
      expect(saved?.path).toBe('/home/user/MyBooks');
    });

    it('throws AbortError if user cancels the folder dialog', async () => {
      vi.spyOn(platform, 'isDesktopTauri').mockReturnValue(true);
      vi.spyOn(platform, 'isAndroidNative').mockReturnValue(false);
      mockInvoke.mockResolvedValue(null);

      await expect(connectLocalFolder()).rejects.toThrow('Pemilihan folder dibatalkan');
    });
  });

  describe('Folder Disconnection & Options', () => {
    it('updates autoSyncOnLaunch preferences', async () => {
      vi.spyOn(platform, 'isDesktopTauri').mockReturnValue(true);
      syncFoldersMap.set(PRIMARY_SYNC_FOLDER_ID, {
        id: PRIMARY_SYNC_FOLDER_ID,
        name: 'Books',
        path: '/books',
        handle: null,
        connectedAt: Date.now(),
        lastSyncedAt: null,
        bookCount: 5,
        autoSyncOnLaunch: false,
      });

      await updateFolderOptions({ autoSyncOnLaunch: true });
      const updated = await getLocalFolder();
      expect(updated?.autoSyncOnLaunch).toBe(true);
    });

    it('disconnects folder by removing record from database', async () => {
      syncFoldersMap.set(PRIMARY_SYNC_FOLDER_ID, {
        id: PRIMARY_SYNC_FOLDER_ID,
        name: 'Books',
        path: '/books',
        handle: null,
        connectedAt: Date.now(),
        lastSyncedAt: null,
        bookCount: 5,
      });

      await disconnectLocalFolder();
      const current = syncFoldersMap.get(PRIMARY_SYNC_FOLDER_ID);
      expect(current).toBeUndefined();
    });
  });
});
