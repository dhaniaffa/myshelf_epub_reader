/**
 * App Configuration Constants
 */
export const APP_CONFIG = {
  // Application Name & Version
  name: 'MyShelf',
  subtitle: 'Offline Library Epub Reader',
  fullName: 'MyShelf - Offline Library Epub Reader',
  version: '1.0.0',

  // Database Name (IndexedDB)
  databaseName: 'MyShelfDB',

  // Local Storage Keys
  storageKeys: {
    settings: 'myshelf_settings',
    viewMode: 'myshelf_view_mode',
    syncFolder: 'myshelf_sync_folder',
  },

  // Reader Events
  eventPrefix: 'myshelf',
  events: {
    toggleBars: 'myshelf:toggle-bars',
    openFootnote: 'myshelf:open-footnote',
    openImage: 'myshelf:open-image',
    followLink: 'myshelf:follow-link',
  },

  // Theme Style ID
  themeStyleId: 'myshelf-theme-style',

  // GitHub Repository & Update Endpoints
  repository: {
    owner: 'dhaniaffa',
    repo: 'myshelf_epub_reader',
    url: 'https://github.com/dhaniaffa/myshelf_epub_reader',
    releasesApi: 'https://api.github.com/repos/dhaniaffa/myshelf_epub_reader/releases/latest',
  },
} as const;

export const APP_NAME = APP_CONFIG.name;
export const APP_SUBTITLE = APP_CONFIG.subtitle;
export const APP_FULL_NAME = APP_CONFIG.fullName;
export const APP_VERSION = APP_CONFIG.version;
export const READER_EVENTS = APP_CONFIG.events;
export const THEME_STYLE_ID = APP_CONFIG.themeStyleId;
