import type { BookViewMode } from '@/types';

/**
 * Calculates responsive column count matching Tailwind breakpoints
 */
export function getColumnCount(viewMode: BookViewMode, windowWidth: number): number {
  if (viewMode === 'list') return 1;

  if (viewMode === 'compact') {
    if (windowWidth >= 1536) return 8;
    if (windowWidth >= 1280) return 7;
    if (windowWidth >= 1024) return 6;
    if (windowWidth >= 768) return 5;
    if (windowWidth >= 640) return 4;
    return 3;
  }

  if (viewMode === 'cover-only') {
    if (windowWidth >= 1280) return 5;
    if (windowWidth >= 1024) return 4;
    if (windowWidth >= 640) return 3;
    return 2;
  }

  // comfortable
  if (windowWidth >= 1280) return 6;
  if (windowWidth >= 1024) return 5;
  if (windowWidth >= 768) return 4;
  if (windowWidth >= 640) return 3;
  return 2;
}

/**
 * Estimated row height in pixels for the TanStack Virtual window virtualizer
 */
export function getEstimatedRowHeight(viewMode: BookViewMode): number {
  switch (viewMode) {
    case 'compact':
      return 260;
    case 'cover-only':
      return 300;
    case 'list':
      return 104;
    case 'comfortable':
    default:
      return 380;
  }
}
