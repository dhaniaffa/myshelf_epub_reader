import { beforeEach, describe, expect, it } from 'vitest';

import { getRouteStack, isMainTabRoute, navigate, normalizePath, parseRoute } from './route';

describe('Route Utility (src/lib/route.ts)', () => {
  describe('parseRoute', () => {
    it('parses reader routes correctly regardless of slashes or hashes', () => {
      expect(parseRoute('/read/book-123')).toEqual({ type: 'reader', bookId: 'book-123' });
      expect(parseRoute('#/read/book-123')).toEqual({ type: 'reader', bookId: 'book-123' });
      expect(parseRoute('#read/book-123')).toEqual({ type: 'reader', bookId: 'book-123' });
      expect(parseRoute('read/book-123')).toEqual({ type: 'reader', bookId: 'book-123' });
    });

    it('parses collections routes with and without collectionId', () => {
      expect(parseRoute('#collections')).toEqual({ type: 'collections' });
      expect(parseRoute('collections')).toEqual({ type: 'collections' });
      expect(parseRoute('#koleksi')).toEqual({ type: 'collections' });
      expect(parseRoute('#collections/Novel')).toEqual({
        type: 'collections',
        collectionId: 'Novel',
      });
      expect(parseRoute('/collections/Sci-Fi%20Space')).toEqual({
        type: 'collections',
        collectionId: 'Sci-Fi Space',
      });
    });

    it('parses catalog routes with and without sourceId', () => {
      expect(parseRoute('#catalog')).toEqual({ type: 'catalog' });
      expect(parseRoute('opds')).toEqual({ type: 'catalog' });
      expect(parseRoute('#catalog/gutenberg')).toEqual({
        type: 'catalog',
        sourceId: 'gutenberg',
      });
      expect(parseRoute('/catalog/standard_ebooks')).toEqual({
        type: 'catalog',
        sourceId: 'standard_ebooks',
      });
    });

    it('parses stats and settings routes', () => {
      expect(parseRoute('#stats')).toEqual({ type: 'stats' });
      expect(parseRoute('statistik')).toEqual({ type: 'stats' });
      expect(parseRoute('#settings')).toEqual({ type: 'settings' });
      expect(parseRoute('pengaturan')).toEqual({ type: 'settings' });
    });

    it('defaults empty, root slash, or unknown hashes to library', () => {
      expect(parseRoute('')).toEqual({ type: 'library' });
      expect(parseRoute('#')).toEqual({ type: 'library' });
      expect(parseRoute('/')).toEqual({ type: 'library' });
      expect(parseRoute('#/')).toEqual({ type: 'library' });
      expect(parseRoute('#unknown-page')).toEqual({ type: 'library' });
    });
  });

  describe('isMainTabRoute', () => {
    it('returns true for main tabs', () => {
      expect(isMainTabRoute({ type: 'library' })).toBe(true);
      expect(isMainTabRoute({ type: 'stats' })).toBe(true);
      expect(isMainTabRoute({ type: 'settings' })).toBe(true);
      expect(isMainTabRoute({ type: 'collections' })).toBe(true);
      expect(isMainTabRoute({ type: 'catalog' })).toBe(true);
    });

    it('returns false for pushed sub-pages', () => {
      expect(isMainTabRoute({ type: 'reader', bookId: '123' })).toBe(false);
      expect(isMainTabRoute({ type: 'collections', collectionId: 'Novel' })).toBe(false);
      expect(isMainTabRoute({ type: 'catalog', sourceId: 'gutenberg' })).toBe(false);
    });
  });

  describe('normalizePath', () => {
    it('strips leading hashes, slashes, and whitespace cleanly', () => {
      expect(normalizePath('/read/123')).toBe('read/123');
      expect(normalizePath('#/read/123')).toBe('read/123');
      expect(normalizePath('#read/123')).toBe('read/123');
      expect(normalizePath('  #/collections/Novel  ')).toBe('collections/Novel');
      expect(normalizePath('/')).toBe('');
      expect(normalizePath('#')).toBe('');
      expect(normalizePath('')).toBe('');
    });
  });

  describe('Navigation & Stack Layer', () => {
    beforeEach(() => {
      window.location.hash = '';
    });

    it('manages route stack inspection', () => {
      const stack = getRouteStack();
      expect(Array.isArray(stack)).toBe(true);
    });

    it('updates window.location.hash when navigating in browser mode', () => {
      navigate('settings');
      expect(window.location.hash).toBe('#settings');

      navigate('catalog/gutenberg');
      expect(window.location.hash).toBe('#catalog/gutenberg');
    });
  });
});
