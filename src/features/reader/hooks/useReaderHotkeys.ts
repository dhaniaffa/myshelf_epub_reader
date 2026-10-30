import { useEffect } from 'react';

export interface UseReaderHotkeysOptions {
  volumeKeysNavigation?: boolean;
  next: () => void;
  prev: () => void;
  onOpenToc: () => void;
  onOpenSearch: () => void;
  onToggleBookmark: () => void;
  onToggleBars: () => void;
}

/**
 * Custom hook to handle keyboard shortcuts and hardware volume keys navigation.
 */
export function useReaderHotkeys({
  volumeKeysNavigation,
  next,
  prev,
  onOpenToc,
  onOpenSearch,
  onToggleBookmark,
  onToggleBars,
}: UseReaderHotkeysOptions): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in input / textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      // Physical volume keys navigation (Hardware Keys)
      if (volumeKeysNavigation !== false) {
        if (e.key === 'AudioVolumeDown' || e.key === 'VolumeDown') {
          e.preventDefault();
          next();
          return;
        } else if (e.key === 'AudioVolumeUp' || e.key === 'VolumeUp') {
          e.preventDefault();
          prev();
          return;
        }
      }

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
        e.preventDefault();
        prev();
      } else if (e.key === 't' || e.key === 'T') {
        onOpenToc();
      } else if (e.key === '/') {
        e.preventDefault();
        onOpenSearch();
      } else if (e.key === 'b' || e.key === 'B') {
        onToggleBookmark();
      } else if (e.key === 'Escape') {
        onToggleBars();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [next, prev, onOpenToc, onOpenSearch, onToggleBookmark, onToggleBars, volumeKeysNavigation]);
}
