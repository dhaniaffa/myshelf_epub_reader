import JSZip from 'jszip';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  formatFileSize,
  hashBuffer,
  readFastEpubMetadata,
  readFullMetadata,
  readMetadata,
} from './epub';

describe('Fast EPUB Metadata & Helper (src/lib/epub.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('formatFileSize', () => {
    it('formats bytes into readable human strings', () => {
      expect(formatFileSize(0)).toBe('');
      expect(formatFileSize(null)).toBe('');
      expect(formatFileSize(500)).toBe('500 B');
      expect(formatFileSize(2048)).toBe('2.0 KB');
      expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
    });
  });

  describe('hashBuffer', () => {
    it('calculates SHA-256 hex string for buffer', async () => {
      const buffer = new TextEncoder().encode('Hello EPUB World').buffer;
      const hash = await hashBuffer(buffer);
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64);
    });

    it('calculates SHA-256 for Blob input', async () => {
      const blob = new Blob(['Sample Book Content'], { type: 'text/plain' });
      const hash = await hashBuffer(blob);
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64);
    });
  });

  describe('readFastEpubMetadata', () => {
    async function createMockEpubZip(options: {
      title?: string;
      creator?: string;
      publisher?: string;
      date?: string;
      description?: string;
      language?: string;
      identifier?: string;
      includeCover?: boolean;
      coverType?: 'epub3' | 'epub2' | 'fallback';
    }): Promise<ArrayBuffer> {
      const zip = new JSZip();

      // 1. mimetype
      zip.file('mimetype', 'application/epub+zip');

      // 2. container.xml
      zip.file(
        'META-INF/container.xml',
        `<?xml version="1.0"?>
        <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
          <rootfiles>
            <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
          </rootfiles>
        </container>`
      );

      // 3. content.opf
      let manifestItems = `<item id="chapter1" href="chap1.xhtml" media-type="application/xhtml+xml"/>`;
      let metaExtra = '';

      if (options.includeCover) {
        if (options.coverType === 'epub3') {
          manifestItems += `\n<item id="cover-img" href="images/cover.jpg" media-type="image/jpeg" properties="cover-image"/>`;
        } else if (options.coverType === 'epub2') {
          metaExtra += `\n<meta name="cover" content="cover-art-id"/>`;
          manifestItems += `\n<item id="cover-art-id" href="images/cover.jpg" media-type="image/jpeg"/>`;
        } else {
          // fallback
          manifestItems += `\n<item id="item-cover" href="cover_page.jpg" media-type="image/jpeg"/>`;
        }

        // Add dummy cover image data (minimal 1x1 GIF / JPEG buffer)
        const dummyImageData = new Uint8Array([
          0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
        ]);
        const coverPath =
          options.coverType === 'fallback' ? 'OEBPS/cover_page.jpg' : 'OEBPS/images/cover.jpg';
        zip.file(coverPath, dummyImageData);
      }

      const opfXml = `<?xml version="1.0" encoding="utf-8"?>
      <package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id">
        <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
          <dc:title>${options.title || 'Judul Uji Coba'}</dc:title>
          <dc:creator>${options.creator || 'Penulis Uji Coba'}</dc:creator>
          ${options.publisher ? `<dc:publisher>${options.publisher}</dc:publisher>` : ''}
          ${options.date ? `<dc:date>${options.date}</dc:date>` : ''}
          ${options.description ? `<dc:description>${options.description}</dc:description>` : ''}
          ${options.language ? `<dc:language>${options.language}</dc:language>` : ''}
          ${options.identifier ? `<dc:identifier id="pub-id">${options.identifier}</dc:identifier>` : ''}
          ${metaExtra}
        </metadata>
        <manifest>
          ${manifestItems}
        </manifest>
        <spine>
          <itemref idref="chapter1"/>
        </spine>
      </package>`;

      zip.file('OEBPS/content.opf', opfXml);
      zip.file('OEBPS/chap1.xhtml', '<html><body><p>Isi bab buku</p></body></html>');

      return await zip.generateAsync({ type: 'arraybuffer' });
    }

    it('extracts metadata quickly from valid EPUB 3 archive', async () => {
      const buffer = await createMockEpubZip({
        title: 'Misteri Kota Tua',
        creator: 'Budi Santoso',
        publisher: 'Pustaka Abadi',
        date: '2024-03-15',
        description: 'Buku cerita fiksi petualangan',
        language: 'id',
        identifier: 'urn:isbn:9781234567890',
        includeCover: true,
        coverType: 'epub3',
      });

      const meta = await readFastEpubMetadata(buffer);
      expect(meta).not.toBeNull();
      expect(meta?.title).toBe('Misteri Kota Tua');
      expect(meta?.author).toBe('Budi Santoso');
      expect(meta?.publisher).toBe('Pustaka Abadi');
      expect(meta?.publishedYear).toBe('2024');
      expect(meta?.description).toBe('Buku cerita fiksi petualangan');
      expect(meta?.language).toBe('id');
      expect(meta?.identifier).toBe('urn:isbn:9781234567890');
      expect(meta?.cover).toBeInstanceOf(Blob);
    });

    it('extracts cover via EPUB 2 meta tag convention', async () => {
      const buffer = await createMockEpubZip({
        title: 'Kisah Klasik',
        creator: 'Siti Rahma',
        includeCover: true,
        coverType: 'epub2',
      });

      const meta = await readFastEpubMetadata(buffer);
      expect(meta).not.toBeNull();
      expect(meta?.title).toBe('Kisah Klasik');
      expect(meta?.author).toBe('Siti Rahma');
      expect(meta?.cover).toBeInstanceOf(Blob);
    });

    it('extracts cover via manifest fallback when id or href has cover keyword', async () => {
      const buffer = await createMockEpubZip({
        title: 'Buku Fallback',
        includeCover: true,
        coverType: 'fallback',
      });

      const meta = await readFastEpubMetadata(buffer);
      expect(meta).not.toBeNull();
      expect(meta?.cover).toBeInstanceOf(Blob);
    });

    it('skips cover extraction when options.extractCover is false', async () => {
      const buffer = await createMockEpubZip({
        title: 'Buku Tanpa Cover',
        includeCover: true,
        coverType: 'epub3',
      });

      const meta = await readFastEpubMetadata(buffer, { extractCover: false });
      expect(meta).not.toBeNull();
      expect(meta?.cover).toBeNull();
    });

    it('returns null and does not throw if container.xml is missing', async () => {
      const zip = new JSZip();
      zip.file('some-file.txt', 'not an epub');
      const buffer = await zip.generateAsync({ type: 'arraybuffer' });

      const meta = await readFastEpubMetadata(buffer);
      expect(meta).toBeNull();
    });

    it('integrates seamlessly with readMetadata and readFullMetadata entrypoints', async () => {
      const buffer = await createMockEpubZip({
        title: 'Integrasi Metadata',
        creator: 'Tim Developer',
        publisher: 'MyShelf Labs',
        date: '2026-10-31',
      });

      const meta = await readMetadata(buffer);
      expect(meta.title).toBe('Integrasi Metadata');
      expect(meta.author).toBe('Tim Developer');
      expect(meta.publishedYear).toBe('2026');

      const fullMeta = await readFullMetadata(buffer);
      expect(fullMeta.publisher).toBe('MyShelf Labs');
    });
  });
});
