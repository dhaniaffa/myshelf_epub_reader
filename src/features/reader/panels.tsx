import React, { useMemo, useState } from 'react';
import {
  Bookmark as BookmarkIcon,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Highlighter,
  List,
  MessageSquare,
  Search as SearchIcon,
  Trash2,
  X,
} from 'lucide-react';

import { Button, IconButton, Sheet } from '@/components/ui';
import { exportAnnotationsMarkdown } from '@/lib/backup';
import { HIGHLIGHT_COLORS } from '@/lib/theme';
import { toast } from '@/store/toast';

import type { Annotation, Book, Bookmark, SearchResult, TocItem } from '@/types';

export type PanelTab = 'toc' | 'search' | 'bookmarks' | 'annotations';

interface PanelsProps {
  open: boolean;
  onClose: () => void;
  initialTab?: PanelTab;
  book: Book;
  toc: TocItem[];
  bookmarks: Bookmark[];
  annotations: Annotation[];
  activeChapter?: string;
  onJumpToCfi: (cfi: string) => void;
  onJumpToHref: (href: string) => void;
  onDeleteBookmark: (id: string) => void;
  onEditAnnotation: (ann: Annotation) => void;
  onDeleteAnnotation: (id: string) => void;
  onSearch: (query: string, onResult: (res: SearchResult) => void, onDone: () => void) => void;
}

// Calculate total chapters in TOC (including sub-items)
const countTocItems = (items: TocItem[]): number => {
  return items.reduce((acc, it) => acc + 1 + (it.subitems ? countTocItems(it.subitems) : 0), 0);
};

// Filter chapters by search keyword
const filterTocItems = (items: TocItem[], query: string): TocItem[] => {
  if (!query.trim()) return items;
  const q = query.toLowerCase();

  const results: TocItem[] = [];
  for (const it of items) {
    const matchesSelf = it.label.toLowerCase().includes(q);
    const filteredSubs = it.subitems ? filterTocItems(it.subitems, query) : [];
    if (matchesSelf || filteredSubs.length > 0) {
      results.push({
        ...it,
        subitems: filteredSubs.length > 0 ? filteredSubs : it.subitems,
      });
    }
  }
  return results;
};

export const Panels: React.FC<PanelsProps> = ({
  open,
  onClose,
  initialTab = 'toc',
  book,
  toc,
  bookmarks,
  annotations,
  activeChapter,
  onJumpToCfi,
  onJumpToHref,
  onDeleteBookmark,
  onEditAnnotation,
  onDeleteAnnotation,
  onSearch,
}) => {
  const [tab, setTab] = useState<PanelTab>(initialTab);

  // State for Table of Contents (TOC)
  const [tocSearch, setTocSearch] = useState('');
  const [collapsedItems, setCollapsedItems] = useState<Record<string, boolean>>({});

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const totalTocCount = useMemo(() => countTocItems(toc), [toc]);

  const toggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const collapseAll = () => {
    const map: Record<string, boolean> = {};
    const traverse = (items: TocItem[]) => {
      for (const it of items) {
        if (it.subitems && it.subitems.length > 0) {
          map[it.id || it.href] = true;
          traverse(it.subitems);
        }
      }
    };
    traverse(toc);
    setCollapsedItems(map);
  };

  const expandAll = () => {
    setCollapsedItems({});
  };

  const filteredToc = useMemo(() => filterTocItems(toc, tocSearch), [toc, tocSearch]);

  const handleStartSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchResults([]);
    setIsSearching(true);

    onSearch(
      searchQuery,
      (res) => {
        setSearchResults((prev) => [...prev, res]);
      },
      () => {
        setIsSearching(false);
      }
    );
  };

  const handleExportMarkdown = async () => {
    if (annotations.length === 0) {
      toast.info('Belum ada sorotan atau catatan untuk diekspor');
      return;
    }
    try {
      const res = await exportAnnotationsMarkdown(book, annotations);
      if (res === 'cancelled') return;
      if (res === 'shared') {
        toast.success('Pilih folder simpan melalui menu perangkat');
      } else {
        toast.success('Kutipan berhasil diekspor ke Markdown');
      }
    } catch {
      toast.error('Gagal mengekspor kutipan');
    }
  };

  // Render individual TOC item with tree styling and active highlight
  const renderTocItem = (item: TocItem, depth = 0) => {
    const itemId = item.id || item.href;
    const hasSubs = !!(item.subitems && item.subitems.length > 0);
    const isCollapsed = !!collapsedItems[itemId];
    const isActive =
      activeChapter && item.label.toLowerCase().trim() === activeChapter.toLowerCase().trim();

    return (
      <div key={itemId} className="w-full">
        <div
          className={`group my-0.5 flex cursor-pointer items-center justify-between rounded-xl transition-all select-none ${
            isActive
              ? 'bg-primary/12 text-primary border-primary border-l-3 font-semibold shadow-2xs'
              : 'text-on-surface hover:bg-surface-container-high/60'
          }`}
          style={{ paddingLeft: depth === 0 ? '8px' : `${8 + depth * 14}px` }}
          onClick={() => {
            onJumpToHref(item.href);
            onClose();
          }}
        >
          {/* Main Title & Icon */}
          <div className="flex min-w-0 flex-1 items-center gap-2 py-2 pr-2">
            {depth === 0 ? (
              <BookOpen
                size={14}
                className={`shrink-0 ${isActive ? 'text-primary' : 'text-on-surface-variant opacity-60'}`}
              />
            ) : (
              <FileText
                size={12}
                className={`shrink-0 ${isActive ? 'text-primary' : 'text-on-surface-variant opacity-40'}`}
              />
            )}
            <span
              className={`wrap-break-words leading-snug ${
                depth === 0
                  ? 'text-xs font-semibold'
                  : 'text-on-surface-variant text-[11px] font-normal'
              } ${isActive ? 'text-primary font-bold' : ''}`}
            >
              {item.label}
            </span>
          </div>

          {/* Action side: Active badge or Accordion toggle */}
          <div className="flex shrink-0 items-center gap-1 pr-2">
            {isActive && (
              <span className="bg-primary text-on-primary py-0.2 rounded-full px-1.5 text-[9px] font-bold shadow-2xs">
                Aktif
              </span>
            )}

            {hasSubs && (
              <button
                type="button"
                onClick={(e) => toggleCollapse(itemId, e)}
                className="hover:bg-surface-container text-on-surface-variant hover:text-on-surface cursor-pointer rounded-md p-1 transition-colors"
                title={isCollapsed ? 'Buka Sub-bab' : 'Tutup Sub-bab'}
              >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
          </div>
        </div>

        {/* Subitems container with connected tree line */}
        {hasSubs && !isCollapsed && (
          <div className="border-outline-variant/30 ml-4 border-l-2 pl-1">
            {item.subitems!.map((sub) => renderTocItem(sub, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={
        <div className="flex w-full items-center gap-1 overflow-x-auto py-0.5">
          <button
            onClick={() => setTab('toc')}
            className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
              tab === 'toc'
                ? 'bg-primary-container text-on-primary-container shadow-2xs'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <List size={14} />
            <span>Daftar Isi</span>
          </button>

          <button
            onClick={() => setTab('search')}
            className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
              tab === 'search'
                ? 'bg-primary-container text-on-primary-container shadow-2xs'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <SearchIcon size={14} />
            <span>Cari</span>
          </button>

          <button
            onClick={() => setTab('bookmarks')}
            className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
              tab === 'bookmarks'
                ? 'bg-primary-container text-on-primary-container shadow-2xs'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <BookmarkIcon size={14} />
            <span>Penanda ({bookmarks.length})</span>
          </button>

          <button
            onClick={() => setTab('annotations')}
            className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
              tab === 'annotations'
                ? 'bg-primary-container text-on-primary-container shadow-2xs'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <Highlighter size={14} />
            <span>Catatan ({annotations.length})</span>
          </button>
        </div>
      }
      footer={
        tab === 'annotations' ? (
          <div className="flex w-full items-center justify-between">
            <span className="text-on-surface-variant text-xs">{annotations.length} sorotan</span>
            <Button
              variant="tonal"
              size="sm"
              icon={<Download size={14} />}
              onClick={handleExportMarkdown}
              disabled={annotations.length === 0}
            >
              Ekspor Markdown
            </Button>
          </div>
        ) : undefined
      }
    >
      {/* TAB 1: TABLE OF CONTENTS WITH SEARCH & TREE STRUCTURE */}
      {tab === 'toc' && (
        <div className="space-y-3">
          {/* Search bar & count summary */}
          <div className="space-y-2">
            <div className="relative">
              <SearchIcon
                size={14}
                className="text-on-surface-variant absolute top-1/2 left-3.5 -translate-y-1/2"
              />
              <input
                type="text"
                placeholder="Cari bab atau sub-bab..."
                value={tocSearch}
                onChange={(e) => setTocSearch(e.target.value)}
                className="bg-surface-container-high text-on-surface border-outline-variant/30 focus:border-primary w-full rounded-xl border py-2 pr-8 pl-9 text-xs transition-colors focus:outline-none"
              />
              {tocSearch && (
                <button
                  type="button"
                  onClick={() => setTocSearch('')}
                  className="text-on-surface-variant hover:text-on-surface absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer rounded-full p-1"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Quick Header Tools: Count & Collapse/Expand */}
            <div className="text-on-surface-variant flex items-center justify-between px-1 text-[11px]">
              <span>{totalTocCount} bagian terdaftar</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={expandAll}
                  className="hover:text-primary cursor-pointer transition-colors"
                >
                  Buka Semua
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="hover:text-primary cursor-pointer transition-colors"
                >
                  Ciutkan
                </button>
              </div>
            </div>
          </div>

          {/* List Bab */}
          <div className="space-y-0.5 pt-1">
            {filteredToc.length === 0 ? (
              <div className="text-on-surface-variant space-y-1 py-10 text-center text-xs">
                <BookOpen size={28} className="mx-auto mb-2 opacity-40" />
                <p className="text-on-surface font-semibold">
                  {toc.length === 0 ? 'Tidak ada daftar isi resmi' : 'Bab tidak ditemukan'}
                </p>
                <p className="text-[11px]">
                  {toc.length === 0
                    ? 'Buku ini tidak menyertakan berkas navigasi bab.'
                    : `Tidak ada bab yang cocok dengan kata "${tocSearch}".`}
                </p>
              </div>
            ) : (
              filteredToc.map((item) => renderTocItem(item))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TEXT SEARCH */}
      {tab === 'search' && (
        <div className="space-y-4">
          <form onSubmit={handleStartSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Cari kata atau frasa dalam buku..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-surface-container-high text-on-surface border-outline-variant/40 focus:border-primary flex-1 rounded-full border px-4 py-2 text-xs focus:outline-none"
            />
            <Button
              type="submit"
              variant="filled"
              size="sm"
              disabled={isSearching || !searchQuery.trim()}
            >
              {isSearching ? 'Mencari...' : 'Cari'}
            </Button>
          </form>

          {isSearching && (
            <div className="text-primary flex items-center gap-2 text-xs">
              <div className="border-primary h-3.5 w-3.5 animate-spin rounded-full border-2 border-t-transparent" />
              <span>Memindai halaman buku... ({searchResults.length} ditemukan)</span>
            </div>
          )}

          <div className="space-y-2">
            {searchResults.map((res, idx) => (
              <div
                key={idx}
                onClick={() => {
                  onJumpToCfi(res.cfi);
                  onClose();
                }}
                className="bg-surface-container hover:bg-surface-container-high border-outline-variant/20 cursor-pointer rounded-2xl border p-3 transition-colors"
              >
                <p className="text-on-surface text-xs leading-relaxed">"...{res.excerpt}..."</p>
                <div className="text-primary mt-1 flex items-center justify-between text-[10px] font-medium">
                  <span>Lompat ke lokasi</span>
                  <ExternalLink size={11} />
                </div>
              </div>
            ))}

            {!isSearching && searchResults.length === 0 && searchQuery && (
              <div className="text-on-surface-variant py-8 text-center text-xs">
                Tidak ada hasil yang ditemukan untuk "{searchQuery}".
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PENANDA (BOOKMARKS) */}
      {tab === 'bookmarks' && (
        <div className="space-y-2">
          {bookmarks.length === 0 ? (
            <div className="text-on-surface-variant py-8 text-center text-xs">
              Belum ada halaman yang ditandai. Tekan ikon penanda di bilah atas untuk menyimpan
              halaman ini.
            </div>
          ) : (
            bookmarks.map((bm) => (
              <div
                key={bm.id}
                className="bg-surface-container border-outline-variant/20 hover:bg-surface-container-high flex items-center justify-between gap-3 rounded-2xl border p-3 transition-colors"
              >
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => {
                    onJumpToCfi(bm.cfi);
                    onClose();
                  }}
                >
                  <h5 className="text-on-surface line-clamp-1 text-xs font-semibold">{bm.label}</h5>
                  <div className="text-on-surface-variant mt-0.5 flex items-center gap-2 text-[10px]">
                    <span>{Math.round(bm.percentage * 100)}%</span>
                    <span>·</span>
                    <span>
                      {new Date(bm.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <IconButton
                  size="sm"
                  onClick={() => onDeleteBookmark(bm.id)}
                  aria-label="Hapus Penanda"
                  className="text-on-surface-variant hover:text-error"
                >
                  <Trash2 size={15} />
                </IconButton>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 4: HIGHLIGHTS & NOTES */}
      {tab === 'annotations' && (
        <div className="space-y-3">
          {annotations.length === 0 ? (
            <div className="text-on-surface-variant py-8 text-center text-xs">
              Belum ada kutipan teks yang disorot. Pilih teks saat membaca untuk memberi sorotan
              warna dan menambahkan catatan pribadi.
            </div>
          ) : (
            annotations.map((ann) => {
              const colorConfig = HIGHLIGHT_COLORS[ann.color] || HIGHLIGHT_COLORS.yellow;
              return (
                <div
                  key={ann.id}
                  className="bg-surface-container border-outline-variant/30 space-y-2 rounded-2xl border p-3.5"
                >
                  {/* Quote header & click to jump */}
                  <div
                    className="cursor-pointer"
                    onClick={() => {
                      onJumpToCfi(ann.cfiRange);
                      onClose();
                    }}
                  >
                    <div className="mb-1.5 flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: colorConfig.border }}
                      />
                      <span className="text-on-surface-variant line-clamp-1 text-[10px] font-semibold">
                        {ann.chapter || 'Kutipan'}
                      </span>
                    </div>

                    <blockquote
                      className="text-on-surface line-clamp-3 border-l-2 pl-2.5 text-xs leading-relaxed italic"
                      style={{ borderLeftColor: colorConfig.border }}
                    >
                      "{ann.text}"
                    </blockquote>
                  </div>

                  {/* Note text if any */}
                  {ann.note && (
                    <div
                      className="bg-surface-container-high text-on-surface flex items-start gap-2 rounded-xl border-l-2 p-2.5 text-xs leading-relaxed"
                      style={{ borderLeftColor: colorConfig.border }}
                    >
                      <MessageSquare
                        size={13}
                        className="mt-0.5 shrink-0"
                        style={{ color: colorConfig.border }}
                      />
                      <div className="flex-1 whitespace-pre-wrap">{ann.note}</div>
                    </div>
                  )}

                  {/* Footer actions */}
                  <div className="border-outline-variant/20 text-on-surface-variant flex items-center justify-between border-t pt-1 text-[10px]">
                    <span>
                      {new Date(ann.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditAnnotation(ann)}
                        className="hover:bg-surface-container-highest text-primary rounded px-2 py-0.5 font-medium"
                      >
                        {ann.note ? 'Edit Catatan' : '+ Tambah Catatan'}
                      </button>
                      <button
                        onClick={() => onDeleteAnnotation(ann.id)}
                        className="hover:bg-error-container/30 text-error rounded p-1"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </Sheet>
  );
};
