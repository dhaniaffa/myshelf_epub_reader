import { describe, expect, it } from 'vitest';

import { parseOpdsXml } from './opds';

describe('OPDS Feed Parser (src/lib/opds.ts)', () => {
  const sampleOpdsXml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:opds="http://opds-spec.org/2010/catalog">
  <id>urn:myshelf:catalog</id>
  <title>Katalog Pustaka Digital</title>
  <subtitle>Buku domain publik pilihan</subtitle>
  <icon>/assets/catalog-icon.png</icon>
  <link rel="self" href="/opds/root.xml" type="application/atom+xml;profile=opds-catalog" />
  <link rel="next" href="/opds/page2.xml" type="application/atom+xml" />
  <link rel="search" href="/opds/search.xml?q={searchTerms}" type="application/opds-publication+json" />
  <link rel="subsection" href="/opds/fiction.xml" title="Fiksi &amp; Sastra" type="application/atom+xml" />

  <entry>
    <title>Petualangan Sherlock Holmes</title>
    <id>urn:book:1</id>
    <author>
      <name>Arthur Conan Doyle</name>
    </author>
    <summary>&lt;b&gt;Kisah misteri&lt;/b&gt; detektif terkenal dari London.</summary>
    <link rel="http://opds-spec.org/image" href="/covers/sherlock.jpg" type="image/jpeg" />
    <link rel="http://opds-spec.org/acquisition" href="/books/sherlock.epub" type="application/epub+zip" title="Unduh EPUB" />
  </entry>

  <entry>
    <title>Kumpulan Makalah Filosofi</title>
    <id>urn:book:2</id>
    <author>
      <name>Plato</name>
    </author>
    <summary>Dialog filsafat klasik.</summary>
    <link rel="http://opds-spec.org/thumbnail" href="/covers/plato_thumb.jpg" type="image/jpeg" />
    <link rel="http://opds-spec.org/acquisition" href="/books/plato.pdf" type="application/pdf" title="Unduh PDF" />
  </entry>
</feed>`;

  it('parses feed-level metadata (title, subtitle, icon, pagination, search)', () => {
    const result = parseOpdsXml(sampleOpdsXml, 'https://pustaka.example.com');

    expect(result.title).toBe('Katalog Pustaka Digital');
    expect(result.subtitle).toBe('Buku domain publik pilihan');
    expect(result.icon).toBe('https://pustaka.example.com/assets/catalog-icon.png');
    expect(result.nextUrl).toBe('https://pustaka.example.com/opds/page2.xml');
    expect(result.searchUrl).toBe('https://pustaka.example.com/opds/search.xml?q={searchTerms}');
    expect(result.subsections).toHaveLength(1);
    expect(result.subsections[0].title).toBe('Fiksi & Sastra');
    expect(result.subsections[0].href).toBe('https://pustaka.example.com/opds/fiction.xml');
  });

  it('extracts book entries with sanitized summary, author, cover, and download URLs', () => {
    const result = parseOpdsXml(sampleOpdsXml, 'https://pustaka.example.com');

    expect(result.books).toHaveLength(2);

    const firstBook = result.books[0];
    expect(firstBook.id).toBe('urn:book:1');
    expect(firstBook.title).toBe('Petualangan Sherlock Holmes');
    expect(firstBook.author).toBe('Arthur Conan Doyle');
    expect(firstBook.summary).toBe('Kisah misteri detektif terkenal dari London.');
    expect(firstBook.coverUrl).toBe('https://pustaka.example.com/covers/sherlock.jpg');
    expect(firstBook.downloadUrl).toBe('https://pustaka.example.com/books/sherlock.epub');
    expect(firstBook.format).toBe('epub');

    const secondBook = result.books[1];
    expect(secondBook.id).toBe('urn:book:2');
    expect(secondBook.title).toBe('Kumpulan Makalah Filosofi');
    expect(secondBook.author).toBe('Plato');
    expect(secondBook.coverUrl).toBe('https://pustaka.example.com/covers/plato_thumb.jpg');
    expect(secondBook.downloadUrl).toBe('https://pustaka.example.com/books/plato.pdf');
    expect(secondBook.format).toBe('pdf');
  });

  it('throws an error when given invalid or malformed XML', () => {
    const malformedXml = `<feed><title>Unclosed Tag`;
    expect(() => parseOpdsXml(malformedXml, 'https://pustaka.example.com')).toThrowError(
      /format feed opds xml tidak valid/i
    );
  });
});
