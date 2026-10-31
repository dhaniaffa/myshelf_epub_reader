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
import type { ExtendedEpubBook, ExtendedRendition, ExtendedSection } from '@/types/epubjs';
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

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const lastSelectionTimestampRef = useRef(0);

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

      const createBook = ePub as unknown as (data: ArrayBuffer) => EpubBook;
      bookInstance = createBook(rawData);
      bookRef.current = bookInstance;

      // Sanitize self-closing XHTML tags unsupported by HTML5 parser
      try {
        (bookInstance as unknown as ExtendedEpubBook).spine?.hooks?.serialize?.register(
          (_output: string, section: ExtendedSection) => {
            if (section && typeof section.output === 'string') {
              section.output = fixSelfClosingHtmlTags(section.output);
            }
          }
        );
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
          checkIsSelectionActive: () => Boolean(stateRef.current.selection),
          onClearSelection: () => {
            setState((prev) => (prev.selection ? { ...prev, selection: null } : prev));
          },
          onSelectText: (selection) => {
            if (!isMounted) return;
            lastSelectionTimestampRef.current = Date.now();
            setState((prev) => {
              if (
                prev.selection?.cfiRange === selection.cfiRange &&
                prev.selection?.text === selection.text
              ) {
                return prev;
              }
              return {
                ...prev,
                selection,
                activeAnnotation: null,
              };
            });
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
        (renditionInstance as unknown as ExtendedRendition).spread(initialSpread, minSpread);
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
          const sel =
            (contents.window && contents.window.getSelection
              ? contents.window.getSelection()
              : null) ||
            (contents.document && contents.document.getSelection
              ? contents.document.getSelection()
              : null);
          let text = sel ? sel.toString().trim() : '';
          if (!text && renditionRef.current) {
            try {
              const range = renditionRef.current.getRange(cfiRange);
              text = range?.toString()?.trim() || '';
            } catch {
              // ignore
            }
          }
          if (text) {
            lastSelectionTimestampRef.current = Date.now();
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

  // 6. Global selection listener & continuous detection (vital for WebKitGTK / Desktop Linux Tauri where iframe mouseup/selectionchange is not emitted to the parent window)
  useEffect(() => {
    if (!state.isReady) return;

    let selDebounceTimer: number | undefined;
    let isChecking = false;

    const checkGlobalSelection = () => {
      if (!containerRef.current || isChecking) return;
      isChecking = true;
      try {
        const iframes = Array.from(containerRef.current.querySelectorAll('iframe'));
        let foundSelection = false;

        for (const iframe of iframes) {
          try {
            const win = iframe.contentWindow;
            const doc = iframe.contentDocument;
            const sel = win?.getSelection() || doc?.getSelection?.();
            if (!sel || sel.rangeCount === 0 || sel.isCollapsed) continue;
            const text = sel.toString().trim();
            if (!text) continue;

            const range = sel.getRangeAt(0);
            if (range.collapsed) continue;

            foundSelection = true;
            lastSelectionTimestampRef.current = Date.now();

            let cfiRange = '';
            try {
              if (renditionRef.current) {
                const extRendition = renditionRef.current as unknown as ExtendedRendition;
                const contentsList = extRendition.getContents?.() || [];
                for (const c of contentsList) {
                  const contentObj = c as unknown as {
                    document?: Document;
                    window?: Window;
                    cfiFromRange?: (range: Range) => string;
                    section?: { cfiFromRange?: (range: Range) => string };
                  };
                  if (
                    contentObj.document === doc ||
                    contentObj.window === win ||
                    iframes.length === 1
                  ) {
                    if (typeof contentObj.cfiFromRange === 'function') {
                      cfiRange = contentObj.cfiFromRange(range);
                    } else if (contentObj.section?.cfiFromRange) {
                      cfiRange = contentObj.section.cfiFromRange(range);
                    }
                    break;
                  }
                }
              }
            } catch (err) {
              console.warn('Failed to calculate cfiRange:', err);
            }

            if (!cfiRange && renditionRef.current) {
              try {
                const loc = (
                  renditionRef.current as unknown as ExtendedRendition
                ).currentLocation?.();
                if (loc?.start?.cfi) {
                  cfiRange = loc.start.cfi;
                }
              } catch {
                // ignore
              }
            }

            setState((prev) => {
              if (prev.selection?.cfiRange === cfiRange && prev.selection?.text === text) {
                return prev;
              }
              return {
                ...prev,
                selection: { cfiRange, text },
                activeAnnotation: null,
              };
            });
            break;
          } catch {
            // ignore
          }
        }

        const isMobile =
          typeof navigator !== 'undefined' &&
          (/android|iphone|ipad|ipod/i.test(navigator.userAgent) ||
            ('maxTouchPoints' in navigator &&
              navigator.maxTouchPoints > 2 &&
              /Macintosh/i.test(navigator.userAgent)));

        // If no text is selected anywhere and user is not interacting with toolbar or open dialogs, automatically close selection bar
        // On mobile / touchscreens, do not aggressively auto-close via polling as WebView focus can shift to action handles
        if (!isMobile && !foundSelection && stateRef.current.selection) {
          const isInteractingWithToolbar =
            Boolean(document.querySelector('.selection-bar-container:hover')) ||
            Boolean(document.querySelector('dialog[open]')) ||
            Boolean(document.querySelector('[role="dialog"]')) ||
            Boolean(document.activeElement?.closest('.selection-bar-container')) ||
            Boolean(document.activeElement?.closest('dialog')) ||
            Boolean(document.activeElement?.closest('[role="dialog"]'));

          if (!isInteractingWithToolbar && Date.now() - lastSelectionTimestampRef.current > 400) {
            setState((prev) => (prev.selection ? { ...prev, selection: null } : prev));
          }
        }
      } finally {
        isChecking = false;
      }
    };

    const handleMouseUp = () => {
      checkGlobalSelection();
      setTimeout(checkGlobalSelection, 20);
      setTimeout(checkGlobalSelection, 80);
      setTimeout(checkGlobalSelection, 200);
    };

    const handleSelectionChange = () => {
      window.clearTimeout(selDebounceTimer);
      selDebounceTimer = window.setTimeout(checkGlobalSelection, 40);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (
        e.shiftKey ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown'
      ) {
        checkGlobalSelection();
        setTimeout(checkGlobalSelection, 20);
      }
    };

    // Attach listeners to window and document
    window.addEventListener('mouseup', handleMouseUp, true);
    window.addEventListener('pointerup', handleMouseUp, true);
    document.addEventListener('selectionchange', handleSelectionChange, true);
    window.addEventListener('keyup', handleKeyUp, true);

    // Continuous polling check (every 80ms) to ensure desktop selection in WebKitGTK is detected & closed immediately
    const pollInterval = window.setInterval(checkGlobalSelection, 80);

    const handleIframePointerDown = () => {
      setTimeout(checkGlobalSelection, 10);
    };

    // Helper to attach event listeners to an iframe
    const attachIframeListeners = (iframe: HTMLIFrameElement) => {
      try {
        const win = iframe.contentWindow;
        const doc = iframe.contentDocument;
        if (doc) {
          doc.addEventListener('pointerdown', handleIframePointerDown, true);
          doc.addEventListener('mouseup', handleMouseUp, true);
          doc.addEventListener('pointerup', handleMouseUp, true);
          doc.addEventListener('selectionchange', handleSelectionChange, true);
          doc.addEventListener('keyup', handleKeyUp, true);
        }
        if (win) {
          win.addEventListener('pointerdown', handleIframePointerDown, true);
          win.addEventListener('mouseup', handleMouseUp, true);
          win.addEventListener('pointerup', handleMouseUp, true);
        }
      } catch {
        // ignore
      }
    };

    // Attach to existing iframes
    const iframes = Array.from(containerRef.current?.querySelectorAll('iframe') || []);
    iframes.forEach(attachIframeListeners);

    // MutationObserver to attach to any new iframes added dynamically by epubjs
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node instanceof HTMLIFrameElement) {
            attachIframeListeners(node);
          } else if (node instanceof HTMLElement) {
            const nested = node.querySelectorAll('iframe');
            nested.forEach(attachIframeListeners);
          }
        }
      }
    });

    const currentContainer = containerRef.current;
    if (currentContainer) {
      observer.observe(currentContainer, { childList: true, subtree: true });
    }

    return () => {
      window.removeEventListener('mouseup', handleMouseUp, true);
      window.removeEventListener('pointerup', handleMouseUp, true);
      document.removeEventListener('selectionchange', handleSelectionChange, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      window.clearTimeout(selDebounceTimer);
      window.clearInterval(pollInterval);
      observer.disconnect();

      const currentIframes = Array.from(currentContainer?.querySelectorAll('iframe') || []);
      currentIframes.forEach((iframe) => {
        try {
          iframe.contentDocument?.removeEventListener('pointerdown', handleIframePointerDown, true);
          iframe.contentDocument?.removeEventListener('mouseup', handleMouseUp, true);
          iframe.contentDocument?.removeEventListener('pointerup', handleMouseUp, true);
          iframe.contentDocument?.removeEventListener(
            'selectionchange',
            handleSelectionChange,
            true
          );
          iframe.contentDocument?.removeEventListener('keyup', handleKeyUp, true);
          iframe.contentWindow?.removeEventListener('pointerdown', handleIframePointerDown, true);
          iframe.contentWindow?.removeEventListener('mouseup', handleMouseUp, true);
          iframe.contentWindow?.removeEventListener('pointerup', handleMouseUp, true);
        } catch {
          // ignore
        }
      });
    };
  }, [state.isReady]);

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
    async (
      color: HighlightColor,
      note?: string,
      customSelection?: { cfiRange: string; text: string }
    ) => {
      const targetSelection = customSelection || state.selection;
      if (!targetSelection) return;
      await addHighlightRecord(color, note, targetSelection, state.chapterTitle);
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
