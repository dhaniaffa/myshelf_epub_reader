import type { ReaderSettings, TocItem } from '@/types';
import type { Book as EpubBook } from 'epubjs';

export interface RawNavTocItem {
  id?: string;
  href: string;
  label?: string;
  subitems?: RawNavTocItem[];
}

export function mapToc(items: RawNavTocItem[]): TocItem[] {
  return items.map((it) => ({
    id: it.id || it.href,
    href: it.href,
    label: it.label?.trim() || 'Bab Tanpa Judul',
    subitems: it.subitems ? mapToc(it.subitems) : undefined,
  }));
}

export interface RelocatedLocation {
  start?: {
    cfi: string;
    percentage?: number;
    href?: string;
    page?: number;
    displayed?: { page: number; total: number };
  };
  end?: {
    cfi: string;
    percentage?: number;
    href?: string;
    page?: number;
    displayed?: { page: number; total: number };
  };
}

export interface CalculatedLocation {
  startCfi: string;
  percentage: number;
  currentLocation: number;
  totalLocations: number;
  currentPage: number;
  endPage: number;
  totalPages: number;
  chapterTitle: string;
}

export function calculatePageLocation(
  location: RelocatedLocation,
  bookInstance: EpubBook | null,
  settings: ReaderSettings,
  prevCurrentPage: number,
  prevTotalPages: number,
  prevChapterTitle: string
): CalculatedLocation | null {
  if (!location || !location.start) return null;

  const startCfi = location.start.cfi;
  let pct = location.start.percentage || 0;
  let locNum = 0;
  let totalLoc = 0;
  let curPage = 0;
  let endPage = 0;
  let totPages = 0;

  // Check publisher pageList if available
  if (typeof location.start.page === 'number' && location.start.page > 0) {
    curPage = location.start.page;
  }
  if (typeof location.end?.page === 'number' && location.end.page > 0) {
    endPage = location.end.page;
  }

  if (bookInstance?.locations?.length()) {
    const locApi = bookInstance.locations as unknown as {
      locationFromCfi: (cfi: string) => number | { location: number };
      percentageFromCfi: (cfi: string) => number;
    };
    const loc = locApi.locationFromCfi(startCfi);
    locNum = typeof loc === 'number' ? loc : (loc?.location ?? 0);
    totalLoc = bookInstance.locations.length();
    pct = bookInstance.locations.percentageFromCfi(startCfi);

    if (!curPage) {
      curPage = locNum >= 0 ? locNum + 1 : Math.max(1, Math.round(pct * totalLoc));
    }

    if (!endPage && location.end?.cfi) {
      const endLoc = locApi.locationFromCfi(location.end.cfi);
      const endLocNum = typeof endLoc === 'number' ? endLoc : (endLoc?.location ?? 0);
      if (endLocNum >= 0) {
        endPage = endLocNum + 1;
      }
    }

    totPages = totalLoc;
  } else if (location.start.displayed?.total) {
    if (!curPage) curPage = location.start.displayed.page || 1;
    if (!endPage && location.end?.displayed?.page) {
      endPage = location.end.displayed.page;
    }
    totPages = location.start.displayed.total;
  }

  // Fallback if page number is missing but percentage is available
  if (!curPage && totPages > 0 && pct > 0) {
    curPage = Math.max(1, Math.round(pct * totPages));
  }

  // Ensure endPage reflects the second page in two-page spread mode on wide screens
  const isSpreadActive =
    settings.flowMode === 'paginated' &&
    (settings.spreadMode === 'double' ||
      (settings.spreadMode === 'auto' &&
        typeof window !== 'undefined' &&
        window.innerWidth >= 768));
  if (isSpreadActive && (!endPage || endPage <= curPage)) {
    endPage = Math.min(totPages || curPage + 1, curPage + 1);
  }

  if (endPage > 0 && endPage < curPage) {
    endPage = curPage;
  }
  if (totPages > 0 && endPage > totPages) {
    endPage = totPages;
  }

  // Find active chapter title from table of contents
  let chapter = '';
  if (location.start.href && bookInstance?.navigation?.toc) {
    const found = bookInstance.navigation.toc.find((t: { href: string; label?: string }) =>
      location.start?.href?.includes(t.href.split('#')[0])
    );
    if (found) chapter = found.label?.trim() || '';
  }

  return {
    startCfi,
    percentage: pct,
    currentLocation: locNum >= 0 ? locNum + 1 : 0,
    totalLocations: totalLoc,
    currentPage: curPage || prevCurrentPage,
    endPage: endPage && endPage > curPage ? endPage : curPage || prevCurrentPage,
    totalPages: totPages || prevTotalPages,
    chapterTitle: chapter || prevChapterTitle,
  };
}
