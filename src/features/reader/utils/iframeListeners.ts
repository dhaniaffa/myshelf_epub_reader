import { READER_EVENTS, THEME_STYLE_ID } from '@/config';
import { buildCss } from '@/lib/theme';

import type { ReaderSettings, ReaderTheme } from '@/types';
import type { Contents, Book as EpubBook, Rendition } from 'epubjs';

export interface SetupIframeListenersOptions {
  contents: Contents;
  bookRef: React.RefObject<EpubBook | null>;
  renditionRef: React.RefObject<Rendition | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  settingsRef: React.RefObject<ReaderSettings>;
  themeRef: React.RefObject<Exclude<ReaderTheme, 'auto'>>;
  onClearSelection: () => void;
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
  onClearSelection,
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

  // 4. Automatically clear floating selection when no text is selected
  let selTimeout: number | undefined;
  contents.document.addEventListener('selectionchange', () => {
    window.clearTimeout(selTimeout);
    selTimeout = window.setTimeout(() => {
      const sel = contents.window.getSelection();
      if (!sel || sel.isCollapsed || sel.toString().trim().length === 0) {
        onClearSelection();
      }
    }, 80);
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

    const sel = contents.window.getSelection();
    if (sel && sel.toString().trim().length > 0) return;

    onClearSelection();

    const target = e.target as HTMLElement;
    if (target.closest('a') || target.closest('img')) return;

    let globalX = e.clientX;
    try {
      const frameEl = contents.document.defaultView?.frameElement as HTMLIFrameElement | null;
      if (frameEl) {
        const rect = frameEl.getBoundingClientRect();
        globalX = rect.left + e.clientX;
      }
    } catch {
      globalX = e.clientX;
    }

    let containerRelativeX = -1;
    if (containerRef.current) {
      const cRect = containerRef.current.getBoundingClientRect();
      if (cRect.width > 0) {
        containerRelativeX = (globalX - cRect.left) / cRect.width;
      }
    }

    const windowWidth = window.innerWidth;
    const isPaginated = settingsRef.current.flowMode === 'paginated';
    const isMobile = windowWidth < 768;
    const leftThreshold = isMobile ? 0.28 : 0.22;
    const rightThreshold = isMobile ? 0.72 : 0.78;

    const isLeftZone =
      globalX < windowWidth * leftThreshold ||
      (containerRelativeX >= 0 && containerRelativeX < leftThreshold);
    const isRightZone =
      globalX > windowWidth * rightThreshold ||
      (containerRelativeX > rightThreshold && containerRelativeX <= 1);

    if (isPaginated && isLeftZone) {
      renditionRef.current?.prev();
    } else if (isPaginated && isRightZone) {
      renditionRef.current?.next();
    } else {
      window.dispatchEvent(new CustomEvent(READER_EVENTS.toggleBars));
    }
  });

  // 7. Adjust cursor style when hovering over left/right navigation zones in iframe
  contents.document.addEventListener('mousemove', (e: MouseEvent) => {
    if (settingsRef.current.flowMode !== 'paginated') {
      contents.document.documentElement.style.cursor = 'auto';
      return;
    }
    let globalX = e.clientX;
    try {
      const frameEl = contents.document.defaultView?.frameElement as HTMLIFrameElement | null;
      if (frameEl) {
        const rect = frameEl.getBoundingClientRect();
        globalX = rect.left + e.clientX;
      }
    } catch {
      globalX = e.clientX;
    }

    let containerRelativeX = -1;
    if (containerRef.current) {
      const cRect = containerRef.current.getBoundingClientRect();
      if (cRect.width > 0) {
        containerRelativeX = (globalX - cRect.left) / cRect.width;
      }
    }

    const windowWidth = window.innerWidth;
    const isLeftZone =
      globalX < windowWidth * 0.22 || (containerRelativeX >= 0 && containerRelativeX < 0.25);
    const isRightZone =
      globalX > windowWidth * 0.78 || (containerRelativeX > 0.75 && containerRelativeX <= 1);

    if (isLeftZone || isRightZone) {
      contents.document.documentElement.style.cursor = 'pointer';
    } else {
      contents.document.documentElement.style.cursor = 'auto';
    }
  });

  contents.document.addEventListener('mouseleave', () => {
    contents.document.documentElement.style.cursor = 'auto';
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
