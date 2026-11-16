import { beforeEach, describe, expect, it, vi } from 'vitest';

import { openImageInNewWindow } from './openImageWindow';

describe('openImageInNewWindow (src/features/reader/utils/openImageWindow.ts)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false if window.open returns null (e.g. popups blocked)', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);

    const result = openImageInNewWindow({
      src: 'blob:http://localhost:5173/test-image.jpg',
      alt: 'Test Cover',
    });

    expect(result).toBe(false);
  });

  it('opens a new window, writes the responsive HTML viewer document, and returns true', () => {
    const mockDocument = {
      open: vi.fn(),
      write: vi.fn(),
      close: vi.fn(),
    };
    const mockWin = {
      document: mockDocument,
    } as unknown as Window;

    vi.spyOn(window, 'open').mockReturnValue(mockWin);

    const result = openImageInNewWindow({
      src: 'blob:http://localhost:5173/test-image.jpg',
      alt: 'Test Diagram & Photo',
    });

    expect(result).toBe(true);
    expect(window.open).toHaveBeenCalledWith(
      '',
      '_blank',
      expect.stringContaining('resizable=yes')
    );
    expect(mockDocument.open).toHaveBeenCalled();
    expect(mockDocument.write).toHaveBeenCalledWith(
      expect.stringContaining('blob:http://localhost:5173/test-image.jpg')
    );
    expect(mockDocument.write).toHaveBeenCalledWith(
      expect.stringContaining('Test Diagram &amp; Photo')
    );
    expect(mockDocument.close).toHaveBeenCalled();
  });
});
