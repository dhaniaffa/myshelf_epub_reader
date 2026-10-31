import React from 'react';

import type { PdfOutlineItem } from '@/lib/pdf';
import type { PdfPageColor, ReaderTheme, SearchResult, TocItem } from '@/types';
import type { PdfDocumentProxy } from '@/types/pdfjs';

/**
 * Maps PDF document outline items recursively to TOC items.
 */
export function mapPdfOutlineToToc(items: PdfOutlineItem[]): TocItem[] {
  return items.map((it) => ({
    id: it.id,
    label: it.label,
    href: `page:${it.pageNumber}`,
    subitems: it.items ? mapPdfOutlineToToc(it.items) : undefined,
  }));
}

/**
 * Maps PDF search matches to the reader search result format.
 */
export function mapPdfSearchResults(
  searchResults: { pageNumber: number; matchText: string }[]
): SearchResult[] {
  return searchResults.map((sr) => ({
    cfi: `page:${sr.pageNumber}`,
    excerpt: sr.matchText,
    chapterTitle: `Halaman ${sr.pageNumber}`,
  }));
}

/**
 * Resolves PDF link destination (internal named destination or reference) to a 1-indexed page number.
 */
export async function resolvePdfDestination(
  pdfDoc: PdfDocumentProxy | null | undefined,
  dest: unknown
): Promise<number | null> {
  if (!pdfDoc || !dest) return null;
  try {
    let explicitDest: unknown = dest;
    if (typeof dest === 'string') {
      explicitDest = await pdfDoc.getDestination(dest);
    }
    if (Array.isArray(explicitDest) && explicitDest.length > 0) {
      const destRef = explicitDest[0];
      if (typeof destRef === 'number') {
        return destRef + 1; // 0-indexed to 1-indexed
      }
      if (destRef && typeof destRef === 'object') {
        const pageIdx = await pdfDoc.getPageIndex(destRef as { num: number; gen: number });
        return pageIdx + 1;
      }
    }
  } catch (err) {
    console.warn('Failed to resolve PDF link destination:', err);
  }
  return null;
}

/**
 * Returns adaptive canvas CSS filter style based on reader theme, E-Ink mode, and independent PDF page color.
 */
export function getPdfCanvasFilterStyle(
  resolvedTheme: Exclude<ReaderTheme, 'auto'>,
  isEink: boolean,
  pdfPageColor: PdfPageColor = 'auto'
): React.CSSProperties {
  if (isEink) {
    return { filter: 'grayscale(1) contrast(1.2)' };
  }

  // Independent PDF page background color overrides
  if (pdfPageColor === 'light') {
    return {};
  }
  if (pdfPageColor === 'dark') {
    return { filter: 'invert(0.9) hue-rotate(180deg) contrast(1.05) brightness(0.95)' };
  }
  if (pdfPageColor === 'sepia') {
    return { filter: 'sepia(0.35) contrast(0.96) brightness(0.98)' };
  }

  // 'auto' follows the reader color theme
  switch (resolvedTheme) {
    case 'dark':
    case 'oled':
    case 'midnight':
    case 'charcoal':
    case 'slate':
    case 'sepia-dark':
    case 'midnight-lavender':
    case 'graphite-blue':
    case 'mocha':
    case 'navy':
    case 'plum':
    case 'moss':
    case 'teal-dusk':
    case 'ash-rose':
    case 'coffee':
    case 'nord':
      return { filter: 'invert(0.9) hue-rotate(180deg) contrast(1.05) brightness(0.95)' };
    case 'sepia':
    case 'parchment':
    case 'paper':
    case 'rose':
    case 'peach':
    case 'sand':
    case 'butter':
    case 'olive':
      return { filter: 'sepia(0.35) contrast(0.96) brightness(0.98)' };
    case 'lavender':
    case 'mauve':
      return { filter: 'hue-rotate(270deg) contrast(0.98) brightness(0.98)' };
    case 'misty':
    case 'sky':
    case 'mint':
    case 'mist':
      return { filter: 'hue-rotate(200deg) contrast(0.98) brightness(0.98)' };
    default:
      return {};
  }
}
