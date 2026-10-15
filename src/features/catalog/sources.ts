import React from 'react';
import { BookOpen, Globe, Rss, Sparkles } from 'lucide-react';

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

export const CATALOG_SOURCES: CatalogSourceConfig[] = [
  {
    id: 'gutenberg',
    name: 'Project Gutenberg',
    shortName: 'Gutenberg',
    description: 'Lebih dari 70.000 buku domain publik klasik dunia gratis & legal (via Gutendex)',
    longDescription:
      'Arsip digital sastra klasik dunia terbesar. Temukan mahakarya dari Arthur Conan Doyle, Jane Austen, Mary Shelley, dan ribuan penulis bersejarah lainnya.',
    badge: '70rb+ Buku',
    tags: ['Klasik', 'Pencarian Instan', 'Domain Publik', 'EPUB'],
    icon: BookOpen,
    iconBgColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    type: 'gutenberg',
    status: 'active',
  },
  {
    id: 'standardebooks',
    name: 'Standard Ebooks',
    shortName: 'Standard Ebooks',
    description: 'Buku domain publik terkurasi dengan tipografi elegan & tata letak modern',
    longDescription:
      'Edisi buku domain publik sukarela dengan standar tipografi profesional mutakhir, tata letak modern, font yang disempurnakan, dan sampul seni bermutu tinggi.',
    badge: 'Tipografi Modern',
    tags: ['Terkurasi', 'Desain Modern', 'Bebas Hak Cipta', 'EPUB3'],
    icon: Sparkles,
    iconBgColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    iconColor: 'text-amber-600 dark:text-amber-400',
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
      'Inisiatif perpustakaan terbuka dari Internet Archive yang bertujuan mendokumentasikan dan menyediakan akses ke jutaan buku terbitan di seluruh dunia.',
    badge: 'Jutaan Buku',
    tags: ['Internet Archive', 'Pencarian Global', 'Arsip Digital', 'EPUB'],
    icon: Globe,
    iconBgColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    type: 'custom',
    status: 'active',
  },
];
