import { describe, expect, it } from 'vitest';

import { generateAnnotationsMarkdown, importBackupJson } from './backup';

import type { Annotation, Book } from '@/types';

describe('Backup & Export Utilities (src/lib/backup.ts)', () => {
  describe('generateAnnotationsMarkdown', () => {
    const mockBook: Book = {
      id: 'book-1',
      title: 'Belajar Filosofi Kuno',
      author: 'Marcus Aurelius',
      cover: null,
      progress: 0.5,
      lastCfi: null,
      readingTimeSeconds: 1200,
      format: 'epub',
      addedAt: Date.now(),
      lastReadAt: Date.now(),
      totalLocations: 100,
      status: 'reading',
    };

    const mockAnnotations: Annotation[] = [
      {
        id: 'ann-1',
        bookId: 'book-1',
        cfiRange: 'epubcfi(/6/2!/4/1)',
        text: 'Ketenangan jiwa berakar dari kendali pikiran kita sendiri.',
        color: 'yellow',
        chapter: 'Bab 1: Meditasi Pagi',
        note: 'Penting diingat setiap hari.',
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      },
      {
        id: 'ann-2',
        bookId: 'book-1',
        cfiRange: 'epubcfi(/6/4!/4/1)',
        text: 'Hiduplah selaras dengan alam dan kebenaran.',
        color: 'green',
        chapter: 'Bab 2: Kebaikan Alami',
        note: null,
        createdAt: 1700001000000,
        updatedAt: 1700001000000,
      },
    ];

    it('generates markdown header with book metadata', () => {
      const fixedDate = new Date('2026-10-31T00:00:00Z');
      const md = generateAnnotationsMarkdown(mockBook, mockAnnotations, fixedDate);

      expect(md).toContain('# Catatan & Kutipan: Belajar Filosofi Kuno');
      expect(md).toContain('**Penulis:** Marcus Aurelius');
      expect(md).toContain('**Total Kutipan:** 2');
    });

    it('groups annotations by chapter heading', () => {
      const md = generateAnnotationsMarkdown(mockBook, mockAnnotations);

      expect(md).toContain('## Bab 1: Meditasi Pagi');
      expect(md).toContain('> "Ketenangan jiwa berakar dari kendali pikiran kita sendiri."');
      expect(md).toContain('**Catatan:** Penting diingat setiap hari.');

      expect(md).toContain('## Bab 2: Kebaikan Alami');
      expect(md).toContain('> "Hiduplah selaras dengan alam dan kebenaran."');
    });

    it('handles books with zero annotations gracefully', () => {
      const md = generateAnnotationsMarkdown(mockBook, []);
      expect(md).toContain('**Total Kutipan:** 0');
    });
  });

  describe('importBackupJson validation', () => {
    it('throws error when importing invalid JSON file without books array', async () => {
      const invalidBlob = new Blob([JSON.stringify({ invalidField: true })], {
        type: 'application/json',
      });
      const invalidFile = new File([invalidBlob], 'backup.json');

      await expect(importBackupJson(invalidFile)).rejects.toThrow(
        'Format berkas cadangan tidak valid'
      );
    });

    it('throws error for corrupted non-JSON text', async () => {
      const corruptedBlob = new Blob(['Not a valid JSON content'], { type: 'text/plain' });
      const corruptedFile = new File([corruptedBlob], 'corrupted.json');

      await expect(importBackupJson(corruptedFile)).rejects.toThrow();
    });
  });
});
