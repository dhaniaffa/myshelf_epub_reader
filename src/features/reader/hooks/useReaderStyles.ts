import { useEffect } from 'react';

import { THEME_STYLE_ID } from '@/config';
import { buildCss } from '@/lib/theme';

import type { ReaderSettings, ReaderTheme } from '@/types';
import type { Contents, Rendition } from 'epubjs';

interface UseReaderStylesOptions {
  renditionRef: React.RefObject<Rendition | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  settings: ReaderSettings;
  resolvedTheme: Exclude<ReaderTheme, 'auto'>;
  isReady: boolean;
}

export function useReaderStyles({
  renditionRef,
  containerRef,
  settings,
  resolvedTheme,
  isReady,
}: UseReaderStylesOptions) {
  // Update dynamic styling when settings or theme changes without re-mounting
  useEffect(() => {
    if (!renditionRef.current) return;
    try {
      renditionRef.current.themes.fontSize(`${settings.fontSize}px`);
    } catch {
      // ignore
    }
    const cssRules = buildCss(settings, resolvedTheme);

    // Inject into active iframe document
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contentsList: Contents[] = (renditionRef.current as any).getContents();
      for (const contents of contentsList) {
        let styleEl = contents.document.getElementById(THEME_STYLE_ID);
        if (!styleEl) {
          styleEl = contents.document.createElement('style');
          styleEl.id = THEME_STYLE_ID;
          contents.document.head.appendChild(styleEl);
        }
        styleEl.innerHTML = cssRules;
      }
    } catch {
      // ignore
    }
  }, [settings, resolvedTheme, renditionRef]);

  // Dynamically update spread mode (single/double page) without reloading book
  useEffect(() => {
    if (!renditionRef.current || settings.flowMode === 'scrolled') return;
    const spreadVal =
      settings.spreadMode === 'double'
        ? 'always'
        : settings.spreadMode === 'single'
          ? 'none'
          : 'auto';
    const minWidth =
      settings.spreadMode === 'double' ? 1 : settings.spreadMode === 'single' ? 99999 : 768;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rendition = renditionRef.current as any;
      rendition.spread(spreadVal, minWidth);
      if (rendition.manager && rendition.manager.isRendered()) {
        rendition.manager.updateLayout();
      }
      const loc = rendition.currentLocation?.();
      const cfi = loc?.start?.cfi;
      if (cfi) {
        rendition.display(cfi);
      }
    } catch {
      // ignore
    }
  }, [settings.spreadMode, settings.flowMode, renditionRef]);

  // Update layout if page margin changes without reloading book
  useEffect(() => {
    if (!renditionRef.current || !containerRef.current || !isReady) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rendition = renditionRef.current as any;
      if (rendition.manager && rendition.manager.isRendered()) {
        rendition.manager.updateLayout();
      }
      const loc = rendition.currentLocation?.();
      const cfi = loc?.start?.cfi;
      if (cfi) {
        rendition.display(cfi);
      }
    } catch {
      // ignore
    }
  }, [settings.pageMargin, isReady, renditionRef, containerRef]);
}
