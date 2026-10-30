import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { BookOpen, RefreshCw } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { AppShell } from '@/components/layout/AppShell';
import { GlobalSyncIndicator } from '@/components/sync/GlobalSyncIndicator';
import { ToastContainer } from '@/components/ToastContainer';
import { Button } from '@/components/ui';
import { UpdateDialog } from '@/components/UpdateDialog';
import { CatalogPage } from '@/features/catalog/CatalogPage';
import { LibraryPage } from '@/features/library/LibraryPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { StatsPage } from '@/features/stats/StatsPage';
import { handleBackAction } from '@/lib/backHandler';
import { navigate, parseRoute, useHashRoute } from '@/lib/route';
import { THEME_PALETTES } from '@/lib/theme';
import { checkForAppUpdate } from '@/lib/updater';
import { useSettingsStore } from '@/store/settings';
import { toast } from '@/store/toast';

import type { AppUpdateInfo } from '@/lib/updater';
import type { ReaderTheme } from '@/types';

const ReaderPage = lazy(() =>
  import('@/features/reader/ReaderPage').then((m) => ({ default: m.ReaderPage }))
);

// Preload ReaderPage in background idle time so opening books feels instant
if (typeof window !== 'undefined') {
  const preloadReader = () => {
    import('@/features/reader/ReaderPage');
  };
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(preloadReader, { timeout: 3000 });
  } else {
    setTimeout(preloadReader, 1500);
  }
}

export const App: React.FC = () => {
  const route = useHashRoute();
  const { theme, autoUpdateEnabled = true } = useSettingsStore();

  const [startupUpdate, setStartupUpdate] = useState<AppUpdateInfo | null>(null);
  const [startupDialogOpen, setStartupDialogOpen] = useState(false);

  // Auto-check for updates on initial launch if enabled
  useEffect(() => {
    if (!autoUpdateEnabled) return;

    let active = true;
    const timer = setTimeout(async () => {
      try {
        const update = await checkForAppUpdate();
        if (active && update) {
          setStartupUpdate(update);
          setStartupDialogOpen(true);
        }
      } catch (err) {
        console.warn('Initial update check skipped:', err);
      }
    }, 1500);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [autoUpdateEnabled]);

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

  // Global Android / hardware back press & escape handler
  useEffect(() => {
    let lastBackPressTime = 0;

    const performBack = (): boolean => {
      // 1. Close any open Dialog, Sheet, or custom modal registered in the LIFO stack
      if (handleBackAction()) {
        return true;
      }

      // 2. If no modal is open, check route hierarchy
      const currentHash = window.location.hash;
      const currentRoute = parseRoute(currentHash);

      if (currentRoute.type !== 'library') {
        navigate('');
        return true;
      }

      // 3. Already on root LibraryPage: double-back to exit
      const now = Date.now();
      if (now - lastBackPressTime < 2000) {
        // Exit Android app if running in native wrapper
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bridge = (window as any).AndroidBackupBridge;
        if (bridge && typeof bridge.exitApp === 'function') {
          bridge.exitApp();
          return true;
        }

        // Desktop Tauri exit fallback
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tauri = (window as any).__TAURI__;
        if (tauri?.process?.exit) {
          tauri.process.exit(0);
          return true;
        }

        return false;
      }

      lastBackPressTime = now;
      toast.info('Tekan sekali lagi untuk keluar');
      return true;
    };

    // Attach to window for Android WebView evaluateJavascript bridge
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__handleAndroidBack = performBack;

    // Attach to Escape key globally (desktop / tablet hardware keyboard)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        performBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__handleAndroidBack;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <>
      {route.type === 'reader' ? (
        <Suspense
          fallback={
            <div className="bg-surface text-on-surface flex h-screen w-screen flex-col items-center justify-center gap-4 select-none">
              <div className="relative flex items-center justify-center">
                <div className="border-primary/20 border-t-primary h-14 w-14 animate-spin rounded-full border-3" />
                <BookOpen size={22} className="text-primary absolute animate-pulse" />
              </div>
              <div className="flex flex-col items-center gap-1 text-center">
                <p className="text-on-surface text-sm font-semibold tracking-wide">
                  Membuka Buku...
                </p>
                <p className="text-on-surface-variant text-xs">Menyiapkan halaman bacaan</p>
              </div>
            </div>
          }
        >
          <ReaderPage bookId={route.bookId} />
        </Suspense>
      ) : route.type === 'catalog' ? (
        <AppShell currentRoute="catalog">
          <CatalogPage sourceId={route.sourceId} />
        </AppShell>
      ) : route.type === 'stats' ? (
        <AppShell currentRoute="stats">
          <StatsPage />
        </AppShell>
      ) : route.type === 'settings' ? (
        <AppShell currentRoute="settings">
          <SettingsPage />
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

      {/* Startup Auto Update Dialog */}
      <UpdateDialog
        open={startupDialogOpen}
        onClose={() => setStartupDialogOpen(false)}
        updateInfo={startupUpdate}
      />
    </>
  );
};
