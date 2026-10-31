import { describe, expect, it } from 'vitest';

import { cleanFootnoteElement, isFootnoteLink, resolvePath } from './footnoteExtractor';

describe('Footnote Extractor Utility (footnoteExtractor.ts)', () => {
  describe('isFootnoteLink', () => {
    it('detects footnote links by role or epub:type attribute', () => {
      const link1 = document.createElement('a');
      link1.setAttribute('role', 'doc-noteref');
      link1.setAttribute('href', '#fn1');
      expect(isFootnoteLink(link1)).toBe(true);

      const link2 = document.createElement('a');
      link2.setAttribute('epub:type', 'noteref');
      link2.setAttribute('href', '#fn2');
      expect(isFootnoteLink(link2)).toBe(true);
    });

    it('detects footnote links by class name', () => {
      const link = document.createElement('a');
      link.className = 'footnote-ref fn-1';
      link.setAttribute('href', '#footnote-1');
      expect(isFootnoteLink(link)).toBe(true);
    });

    it('detects footnote links inside or containing superscript', () => {
      const sup = document.createElement('sup');
      const link = document.createElement('a');
      link.setAttribute('href', '#fn1');
      link.textContent = '1';
      sup.appendChild(link);
      expect(isFootnoteLink(link)).toBe(true);

      const linkWithChildSup = document.createElement('a');
      linkWithChildSup.setAttribute('href', '#fn2');
      linkWithChildSup.innerHTML = '<sup>2</sup>';
      expect(isFootnoteLink(linkWithChildSup)).toBe(true);
    });

    it('detects footnote pattern in text with anchor href', () => {
      const link = document.createElement('a');
      link.setAttribute('href', '#ref1');
      link.textContent = '[1]';
      expect(isFootnoteLink(link)).toBe(true);

      const symbolLink = document.createElement('a');
      symbolLink.setAttribute('href', '#note');
      symbolLink.textContent = '*';
      expect(isFootnoteLink(symbolLink)).toBe(true);
    });

    it('returns false for standard non-footnote links', () => {
      const link = document.createElement('a');
      link.setAttribute('href', 'chapter2.xhtml');
      link.textContent = 'Menuju Bab Selanjutnya';
      expect(isFootnoteLink(link)).toBe(false);
    });
  });

  describe('resolvePath', () => {
    it('correctly resolves relative paths against a base path', () => {
      expect(resolvePath('OEBPS/Text/chapter1.xhtml', 'notes.xhtml')).toBe(
        'OEBPS/Text/notes.xhtml'
      );
      expect(resolvePath('OEBPS/Text/chapter1.xhtml', '../notes.xhtml')).toBe('OEBPS/notes.xhtml');
      expect(resolvePath('OEBPS/chapter1.xhtml', './sub/notes.xhtml')).toBe(
        'OEBPS/sub/notes.xhtml'
      );
    });
  });

  describe('cleanFootnoteElement', () => {
    it('removes backlink characters and anchor tags', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <p>
          Ini adalah teks penjelasan catatan kaki.
          <a href="#ref1" role="doc-backlink">↩</a>
        </p>
      `;

      const cleaned = cleanFootnoteElement(container);
      expect(cleaned).toContain('Ini adalah teks penjelasan catatan kaki.');
      expect(cleaned).not.toContain('↩');
      expect(cleaned).not.toContain('doc-backlink');
    });

    it('strips script tags and inline onclick handlers', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <p onclick="alert('hack')">Catatan aman.</p>
        <script>alert('danger');</script>
      `;

      const cleaned = cleanFootnoteElement(container);
      expect(cleaned).toContain('Catatan aman.');
      expect(cleaned).not.toContain('onclick');
      expect(cleaned).not.toContain('<script>');
    });
  });
});
