import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { navigate } from '@/lib/route';
import { PdfPageCanvas } from './PdfPageCanvas';
import { PdfRunningFooter } from './PdfRunningFooter';
import { PdfErrorOverlay, PdfLoadingOverlay } from './PdfStateOverlays';

export interface PdfStageProps {
  scrollMode: 'vertical' | 'single';
  isReady: boolean;
  hasError: boolean;
  errorMessage?: string;
  currentPage: number;
  totalPages: number;
  percentage: number;
  currentChapterTitle?: string;
  bookTitle?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfDoc: any;
  canvasFilterStyle: React.CSSProperties;
  targetPageWidth: number;
  targetPageHeight: number;
  visibleRange: [number, number];
  containerRef: React.RefObject<HTMLDivElement | null>;
  showBars: boolean;
  isEink: boolean;
  onScroll: () => void;
  onScrollPrev: () => void;
  onScrollNext: () => void;
  onJumpToPage: (page: number) => void;
  onToggleBars: () => void;
}

export const PdfStage: React.FC<PdfStageProps> = ({
  scrollMode,
  isReady,
  hasError,
  errorMessage,
  currentPage,
  totalPages,
  percentage,
  currentChapterTitle,
  bookTitle,
  pdfDoc,
  canvasFilterStyle,
  targetPageWidth,
  targetPageHeight,
  visibleRange,
  containerRef,
  showBars,
  isEink,
  onScroll,
  onScrollPrev,
  onScrollNext,
  onJumpToPage,
  onToggleBars,
}) => {
  // Swipe gesture detection on PDF stage
  const pdfTouchRef = useRef<{ startX: number; startY: number; startTime: number }>({
    startX: 0,
    startY: 0,
    startTime: 0,
  });

  const handlePdfTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    pdfTouchRef.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      startTime: Date.now(),
    };
  };

  const handlePdfTouchEnd = (e: React.TouchEvent) => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) return;

    const touch = e.changedTouches[0];
    if (!touch) return;
    const deltaX = touch.clientX - pdfTouchRef.current.startX;
    const deltaY = touch.clientY - pdfTouchRef.current.startY;
    const elapsed = Date.now() - pdfTouchRef.current.startTime;

    // Minimum 45px horizontal swipe to change page
    if (Math.abs(deltaX) >= 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3 && elapsed <= 500) {
      if (deltaX < 0) {
        onScrollNext();
      } else {
        onScrollPrev();
      }
    }
  };

  // Click stage to toggle navigation bars or handle tap navigation
  const handleStageClick = (e: React.MouseEvent) => {
    // Do not toggle bar if user is currently selecting text
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      return;
    }
    const target = e.target as HTMLElement;
    if (target.closest('a') || target.closest('button') || target.closest('input')) return;

    if (scrollMode === 'single') {
      const globalX = e.clientX;
      const windowWidth = window.innerWidth;
      const isMobile = windowWidth < 768;
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      // On mobile / touch screens, disable left/right click navigation zones
      // so tapping on words to select or copy text never accidentally flips pages.
      if (!isTouch && !isMobile) {
        const leftThreshold = 0.22;
        const rightThreshold = 0.78;

        if (globalX < windowWidth * leftThreshold) {
          onScrollPrev();
          return;
        } else if (globalX > windowWidth * rightThreshold) {
          onScrollNext();
          return;
        }
      }
    }

    onToggleBars();
  };

  const pagesArray = Array.from({ length: totalPages || 0 }, (_, i) => i + 1);

  return (
    <main
      onClick={handleStageClick}
      onTouchStart={handlePdfTouchStart}
      onTouchEnd={handlePdfTouchEnd}
      className="relative box-border flex h-full w-full flex-1 flex-col overflow-hidden"
    >
      {/* Desktop Navigation Buttons (Visible with subtle opacity on non-mobile screens) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onScrollPrev();
        }}
        className="bg-surface-container/70 hover:bg-surface-container text-on-surface-variant hover:text-on-surface border-outline-variant/20 absolute top-1/2 left-3 z-20 hidden h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border opacity-40 shadow-sm transition-all hover:scale-105 hover:opacity-100 sm:left-4 md:flex"
        title="Halaman Sebelumnya"
      >
        <ChevronLeft size={22} />
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onScrollNext();
        }}
        className="bg-surface-container/70 hover:bg-surface-container text-on-surface-variant hover:text-on-surface border-outline-variant/20 absolute top-1/2 right-3 z-20 hidden h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border opacity-40 shadow-sm transition-all hover:scale-105 hover:opacity-100 sm:right-4 md:flex"
        title="Halaman Berikutnya"
      >
        <ChevronRight size={22} />
      </button>

      {/* Main Container: Vertical Scroll Mode or Single Page Mode */}
      {scrollMode === 'vertical' ? (
        <div
          ref={containerRef}
          onScroll={onScroll}
          className="relative h-full w-full flex-1 overflow-x-hidden overflow-y-auto scroll-smooth"
        >
          <div className="mx-auto flex min-h-full flex-col items-center px-2 pt-16 pb-24 sm:px-4">
            {pagesArray.map((pageNum) => {
              const isVisible = pageNum >= visibleRange[0] && pageNum <= visibleRange[1];
              return (
                <div
                  key={pageNum}
                  id={`pdf-page-${pageNum}`}
                  data-page-number={pageNum}
                  className="bg-surface-container relative mb-6 rounded-md shadow-md transition-shadow"
                  style={{
                    width: `${targetPageWidth}px`,
                    height: `${targetPageHeight}px`,
                    minWidth: `${targetPageWidth}px`,
                    minHeight: `${targetPageHeight}px`,
                  }}
                >
                  {isVisible ? (
                    <PdfPageCanvas
                      pageNumber={pageNum}
                      pdfDoc={pdfDoc}
                      width={targetPageWidth}
                      height={targetPageHeight}
                      canvasFilterStyle={canvasFilterStyle}
                      onJumpToPage={onJumpToPage}
                    />
                  ) : (
                    <div className="text-on-surface-variant/40 flex h-full w-full flex-col items-center justify-center gap-1 font-mono text-xs">
                      <span>Halaman {pageNum}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="relative flex h-full w-full flex-1 items-center justify-center overflow-hidden px-2 pt-14 pb-16"
        >
          <div
            className="bg-surface-container relative rounded-md shadow-md"
            style={{
              width: `${targetPageWidth}px`,
              height: `${targetPageHeight}px`,
              maxWidth: 'calc(100vw - 24px)',
              maxHeight: 'calc(100vh - 120px)',
            }}
          >
            <PdfPageCanvas
              pageNumber={currentPage}
              pdfDoc={pdfDoc}
              width={targetPageWidth}
              height={targetPageHeight}
              canvasFilterStyle={canvasFilterStyle}
              onJumpToPage={onJumpToPage}
            />
          </div>
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <PdfErrorOverlay errorMessage={errorMessage} onReturnHome={() => navigate('/')} />
      )}

      {/* Loading Spinner */}
      {!isReady && !hasError && <PdfLoadingOverlay />}

      {/* Running Footer at bottom of content */}
      {isReady && (
        <PdfRunningFooter
          showBars={showBars}
          isEink={isEink}
          title={currentChapterTitle || bookTitle}
          currentPage={currentPage}
          totalPages={totalPages}
          percentage={percentage}
        />
      )}
    </main>
  );
};
