import { EpubCFI } from 'epubjs';

import { READER_EVENTS, THEME_STYLE_ID } from '@/config';
import { buildCss } from '@/lib/theme';

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

/**
 * Registers all event listeners inside the book iframe document.
 */
export function setupIframeListeners({
  contents,
  bookRef,
  renditionRef,
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

  // 2. Image click handler (image viewer lightbox)
  contents.document.addEventListener(
    'click',
    (e: MouseEvent) => {
      const img = (e.target as HTMLElement)?.closest('img');
      if (img && img.src) {
        e.preventDefault();
        e.stopPropagation();
        window.dispatchEvent(
          new CustomEvent(READER_EVENTS.openImage, {
            detail: {
              src: img.src,
              alt: img.getAttribute('alt') || '',
            },
          })
        );
      }
    },
    true
  );

  // 3. Footnote click interception & follow link handler
  contents.document.addEventListener(
    'click',
    async (e: MouseEvent) => {
      const link = (e.target as HTMLElement)?.closest('a');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href || href === '#' || href.startsWith('javascript:')) return;

      const epubType = link.getAttribute('epub:type') || '';
      const role = link.getAttribute('role') || '';
      const className = link.className || '';
      const isNoteref =
        epubType.includes('noteref') ||
        role.includes('doc-noteref') ||
        className.includes('footnote') ||
        className.includes('noteref') ||
        className.includes('fn-') ||
        link.querySelector('sup') !== null ||
        link.parentElement?.tagName === 'SUP';

      if (isNoteref || href.includes('#')) {
        const [, targetId] = href.split('#');
        if (targetId) {
          const footnoteEl: HTMLElement | null = contents.document.getElementById(targetId);
          let footnoteHtml = '';

          if (footnoteEl) {
            const clone = footnoteEl.cloneNode(true) as HTMLElement;
            clone.querySelectorAll('a').forEach((a) => {
              const text = a.textContent?.trim() || '';
              if (
                text === '↩' ||
                text === '↑' ||
                a.getAttribute('role')?.includes('doc-backlink')
              ) {
                a.remove();
              }
            });
            footnoteHtml = clone.innerHTML;
          } else if (bookRef.current) {
            try {
              const [targetFile] = href.split('#');
              const item = bookRef.current.spine.get(targetFile || href);
              if (item) {
                const doc = await item.load(bookRef.current.load.bind(bookRef.current));
                const el = (doc as Document).getElementById(targetId);
                if (el) {
                  const clone = el.cloneNode(true) as HTMLElement;
                  clone.querySelectorAll('a').forEach((a) => {
                    const text = a.textContent?.trim() || '';
                    if (
                      text === '↩' ||
                      text === '↑' ||
                      a.getAttribute('role')?.includes('doc-backlink')
                    ) {
                      a.remove();
                    }
                  });
                  footnoteHtml = clone.innerHTML;
                }
              }
            } catch {
              // ignore
            }
          }

          if (footnoteHtml.trim().length > 0) {
            e.preventDefault();
            e.stopPropagation();
            window.dispatchEvent(
              new CustomEvent(READER_EVENTS.openFootnote, {
                detail: {
                  title: link.textContent?.trim()
                    ? `Catatan ${link.textContent.trim()}`
                    : 'Catatan Kaki',
                  content: footnoteHtml,
                  targetHref: href,
                },
              })
            );
            return;
          }
        }
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
  let selTimeout: number | undefined;
  let hasActiveSelection = false;
  let lastSelectionTime = 0;
  let mouseDownX = 0;
  let mouseDownY = 0;
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

  // Track mouse gestures inside book iframe
  contents.document.addEventListener('mousedown', (e: MouseEvent) => {
    mouseDownX = e.clientX;
    mouseDownY = e.clientY;
    isMouseDragging = false;
  });

  contents.document.addEventListener('mousemove', (e: MouseEvent) => {
    if (e.buttons > 0) {
      const deltaX = Math.abs(e.clientX - mouseDownX);
      const deltaY = Math.abs(e.clientY - mouseDownY);
      if (deltaX > 4 || deltaY > 4) {
        isMouseDragging = true;
      }
    }
  });

  const onWindowMouseMove = (e: MouseEvent) => {
    if (e.buttons > 0 && (mouseDownX > 0 || mouseDownY > 0)) {
      const deltaX = Math.abs(e.clientX - mouseDownX);
      const deltaY = Math.abs(e.clientY - mouseDownY);
      if (deltaX > 4 || deltaY > 4) {
        isMouseDragging = true;
      }
    }
  };
  window.addEventListener('mousemove', onWindowMouseMove);

  // Selectionchange listener: only handle selection when text is selected;
  // NEVER clear selection here to prevent premature dismiss on iframe blur/focus events.
  contents.document.addEventListener('selectionchange', () => {
    window.clearTimeout(selTimeout);
    selTimeout = window.setTimeout(() => {
      const sel = getSelectionObj();
      if (sel) {
        handleSelection();
      }
    }, 120);
  });

  // Desktop mouse and keyboard selection handlers
  const onDocMouseUp = (e: MouseEvent) => {
    const deltaX = Math.abs(e.clientX - mouseDownX);
    const deltaY = Math.abs(e.clientY - mouseDownY);
    if (deltaX > 4 || deltaY > 4) {
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

  const onWindowMouseUp = (e: MouseEvent) => {
    const deltaX = Math.abs(e.clientX - mouseDownX);
    const deltaY = Math.abs(e.clientY - mouseDownY);
    if (deltaX > 4 || deltaY > 4) {
      isMouseDragging = true;
    }
    handleSelection();
    setTimeout(handleSelection, 25);
    setTimeout(handleSelection, 100);
  };
  window.addEventListener('mouseup', onWindowMouseUp);
  window.addEventListener('pointerup', onWindowMouseUp);

  contents.window.addEventListener('unload', () => {
    window.removeEventListener('mouseup', onWindowMouseUp);
    window.removeEventListener('pointerup', onWindowMouseUp);
    window.removeEventListener('mousemove', onWindowMouseMove);
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

  // 5. Detect touch swipe gestures inside book iframe
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;
  let isSwipeGesture = false;

  contents.document.addEventListener(
    'touchstart',
    (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchStartTime = Date.now();
      isSwipeGesture = false;
    },
    { passive: true }
  );

  contents.document.addEventListener(
    'touchmove',
    (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
      if (Math.abs(deltaX) > 20 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
        isSwipeGesture = true;
      }
    },
    { passive: true }
  );

  contents.document.addEventListener(
    'touchend',
    (e: TouchEvent) => {
      const sel = contents.window.getSelection();
      if (sel && sel.toString().trim().length > 0) return;

      const touch = e.changedTouches[0];
      if (!touch) return;

      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
      const elapsed = Date.now() - touchStartTime;
      const isPaginated = settingsRef.current.flowMode === 'paginated';

      // Minimum 40px horizontal swipe in < 500ms
      if (
        isPaginated &&
        Math.abs(deltaX) >= 40 &&
        Math.abs(deltaX) > Math.abs(deltaY) * 1.2 &&
        elapsed <= 500
      ) {
        isSwipeGesture = true;
        if (deltaX < 0) {
          renditionRef.current?.next();
        } else {
          renditionRef.current?.prev();
        }
      }
    },
    { passive: true }
  );

  // 6. Click handler for navigation and toggling control bars from within iframe
  contents.document.addEventListener('click', (e: MouseEvent) => {
    if (isSwipeGesture) {
      isSwipeGesture = false;
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

    // If selection was made very recently (e.g. mouse drag just ended within 80ms), do not clear
    if (Date.now() - lastSelectionTime < 80) {
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
    if (target.closest('a') || target.closest('img')) return;

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
