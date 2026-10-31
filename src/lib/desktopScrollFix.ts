/**
 * Desktop Scroll Fix for Linux / WebKitGTK
 *
 * In Linux desktop environments running WebKitGTK (such as Tauri v2),
 * GTK overlay scrollbars or hardware compositing can drop mouse wheel events
 * over document content, causing scrolling to only work when hovering over the scrollbar.
 *
 * This normalizer checks in the next animation frame whether native scrolling occurred.
 * If native scrolling was dropped by the OS/WebKitGTK layer, it gracefully falls back
 * to scrolling the window without double-scrolling working environments.
 */

export function initDesktopScrollFix(): void {
  if (typeof window === 'undefined') return;

  // Only run on non-touch desktop environments
  const isTouchDevice =
    'ontouchstart' in window && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  if (isTouchDevice) return;

  window.addEventListener(
    'wheel',
    (e: WheelEvent) => {
      if (e.defaultPrevented || Math.abs(e.deltaY) < 1) return;

      // Ignore if cursor is inside an iframe (EPUB reader)
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest?.('iframe')) return;

      // Check if target or any ancestor has its own internal scrollable container
      let el = target;
      while (el && el !== document.body && el !== document.documentElement) {
        if (el instanceof Element) {
          const style = window.getComputedStyle(el);
          if (
            (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
            el.scrollHeight > el.clientHeight
          ) {
            // Let internal scroll container handle its own scrolling
            return;
          }
        }
        el = el.parentElement;
      }

      // Check if the overall document has vertical overflow
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll <= 2) return;

      const startY = window.scrollY;

      // Check after the current event loop turn if native scroll moved the window
      requestAnimationFrame(() => {
        // If native scrolling moved the window, do nothing (avoids double scroll).
        // If native scrolling was dropped by WebKitGTK, apply the scroll delta directly.
        if (window.scrollY === startY && !e.defaultPrevented) {
          window.scrollBy({
            top: e.deltaY,
            left: 0,
            behavior: 'auto',
          });
        }
      });
    },
    { passive: true }
  );
}
