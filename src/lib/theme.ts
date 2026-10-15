import readerBaseCss from '@/styles/reader.css?inline';

import type { HighlightColor, ReaderSettings, ReaderTheme } from '@/types';

export const THEME_PALETTES = {
  // 4. Sage Garden (Default Light)
  light: {
    bg: '#F1F5F0',
    fg: '#283B31',
    selection: 'rgba(71, 122, 88, 0.25)',
    metaTheme: '#F1F5F0',
  },
  // 3. Warm Parchment (Default Sepia)
  sepia: {
    bg: '#FBF6EC',
    fg: '#46392B',
    selection: 'rgba(166, 107, 63, 0.25)',
    metaTheme: '#FBF6EC',
  },
  // 14. Forest Night (Default Dark)
  dark: {
    bg: '#171B18',
    fg: '#DDE7DC',
    selection: 'rgba(145, 182, 139, 0.25)',
    metaTheme: '#171B18',
  },
  // 1. Paper Ivory
  paper: {
    bg: '#F5F3EE',
    fg: '#34332F',
    selection: 'rgba(150, 117, 72, 0.25)',
    metaTheme: '#F5F3EE',
  },
  // 2. Soft Cloud
  cloud: {
    bg: '#F7F8FA',
    fg: '#263238',
    selection: 'rgba(66, 106, 140, 0.25)',
    metaTheme: '#F7F8FA',
  },
  // 7. Rose Paper
  rose: {
    bg: '#F8F3F1',
    fg: '#493735',
    selection: 'rgba(166, 94, 97, 0.25)',
    metaTheme: '#F8F3F1',
  },
  // 10. Soft Charcoal
  charcoal: {
    bg: '#202124',
    fg: '#E4E5E7',
    selection: 'rgba(155, 175, 229, 0.25)',
    metaTheme: '#202124',
  },
  // 11. Deep Slate
  slate: {
    bg: '#18212B',
    fg: '#E3EAF2',
    selection: 'rgba(120, 184, 201, 0.25)',
    metaTheme: '#18212B',
  },
  // 12. OLED Night
  oled: {
    bg: '#101010',
    fg: '#E6E6E6',
    selection: 'rgba(165, 200, 160, 0.25)',
    metaTheme: '#101010',
  },
  // 9. Warm Midnight
  midnight: {
    bg: '#191816',
    fg: '#E8E1D5',
    selection: 'rgba(214, 173, 118, 0.25)',
    metaTheme: '#191816',
  },
  // 3. Warm Parchment (Dedicated Parchment)
  parchment: {
    bg: '#FBF6EC',
    fg: '#46392B',
    selection: 'rgba(166, 107, 63, 0.25)',
    metaTheme: '#FBF6EC',
  },
  // 5. Misty Blue
  misty: {
    bg: '#F1F5FC',
    fg: '#27364D',
    selection: 'rgba(69, 110, 168, 0.25)',
    metaTheme: '#F1F5FC',
  },
  // 6. Lavender Mist
  lavender: {
    bg: '#F7F3FA',
    fg: '#40344F',
    selection: 'rgba(128, 100, 165, 0.25)',
    metaTheme: '#F7F3FA',
  },
  // 8. Neutral Gray
  neutral: {
    bg: '#F3F4F6',
    fg: '#292D35',
    selection: 'rgba(80, 95, 117, 0.25)',
    metaTheme: '#F3F4F6',
  },
  // 13. Sepia Dark
  'sepia-dark': {
    bg: '#27211D',
    fg: '#E8D9C5',
    selection: 'rgba(198, 156, 109, 0.25)',
    metaTheme: '#27211D',
  },
  // 15. Midnight Lavender
  'midnight-lavender': {
    bg: '#1D1B24',
    fg: '#E7E1F0',
    selection: 'rgba(180, 154, 216, 0.25)',
    metaTheme: '#1D1B24',
  },
  // 16. Graphite Blue
  'graphite-blue': {
    bg: '#1E2026',
    fg: '#E5E7ED',
    selection: 'rgba(134, 168, 231, 0.25)',
    metaTheme: '#1E2026',
  },
  // 17. Mint Breeze
  mint: {
    bg: '#F0F7F5',
    fg: '#24383A',
    selection: 'rgba(47, 125, 117, 0.25)',
    metaTheme: '#F0F7F5',
  },
  // 18. Peach Cream
  peach: {
    bg: '#FCF4EE',
    fg: '#44332D',
    selection: 'rgba(192, 105, 74, 0.25)',
    metaTheme: '#FCF4EE',
  },
  // 19. Stone Sand
  sand: {
    bg: '#F4F1EC',
    fg: '#33312D',
    selection: 'rgba(122, 127, 90, 0.25)',
    metaTheme: '#F4F1EC',
  },
  // 20. Sky Whisper
  sky: {
    bg: '#F2F8FB',
    fg: '#24363F',
    selection: 'rgba(47, 127, 157, 0.25)',
    metaTheme: '#F2F8FB',
  },
  // 21. Butter Linen
  butter: {
    bg: '#FAF7E8',
    fg: '#3E3A25',
    selection: 'rgba(140, 127, 42, 0.25)',
    metaTheme: '#FAF7E8',
  },
  // 22. Dusty Mauve
  mauve: {
    bg: '#F6F1F3',
    fg: '#3F3338',
    selection: 'rgba(142, 90, 110, 0.25)',
    metaTheme: '#F6F1F3',
  },
  // 23. Olive Paper
  olive: {
    bg: '#F5F5EC',
    fg: '#30342A',
    selection: 'rgba(102, 122, 58, 0.25)',
    metaTheme: '#F5F5EC',
  },
  // 24. Cool Mist
  mist: {
    bg: '#F4F6F7',
    fg: '#2A3336',
    selection: 'rgba(61, 124, 133, 0.25)',
    metaTheme: '#F4F6F7',
  },
  // 25. Mocha Dark
  mocha: {
    bg: '#1F1A17',
    fg: '#EADFD3',
    selection: 'rgba(208, 138, 94, 0.25)',
    metaTheme: '#1F1A17',
  },
  // 26. Ink Navy
  navy: {
    bg: '#131A26',
    fg: '#E2E8F2',
    selection: 'rgba(111, 163, 224, 0.25)',
    metaTheme: '#131A26',
  },
  // 27. Plum Night
  plum: {
    bg: '#1C171F',
    fg: '#E9E1EE',
    selection: 'rgba(197, 143, 181, 0.25)',
    metaTheme: '#1C171F',
  },
  // 28. Moss Dark
  moss: {
    bg: '#1A1D17',
    fg: '#E0E5D6',
    selection: 'rgba(167, 191, 106, 0.25)',
    metaTheme: '#1A1D17',
  },
  // 29. Teal Dusk
  'teal-dusk': {
    bg: '#141E1F',
    fg: '#DDEAE8',
    selection: 'rgba(95, 191, 176, 0.25)',
    metaTheme: '#141E1F',
  },
  // 30. Ash Rose
  'ash-rose': {
    bg: '#211B1C',
    fg: '#EDE1E1',
    selection: 'rgba(213, 140, 148, 0.25)',
    metaTheme: '#211B1C',
  },
  // 31. Coffee Bean
  coffee: {
    bg: '#1A1512',
    fg: '#E6D8C8',
    selection: 'rgba(201, 162, 79, 0.25)',
    metaTheme: '#1A1512',
  },
  // 32. Nord Frost
  nord: {
    bg: '#1F2430',
    fg: '#E5E9F0',
    selection: 'rgba(136, 192, 208, 0.25)',
    metaTheme: '#1F2430',
  },
  // E-Ink Monokrom Terang (Pure White & Pure Black)
  'eink-light': {
    bg: '#FFFFFF',
    fg: '#000000',
    selection: 'rgba(0, 0, 0, 0.22)',
    metaTheme: '#FFFFFF',
  },
  // E-Ink Monokrom Gelap (Pure Black & Pure White)
  'eink-dark': {
    bg: '#000000',
    fg: '#FFFFFF',
    selection: 'rgba(255, 255, 255, 0.28)',
    metaTheme: '#000000',
  },
} as const;

export const HIGHLIGHT_COLORS: Record<
  HighlightColor,
  { label: string; fill: string; border: string; bgClass: string; textClass: string }
> = {
  yellow: {
    label: 'Kuning',
    fill: 'rgba(250, 204, 21, 0.45)',
    border: '#eab308',
    bgClass: 'bg-yellow-200/80 dark:bg-yellow-900/40',
    textClass: 'text-yellow-800 dark:text-yellow-200',
  },
  green: {
    label: 'Hijau',
    fill: 'rgba(74, 222, 128, 0.45)',
    border: '#22c55e',
    bgClass: 'bg-green-200/80 dark:bg-green-900/40',
    textClass: 'text-green-800 dark:text-green-200',
  },
  blue: {
    label: 'Biru',
    fill: 'rgba(96, 165, 250, 0.45)',
    border: '#3b82f6',
    bgClass: 'bg-blue-200/80 dark:bg-blue-900/40',
    textClass: 'text-blue-800 dark:text-blue-200',
  },
  pink: {
    label: 'Merah Muda',
    fill: 'rgba(244, 114, 182, 0.45)',
    border: '#ec4899',
    bgClass: 'bg-pink-200/80 dark:bg-pink-900/40',
    textClass: 'text-pink-800 dark:text-pink-200',
  },
};

export const FONT_FAMILIES = {
  serif: "Georgia, 'Times New Roman', Cambria, serif",
  sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, Consolas, monospace",
  publisher: 'inherit',
  literata: "'Literata', Georgia, serif",
  atkinson: "'Atkinson Hyperlegible', system-ui, sans-serif",
  opendyslexic: "'OpenDyslexic', sans-serif",
  inter: "'Inter', system-ui, -apple-system, sans-serif",
  lexend: "'Lexend', system-ui, sans-serif",
  lora: "'Lora', Georgia, serif",
  merriweather: "'Merriweather', Georgia, serif",
  'source-serif-4': "'Source Serif 4', Georgia, serif",
};

const PAGE_MARGINS = {
  narrow: '12px',
  normal: '28px',
  wide: '48px',
};

export function isDarkTheme(hex: string): boolean {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6) return false;
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq < 128;
}

/**
 * Generates full CSS string to inject into book iframe
 */
export function buildCss(
  settings: ReaderSettings,
  resolvedTheme: Exclude<ReaderTheme, 'auto'>
): string {
  const palette = THEME_PALETTES[resolvedTheme] || THEME_PALETTES.light;
  const fontFamily = FONT_FAMILIES[settings.fontFamily] || FONT_FAMILIES.sans;
  const isPaginated = settings.flowMode === 'paginated';
  // In paginated mode, body horizontal padding must be 0 to avoid column offset bug
  const horizontalPadding = isPaginated
    ? '0'
    : PAGE_MARGINS[settings.pageMargin] || PAGE_MARGINS.normal;

  const isEink =
    settings.einkMode || resolvedTheme === 'eink-light' || resolvedTheme === 'eink-dark';

  const isDark = isDarkTheme(palette.bg);

  const codeBg = isEink
    ? 'transparent'
    : isDark
      ? 'rgba(255, 255, 255, 0.08)'
      : 'rgba(0, 0, 0, 0.04)';

  const codeBorder = isEink
    ? '1px solid currentColor'
    : isDark
      ? 'rgba(255, 255, 255, 0.14)'
      : 'rgba(0, 0, 0, 0.08)';

  const codeInlineBg = isEink
    ? 'transparent'
    : isDark
      ? 'rgba(255, 255, 255, 0.12)'
      : 'rgba(0, 0, 0, 0.06)';

  const codeInlineBorder = isEink
    ? '1px solid currentColor'
    : isDark
      ? 'rgba(255, 255, 255, 0.16)'
      : 'rgba(0, 0, 0, 0.08)';

  const fontWeight =
    settings.textContrast === 'maximum'
      ? '600'
      : settings.textContrast === 'high'
        ? '500'
        : 'inherit';

  // Syntax highlighting palette adaptif
  const syn = isEink
    ? {
        keyword: palette.fg,
        keywordWeight: '700',
        string: 'inherit',
        comment: palette.fg,
        commentOpacity: '0.7',
        function: 'inherit',
        number: 'inherit',
        operator: 'inherit',
        punctuation: 'inherit',
        attr: 'inherit',
        tag: 'inherit',
        important: 'inherit',
      }
    : isDark
      ? {
          keyword: '#81A1C1',
          keywordWeight: '600',
          string: '#A3BE8C',
          comment: '#8892B0',
          commentOpacity: '1',
          function: '#88C0D0',
          number: '#D08770',
          operator: '#EBCB8B',
          punctuation: 'rgba(255, 255, 255, 0.7)',
          attr: '#8FBCBB',
          tag: '#BF616A',
          important: '#BF616A',
        }
      : {
          keyword: '#0550AE',
          keywordWeight: '600',
          string: '#0A7D34',
          comment: '#6E7781',
          commentOpacity: '1',
          function: '#8250DF',
          number: '#953800',
          operator: '#CF222E',
          punctuation: 'rgba(0, 0, 0, 0.7)',
          attr: '#116329',
          tag: '#116329',
          important: '#CF222E',
        };

  const variables = `
    :root {
      /* Base Palette Colors */
      --reader-bg: ${palette.bg};
      --reader-fg: ${palette.fg};
      --reader-selection: ${palette.selection};

      /* Tipografi & Tata Letak */
      --reader-font-family: ${fontFamily};
      --reader-content-font-family: ${settings.fontFamily !== 'publisher' ? fontFamily : 'inherit'};
      --reader-font-size: ${settings.fontSize}px;
      --reader-line-height: ${settings.lineHeight};
      --reader-text-align: ${settings.textAlign === 'justify' ? 'justify' : 'left'};
      --reader-hyphens: ${settings.textAlign === 'justify' ? 'auto' : 'manual'};
      --reader-font-weight: ${fontWeight};
      --reader-horizontal-padding: ${horizontalPadding};

      /* Tautan */
      --reader-link-opacity: ${isEink ? '1' : '0.85'};
      --reader-link-color: ${isEink ? palette.fg : 'inherit'};
      --reader-link-weight: ${isEink ? '600' : 'inherit'};

      /* Gambar */
      --reader-img-bg: ${isDark ? '#F8F9FA' : 'transparent'};
      --reader-img-padding: ${isDark ? '8px' : '0'};
      --reader-img-border: ${isDark ? '1px solid rgba(255, 255, 255, 0.12)' : 'none'};
      --reader-img-shadow: ${isDark ? '0 2px 8px rgba(0, 0, 0, 0.25)' : 'none'};
      --reader-img-filter: ${isEink ? 'grayscale(100%) contrast(115%)' : 'none'};
      --reader-img-transition: ${isEink ? 'none' : 'transform 0.15s ease, opacity 0.15s ease'};

      /* Blok & Sebaris Kode */
      --reader-code-bg: ${codeBg};
      --reader-code-border: ${codeBorder};
      --reader-code-inline-bg: ${codeInlineBg};
      --reader-code-inline-border: ${codeInlineBorder};
      --reader-ebook-code-line-color: ${isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.45)'};
      --reader-pre-white-space: ${isPaginated ? 'pre-wrap' : 'pre'};
      --reader-pre-word-break: ${isPaginated ? 'break-word' : 'normal'};
      --reader-pre-overflow-wrap: ${isPaginated ? 'break-word' : 'normal'};
      --reader-pre-overflow: ${isPaginated ? 'visible' : 'auto'};
      --reader-pre-overflow-x: ${isPaginated ? 'visible' : 'auto'};

      /* Text Highlights */
      --reader-hl-yellow: ${HIGHLIGHT_COLORS.yellow.fill};
      --reader-hl-green: ${HIGHLIGHT_COLORS.green.fill};
      --reader-hl-blue: ${HIGHLIGHT_COLORS.blue.fill};
      --reader-hl-pink: ${HIGHLIGHT_COLORS.pink.fill};

      /* Syntax Highlighting */
      --reader-syn-keyword: ${syn.keyword};
      --reader-syn-keyword-weight: ${syn.keywordWeight};
      --reader-syn-string: ${syn.string};
      --reader-syn-comment: ${syn.comment};
      --reader-syn-comment-opacity: ${syn.commentOpacity};
      --reader-syn-function: ${syn.function};
      --reader-syn-number: ${syn.number};
      --reader-syn-operator: ${syn.operator};
      --reader-syn-punctuation: ${syn.punctuation};
      --reader-syn-attr: ${syn.attr};
      --reader-syn-tag: ${syn.tag};
      --reader-syn-important: ${syn.important};
    }
  `;

  const einkReset = isEink
    ? `
    * {
      transition: none !important;
      animation: none !important;
      box-shadow: none !important;
      text-shadow: none !important;
    }
    `
    : '';

  return `${variables}\n${einkReset}\n${readerBaseCss}\n/*# sourceURL=reader-theme.css */`;
}
