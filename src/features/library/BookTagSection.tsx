import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Tag, X } from 'lucide-react';

import { addTagToBook, db, removeTagFromBook } from '@/lib/db';
import { toast } from '@/store/toast';

interface BookTagSectionProps {
  bookId: string;
  tags?: string[];
}

export const BookTagSection: React.FC<BookTagSectionProps> = ({ bookId, tags = [] }) => {
  const [inputVal, setInputVal] = useState('');
  const [showInput, setShowInput] = useState(false);

  // Fetch available collections from DB
  const collections = useLiveQuery(() => db.collections.orderBy('name').toArray(), []);

  // Filter out collections that are already assigned to this book
  const unassignedCollections = (collections || []).filter((c) => !tags.includes(c.name));

  const handleAddTag = async (tagName: string) => {
    const trimmed = tagName.trim();
    if (!trimmed) return;
    try {
      await addTagToBook(bookId, trimmed);
      setInputVal('');
      setShowInput(false);
      toast.success(`Tag "${trimmed}" berhasil ditambahkan`);
    } catch {
      toast.error('Gagal menambahkan tag');
    }
  };

  const handleRemoveTag = async (tagName: string) => {
    try {
      await removeTagFromBook(bookId, tagName);
      toast.info(`Tag "${tagName}" dicabut`);
    } catch {
      toast.error('Gagal mencabut tag');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAddTag(inputVal);
  };

  return (
    <div className="bg-surface-container/60 border-outline-variant/20 rounded-2xl border p-4">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-on-surface flex items-center gap-1.5 text-xs font-semibold">
          <Tag size={13} className="text-primary" />
          <span>Koleksi & Tag Buku</span>
        </span>
        {!showInput && (
          <button
            type="button"
            onClick={() => setShowInput(true)}
            className="text-primary hover:text-primary/80 flex cursor-pointer items-center gap-1 text-[11px] font-semibold transition-colors"
          >
            <Plus size={13} />
            <span>Tambah Tag</span>
          </button>
        )}
      </div>

      {/* Tag Badges list */}
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.length === 0 && !showInput && (
          <p className="text-on-surface-variant/60 text-xs italic">
            Belum ada tag pada buku ini. Klik &quot;Tambah Tag&quot; untuk mengelompokkan.
          </p>
        )}

        {tags.map((tag) => (
          <span
            key={tag}
            className="bg-primary/10 text-primary border-primary/20 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
          >
            <span>{tag}</span>
            <button
              type="button"
              onClick={() => handleRemoveTag(tag)}
              className="hover:bg-primary/20 text-primary -mr-1 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full transition-colors"
              title={`Hapus tag ${tag}`}
            >
              <X size={11} />
            </button>
          </span>
        ))}

        {showInput && (
          <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
            <input
              type="text"
              autoFocus
              placeholder="Ketik tag / pilih..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="bg-surface-container-low text-on-surface border-outline-variant/40 focus:border-primary focus:ring-primary/20 h-7 w-32 rounded-lg border px-2 text-xs transition-all focus:ring-1 focus:outline-none sm:w-40"
              maxLength={30}
            />
            <button
              type="submit"
              disabled={!inputVal.trim()}
              className="bg-primary text-on-primary flex h-7 cursor-pointer items-center justify-center rounded-lg px-2 text-xs font-semibold disabled:opacity-40"
            >
              Simpan
            </button>
            <button
              type="button"
              onClick={() => {
                setShowInput(false);
                setInputVal('');
              }}
              className="text-on-surface-variant hover:text-on-surface h-7 cursor-pointer px-1.5 text-xs"
            >
              Batal
            </button>
          </form>
        )}
      </div>

      {/* Quick suggestions from existing collections */}
      {showInput && unassignedCollections.length > 0 && (
        <div className="animate-fade-in border-outline-variant/20 mt-3 border-t pt-2.5">
          <p className="text-on-surface-variant/70 mb-1.5 text-[10px] font-medium tracking-wider uppercase">
            Saran Koleksi yang Ada:
          </p>
          <div className="flex flex-wrap gap-1">
            {unassignedCollections.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleAddTag(c.name)}
                className="bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-0.5 text-xs transition-colors"
              >
                <Plus size={10} />
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
