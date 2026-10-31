import React, { useState } from 'react';
import { Globe, Rss } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';

interface CustomFeedDialogProps {
  open: boolean;
  onClose: () => void;
  onAddFeed: (title: string, url: string) => Promise<void>;
}

export const CustomFeedDialog: React.FC<CustomFeedDialogProps> = ({ open, onClose, onAddFeed }) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanTitle = title.trim();
    const cleanUrl = url.trim();

    if (!cleanTitle) {
      setError('Nama katalog tidak boleh kosong');
      return;
    }

    if (!cleanUrl) {
      setError('URL feed tidak boleh kosong');
      return;
    }

    try {
      const parsed = new URL(cleanUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        setError('URL harus menggunakan protokol http atau https');
        return;
      }
    } catch {
      setError('Format URL tidak valid (contoh: https://example.com/opds)');
      return;
    }

    try {
      setIsSubmitting(true);
      await onAddFeed(cleanTitle, cleanUrl);
      setTitle('');
      setUrl('');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menambahkan feed OPDS');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Tambah Feed OPDS Kustom">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-on-surface-variant text-xs leading-relaxed">
          Masukkan URL katalog OPDS (Open Publication Distribution System) seperti dari server{' '}
          <strong>Calibre</strong>, <strong>Komga</strong>, <strong>Kavita</strong>, atau
          perpustakaan digital publik lainnya.
        </p>

        {error && (
          <div className="bg-error-container text-on-error-container border-error/20 rounded-xl border p-3 text-xs">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-on-surface text-xs font-semibold">Nama Katalog</label>
          <div className="relative">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Calibre Rumah / Komga"
              className="bg-surface-container border-outline-variant/40 focus:border-primary text-on-surface w-full rounded-xl border px-3.5 py-2.5 text-xs focus:outline-hidden"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-on-surface flex items-center gap-1.5 text-xs font-semibold">
            <Globe size={13} className="text-primary" />
            <span>URL Feed OPDS (XML / Atom)</span>
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/opds"
            className="bg-surface-container border-outline-variant/40 focus:border-primary text-on-surface w-full rounded-xl border px-3.5 py-2.5 font-mono text-xs focus:outline-hidden"
            required
          />
        </div>

        <div className="border-outline-variant/30 flex items-center justify-end gap-3 border-t pt-3">
          <Button variant="text" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            variant="filled"
            size="sm"
            type="submit"
            icon={<Rss size={15} />}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan Feed'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
