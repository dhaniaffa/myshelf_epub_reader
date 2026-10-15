import http from 'node:http';
import https from 'node:https';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import { APP_CONFIG } from './src/config.ts';

import type { Plugin } from 'vite';

function proxyFetch(
  targetUrl: string,
  clientRes: http.ServerResponse,
  redirects = 0,
  authHeader?: string
) {
  if (redirects > 5) {
    clientRes.statusCode = 502;
    clientRes.end('Too many redirects');
    return;
  }
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    clientRes.statusCode = 400;
    clientRes.end('Invalid URL');
    return;
  }

  const client = parsed.protocol === 'http:' ? http : https;
  const reqHeaders: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: '*/*',
  };
  if (authHeader) {
    reqHeaders['Authorization'] = authHeader;
  }

  const req = client.get(
    targetUrl,
    {
      family: 4,
      headers: reqHeaders,
    },
    (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const nextUrl = new URL(res.headers.location, targetUrl).toString();
        proxyFetch(nextUrl, clientRes, redirects + 1, authHeader);
        return;
      }

      clientRes.statusCode = res.statusCode || 200;
      for (const [key, val] of Object.entries(res.headers)) {
        if (key.toLowerCase() !== 'content-encoding' && val !== undefined) {
          clientRes.setHeader(key, val);
        }
      }
      clientRes.setHeader('Access-Control-Allow-Origin', '*');
      clientRes.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      clientRes.setHeader('Access-Control-Allow-Headers', '*');
      res.pipe(clientRes);
    }
  );

  req.on('error', (err) => {
    clientRes.statusCode = 502;
    clientRes.end(err.message || 'Proxy error');
  });
}

function corsProxyPlugin(): Plugin {
  return {
    name: 'cors-proxy-plugin',
    configureServer(server) {
      server.middlewares.use('/api/proxy', (req, res) => {
        try {
          const host = req.headers.host || 'localhost:5173';
          const urlObj = new URL(req.url || '', `http://${host}`);
          const targetUrl = urlObj.searchParams.get('url');

          if (!targetUrl) {
            res.statusCode = 400;
            res.end('Missing url query parameter');
            return;
          }

          proxyFetch(targetUrl, res, 0, req.headers.authorization);
        } catch (err: unknown) {
          res.statusCode = 502;
          res.end(err instanceof Error ? err.message : 'Proxy error');
        }
      });
    },
  };
}

function htmlConfigPlugin(): Plugin {
  return {
    name: 'html-config-plugin',
    transformIndexHtml(html) {
      return html
        .replace(/%STORAGE_KEY_SETTINGS%/g, APP_CONFIG.storageKeys.settings)
        .replace(/%APP_NAME%/g, APP_CONFIG.name)
        .replace(/%APP_SUBTITLE%/g, APP_CONFIG.subtitle)
        .replace(/%APP_FULL_NAME%/g, APP_CONFIG.fullName);
    },
  };
}

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  clearScreen: false,
  server: {
    host: host || '0.0.0.0',
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  base: './',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/epubjs')) {
            return 'vendor-epub';
          }
          if (id.includes('node_modules/pdfjs-dist')) {
            return 'vendor-pdf';
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/dexie')) {
            return 'vendor-db';
          }
        },
      },
    },
  },
  plugins: [
    htmlConfigPlugin(),
    corsProxyPlugin(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt', // pengguna memilih kapan memuat versi baru (tidak memutus sesi baca)
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: APP_CONFIG.fullName,
        short_name: APP_CONFIG.name,
        description: `${APP_CONFIG.fullName} — Pembaca EPUB & PDF offline.`,
        lang: 'id',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#F1F5F0',
        theme_color: '#F1F5F0',
        categories: ['books', 'education'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
});
