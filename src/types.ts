export type BookStatus = 'unread' | 'reading' | 'completed';
export type BookViewMode = 'grid' | 'list' | 'compact';
export type BookFormat = 'epub' | 'pdf';

export interface Book {
  id: string; // SHA-256 hash of file content
  title: string;
  author: string;
  cover: Blob | null;
  progress: number; // 0 to 1
  lastCfi: string | null;
  readingTimeSeconds: number;
  status: BookStatus;
  addedAt: number;
  lastReadAt: number | null;
  totalLocations: number | null;
  publishedYear?: string | null;
  fileSize?: number;
  format?: BookFormat;
}

export interface BookFile {
  id: string; // matches Book.id
  buffer: ArrayBuffer | Blob;
}

export interface BookLocations {
  bookId: string;
  locations: string; // JSON serialized locations from epub.js
}

export interface Bookmark {
  id: string;
  bookId: string;
  cfi: string;
  percentage: number;
  label: string;
  chapterTitle?: string;
  createdAt: number;
}

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink';

export interface Annotation {
  id: string;
  bookId: string;
  cfiRange: string;
  text: string;
  color: HighlightColor;
  note: string | null;
  chapter: string | null;
  createdAt: number;
  updatedAt: number;
}

export type ReaderTheme =
  | 'light'
  | 'sepia'
  | 'dark'
  | 'auto'
  | 'paper'
  | 'cloud'
  | 'rose'
  | 'charcoal'
  | 'slate'
  | 'oled'
  | 'midnight'
  | 'parchment'
  | 'misty'
  | 'lavender'
  | 'neutral'
  | 'sepia-dark'
  | 'midnight-lavender'
  | 'graphite-blue'
  | 'mint'
  | 'peach'
  | 'sand'
  | 'sky'
  | 'butter'
  | 'mauve'
  | 'olive'
  | 'mist'
  | 'mocha'
  | 'navy'
  | 'plum'
  | 'moss'
  | 'teal-dusk'
  | 'ash-rose'
  | 'coffee'
  | 'nord'
  | 'eink-light'
  | 'eink-dark';

export type ReaderFontFamily =
  | 'serif'
  | 'sans'
  | 'mono'
  | 'publisher'
  | 'literata'
  | 'atkinson'
  | 'opendyslexic'
  | 'inter'
  | 'lexend'
  | 'lora'
  | 'merriweather'
  | 'source-serif-4';

export type ReaderTextAlign = 'left' | 'justify';
export type ReaderFlowMode = 'paginated' | 'scrolled';
export type ReaderPageMargin = 'narrow' | 'normal' | 'wide';
export type ReaderSpreadMode = 'auto' | 'single' | 'double';
export type ReaderTextContrast = 'normal' | 'high' | 'maximum';
export type PdfScrollMode = 'vertical' | 'single';
export type PdfFitMode = 'width' | 'page';
export type PdfPageColor = 'auto' | 'light' | 'dark' | 'sepia';

export interface ReaderSettings {
  theme: ReaderTheme;
  fontFamily: ReaderFontFamily;
  fontSize: number; // 14 to 32 (default: 18)
  lineHeight: number; // 1.3 to 2.2 (default: 1.6)
  textAlign: ReaderTextAlign;
  flowMode: ReaderFlowMode;
  pageMargin: ReaderPageMargin;
  spreadMode?: ReaderSpreadMode; // 'auto' | 'single' | 'double'
  einkMode?: boolean; // Comprehensive E-Ink optimization mode (zero animations, zero shadows, no blur)
  volumeKeysNavigation?: boolean; // Navigate using the device's physical volume buttons
  textContrast?: ReaderTextContrast; // Text weight adjustment for e-reader screens without a backlight
  dailyGoalMinutes?: number; // Daily reading goal (default: 20 minutes)
  readingSpeedWpm?: number; // Average reading speed in words per minute (default: 220 WPM)
  autoUpdateEnabled?: boolean; // Check and prompt/install updates automatically on launch (default: true)
  pdfScrollMode?: PdfScrollMode; // Default scroll mode for PDF files
  pdfFitMode?: PdfFitMode; // Default page fit mode for PDF files
  pdfScale?: number; // Default zoom scale for PDF files (default: 1.0)
  pdfPageColor?: PdfPageColor; // Independent background / invert color mode for PDF pages ('auto' | 'light' | 'dark' | 'sepia')
}

export interface FootnoteData {
  id?: string;
  title: string;
  content: string;
  targetHref?: string;
}

export interface ImageViewData {
  src: string;
  alt?: string;
}

export interface FollowLinkData {
  href: string;
  text?: string;
  x?: number;
  y?: number;
}

export interface LocalSyncFolder {
  id: string;
  name: string;
  handle: FileSystemDirectoryHandle;
  connectedAt: number;
  lastSyncedAt: number | null;
  bookCount: number;
  autoSyncOnLaunch?: boolean;
  autoBackupEnabled?: boolean;
}

export interface DictionaryMeaning {
  partOfSpeech: string;
  definitions: {
    definition: string;
    example?: string;
  }[];
}

export interface DictionaryResult {
  word: string;
  phonetic?: string;
  audioUrl?: string;
  meanings: DictionaryMeaning[];
  translation?: string;
  isOffline: boolean;
}

export interface DictionaryCacheItem {
  word: string; // normalized lowercase
  lang: string;
  phonetic?: string;
  audioUrl?: string;
  meanings: DictionaryMeaning[];
  translation?: string;
  cachedAt: number;
}

export interface TocItem {
  id: string;
  href: string;
  label: string;
  subitems?: TocItem[];
}

export interface SearchResult {
  cfi: string;
  excerpt: string;
  chapterTitle: string;
}

export interface BackupData {
  version: number;
  exportedAt: number;
  books: Omit<Book, 'cover'>[]; // metadata without large blob
  bookmarks: Bookmark[];
  annotations: Annotation[];
}

export interface OpdsFeed {
  id: string;
  title: string;
  url: string;
  icon?: string;
  isCustom?: boolean;
  createdAt: number;
}

export interface CatalogBook {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  summary: string | null;
  downloadUrl: string;
  format: BookFormat;
  language?: string | null;
  subjects?: string[];
  downloadCount?: number;
  source: 'gutenberg' | 'opds' | 'openlibrary';
}

export interface OpdsNavigationLink {
  title: string;
  href: string;
  type?: string;
  rel?: string;
}

export interface OpdsFeedResult {
  title: string;
  subtitle?: string;
  icon?: string;
  books: CatalogBook[];
  subsections: OpdsNavigationLink[];
  nextUrl?: string;
  searchUrl?: string;
}

export interface ReadingLog {
  id: string; // `${date}_${bookId}`
  date: string; // 'YYYY-MM-DD'
  bookId: string;
  durationSeconds: number;
  createdAt: number;
  updatedAt: number;
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'starter' | 'time' | 'books' | 'streak' | 'habits' | 'notes';
  unlocked: boolean;
  unlockedAt?: number;
  progress?: {
    current: number;
    target: number;
    unit: string;
  };
}
