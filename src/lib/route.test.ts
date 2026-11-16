import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getRouteStack,
  isMainTabRoute,
  isSameRoute,
  navigate,
  normalizePath,
  parseRoute,
  routeAccessibilityFocus,
  useHashRoute,
} from './route';

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

  describe('isSameRoute', () => {
    it('returns true for matching routes', () => {
      expect(isSameRoute({ type: 'library' }, { type: 'library' })).toBe(true);
      expect(isSameRoute({ type: 'stats' }, { type: 'stats' })).toBe(true);
      expect(isSameRoute({ type: 'settings' }, { type: 'settings' })).toBe(true);
      expect(
        isSameRoute({ type: 'reader', bookId: 'book-1' }, { type: 'reader', bookId: 'book-1' })
      ).toBe(true);
      expect(
        isSameRoute(
          { type: 'collections', collectionId: 'Novel' },
          { type: 'collections', collectionId: 'Novel' }
        )
      ).toBe(true);
      expect(
        isSameRoute(
          { type: 'catalog', sourceId: 'gutenberg' },
          { type: 'catalog', sourceId: 'gutenberg' }
        )
      ).toBe(true);
    });

    it('returns false for different route types or params', () => {
      expect(isSameRoute({ type: 'library' }, { type: 'stats' })).toBe(false);
      expect(
        isSameRoute({ type: 'reader', bookId: 'book-1' }, { type: 'reader', bookId: 'book-2' })
      ).toBe(false);
      expect(
        isSameRoute(
          { type: 'collections', collectionId: 'Novel' },
          { type: 'collections', collectionId: 'Comics' }
        )
      ).toBe(false);
      expect(
        isSameRoute(
          { type: 'catalog', sourceId: 'gutenberg' },
          { type: 'catalog', sourceId: 'standard_ebooks' }
        )
      ).toBe(false);
    });
  });

  describe('routeAccessibilityFocus', () => {
    afterEach(() => {
      document.body.innerHTML = '';
    });

    it('sets tabindex and focuses main content heading if available', () => {
      const heading = document.createElement('h1');
      heading.textContent = 'Rak Buku';
      document.body.appendChild(heading);

      routeAccessibilityFocus();
      expect(heading.getAttribute('tabindex')).toBe('-1');
      expect(document.activeElement).toBe(heading);
    });

    it('focuses #main-content landmark container if no h1 present', () => {
      const main = document.createElement('main');
      main.id = 'main-content';
      document.body.appendChild(main);

      routeAccessibilityFocus();
      expect(main.getAttribute('tabindex')).toBe('-1');
      expect(document.activeElement).toBe(main);
    });
  });

  describe('useHashRoute with View Transitions API', () => {
    beforeEach(() => {
      window.location.hash = '';
      document.documentElement.className = '';
    });

    afterEach(() => {
      (document as { startViewTransition?: unknown }).startViewTransition = undefined;
    });

    it('updates route state synchronously when startViewTransition is absent', () => {
      const { result } = renderHook(() => useHashRoute());
      expect(result.current).toEqual({ type: 'library' });

      act(() => {
        window.location.hash = '#stats';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });

      expect(result.current).toEqual({ type: 'stats' });
    });

    it('triggers document.startViewTransition and adds has-view-transitions class when supported', async () => {
      let callbackExecuted = false;
      const finishedPromise = Promise.resolve();

      document.startViewTransition = vi.fn(
        (updateCallback?: (() => Promise<void> | void) | StartViewTransitionOptions) => {
          if (typeof updateCallback === 'function') {
            updateCallback();
          } else if (updateCallback && typeof updateCallback.update === 'function') {
            updateCallback.update();
          }
          callbackExecuted = true;
          return {
            finished: finishedPromise,
            ready: Promise.resolve(),
            updateCallbackDone: Promise.resolve(),
            skipTransition: vi.fn(),
            types: new Set<string>(),
          } as unknown as ViewTransition;
        }
      );

      const { result } = renderHook(() => useHashRoute());
      expect(document.documentElement.classList.contains('has-view-transitions')).toBe(true);

      act(() => {
        window.location.hash = '#collections';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });

      expect(document.startViewTransition).toHaveBeenCalled();
      expect(callbackExecuted).toBe(true);
      expect(result.current).toEqual({ type: 'collections' });
      await finishedPromise;
    });

    it('bypasses startViewTransition when eink-mode is active', () => {
      document.documentElement.classList.add('eink-mode');
      const startTransitionSpy = vi.fn();
      document.startViewTransition =
        startTransitionSpy as unknown as typeof document.startViewTransition;

      const { result } = renderHook(() => useHashRoute());

      act(() => {
        window.location.hash = '#stats';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });

      expect(startTransitionSpy).not.toHaveBeenCalled();
      expect(result.current).toEqual({ type: 'stats' });
    });

    it('bypasses startViewTransition completely when navigating to or from reader route', () => {
      const startTransitionSpy = vi.fn();
      document.startViewTransition =
        startTransitionSpy as unknown as typeof document.startViewTransition;

      const { result } = renderHook(() => useHashRoute());

      act(() => {
        window.location.hash = '#read/book-123';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });

      expect(startTransitionSpy).not.toHaveBeenCalled();
      expect(result.current).toEqual({ type: 'reader', bookId: 'book-123' });

      act(() => {
        window.location.hash = '';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });

      expect(startTransitionSpy).not.toHaveBeenCalled();
      expect(result.current).toEqual({ type: 'library' });
    });
  });
});
