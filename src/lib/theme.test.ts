import { describe, expect, it } from 'vitest';

import { buildCss, HIGHLIGHT_COLORS, isDarkTheme, THEME_PALETTES } from './theme';

import type { ReaderSettings } from '@/types';

describe('Theme & CSS Generator (src/lib/theme.ts)', () => {
  const baseSettings: ReaderSettings = {
    theme: 'light',
    fontFamily: 'sans',
    fontSize: 18,
    lineHeight: 1.6,
    textAlign: 'left',
    flowMode: 'paginated',
    pageMargin: 'normal',
    spreadMode: 'auto',
    einkMode: false,
    volumeKeysNavigation: true,
    textContrast: 'normal',
    dailyGoalMinutes: 20,
    readingSpeedWpm: 220,
    autoUpdateEnabled: true,
    pdfScrollMode: 'vertical',
    pdfFitMode: 'width',
    pdfScale: 1.0,
    pdfPageColor: 'auto',
  };

  describe('isDarkTheme', () => {
    it('correctly identifies dark hex colors', () => {
      expect(isDarkTheme('#000000')).toBe(true);
      expect(isDarkTheme('#171B18')).toBe(true);
      expect(isDarkTheme('#202124')).toBe(true);
      expect(isDarkTheme('#18212B')).toBe(true);
    });

    it('correctly identifies light hex colors', () => {
      expect(isDarkTheme('#FFFFFF')).toBe(false);
      expect(isDarkTheme('#F1F5F0')).toBe(false);
      expect(isDarkTheme('#FBF6EC')).toBe(false);
      expect(isDarkTheme('#F5F3EE')).toBe(false);
    });

    it('returns false for invalid hex input', () => {
      expect(isDarkTheme('invalid')).toBe(false);
      expect(isDarkTheme('#FFF')).toBe(false);
    });
  });

  describe('THEME_PALETTES & HIGHLIGHT_COLORS', () => {
    it('defines expected theme palettes with bg and fg colors', () => {
      expect(THEME_PALETTES.light.bg).toBeDefined();
      expect(THEME_PALETTES.dark.bg).toBeDefined();
      expect(THEME_PALETTES.sepia.bg).toBeDefined();
      expect(THEME_PALETTES['eink-light'].bg).toBe('#FFFFFF');
      expect(THEME_PALETTES['eink-dark'].bg).toBe('#000000');
    });

    it('defines standard highlight colors with fill and border', () => {
      expect(HIGHLIGHT_COLORS.yellow.fill).toBeDefined();
      expect(HIGHLIGHT_COLORS.green.fill).toBeDefined();
      expect(HIGHLIGHT_COLORS.blue.fill).toBeDefined();
      expect(HIGHLIGHT_COLORS.pink.fill).toBeDefined();
    });
  });

  describe('buildCss', () => {
    it('generates CSS variables matching typography settings', () => {
      const css = buildCss(
        {
          ...baseSettings,
          fontSize: 22,
          lineHeight: 1.8,
          textAlign: 'justify',
        },
        'light'
      );

      expect(css).toContain('--reader-font-size: 22px;');
      expect(css).toContain('--reader-line-height: 1.8;');
      expect(css).toContain('--reader-text-align: justify;');
      expect(css).toContain('--reader-hyphens: auto;');
    });

    it('sets horizontal padding to 0 in paginated mode to prevent epub column offset bug', () => {
      const css = buildCss(
        {
          ...baseSettings,
          flowMode: 'paginated',
          pageMargin: 'wide',
        },
        'light'
      );

      expect(css).toContain('--reader-horizontal-padding: 0;');
    });

    it('applies selected margin in scrolled mode', () => {
      const css = buildCss(
        {
          ...baseSettings,
          flowMode: 'scrolled',
          pageMargin: 'wide',
        },
        'light'
      );

      expect(css).toContain('--reader-horizontal-padding: 48px;');
    });

    it('injects universal animation and shadow reset when einkMode is enabled', () => {
      const css = buildCss(
        {
          ...baseSettings,
          einkMode: true,
        },
        'light'
      );

      expect(css).toContain('animation: none !important');
      expect(css).toContain('box-shadow: none !important');
      expect(css).toContain('transition: none !important');
    });

    it('applies font-weight adjustments for text contrast settings', () => {
      const highContrastCss = buildCss(
        {
          ...baseSettings,
          textContrast: 'high',
        },
        'light'
      );
      expect(highContrastCss).toContain('--reader-font-weight: 500;');

      const maxContrastCss = buildCss(
        {
          ...baseSettings,
          textContrast: 'maximum',
        },
        'light'
      );
      expect(maxContrastCss).toContain('--reader-font-weight: 600;');
    });
  });
});
