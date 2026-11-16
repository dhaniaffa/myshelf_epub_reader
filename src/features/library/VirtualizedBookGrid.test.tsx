import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { VirtualizedBookGrid } from './VirtualizedBookGrid';
import { getColumnCount, getEstimatedRowHeight } from './virtualizedGridUtils';

import type { Book } from '@/types';

// Mock DB and Cover hook
vi.mock('@/lib/db', () => ({
  db: {
    files: {
      get: vi.fn().mockResolvedValue(null),
    },
  },
}));

vi.mock('@/lib/cover', () => ({
  useCoverUrl: vi.fn(() => 'blob:mock-cover-url'),
}));

const createMockBook = (id: string, title: string): Book => ({
  id,
  title,
  author: 'Penulis Uji',
  cover: null,
  format: 'epub',
  addedAt: Date.now(),
  lastReadAt: null,
  lastCfi: null,
  readingTimeSeconds: 120,
  progress: 0.5,
  status: 'reading',
  totalLocations: 100,
});

describe('VirtualizedBookGrid', () => {
  describe('getColumnCount', () => {
    it('always returns 1 for list mode regardless of screen width', () => {
      expect(getColumnCount('list', 320)).toBe(1);
      expect(getColumnCount('list', 768)).toBe(1);
      expect(getColumnCount('list', 1920)).toBe(1);
    });

    it('returns correct columns for comfortable mode breakpoints', () => {
      expect(getColumnCount('comfortable', 360)).toBe(2);
      expect(getColumnCount('comfortable', 640)).toBe(3);
      expect(getColumnCount('comfortable', 768)).toBe(4);
      expect(getColumnCount('comfortable', 1024)).toBe(5);
      expect(getColumnCount('comfortable', 1280)).toBe(6);
    });

    it('returns correct columns for compact mode breakpoints', () => {
      expect(getColumnCount('compact', 360)).toBe(3);
      expect(getColumnCount('compact', 640)).toBe(4);
      expect(getColumnCount('compact', 768)).toBe(5);
      expect(getColumnCount('compact', 1024)).toBe(6);
      expect(getColumnCount('compact', 1280)).toBe(7);
      expect(getColumnCount('compact', 1536)).toBe(8);
    });

    it('returns correct columns for cover-only mode breakpoints', () => {
      expect(getColumnCount('cover-only', 360)).toBe(2);
      expect(getColumnCount('cover-only', 640)).toBe(3);
      expect(getColumnCount('cover-only', 1024)).toBe(4);
      expect(getColumnCount('cover-only', 1280)).toBe(5);
    });
  });

  describe('getEstimatedRowHeight', () => {
    it('returns accurate estimated height for each view mode', () => {
      expect(getEstimatedRowHeight('list')).toBe(104);
      expect(getEstimatedRowHeight('compact')).toBe(260);
      expect(getEstimatedRowHeight('cover-only')).toBe(300);
      expect(getEstimatedRowHeight('comfortable')).toBe(380);
    });
  });

  describe('Component Rendering', () => {
    const mockBooks = [
      createMockBook('book-1', 'Buku Pertama'),
      createMockBook('book-2', 'Buku Kedua'),
      createMockBook('book-3', 'Buku Ketiga'),
    ];

    it('renders virtualized book cards in comfortable mode', () => {
      render(
        <VirtualizedBookGrid
          books={mockBooks}
          viewMode="comfortable"
          isDeleteMode={false}
          selectedBookIds={new Set()}
          onDeleteRequest={vi.fn()}
          onShowDetails={vi.fn()}
          onToggleSelect={vi.fn()}
        />
      );

      expect(screen.getAllByText('Buku Pertama').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Buku Kedua').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Buku Ketiga').length).toBeGreaterThan(0);
    });

    it('renders virtualized book cards in list mode', () => {
      render(
        <VirtualizedBookGrid
          books={mockBooks}
          viewMode="list"
          isDeleteMode={false}
          selectedBookIds={new Set()}
          onDeleteRequest={vi.fn()}
          onShowDetails={vi.fn()}
          onToggleSelect={vi.fn()}
        />
      );

      expect(screen.getAllByText('Buku Pertama').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Buku Kedua').length).toBeGreaterThan(0);
    });

    it('calls onToggleSelect when selection card is clicked in delete mode', () => {
      const handleToggleSelect = vi.fn();
      render(
        <VirtualizedBookGrid
          books={mockBooks}
          viewMode="comfortable"
          isDeleteMode={true}
          selectedBookIds={new Set(['book-1'])}
          onDeleteRequest={vi.fn()}
          onShowDetails={vi.fn()}
          onToggleSelect={handleToggleSelect}
        />
      );

      const titleElements = screen.getAllByText('Buku Pertama');
      const card = titleElements[0].closest('.group');
      expect(card).not.toBeNull();
      fireEvent.click(card!);
      expect(handleToggleSelect).toHaveBeenCalledWith('book-1');
    });
  });
});
