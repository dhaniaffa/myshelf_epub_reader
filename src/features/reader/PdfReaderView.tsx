import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Panels } from '@/features/reader/panels';
import { SettingsSheet } from '@/features/reader/SettingsSheet';
import { usePdfReader } from '@/features/reader/usePdfReader';
import { db } from '@/lib/db';
import { navigate } from '@/lib/route';
import { useSettingsStore } from '@/store/settings';
import { toast } from '@/store/toast';

import { PdfBottomBar } from './pdf/PdfBottomBar';
import { PdfHeaderBar } from './pdf/PdfHeaderBar';
import { PdfFlashOverlay } from './pdf/PdfStateOverlays';
import { PdfStage } from './pdf/PdfStage';
import {
  getPdfCanvasFilterStyle,
  mapPdfOutlineToToc,
  mapPdfSearchResults,
} from './pdf/pdfUtils';
import { usePdfHotkeys } from './pdf/usePdfHotkeys';

import type { PanelTab } from '@/features/reader/panels';
import type { Bookmark, ReaderTheme, SearchResult, TocItem } from '@/types';

interface PdfReaderViewProps {
  bookId: string;
}

export const PdfReaderView: React.FC<PdfReaderViewProps> = ({ bookId }) => {
  const settings = useSettingsStore();

  const resolvedTheme = useMemo<Exclude<ReaderTheme, 'auto'>>(() => {
    if (settings.theme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return settings.theme;
  }, [settings.theme]);

  const {
    state,
    pdfDoc,
    bookmarks,
    refreshBookmarks,
    next,
    prev,
    goToPage,
    zoomIn,
    zoomOut,
    resetZoom,
    setFitMode,
    setScrollMode,
    updateActivePage,
    searchResults,
    searchPdf,
  } = usePdfReader({ bookId, settings, resolvedTheme });

  const [showBars, setShowBars] = useState(false);
  const [panelsOpen, setPanelsOpen] = useState(false);
  const [activePanelTab, setActivePanelTab] = useState<PanelTab>('toc');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Responsive reader container dimensions
  const [containerWidth, setContainerWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 800
  );

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      } else {
        setContainerWidth(window.innerWidth);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate width and height of each page for optimal reading size
  const targetPageWidth = useMemo(() => {
    const isMobile = containerWidth < 640;
    if (isMobile) {
      return Math.max(280, containerWidth - 16);
    }
    if (state.fitMode === 'width') {
      return Math.max(320, Math.min(containerWidth - 32, 1100));
    }
    const base = Math.min(containerWidth - 48, 860);
    return Math.max(320, Math.round(base * state.scale));
  }, [containerWidth, state.fitMode, state.scale]);

  const targetPageHeight = useMemo(() => {
    return Math.round(targetPageWidth * (state.aspectRatio || 1.414));
  }, [targetPageWidth, state.aspectRatio]);

  const itemTotalHeight = useMemo(() => {
    return targetPageHeight + 24; // 24px gap between pages
  }, [targetPageHeight]);

  // Rendered page range (virtual windowing buffer)
  const [visibleRange, setVisibleRange] = useState<[number, number]>([1, 4]);

  const isEink =
    settings.einkMode || resolvedTheme === 'eink-light' || resolvedTheme === 'eink-dark';

  // Adaptive canvas color filter effect based on reader theme
  const canvasFilterStyle = useMemo<React.CSSProperties>(() => {
    return getPdfCanvasFilterStyle(resolvedTheme, isEink);
  }, [resolvedTheme, isEink]);

  // Flash refresh for E-Ink
  const triggerFlashRefresh = useCallback(() => {
    setIsFlashing(true);
    setTimeout(() => {
      setIsFlashing(false);
    }, 200);
  }, []);

  // Scroll handler for vertical scroll mode
  const handleScroll = useCallback(() => {
    if (!containerRef.current || state.scrollMode !== 'vertical') return;
    const top = containerRef.current.scrollTop;
    const vh = containerRef.current.clientHeight || window.innerHeight;

    // Page in eye focus (35% from viewport top)
    const activePg = Math.max(
      1,
      Math.min(state.totalPages, Math.floor((top + vh * 0.35) / itemTotalHeight) + 1)
    );
    updateActivePage(activePg);

    // 800px render buffer above and below viewport
    const start = Math.max(1, Math.floor((top - 800) / itemTotalHeight) + 1);
    const end = Math.min(state.totalPages, Math.ceil((top + vh + 800) / itemTotalHeight));
    setVisibleRange((prev) => {
      if (prev[0] === start && prev[1] === end) return prev;
      return [start, end];
    });
  }, [state.scrollMode, state.totalPages, itemTotalHeight, updateActivePage]);

  // Automatically scroll to page position when book is first ready
  const initialScrollDoneRef = useRef(false);
  useEffect(() => {
    if (
      state.isReady &&
      state.scrollMode === 'vertical' &&
      containerRef.current &&
      !initialScrollDoneRef.current
    ) {
      initialScrollDoneRef.current = true;
      const targetTop = (state.currentPage - 1) * itemTotalHeight;
      containerRef.current.scrollTop = targetTop;
      const vh = containerRef.current.clientHeight || window.innerHeight;
      const start = Math.max(1, Math.floor((targetTop - 800) / itemTotalHeight) + 1);
      const end = Math.min(state.totalPages, Math.ceil((targetTop + vh + 800) / itemTotalHeight));
      setVisibleRange([start, end]);
    }
  }, [state.isReady, state.scrollMode, state.currentPage, itemTotalHeight, state.totalPages]);

  // Jump navigation to specific page
  const handleJumpToPage = useCallback(
    (pageNumber: number) => {
      goToPage(pageNumber);
      if (state.scrollMode === 'vertical' && containerRef.current) {
        const targetTop = (pageNumber - 1) * itemTotalHeight;
        containerRef.current.scrollTo({ top: targetTop, behavior: 'smooth' });
      }
    },
    [goToPage, state.scrollMode, itemTotalHeight]
  );

  // Adaptive prev/next navigation for vertical scroll or per-page view
  const scrollPrev = useCallback(() => {
    if (state.scrollMode === 'vertical' && containerRef.current) {
      containerRef.current.scrollBy({ top: -itemTotalHeight, behavior: 'smooth' });
    } else {
      prev();
    }
  }, [state.scrollMode, itemTotalHeight, prev]);

  const scrollNext = useCallback(() => {
    if (state.scrollMode === 'vertical' && containerRef.current) {
      containerRef.current.scrollBy({ top: itemTotalHeight, behavior: 'smooth' });
    } else {
      next();
    }
  }, [state.scrollMode, itemTotalHeight, next]);

  // Check if current page is bookmarked
  const isBookmarkedCurrent = useMemo(() => {
    const currentCfi = `page:${state.currentPage}`;
    return bookmarks.some((b) => b.cfi === currentCfi);
  }, [bookmarks, state.currentPage]);

  // Toggle bookmark
  const handleToggleBookmark = useCallback(async () => {
    const currentCfi = `page:${state.currentPage}`;
    const existing = bookmarks.find((b) => b.cfi === currentCfi);

    if (existing) {
      await db.bookmarks.delete(existing.id);
      refreshBookmarks();
      toast.info('Penanda halaman dihapus');
    } else {
      const newBm: Bookmark = {
        id: Math.random().toString(36).substring(2, 9),
        bookId,
        cfi: currentCfi,
        percentage: state.percentage,
        label: state.currentChapterTitle || `Halaman ${state.currentPage}`,
        createdAt: Date.now(),
      };
      await db.bookmarks.put(newBm);
      refreshBookmarks();
      toast.success('Halaman berhasil ditandai');
    }
  }, [
    bookmarks,
    state.currentPage,
    state.percentage,
    state.currentChapterTitle,
    bookId,
    refreshBookmarks,
  ]);

  // Convert PDF outline into TocItem for panel
  const tocItems = useMemo<TocItem[]>(() => {
    return mapPdfOutlineToToc(state.outline);
  }, [state.outline]);

  // Convert PDF search results to SearchResult format for panel
  const mappedSearchResults = useMemo<SearchResult[]>(() => {
    return mapPdfSearchResults(searchResults);
  }, [searchResults]);

  // Register hotkeys and volume button controls
  usePdfHotkeys({
    volumeKeysNavigation: settings.volumeKeysNavigation,
    onNext: scrollNext,
    onPrev: scrollPrev,
    onOpenToc: () => {
      setActivePanelTab('toc');
      setPanelsOpen(true);
    },
    onOpenSearch: () => {
      setActivePanelTab('search');
      setPanelsOpen(true);
    },
    onToggleBookmark: handleToggleBookmark,
    onToggleBars: () => setShowBars((v) => !v),
  });

  return (
    <div
      className={`bg-surface text-on-surface relative flex h-screen w-screen flex-col overflow-hidden ${
        isEink ? 'eink-mode' : ''
      }`}
    >
      {/* E-Ink Flash Refresh Overlay */}
      <PdfFlashOverlay isFlashing={isFlashing} />

      {/* TOP CONTROL BAR */}
      <PdfHeaderBar
        show={showBars}
        isEink={isEink}
        bookTitle={state.bookData?.title}
        chapterOrAuthor={
          state.currentChapterTitle || state.bookData?.author || `Halaman ${state.currentPage}`
        }
        isBookmarked={isBookmarkedCurrent}
        onBack={() => navigate('/')}
        onToggleBookmark={handleToggleBookmark}
        onOpenSearch={() => {
          setActivePanelTab('search');
          setPanelsOpen(true);
        }}
        onOpenToc={() => {
          setActivePanelTab('toc');
          setPanelsOpen(true);
        }}
        onOpenSettings={() => setSettingsOpen(true)}
        onFlashRefresh={triggerFlashRefresh}
      />

      {/* READING STAGE */}
      <PdfStage
        scrollMode={state.scrollMode}
        isReady={state.isReady}
        hasError={state.hasError}
        errorMessage={state.errorMessage}
        currentPage={state.currentPage}
        totalPages={state.totalPages}
        percentage={state.percentage}
        currentChapterTitle={state.currentChapterTitle}
        bookTitle={state.bookData?.title}
        pdfDoc={pdfDoc}
        canvasFilterStyle={canvasFilterStyle}
        targetPageWidth={targetPageWidth}
        targetPageHeight={targetPageHeight}
        visibleRange={visibleRange}
        containerRef={containerRef}
        showBars={showBars}
        isEink={isEink}
        onScroll={handleScroll}
        onScrollPrev={scrollPrev}
        onScrollNext={scrollNext}
        onJumpToPage={handleJumpToPage}
        onToggleBars={() => setShowBars((prev) => !prev)}
      />

      {/* BOTTOM CONTROL & ZOOM BAR */}
      <PdfBottomBar
        show={showBars}
        isEink={isEink}
        currentPage={state.currentPage}
        totalPages={state.totalPages}
        percentage={state.percentage}
        readingSpeedWpm={settings.readingSpeedWpm || 220}
        scrollMode={state.scrollMode}
        fitMode={state.fitMode}
        scale={state.scale}
        onJumpToPage={handleJumpToPage}
        onToggleScrollMode={() =>
          setScrollMode(state.scrollMode === 'vertical' ? 'single' : 'vertical')
        }
        onToggleFitMode={() => setFitMode(state.fitMode === 'width' ? 'page' : 'width')}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetZoom={resetZoom}
      />

      {/* DRAWER PANELS (TOC, BOOKMARKS, SEARCH) */}
      <Panels
        open={panelsOpen}
        onClose={() => setPanelsOpen(false)}
        initialTab={activePanelTab}
        book={
          state.bookData || {
            id: bookId,
            title: 'PDF Document',
            author: '',
            cover: null,
            progress: state.percentage,
            lastCfi: null,
            readingTimeSeconds: 0,
            status: 'reading',
            addedAt: 0,
            lastReadAt: null,
            totalLocations: state.totalPages,
          }
        }
        toc={tocItems}
        bookmarks={bookmarks}
        annotations={[]}
        activeChapter={state.currentChapterTitle}
        onJumpToCfi={(cfi) => {
          if (cfi.startsWith('page:')) {
            const p = parseInt(cfi.replace('page:', ''), 10);
            if (!isNaN(p)) handleJumpToPage(p);
          }
        }}
        onJumpToHref={(href) => {
          if (href.startsWith('page:')) {
            const p = parseInt(href.replace('page:', ''), 10);
            if (!isNaN(p)) handleJumpToPage(p);
          }
        }}
        onDeleteBookmark={async (id) => {
          await db.bookmarks.delete(id);
          refreshBookmarks();
          toast.info('Penanda halaman dihapus');
        }}
        onEditAnnotation={() => {}}
        onDeleteAnnotation={() => {}}
        onSearch={(query, onResult, onDone) => {
          searchPdf(query).then(() => {
            mappedSearchResults.forEach((sr) => onResult(sr));
            onDone();
          });
        }}
      />

      {/* SETTINGS SHEET */}
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onFlashRefresh={triggerFlashRefresh}
      />
    </div>
  );
};
