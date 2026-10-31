import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/lib/db';
import * as routeModule from '@/lib/route';
import { ReaderErrorBoundary } from './ReaderErrorBoundary';

const CrashyReaderView: React.FC<{ shouldCrash?: boolean }> = ({ shouldCrash }) => {
  if (shouldCrash) {
    throw new Error('Gagal membaca struktur berkas EPUB/PDF yang korup!');
  }
  return <div>Tampilan Pembaca Buku Aktif</div>;
};

describe('ReaderErrorBoundary (src/features/reader/ReaderErrorBoundary.tsx)', () => {
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
    vi.restoreAllMocks();
  });
  afterEach(() => {
    console.error = originalError;
    vi.restoreAllMocks();
  });

  it('renders reader children normally when no error occurs', () => {
    render(
      <ReaderErrorBoundary bookId="book-1">
        <CrashyReaderView shouldCrash={false} />
      </ReaderErrorBoundary>
    );

    expect(screen.getByText('Tampilan Pembaca Buku Aktif')).toBeInTheDocument();
  });

  it('catches book reader error and displays reader-specific fallback UI', () => {
    render(
      <ReaderErrorBoundary bookId="book-1">
        <CrashyReaderView shouldCrash={true} />
      </ReaderErrorBoundary>
    );

    expect(screen.getByText('Gagal Menampilkan Buku')).toBeInTheDocument();
    expect(screen.getByText(/Dokumen tidak dapat dirender dengan baik/i)).toBeInTheDocument();
    expect(
      screen.getByText('Gagal membaca struktur berkas EPUB/PDF yang korup!')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kembali ke Rak Buku/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Coba Buka Ulang/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Reset Posisi & Buka dari Awal/i })
    ).toBeInTheDocument();
  });

  it('triggers onBackToLibrary callback or navigates to library when back button is clicked', () => {
    const handleBack = vi.fn();
    const navigateSpy = vi.spyOn(routeModule, 'navigate').mockImplementation(() => {});

    const { rerender } = render(
      <ReaderErrorBoundary bookId="book-1" onBackToLibrary={handleBack}>
        <CrashyReaderView shouldCrash={true} />
      </ReaderErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: /Kembali ke Rak Buku/i }));
    expect(handleBack).toHaveBeenCalledTimes(1);

    // Fallback without onBackToLibrary prop
    rerender(
      <ReaderErrorBoundary bookId="book-1">
        <CrashyReaderView shouldCrash={true} />
      </ReaderErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: /Kembali ke Rak Buku/i }));
    expect(navigateSpy).toHaveBeenCalledWith('');
  });

  it('resets corrupt reading position and location map when reset button is clicked', async () => {
    const updateSpy = vi.spyOn(db.books, 'update').mockResolvedValue(1);
    const deleteSpy = vi.spyOn(db.locations, 'delete').mockResolvedValue();

    render(
      <ReaderErrorBoundary bookId="corrupt-book-id">
        <CrashyReaderView shouldCrash={true} />
      </ReaderErrorBoundary>
    );

    const resetBtn = screen.getByRole('button', { name: /Reset Posisi & Buka dari Awal/i });
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith('corrupt-book-id', {
        lastCfi: null,
        progress: 0,
      });
      expect(deleteSpy).toHaveBeenCalledWith('corrupt-book-id');
    });
  });
});
