import { useCallback, useEffect, useRef, useState } from 'react';
import ePub from 'epubjs';

import { useReaderAnnotations } from '@/features/reader/hooks/useReaderAnnotations';
import { useReaderSearch } from '@/features/reader/hooks/useReaderSearch';
import { useReaderStyles } from '@/features/reader/hooks/useReaderStyles';
import { useReadingTracker } from '@/features/reader/hooks/useReadingTracker';
import { fixSelfClosingHtmlTags } from '@/features/reader/utils/epubHtml';
import { setupIframeListeners } from '@/features/reader/utils/iframeListeners';
import { calculatePageLocation, mapToc } from '@/features/reader/utils/readerLocation';
import { getCurrentPageText as extractPageText } from '@/features/reader/utils/readerText';
import { db } from '@/lib/db';

import type { RawNavTocItem, RelocatedLocation } from '@/features/reader/utils/readerLocation';
import type {
  Annotation,
  Book,
  HighlightColor,
  ReaderSettings,
  ReaderTheme,
  TocItem,
} from '@/types';
import type { Contents, Book as EpubBook, Rendition } from 'epubjs';

interface UseReaderOptions {
  bookId: string;
  settings: ReaderSettings;
  resolvedTheme: Exclude<ReaderTheme, 'auto'>;
}

export interface ReaderState {
  isReady: boolean;
  bookData: Book | null;
  currentCfi: string | null;
  percentage: number;
  chapterTitle: string;
  totalLocations: number;
  currentLocation: number;
  currentPage: number;
  endPage: number;
  totalPages: number;
  toc: TocItem[];
  selection: { cfiRange: string; text: string } | null;
  activeAnnotation: Annotation | null;
}

export function useReader({ bookId, settings, resolvedTheme }: UseReaderOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<EpubBook | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const settingsRef = useRef(settings);
  const themeRef = useRef(resolvedTheme);

  useEffect(() => {
    settingsRef.current = settings;
    themeRef.current = resolvedTheme;
  }, [settings, resolvedTheme]);

  const [state, setState] = useState<ReaderState>({
    isReady: false,
    bookData: null,
    currentCfi: null,
    percentage: 0,
    chapterTitle: '',
    totalLocations: 0,
    currentLocation: 0,
    currentPage: 1,
    endPage: 1,
    totalPages: 0,
    toc: [],
    selection: null,
    activeAnnotation: null,
  });

  const clearActiveAnnotation = useCallback(() => {
    setState((prev) => ({ ...prev, activeAnnotation: null }));
  }, []);

  // 1. Reading time logging & debounced position tracking hook
  const { debouncedSavePosition } = useReadingTracker({ bookId });

  // 2. Annotations & highlights management hook
  const {
    annotations,
    addHighlight: addHighlightRecord,
    updateAnnotation,
    removeAnnotation,
  } = useReaderAnnotations({
    bookId,
    renditionRef,
    isReady: state.isReady,
    onAnnotationClick: (ann) => {
      setState((prev) => ({
        ...prev,
        activeAnnotation: ann,
        selection: null,
      }));
    },
    onAnnotationRemoved: clearActiveAnnotation,
  });

  // 3. Dynamic styling hook (font size, theme CSS, margins, spread mode)
  useReaderStyles({
    renditionRef,
    containerRef,
    settings,
    resolvedTheme,
    isReady: state.isReady,
  });

  // 4. Full-text spine search hook
  const { searchBook } = useReaderSearch({ bookRef });

  // Load book data from database
  useEffect(() => {
    db.books.get(bookId).then((b) => {
      if (b) {
        setState((prev) => ({
          ...prev,
          bookData: b,
          percentage: b.progress || 0,
          currentCfi: b.lastCfi,
        }));
      }
    });
  }, [bookId]);

  const clearSelection = useCallback(() => {
    setState((prev) => ({ ...prev, selection: null }));
    try {
      if (containerRef.current) {
        const iframes = containerRef.current.querySelectorAll('iframe');
        iframes.forEach((iframe) => {
          try {
            iframe.contentWindow?.getSelection()?.removeAllRanges();
            (iframe.contentWindow?.document?.activeElement as HTMLElement)?.blur?.();
          } catch {
            // ignore
          }
        });
      }
      window.focus();
    } catch {
      // ignore
    }
  }, []);

  // 5. Initialize ePub book and rendition when container is ready
  useEffect(() => {
    let isMounted = true;
    let bookInstance: EpubBook | null = null;
    let renditionInstance: Rendition | null = null;

    async function initBook() {
      if (!containerRef.current) return;

      const fileRecord = await db.files.get(bookId);
      if (!fileRecord || !isMounted) return;

      // Clean up previous instance if any
      if (renditionRef.current) {
        try {
          renditionRef.current.destroy();
        } catch {
          // ignore
        }
      }
      if (bookRef.current) {
        try {
          bookRef.current.destroy();
        } catch {
          // ignore
        }
      }

      const rawData =
        fileRecord.buffer instanceof Blob
          ? await fileRecord.buffer.arrayBuffer()
          : fileRecord.buffer;
      if (!isMounted) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      bookInstance = (ePub as any)(rawData);
      bookRef.current = bookInstance;

      // Sanitize self-closing XHTML tags unsupported by HTML5 parser
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (bookInstance as any).spine?.hooks?.serialize?.register((_output: string, section: any) => {
          if (section && typeof section.output === 'string') {
            section.output = fixSelfClosingHtmlTags(section.output);
          }
        });
      } catch {
        // ignore
      }

      const flow = settings.flowMode === 'scrolled' ? 'scrolled-doc' : 'paginated';
      let initialSpread: 'none' | 'always' | 'auto' = 'none';
      let minSpread = 768;
      if (settings.flowMode === 'paginated') {
        if (settings.spreadMode === 'double') {
          initialSpread = 'always';
          minSpread = 1;
        } else if (settings.spreadMode === 'single') {
          initialSpread = 'none';
          minSpread = 99999;
        } else {
          initialSpread = 'auto';
          minSpread = 768;
        }
      }

      renditionInstance = bookInstance!.renderTo(containerRef.current, {
        width: '100%',
        height: '100%',
        flow,
        spread: initialSpread,
        minSpreadWidth: minSpread,
        allowScriptedContent: false,
      });
      renditionRef.current = renditionInstance;

      try {
        renditionInstance.themes.fontSize(`${settingsRef.current.fontSize}px`);
      } catch {
        // ignore
      }

      // Register iframe content listeners
      renditionInstance.hooks.content.register((contents: Contents) => {
        setupIframeListeners({
          contents,
          bookRef,
          renditionRef,
          containerRef,
          settingsRef,
          themeRef,
          onClearSelection: () => {
            setState((prev) => (prev.selection ? { ...prev, selection: null } : prev));
          },
        });
      });

      // Load table of contents
      bookInstance!.loaded.navigation.then((nav) => {
        if (!isMounted) return;
        setState((prev) => ({
          ...prev,
          toc: mapToc((nav.toc as RawNavTocItem[]) || []),
        }));
      });

      // Display book at last known position or beginning
      const bookData = await db.books.get(bookId);
      const targetCfi = bookData?.lastCfi || undefined;
      await renditionInstance.display(targetCfi);

      if (settings.flowMode === 'paginated') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (renditionInstance as any).spread(initialSpread, minSpread);
      }

      if (!isMounted) return;
      setState((prev) => ({ ...prev, isReady: true }));

      // Relocated event: position and chapter update
      renditionInstance.on('relocated', (location: RelocatedLocation) => {
        if (!isMounted || !location || !location.start) return;

        setState((prev) => {
          const calculated = calculatePageLocation(
            location,
            bookInstance,
            settingsRef.current,
            prev.currentPage,
            prev.totalPages,
            prev.chapterTitle
          );
          if (!calculated) return prev;

          debouncedSavePosition(calculated.startCfi, calculated.percentage);

          return {
            ...prev,
            currentCfi: calculated.startCfi,
            percentage: calculated.percentage,
            currentLocation: calculated.currentLocation,
            totalLocations: calculated.totalLocations,
            currentPage: calculated.currentPage,
            endPage: calculated.endPage,
            totalPages: calculated.totalPages,
            chapterTitle: calculated.chapterTitle,
            selection: null,
          };
        });
      });

      // Text selection event
      renditionInstance.on('selected', (cfiRange: string, contents: Contents) => {
        if (!isMounted) return;
        try {
          const range = contents.window.getSelection();
          const text = range ? range.toString().trim() : '';
          if (text) {
            setState((prev) => ({
              ...prev,
              selection: { cfiRange, text },
              activeAnnotation: null,
            }));
          }
        } catch (e) {
          console.error('Error getting selection text', e);
        }
      });

      // Synchronize page status after location calculation
      const updateLocationsInState = () => {
        const book = bookInstance;
        if (!book || !isMounted) return;
        const total = book.locations.length();
        if (total > 0) {
          const locApi = book.locations as unknown as {
            locationFromCfi: (cfi: string) => number | { location: number };
          };
          setState((prev) => {
            let cur = prev.currentPage;
            if (prev.currentCfi) {
              const loc = locApi.locationFromCfi(prev.currentCfi);
              const locNum = typeof loc === 'number' ? loc : (loc?.location ?? 0);
              if (locNum >= 0) cur = locNum + 1;
            } else if (prev.percentage > 0) {
              cur = Math.max(1, Math.round(prev.percentage * total));
            }
            return {
              ...prev,
              totalLocations: total,
              totalPages: total,
              currentPage: cur,
            };
          });
        }
      };

      // Load or generate location cache in background
      const cachedLoc = await db.locations.get(bookId);
      if (cachedLoc && cachedLoc.locations && bookInstance) {
        bookInstance.locations.load(cachedLoc.locations);
        updateLocationsInState();
      } else {
        setTimeout(async () => {
          if (!bookInstance || !isMounted) return;
          try {
            await bookInstance.locations.generate(1000);
            const saved = bookInstance.locations.save();
            await db.locations.put({ bookId, locations: saved });
            updateLocationsInState();
          } catch {
            // ignore
          }
        }, 1200);
      }
    }

    initBook();

    return () => {
      isMounted = false;
      if (renditionInstance) {
        try {
          renditionInstance.destroy();
        } catch {
          // ignore
        }
      }
      if (bookInstance) {
        try {
          bookInstance.destroy();
        } catch {
          // ignore
        }
      }
    };
  }, [bookId, settings.flowMode, settings.spreadMode, debouncedSavePosition]);

  // Book navigation
  const next = useCallback(() => {
    renditionRef.current?.next();
  }, []);

  const prev = useCallback(() => {
    renditionRef.current?.prev();
  }, []);

  const goTo = useCallback((cfi: string) => {
    renditionRef.current?.display(cfi);
  }, []);

  const goToPercentage = useCallback((pct: number) => {
    if (!bookRef.current || !renditionRef.current) return;
    if (bookRef.current.locations.length()) {
      const cfi = bookRef.current.locations.cfiFromPercentage(pct);
      renditionRef.current.display(cfi);
    }
  }, []);

  const goToPage = useCallback((pageNum: number) => {
    if (!bookRef.current || !renditionRef.current) return;
    const total = bookRef.current.locations?.length?.() || 0;
    if (total > 0) {
      const targetIdx = Math.max(0, Math.min(total - 1, pageNum - 1));
      const locApi = bookRef.current.locations as unknown as {
        cfiFromLocation: (loc: number) => string;
      };
      const cfi = locApi.cfiFromLocation(targetIdx);
      if (cfi) {
        renditionRef.current.display(cfi);
      }
    }
  }, []);

  // Add highlight and clear active selection
  const addHighlight = useCallback(
    async (color: HighlightColor, note?: string) => {
      if (!state.selection) return;
      await addHighlightRecord(color, note, state.selection, state.chapterTitle);
      clearSelection();
    },
    [state.selection, state.chapterTitle, addHighlightRecord, clearSelection]
  );

  // Get currently visible page text
  const getCurrentPageText = useCallback((): string => {
    return extractPageText(renditionRef.current, containerRef.current);
  }, []);

  return {
    containerRef,
    state,
    annotations,
    next,
    prev,
    goTo,
    goToPercentage,
    goToPage,
    clearSelection,
    clearActiveAnnotation,
    addHighlight,
    updateAnnotation,
    removeAnnotation,
    searchBook,
    getCurrentPageText,
  };
}
