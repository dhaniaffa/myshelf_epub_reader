import { describe, expect, it } from 'vitest';

import { getPdfCanvasFilterStyle, mapPdfOutlineToToc } from './pdfUtils';

import type { PdfOutlineItem } from '@/lib/pdf';

describe('PDF Utilities (pdfUtils.ts)', () => {
  describe('getPdfCanvasFilterStyle', () => {
    it('returns empty object for default light theme without overrides', () => {
      expect(getPdfCanvasFilterStyle('light', false, 'auto')).toEqual({});
    });

    it('inverts colors for dark and charcoal themes', () => {
      const darkStyle = getPdfCanvasFilterStyle('dark', false, 'auto');
      expect(darkStyle.filter).toContain('invert(0.9)');
      expect(darkStyle.filter).toContain('hue-rotate(180deg)');

      const charcoalStyle = getPdfCanvasFilterStyle('charcoal', false, 'auto');
      expect(charcoalStyle.filter).toContain('invert(0.9)');
    });

    it('applies sepia and contrast adjustments for sepia theme', () => {
      const sepiaStyle = getPdfCanvasFilterStyle('sepia', false, 'auto');
      expect(sepiaStyle.filter).toContain('sepia(0.35)');
      expect(sepiaStyle.filter).toContain('contrast(0.96)');
    });

    it('applies grayscale and contrast for e-ink mode', () => {
      const einkStyle = getPdfCanvasFilterStyle('light', true, 'auto');
      expect(einkStyle.filter).toContain('grayscale(1)');
      expect(einkStyle.filter).toContain('contrast(1.2)');
    });

    it('respects pdfPageColor overrides over app theme', () => {
      // Force dark paper override even if theme is light
      const darkOverride = getPdfCanvasFilterStyle('light', false, 'dark');
      expect(darkOverride.filter).toContain('invert(0.9)');

      // Force sepia paper override even if theme is dark
      const sepiaOverride = getPdfCanvasFilterStyle('dark', false, 'sepia');
      expect(sepiaOverride.filter).toContain('sepia(0.35)');

      // Force light paper override even if theme is dark
      const lightOverride = getPdfCanvasFilterStyle('dark', false, 'light');
      expect(lightOverride).toEqual({});
    });
  });

  describe('mapPdfOutlineToToc', () => {
    it('recursively transforms PDF outline items into nested TOC items', () => {
      const rawOutline: PdfOutlineItem[] = [
        {
          id: 'item-1',
          label: 'Bab 1: Pendahuluan',
          pageNumber: 1,
          items: [
            {
              id: 'item-1-1',
              label: 'Subbab 1.1: Latar Belakang',
              pageNumber: 2,
              items: [],
            },
          ],
        },
        {
          id: 'item-2',
          label: 'Bab 2: Pembahasan',
          pageNumber: 10,
        },
      ];

      const toc = mapPdfOutlineToToc(rawOutline);

      expect(toc).toHaveLength(2);
      expect(toc[0].id).toBe('item-1');
      expect(toc[0].label).toBe('Bab 1: Pendahuluan');
      expect(toc[0].href).toBe('page:1');
      expect(toc[0].subitems).toHaveLength(1);
      expect(toc[0].subitems?.[0].label).toBe('Subbab 1.1: Latar Belakang');
      expect(toc[0].subitems?.[0].href).toBe('page:2');
      expect(toc[1].id).toBe('item-2');
      expect(toc[1].label).toBe('Bab 2: Pembahasan');
      expect(toc[1].href).toBe('page:10');
      expect(toc[1].subitems).toBeUndefined();
    });

    it('handles empty outline gracefully', () => {
      expect(mapPdfOutlineToToc([])).toEqual([]);
    });
  });
});
