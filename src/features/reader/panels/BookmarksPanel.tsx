import React from 'react';
import { Trash2 } from 'lucide-react';

import { IconButton } from '@/components/ui/IconButton';

import type { Bookmark } from '@/types';

interface BookmarksPanelProps {
  bookmarks: Bookmark[];
  onJumpToCfi: (cfi: string) => void;
  onDeleteBookmark: (id: string) => void;
  onClose: () => void;
}

export const BookmarksPanel: React.FC<BookmarksPanelProps> = ({
  bookmarks,
  onJumpToCfi,
  onDeleteBookmark,
  onClose,
}) => {
  return (
    <div className="space-y-2">
      {bookmarks.length === 0 ? (
        <div className="text-on-surface-variant py-8 text-center text-xs">
          Belum ada halaman yang ditandai. Tekan ikon penanda di bilah atas untuk menyimpan halaman
          ini.
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
  );
};
