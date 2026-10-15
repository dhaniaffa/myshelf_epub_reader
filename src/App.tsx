import React, { lazy, Suspense, useEffect, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { AppShell } from '@/components/layout/AppShell';
import { GlobalSyncIndicator } from '@/components/sync/GlobalSyncIndicator';
import { ToastContainer } from '@/components/ToastContainer';
import { Button } from '@/components/ui';
import { LibraryPage } from '@/features/library/LibraryPage';
import { useHashRoute } from '@/lib/route';
import { THEME_PALETTES } from '@/lib/theme';
import { useSettingsStore } from '@/store/settings';

import type { ReaderTheme } from '@/types';

const ReaderPage = lazy(() =>
  import('@/features/reader/ReaderPage').then((m) => ({ default: m.ReaderPage }))
);

const CatalogPage = lazy(() =>
  import('@/features/catalog/CatalogPage').then((m) => ({ default: m.CatalogPage }))
);

const StatsPage = lazy(() =>
  import('@/features/stats/StatsPage').then((m) => ({ default: m.StatsPage }))
);

const SettingsPage = lazy(() =>
  import('@/features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);

export const App: React.FC = () => {
  const route = useHashRoute();
  const { theme } = useSettingsStore();

  // PWA Service Worker updater
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r);
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  // Synchronize data-theme and meta theme-color on HTML
  const resolvedTheme = useMemo<Exclude<ReaderTheme, 'auto'>>(() => {
    if (theme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  }, [theme]);

  // Update data-theme and meta theme-color when resolvedTheme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    const metaTheme = document.getElementById('meta-theme-color');
    if (metaTheme) {
      metaTheme.setAttribute('content', THEME_PALETTES[resolvedTheme].metaTheme);
    }
  }, [resolvedTheme]);

  return (
    <>
      {route.type === 'reader' ? (
        <Suspense
          fallback={
            <div className="bg-surface text-on-surface flex h-screen w-screen flex-col items-center justify-center gap-3">
              <div className="border-primary h-8 w-8 animate-spin rounded-full border-3 border-t-transparent" />
              <p className="text-on-surface-variant text-xs font-medium">Memuat pembaca buku...</p>
            </div>
          }
        >
          <ReaderPage bookId={route.bookId} />
        </Suspense>
      ) : route.type === 'catalog' ? (
        <AppShell currentRoute="catalog">
          <Suspense
            fallback={
              <div className="bg-surface text-on-surface flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-3">
                <div className="border-primary h-8 w-8 animate-spin rounded-full border-3 border-t-transparent" />
                <p className="text-on-surface-variant text-xs font-medium">
                  Memuat katalog buku...
                </p>
              </div>
            }
          >
            <CatalogPage sourceId={route.sourceId} />
          </Suspense>
        </AppShell>
      ) : route.type === 'stats' ? (
        <AppShell currentRoute="stats">
          <Suspense
            fallback={
              <div className="bg-surface text-on-surface flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-3">
                <div className="border-primary h-8 w-8 animate-spin rounded-full border-3 border-t-transparent" />
                <p className="text-on-surface-variant text-xs font-medium">
                  Memuat data statistik...
                </p>
              </div>
            }
          >
            <StatsPage />
          </Suspense>
        </AppShell>
      ) : route.type === 'settings' ? (
        <AppShell currentRoute="settings">
          <Suspense
            fallback={
              <div className="bg-surface text-on-surface flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-3">
                <div className="border-primary h-8 w-8 animate-spin rounded-full border-3 border-t-transparent" />
                <p className="text-on-surface-variant text-xs font-medium">Memuat pengaturan...</p>
              </div>
            }
          >
            <SettingsPage />
          </Suspense>
        </AppShell>
      ) : (
        <AppShell currentRoute="library">
          <LibraryPage />
        </AppShell>
      )}

      {/* PWA Update Banner */}
      {needRefresh && (
        <div className="animate-slide-up fixed inset-x-0 top-4 z-50 mx-auto w-fit">
          <div className="bg-surface-container-highest text-on-surface border-primary/30 flex items-center gap-3 rounded-full border px-4 py-2.5 text-xs font-medium shadow-xl">
            <span>Versi baru MyShelf telah tersedia!</span>
            <Button
              variant="filled"
              size="sm"
              icon={<RefreshCw size={13} />}
              onClick={() => updateServiceWorker(true)}
            >
              Muat Ulang
            </Button>
            <button
              onClick={() => setNeedRefresh(false)}
              className="text-on-surface-variant hover:text-on-surface cursor-pointer text-xs underline"
            >
              Nanti
            </button>
          </div>
        </div>
      )}

      {/* Global Background Sync Indicator */}
      <GlobalSyncIndicator />

      {/* Global Toast Container */}
      <ToastContainer />
    </>
  );
};
