import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  Search as SearchIcon,
  X,
} from 'lucide-react';

import type { TocItem } from '@/types';

interface TocPanelProps {
  toc: TocItem[];
  activeChapter?: string;
  onJumpToHref: (href: string) => void;
  onClose: () => void;
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

export const TocPanel: React.FC<TocPanelProps> = ({
  toc,
  activeChapter,
  onJumpToHref,
  onClose,
}) => {
  const [tocSearch, setTocSearch] = useState('');
  const [collapsedItems, setCollapsedItems] = useState<Record<string, boolean>>({});

  const totalTocCount = useMemo(() => countTocItems(toc), [toc]);
  const filteredToc = useMemo(() => filterTocItems(toc, tocSearch), [toc, tocSearch]);

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
  );
};
