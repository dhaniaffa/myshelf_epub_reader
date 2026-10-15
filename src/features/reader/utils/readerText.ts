import type { Rendition } from 'epubjs';

/**
 * Retrieves text currently visible in the active reader viewport
 */
export function getCurrentPageText(
  rendition: Rendition | null,
  container: HTMLElement | null
): string {
  if (!rendition) return '';

  // 1. Primary priority: Extract via rendition CFI range
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = rendition as any;
    const loc = r.location || r.currentLocation?.();
    if (loc?.start?.cfi && loc?.end?.cfi) {
      const startRange = r.getRange(loc.start.cfi);
      const endRange = r.getRange(loc.end.cfi);
      if (startRange && endRange) {
        if (startRange.startContainer?.ownerDocument === endRange.endContainer?.ownerDocument) {
          const doc = startRange.startContainer.ownerDocument;
          const range = doc.createRange();
          range.setStart(startRange.startContainer, startRange.startOffset);
          range.setEnd(endRange.endContainer, endRange.endOffset);
          const text = range.toString().trim();
          if (text.length > 0) {
            return text;
          }
        } else {
          const t1 = startRange.toString().trim();
          const t2 = endRange.toString().trim();
          const combined = [t1, t2].filter(Boolean).join('\n\n');
          if (combined.length > 0) {
            return combined;
          }
        }
      }
    }
  } catch (e) {
    console.warn('Failed to read text from CFI range:', e);
  }

  // 2. Fallback: Extract text elements overlapping with container viewport
  try {
    const iframe = container?.querySelector('iframe');
    if (iframe && iframe.contentDocument && iframe.contentWindow) {
      const doc = iframe.contentDocument;
      const win = iframe.contentWindow;
      const viewportWidth = win.innerWidth || iframe.clientWidth;
      const viewportHeight = win.innerHeight || iframe.clientHeight;

      const textElements = doc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote');
      const visibleTexts: string[] = [];

      const innerContainer =
        (container?.querySelector('.epub-container') as HTMLElement) || container;
      const cRect = innerContainer ? innerContainer.getBoundingClientRect() : null;
      const iRect = iframe.getBoundingClientRect();

      for (let i = 0; i < textElements.length; i++) {
        const el = textElements[i] as HTMLElement;
        const text = el.innerText?.trim();
        if (!text) continue;

        const rect = el.getBoundingClientRect();
        let isVisible = false;

        if (cRect) {
          const elScreenLeft = rect.left + iRect.left;
          const elScreenRight = rect.right + iRect.left;
          const elScreenTop = rect.top + iRect.top;
          const elScreenBottom = rect.bottom + iRect.top;

          const horzOverlap = elScreenRight > cRect.left + 5 && elScreenLeft < cRect.right - 5;
          const vertOverlap = elScreenBottom > cRect.top + 5 && elScreenTop < cRect.bottom - 5;
          isVisible = horzOverlap && vertOverlap;
        } else {
          isVisible =
            rect.right > 0 &&
            rect.left < viewportWidth &&
            rect.bottom > 0 &&
            rect.top < viewportHeight;
        }

        if (isVisible) {
          visibleTexts.push(text);
        }
      }

      if (visibleTexts.length > 0) {
        return visibleTexts.join('\n\n');
      }
    }
  } catch (e) {
    console.warn('Failed to extract visible text elements:', e);
  }

  // 3. Final fallback: iframe body innerText
  try {
    const iframe = container?.querySelector('iframe');
    return iframe?.contentDocument?.body?.innerText?.trim() || '';
  } catch {
    return '';
  }
}
