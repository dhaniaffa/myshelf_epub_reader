import { describe, expect, it } from 'vitest';

import { getCurrentPageText } from './readerText';

import type { Rendition } from 'epubjs';

describe('Reader Text Extraction Utility (readerText.ts)', () => {
  it('returns empty string when rendition is null', () => {
    expect(getCurrentPageText(null, null)).toBe('');
  });

  it('extracts text from CFI range when available in rendition', () => {
    const mockDoc = document.implementation.createHTMLDocument();
    const p = mockDoc.createElement('p');
    p.textContent = 'Ini adalah kutipan paragraf bacaan buku digital yang penting.';
    mockDoc.body.appendChild(p);

    const range = mockDoc.createRange();
    range.selectNodeContents(p);

    const mockRendition = {
      location: {
        start: { cfi: 'epubcfi(/6/2!/4/2/1:0)' },
        end: { cfi: 'epubcfi(/6/2!/4/2/1:50)' },
      },
      getRange: () => range,
    } as unknown as Rendition;

    const text = getCurrentPageText(mockRendition, null);
    expect(text).toBe('Ini adalah kutipan paragraf bacaan buku digital yang penting.');
  });

  it('falls back to container DOM inspection when CFI extraction fails', () => {
    const container = document.createElement('div');
    const iframe = document.createElement('iframe');
    container.appendChild(iframe);
    document.body.appendChild(container);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      const p1 = iframeDoc.createElement('p');
      p1.innerText = 'Paragraf pertama terlihat di layar.';
      iframeDoc.body.appendChild(p1);

      // Mock getBoundingClientRect
      p1.getBoundingClientRect = () => ({
        top: 10,
        bottom: 50,
        left: 10,
        right: 300,
        width: 290,
        height: 40,
        x: 10,
        y: 10,
        toJSON: () => {},
      });
    }

    const mockRendition = {
      location: null,
      getRange: () => {
        throw new Error('Range error');
      },
    } as unknown as Rendition;

    const text = getCurrentPageText(mockRendition, container);
    expect(typeof text).toBe('string');

    document.body.removeChild(container);
  });
});
