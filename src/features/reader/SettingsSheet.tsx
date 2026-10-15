import React from 'react';
import {
  AlignJustify,
  AlignLeft,
  Bold,
  BookOpen,
  Check,
  ChevronsUpDown,
  Columns2,
  FileText,
  FoldVertical,
  RefreshCw,
  RotateCcw,
  Scroll,
  Sparkles,
  Tablet,
  UnfoldVertical,
  Volume2,
} from 'lucide-react';

import { ThemeSegmented } from '@/components/ThemeSegmented';
import { Button, Sheet } from '@/components/ui';
import { FONT_FAMILIES } from '@/lib/theme';
import { useSettingsStore } from '@/store/settings';

import type {
  ReaderFlowMode,
  ReaderFontFamily,
  ReaderPageMargin,
  ReaderSpreadMode,
  ReaderTextAlign,
  ReaderTheme,
} from '@/types';

const THEME_LABELS: Record<ReaderTheme, string> = {
  light: 'Sage Garden',
  sepia: 'Sepia Klasik',
  dark: 'Forest Night',
  paper: 'Paper Ivory',
  cloud: 'Soft Cloud',
  rose: 'Rose Paper',
  charcoal: 'Soft Charcoal',
  slate: 'Deep Slate',
  oled: 'OLED Night',
  midnight: 'Warm Midnight',
  parchment: 'Warm Parchment',
  misty: 'Misty Blue',
  lavender: 'Lavender Mist',
  neutral: 'Neutral Gray',
  'sepia-dark': 'Sepia Dark',
  'midnight-lavender': 'Midnight Lavender',
  'graphite-blue': 'Graphite Blue',
  mint: 'Mint Breeze',
  peach: 'Peach Cream',
  sand: 'Stone Sand',
  sky: 'Sky Whisper',
  butter: 'Butter Linen',
  mauve: 'Dusty Mauve',
  olive: 'Olive Paper',
  mist: 'Cool Mist',
  mocha: 'Mocha Dark',
  navy: 'Ink Navy',
  plum: 'Plum Night',
  moss: 'Moss Dark',
  'teal-dusk': 'Teal Dusk',
  'ash-rose': 'Ash Rose',
  coffee: 'Coffee Bean',
  nord: 'Nord Frost',
  'eink-light': 'E-Ink Terang (Monokrom)',
  'eink-dark': 'E-Ink Gelap (Monokrom)',
  auto: 'Otomatis (Sistem)',
};

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
  onFlashRefresh?: () => void;
}

interface FontOptionItem {
  id: ReaderFontFamily;
  name: string;
  sub: string;
  fontClass: string;
}

export const SettingsSheet: React.FC<SettingsSheetProps> = ({ open, onClose, onFlashRefresh }) => {
  const settings = useSettingsStore();

  const fontOptions: FontOptionItem[] = [
    { id: 'sans', name: 'Sans', sub: 'Sistem Bersih', fontClass: 'font-sans' },
    { id: 'inter', name: 'Inter', sub: 'Modern & Presisi', fontClass: 'font-inter' },
    { id: 'lexend', name: 'Lexend', sub: 'Kecepatan Membaca', fontClass: 'font-lexend' },
    { id: 'serif', name: 'Serif', sub: 'Sistem Klasik', fontClass: 'font-serif' },
    { id: 'literata', name: 'Literata', sub: 'Google Books Serif', fontClass: 'font-literata' },
    { id: 'lora', name: 'Lora', sub: 'Sastra & Mengalir', fontClass: 'font-lora' },
    {
      id: 'merriweather',
      name: 'Merriweather',
      sub: 'Tebal & Nyaman HP',
      fontClass: 'font-merriweather',
    },
    {
      id: 'source-serif-4',
      name: 'Source Serif',
      sub: 'Editorial Bersih',
      fontClass: 'font-source-serif-4',
    },
    { id: 'atkinson', name: 'Atkinson', sub: 'Kejelasan Karakter', fontClass: 'font-atkinson' },
    {
      id: 'opendyslexic',
      name: 'OpenDyslexic',
      sub: 'Ramah Disleksia',
      fontClass: 'font-opendyslexic',
    },
    { id: 'mono', name: 'Mono', sub: 'Jarak Tetap', fontClass: 'font-mono' },
    { id: 'publisher', name: 'Buku', sub: 'Format Asli', fontClass: '' },
  ];

  const spreadOptions: {
    mode: ReaderSpreadMode;
    title: string;
    desc: string;
    icon: React.ReactNode;
  }[] = [
    {
      mode: 'auto',
      title: 'Otomatis',
      desc: '1 atau 2 Kolom adaptif',
      icon: <Sparkles size={15} />,
    },
    {
      mode: 'single',
      title: '1 Halaman',
      desc: 'Halaman tunggal',
      icon: <FileText size={15} />,
    },
    {
      mode: 'double',
      title: '2 Halaman',
      desc: 'Buku terbuka',
      icon: <Columns2 size={15} />,
    },
  ];

  const flowOptions: {
    mode: ReaderFlowMode;
    title: string;
    desc: string;
    icon: React.ReactNode;
  }[] = [
    {
      mode: 'paginated',
      title: 'Halaman',
      desc: 'Buka per halaman',
      icon: <BookOpen size={16} />,
    },
    {
      mode: 'scrolled',
      title: 'Gulir',
      desc: 'Mengalir ke bawah',
      icon: <Scroll size={16} />,
    },
  ];

  const lineHeightOptions = [
    { val: 1.4, label: 'Rapat', icon: <FoldVertical size={13} /> },
    { val: 1.6, label: 'Normal', icon: <UnfoldVertical size={13} /> },
    { val: 1.9, label: 'Longgar', icon: <ChevronsUpDown size={13} /> },
  ];

  const marginOptions: { val: ReaderPageMargin; label: string; sub: string }[] = [
    { val: 'narrow', label: 'Sempit', sub: 'Layar Penuh' },
    { val: 'normal', label: 'Sedang', sub: 'Seimbang' },
    { val: 'wide', label: 'Lebar', sub: 'Fokus' },
  ];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Pengaturan Tampilan"
      footer={
        <div className="flex w-full items-center justify-between">
          <Button
            variant="text"
            size="sm"
            icon={<RotateCcw size={14} />}
            onClick={() => settings.resetSettings()}
          >
            Atur Ulang
          </Button>
          <Button variant="filled" size="sm" onClick={onClose}>
            Selesai
          </Button>
        </div>
      }
    >
      <div className="space-y-6 pb-2">
        {/* 1. COLOR THEME */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-on-surface text-xs font-semibold tracking-wider uppercase">
              Tema Tampilan
            </label>
            <span className="text-on-surface-variant text-[10px] font-medium">
              {THEME_LABELS[settings.theme] || settings.theme}
            </span>
          </div>
          <ThemeSegmented theme={settings.theme} onChange={settings.setTheme} compact />
        </div>

        {/* 2. MODE MEMBACA */}
        <div className="space-y-2">
          <label className="text-on-surface block text-xs font-semibold tracking-wider uppercase">
            Mode Membaca
          </label>
          <div className="grid grid-cols-2 gap-2">
            {flowOptions.map((f) => {
              const isSelected = settings.flowMode === f.mode;
              return (
                <button
                  key={f.mode}
                  type="button"
                  onClick={() => settings.setFlowMode(f.mode)}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                    isSelected
                      ? 'bg-primary-container text-on-primary-container border-primary ring-primary font-semibold shadow-xs ring-1'
                      : 'bg-surface-container-low text-on-surface border-outline-variant/30 hover:bg-surface-container-high'
                  }`}
                >
                  <div
                    className={`shrink-0 rounded-xl p-2 transition-colors ${
                      isSelected
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-highest text-on-surface-variant'
                    }`}
                  >
                    {f.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs leading-tight font-bold">{f.title}</div>
                    <div
                      className={`mt-0.5 text-[10px] leading-tight ${
                        isSelected ? 'text-on-primary-container/80' : 'text-on-surface-variant'
                      }`}
                    >
                      {f.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2B. COLUMN LAYOUT (Paged mode only) */}
        {settings.flowMode === 'paginated' && (
          <div className="animate-fade-in space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-on-surface block text-xs font-semibold tracking-wider uppercase">
                Kolom Tampilan
              </label>
              <span className="text-on-surface-variant text-[10px] font-medium">
                {settings.spreadMode === 'double'
                  ? 'Buku Terbuka'
                  : settings.spreadMode === 'single'
                    ? '1 Halaman'
                    : 'Adaptif'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {spreadOptions.map((s) => {
                const isSelected = (settings.spreadMode || 'auto') === s.mode;
                return (
                  <button
                    key={s.mode}
                    type="button"
                    onClick={() => settings.setSpreadMode(s.mode)}
                    className={`flex cursor-pointer flex-col gap-1.5 rounded-2xl border p-2.5 text-left transition-all ${
                      isSelected
                        ? 'bg-primary-container text-on-primary-container border-primary ring-primary font-semibold shadow-xs ring-1'
                        : 'bg-surface-container-low text-on-surface border-outline-variant/30 hover:bg-surface-container-high'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className={`shrink-0 rounded-lg p-1.5 ${
                          isSelected
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-container-highest text-on-surface-variant'
                        }`}
                      >
                        {s.icon}
                      </div>
                      {isSelected && <Check size={13} className="text-primary font-bold" />}
                    </div>
                    <div>
                      <div className="text-xs leading-tight font-bold">{s.title}</div>
                      <div
                        className={`mt-0.5 text-[9px] leading-tight ${
                          isSelected ? 'text-on-primary-container/80' : 'text-on-surface-variant'
                        }`}
                      >
                        {s.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. JENIS HURUF */}
        <div className="space-y-2">
          <label className="text-on-surface block text-xs font-semibold tracking-wider uppercase">
            Jenis Huruf
          </label>
          <div className="grid grid-cols-2 gap-2">
            {fontOptions.map((f, idx) => {
              const isSelected = settings.fontFamily === f.id;
              const isLastOdd = idx === fontOptions.length - 1 && fontOptions.length % 2 !== 0;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => settings.setFontFamily(f.id)}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-2xl border p-2.5 text-left transition-all ${
                    isLastOdd ? 'col-span-2' : ''
                  } ${
                    isSelected
                      ? 'bg-primary-container text-on-primary-container border-primary ring-primary font-semibold shadow-xs ring-1'
                      : 'bg-surface-container-low text-on-surface border-outline-variant/30 hover:bg-surface-container-high'
                  }`}
                >
                  <span className={`w-7 shrink-0 text-center text-lg font-bold ${f.fontClass}`}>
                    Aa
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs leading-tight font-bold">{f.name}</div>
                    <div
                      className={`mt-0.5 text-[10px] leading-tight ${
                        isSelected ? 'text-on-primary-container/80' : 'text-on-surface-variant'
                      }`}
                    >
                      {f.sub}
                    </div>
                  </div>
                  {isSelected && <Check size={14} className="text-primary shrink-0 font-bold" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. FONT SIZE */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label className="text-on-surface font-semibold tracking-wider uppercase">
              Ukuran Huruf
            </label>
            <span className="text-primary bg-primary/10 rounded-full px-2.5 py-0.5 text-xs font-bold">
              {settings.fontSize} px
            </span>
          </div>

          <div className="bg-surface-container-low border-outline-variant/30 flex items-center gap-3 rounded-2xl border p-2">
            <button
              type="button"
              onClick={() => settings.setFontSize(settings.fontSize - 1)}
              disabled={settings.fontSize <= 14}
              className="bg-surface-container-high hover:bg-surface-container-highest text-on-surface flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-30"
              title="Perkecil Ukuran"
            >
              A-
            </button>
            <input
              type="range"
              min={14}
              max={32}
              step={1}
              value={settings.fontSize}
              onChange={(e) => settings.setFontSize(parseInt(e.target.value))}
              className="accent-primary bg-surface-container-highest h-2 flex-1 cursor-pointer appearance-none rounded-lg"
            />
            <button
              type="button"
              onClick={() => settings.setFontSize(settings.fontSize + 1)}
              disabled={settings.fontSize >= 32}
              className="bg-surface-container-high hover:bg-surface-container-highest text-on-surface flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-30"
              title="Perbesar Ukuran"
            >
              A+
            </button>
          </div>
        </div>

        {/* 5. LINE SPACING & TEXT ALIGNMENT */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Jarak Baris */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="text-on-surface font-semibold tracking-wider uppercase">
                Jarak Baris
              </label>
              <span className="text-primary text-[10px] font-bold">
                {settings.lineHeight.toFixed(1)}x
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {lineHeightOptions.map((lh) => {
                const isSelected = Math.abs(settings.lineHeight - lh.val) < 0.1;
                return (
                  <button
                    key={lh.val}
                    type="button"
                    onClick={() => settings.setLineHeight(lh.val)}
                    className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border px-1 py-2 text-center transition-all ${
                      isSelected
                        ? 'bg-secondary-container text-on-secondary-container border-secondary font-bold shadow-2xs'
                        : 'bg-surface-container-low text-on-surface-variant border-outline-variant/30 hover:bg-surface-container-high'
                    }`}
                  >
                    {lh.icon}
                    <span className="text-[10px]">{lh.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rata Paragraf */}
          <div className="space-y-2">
            <label className="text-on-surface block text-xs font-semibold tracking-wider uppercase">
              Rata Paragraf
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { val: 'left', label: 'Kiri', icon: <AlignLeft size={16} /> },
                { val: 'justify', label: 'Penuh', icon: <AlignJustify size={16} /> },
              ].map((align) => {
                const isSelected = settings.textAlign === align.val;
                return (
                  <button
                    key={align.val}
                    type="button"
                    onClick={() => settings.setTextAlign(align.val as ReaderTextAlign)}
                    className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border px-2 py-2 text-center transition-all ${
                      isSelected
                        ? 'bg-secondary-container text-on-secondary-container border-secondary font-bold shadow-2xs'
                        : 'bg-surface-container-low text-on-surface-variant border-outline-variant/30 hover:bg-surface-container-high'
                    }`}
                  >
                    {align.icon}
                    <span className="text-[10px] font-semibold">{align.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 6. BATAS TEPI (MARGIN) */}
        <div className="space-y-2">
          <label className="text-on-surface block text-xs font-semibold tracking-wider uppercase">
            Batas Tepi (Margin)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {marginOptions.map((m) => {
              const isSelected = settings.pageMargin === m.val;
              return (
                <button
                  key={m.val}
                  type="button"
                  onClick={() => settings.setPageMargin(m.val)}
                  className={`cursor-pointer rounded-2xl border p-2.5 text-center transition-all ${
                    isSelected
                      ? 'bg-secondary-container text-on-secondary-container border-secondary font-bold shadow-2xs'
                      : 'bg-surface-container-low text-on-surface border-outline-variant/30 hover:bg-surface-container-high'
                  }`}
                >
                  <div className="text-xs leading-tight font-bold">{m.label}</div>
                  <div className="text-on-surface-variant mt-0.5 text-[10px] opacity-80">
                    {m.sub}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 7. KOTAK PRATINJAU LANGSUNG */}
        <div className="bg-surface-container border-outline-variant/30 space-y-1.5 rounded-2xl border p-3.5">
          <div className="text-primary flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase">
            <Sparkles size={12} /> Pratinjau Tampilan
          </div>
          <p
            className="text-on-surface leading-relaxed transition-all"
            style={{
              fontSize: `${Math.min(22, Math.max(13, settings.fontSize * 0.9))}px`,
              lineHeight: settings.lineHeight,
              textAlign: settings.textAlign,
              fontFamily: FONT_FAMILIES[settings.fontFamily] || 'sans-serif',
            }}
          >
            "Membaca buku membuka jendela imajinasi dan memperluas pengetahuan tanpa batas."
          </p>
        </div>

        {/* 8. OPTIMASI E-INK & E-READER */}
        <div className="border-outline-variant/30 space-y-3 border-t pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Tablet size={15} className="text-primary" />
              <label className="text-on-surface text-xs font-bold tracking-wider uppercase">
                Optimasi E-Ink & E-Reader
              </label>
            </div>
            {settings.einkMode && (
              <span className="text-primary bg-primary/10 rounded-full px-2 py-0.5 text-[10px] font-semibold">
                Mode E-Ink Aktif
              </span>
            )}
          </div>

          {/* Toggle Mode E-Ink */}
          <div className="bg-surface-container-low border-outline-variant/30 flex items-center justify-between gap-3 rounded-2xl border p-3">
            <div>
              <div className="text-on-surface text-xs font-bold">
                Mode Layar E-Ink (Bebas Animasi)
              </div>
              <div className="text-on-surface-variant mt-0.5 text-[10px]">
                Menonaktifkan animasi & transisi CSS untuk mencegah flicker dan ghosting pada layar
                e-paper.
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const nextVal = !settings.einkMode;
                settings.setEinkMode(nextVal);
                if (nextVal && settings.theme !== 'eink-light' && settings.theme !== 'eink-dark') {
                  settings.setTheme('eink-light');
                }
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.einkMode ? 'bg-primary' : 'bg-surface-container-highest'
              }`}
            >
              <span
                className={`bg-surface pointer-events-none inline-block h-5 w-5 transform rounded-full shadow-xs ring-0 transition duration-200 ease-in-out ${
                  settings.einkMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Volume Button Navigation Toggle */}
          <div className="bg-surface-container-low border-outline-variant/30 flex items-center justify-between gap-3 rounded-2xl border p-3">
            <div className="flex items-start gap-2.5">
              <Volume2 size={16} className="text-primary mt-0.5 shrink-0" />
              <div>
                <div className="text-on-surface text-xs font-bold">
                  Navigasi Tombol Volume Fisik
                </div>
                <div className="text-on-surface-variant mt-0.5 text-[10px]">
                  Tombol Volume Turun = Halaman Maju, Volume Naik = Halaman Mundur.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => settings.setVolumeKeysNavigation(!settings.volumeKeysNavigation)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.volumeKeysNavigation ? 'bg-primary' : 'bg-surface-container-highest'
              }`}
            >
              <span
                className={`bg-surface pointer-events-none inline-block h-5 w-5 transform rounded-full shadow-xs ring-0 transition duration-200 ease-in-out ${
                  settings.volumeKeysNavigation ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Font Boldness Options */}
          <div className="space-y-1.5">
            <div className="text-on-surface flex items-center gap-1.5 text-xs font-semibold">
              <Bold size={13} className="text-primary" />
              <span>Ketebalan Teks (Font Boldness)</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: 'normal', label: 'Normal', desc: 'Standar' },
                { val: 'high', label: 'Tebal', desc: 'Kontras Tinggi' },
                { val: 'maximum', label: 'Maksimum', desc: 'Sangat Pekat' },
              ].map((opt) => {
                const isSelected = (settings.textContrast || 'normal') === opt.val;
                return (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() =>
                      settings.setTextContrast(opt.val as NonNullable<typeof settings.textContrast>)
                    }
                    className={`cursor-pointer rounded-xl border p-2 text-center transition-all ${
                      isSelected
                        ? 'bg-primary-container text-on-primary-container border-primary font-bold shadow-2xs'
                        : 'bg-surface-container-low text-on-surface border-outline-variant/30 hover:bg-surface-container-high'
                    }`}
                  >
                    <div className="text-xs leading-tight font-bold">{opt.label}</div>
                    <div className="text-on-surface-variant mt-0.5 text-[9px] opacity-80">
                      {opt.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Clear Screen Button (Flash Screen Refresh) */}
          {onFlashRefresh && (
            <div className="pt-1">
              <Button
                variant="outlined"
                size="sm"
                icon={<RefreshCw size={14} />}
                onClick={() => {
                  onFlashRefresh();
                }}
                className="w-full justify-center"
              >
                Bersihkan Layar E-Ink (Hapus Ghosting)
              </Button>
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
};
