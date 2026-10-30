import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui';

import type { SearchResult } from '@/types';

interface SearchPanelProps {
  isActive: boolean;
  onSearch: (query: string, onResult: (res: SearchResult) => void, onDone: () => void) => void;
  onJumpToCfi: (cfi: string) => void;
  onClose: () => void;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({
  isActive,
  onSearch,
  onJumpToCfi,
  onClose,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Autofocus search input when tab becomes active
  useEffect(() => {
    if (isActive) {
      const timer = window.setTimeout(() => {
        searchInputRef.current?.focus();
      }, 150);
      return () => window.clearTimeout(timer);
    }
  }, [isActive]);

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

  return (
    <div className="space-y-4">
      <form onSubmit={handleStartSearch} className="flex gap-2">
        <input
          ref={searchInputRef}
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
  );
};
