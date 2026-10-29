import React from 'react';
import { ArrowRight, Code2, Compass, Plus, Server } from 'lucide-react';

import { Button } from '@/components/ui';
import { CATALOG_SOURCES } from '@/features/catalog/sources';

import type { CatalogSourceConfig, CatalogSourceId } from '@/features/catalog/sources';

interface CatalogHubViewProps {
  onSelectSource: (sourceId: CatalogSourceId) => void;
  onOpenAddCustomFeed: () => void;
  onOpenAddSourceInfo: () => void;
}

export const CatalogHubView: React.FC<CatalogHubViewProps> = ({
  onSelectSource,
  onOpenAddCustomFeed,
  onOpenAddSourceInfo,
}) => {
  return (
    <div className="space-y-6 pb-28 sm:pb-16">
      {/* 1. HERO BANNER */}
      <div className="from-primary/10 via-surface-container to-surface-container-high border-outline-variant/30 relative overflow-hidden rounded-3xl border bg-linear-to-br p-5 sm:p-8">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="border-primary/20 bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold">
            <Compass size={14} />
            <span>Pusat Katalog Buku Terbuka</span>
          </div>

          <h2 className="text-on-surface text-xl font-extrabold tracking-tight sm:text-2xl">
            Pilih Sumber Koleksi Buku
          </h2>

          <p className="text-on-surface-variant text-xs leading-relaxed sm:text-sm">
            Jelajahi ribuan karya sastra domain publik bebas hak cipta, nikmati edisi dengan
            tipografi modern, atau hubungkan perpustakaan digital pribadi Anda via OPDS.
          </p>
        </div>

        {/* Decorative background circle */}
        <div className="bg-primary/5 pointer-events-none absolute -right-12 -bottom-12 h-56 w-56 rounded-full blur-3xl" />
      </div>

      {/* 2. SOURCES GRID */}
      <div className="space-y-3">
        <div className="flex flex-col gap-1.5 px-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-on-surface text-sm font-bold tracking-tight">
              Daftar Sumber Tersedia
            </h3>
            <span className="bg-surface-container-highest text-on-surface-variant shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap">
              {CATALOG_SOURCES.length} Sumber
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenAddSourceInfo}
            className="text-primary hover:text-primary/80 flex w-fit cursor-pointer items-center gap-1.5 text-xs font-medium hover:underline active:opacity-75"
          >
            <Code2 size={13} className="shrink-0" />
            <span className="whitespace-nowrap">Panduan Sumber Baru</span>
          </button>
        </div>

        {/* Catalog Sources Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {CATALOG_SOURCES.map((src: CatalogSourceConfig) => {
            const Icon = src.icon;
            const isComingSoon = src.status === 'coming_soon';

            return (
              <button
                type="button"
                key={src.id}
                onClick={() => {
                  if (!isComingSoon) {
                    onSelectSource(src.id);
                  }
                }}
                className={`group border-outline-variant/30 flex w-full flex-col justify-between rounded-3xl border p-5 text-left transition-all duration-200 ${
                  isComingSoon
                    ? 'bg-surface-container/40 cursor-default opacity-75'
                    : 'bg-surface-container/70 hover:bg-surface-container hover:border-outline-variant/60 cursor-pointer hover:shadow-md active:scale-99'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Row: Icon & Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-xs transition-transform duration-200 group-hover:scale-105 ${src.iconBgColor}`}
                    >
                      <Icon size={28} />
                    </div>

                    {src.badge && (
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase ${
                          isComingSoon
                            ? 'bg-surface-container-highest text-on-surface-variant border-outline-variant/30'
                            : 'bg-primary/10 text-primary border-primary/20 shadow-xs'
                        }`}
                      >
                        {src.badge}
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h4 className="text-on-surface group-hover:text-primary text-base font-bold transition-colors">
                      {src.name}
                    </h4>
                    <p className="text-on-surface-variant/80 mt-0.5 text-xs font-medium">
                      {src.description}
                    </p>
                  </div>

                  <p className="text-on-surface-variant line-clamp-2 text-xs leading-relaxed">
                    {src.longDescription}
                  </p>

                  {/* Tags */}
                  {src.tags && src.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {src.tags.map((tag) => (
                        <span
                          key={tag}
                          className="bg-surface-container-highest/80 text-on-surface-variant rounded-lg px-2 py-0.5 text-[10px] font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Action Row */}
                <div className="border-outline-variant/20 mt-4 flex items-center justify-between border-t pt-3">
                  {isComingSoon ? (
                    <span className="text-on-surface-variant text-xs italic">
                      Integrasi API sedang dipersiapkan
                    </span>
                  ) : (
                    <>
                      <span className="text-on-surface-variant group-hover:text-on-surface text-xs font-medium">
                        Klik untuk membuka
                      </span>
                      <div className="text-primary flex items-center gap-1 text-xs font-bold transition-transform duration-200 group-hover:translate-x-1">
                        <span>Jelajahi</span>
                        <ArrowRight size={14} />
                      </div>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. CUSTOM SERVER OPDS CTA */}
      <div className="bg-surface-container/60 border-outline-variant/30 flex flex-col items-start justify-between gap-4 rounded-3xl border p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Server size={22} />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-on-surface text-sm font-bold">
              Punya Koleksi Server Calibre / Komga?
            </h4>
            <p className="text-on-surface-variant max-w-xl text-xs leading-relaxed">
              Hubungkan URL feed OPDS kustom Anda untuk membaca dan mengunduh buku langsung dari
              server lokal maupun cloud Anda sendiri.
            </p>
          </div>
        </div>

        <Button
          variant="filled"
          size="sm"
          icon={<Plus size={15} />}
          onClick={onOpenAddCustomFeed}
          className="shrink-0 text-xs font-semibold"
        >
          Tambah Feed Kustom
        </Button>
      </div>
    </div>
  );
};
