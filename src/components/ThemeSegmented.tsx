import React, { useState } from 'react';
import { Check, Monitor, Moon, Sun, Zap } from 'lucide-react';

import type { ReaderTheme } from '@/types';

interface ThemeSegmentedProps {
  theme: ReaderTheme;
  onChange: (theme: ReaderTheme) => void;
  className?: string;
  compact?: boolean;
}

interface ThemeOption {
  id: ReaderTheme;
  name: string;
  fullName: string;
  bg: string;
  fg: string;
  accent: string;
}

const LIGHT_THEMES: ThemeOption[] = [
  {
    id: 'light',
    name: 'Sage',
    fullName: 'Sage Garden',
    bg: '#F1F5F0',
    fg: '#283B31',
    accent: '#477A58',
  },
  {
    id: 'paper',
    name: 'Ivory',
    fullName: 'Paper Ivory',
    bg: '#F5F3EE',
    fg: '#34332F',
    accent: '#967548',
  },
  {
    id: 'cloud',
    name: 'Cloud',
    fullName: 'Soft Cloud',
    bg: '#F7F8FA',
    fg: '#263238',
    accent: '#426A8C',
  },
  {
    id: 'parchment',
    name: 'Parchment',
    fullName: 'Warm Parchment',
    bg: '#FBF6EC',
    fg: '#46392B',
    accent: '#A66B3F',
  },
  {
    id: 'misty',
    name: 'Misty',
    fullName: 'Misty Blue',
    bg: '#F1F5FC',
    fg: '#27364D',
    accent: '#456EA8',
  },
  {
    id: 'lavender',
    name: 'Lavender',
    fullName: 'Lavender Mist',
    bg: '#F7F3FA',
    fg: '#40344F',
    accent: '#8064A5',
  },
  {
    id: 'rose',
    name: 'Rose',
    fullName: 'Rose Paper',
    bg: '#F8F3F1',
    fg: '#493735',
    accent: '#A65E61',
  },
  {
    id: 'neutral',
    name: 'Neutral',
    fullName: 'Neutral Gray',
    bg: '#F3F4F6',
    fg: '#292D35',
    accent: '#505F75',
  },
  {
    id: 'mint',
    name: 'Mint',
    fullName: 'Mint Breeze',
    bg: '#F0F7F5',
    fg: '#24383A',
    accent: '#2F7D75',
  },
  {
    id: 'peach',
    name: 'Peach',
    fullName: 'Peach Cream',
    bg: '#FCF4EE',
    fg: '#44332D',
    accent: '#C0694A',
  },
  {
    id: 'sand',
    name: 'Sand',
    fullName: 'Stone Sand',
    bg: '#F4F1EC',
    fg: '#33312D',
    accent: '#7A7F5A',
  },
  {
    id: 'sky',
    name: 'Sky',
    fullName: 'Sky Whisper',
    bg: '#F2F8FB',
    fg: '#24363F',
    accent: '#2F7F9D',
  },
  {
    id: 'butter',
    name: 'Butter',
    fullName: 'Butter Linen',
    bg: '#FAF7E8',
    fg: '#3E3A25',
    accent: '#8C7F2A',
  },
  {
    id: 'mauve',
    name: 'Mauve',
    fullName: 'Dusty Mauve',
    bg: '#F6F1F3',
    fg: '#3F3338',
    accent: '#8E5A6E',
  },
  {
    id: 'olive',
    name: 'Olive',
    fullName: 'Olive Paper',
    bg: '#F5F5EC',
    fg: '#30342A',
    accent: '#667A3A',
  },
  {
    id: 'mist',
    name: 'Mist',
    fullName: 'Cool Mist',
    bg: '#F4F6F7',
    fg: '#2A3336',
    accent: '#3D7C85',
  },
];

const DARK_THEMES: ThemeOption[] = [
  {
    id: 'dark',
    name: 'Forest',
    fullName: 'Forest Night',
    bg: '#171B18',
    fg: '#DDE7DC',
    accent: '#91B68B',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    fullName: 'Warm Midnight',
    bg: '#191816',
    fg: '#E8E1D5',
    accent: '#D6AD76',
  },
  {
    id: 'charcoal',
    name: 'Charcoal',
    fullName: 'Soft Charcoal',
    bg: '#202124',
    fg: '#E4E5E7',
    accent: '#9BAFE5',
  },
  {
    id: 'slate',
    name: 'Slate',
    fullName: 'Deep Slate',
    bg: '#18212B',
    fg: '#E3EAF2',
    accent: '#78B8C9',
  },
  {
    id: 'oled',
    name: 'OLED',
    fullName: 'OLED Night',
    bg: '#101010',
    fg: '#E6E6E6',
    accent: '#A5C8A0',
  },
  {
    id: 'sepia-dark',
    name: 'Sepia Dk',
    fullName: 'Sepia Dark',
    bg: '#27211D',
    fg: '#E8D9C5',
    accent: '#C69C6D',
  },
  {
    id: 'midnight-lavender',
    name: 'Mid Lav',
    fullName: 'Midnight Lavender',
    bg: '#1D1B24',
    fg: '#E7E1F0',
    accent: '#B49AD8',
  },
  {
    id: 'graphite-blue',
    name: 'Graphite',
    fullName: 'Graphite Blue',
    bg: '#1E2026',
    fg: '#E5E7ED',
    accent: '#86A8E7',
  },
  {
    id: 'mocha',
    name: 'Mocha',
    fullName: 'Mocha Dark',
    bg: '#1F1A17',
    fg: '#EADFD3',
    accent: '#D08A5E',
  },
  {
    id: 'navy',
    name: 'Navy',
    fullName: 'Ink Navy',
    bg: '#131A26',
    fg: '#E2E8F2',
    accent: '#6FA3E0',
  },
  {
    id: 'plum',
    name: 'Plum',
    fullName: 'Plum Night',
    bg: '#1C171F',
    fg: '#E9E1EE',
    accent: '#C58FB5',
  },
  {
    id: 'moss',
    name: 'Moss',
    fullName: 'Moss Dark',
    bg: '#1A1D17',
    fg: '#E0E5D6',
    accent: '#A7BF6A',
  },
  {
    id: 'teal-dusk',
    name: 'Teal Dusk',
    fullName: 'Teal Dusk',
    bg: '#141E1F',
    fg: '#DDEAE8',
    accent: '#5FBFB0',
  },
  {
    id: 'ash-rose',
    name: 'Ash Rose',
    fullName: 'Ash Rose',
    bg: '#211B1C',
    fg: '#EDE1E1',
    accent: '#D58C94',
  },
  {
    id: 'coffee',
    name: 'Coffee',
    fullName: 'Coffee Bean',
    bg: '#1A1512',
    fg: '#E6D8C8',
    accent: '#C9A24F',
  },
  {
    id: 'nord',
    name: 'Nord',
    fullName: 'Nord Frost',
    bg: '#1F2430',
    fg: '#E5E9F0',
    accent: '#88C0D0',
  },
];

const EINK_THEMES: ThemeOption[] = [
  {
    id: 'eink-light',
    name: 'E-Ink Terang',
    fullName: 'E-Ink Monokrom Terang (Pure White)',
    bg: '#FFFFFF',
    fg: '#000000',
    accent: '#000000',
  },
  {
    id: 'eink-dark',
    name: 'E-Ink Gelap',
    fullName: 'E-Ink Monokrom Gelap (Pure Black)',
    bg: '#000000',
    fg: '#FFFFFF',
    accent: '#FFFFFF',
  },
];

const getCategoryForTheme = (t: ReaderTheme): 'light' | 'dark' | 'eink' => {
  if (LIGHT_THEMES.some((item) => item.id === t)) return 'light';
  if (DARK_THEMES.some((item) => item.id === t)) return 'dark';
  if (EINK_THEMES.some((item) => item.id === t)) return 'eink';
  if (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark';
  }
  return 'light';
};

export const ThemeSegmented: React.FC<ThemeSegmentedProps> = ({
  theme,
  onChange,
  className = '',
  compact = false,
}) => {
  const [userTab, setUserTab] = useState<'light' | 'dark' | 'eink' | null>(null);
  const [prevTheme, setPrevTheme] = useState(theme);

  if (prevTheme !== theme) {
    setPrevTheme(theme);
    setUserTab(null);
  }

  const activeTab = userTab ?? getCategoryForTheme(theme);

  const renderThemeSwatch = (t: ThemeOption) => {
    const isSelected = theme === t.id;
    return (
      <button
        key={t.id}
        type="button"
        title={t.fullName}
        onClick={() => onChange(t.id)}
        className={`group flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl p-1 transition-all ${
          isSelected ? 'scale-102' : 'opacity-85 hover:scale-101 hover:opacity-100'
        }`}
      >
        <div
          className={`relative flex aspect-square w-full items-center justify-center rounded-2xl border text-sm font-bold shadow-xs transition-all ${
            isSelected
              ? 'ring-primary ring-offset-surface-container border-primary shadow-sm ring-2 ring-offset-2'
              : 'border-outline-variant/40 hover:border-outline'
          }`}
          style={{
            backgroundColor: t.bg,
            color: t.fg,
          }}
        >
          <span className="font-serif text-base tracking-tight">Aa</span>
          <span
            className="absolute bottom-1.5 left-1.5 h-2 w-2 rounded-full shadow-xs"
            style={{ backgroundColor: t.accent }}
            title={`Aksen: ${t.accent}`}
          />
          {isSelected && (
            <div className="bg-primary text-on-primary absolute top-1.5 right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full shadow-xs">
              <Check size={9} strokeWidth={3.5} />
            </div>
          )}
        </div>
        <span
          className={`max-w-full truncate text-center text-[11px] ${
            isSelected ? 'text-primary font-bold' : 'text-on-surface-variant font-medium'
          }`}
        >
          {t.name}
        </span>
      </button>
    );
  };

  const renderEinkThemes = (gridClass = 'grid-cols-1 sm:grid-cols-2') => (
    <div className={`grid ${gridClass} w-full gap-2 sm:gap-2.5`}>
      {EINK_THEMES.map((t) => {
        const isSelected = theme === t.id;
        return (
          <button
            key={t.id}
            type="button"
            title={t.fullName}
            onClick={() => onChange(t.id)}
            className={`group flex cursor-pointer items-center gap-2.5 rounded-2xl border p-2 transition-all ${
              isSelected
                ? 'border-primary ring-primary ring-offset-surface-container bg-surface-container-high ring-2 ring-offset-1'
                : 'border-outline-variant/40 hover:border-outline bg-surface-container-low'
            }`}
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-current text-xs font-bold shadow-xs"
              style={{ backgroundColor: t.bg, color: t.fg }}
            >
              Aa
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div
                className={`text-xs leading-tight ${
                  isSelected ? 'text-on-surface font-bold' : 'text-on-surface-variant font-medium'
                }`}
              >
                {t.name}
              </div>
              <div className="text-on-surface-variant/70 truncate text-[10px]">
                {t.id === 'eink-light' ? '100% Putih Murni' : '100% Hitam Murni'}
              </div>
            </div>
            {isSelected && (
              <div className="bg-primary text-on-primary flex h-4 w-4 shrink-0 items-center justify-center rounded-full">
                <Check size={10} strokeWidth={3.5} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className={`space-y-3.5 ${className}`}>
      {/* Auto / Sistem Toggle Button */}
      <button
        type="button"
        onClick={() => onChange('auto')}
        className={`flex w-full cursor-pointer items-center justify-between rounded-2xl border px-3.5 py-2.5 text-xs font-medium transition-all ${
          theme === 'auto'
            ? 'bg-primary/10 border-primary text-primary font-semibold shadow-xs'
            : 'bg-surface-container/60 hover:bg-surface-container border-outline-variant/40 text-on-surface-variant'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Monitor size={16} />
          <span>Ikuti Tema Sistem (Otomatis)</span>
        </div>
        {theme === 'auto' && (
          <span className="text-primary flex items-center gap-1 text-[11px] font-bold">
            <Check size={13} strokeWidth={3} /> Aktif
          </span>
        )}
      </button>

      {/* Compact Mode (for Reader Drawer / Sheet): uses category tabs + spacious 4-column grid */}
      {compact ? (
        <div className="space-y-3">
          {/* Segmented Category Tabs */}
          <div className="bg-surface-container-high/60 border-outline-variant/30 grid grid-cols-3 gap-1 rounded-2xl border p-1">
            <button
              type="button"
              onClick={() => setUserTab('light')}
              className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'light'
                  ? 'bg-surface text-primary font-bold shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Sun size={13} className="shrink-0" />
              <span>Terang</span>
              <span className="bg-surface-container-highest rounded-md px-1.5 py-0.5 font-mono text-[10px] opacity-75">
                {LIGHT_THEMES.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setUserTab('dark')}
              className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'dark'
                  ? 'bg-surface text-primary font-bold shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Moon size={13} className="shrink-0" />
              <span>Gelap</span>
              <span className="bg-surface-container-highest rounded-md px-1.5 py-0.5 font-mono text-[10px] opacity-75">
                {DARK_THEMES.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setUserTab('eink')}
              className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'eink'
                  ? 'bg-surface text-primary font-bold shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Zap size={13} className="shrink-0" />
              <span>E-Ink</span>
              <span className="bg-surface-container-highest rounded-md px-1.5 py-0.5 font-mono text-[10px] opacity-75">
                {EINK_THEMES.length}
              </span>
            </button>
          </div>

          {/* Swatches Grid: spacious and proportional 4 columns */}
          {activeTab === 'light' && (
            <div className="animate-fade-in grid w-full grid-cols-4 gap-2.5">
              {LIGHT_THEMES.map(renderThemeSwatch)}
            </div>
          )}

          {activeTab === 'dark' && (
            <div className="animate-fade-in grid w-full grid-cols-4 gap-2.5">
              {DARK_THEMES.map(renderThemeSwatch)}
            </div>
          )}

          {activeTab === 'eink' && (
            <div className="animate-fade-in">{renderEinkThemes('grid-cols-1 gap-2')}</div>
          )}
        </div>
      ) : (
        /* Full Mode (Settings Page / Wide Screen): Displays complete gallery */
        <>
          {/* Terang (Light Themes) */}
          <div className="space-y-1.5">
            <span className="text-on-surface-variant/80 text-[10px] font-semibold tracking-wider uppercase">
              Tema Terang ({LIGHT_THEMES.length})
            </span>
            <div className="grid w-full grid-cols-4 gap-2.5 sm:grid-cols-6 sm:gap-3 md:grid-cols-8">
              {LIGHT_THEMES.map(renderThemeSwatch)}
            </div>
          </div>

          {/* Gelap (Dark Themes) */}
          <div className="space-y-1.5">
            <span className="text-on-surface-variant/80 text-[10px] font-semibold tracking-wider uppercase">
              Tema Gelap ({DARK_THEMES.length})
            </span>
            <div className="grid w-full grid-cols-4 gap-2.5 sm:grid-cols-6 sm:gap-3 md:grid-cols-8">
              {DARK_THEMES.map(renderThemeSwatch)}
            </div>
          </div>

          {/* Monokrom E-Ink (Kontras Tinggi) */}
          <div className="space-y-1.5">
            <span className="text-on-surface-variant/80 text-[10px] font-semibold tracking-wider uppercase">
              Monokrom E-Ink (Kontras Tinggi)
            </span>
            {renderEinkThemes('grid-cols-1 sm:grid-cols-2')}
          </div>
        </>
      )}
    </div>
  );
};
