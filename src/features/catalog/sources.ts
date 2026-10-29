import React from 'react';
import { Rss } from 'lucide-react';

export type CatalogSourceId = 'gutenberg' | 'opds' | 'standardebooks' | 'openlibrary';

export interface CatalogSourceConfig {
  id: CatalogSourceId;
  name: string;
  shortName: string;
  description: string;
  longDescription: string;
  badge?: string;
  tags: string[];
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconBgColor: string;
  iconColor: string;
  type: 'gutenberg' | 'opds' | 'custom';
  defaultFeedUrl?: string;
  status: 'active' | 'coming_soon';
}

export const GutenbergIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 28,
  className = '',
}) =>
  React.createElement('img', {
    src: '/icons/book_catalouges/project-gutenberg.png',
    alt: 'Project Gutenberg',
    width: size,
    height: size,
    className: `object-contain rounded-md shrink-0 ${className}`,
    loading: 'lazy',
  });

export const StandardEbooksIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 28,
  className = '',
}) =>
  React.createElement('img', {
    src: '/icons/book_catalouges/standard-ebooks.png',
    alt: 'Standard Ebooks',
    width: size,
    height: size,
    className: `object-contain rounded-md shrink-0 ${className}`,
    loading: 'lazy',
  });

export const OpenLibraryIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 28,
  className = '',
}) =>
  React.createElement('img', {
    src: '/icons/book_catalouges/open-library.png',
    alt: 'Open Library',
    width: size,
    height: size,
    className: `object-contain rounded-md shrink-0 ${className}`,
    loading: 'lazy',
  });

export const CATALOG_SOURCES: CatalogSourceConfig[] = [
  {
    id: 'gutenberg',
    name: 'Project Gutenberg',
    shortName: 'Gutenberg',
    description: 'Lebih dari 70.000 buku domain publik klasik dunia gratis & legal (via Gutendex)',
    longDescription:
      'Project Gutenberg adalah perpustakaan digital gratis yang menyediakan puluhan ribu e-book, terutama karya sastra klasik, novel, puisi, dan literatur bersejarah yang dapat dibaca online atau diunduh dalam berbagai format.',
    badge: 'EPUB',
    tags: ['Buku Klasik', 'Gratis', 'Domain Publik', 'EPUB', 'Literatur Dunia'],
    icon: GutenbergIcon,
    iconBgColor: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    iconColor: 'text-red-600 dark:text-red-400',
    type: 'gutenberg',
    status: 'active',
  },
  {
    id: 'standardebooks',
    name: 'Standard Ebooks',
    shortName: 'Standard Ebooks',
    description: 'Koleksi e-book klasik gratis dengan format profesional, dan tipografi rapi.',
    longDescription:
      'Standard Ebooks adalah proyek berbasis sukarelawan yang menyediakan e-book gratis dari karya-karya domain publik, terutama literatur berbahasa Inggris. Setiap buku ditata dengan tipografi konsisten, dikoreksi dengan teliti, dilengkapi metadata terstruktur dan sampul berkualitas, serta dioptimalkan untuk perangkat pembaca e-book modern. File e-book dan hasil penyuntingan proyek ini juga dirilis secara terbuka untuk mendukung akses dan distribusi literatur digital.',
    badge: 'Premium EPUB',
    tags: ['Klasik', 'Tipografi Profesional', 'Teks Terkoreksi', 'EPUB', 'Open Source'],
    icon: StandardEbooksIcon,
    iconBgColor: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20',
    iconColor: 'text-slate-600 dark:text-slate-300',
    type: 'opds',
    defaultFeedUrl: 'https://standardebooks.org/feeds/atom/new-releases',
    status: 'active',
  },
  {
    id: 'opds',
    name: 'Feed OPDS',
    shortName: 'Feed OPDS',
    description: 'Protokol katalog buku terbuka (Open Publication Distribution System)',
    longDescription:
      'Hubungkan server koleksi pribadi seperti Calibre Web, Komga, Kavita, atau direktori OPDS publik lainnya untuk sinkronisasi dan unduh buku langsung.',
    badge: 'Server Pribadi',
    tags: ['Calibre', 'Komga', 'Kavita', 'Custom Feeds'],
    icon: Rss,
    iconBgColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
    type: 'opds',
    status: 'active',
  },
  {
    id: 'openlibrary',
    name: 'Open Library',
    shortName: 'Open Library',
    description: 'Arsip buku terbuka jutaan judul dari Internet Archive',
    longDescription:
      'Open Library adalah proyek perpustakaan digital terbuka yang bertujuan menyediakan halaman katalog untuk setiap buku yang pernah diterbitkan. Platform ini memungkinkan pengguna mencari informasi buku, menjelajahi karya penulis, melihat berbagai edisi, serta membaca atau meminjam buku digital tertentu jika tersedia. Open Library juga menyediakan API publik untuk pencarian buku dan akses metadata, sehingga cocok untuk integrasi dengan aplikasi katalog buku dan proyek literasi digital.',
    badge: 'Public Catalog',
    tags: ['Internet Archive', 'Pencarian Global', 'Arsip Digital', 'EPUB'],
    icon: OpenLibraryIcon,
    iconBgColor: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    iconColor: 'text-amber-700 dark:text-amber-400',
    type: 'custom',
    status: 'active',
  },
];
