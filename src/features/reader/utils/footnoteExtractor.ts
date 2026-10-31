import type { FootnoteData } from '@/types';
import type { Book, Contents } from 'epubjs';

/**
 * Checks whether an anchor link exhibits strong signals of being a footnote reference.
 */
export function isFootnoteLink(link: HTMLAnchorElement): boolean {
  const epubType = (link.getAttribute('epub:type') || '').toLowerCase();
  const role = (link.getAttribute('role') || '').toLowerCase();
  const className = (link.className || '').toLowerCase();
  const href = link.getAttribute('href') || '';

  if (
    epubType.includes('noteref') ||
    epubType.includes('footnote') ||
    role.includes('doc-noteref') ||
    className.includes('footnote') ||
    className.includes('noteref') ||
    className.includes('fn-') ||
    className.includes('endnote')
  ) {
    return true;
  }

  // Check parent or child superscript tags
  if (link.querySelector('sup') !== null || link.parentElement?.tagName === 'SUP') {
    return true;
  }

  // Check if link text is a footnote indicator e.g. [1], (1), *, 1, †, ‡
  const text = (link.textContent || '').trim();
  const isFootnotePattern = /^\[?\s*(?:\d+|[a-zA-Z]|[ivxlcdm]+|[*†‡§#])\s*\]?$/i.test(text);

  if (isFootnotePattern && href.includes('#')) {
    return true;
  }

  return false;
}

/**
 * Normalizes and resolves a relative path against a base path.
 */
export function resolvePath(base: string, relative: string): string {
  const stack = base.split('/').slice(0, -1);
  const parts = relative.split('/');

  for (const part of parts) {
    if (part === '.' || part === '') continue;
    if (part === '..') {
      if (stack.length > 0) stack.pop();
    } else {
      stack.push(part);
    }
  }

  return stack.join('/');
}

/**
 * Cleans extracted footnote HTML by removing backlink arrows, scripts, and dangerous attributes.
 */
export function cleanFootnoteElement(el: HTMLElement): string {
  const clone = el.cloneNode(true) as HTMLElement;

  // 1. Remove backlink anchors (e.g. ↩, ↑, [back], role="doc-backlink")
  clone.querySelectorAll('a').forEach((a) => {
    const text = (a.textContent || '').trim();
    const role = (a.getAttribute('role') || '').toLowerCase();
    const ariaLabel = (a.getAttribute('aria-label') || '').toLowerCase();
    const cls = (a.className || '').toLowerCase();

    const isBacklink =
      role.includes('doc-backlink') ||
      cls.includes('backlink') ||
      ariaLabel.includes('back') ||
      ariaLabel.includes('return') ||
      /^(?:↩|↑|←|⮐|\[back\]|\[return\]|back|return|\^)+$/i.test(text);

    if (isBacklink) {
      a.remove();
    }
  });

  // 2. Strip dangerous elements
  clone.querySelectorAll('script, style, iframe, object, embed').forEach((node) => node.remove());

  // 3. Remove inline event handlers
  clone.querySelectorAll('*').forEach((node) => {
    const attrs = Array.from(node.attributes);
    for (const attr of attrs) {
      if (attr.name.toLowerCase().startsWith('on')) {
        node.removeAttribute(attr.name);
      }
    }
  });

  return clone.innerHTML.trim();
}

/**
 * Finds the actual footnote content container starting from a target element.
 * Handles cases where the target ID is on an empty anchor tag.
 */
function resolveContentContainer(el: HTMLElement): HTMLElement {
  // If target element is an empty anchor (e.g. <a id="fn1"></a>)
  if (el.tagName === 'A' && (el.textContent || '').trim().length === 0) {
    if (el.parentElement && el.parentElement.textContent?.trim()) {
      return el.parentElement;
    }
    if (el.nextElementSibling && (el.nextElementSibling as HTMLElement).textContent?.trim()) {
      return el.nextElementSibling as HTMLElement;
    }
  }

  // If target is an <li> inside an <ol class="footnotes">, use the <li>
  return el;
}

/**
 * Attempts to extract footnote content without triggering chapter navigation.
 */
export async function extractFootnote(
  link: HTMLAnchorElement,
  contents: Contents,
  book?: Book | null
): Promise<FootnoteData | null> {
  const href = link.getAttribute('href');
  if (!href || href === '#' || href.startsWith('javascript:')) return null;

  const hasHash = href.includes('#');
  const looksLikeFootnote = isFootnoteLink(link);

  if (!hasHash && !looksLikeFootnote) {
    return null;
  }

  const [rawTargetFile, targetId] = href.split('#');
  if (!targetId) return null;

  let footnoteHtml = '';

  // 1. Try finding targetId in current chapter iframe
  const localEl = contents.document.getElementById(targetId);
  if (localEl) {
    footnoteHtml = cleanFootnoteElement(resolveContentContainer(localEl));
  }

  // 2. If not found locally, attempt cross-chapter resolution if book is available
  if (!footnoteHtml && book && rawTargetFile) {
    try {
      const currentSectionHref =
        (contents as unknown as { section?: { href?: string } }).section?.href || '';
      const resolvedPath = currentSectionHref
        ? resolvePath(currentSectionHref, rawTargetFile)
        : rawTargetFile;

      // Look up section in spine
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const spine = (book as any).spine;
      let item = spine?.get?.(rawTargetFile) || spine?.get?.(resolvedPath);

      if (!item && spine?.spineItems) {
        // Fallback: match by filename
        const cleanTarget = rawTargetFile.split('/').pop()?.split('#')[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        item = spine.spineItems.find((s: any) => {
          const sName = s.href?.split('/')?.pop();
          return sName && cleanTarget && sName === cleanTarget;
        });
      }

      if (item) {
        const doc = (await item.load(book.load.bind(book))) as Document;
        const remoteEl = doc.getElementById(targetId);
        if (remoteEl) {
          footnoteHtml = cleanFootnoteElement(resolveContentContainer(remoteEl));
        }
      }
    } catch (err) {
      console.warn('Footnote extraction across chapters failed:', err);
    }
  }

  // If no content could be extracted, return null to allow default/follow-link flow
  if (!footnoteHtml || footnoteHtml.trim().length === 0) {
    return null;
  }

  // Extract note number if available
  const rawText = (link.textContent || '').trim();
  const noteNumberMatch = rawText.match(/\d+|[a-zA-Z]+|[*†‡§#]/);
  const noteNumber = noteNumberMatch ? noteNumberMatch[0] : undefined;

  // Calculate coordinates and bounding rect for popover positioning
  let globalX: number;
  let globalY: number;
  let anchorRect: FootnoteData['anchorRect'] | undefined;

  try {
    const frameEl = contents.document.defaultView?.frameElement as HTMLIFrameElement | null;
    const frameRect = frameEl ? frameEl.getBoundingClientRect() : { left: 0, top: 0 };
    const linkRect = link.getBoundingClientRect();

    globalX = frameRect.left + linkRect.left + linkRect.width / 2;
    globalY = frameRect.top + linkRect.top;

    anchorRect = {
      top: frameRect.top + linkRect.top,
      bottom: frameRect.top + linkRect.bottom,
      left: frameRect.left + linkRect.left,
      right: frameRect.left + linkRect.right,
      width: linkRect.width,
      height: linkRect.height,
    };
  } catch {
    // If iframe rect lookup fails, use 0
    globalX = 0;
    globalY = 0;
  }

  const title = noteNumber
    ? `Catatan [${noteNumber}]`
    : rawText
      ? `Catatan ${rawText}`
      : 'Catatan Kaki';

  return {
    id: targetId,
    title,
    content: footnoteHtml,
    targetHref: href,
    x: globalX,
    y: globalY,
    anchorRect,
    noteNumber,
  };
}
