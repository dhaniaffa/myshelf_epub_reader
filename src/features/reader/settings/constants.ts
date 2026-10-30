import type {
  PdfPageColor,
  ReaderFlowMode,
  ReaderFontFamily,
  ReaderPageMargin,
  ReaderSpreadMode,
  ReaderTextAlign,
  ReaderTheme,
} from '@/types';

export const THEME_LABELS: Record<ReaderTheme, string> = {
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

export interface FontOptionItem {
  id: ReaderFontFamily;
  name: string;
  sub: string;
  fontClass: string;
}

export const FONT_OPTIONS: FontOptionItem[] = [
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

export const LINE_HEIGHT_OPTIONS = [
  { val: 1.4, label: 'Rapat' },
  { val: 1.6, label: 'Normal' },
  { val: 1.9, label: 'Longgar' },
];

export const TEXT_ALIGN_OPTIONS: { val: ReaderTextAlign; label: string }[] = [
  { val: 'left', label: 'Kiri' },
  { val: 'justify', label: 'Penuh' },
];

export const SPREAD_OPTIONS: {
  mode: ReaderSpreadMode;
  title: string;
  desc: string;
}[] = [
  {
    mode: 'auto',
    title: 'Otomatis',
    desc: '1 atau 2 Kolom adaptif',
  },
  {
    mode: 'single',
    title: '1 Halaman',
    desc: 'Halaman tunggal',
  },
  {
    mode: 'double',
    title: '2 Halaman',
    desc: 'Buku terbuka',
  },
];

export const FLOW_OPTIONS: {
  mode: ReaderFlowMode;
  title: string;
  desc: string;
}[] = [
  {
    mode: 'paginated',
    title: 'Halaman',
    desc: 'Buka per halaman',
  },
  {
    mode: 'scrolled',
    title: 'Gulir',
    desc: 'Mengalir ke bawah',
  },
];

export const MARGIN_OPTIONS: { val: ReaderPageMargin; label: string; sub: string }[] = [
  { val: 'narrow', label: 'Sempit', sub: 'Layar Penuh' },
  { val: 'normal', label: 'Sedang', sub: 'Seimbang' },
  { val: 'wide', label: 'Lebar', sub: 'Fokus' },
];

export interface PdfPageColorOption {
  id: PdfPageColor;
  name: string;
  fullName: string;
  bg?: string;
  fg?: string;
  accent?: string;
  isAuto?: boolean;
}

export const PDF_PAGE_COLOR_OPTIONS: PdfPageColorOption[] = [
  {
    id: 'light',
    name: 'Putih',
    fullName: 'Putih / Terang (Halaman Asli)',
    bg: '#FFFFFF',
    fg: '#18181B',
    accent: '#3B82F6',
  },
  {
    id: 'dark',
    name: 'Gelap',
    fullName: 'Gelap / Malam (Latar Hitam)',
    bg: '#18181B',
    fg: '#F4F4F5',
    accent: '#6366F1',
  },
  {
    id: 'sepia',
    name: 'Sepia',
    fullName: 'Sepia Hangat (Kertas Krem)',
    bg: '#F4ECD8',
    fg: '#46392B',
    accent: '#A66B3F',
  },
  {
    id: 'auto',
    name: 'Otomatis',
    fullName: 'Ikuti Tema Pembaca',
    isAuto: true,
  },
];
