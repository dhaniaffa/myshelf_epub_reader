import { fetchWithCorsProxy } from '@/lib/proxy';

import type { CatalogBook, OpdsFeedResult, OpdsNavigationLink } from '@/types';

/**
 * Resolves relative URLs to absolute URLs based on feed base URL
 */
function resolveUrl(href: string | null, baseUrl: string): string | null {
  if (!href) return null;
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return href;
  }
}

/**
 * Cleans HTML tags from summary text
 */
function cleanHtmlText(raw: string | null): string | null {
  if (!raw) return null;
  return raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parses OPDS 1.2 Atom XML string into feed and book data structure
 */
export function parseOpdsXml(xmlString: string, baseUrl: string): OpdsFeedResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'application/xml');

  // Check if XML is valid
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Format feed OPDS XML tidak valid atau rusak');
  }

  const feedEl = doc.querySelector('feed');
  const feedTitle = feedEl?.querySelector(':scope > title')?.textContent?.trim() || 'Katalog OPDS';
  const feedSubtitle = feedEl?.querySelector(':scope > subtitle')?.textContent?.trim() || undefined;
  const feedIcon =
    resolveUrl(feedEl?.querySelector(':scope > icon')?.textContent?.trim() || null, baseUrl) ||
    undefined;

  let nextUrl: string | undefined;
  let searchUrl: string | undefined;
  const subsections: OpdsNavigationLink[] = [];
  const books: CatalogBook[] = [];

  // Find global links at feed level
  const feedLinks = feedEl ? Array.from(feedEl.querySelectorAll(':scope > link')) : [];
  for (const link of feedLinks) {
    const rel = link.getAttribute('rel');
    const href = resolveUrl(link.getAttribute('href'), baseUrl);
    const title = link.getAttribute('title') || 'Navigasi';
    const type = link.getAttribute('type') || '';

    if (rel === 'next' && href) {
      nextUrl = href;
    } else if (rel === 'search' && href) {
      searchUrl = href;
    } else if (
      rel !== 'self' &&
      (rel === 'subsection' ||
        type.includes('application/atom+xml') ||
        type.includes('opds-catalog')) &&
      href
    ) {
      subsections.push({
        title,
        href,
        rel: rel || undefined,
        type: type || undefined,
      });
    }
  }

  // Parse entries (<entry>)
  const entries = Array.from(doc.querySelectorAll('entry'));
  for (const entry of entries) {
    const entryTitle = entry.querySelector('title')?.textContent?.trim() || 'Tanpa Judul';
    let entryAuthor =
      entry.querySelector('author > name')?.textContent?.trim() ||
      entry.querySelector('author')?.textContent?.trim() ||
      'Penulis Tidak Dikenal';

    const entrySummary = cleanHtmlText(
      entry.querySelector('summary')?.textContent ||
        entry.querySelector('content')?.textContent ||
        null
    );

    const entryId =
      entry.querySelector('id')?.textContent?.trim() ||
      `opds-${Math.random().toString(36).substring(2, 9)}`;

    // Find acquisition links (book download URLs)
    const links = Array.from(entry.querySelectorAll('link'));
    let acquisitionUrl: string | null = null;
    let acquisitionType: string | null = null;
    let coverUrl: string | null = null;
    let navSubsectionHref: string | null = null;

    // Find cover link from thumbnail / media:thumbnail element (Atom/Media RSS)
    const mediaThumbnail =
      entry
        .getElementsByTagNameNS('http://search.yahoo.com/mrss/', 'thumbnail')[0]
        ?.getAttribute('url') ||
      entry.querySelector('thumbnail')?.getAttribute('url') ||
      entry.querySelector('[url*="thumbnail"]')?.getAttribute('url');

    if (mediaThumbnail) {
      coverUrl = resolveUrl(mediaThumbnail, baseUrl);
    }

    for (const link of links) {
      const rel = link.getAttribute('rel') || '';
      const href = resolveUrl(link.getAttribute('href'), baseUrl);
      const type = link.getAttribute('type') || '';
      const title = link.getAttribute('title') || '';

      // Cover link
      if (
        (rel.includes('opds-spec.org/image') ||
          rel.includes('opds-spec.org/thumbnail') ||
          rel.includes('opds-spec.org/cover') ||
          rel.includes('image')) &&
        href
      ) {
        if (!coverUrl || rel.includes('image')) {
          coverUrl = href;
        }
      }

      // Book acquisition link
      if (
        (rel.includes('opds-spec.org/acquisition') ||
          rel === 'enclosure' ||
          type.includes('application/epub+zip') ||
          type.includes('application/pdf')) &&
        href
      ) {
        // Prioritize compatible/recommended EPUB
        if (!acquisitionUrl) {
          acquisitionUrl = href;
          acquisitionType = type;
        } else if (
          !acquisitionType?.includes('application/epub+zip') &&
          type.includes('application/epub+zip')
        ) {
          acquisitionUrl = href;
          acquisitionType = type;
        } else if (
          title.toLowerCase().includes('recommended') ||
          !acquisitionUrl.toLowerCase().includes('.epub')
        ) {
          acquisitionUrl = href;
          acquisitionType = type;
        }
      }

      // Sub-catalog navigation link inside entry
      if ((type.includes('application/atom+xml') || type.includes('opds-catalog')) && href) {
        navSubsectionHref = href;
      }
    }

    // Check if entry is a special Gutenberg book entry (/ebooks/1234.opds)
    const gutenbergMatch =
      navSubsectionHref?.match(/\/ebooks\/(\d+)\.opds/) || entryId.match(/\/ebooks\/(\d+)/);

    if (gutenbergMatch && !acquisitionUrl) {
      const bookNum = gutenbergMatch[1];
      acquisitionUrl = `https://www.gutenberg.org/ebooks/${bookNum}.epub3.images`;
      acquisitionType = 'application/epub+zip';
      if (!coverUrl) {
        coverUrl = `https://www.gutenberg.org/cache/epub/${bookNum}/pg${bookNum}.cover.medium.jpg`;
      }
      if (entryAuthor === 'Penulis Tidak Dikenal') {
        const contentText = entry.querySelector('content')?.textContent?.trim();
        if (contentText && !contentText.startsWith('http')) {
          entryAuthor = contentText;
        }
      }
    }

    // If acquisition link is present, add as book
    if (acquisitionUrl) {
      const isPdf =
        (acquisitionType && acquisitionType.includes('pdf')) ||
        acquisitionUrl.toLowerCase().includes('.pdf');

      books.push({
        id: entryId,
        title: entryTitle,
        author: entryAuthor,
        coverUrl,
        summary: entrySummary,
        downloadUrl: acquisitionUrl,
        format: isPdf ? 'pdf' : 'epub',
        source: 'opds',
      });
    } else if (navSubsectionHref) {
      // If subsection catalog link, add to subsections
      subsections.push({
        title: entryTitle,
        href: navSubsectionHref,
      });
    }
  }

  return {
    title: feedTitle,
    subtitle: feedSubtitle,
    icon: feedIcon,
    books,
    subsections,
    nextUrl,
    searchUrl,
  };
}

/**
 * Fetches and parses OPDS feed from URL (with automatic CORS proxy fallback)
 */
export async function fetchOpdsFeed(url: string, init?: RequestInit): Promise<OpdsFeedResult> {
  const response = await fetchWithCorsProxy(url, {
    ...init,
    headers: {
      Accept: 'application/atom+xml,application/xml,text/xml,*/*',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const errorMsg =
      response.status === 401
        ? 'HTTP 401: Akses memerlukan autentikasi Patrons Circle'
        : `HTTP ${response.status}: ${response.statusText || 'Gagal memuat feed'}`;
    const err = new Error(errorMsg);
    (err as unknown as { status: number }).status = response.status;
    throw err;
  }

  const xmlText = await response.text();
  return parseOpdsXml(xmlText, url);
}
