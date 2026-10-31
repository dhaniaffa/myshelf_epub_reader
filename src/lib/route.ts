import { useEffect, useState } from 'react';

import { isAndroidNative } from '@/lib/platform';

export type AppRoute =
  | { type: 'library' }
  | { type: 'collections'; collectionId?: string }
  | { type: 'reader'; bookId: string }
  | { type: 'catalog'; sourceId?: string }
  | { type: 'stats' }
  | { type: 'settings' };

export function parseRoute(hash: string): AppRoute {
  // Strip any combination of leading '#' and '/'
  const clean = hash
    .trim()
    .replace(/^[#/]+/, '')
    .trim();

  if (clean.startsWith('read/')) {
    const bookId = clean.replace('read/', '').trim();
    if (bookId) {
      return { type: 'reader', bookId };
    }
  }
  if (clean.startsWith('collections/') || clean.startsWith('koleksi/')) {
    const rawCol = clean.replace(/^(collections|koleksi)\//, '').trim();
    let colId: string | undefined;
    try {
      colId = rawCol ? decodeURIComponent(rawCol) : undefined;
    } catch {
      colId = rawCol || undefined;
    }
    return { type: 'collections', collectionId: colId };
  }
  if (clean === 'collections' || clean === 'koleksi') {
    return { type: 'collections' };
  }
  if (clean.startsWith('catalog/')) {
    const sourceId = clean.replace('catalog/', '').trim();
    return { type: 'catalog', sourceId: sourceId || undefined };
  }
  if (clean === 'catalog' || clean === 'opds') {
    return { type: 'catalog' };
  }
  if (clean === 'stats' || clean === 'statistics' || clean === 'statistik') {
    return { type: 'stats' };
  }
  if (clean === 'settings' || clean === 'setting' || clean === 'pengaturan') {
    return { type: 'settings' };
  }
  return { type: 'library' };
}

/**
 * Checks whether a given route is a root primary tab (Library, Collections root, Catalog root, Stats, Settings)
 * versus a pushed sub-screen (Reader, Collection Detail, Catalog Source Detail).
 */
export function isMainTabRoute(route: AppRoute): boolean {
  switch (route.type) {
    case 'library':
    case 'stats':
    case 'settings':
      return true;
    case 'collections':
      return !route.collectionId;
    case 'catalog':
      return !route.sourceId;
    case 'reader':
      return false;
  }
}

export function normalizePath(path: string): string {
  return path
    .trim()
    .replace(/^[#/]+/, '')
    .trim();
}

function dispatchHashChange(): void {
  try {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } catch {
    window.dispatchEvent(new Event('hashchange'));
  }
}

/**
 * Builds the initial navigation stack for Android Native based on the initial URL hash.
 */
function buildInitialStack(hash: string): string[] {
  const clean = normalizePath(hash);
  const route = parseRoute(clean);

  if (route.type === 'library') {
    return [''];
  }
  if (route.type === 'collections' && route.collectionId) {
    return ['', 'collections', `collections/${encodeURIComponent(route.collectionId)}`];
  }
  if (route.type === 'catalog' && route.sourceId) {
    return ['', 'catalog', `catalog/${route.sourceId}`];
  }
  if (route.type === 'reader') {
    return ['', `read/${route.bookId}`];
  }
  return ['', clean];
}

// In-memory Flutter-style Navigation Stack (used exclusively on Android Native)
let androidRouteStack: string[] =
  typeof window !== 'undefined' ? buildInitialStack(window.location.hash) : [''];

/**
 * Inspect the current route stack snapshot (for debugging/diagnostics).
 */
export function getRouteStack(): readonly string[] {
  return androidRouteStack;
}

export interface NavigateOptions {
  /** Replace current top of stack instead of pushing a new layer */
  replace?: boolean;
}

/**
 * Dual-Engine Navigation dispatcher:
 * - On Android Native: Updates the in-memory route stack and synchronizes URL in-place
 *   via `history.replaceState` (avoiding browser history pollution).
 * - On Web Browser: Pushes standard browser history entry so browser Back/Forward work naturally.
 */
export function navigate(path: string, options?: NavigateOptions): void {
  const clean = normalizePath(path);
  const targetRoute = parseRoute(clean);
  const targetHash = clean ? `#${clean}` : '#';

  if (isAndroidNative()) {
    if (options?.replace) {
      if (androidRouteStack.length > 0) {
        androidRouteStack[androidRouteStack.length - 1] = clean;
      } else {
        androidRouteStack = [clean];
      }
    } else if (isMainTabRoute(targetRoute)) {
      // Switching primary bottom-bar tabs resets the stack root to that tab (Flutter behavior)
      androidRouteStack = clean ? [clean] : [''];
    } else {
      // Pushing a sub-page onto the stack layer (Reader, Collection Detail, Catalog Source)
      if (androidRouteStack[androidRouteStack.length - 1] !== clean) {
        androidRouteStack.push(clean);
      }
    }

    if (window.location.hash !== targetHash) {
      window.history.replaceState(null, '', targetHash);
      dispatchHashChange();
    }
    return;
  }

  // Web Browser / Desktop: standard browser history
  if (options?.replace) {
    window.history.replaceState(null, '', targetHash);
    dispatchHashChange();
  } else {
    window.location.hash = targetHash;
  }
}

/**
 * Pops the top layer of the route stack.
 * - On Android Native: pops the pushed screen, returning to parent screen or home tab.
 * - On Web Browser: triggers `window.history.back()`.
 *
 * @returns true if a route was successfully popped, false if already at root Home.
 */
export function popRoute(): boolean {
  if (isAndroidNative()) {
    const currentRoute = parseRoute(window.location.hash);

    // If there is more than 1 screen on stack, pop it
    if (androidRouteStack.length > 1) {
      androidRouteStack.pop();
      const prev = androidRouteStack[androidRouteStack.length - 1] ?? '';
      const targetHash = prev ? `#${prev}` : '#';
      window.history.replaceState(null, '', targetHash);
      dispatchHashChange();
      return true;
    }

    // Safety fallback: if stack only has 1 item but user is not at root Library
    // (e.g. currently reading a book or viewing a secondary tab)
    if (currentRoute.type !== 'library') {
      androidRouteStack = [''];
      window.history.replaceState(null, '', '#');
      dispatchHashChange();
      return true;
    }

    // Truly at root Library Home
    return false;
  }

  // Web Browser / Desktop
  if (typeof window !== 'undefined' && window.history.length > 1) {
    window.history.back();
    return true;
  }
  return false;
}

/**
 * Contextual back navigation helper for in-app back buttons (Reader Header, Collection detail, etc.)
 */
export function navigateBack(fallbackPath: string = ''): void {
  if (!popRoute()) {
    navigate(fallbackPath);
  }
}

export function useHashRoute(): AppRoute {
  const [route, setRoute] = useState<AppRoute>(() => parseRoute(window.location.hash));

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(parseRoute(window.location.hash));
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return route;
}
