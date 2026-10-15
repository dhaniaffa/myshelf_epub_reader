import { useEffect } from 'react';

export interface UsePdfHotkeysOptions {
  volumeKeysNavigation?: boolean;
  onNext: () => void;
  onPrev: () => void;
  onOpenToc: () => void;
  onOpenSearch: () => void;
  onToggleBookmark: () => void;
  onToggleBars: () => void;
}

export function usePdfHotkeys({
  volumeKeysNavigation,
  onNext,
  onPrev,
  onOpenToc,
  onOpenSearch,
  onToggleBookmark,
  onToggleBars,
}: UsePdfHotkeysOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (volumeKeysNavigation !== false) {
        if (e.key === 'AudioVolumeDown' || e.key === 'VolumeDown') {
          e.preventDefault();
          onNext();
          return;
        } else if (e.key === 'AudioVolumeUp' || e.key === 'VolumeUp') {
          e.preventDefault();
          onPrev();
          return;
        }
      }

      if (
        e.key === 'ArrowRight' ||
        e.key === 'PageDown' ||
        e.key === 'ArrowDown' ||
        (e.key === ' ' && !e.shiftKey)
      ) {
        e.preventDefault();
        onNext();
      } else if (
        e.key === 'ArrowLeft' ||
        e.key === 'PageUp' ||
        e.key === 'ArrowUp' ||
        (e.key === ' ' && e.shiftKey)
      ) {
        e.preventDefault();
        onPrev();
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
  }, [
    onNext,
    onPrev,
    onOpenToc,
    onOpenSearch,
    onToggleBookmark,
    onToggleBars,
    volumeKeysNavigation,
  ]);
}
