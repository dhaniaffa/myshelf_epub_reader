import React, { useState } from 'react';
import {
  Bookmark as BookmarkIcon,
  Download,
  Highlighter,
  List,
  Search as SearchIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { exportAnnotationsMarkdown } from '@/lib/backup';
import { toast } from '@/store/toast';
import { AnnotationsPanel } from './AnnotationsPanel';
import { BookmarksPanel } from './BookmarksPanel';
import { SearchPanel } from './SearchPanel';
import { TocPanel } from './TocPanel';

import type { Annotation, Book, Bookmark, SearchResult, TocItem } from '@/types';

export type PanelTab = 'toc' | 'search' | 'bookmarks' | 'annotations';

export interface PanelsProps {
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
  const [prevOpen, setPrevOpen] = useState(open);
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);

  // Sync active tab when sheet is opened or when initialTab changes while open
  if (open && (!prevOpen || prevInitialTab !== initialTab)) {
    setPrevOpen(open);
    setPrevInitialTab(initialTab);
    setTab(initialTab);
  } else if (!open && prevOpen) {
    setPrevOpen(false);
  }

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

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={
        <div className="flex w-full items-center gap-1 overflow-x-auto py-0.5">
          <button
            type="button"
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
            type="button"
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
            type="button"
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
            type="button"
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
      {tab === 'toc' && (
        <TocPanel
          toc={toc}
          activeChapter={activeChapter}
          onJumpToHref={onJumpToHref}
          onClose={onClose}
        />
      )}

      {tab === 'search' && (
        <SearchPanel
          isActive={open && tab === 'search'}
          onSearch={onSearch}
          onJumpToCfi={onJumpToCfi}
          onClose={onClose}
        />
      )}

      {tab === 'bookmarks' && (
        <BookmarksPanel
          bookmarks={bookmarks}
          onJumpToCfi={onJumpToCfi}
          onDeleteBookmark={onDeleteBookmark}
          onClose={onClose}
        />
      )}

      {tab === 'annotations' && (
        <AnnotationsPanel
          annotations={annotations}
          onJumpToCfi={onJumpToCfi}
          onEditAnnotation={onEditAnnotation}
          onDeleteAnnotation={onDeleteAnnotation}
          onClose={onClose}
        />
      )}
    </Sheet>
  );
};
