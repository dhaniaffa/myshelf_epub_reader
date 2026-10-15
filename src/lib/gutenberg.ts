import { fetchWithCorsProxy } from '@/lib/proxy';

import type { CatalogBook } from '@/types';

export interface GutenbergResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: GutenbergBook[];
}

export interface GutenbergBook {
  id: number;
  title: string;
  authors: { name: string; birth_year?: number; death_year?: number }[];
  summaries?: string[];
  subjects?: string[];
  languages?: string[];
  formats: Record<string, string>;
  download_count: number;
}

export interface FetchGutenbergOptions {
  search?: string;
  topic?: string;
  page?: number;
  languages?: string;
}

export const GUTENBERG_CURATED_TOPICS = [
  { id: 'all', label: 'Populer', query: '' },
  { id: 'fiction', label: 'Fiksi & Sastra', query: 'fiction' },
  { id: 'mystery', label: 'Misteri & Detektif', query: 'mystery' },
  { id: 'adventure', label: 'Petualangan', query: 'adventure' },
  { id: 'scifi', label: 'Fiksi Ilmiah', query: 'science fiction' },
  { id: 'philosophy', label: 'Filsafat', query: 'philosophy' },
  { id: 'poetry', label: 'Puisi & Drama', query: 'poetry' },
  { id: 'indonesian', label: 'Bahasa Indonesia', query: '', language: 'id' },
];

/**
 * Formats name "Doyle, Arthur Conan" into "Arthur Conan Doyle"
 */
function formatAuthorName(rawName: string): string {
  if (!rawName) return 'Penulis Tidak Dikenal';
  if (rawName.includes(',')) {
    const parts = rawName.split(',').map((p) => p.trim());
    if (parts.length >= 2) {
      return `${parts[1]} ${parts[0]}`;
    }
  }
  return rawName.trim();
}

/**
 * Searches and retrieves book list from Project Gutenberg catalog
 */
export async function fetchGutenbergBooks(
  options: FetchGutenbergOptions = {}
): Promise<{ count: number; next: string | null; books: CatalogBook[] }> {
  const url = new URL('https://gutendex.com/books/');

  if (options.search && options.search.trim()) {
    url.searchParams.set('search', options.search.trim());
  }

  if (options.topic && options.topic.trim()) {
    url.searchParams.set('topic', options.topic.trim());
  }

  if (options.languages) {
    url.searchParams.set('languages', options.languages);
  }

  if (options.page && options.page > 1) {
    url.searchParams.set('page', String(options.page));
  }

  const response = await fetchWithCorsProxy(url.toString(), {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Gagal memuat katalog Gutenberg (HTTP ${response.status})`);
  }

  const data: GutenbergResponse = await response.json();

  const books: CatalogBook[] = (data.results || [])
    .filter((gb) => {
      // Prioritize books with EPUB format
      return (
        gb.formats['application/epub+zip'] ||
        gb.formats['application/x-mobipocket-ebook'] ||
        gb.formats['application/pdf']
      );
    })
    .map((gb) => {
      // Find EPUB download link (or PDF if available)
      const downloadUrl =
        gb.formats['application/epub+zip'] ||
        gb.formats['application/pdf'] ||
        Object.values(gb.formats)[0];

      // File format
      const format = downloadUrl.includes('.pdf') ? 'pdf' : 'epub';

      // Book cover
      const coverUrl = gb.formats['image/jpeg'] || gb.formats['image/png'] || null;

      // Nama pengarang
      const author =
        gb.authors && gb.authors.length > 0
          ? gb.authors.map((a) => formatAuthorName(a.name)).join(', ')
          : 'Penulis Tidak Dikenal';

      // Summary
      const summary = gb.summaries && gb.summaries.length > 0 ? gb.summaries[0] : null;

      return {
        id: `gutenberg-${gb.id}`,
        title: gb.title || 'Tanpa Judul',
        author,
        coverUrl,
        summary,
        downloadUrl,
        format,
        language: gb.languages && gb.languages.length > 0 ? gb.languages[0] : null,
        subjects: gb.subjects || [],
        downloadCount: gb.download_count || 0,
        source: 'gutenberg' as const,
      };
    });

  return {
    count: data.count || 0,
    next: data.next,
    books,
  };
}
