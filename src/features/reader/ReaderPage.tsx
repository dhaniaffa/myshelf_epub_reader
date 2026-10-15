import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowLeft,
  Bookmark as BookmarkIcon,
  ChevronLeft,
  ChevronRight,
  Headphones,
  List,
  RefreshCw,
  Search,
  Sliders,
} from 'lucide-react';

import { IconButton } from '@/components/ui';
import { READER_EVENTS } from '@/config';
import { DictionaryDialog } from '@/features/reader/DictionaryDialog';
import { FollowLinkPopover } from '@/features/reader/FollowLinkPopover';
import { FootnoteDialog } from '@/features/reader/FootnoteDialog';
import { ImageViewerDialog } from '@/features/reader/ImageViewerDialog';
import { NoteDialog } from '@/features/reader/NoteDialog';
import { Panels } from '@/features/reader/panels';
import { PdfReaderView } from '@/features/reader/PdfReaderView';
import { SelectionBar } from '@/features/reader/SelectionBar';
import { SettingsSheet } from '@/features/reader/SettingsSheet';
import { TTSPlayerBar } from '@/features/reader/TTSPlayerBar';
import { useReader } from '@/features/reader/useReader';
import { splitIntoSentences, useTTS } from '@/features/reader/useTTS';
import { db } from '@/lib/db';
import { navigate } from '@/lib/route';
import { isDarkTheme, THEME_PALETTES } from '@/lib/theme';
import { useSettingsStore } from '@/store/settings';
import { toast } from '@/store/toast';

import type { PanelTab } from '@/features/reader/panels';
import type { UseTTSReturn } from '@/features/reader/useTTS';
import type {
  Annotation,
  Bookmark,
  FollowLinkData,
  FootnoteData,
  ImageViewData,
  ReaderTheme,
} from '@/types';

interface ReaderPageProps {
  bookId: string;
}

const EpubReaderView: React.FC<ReaderPageProps> = ({ bookId }) => {
  const settings = useSettingsStore();

  // Hitung tema aktif (resolving 'auto')
  const resolvedTheme = useMemo<Exclude<ReaderTheme, 'auto'>>(() => {
    if (settings.theme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return settings.theme;
  }, [settings.theme]);

  const isDark = useMemo(() => {
    const palette = THEME_PALETTES[resolvedTheme] || THEME_PALETTES.light;
    return isDarkTheme(palette.bg);
  }, [resolvedTheme]);

  // Core reader hook
  const {
    containerRef,
    state,
    annotations,
    next,
    prev,
    goTo,
    goToPercentage,
    clearSelection,
    clearActiveAnnotation,
    addHighlight,
    updateAnnotation,
    removeAnnotation,
    searchBook,
    getCurrentPageText,
  } = useReader({ bookId, settings, resolvedTheme });

  // UI state
  const [showBars, setShowBars] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [panelsOpen, setPanelsOpen] = useState(false);
  const [activePanelTab, setActivePanelTab] = useState<PanelTab>('toc');

  // Bookmarks state
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [editingNoteFor, setEditingNoteFor] = useState<{
    annotation?: Annotation;
    quoteText: string;
    isExisting: boolean;
  } | null>(null);

  // Footnote, Image viewer & Follow link states
  const [activeFootnote, setActiveFootnote] = useState<FootnoteData | null>(null);
  const [activeImage, setActiveImage] = useState<ImageViewData | null>(null);
  const [activeFollowLink, setActiveFollowLink] = useState<FollowLinkData | null>(null);

  // Audio (TTS) & Dictionary states
  const [showTTSBar, setShowTTSBar] = useState(false);
  const [dictionaryWord, setDictionaryWord] = useState<string | null>(null);

  const ttsRef = useRef<UseTTSReturn | null>(null);

  // Callback when all sentences on active page finish speaking
  const handleTTSPageNext = useCallback(() => {
    next();
    // Short delay to allow iframe & layout to finish rendering new page
    setTimeout(() => {
      const pageText = getCurrentPageText();
      const sentences = splitIntoSentences(pageText);
      if (sentences.length > 0) {
        ttsRef.current?.start(sentences, false);
      } else {
        ttsRef.current?.stop();
      }
    }, 400);
  }, [next, getCurrentPageText]);

  // Initialize Text-to-Speech (TTS)
  const tts = useTTS({
    onPageNext: handleTTSPageNext,
    onPagePrev: prev,
  });

  useEffect(() => {
    ttsRef.current = tts;
  }, [tts]);

  // Clear selection and ensure TTS state is reset if playing selection
  const handleClearSelection = useCallback(() => {
    clearSelection();
    if (tts.isSpeakingSelection) {
      const pageText = getCurrentPageText();
      const sentences = splitIntoSentences(pageText);
      tts.reset(sentences);
    }
  }, [clearSelection, tts, getCurrentPageText]);

  // Listener to automatically close selection toolbar when clicking outside
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        state.selection &&
        target &&
        !target.closest('.selection-bar-container') &&
        !target.closest('.tts-player-bar-container')
      ) {
        const iframe = containerRef.current?.querySelector('iframe');
        if (iframe && iframe.contains(target)) return;
        if (!showTTSBar) {
          handleClearSelection();
        }
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [state.selection, showTTSBar, handleClearSelection, containerRef]);

  // Extract active page text and play
  const handleToggleTTS = useCallback(() => {
    if (showTTSBar) {
      tts.stop();
      setShowTTSBar(false);
    } else {
      setShowTTSBar(true);
      try {
        const pageText = getCurrentPageText();
        const sentences = splitIntoSentences(pageText);
        if (sentences.length > 0) {
          tts.start(sentences, false);
        } else {
          toast.info('Tidak ada teks yang dapat dibacakan di halaman ini');
        }
      } catch {
        toast.info('Gagal mengekstrak teks halaman');
      }
    }
  }, [showTTSBar, tts, getCurrentPageText]);

  // Muat penanda
  const refreshBookmarks = useCallback(() => {
    db.bookmarks.where('bookId').equals(bookId).toArray().then(setBookmarks);
  }, [bookId]);

  useEffect(() => {
    refreshBookmarks();
  }, [refreshBookmarks]);

  // Check if current page is bookmarked
  const isBookmarkedCurrent = useMemo(() => {
    if (!state.currentCfi) return false;
    return bookmarks.some((b) => b.cfi === state.currentCfi);
  }, [bookmarks, state.currentCfi]);

  // Toggle bookmark for current page
  const handleToggleBookmark = useCallback(async () => {
    if (!state.currentCfi) return;

    const existing = bookmarks.find((b) => b.cfi === state.currentCfi);
    if (existing) {
      await db.bookmarks.delete(existing.id);
      refreshBookmarks();
      toast.info('Penanda halaman dihapus');
    } else {
      const newBm: Bookmark = {
        id: Math.random().toString(36).substring(2, 9),
        bookId,
        cfi: state.currentCfi,
        percentage: state.percentage,
        label: state.chapterTitle || `Halaman (${Math.round(state.percentage * 100)}%)`,
        createdAt: Date.now(),
      };
      await db.bookmarks.put(newBm);
      refreshBookmarks();
      toast.success('Halaman berhasil ditandai');
    }
  }, [state.currentCfi, state.percentage, state.chapterTitle, bookmarks, refreshBookmarks, bookId]);

  const [isFlashing, setIsFlashing] = useState(false);
  const triggerFlashRefresh = useCallback(() => {
    setIsFlashing(true);
    setTimeout(() => {
      setIsFlashing(false);
    }, 200);
  }, []);

  // Keyboard Navigation & Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in input / textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      // Physical volume keys navigation (Hardware Keys)
      if (settings.volumeKeysNavigation !== false) {
        if (e.key === 'AudioVolumeDown' || e.key === 'VolumeDown') {
          e.preventDefault();
          next();
          return;
        } else if (e.key === 'AudioVolumeUp' || e.key === 'VolumeUp') {
          e.preventDefault();
          prev();
          return;
        }
      }

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
        e.preventDefault();
        prev();
      } else if (e.key === 't' || e.key === 'T') {
        setActivePanelTab('toc');
        setPanelsOpen(true);
      } else if (e.key === '/') {
        e.preventDefault();
        setActivePanelTab('search');
        setPanelsOpen(true);
      } else if (e.key === 'b' || e.key === 'B') {
        handleToggleBookmark();
      } else if (e.key === 'Escape') {
        setShowBars((v) => !v);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [next, prev, handleToggleBookmark, settings.volumeKeysNavigation]);

  // Listen for toggle-bars event from book iframe
  useEffect(() => {
    const handleToggleBars = () => {
      setShowBars((prev) => !prev);
    };
    const handleOpenFootnote = (e: Event) => {
      const customEvent = e as CustomEvent<FootnoteData>;
      if (customEvent.detail) {
        setActiveFootnote(customEvent.detail);
      }
    };
    const handleOpenImage = (e: Event) => {
      const customEvent = e as CustomEvent<ImageViewData>;
      if (customEvent.detail) {
        setActiveImage(customEvent.detail);
      }
    };
    const handleFollowLink = (e: Event) => {
      const customEvent = e as CustomEvent<FollowLinkData>;
      if (customEvent.detail) {
        setActiveFollowLink(customEvent.detail);
      }
    };

    window.addEventListener(READER_EVENTS.toggleBars, handleToggleBars);
    window.addEventListener(READER_EVENTS.openFootnote, handleOpenFootnote);
    window.addEventListener(READER_EVENTS.openImage, handleOpenImage);
    window.addEventListener(READER_EVENTS.followLink, handleFollowLink);

    return () => {
      window.removeEventListener(READER_EVENTS.toggleBars, handleToggleBars);
      window.removeEventListener(READER_EVENTS.openFootnote, handleOpenFootnote);
      window.removeEventListener(READER_EVENTS.openImage, handleOpenImage);
      window.removeEventListener(READER_EVENTS.followLink, handleFollowLink);
    };
  }, []);

  // Dynamic cursor for stage area outside book
  const [stageCursor, setStageCursor] = useState<'default' | 'pointer'>('default');

  const handleStageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (settings.flowMode !== 'paginated') {
      if (stageCursor !== 'default') setStageCursor('default');
      return;
    }
    const globalX = e.clientX;
    const windowWidth = window.innerWidth;
    let containerRelativeX = -1;
    if (containerRef.current) {
      const cRect = containerRef.current.getBoundingClientRect();
      if (cRect.width > 0) {
        containerRelativeX = (globalX - cRect.left) / cRect.width;
      }
    }
    const isLeftZone =
      globalX < windowWidth * 0.22 || (containerRelativeX >= 0 && containerRelativeX < 0.25);
    const isRightZone =
      globalX > windowWidth * 0.78 || (containerRelativeX > 0.75 && containerRelativeX <= 1);

    const nextCursor = isLeftZone || isRightZone ? 'pointer' : 'default';
    if (stageCursor !== nextCursor) {
      setStageCursor(nextCursor);
    }
  };

  // Swipe gesture detection on reader stage outside iframe
  const stageTouchRef = useRef<{ startX: number; startY: number; startTime: number }>({
    startX: 0,
    startY: 0,
    startTime: 0,
  });

  const handleStageTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    stageTouchRef.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      startTime: Date.now(),
    };
  };

  const handleStageTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.changedTouches[0];
    if (!touch) return;
    const deltaX = touch.clientX - stageTouchRef.current.startX;
    const deltaY = touch.clientY - stageTouchRef.current.startY;
    const elapsed = Date.now() - stageTouchRef.current.startTime;

    if (
      settings.flowMode === 'paginated' &&
      Math.abs(deltaX) >= 40 &&
      Math.abs(deltaX) > Math.abs(deltaY) * 1.2 &&
      elapsed <= 500
    ) {
      if (deltaX < 0) {
        next();
      } else {
        prev();
      }
    }
  };

  // Click detection on reading area (left = prev, right = next, center = toggle bar)
  const handleStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeFollowLink) {
      setActiveFollowLink(null);
    }

    // Ignore if text is currently selected
    if (state.selection) return;

    const isPaginated = settings.flowMode === 'paginated';
    if (!isPaginated) {
      setShowBars((prev) => !prev);
      return;
    }

    const globalX = e.clientX;
    const windowWidth = window.innerWidth;
    let containerRelativeX = -1;
    if (containerRef.current) {
      const cRect = containerRef.current.getBoundingClientRect();
      if (cRect.width > 0) {
        containerRelativeX = (globalX - cRect.left) / cRect.width;
      }
    }
    const isMobile = windowWidth < 768;
    const leftThreshold = isMobile ? 0.28 : 0.22;
    const rightThreshold = isMobile ? 0.72 : 0.78;

    const isLeftZone =
      globalX < windowWidth * leftThreshold ||
      (containerRelativeX >= 0 && containerRelativeX < leftThreshold);
    const isRightZone =
      globalX > windowWidth * rightThreshold ||
      (containerRelativeX > rightThreshold && containerRelativeX <= 1);

    if (isLeftZone) {
      prev();
    } else if (isRightZone) {
      next();
    } else {
      setShowBars((prev) => !prev);
    }
  };

  const isDoubleSpread =
    settings.flowMode === 'paginated' &&
    (settings.spreadMode === 'double' || settings.spreadMode === 'auto');

  const isSpreadOrRange =
    (state.endPage && state.endPage > state.currentPage) ||
    (isDoubleSpread && state.totalPages > state.currentPage);

  const formattedPageRange = isSpreadOrRange
    ? `${state.currentPage}–${state.endPage && state.endPage > state.currentPage ? state.endPage : Math.min(state.totalPages, state.currentPage + 1)}`
    : `${state.currentPage}`;

  const maxWidthClass = isDoubleSpread
    ? {
        narrow: 'max-w-4xl sm:max-w-5xl',
        normal: 'max-w-5xl sm:max-w-6xl',
        wide: 'max-w-7xl',
      }[settings.pageMargin]
    : {
        narrow: 'max-w-2xl',
        normal: 'max-w-4xl',
        wide: 'max-w-6xl',
      }[settings.pageMargin];

  const stagePaddingClass = {
    narrow: 'px-2.5 sm:px-4',
    normal: 'px-4 sm:px-8',
    wide: 'px-6 sm:px-14',
  }[settings.pageMargin];

  const isEink =
    settings.einkMode || resolvedTheme === 'eink-light' || resolvedTheme === 'eink-dark';

  return (
    <div
      className={`bg-surface text-on-surface relative flex h-screen w-screen flex-col overflow-hidden select-none ${
        isEink ? 'eink-mode' : ''
      }`}
    >
      {/* FLASH SCREEN REFRESH OVERLAY (E-INK GHOSTING CLEAR) */}
      {isFlashing && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-50 animate-pulse bg-black transition-none"
        />
      )}

      {/* TOP CONTROL BAR */}
      <header
        className={`fixed inset-x-0 top-0 z-30 ${
          isEink
            ? 'bg-surface border-on-surface border-b-2'
            : 'bg-surface-container/95 border-outline-variant/30 border-b backdrop-blur-md'
        } flex items-center justify-between gap-4 px-4 py-2.5 transition-transform duration-300 ${
          showBars ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="flex items-center gap-2">
          <IconButton
            size="sm"
            onClick={() => navigate('/')}
            aria-label="Kembali ke MyShelf"
            title="Kembali ke MyShelf"
          >
            <ArrowLeft size={18} />
          </IconButton>
          <div className="max-w-50 sm:max-w-md">
            <h2 className="text-on-surface line-clamp-1 text-xs font-semibold sm:text-sm">
              {state.bookData?.title || 'Memuat Buku...'}
            </h2>
            <p className="text-on-surface-variant line-clamp-1 text-[10px]">
              {state.chapterTitle || state.bookData?.author || ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Quick Clear E-Ink Screen Button (visible only when E-Ink mode is active) */}
          {isEink && (
            <IconButton
              size="sm"
              onClick={triggerFlashRefresh}
              title="Bersihkan Layar E-Ink (Flash Screen Refresh)"
            >
              <RefreshCw size={17} />
            </IconButton>
          )}

          <IconButton
            size="sm"
            active={isBookmarkedCurrent}
            onClick={handleToggleBookmark}
            title={isBookmarkedCurrent ? 'Hapus Penanda' : 'Tandai Halaman Ini (B)'}
          >
            <BookmarkIcon size={18} fill={isBookmarkedCurrent ? 'currentColor' : 'none'} />
          </IconButton>

          <IconButton
            size="sm"
            onClick={() => {
              setActivePanelTab('search');
              setPanelsOpen(true);
            }}
            title="Cari Teks (/)"
          >
            <Search size={18} />
          </IconButton>

          <IconButton
            size="sm"
            onClick={() => {
              setActivePanelTab('toc');
              setPanelsOpen(true);
            }}
            title="Daftar Isi (T)"
          >
            <List size={18} />
          </IconButton>

          <IconButton
            size="sm"
            active={showTTSBar}
            onClick={handleToggleTTS}
            title={showTTSBar ? 'Tutup Audio Player' : 'Dengarkan Buku (Audio TTS)'}
          >
            <Headphones size={18} />
          </IconButton>

          <IconButton size="sm" onClick={() => setSettingsOpen(true)} title="Pengaturan Tampilan">
            <Sliders size={18} />
          </IconButton>
        </div>
      </header>

      {/* READING STAGE */}
      <main
        onClick={handleStageClick}
        onMouseMove={handleStageMouseMove}
        onTouchStart={handleStageTouchStart}
        onTouchEnd={handleStageTouchEnd}
        style={{ cursor: stageCursor }}
        className={`h-full w-full flex-1 pt-16 ${
          showTTSBar ? 'pb-24 sm:pb-28' : 'pb-20 sm:pb-24'
        } ${stagePaddingClass} relative box-border flex items-center justify-center overflow-hidden`}
      >
        {/* Desktop Navigation Buttons Floating on Hover */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            prev();
          }}
          className="bg-surface-container/70 hover:bg-surface-container text-on-surface-variant hover:text-on-surface border-outline-variant/20 absolute top-1/2 left-3 z-20 hidden h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border opacity-0 shadow-sm transition-opacity hover:opacity-100 md:flex"
          title="Halaman Sebelumnya"
        >
          <ChevronLeft size={22} />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
          className="bg-surface-container/70 hover:bg-surface-container text-on-surface-variant hover:text-on-surface border-outline-variant/20 absolute top-1/2 right-3 z-20 hidden h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border opacity-0 shadow-sm transition-opacity hover:opacity-100 md:flex"
          title="Halaman Berikutnya"
        >
          <ChevronRight size={22} />
        </button>

        <div
          ref={containerRef}
          className={`h-full w-full ${maxWidthClass} relative mx-auto transition-all duration-200`}
        >
          {isDoubleSpread && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-4 left-1/2 z-10 hidden w-8 -translate-x-1/2 bg-linear-to-r from-transparent via-black/15 to-transparent opacity-30 md:block dark:via-black/35"
            />
          )}
        </div>

        {/* Loading Spinner */}
        {!state.isReady && (
          <div className="bg-surface absolute inset-0 z-10 flex flex-col items-center justify-center gap-3">
            <div className="border-primary h-8 w-8 animate-spin rounded-full border-3 border-t-transparent" />
            <p className="text-on-surface-variant text-xs font-medium">Mempersiapkan buku...</p>
          </div>
        )}

        {/* PAGE NUMBER DISPLAY ON BOOK CONTENT (RUNNING FOOTER) */}
        {state.isReady && (
          <div
            className={`absolute inset-x-0 bottom-2.5 sm:bottom-3 ${maxWidthClass} mx-auto ${stagePaddingClass} pointer-events-none z-10 flex items-center justify-between text-[11px] transition-opacity duration-300 select-none ${
              showBars || showTTSBar ? 'opacity-0' : 'opacity-100'
            } ${isEink ? 'text-on-surface font-bold' : 'text-on-surface-variant/75 font-medium'}`}
          >
            {/* Chapter / Book Title in bottom left corner */}
            <span className="max-w-[45%] truncate opacity-85">
              {state.chapterTitle || state.bookData?.title || ''}
            </span>

            {/* Page Indicator in bottom right corner */}
            <div className="ml-auto flex shrink-0 items-center gap-2 font-mono text-[11px]">
              {state.totalPages > 0 ? (
                <span className="text-on-surface font-semibold">
                  Hal {formattedPageRange} / {state.totalPages}
                </span>
              ) : (
                <span className="text-on-surface font-semibold">Hal {formattedPageRange}</span>
              )}
              <span className="font-sans text-[10px] opacity-70">
                · {Math.round(state.percentage * 100)}%
              </span>
            </div>
          </div>
        )}
      </main>

      {/* BOTTOM CONTROL BAR */}
      <footer
        className={`bg-surface-container/95 border-outline-variant/30 fixed inset-x-0 bottom-0 z-30 flex flex-col gap-2 border-t px-4 py-3 backdrop-blur-md transition-transform duration-300 sm:px-8 ${
          showBars ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Slider & Quick Page Step */}
        <div className="mx-auto flex w-full max-w-3xl items-center gap-4">
          <IconButton size="sm" onClick={prev} title="Halaman Sebelumnya">
            <ChevronLeft size={20} />
          </IconButton>

          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={state.percentage}
            onChange={(e) => goToPercentage(parseFloat(e.target.value))}
            title={`Halaman ${formattedPageRange}${state.totalPages > 0 ? ` / ${state.totalPages}` : ''} (${Math.round(state.percentage * 100)}%)`}
            className="accent-primary bg-surface-container-highest h-1.5 flex-1 cursor-pointer appearance-none rounded-lg"
          />

          <IconButton size="sm" onClick={next} title="Halaman Berikutnya">
            <ChevronRight size={20} />
          </IconButton>
        </div>

        {/* Reading Progress Indicator */}
        <div className="text-on-surface-variant mx-auto flex w-full max-w-3xl items-center justify-between px-2 text-[11px]">
          <span className="line-clamp-1 max-w-[50%]">{state.chapterTitle || 'Membaca'}</span>
          <div className="flex items-center gap-2 font-medium">
            {state.totalPages > 0 ? (
              <span>
                Hal {formattedPageRange} dari {state.totalPages} ·{' '}
              </span>
            ) : state.totalLocations > 0 ? (
              <span>
                Lokasi {state.currentLocation} / {state.totalLocations} ·{' '}
              </span>
            ) : null}
            <span className="text-on-surface font-semibold">
              {Math.round(state.percentage * 100)}%
            </span>
            {state.totalPages > (state.endPage || state.currentPage) && (
              <span className="text-primary bg-primary/10 rounded-md px-1.5 py-0.5 text-[10px] font-normal">
                Sisa ~
                {Math.max(
                  1,
                  Math.round(
                    ((state.totalPages - (state.endPage || state.currentPage)) * 250) /
                      (settings.readingSpeedWpm || 220)
                  )
                )}{' '}
                mnt
              </span>
            )}
          </div>
        </div>
      </footer>

      {/* FLOATING TEXT SELECTION BAR */}
      {state.selection && !showTTSBar && (
        <SelectionBar
          text={state.selection.text}
          onSelectColor={(color) => addHighlight(color)}
          onOpenNote={() => {
            setEditingNoteFor({
              quoteText: state.selection?.text || '',
              isExisting: false,
            });
          }}
          onOpenDictionary={() => setDictionaryWord(state.selection?.text || null)}
          onSpeakText={() => {
            if (state.selection?.text) {
              setShowTTSBar(true);
              tts.speakText(state.selection.text);
            }
          }}
          onClose={handleClearSelection}
        />
      )}

      {/* NOTE EDIT DIALOG (FOR NEW OR EXISTING HIGHLIGHT) */}
      <NoteDialog
        open={!!editingNoteFor || !!state.activeAnnotation}
        onClose={() => {
          setEditingNoteFor(null);
          clearActiveAnnotation();
        }}
        quoteText={editingNoteFor?.quoteText || state.activeAnnotation?.text || ''}
        initialNote={editingNoteFor?.annotation?.note || state.activeAnnotation?.note || ''}
        initialColor={
          editingNoteFor?.annotation?.color || state.activeAnnotation?.color || 'yellow'
        }
        isExisting={editingNoteFor?.isExisting || !!state.activeAnnotation}
        onSave={(note, color) => {
          if (editingNoteFor?.isExisting && editingNoteFor.annotation) {
            updateAnnotation(editingNoteFor.annotation.id, note, color);
          } else if (state.activeAnnotation) {
            updateAnnotation(state.activeAnnotation.id, note, color);
          } else if (state.selection) {
            addHighlight(color, note);
          }
          setEditingNoteFor(null);
          clearActiveAnnotation();
        }}
        onDelete={() => {
          const targetId = editingNoteFor?.annotation?.id || state.activeAnnotation?.id;
          if (targetId) {
            removeAnnotation(targetId);
          }
          setEditingNoteFor(null);
          clearActiveAnnotation();
        }}
      />

      {/* SETTINGS SHEET */}
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onFlashRefresh={triggerFlashRefresh}
      />

      {/* PANELS SHEET (TOC, SEARCH, BOOKMARKS, ANNOTATIONS) */}
      {state.bookData && (
        <Panels
          open={panelsOpen}
          onClose={() => setPanelsOpen(false)}
          initialTab={activePanelTab}
          book={state.bookData}
          toc={state.toc}
          bookmarks={bookmarks}
          annotations={annotations}
          activeChapter={state.chapterTitle}
          onJumpToCfi={goTo}
          onJumpToHref={goTo}
          onDeleteBookmark={async (id) => {
            await db.bookmarks.delete(id);
            refreshBookmarks();
          }}
          onEditAnnotation={(ann) => {
            setEditingNoteFor({
              annotation: ann,
              quoteText: ann.text,
              isExisting: true,
            });
            setPanelsOpen(false);
          }}
          onDeleteAnnotation={removeAnnotation}
          onSearch={searchBook}
        />
      )}

      {/* FOOTNOTE LIGHT-DISMISS DIALOG */}
      <FootnoteDialog
        footnote={activeFootnote}
        onClose={() => setActiveFootnote(null)}
        onJumpToSource={(href) => goTo(href)}
      />

      {/* IMAGE VIEWER LIGHTBOX */}
      <ImageViewerDialog image={activeImage} onClose={() => setActiveImage(null)} isDark={isDark} />

      {/* FOLLOW LINK FLOATING POPOVER */}
      <FollowLinkPopover
        linkData={activeFollowLink}
        onClose={() => setActiveFollowLink(null)}
        onFollow={(href) => goTo(href)}
      />

      {/* FLOATING TTS AUDIO PLAYER */}
      {showTTSBar && (
        <TTSPlayerBar
          tts={tts}
          onPlay={() => {
            if (tts.isPaused) {
              tts.resume();
            } else if (tts.totalSentences > 0 && !tts.isSpeakingSelection) {
              tts.start();
            } else {
              const pageText = getCurrentPageText();
              const sentences = splitIntoSentences(pageText);
              if (sentences.length > 0) {
                tts.start(sentences, false);
              }
            }
          }}
          onClose={() => {
            tts.stop();
            setShowTTSBar(false);
            handleClearSelection();
          }}
        />
      )}

      {/* DICTIONARY & TRANSLATION DIALOG (HYBRID) */}
      <DictionaryDialog word={dictionaryWord} onClose={() => setDictionaryWord(null)} />
    </div>
  );
};

export const ReaderPage: React.FC<ReaderPageProps> = ({ bookId }) => {
  const book = useLiveQuery(() => db.books.get(bookId), [bookId]);

  if (!book) {
    return (
      <div className="bg-surface text-on-surface flex h-screen w-screen flex-col items-center justify-center gap-3">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-3 border-t-transparent" />
        <p className="text-on-surface-variant text-xs font-medium">Memuat buku...</p>
      </div>
    );
  }

  if (book.format === 'pdf') {
    return <PdfReaderView bookId={bookId} />;
  }

  return <EpubReaderView bookId={bookId} />;
};
