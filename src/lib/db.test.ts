import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db, deleteBook, deleteBooks, getBookCover, getLocalDateString, setBookCover } from './db';

describe('Database Operations (src/lib/db.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('formats timestamp to YYYY-MM-DD correctly', () => {
    // 2026-10-31 12:00:00 UTC
    const dateStr = getLocalDateString(new Date(2026, 9, 31).getTime());
    expect(dateStr).toBe('2026-10-31');
  });

  it('calls deleteBooks with empty array without error', async () => {
    const txSpy = vi.spyOn(db, 'transaction');
    await deleteBooks([]);
    expect(txSpy).not.toHaveBeenCalled();
  });

  it('executes deleteBooks inside a transaction', async () => {
    const txSpy = vi.spyOn(db, 'transaction').mockImplementation(((...args: unknown[]) => {
      const fn = args[args.length - 1] as () => Promise<void>;
      return fn();
    }) as never);

    const bulkDeleteBooksSpy = vi
      .spyOn(db.books, 'bulkDelete')
      .mockResolvedValue(undefined as never);
    const bulkDeleteCoversSpy = vi
      .spyOn(db.covers, 'bulkDelete')
      .mockResolvedValue(undefined as never);
    const bulkDeleteFilesSpy = vi
      .spyOn(db.files, 'bulkDelete')
      .mockResolvedValue(undefined as never);

    const mockWhereLocations = {
      anyOf: vi.fn().mockReturnValue({ delete: vi.fn().mockResolvedValue(2) }),
    };
    vi.spyOn(db.locations, 'where').mockReturnValue(mockWhereLocations as never);

    const mockWhereBookmarks = {
      anyOf: vi.fn().mockReturnValue({ delete: vi.fn().mockResolvedValue(1) }),
    };
    vi.spyOn(db.bookmarks, 'where').mockReturnValue(mockWhereBookmarks as never);

    const mockWhereAnnotations = {
      anyOf: vi.fn().mockReturnValue({ delete: vi.fn().mockResolvedValue(3) }),
    };
    vi.spyOn(db.annotations, 'where').mockReturnValue(mockWhereAnnotations as never);

    const mockWhereLogs = {
      anyOf: vi.fn().mockReturnValue({ delete: vi.fn().mockResolvedValue(4) }),
    };
    vi.spyOn(db.reading_logs, 'where').mockReturnValue(mockWhereLogs as never);

    await deleteBooks(['book-1', 'book-2']);

    expect(txSpy).toHaveBeenCalledWith('rw', expect.any(Array), expect.any(Function));
    expect(bulkDeleteBooksSpy).toHaveBeenCalledWith(['book-1', 'book-2']);
    expect(bulkDeleteCoversSpy).toHaveBeenCalledWith(['book-1', 'book-2']);
    expect(bulkDeleteFilesSpy).toHaveBeenCalledWith(['book-1', 'book-2']);
    expect(mockWhereLocations.anyOf).toHaveBeenCalledWith(['book-1', 'book-2']);
    expect(mockWhereBookmarks.anyOf).toHaveBeenCalledWith(['book-1', 'book-2']);
  });

  it('executes deleteBook for a single book', async () => {
    const txSpy = vi.spyOn(db, 'transaction').mockImplementation(((...args: unknown[]) => {
      const fn = args[args.length - 1] as () => Promise<void>;
      return fn();
    }) as never);

    const deleteBookSpy = vi.spyOn(db.books, 'delete').mockResolvedValue(undefined as never);
    const deleteCoverSpy = vi.spyOn(db.covers, 'delete').mockResolvedValue(undefined as never);
    const deleteFileSpy = vi.spyOn(db.files, 'delete').mockResolvedValue(undefined as never);

    const mockWhereLocations = {
      equals: vi.fn().mockReturnValue({ delete: vi.fn().mockResolvedValue(1) }),
    };
    vi.spyOn(db.locations, 'where').mockReturnValue(mockWhereLocations as never);

    const mockWhereBookmarks = {
      equals: vi.fn().mockReturnValue({ delete: vi.fn().mockResolvedValue(1) }),
    };
    vi.spyOn(db.bookmarks, 'where').mockReturnValue(mockWhereBookmarks as never);

    const mockWhereAnnotations = {
      equals: vi.fn().mockReturnValue({ delete: vi.fn().mockResolvedValue(1) }),
    };
    vi.spyOn(db.annotations, 'where').mockReturnValue(mockWhereAnnotations as never);

    const mockWhereLogs = {
      equals: vi.fn().mockReturnValue({ delete: vi.fn().mockResolvedValue(1) }),
    };
    vi.spyOn(db.reading_logs, 'where').mockReturnValue(mockWhereLogs as never);

    await deleteBook('book-single');

    expect(txSpy).toHaveBeenCalledWith('rw', expect.any(Array), expect.any(Function));
    expect(deleteBookSpy).toHaveBeenCalledWith('book-single');
    expect(deleteCoverSpy).toHaveBeenCalledWith('book-single');
    expect(deleteFileSpy).toHaveBeenCalledWith('book-single');
    expect(mockWhereLocations.equals).toHaveBeenCalledWith('book-single');
  });

  it('reads and writes cover blobs in db.covers isolated table', async () => {
    const dummyBlob = new Blob(['mock-cover'], { type: 'image/jpeg' });
    const getSpy = vi.spyOn(db.covers, 'get').mockResolvedValue({
      bookId: 'b-123',
      blob: dummyBlob,
    });
    const putSpy = vi.spyOn(db.covers, 'put').mockResolvedValue('b-123');

    const cover = await getBookCover('b-123');
    expect(getSpy).toHaveBeenCalledWith('b-123');
    expect(cover).toBe(dummyBlob);

    await setBookCover('b-123', dummyBlob);
    expect(putSpy).toHaveBeenCalledWith({ bookId: 'b-123', blob: dummyBlob });
  });
});
