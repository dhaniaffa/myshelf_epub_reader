import React, { Component } from 'react';
import { ArrowLeft, BookX, RefreshCw, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { db } from '@/lib/db';
import { navigate } from '@/lib/route';
import { toast } from '@/store/toast';

export interface ReaderErrorBoundaryProps {
  bookId?: string;
  onBackToLibrary?: () => void;
  children: React.ReactNode;
}

interface ReaderErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  clearingLocation: boolean;
}

export class ReaderErrorBoundary extends Component<
  ReaderErrorBoundaryProps,
  ReaderErrorBoundaryState
> {
  constructor(props: ReaderErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      clearingLocation: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ReaderErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Document Rendering Error caught by ReaderErrorBoundary:', error, errorInfo);
  }

  handleBackToLibrary = (): void => {
    if (this.props.onBackToLibrary) {
      this.props.onBackToLibrary();
      return;
    }
    navigate('');
  };

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  handleClearCorruptLocation = async (): Promise<void> => {
    const { bookId } = this.props;
    if (!bookId) {
      this.handleRetry();
      return;
    }

    try {
      this.setState({ clearingLocation: true });
      // Reset last position and remove generated location map that might be corrupt
      await db.books.update(bookId, {
        lastCfi: null,
        progress: 0,
      });
      await db.locations.delete(bookId);
      toast.info('Lokasi bacaan telah dibersihkan. Membuka ulang buku...');
      this.setState({ hasError: false, error: null, clearingLocation: false });
    } catch (err) {
      console.warn('Failed to reset corrupt book location:', err);
      this.setState({ clearingLocation: false });
      this.handleRetry();
    }
  };

  render(): React.ReactNode {
    const { hasError, error, clearingLocation } = this.state;
    const { children } = this.props;

    if (!hasError) {
      return children;
    }

    return (
      <div className="bg-surface text-on-surface flex min-h-screen w-full flex-col items-center justify-center p-4 select-none sm:p-6">
        <div className="bg-surface-container border-outline-variant/30 flex w-full max-w-md flex-col items-center rounded-[28px] border p-6 text-center shadow-xl sm:p-8">
          {/* Book Warning Icon */}
          <div className="bg-error-container text-on-error-container mb-4 flex h-16 w-16 items-center justify-center rounded-2xl shadow-sm">
            <BookX size={32} />
          </div>

          <h2 className="text-on-surface text-xl font-bold tracking-tight sm:text-2xl">
            Gagal Menampilkan Buku
          </h2>

          <p className="text-on-surface-variant mt-2 text-xs leading-relaxed sm:text-sm">
            Dokumen tidak dapat dirender dengan baik. Berkas ini mungkin rusak, format EPUB/PDF
            tidak standar, atau posisi halaman terakhir mengalami konflik.
          </p>

          {error && (
            <div className="border-outline-variant/30 bg-surface-container-highest/60 text-error my-4 max-h-24 w-full overflow-y-auto rounded-xl border p-3 text-left font-mono text-xs">
              {error.message}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-4 flex w-full flex-col gap-2.5">
            <Button
              variant="filled"
              size="md"
              icon={<ArrowLeft size={16} />}
              onClick={this.handleBackToLibrary}
              className="w-full"
            >
              Kembali ke Rak Buku
            </Button>

            <Button
              variant="tonal"
              size="md"
              icon={<RefreshCw size={16} />}
              onClick={this.handleRetry}
              className="w-full"
            >
              Coba Buka Ulang
            </Button>

            <Button
              variant="outlined"
              size="md"
              icon={<Trash2 size={16} />}
              onClick={this.handleClearCorruptLocation}
              disabled={clearingLocation}
              className="w-full"
            >
              {clearingLocation ? 'Membersihkan...' : 'Reset Posisi & Buka dari Awal'}
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
