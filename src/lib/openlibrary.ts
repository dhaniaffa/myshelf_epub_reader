import { fetchWithCorsProxy } from '@/lib/proxy';

import type { CatalogBook } from '@/types';

export interface OpenLibrarySearchDoc {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  ia?: string[];
  first_publish_year?: number;
  subject?: string[];
  language?: string[];
  public_scan_b?: boolean;
  edition_count?: number;
  ebook_access?: string;
}

export interface OpenLibrarySearchResponse {
  numFound: number;
  start: number;
  numFoundExact: boolean;
  docs: OpenLibrarySearchDoc[];
}

export interface FetchOpenLibraryOptions {
  search?: string;
  topic?: string;
  page?: number;
  limit?: number;
}

export interface CuratedTopic {
  id: string;
  label: string;
  q?: string;
  subject?: string;
  language?: string;
  sort?: string;
}

export const OPEN_LIBRARY_CURATED_TOPICS: CuratedTopic[] = [
  { id: 'all', label: 'Populer', q: 'has_fulltext:true', sort: 'editions' },
  { id: 'fiction', label: 'Fiksi & Sastra', subject: 'fiction' },
  { id: 'mystery', label: 'Misteri & Detektif', subject: 'detective_and_mystery_stories' },
  { id: 'scifi', label: 'Fiksi Ilmiah', subject: 'science_fiction' },
  { id: 'fantasy', label: 'Fantasi', subject: 'fantasy' },
  { id: 'history', label: 'Sejarah & Biografi', subject: 'history' },
  { id: 'science', label: 'Sains & Alam', subject: 'science' },
  { id: 'indonesian', label: 'Bahasa Indonesia', language: 'ind' },
];

/**
 * Fetches books from Open Library and Internet Archive
 */
export async function fetchOpenLibraryBooks(
  options: FetchOpenLibraryOptions = {}
): Promise<{ count: number; hasNext: boolean; books: CatalogBook[] }> {
  const url = new URL('https://openlibrary.org/search.json');
  const page = options.page && options.page > 0 ? options.page : 1;
  const limit = options.limit && options.limit > 0 ? options.limit : 24;

  url.searchParams.set('has_fulltext', 'true');
  url.searchParams.set('ebook_access', 'public');
  url.searchParams.set('page', String(page));
  url.searchParams.set('limit', String(limit));
  url.searchParams.set(
    'fields',
    'key,title,author_name,cover_i,ia,first_publish_year,subject,language,public_scan_b,edition_count,ebook_access'
  );

  const trimmedSearch = options.search?.trim();

  if (trimmedSearch) {
    url.searchParams.set('q', trimmedSearch);
  } else {
    const selectedTopic =
      OPEN_LIBRARY_CURATED_TOPICS.find((t) => t.id === options.topic) ||
      OPEN_LIBRARY_CURATED_TOPICS[0];

    if (selectedTopic.q) {
      url.searchParams.set('q', selectedTopic.q);
    }
    if (selectedTopic.subject) {
      url.searchParams.set('subject', selectedTopic.subject);
    }
    if (selectedTopic.language) {
      url.searchParams.set('language', selectedTopic.language);
    }
    if (selectedTopic.sort) {
      url.searchParams.set('sort', selectedTopic.sort);
    }
  }

  const response = await fetchWithCorsProxy(url.toString(), {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Gagal memuat katalog Open Library (HTTP ${response.status})`);
  }

  const data: OpenLibrarySearchResponse = await response.json();

  const books: CatalogBook[] = (data.docs || [])
    .filter(
      (doc) =>
        doc.ia && doc.ia.length > 0 && (doc.ebook_access === 'public' || doc.public_scan_b === true)
    )
    .map((doc) => {
      // Pick best Internet Archive item id that is not an audiobook or ISBN
      const iaId =
        doc.ia!.find((id) => !id.includes('librivox') && !id.startsWith('isbn_')) || doc.ia![0];
      const bookId = `ol_${doc.key.replace('/works/', '')}_${iaId}`;

      // Cover URL resolution
      let coverUrl: string | null = null;
      if (doc.cover_i) {
        coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
      } else if (iaId) {
        coverUrl = `https://archive.org/services/img/${iaId}`;
      }

      // Format author
      const author =
        doc.author_name && doc.author_name.length > 0
          ? doc.author_name.slice(0, 2).join(', ')
          : 'Penulis Tidak Dikenal';

      // Brief metadata summary
      const metaParts: string[] = [];
      if (doc.first_publish_year) {
        metaParts.push(`Pertama kali terbit: ${doc.first_publish_year}`);
      }
      if (doc.edition_count) {
        metaParts.push(`${doc.edition_count} edisi terdokumentasi`);
      }
      if (doc.subject && doc.subject.length > 0) {
        metaParts.push(`Subjek: ${doc.subject.slice(0, 4).join(', ')}`);
      }
      const summary =
        metaParts.length > 0
          ? `Buku digital dari arsip Open Library & Internet Archive (ID: ${iaId}). ${metaParts.join('. ')}.`
          : `Buku digital dari arsip Open Library & Internet Archive (ID: ${iaId}). Tersedia pindaian digital lengkap.`;

      // Direct download link to Internet Archive EPUB
      const downloadUrl = `https://archive.org/download/${iaId}/${iaId}.epub`;

      return {
        id: bookId,
        title: doc.title,
        author,
        coverUrl,
        summary,
        downloadUrl,
        format: 'epub',
        language: doc.language?.[0] || null,
        subjects: doc.subject?.slice(0, 5) || [],
        downloadCount: doc.edition_count,
        source: 'openlibrary' as const,
      };
    });

  const hasNext = page * limit < data.numFound;

  return {
    count: data.numFound,
    hasNext,
    books,
  };
}
