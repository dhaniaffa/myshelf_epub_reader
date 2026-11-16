import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';

import { BookCard } from './BookCard';
import { BookCompactCard } from './BookCompactCard';
import { BookCoverCard } from './BookCoverCard';
import { BookListItem } from './BookListItem';
import { getColumnCount, getEstimatedRowHeight } from './virtualizedGridUtils';

import type { Book, BookViewMode } from '@/types';

export interface VirtualizedBookGridProps {
  books: Book[];
  viewMode: BookViewMode;
  isDeleteMode: boolean;
  selectedBookIds: Set<string>;
  onDeleteRequest: (book: Book) => void;
  onShowDetails: (book: Book) => void;
  onToggleSelect: (bookId: string) => void;
}

export const VirtualizedBookGrid: React.FC<VirtualizedBookGridProps> = ({
  books,
  viewMode,
  isDeleteMode,
  selectedBookIds,
  onDeleteRequest,
  onShowDetails,
  onToggleSelect,
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [windowWidth, setWindowWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );

  // Debounced window resize listener to adapt columns smoothly
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setWindowWidth(window.innerWidth);
      }, 100);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const columnCount = useMemo(() => {
    return getColumnCount(viewMode, windowWidth);
  }, [viewMode, windowWidth]);

  // Group books into row chunks based on active columns
  const rows = useMemo(() => {
    const result: Book[][] = [];
    for (let i = 0; i < books.length; i += columnCount) {
      result.push(books.slice(i, i + columnCount));
    }
    return result;
  }, [books, columnCount]);

  const estimatedRowHeight = useMemo(() => {
    return getEstimatedRowHeight(viewMode);
  }, [viewMode]);

  // Compute list offset dynamically so the virtualizer knows where the list begins
  const [scrollMargin, setScrollMargin] = useState(0);

  useEffect(() => {
    if (listRef.current) {
      const rect = listRef.current.getBoundingClientRect();
      const topOffset = rect.top + window.scrollY;
      setScrollMargin(topOffset);
    }
  }, [books.length, viewMode]);

  const rowVirtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => estimatedRowHeight,
    overscan: 4,
    scrollMargin,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  // Grid styling for each row matching viewMode
  const gridRowClass = useMemo(() => {
    switch (viewMode) {
      case 'compact':
        return 'grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3.5 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8';
      case 'cover-only':
        return 'grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5';
      case 'list':
        return 'flex flex-col';
      case 'comfortable':
      default:
        return 'grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';
    }
  }, [viewMode]);

  const rowPaddingBottom = useMemo(() => {
    switch (viewMode) {
      case 'compact':
        return 14;
      case 'cover-only':
        return 20;
      case 'list':
        return 12;
      case 'comfortable':
      default:
        return 20;
    }
  }, [viewMode]);

  return (
    <div
      ref={listRef}
      className={`relative w-full ${rowVirtualizer.isScrolling ? 'pointer-events-none select-none' : ''}`}
      style={{
        height: `${rowVirtualizer.getTotalSize()}px`,
      }}
    >
      {virtualItems.map((virtualRow) => {
        const rowBooks = rows[virtualRow.index];
        if (!rowBooks) return null;

        return (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={rowVirtualizer.measureElement}
            className="absolute top-0 left-0 w-full"
            style={{
              transform: `translate3d(0, ${virtualRow.start - (rowVirtualizer.options.scrollMargin ?? 0)}px, 0)`,
              paddingBottom: `${rowPaddingBottom}px`,
              willChange: 'transform',
              contain: 'content',
            }}
          >
            <div className={gridRowClass}>
              {rowBooks.map((book) => {
                const isSelected = selectedBookIds.has(book.id);

                if (viewMode === 'compact') {
                  return (
                    <BookCompactCard
                      key={book.id}
                      book={book}
                      onDeleteRequest={onDeleteRequest}
                      onShowDetails={onShowDetails}
                      isSelectionMode={isDeleteMode}
                      isSelected={isSelected}
                      onToggleSelect={onToggleSelect}
                    />
                  );
                }

                if (viewMode === 'cover-only') {
                  return (
                    <BookCoverCard
                      key={book.id}
                      book={book}
                      onDeleteRequest={onDeleteRequest}
                      onShowDetails={onShowDetails}
                      isSelectionMode={isDeleteMode}
                      isSelected={isSelected}
                      onToggleSelect={onToggleSelect}
                    />
                  );
                }

                if (viewMode === 'list') {
                  return (
                    <BookListItem
                      key={book.id}
                      book={book}
                      onDeleteRequest={onDeleteRequest}
                      onShowDetails={onShowDetails}
                      isSelectionMode={isDeleteMode}
                      isSelected={isSelected}
                      onToggleSelect={onToggleSelect}
                    />
                  );
                }

                return (
                  <BookCard
                    key={book.id}
                    book={book}
                    onDeleteRequest={onDeleteRequest}
                    onShowDetails={onShowDetails}
                    isSelectionMode={isDeleteMode}
                    isSelected={isSelected}
                    onToggleSelect={onToggleSelect}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

VirtualizedBookGrid.displayName = 'VirtualizedBookGrid';
