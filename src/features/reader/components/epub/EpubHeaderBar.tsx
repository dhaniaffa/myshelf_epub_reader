import React from 'react';
import {
  ArrowLeft,
  Bookmark as BookmarkIcon,
  Headphones,
  List,
  RefreshCw,
  Search,
  Settings,
} from 'lucide-react';

import { IconButton } from '@/components/ui/IconButton';
import { navigateBack } from '@/lib/route';

export interface EpubHeaderBarProps {
  showBars: boolean;
  isEink: boolean;
  bookTitle?: string;
  chapterTitle?: string;
  author?: string;
  isBookmarked: boolean;
  showTTSBar: boolean;
  onFlashRefresh?: () => void;
  onToggleBookmark: () => void;
  onOpenSearch: () => void;
  onOpenToc: () => void;
  onToggleTTS: () => void;
  onOpenSettings: () => void;
}

export const EpubHeaderBar: React.FC<EpubHeaderBarProps> = ({
  showBars,
  isEink,
  bookTitle,
  chapterTitle,
  author,
  isBookmarked,
  showTTSBar,
  onFlashRefresh,
  onToggleBookmark,
  onOpenSearch,
  onOpenToc,
  onToggleTTS,
  onOpenSettings,
}) => {
  return (
    <header
      className={`fixed inset-x-0 top-0 z-30 ${
        isEink
          ? 'bg-surface border-on-surface border-b-2'
          : 'bg-surface-container/95 border-outline-variant/30 border-b backdrop-blur-md'
      } flex items-center justify-between gap-4 px-4 py-2.5 transition-transform duration-300 ${
        showBars ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="flex items-center gap-2">
        <IconButton
          size="sm"
          onClick={() => navigateBack('/')}
          aria-label="Kembali ke MyShelf"
          title="Kembali ke MyShelf"
        >
          <ArrowLeft size={18} />
        </IconButton>
        <div className="max-w-50 sm:max-w-md">
          <h2 className="text-on-surface line-clamp-1 text-xs font-semibold sm:text-sm">
            {bookTitle || 'Memuat Buku...'}
          </h2>
          <p className="text-on-surface-variant line-clamp-1 text-[10px]">
            {chapterTitle || author || ''}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* Quick Clear E-Ink Screen Button (visible only when E-Ink mode is active) */}
        {isEink && onFlashRefresh && (
          <IconButton
            size="sm"
            onClick={onFlashRefresh}
            title="Bersihkan Layar E-Ink (Flash Screen Refresh)"
          >
            <RefreshCw size={17} />
          </IconButton>
        )}

        <IconButton
          size="sm"
          active={isBookmarked}
          onClick={onToggleBookmark}
          title={isBookmarked ? 'Hapus Penanda' : 'Tandai Halaman Ini (B)'}
        >
          <BookmarkIcon size={18} fill={isBookmarked ? 'currentColor' : 'none'} />
        </IconButton>

        <IconButton size="sm" onClick={onOpenSearch} title="Cari Teks (/)">
          <Search size={18} />
        </IconButton>

        <IconButton size="sm" onClick={onOpenToc} title="Daftar Isi (T)">
          <List size={18} />
        </IconButton>

        <IconButton
          size="sm"
          active={showTTSBar}
          onClick={onToggleTTS}
          title={showTTSBar ? 'Tutup Audio Player' : 'Dengarkan Buku (Audio TTS)'}
        >
          <Headphones size={18} />
        </IconButton>

        <IconButton size="sm" onClick={onOpenSettings} title="Pengaturan Tampilan">
          <Settings size={18} />
        </IconButton>
      </div>
    </header>
  );
};
