import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { FolderPlus, Plus, Tag, Trash2 } from 'lucide-react';

import { Button, Dialog, IconButton } from '@/components/ui';
import { createCollection, db, deleteCollection } from '@/lib/db';
import { toast } from '@/store/toast';

interface ManageCollectionsDialogProps {
  open: boolean;
  onClose: () => void;
}

export const ManageCollectionsDialog: React.FC<ManageCollectionsDialogProps> = ({
  open,
  onClose,
}) => {
  const [newColName, setNewColName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const collections = useLiveQuery(() => db.collections.orderBy('createdAt').toArray(), []);
  const allBooks = useLiveQuery(() => db.books.toArray(), []);

  // Compute book count per collection
  const collectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!allBooks) return counts;
    for (const b of allBooks) {
      if (b.tags && Array.isArray(b.tags)) {
        for (const t of b.tags) {
          counts[t] = (counts[t] || 0) + 1;
        }
      }
    }
    return counts;
  }, [allBooks]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newColName.trim();
    if (!trimmed) {
      toast.warning('Masukkan nama koleksi');
      return;
    }
    setIsCreating(true);
    try {
      await createCollection(trimmed);
      setNewColName('');
      toast.success(`Koleksi "${trimmed}" berhasil dibuat`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membuat koleksi');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteCollection(id);
      setDeletingId(null);
      toast.info(`Koleksi "${name}" telah dihapus`);
    } catch {
      toast.error('Gagal menghapus koleksi');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Tag size={20} className="text-primary" />
          <span>Kelola Koleksi & Rak Buku</span>
        </div>
      }
      maxWidth="md"
      actions={
        <Button variant="outlined" size="sm" onClick={onClose}>
          Tutup
        </Button>
      }
    >
      <div className="space-y-5 py-1">
        {/* Create new collection form */}
        <form onSubmit={handleCreate} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Tag
              size={15}
              className="text-on-surface-variant/60 pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
            />
            <input
              type="text"
              placeholder="Nama koleksi baru (misal: Filsafat, Kuliah, Favorit)..."
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              className="bg-surface-container-low text-on-surface border-outline-variant/30 focus:border-primary focus:ring-primary/20 placeholder:text-on-surface-variant/50 h-10 w-full rounded-xl border pr-3 pl-9 text-xs transition-all focus:ring-2 focus:outline-none sm:text-sm"
              maxLength={40}
            />
          </div>
          <Button
            type="submit"
            variant="filled"
            size="sm"
            icon={<Plus size={16} />}
            disabled={!newColName.trim() || isCreating}
            className="shrink-0"
          >
            Tambah
          </Button>
        </form>

        {/* Existing collections list */}
        <div className="space-y-2">
          <div className="text-on-surface-variant flex items-center justify-between text-xs font-semibold">
            <span>Daftar Koleksi Anda</span>
            <span className="font-mono">{collections?.length || 0} koleksi</span>
          </div>

          {!collections || collections.length === 0 ? (
            <div className="bg-surface-container-low border-outline-variant/20 flex flex-col items-center justify-center rounded-2xl border p-8 text-center">
              <FolderPlus size={36} className="text-on-surface-variant/40 mb-2" />
              <p className="text-on-surface text-sm font-medium">Belum ada koleksi kustom</p>
              <p className="text-on-surface-variant max-w-xs text-xs">
                Buat koleksi pertama Anda di atas untuk mulai mengelompokkan buku berdasarkan topik
                atau genre.
              </p>
            </div>
          ) : (
            <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
              {collections.map((col) => {
                const count = collectionCounts[col.name] || 0;
                const isConfirmingDelete = deletingId === col.id;

                return (
                  <div
                    key={col.id}
                    className="bg-surface-container-low border-outline-variant/20 hover:border-outline-variant/40 flex items-center justify-between rounded-xl border px-3 py-2.5 transition-colors"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="bg-primary/10 text-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
                        <Tag size={13} />
                      </div>
                      <span className="text-on-surface truncate text-xs font-medium sm:text-sm">
                        {col.name}
                      </span>
                      <span className="bg-surface-container-highest text-on-surface-variant shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold">
                        {count} buku
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {isConfirmingDelete ? (
                        <div className="animate-fade-in flex items-center gap-1.5">
                          <span className="text-error text-[11px] font-medium">Hapus?</span>
                          <button
                            type="button"
                            onClick={() => handleDelete(col.id, col.name)}
                            className="bg-error text-on-error cursor-pointer rounded-lg px-2 py-1 text-xs font-semibold hover:opacity-90"
                          >
                            Ya
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(null)}
                            className="bg-surface-container-high text-on-surface-variant hover:text-on-surface cursor-pointer rounded-lg px-2 py-1 text-xs"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <IconButton
                          size="sm"
                          variant="standard"
                          onClick={() => setDeletingId(col.id)}
                          className="hover:text-error hover:bg-error/10 text-on-surface-variant/60"
                          title="Hapus Koleksi"
                        >
                          <Trash2 size={14} />
                        </IconButton>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
};
