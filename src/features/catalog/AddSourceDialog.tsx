import React from 'react';
import { Code2, Plus, Rss } from 'lucide-react';

import { Button, Dialog } from '@/components/ui';

interface AddSourceDialogProps {
  open: boolean;
  onClose: () => void;
  onOpenCustomFeed: () => void;
}

export const AddSourceDialog: React.FC<AddSourceDialogProps> = ({
  open,
  onClose,
  onOpenCustomFeed,
}) => {
  return (
    <Dialog open={open} onClose={onClose} title="Tambah / Kelola Sumber Katalog">
      <div className="space-y-4">
        <p className="text-on-surface-variant text-xs leading-relaxed">
          MyShelf mendukung standar terbuka untuk katalog buku digital (OPDS & REST API). Anda dapat
          menghubungkan server pribadi atau memperluas katalog aplikasi.
        </p>

        {/* Option 1: Add Custom OPDS Feed */}
        <div className="bg-surface-container/60 hover:bg-surface-container border-outline-variant/30 flex flex-col justify-between gap-3 rounded-2xl border p-4 transition-colors sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
              <Rss size={20} />
            </div>
            <div>
              <h4 className="text-on-surface text-sm font-semibold">Feed OPDS Kustom</h4>
              <p className="text-on-surface-variant text-xs">
                Hubungkan server koleksi pribadi seperti <strong>Calibre Web</strong>,{' '}
                <strong>Komga</strong>, <strong>Kavita</strong>, atau perpustakaan OPDS lainnya.
              </p>
            </div>
          </div>
          <Button
            variant="filled"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => {
              onClose();
              onOpenCustomFeed();
            }}
            className="shrink-0 text-xs"
          >
            Tambah Feed
          </Button>
        </div>

        {/* Option 2: Info for Adding New API Source */}
        <div className="bg-surface-container/30 border-outline-variant/20 rounded-2xl border p-4">
          <div className="flex items-start gap-3">
            <div className="bg-secondary/10 text-secondary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
              <Code2 size={20} />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-on-surface text-sm font-semibold">
                Integrasi Sumber API Baru (Developer)
              </h4>
              <p className="text-on-surface-variant text-xs leading-relaxed">
                Anda dapat menambahkan sumber katalog baru (misalnya <em>Open Library</em>,{' '}
                <em>Internet Archive</em>, <em>Feedbooks</em>, atau API publik lainnya) dengan
                mendaftarkannya di modul:{' '}
                <code className="text-primary bg-primary/10 rounded-md px-1.5 py-0.5 font-mono text-[11px]">
                  src/features/catalog/sources.ts
                </code>
                . Arsitektur katalog kini dirancang modular dan otomatis menyesuaikan tampilan
                mobile maupun desktop.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outlined" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
