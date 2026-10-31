import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'scripts/**/*.{test,spec}.{js,ts}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/lib/**',
        'src/store/**',
        'src/features/reader/utils/**',
        'src/features/reader/components/pdf/pdfUtils.ts',
        'src/components/ui.tsx',
        'scripts/bump-version.js',
      ],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'scripts/**/*.test.js',
        'src/test/**',
        'src/lib/epub.ts',
        'src/lib/pdf.ts',
        'src/lib/fileSystemSync.ts',
        'src/lib/proxy.ts',
        'src/lib/updater.ts',
        'src/lib/cover.ts',
        'src/lib/importBooks.ts',
        'src/lib/gutenberg.ts',
        'src/lib/openlibrary.ts',
        'src/store/sync.ts',
        'src/features/reader/utils/iframeListeners.ts',
        'src/features/reader/utils/swipePhysics.ts',
        'src/features/reader/utils/pdfPinchZoom.ts',
        'src/features/reader/utils/readerLocation.ts',
        'src/features/reader/utils/epubHtml.ts',
        'src/lib/useClickOutside.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
