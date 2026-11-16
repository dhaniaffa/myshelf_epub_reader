import { EpubCFI } from 'epubjs';

import { READER_EVENTS, THEME_STYLE_ID } from '@/config';
import { buildCss } from '@/lib/theme';
import { extractFootnote } from './footnoteExtractor';
import { extractReaderImageInfo } from './imageExtractor';
import { createNativeSwipeHandler } from './swipePhysics';

import type { ReaderSettings, ReaderTheme } from '@/types';
import type { Contents, Book as EpubBook, Rendition } from 'epubjs';

export interface SetupIframeListenersOptions {
  contents: Contents;
  bookRef: React.RefObject<EpubBook | null>;
  renditionRef: React.RefObject<Rendition | null>;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  settingsRef: React.RefObject<ReaderSettings>;
  themeRef: React.RefObject<Exclude<ReaderTheme, 'auto'>>;
  checkIsSelectionActive?: () => boolean;
  onClearSelection: () => void;
  onSelectText?: (selection: { cfiRange: string; text: string }) => void;
}

let lastOpenImageTime = 0;

/**
 * Dispatches the openImage custom event if the target contains image metadata.
 * Debounced with a 250ms window to prevent double execution from pointerup + click events.
 */
export function dispatchOpenImage(target: EventTarget | null): boolean {
  const imgInfo = extractReaderImageInfo(target);
  if (imgInfo && imgInfo.src) {
    const now = Date.now();
    if (now - lastOpenImageTime < 250) {
      return true;
    }
    lastOpenImageTime = now;

    const detail = imgInfo;
    const eventName = READER_EVENTS.openImage;

    // Dispatch across parent window, top window, and current document defaultView
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(eventName, { detail }));
      if (window.top && window.top !== window) {
        try {
          window.top.dispatchEvent(new CustomEvent(eventName, { detail }));
        } catch {
          // ignore
        }
      }
    }
    const docView = (target as Node)?.ownerDocument?.defaultView;
    if (docView && docView !== window && docView !== window.top) {
      try {
        docView.dispatchEvent(new CustomEvent(eventName, { detail }));
      } catch {
        // ignore
      }
    }
    return true;
  }
  return false;
}

/**
 * Ensures all images in a document are interactive, non-draggable (to prevent ghost-drag canceling clicks),
 * and directly bound to the image viewer trigger with both click and pointerup fallback.
 */
export function initDocumentImages(doc: Document): void {
  try {
    const bindElement = (imgEl: Element) => {
      imgEl.setAttribute('draggable', 'false');
      if (imgEl instanceof HTMLElement) {
        imgEl.style.cursor = 'zoom-in';
        imgEl.style.pointerEvents = 'auto';
      }

      let downX = 0;
      let downY = 0;
      let downTime = 0;

      imgEl.addEventListener(
        'pointerdown',
        (e: Event) => {
          const pe = e as PointerEvent;
          downX = pe.clientX;
          downY = pe.clientY;
          downTime = Date.now();
        },
        true
      );

      imgEl.addEventListener(
        'pointerup',
        (e: Event) => {
          const pe = e as PointerEvent;
          const dt = Date.now() - downTime;
          const dist = Math.hypot(pe.clientX - downX, pe.clientY - downY);
          if (dist < 10 && dt < 450 && dt > 0) {
            if (dispatchOpenImage(e.currentTarget || e.target)) {
              e.preventDefault();
              e.stopPropagation();
            }
          }
        },
        true
      );

      imgEl.addEventListener(
        'click',
        (e: Event) => {
          if (dispatchOpenImage(e.currentTarget || e.target)) {
            e.preventDefault();
            e.stopPropagation();
          }
        },
        true
      );
    };

    doc.querySelectorAll('img, image, svg, picture, figure').forEach(bindElement);

    // Dynamic MutationObserver to catch any deferred or dynamically inserted images in EPUB.js
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of Array.from(m.addedNodes)) {
          if (node instanceof Element) {
            if (node.matches('img, image, svg, picture, figure')) {
              bindElement(node);
            }
            node.querySelectorAll('img, image, svg, picture, figure').forEach(bindElement);
          }
        }
      }
    });

    if (doc.body) {
      observer.observe(doc.body, { childList: true, subtree: true });
    } else {
      doc.addEventListener('DOMContentLoaded', () => {
        if (doc.body) {
          doc.querySelectorAll('img, image, svg, picture, figure').forEach(bindElement);
          observer.observe(doc.body, { childList: true, subtree: true });
        }
      });
    }
  } catch {
    // ignore
  }
}

/**
 * Registers all event listeners inside the book iframe document.
 */
export function setupIframeListeners({
  contents,
  bookRef,
  renditionRef,
  containerRef,
  settingsRef,
  themeRef,
  checkIsSelectionActive,
  onClearSelection,
  onSelectText,
}: SetupIframeListenersOptions): void {
  // 1. Inject theme CSS
  const cssRules = buildCss(settingsRef.current, themeRef.current);
  const styleEl = contents.document.createElement('style');
  styleEl.id = THEME_STYLE_ID;
  styleEl.innerHTML = cssRules;
  contents.document.head.appendChild(styleEl);

  try {
    contents.document.documentElement.style.webkitUserSelect = 'text';
    contents.document.documentElement.style.userSelect = 'text';
    if (settingsRef.current.flowMode === 'paginated') {
      contents.document.documentElement.style.touchAction = 'pan-y';
    }
    if (contents.document.body) {
      contents.document.body.style.webkitUserSelect = 'text';
      contents.document.body.style.userSelect = 'text';
      if (settingsRef.current.flowMode === 'paginated') {
        contents.document.body.style.touchAction = 'pan-y';
      }
      contents.document.body.style.webkitTouchCallout = 'default';
    }
  } catch {
    // ignore
  }

  // 2. Image click & pointerup handler (image viewer lightbox)
  initDocumentImages(contents.document);

  contents.document.addEventListener(
    'pointerup',
    (e: PointerEvent) => {
      // In WebKitGTK where drag-suppression might cancel standard click
      if (e.button === 0 && dispatchOpenImage(e.target)) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true
  );

  contents.document.addEventListener(
    'click',
    (e: MouseEvent) => {
      if (dispatchOpenImage(e.target)) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true
  );

  // 2b. Image 2-finger pinch handler (instantly opens image viewer lightbox on pinch)
  contents.document.addEventListener(
    'touchstart',
    (e: TouchEvent) => {
      if (e.touches.length === 2) {
        if (dispatchOpenImage(e.target)) {
          e.preventDefault();
        }
      }
    },
    { passive: false }
  );

  // 3. Footnote click interception & follow link handler
  contents.document.addEventListener(
    'click',
    async (e: MouseEvent) => {
      const link = (e.target as HTMLElement)?.closest('a');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href || href === '#' || href.startsWith('javascript:')) return;

      // Attempt smart footnote extraction without jumping chapters
      const footnoteData = await extractFootnote(link, contents, bookRef.current);
      if (footnoteData) {
        e.preventDefault();
        e.stopPropagation();
        window.dispatchEvent(
          new CustomEvent(READER_EVENTS.openFootnote, {
            detail: footnoteData,
          })
        );
        return;
      }

      // Not a footnote / no footnote content -> Open Follow Link popover
      e.preventDefault();
      e.stopPropagation();

      let globalX = e.clientX;
      let globalY = e.clientY;
      try {
        const frameEl = contents.document.defaultView?.frameElement as HTMLIFrameElement | null;
        if (frameEl) {
          const rect = frameEl.getBoundingClientRect();
          const linkRect = link.getBoundingClientRect();
          globalX = rect.left + linkRect.left + linkRect.width / 2;
          globalY = rect.top + linkRect.top;
        }
      } catch {
        globalX = e.clientX;
        globalY = e.clientY;
      }

      window.dispatchEvent(
        new CustomEvent(READER_EVENTS.followLink, {
          detail: {
            href,
            text: link.textContent?.trim() || '',
            x: globalX,
            y: globalY,
          },
        })
      );
    },
    true
  );

  // 4. Automatically detect and handle text selection (supporting both Desktop and Touch)
  let hasActiveSelection = false;
  let lastSelectionTime = 0;
  let mouseDownDocX = 0;
  let mouseDownDocY = 0;
  let isMouseDragging = false;

  const getSelectionObj = () => {
    try {
      const winSel = contents.window?.getSelection();
      if (winSel && winSel.rangeCount > 0) {
        const text = winSel.toString().trim();
        const range = winSel.getRangeAt(0);
        if (text.length > 0 || !range.collapsed) {
          return winSel;
        }
      }
    } catch {
      // ignore
    }
    try {
      const docSel = contents.document?.getSelection?.();
      if (docSel && docSel.rangeCount > 0) {
        const text = docSel.toString().trim();
        const range = docSel.getRangeAt(0);
        if (text.length > 0 || !range.collapsed) {
          return docSel;
        }
      }
    } catch {
      // ignore
    }
    return null;
  };

  const handleSelection = () => {
    try {
      const sel = getSelectionObj();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (range.collapsed) return;

      let text = sel.toString().trim();
      if (!text) {
        text = range.toString().trim();
      }
      if (!text) return;

      let cfiRange = '';
      try {
        const contentsWithSection = contents as unknown as {
          cfiFromRange?: (range: Range) => string;
          section?: { cfiFromRange?: (range: Range) => string };
        };
        if (typeof contentsWithSection.cfiFromRange === 'function') {
          cfiRange = contentsWithSection.cfiFromRange(range);
        } else if (typeof contentsWithSection.section?.cfiFromRange === 'function') {
          cfiRange = contentsWithSection.section.cfiFromRange(range);
        } else {
          cfiRange = new EpubCFI(range, contents.cfiBase).toString();
        }
      } catch (err) {
        console.warn('Failed to calculate cfiRange from selection:', err);
      }

      lastSelectionTime = Date.now();
      hasActiveSelection = true;
      onSelectText?.({ cfiRange, text });
    } catch (e) {
      console.error('Error handling selection:', e);
    }
  };

  // Track mouse gestures inside book iframe using intra-document coordinates
  contents.document.addEventListener('mousedown', (e: MouseEvent) => {
    mouseDownDocX = e.clientX;
    mouseDownDocY = e.clientY;
    isMouseDragging = false;
  });

  contents.document.addEventListener('mousemove', (e: MouseEvent) => {
    if (e.buttons > 0) {
      const deltaX = Math.abs(e.clientX - mouseDownDocX);
      const deltaY = Math.abs(e.clientY - mouseDownDocY);
      if (deltaX > 6 || deltaY > 6) {
        isMouseDragging = true;
      }
    }
  });

  // Desktop mouse and keyboard selection handlers
  const onDocMouseUp = (e: MouseEvent) => {
    const deltaX = Math.abs(e.clientX - mouseDownDocX);
    const deltaY = Math.abs(e.clientY - mouseDownDocY);
    if (deltaX > 6 || deltaY > 6) {
      isMouseDragging = true;
    }
    handleSelection();
    setTimeout(handleSelection, 25);
    setTimeout(handleSelection, 100);
  };
  contents.document.addEventListener('mouseup', onDocMouseUp);
  contents.document.addEventListener('pointerup', onDocMouseUp);
  contents.window?.addEventListener('mouseup', onDocMouseUp);
  contents.window?.addEventListener('pointerup', onDocMouseUp);

  const onWindowMouseUp = () => {
    handleSelection();
    setTimeout(handleSelection, 25);
  };
  window.addEventListener('mouseup', onWindowMouseUp);
  window.addEventListener('pointerup', onWindowMouseUp);

  contents.window?.addEventListener('unload', () => {
    window.removeEventListener('mouseup', onWindowMouseUp);
    window.removeEventListener('pointerup', onWindowMouseUp);
  });

  contents.document.addEventListener('keyup', (e: KeyboardEvent) => {
    if (
      e.shiftKey ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown'
    ) {
      handleSelection();
      setTimeout(handleSelection, 25);
    }
  });

  // 5. Detect touch swipe gestures inside book iframe with native continuous physics
  let touchStartTime = 0;

  const swipeHandler = createNativeSwipeHandler({
    getContainer: () => containerRef?.current ?? null,
    canSwipe: () => {
      const hasSelection = checkIsSelectionActive ? checkIsSelectionActive() : false;
      const isPaginated = settingsRef.current.flowMode === 'paginated';
      return isPaginated && !hasSelection;
    },
    isEink: () => {
      const theme = themeRef.current;
      return settingsRef.current.einkMode || theme === 'eink-light' || theme === 'eink-dark';
    },
    onNext: () => renditionRef.current?.next(),
    onPrev: () => renditionRef.current?.prev(),
  });

  contents.document.addEventListener(
    'touchstart',
    (e: TouchEvent) => {
      const sel = getSelectionObj();
      if (sel && sel.toString().trim().length > 0) return;
      touchStartTime = Date.now();
      swipeHandler.handleTouchStart(e);
    },
    { passive: true }
  );

  contents.document.addEventListener(
    'touchmove',
    (e: TouchEvent) => {
      swipeHandler.handleTouchMove(e);
    },
    { passive: false }
  );

  contents.document.addEventListener(
    'touchend',
    (e: TouchEvent) => {
      const sel = getSelectionObj();
      if (sel && sel.toString().trim().length > 0) {
        handleSelection();
        return;
      }
      swipeHandler.handleTouchEnd(e);
    },
    { passive: true }
  );

  contents.document.addEventListener(
    'touchcancel',
    () => {
      swipeHandler.handleTouchCancel();
    },
    { passive: true }
  );

  // 6. Click handler for navigation and toggling control bars from within iframe
  contents.document.addEventListener('click', (e: MouseEvent) => {
    // Always prioritize image clicks over navigation and gesture handlers
    if (dispatchOpenImage(e.target)) {
      isMouseDragging = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (swipeHandler.wasSwipeGesture()) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (isMouseDragging) {
      isMouseDragging = false;
      e.preventDefault();
      e.stopPropagation();
      handleSelection();
      return;
    }

    // Ignore multi-clicks (e.g. double-click or triple-click for word/line selection)
    if (e.detail > 1) {
      handleSelection();
      return;
    }

    const sel = getSelectionObj();
    if (sel && sel.toString().trim().length > 0) {
      handleSelection();
      return;
    }

    // If user held touch down for > 300ms (selection / long-press gesture on mobile/touchscreen),
    // this click is a synthetic event from finger release, NOT an intentional dismiss tap!
    if (touchStartTime > 0 && Date.now() - touchStartTime > 300) {
      return;
    }

    // If selection was made very recently (e.g. within 500ms), do not clear
    if (Date.now() - lastSelectionTime < 500) {
      return;
    }

    const wasSelectionActive = checkIsSelectionActive
      ? checkIsSelectionActive()
      : hasActiveSelection;
    if (wasSelectionActive) {
      hasActiveSelection = false;
      onClearSelection();
      return;
    }

    const target = e.target as HTMLElement;
    if (target.closest('a') || extractReaderImageInfo(target)) return;

    // Clicking inside the book content iframe toggles control bars; it NEVER flips pages.
    // Page flipping by click is strictly reserved for the blank spaces outside the book content.
    window.dispatchEvent(new CustomEvent(READER_EVENTS.toggleBars));
  });

  // 8. Keyboard handler inside iframe
  contents.document.addEventListener('keydown', (e: KeyboardEvent) => {
    const activeEl = contents.document.activeElement;
    if (activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA') return;

    if (settingsRef.current.volumeKeysNavigation !== false) {
      if (e.key === 'AudioVolumeDown' || e.key === 'VolumeDown') {
        e.preventDefault();
        contents.window.getSelection()?.removeAllRanges();
        renditionRef.current?.next();
        return;
      } else if (e.key === 'AudioVolumeUp' || e.key === 'VolumeUp') {
        e.preventDefault();
        contents.window.getSelection()?.removeAllRanges();
        renditionRef.current?.prev();
        return;
      }
    }

    if (e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
      e.preventDefault();
      contents.window.getSelection()?.removeAllRanges();
      renditionRef.current?.next();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
      e.preventDefault();
      contents.window.getSelection()?.removeAllRanges();
      renditionRef.current?.prev();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      contents.window.getSelection()?.removeAllRanges();
      window.dispatchEvent(new CustomEvent(READER_EVENTS.toggleBars));
    } else {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: e.key,
          code: e.code,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
          bubbles: true,
        })
      );
    }
  });
}
