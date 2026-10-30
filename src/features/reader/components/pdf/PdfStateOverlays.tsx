import React from 'react';
import { FileText } from 'lucide-react';

export interface PdfErrorOverlayProps {
  errorMessage?: string;
  onReturnHome: () => void;
}

export const PdfErrorOverlay: React.FC<PdfErrorOverlayProps> = ({ errorMessage, onReturnHome }) => {
  return (
    <div className="bg-surface absolute inset-0 z-20 flex flex-col items-center justify-center gap-3.5 p-6 text-center">
      <div className="bg-error/10 text-error flex h-12 w-12 items-center justify-center rounded-2xl">
        <FileText size={24} />
      </div>
      <h3 className="text-on-surface text-base font-bold">Gagal Membuka Dokumen PDF</h3>
      <p className="text-on-surface-variant max-w-sm text-xs">
        {errorMessage || 'Berkas PDF tidak dapat dimuat atau rusak.'}
      </p>
      <button
        type="button"
        onClick={onReturnHome}
        className="bg-primary text-on-primary mt-2 cursor-pointer rounded-full px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-90"
      >
        Kembali ke Perpustakaan
      </button>
    </div>
  );
};

export const PdfLoadingOverlay: React.FC = () => {
  return (
    <div className="bg-surface absolute inset-0 z-10 flex flex-col items-center justify-center gap-3">
      <div className="border-primary h-8 w-8 animate-spin rounded-full border-3 border-t-transparent" />
      <p className="text-on-surface-variant text-xs font-medium">Mempersiapkan dokumen PDF...</p>
    </div>
  );
};

export interface PdfFlashOverlayProps {
  isFlashing: boolean;
}

export const PdfFlashOverlay: React.FC<PdfFlashOverlayProps> = ({ isFlashing }) => {
  if (!isFlashing) return null;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 animate-pulse bg-black transition-none"
    />
  );
};
