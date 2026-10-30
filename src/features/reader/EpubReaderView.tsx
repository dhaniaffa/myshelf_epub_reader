import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { READER_EVENTS } from '@/config';
import { EpubBottomBar } from '@/features/reader/components/epub/EpubBottomBar';
import { EpubHeaderBar } from '@/features/reader/components/epub/EpubHeaderBar';
import { EpubModals } from '@/features/reader/components/epub/EpubModals';
import { EpubRunningFooter } from '@/features/reader/components/epub/EpubRunningFooter';
import { useReaderGestures } from '@/features/reader/hooks/useReaderGestures';
import { useReaderHotkeys } from '@/features/reader/hooks/useReaderHotkeys';
import { useReaderSelectionManager } from '@/features/reader/hooks/useReaderSelectionManager';
import { SelectionBar } from '@/features/reader/SelectionBar';
import { TTSPlayerBar } from '@/features/reader/TTSPlayerBar';
import { useReader } from '@/features/reader/useReader';
import { splitIntoSentences, useTTS } from '@/features/reader/useTTS';
import { db } from '@/lib/db';
import { isDarkTheme, THEME_PALETTES } from '@/lib/theme';
import { useSettingsStore } from '@/store/settings';
import { toast } from '@/store/toast';

import type { PanelTab } from '@/features/reader/panels';
import type { UseTTSReturn } from '@/features/reader/useTTS';
import type { Bookmark, FollowLinkData, FootnoteData, ImageViewData, ReaderTheme } from '@/types';

export interface EpubReaderViewProps {
  bookId: string;
}

export const EpubReaderView: React.FC<EpubReaderViewProps> = ({ bookId }) => {
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

  const isEink =
    settings.einkMode || resolvedTheme === 'eink-light' || resolvedTheme === 'eink-dark';

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

  // Selection & Annotations manager
  const {
    editingNoteFor,
    setEditingNoteFor,
    matchingAnnotation,
    handleClearSelection,
    handleOpenNote,
    handleSaveNote,
    handleDeleteHighlight,
    handleSelectColor,
  } = useReaderSelectionManager({
    selection: state.selection,
    activeAnnotation: state.activeAnnotation,
    annotations,
    chapterTitle: state.chapterTitle,
    containerRef,
    showTTSBar,
    isSpeakingSelection: tts.isSpeakingSelection,
    getCurrentPageText,
    clearSelection,
    clearActiveAnnotation,
    addHighlight,
    updateAnnotation,
    removeAnnotation,
    onResetTTSSentences: tts.reset,
    splitIntoSentences,
  });

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

  // Keyboard navigation & Hardware Volume keys
  useReaderHotkeys({
    volumeKeysNavigation: settings.volumeKeysNavigation,
    next,
    prev,
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

  // Stage gestures (swipe, margin clicks, dynamic cursor)
  const {
    stageCursor,
    handleStageMouseMove,
    handleStageTouchStart,
    handleStageTouchMove,
    handleStageTouchEnd,
    handleStageTouchCancel,
    handleStageClick,
  } = useReaderGestures({
    containerRef,
    flowMode: settings.flowMode,
    hasSelection: Boolean(state.selection),
    activeFollowLink,
    isEink,
    onClearSelection: handleClearSelection,
    onDismissFollowLink: () => setActiveFollowLink(null),
    onToggleBars: () => setShowBars((prev) => !prev),
    next,
    prev,
  });

  // Listen for custom reader events from book iframe
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

  const isDoubleSpread =
    settings.flowMode === 'paginated' &&
    (settings.spreadMode === 'double' || settings.spreadMode === 'auto');

  const isSpreadOrRange =
    (state.endPage && state.endPage > state.currentPage) ||
    (isDoubleSpread && state.totalPages > state.currentPage);

  const formattedPageRange = isSpreadOrRange
    ? `${state.currentPage}–${state.endPage && state.endPage > state.currentPage ? state.endPage : Math.min(state.totalPages, state.currentPage + 1)}`
    : `${state.currentPage}`;

  const formattedRemainingTime = useMemo(() => {
    const end = state.endPage || state.currentPage;
    if (!state.totalPages || state.totalPages <= end) return null;
    const pagesLeft = state.totalPages - end;
    const minutes = Math.max(1, Math.round((pagesLeft * 250) / (settings.readingSpeedWpm || 220)));
    if (minutes < 60) {
      return `~${minutes} mnt`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return `~${hours} jam`;
    }
    return `~${hours}j ${mins}m`;
  }, [state.totalPages, state.endPage, state.currentPage, settings.readingSpeedWpm]);

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

  return (
    <div
      className={`bg-surface text-on-surface relative flex h-screen w-screen flex-col overflow-hidden ${
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
      <EpubHeaderBar
        showBars={showBars}
        isEink={isEink}
        bookTitle={state.bookData?.title}
        chapterTitle={state.chapterTitle}
        author={state.bookData?.author}
        isBookmarked={isBookmarkedCurrent}
        showTTSBar={showTTSBar}
        onFlashRefresh={triggerFlashRefresh}
        onToggleBookmark={handleToggleBookmark}
        onOpenSearch={() => {
          setActivePanelTab('search');
          setPanelsOpen(true);
        }}
        onOpenToc={() => {
          setActivePanelTab('toc');
          setPanelsOpen(true);
        }}
        onToggleTTS={handleToggleTTS}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* READING STAGE */}
      <main
        onClick={handleStageClick}
        onMouseMove={handleStageMouseMove}
        onTouchStart={handleStageTouchStart}
        onTouchMove={handleStageTouchMove}
        onTouchEnd={handleStageTouchEnd}
        onTouchCancel={handleStageTouchCancel}
        style={{
          cursor: stageCursor,
          touchAction: settings.flowMode === 'paginated' ? 'pan-y' : 'auto',
        }}
        className={`h-full w-full flex-1 pt-16 ${
          showTTSBar ? 'pb-24 sm:pb-28' : 'pb-20 sm:pb-24'
        } ${stagePaddingClass} relative box-border flex items-center justify-center overflow-hidden`}
      >
        {/* Desktop Navigation Buttons (Visible with subtle opacity on non-mobile screens) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            prev();
          }}
          className="bg-surface-container/70 hover:bg-surface-container text-on-surface-variant hover:text-on-surface border-outline-variant/20 absolute top-1/2 left-3 z-20 hidden h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border opacity-40 shadow-sm transition-all hover:scale-105 hover:opacity-100 sm:left-4 md:flex"
          title="Halaman Sebelumnya"
        >
          <ChevronLeft size={22} />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
          className="bg-surface-container/70 hover:bg-surface-container text-on-surface-variant hover:text-on-surface border-outline-variant/20 absolute top-1/2 right-3 z-20 hidden h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border opacity-40 shadow-sm transition-all hover:scale-105 hover:opacity-100 sm:right-4 md:flex"
          title="Halaman Berikutnya"
        >
          <ChevronRight size={22} />
        </button>

        <div
          ref={containerRef}
          style={{
            touchAction: settings.flowMode === 'paginated' ? 'pan-y' : 'auto',
          }}
          className={`h-full w-full ${maxWidthClass} relative mx-auto select-text`}
        ></div>

        {/* Loading Spinner */}
        {!state.isReady && (
          <div className="bg-surface absolute inset-0 z-10 flex flex-col items-center justify-center gap-3">
            <div className="border-primary h-8 w-8 animate-spin rounded-full border-3 border-t-transparent" />
            <p className="text-on-surface-variant text-xs font-medium">Mempersiapkan buku...</p>
          </div>
        )}

        {/* PAGE NUMBER DISPLAY ON BOOK CONTENT (RUNNING FOOTER) */}
        {state.isReady && (
          <EpubRunningFooter
            showBars={showBars}
            showTTSBar={showTTSBar}
            isEink={isEink}
            maxWidthClass={maxWidthClass}
            stagePaddingClass={stagePaddingClass}
            chapterTitle={state.chapterTitle}
            bookTitle={state.bookData?.title}
            formattedPageRange={formattedPageRange}
            totalPages={state.totalPages}
            percentage={state.percentage}
          />
        )}
      </main>

      {/* BOTTOM CONTROL BAR */}
      <EpubBottomBar
        showBars={showBars}
        percentage={state.percentage}
        formattedPageRange={formattedPageRange}
        totalPages={state.totalPages}
        totalLocations={state.totalLocations}
        currentLocation={state.currentLocation}
        chapterTitle={state.chapterTitle}
        formattedRemainingTime={formattedRemainingTime}
        onPrev={prev}
        onNext={next}
        onGoToPercentage={goToPercentage}
      />

      {/* FLOATING TEXT SELECTION BAR */}
      {state.selection && !showTTSBar && (
        <SelectionBar
          text={state.selection.text}
          isBottomBarVisible={showBars}
          currentColor={matchingAnnotation?.color}
          hasExistingNote={Boolean(matchingAnnotation?.note)}
          isExistingHighlight={Boolean(matchingAnnotation)}
          onSelectColor={handleSelectColor}
          onOpenNote={handleOpenNote}
          onDeleteHighlight={matchingAnnotation ? handleDeleteHighlight : undefined}
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

      {/* READER MODALS (Note, Settings, Panels, Footnote, Image, Link, Dictionary) */}
      <EpubModals
        settingsOpen={settingsOpen}
        onCloseSettings={() => setSettingsOpen(false)}
        onFlashRefresh={triggerFlashRefresh}
        panelsOpen={panelsOpen}
        onClosePanels={() => setPanelsOpen(false)}
        activePanelTab={activePanelTab}
        bookData={state.bookData}
        toc={state.toc}
        bookmarks={bookmarks}
        annotations={annotations}
        chapterTitle={state.chapterTitle}
        onGoTo={goTo}
        onDeleteBookmark={async (id) => {
          await db.bookmarks.delete(id);
          refreshBookmarks();
        }}
        onEditAnnotationFromPanels={(ann) => {
          setEditingNoteFor({
            annotation: ann,
            quoteText: ann.text,
            isExisting: true,
          });
          setPanelsOpen(false);
        }}
        onDeleteAnnotation={removeAnnotation}
        onSearch={searchBook}
        editingNoteFor={editingNoteFor}
        activeAnnotation={state.activeAnnotation}
        onCloseNote={() => {
          setEditingNoteFor(null);
          clearActiveAnnotation();
        }}
        onSaveNote={handleSaveNote}
        onDeleteNote={handleDeleteHighlight}
        activeFootnote={activeFootnote}
        onCloseFootnote={() => setActiveFootnote(null)}
        activeImage={activeImage}
        onCloseImage={() => setActiveImage(null)}
        isDark={isDark}
        activeFollowLink={activeFollowLink}
        onCloseFollowLink={() => setActiveFollowLink(null)}
        dictionaryWord={dictionaryWord}
        onCloseDictionary={() => setDictionaryWord(null)}
      />
    </div>
  );
};
