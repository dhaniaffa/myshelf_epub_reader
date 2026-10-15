import { useCallback, useEffect, useRef, useState } from 'react';

import { db, recordReadingTime } from '@/lib/db';
import { extractPdfOutline, PDF_CMAP_URL, PDF_STANDARD_FONT_DATA_URL, pdfjsLib } from '@/lib/pdf';

import type { PdfOutlineItem } from '@/lib/pdf';
import type { Book, Bookmark, ReaderSettings, ReaderTheme } from '@/types';

export interface UsePdfReaderOptions {
  bookId: string;
  settings: ReaderSettings;
  resolvedTheme: Exclude<ReaderTheme, 'auto'>;
}

export interface PdfSearchResult {
  pageNumber: number;
  matchText: string;
}

export interface PdfReaderState {
  isReady: boolean;
  hasError: boolean;
  errorMessage?: string;
  bookData: Book | null;
  currentPage: number;
  totalPages: number;
  percentage: number;
  outline: PdfOutlineItem[];
  currentChapterTitle: string;
  scale: number;
  fitMode: 'page' | 'width' | 'custom';
  scrollMode: 'vertical' | 'single';
  aspectRatio: number;
}

export function usePdfReader({ bookId }: UsePdfReaderOptions) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfDocRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const loadingTaskRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const readingTimerRef = useRef<number | null>(null);
  const saveDebounceRef = useRef<number | null>(null);

  const [state, setState] = useState<PdfReaderState>({
    isReady: false,
    hasError: false,
    bookData: null,
    currentPage: 1,
    totalPages: 0,
    percentage: 0,
    outline: [],
    currentChapterTitle: '',
    scale: 1.0,
    fitMode: 'width',
    scrollMode: 'vertical',
    aspectRatio: 1.414,
  });

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PdfSearchResult[]>([]);

  // Load book data and bookmarks from Dexie
  const refreshBookmarks = useCallback(() => {
    db.bookmarks
      .where('bookId')
      .equals(bookId)
      .toArray()
      .then((bms) => setBookmarks(bms));
  }, [bookId]);

  useEffect(() => {
    refreshBookmarks();
  }, [refreshBookmarks]);

  // Debounced reading position saver
  const debouncedSavePosition = useCallback(
    (page: number, total: number) => {
      if (saveDebounceRef.current) {
        clearTimeout(saveDebounceRef.current);
      }
      saveDebounceRef.current = window.setTimeout(() => {
        const pct = total > 0 ? page / total : 0;
        db.books.update(bookId, {
          lastCfi: `page:${page}`,
          progress: pct,
          lastReadAt: Date.now(),
        });
      }, 500);
    },
    [bookId]
  );

  // Reading time timer (5-second interval)
  useEffect(() => {
    readingTimerRef.current = window.setInterval(() => {
      recordReadingTime(bookId, 5).catch((err) => {
        console.warn('Gagal mencatat log waktu membaca PDF:', err);
      });
    }, 5000);

    return () => {
      if (readingTimerRef.current) clearInterval(readingTimerRef.current);
    };
  }, [bookId]);

  // Find active chapter title based on page number in outline
  const getChapterTitleForPage = useCallback(
    (page: number, outlineItems: PdfOutlineItem[]): string => {
      let bestMatch = '';
      const traverse = (items: PdfOutlineItem[]) => {
        for (const item of items) {
          if (item.pageNumber <= page) {
            bestMatch = item.label;
          }
          if (item.items && item.items.length > 0) {
            traverse(item.items);
          }
        }
      };
      traverse(outlineItems);
      return bestMatch;
    },
    []
  );

  // Load PDF file from IndexedDB
  useEffect(() => {
    let isMounted = true;

    async function initPdf() {
      try {
        const [book, fileRecord] = await Promise.all([db.books.get(bookId), db.files.get(bookId)]);

        if (!isMounted || !fileRecord?.buffer) return;

        const rawBuffer =
          fileRecord.buffer instanceof Blob
            ? await fileRecord.buffer.arrayBuffer()
            : fileRecord.buffer;

        if (!isMounted) return;

        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(rawBuffer.slice(0)),
          cMapUrl: PDF_CMAP_URL,
          cMapPacked: true,
          standardFontDataUrl: PDF_STANDARD_FONT_DATA_URL,
        });
        loadingTaskRef.current = loadingTask;

        const doc = await loadingTask.promise;
        if (!isMounted) {
          loadingTask.destroy();
          return;
        }

        pdfDocRef.current = doc;
        setPdfDoc(doc);
        const total = doc.numPages || 1;

        // Read last recorded page position
        let initialPage = 1;
        if (book?.lastCfi && book.lastCfi.startsWith('page:')) {
          const parsed = parseInt(book.lastCfi.replace('page:', ''), 10);
          if (!isNaN(parsed) && parsed >= 1 && parsed <= total) {
            initialPage = parsed;
          }
        } else if (book?.progress && book.progress > 0) {
          initialPage = Math.max(1, Math.min(total, Math.round(book.progress * total)));
        }

        // Read first page aspect ratio
        let ratio = 1.414;
        try {
          const page1 = await doc.getPage(1);
          const vp = page1.getViewport({ scale: 1.0 });
          if (vp.width > 0 && vp.height > 0) {
            ratio = vp.height / vp.width;
          }
        } catch {
          // ignore
        }

        // Immediately activate reader so user can read page 1 without waiting for outline
        setState((prev) => ({
          ...prev,
          isReady: true,
          hasError: false,
          bookData: book || null,
          currentPage: initialPage,
          totalPages: total,
          percentage: total > 0 ? initialPage / total : 0,
          aspectRatio: ratio,
        }));

        // Load outline asynchronously in background to avoid blocking render
        extractPdfOutline(doc)
          .then((outlineItems) => {
            if (!isMounted) return;
            const chapterTitle = getChapterTitleForPage(initialPage, outlineItems);
            setState((prev) => ({
              ...prev,
              outline: outlineItems,
              currentChapterTitle: chapterTitle,
            }));
          })
          .catch((err) => {
            console.warn('Gagal memuat outline PDF di background:', err);
          });
      } catch (err) {
        console.error('Gagal memuat dokumen PDF:', err);
        if (isMounted) {
          setState((prev) => ({
            ...prev,
            isReady: false,
            hasError: true,
            errorMessage: err instanceof Error ? err.message : 'Gagal membuka berkas PDF',
          }));
        }
      }
    }

    initPdf();

    return () => {
      isMounted = false;
      setPdfDoc(null);
      if (loadingTaskRef.current) {
        try {
          loadingTaskRef.current.destroy();
        } catch {
          // ignore
        }
      }
    };
  }, [bookId, getChapterTitleForPage]);

  // Navigate to specific page
  const goToPage = useCallback(
    (page: number) => {
      setState((prev) => {
        const targetPage = Math.max(1, Math.min(prev.totalPages || 1, page));
        if (targetPage === prev.currentPage) return prev;
        const chapter = getChapterTitleForPage(targetPage, prev.outline);
        const pct = prev.totalPages > 0 ? targetPage / prev.totalPages : 0;
        debouncedSavePosition(targetPage, prev.totalPages);
        return {
          ...prev,
          currentPage: targetPage,
          percentage: pct,
          currentChapterTitle: chapter,
        };
      });
    },
    [debouncedSavePosition, getChapterTitleForPage]
  );

  const next = useCallback(() => {
    setState((prev) => {
      if (prev.currentPage < prev.totalPages) {
        const nextPg = prev.currentPage + 1;
        debouncedSavePosition(nextPg, prev.totalPages);
        return {
          ...prev,
          currentPage: nextPg,
          percentage: prev.totalPages > 0 ? nextPg / prev.totalPages : 0,
          currentChapterTitle: getChapterTitleForPage(nextPg, prev.outline),
        };
      }
      return prev;
    });
  }, [debouncedSavePosition, getChapterTitleForPage]);

  const prev = useCallback(() => {
    setState((prev) => {
      if (prev.currentPage > 1) {
        const prevPg = prev.currentPage - 1;
        debouncedSavePosition(prevPg, prev.totalPages);
        return {
          ...prev,
          currentPage: prevPg,
          percentage: prev.totalPages > 0 ? prevPg / prev.totalPages : 0,
          currentChapterTitle: getChapterTitleForPage(prevPg, prev.outline),
        };
      }
      return prev;
    });
  }, [debouncedSavePosition, getChapterTitleForPage]);

  const goToPercentage = useCallback(
    (pct: number) => {
      setState((prev) => {
        if (prev.totalPages <= 0) return prev;
        const targetPage = Math.max(
          1,
          Math.min(prev.totalPages, Math.round(pct * prev.totalPages))
        );
        debouncedSavePosition(targetPage, prev.totalPages);
        return {
          ...prev,
          currentPage: targetPage,
          percentage: targetPage / prev.totalPages,
          currentChapterTitle: getChapterTitleForPage(targetPage, prev.outline),
        };
      });
    },
    [debouncedSavePosition, getChapterTitleForPage]
  );

  // Zoom control
  const zoomIn = useCallback(() => {
    setState((prev) => ({
      ...prev,
      scale: Math.min(3.0, Math.round((prev.scale + 0.15) * 100) / 100),
      fitMode: 'custom',
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setState((prev) => ({
      ...prev,
      scale: Math.max(0.5, Math.round((prev.scale - 0.15) * 100) / 100),
      fitMode: 'custom',
    }));
  }, []);

  const resetZoom = useCallback(() => {
    setState((prev) => ({
      ...prev,
      scale: 1.0,
      fitMode: 'width',
    }));
  }, []);

  const setFitMode = useCallback((mode: 'page' | 'width') => {
    setState((prev) => ({ ...prev, fitMode: mode }));
  }, []);

  const setScrollMode = useCallback((mode: 'vertical' | 'single') => {
    setState((prev) => ({ ...prev, scrollMode: mode }));
  }, []);

  const updateActivePage = useCallback(
    (page: number) => {
      setState((prev) => {
        if (page === prev.currentPage) return prev;
        const chapter = getChapterTitleForPage(page, prev.outline);
        const pct = prev.totalPages > 0 ? page / prev.totalPages : 0;
        debouncedSavePosition(page, prev.totalPages);
        return {
          ...prev,
          currentPage: page,
          percentage: pct,
          currentChapterTitle: chapter,
        };
      });
    },
    [debouncedSavePosition, getChapterTitleForPage]
  );

  // Search text within PDF
  const searchPdf = useCallback(async (query: string) => {
    if (!pdfDocRef.current || !query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const doc = pdfDocRef.current;
    const total = doc.numPages || 0;
    const results: PdfSearchResult[] = [];
    const qLower = query.toLowerCase();

    try {
      for (let i = 1; i <= total; i++) {
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pageText = textContent.items.map((item: any) => item.str || '').join(' ');

        const idx = pageText.toLowerCase().indexOf(qLower);
        if (idx !== -1) {
          const start = Math.max(0, idx - 40);
          const end = Math.min(pageText.length, idx + qLower.length + 50);
          const snippet = '...' + pageText.substring(start, end).trim() + '...';
          results.push({
            pageNumber: i,
            matchText: snippet,
          });
        }
        if (results.length >= 100) break; // Batasi maks 100 hasil pencarian
      }
    } catch (err) {
      console.warn('Pencarian teks PDF terhenti:', err);
    } finally {
      setSearchResults(results);
      setIsSearching(false);
    }
  }, []);

  return {
    state,
    pdfDoc,
    bookmarks,
    refreshBookmarks,
    next,
    prev,
    goToPage,
    goToPercentage,
    zoomIn,
    zoomOut,
    resetZoom,
    setFitMode,
    setScrollMode,
    updateActivePage,
    isSearching,
    searchResults,
    searchPdf,
  };
}
