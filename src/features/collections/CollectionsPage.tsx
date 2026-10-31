import React, { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  FolderHeart,
  FolderPlus,
  Folders,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';

import { Button, Dialog, IconButton } from '@/components/ui';
import { BookCard } from '@/features/library/BookCard';
import { BookDetailsDialog } from '@/features/library/BookDetailsDialog';
import { registerBackHandler } from '@/lib/backHandler';
import { createCollection, db, deleteCollection, removeTagFromBook } from '@/lib/db';
import { navigate, navigateBack } from '@/lib/route';
import { toast } from '@/store/toast';

import type { Book, BookCollection } from '@/types';

interface CollectionsPageProps {
  collectionId?: string;
}

export const CollectionsPage: React.FC<CollectionsPageProps> = ({ collectionId }) => {
  const collections = useLiveQuery(() => db.collections.orderBy('createdAt').toArray(), []);
  const allBooks = useLiveQuery(() => db.books.toArray(), []);

  // When collectionId is provided from route, activeCollectionName is collectionId, otherwise null (root view)
  const activeCollectionName = collectionId ? collectionId.trim() : null;

  const [newColDialogOpen, setNewColDialogOpen] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [deletingCol, setDeletingCol] = useState<BookCollection | null>(null);
  const [selectedBookForDetails, setSelectedBookForDetails] = useState<Book | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleOpenCollection = (name: string) => {
    setSearchQuery('');
    navigate(`collections/${encodeURIComponent(name)}`);
  };

  const handleCloseCollection = () => {
    setSearchQuery('');
    navigateBack('collections');
  };

  // Back button handler for Android & Desktop Escape
  useEffect(() => {
    if (!activeCollectionName) return;

    const unregister = registerBackHandler(() => {
      handleCloseCollection();
      return true;
    });

    return unregister;
  }, [activeCollectionName]);

  // Group books by collection
  const { booksByCollection, totalTaggedCount } = useMemo(() => {
    const map: Record<string, Book[]> = {};
    let taggedCount = 0;

    if (!allBooks) return { booksByCollection: map, totalTaggedCount: 0 };

    for (const b of allBooks) {
      if (b.tags && Array.isArray(b.tags) && b.tags.length > 0) {
        taggedCount++;
        for (const t of b.tags) {
          if (!map[t]) map[t] = [];
          map[t].push(b);
        }
      }
    }

    return { booksByCollection: map, totalTaggedCount: taggedCount };
  }, [allBooks]);

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newColName.trim();
    if (!trimmed) {
      toast.warning('Masukkan nama koleksi');
      return;
    }
    try {
      await createCollection(trimmed);
      setNewColName('');
      setNewColDialogOpen(false);
      toast.success(`Koleksi "${trimmed}" berhasil dibuat`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membuat koleksi');
    }
  };

  const handleDeleteCollection = async () => {
    if (!deletingCol) return;
    try {
      await deleteCollection(deletingCol.id);
      if (activeCollectionName === deletingCol.name) {
        handleCloseCollection();
      }
      toast.info(`Koleksi "${deletingCol.name}" telah dihapus`);
      setDeletingCol(null);
    } catch {
      toast.error('Gagal menghapus koleksi');
    }
  };

  const activeBooks = useMemo(() => {
    if (!activeCollectionName) return [];
    const raw = booksByCollection[activeCollectionName] || [];
    if (!searchQuery.trim()) return raw;
    const q = searchQuery.toLowerCase();
    return raw.filter(
      (b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)
    );
  }, [activeCollectionName, booksByCollection, searchQuery]);

  return (
    <div className="bg-surface text-on-surface flex min-h-screen flex-col">
      {/* 1. TOP APP BAR */}
      <header className="bg-surface/90 border-outline-variant/20 sticky top-0 z-30 flex items-center justify-between gap-3 border-b px-4 py-3 backdrop-blur-md sm:px-8">
        <div className="flex min-w-0 items-center gap-2.5">
          {!activeCollectionName ? (
            /* Hub Mode: Back to MyShelf button on mobile */
            <>
              <div className="lg:hidden">
                <IconButton
                  size="sm"
                  onClick={() => navigate('')}
                  aria-label="Kembali ke MyShelf"
                  title="Kembali ke MyShelf"
                >
                  <ArrowLeft size={18} />
                </IconButton>
              </div>
              <div className="min-w-0">
                <h1 className="text-on-surface truncate text-base font-bold tracking-tight sm:text-lg">
                  Koleksi Buku
                </h1>
                <p className="text-on-surface-variant hidden text-xs sm:block">
                  Kelola rak & kategori buku favorit Anda
                </p>
              </div>
            </>
          ) : (
            /* Active Collection Mode: Back to All Collections */
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={handleCloseCollection}
                className="hover:bg-surface-container text-on-surface flex cursor-pointer items-center gap-1.5 rounded-xl px-2 py-1.5 text-xs font-semibold transition-colors active:scale-95"
                title="Kembali ke Semua Koleksi"
              >
                <ArrowLeft size={18} className="text-primary" />
                <span className="hidden sm:inline">Koleksi</span>
              </button>

              <div className="bg-outline-variant/40 h-4 w-px" />

              <div className="min-w-0">
                <h1 className="text-on-surface flex items-center gap-2 truncate text-sm font-bold tracking-tight sm:text-base">
                  <Folders size={18} className="text-primary shrink-0" />
                  <span>{activeCollectionName}</span>
                  <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-semibold">
                    {activeBooks.length} buku
                  </span>
                </h1>
              </div>
            </div>
          )}
        </div>

        {/* Action Header Button */}
        {!activeCollectionName && (
          <Button
            variant="tonal"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => setNewColDialogOpen(true)}
            className="text-xs"
          >
            Koleksi Baru
          </Button>
        )}
      </header>

      {/* Main Content */}
      <div className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        {/* STATS OVERVIEW CARDS (only shown on root collections view) */}
        {!activeCollectionName && (
          <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-surface-container-low border-outline-variant/20 rounded-2xl border p-3.5 sm:p-4">
              <span className="text-on-surface-variant/70 text-[11px] font-medium sm:text-xs">
                Total Koleksi
              </span>
              <p className="text-on-surface mt-1 font-mono text-xl font-bold sm:text-2xl">
                {collections?.length || 0}
              </p>
            </div>
            <div className="bg-surface-container-low border-outline-variant/20 rounded-2xl border p-3.5 sm:p-4">
              <span className="text-on-surface-variant/70 text-[11px] font-medium sm:text-xs">
                Buku Dikelompokkan
              </span>
              <p className="text-primary mt-1 font-mono text-xl font-bold sm:text-2xl">
                {totalTaggedCount}
              </p>
            </div>
          </div>
        )}

        {/* DETAIL OF ACTIVE COLLECTION VIEW */}
        {activeCollectionName ? (
          <div className="space-y-6">
            {/* Search bar inside active collection */}
            <div className="relative w-full">
              <Search
                size={16}
                className="text-on-surface-variant/60 pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
              />
              <input
                type="text"
                placeholder={`Cari buku di "${activeCollectionName}"...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-surface-container-low text-on-surface border-outline-variant/30 focus:border-primary focus:ring-primary/20 placeholder:text-on-surface-variant/50 h-10 w-full rounded-xl border pr-3 pl-9 text-xs transition-all focus:ring-2 focus:outline-none sm:text-sm"
              />
            </div>

            {activeBooks.length === 0 ? (
              <div className="bg-surface-container-low border-outline-variant/20 flex flex-col items-center justify-center rounded-2xl border p-12 text-center">
                <BookOpen size={40} className="text-on-surface-variant/40 mb-3" />
                <p className="text-on-surface text-base font-semibold">
                  Belum ada buku di koleksi ini
                </p>
                <p className="text-on-surface-variant mt-1 max-w-sm text-xs">
                  Tambahkan buku ke koleksi ini melalui menu &quot;Kelola Tag&quot; pada kartu buku
                  di Rak Buku.
                </p>
                <Button
                  variant="tonal"
                  size="sm"
                  icon={<ArrowLeft size={14} />}
                  onClick={handleCloseCollection}
                  className="mt-4"
                >
                  Kembali ke Semua Koleksi
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-6 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {activeBooks.map((book) => (
                  <div key={book.id} className="relative">
                    <BookCard
                      book={book}
                      onDeleteRequest={() => {}}
                      onShowDetails={setSelectedBookForDetails}
                    />
                    {/* Remove from collection quick badge */}
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await removeTagFromBook(book.id, activeCollectionName);
                        toast.info(`Buku dilepas dari "${activeCollectionName}"`);
                      }}
                      className="bg-surface-container-highest/90 hover:bg-error hover:text-on-error text-on-surface-variant absolute top-2 right-2 z-30 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full shadow-md backdrop-blur-xs transition-colors"
                      title={`Lepas dari ${activeCollectionName}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* GRID OF ALL COLLECTIONS */
          <div className="space-y-10">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-on-surface text-base font-bold sm:text-lg">Koleksi Saya</h2>
                <span className="text-on-surface-variant text-xs">
                  {collections?.length || 0} Koleksi
                </span>
              </div>

              {!collections || collections.length === 0 ? (
                <div className="bg-surface-container-low border-outline-variant/20 flex flex-col items-center justify-center rounded-2xl border p-12 text-center">
                  <div className="bg-primary/10 text-primary mb-3 flex h-16 w-16 items-center justify-center rounded-2xl shadow-inner">
                    <FolderPlus size={32} />
                  </div>
                  <h3 className="text-on-surface text-base font-bold">Belum Ada Koleksi</h3>
                  <p className="text-on-surface-variant mt-1 max-w-sm text-xs leading-relaxed">
                    Buat rak buku pertama Anda untuk memisahkan novel, buku pelajaran, buku favorit,
                    atau karya ilmiah.
                  </p>
                  <Button
                    variant="filled"
                    size="md"
                    icon={<Plus size={16} />}
                    onClick={() => setNewColDialogOpen(true)}
                    className="mt-4 shadow-xs"
                  >
                    Buat Koleksi Pertama
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {collections.map((col) => {
                    const booksInCol = booksByCollection[col.name] || [];

                    return (
                      <div
                        key={col.id}
                        onClick={() => handleOpenCollection(col.name)}
                        className="group bg-surface-container-low hover:bg-surface-container border-outline-variant/30 hover:border-primary/40 relative flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition-all select-none hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="flex min-w-0 items-center gap-3.5 pr-2">
                          <div className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-on-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors">
                            <FolderHeart size={22} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-on-surface group-hover:text-primary truncate text-sm font-bold transition-colors sm:text-base">
                              {col.name}
                            </h3>
                            <p className="text-on-surface-variant mt-0.5 text-xs">
                              {booksInCol.length} Buku
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <IconButton
                            size="sm"
                            variant="standard"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingCol(col);
                            }}
                            className="hover:text-error hover:bg-error/10 text-on-surface-variant/40 transition-colors"
                            title="Hapus Koleksi"
                          >
                            <Trash2 size={15} />
                          </IconButton>
                          <ChevronRight
                            size={18}
                            className="text-on-surface-variant/40 group-hover:text-primary transition-all group-hover:translate-x-0.5"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CREATE COLLECTION MODAL */}
        <Dialog
          open={newColDialogOpen}
          onClose={() => setNewColDialogOpen(false)}
          title={
            <div className="flex items-center gap-2">
              <FolderPlus size={20} className="text-primary" />
              <span>Buat Koleksi Baru</span>
            </div>
          }
          maxWidth="sm"
          actions={
            <>
              <Button variant="text" size="sm" onClick={() => setNewColDialogOpen(false)}>
                Batal
              </Button>
              <Button
                variant="filled"
                size="sm"
                onClick={handleCreateCollection}
                disabled={!newColName.trim()}
              >
                Simpan
              </Button>
            </>
          }
        >
          <form onSubmit={handleCreateCollection} className="space-y-4 py-1">
            <div>
              <label className="text-on-surface-variant mb-1.5 block text-xs font-medium">
                Nama Koleksi / Kategori
              </label>
              <input
                type="text"
                autoFocus
                placeholder="Contoh: Filsafat, Novel Fiksi, Buku Kuliah..."
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                className="bg-surface-container-low text-on-surface border-outline-variant/40 focus:border-primary focus:ring-primary/20 placeholder:text-on-surface-variant/40 h-10 w-full rounded-xl border px-3 text-sm transition-all focus:ring-2 focus:outline-none"
                maxLength={40}
              />
            </div>
          </form>
        </Dialog>

        {/* DELETE COLLECTION MODAL */}
        <Dialog
          open={Boolean(deletingCol)}
          onClose={() => setDeletingCol(null)}
          title="Hapus Koleksi?"
          maxWidth="sm"
          actions={
            <>
              <Button variant="text" size="sm" onClick={() => setDeletingCol(null)}>
                Batal
              </Button>
              <Button variant="danger" size="sm" onClick={handleDeleteCollection}>
                Hapus Koleksi
              </Button>
            </>
          }
        >
          <p className="text-on-surface-variant text-sm">
            Apakah Anda yakin ingin menghapus rak koleksi{' '}
            <strong className="text-on-surface">&quot;{deletingCol?.name}&quot;</strong>?
          </p>
          <p className="text-on-surface-variant/75 mt-2 text-xs">
            Buku-buku di dalam koleksi ini tidak akan terhapus dari perpustakaan Anda, hanya label
            koleksinya yang dicabut.
          </p>
        </Dialog>

        {/* BOOK DETAILS DIALOG */}
        <BookDetailsDialog
          book={selectedBookForDetails}
          onClose={() => setSelectedBookForDetails(null)}
        />
      </div>
    </div>
  );
};
