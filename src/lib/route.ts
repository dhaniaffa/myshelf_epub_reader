import { useEffect, useState } from 'react';

export type AppRoute =
  | { type: 'library' }
  | { type: 'collections'; collectionId?: string }
  | { type: 'reader'; bookId: string }
  | { type: 'catalog'; sourceId?: string }
  | { type: 'stats' }
  | { type: 'settings' };

export function parseRoute(hash: string): AppRoute {
  const clean = hash.replace(/^#\/?/, '');
  if (clean.startsWith('read/')) {
    const bookId = clean.replace('read/', '');
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

export function navigate(path: string): void {
  window.location.hash = path.startsWith('#') ? path : `#${path}`;
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
