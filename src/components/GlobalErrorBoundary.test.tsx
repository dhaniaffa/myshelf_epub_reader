import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GlobalErrorBoundary } from './GlobalErrorBoundary';

const ProblemChild: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Simulasi unhandled render error!');
  }
  return <div>Konten Aplikasi Normal</div>;
};

describe('GlobalErrorBoundary (src/components/GlobalErrorBoundary.tsx)', () => {
  // Prevent noisy console.error in test outputs
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
    vi.restoreAllMocks();
  });

  it('renders children normally when no error occurs', () => {
    render(
      <GlobalErrorBoundary>
        <ProblemChild shouldThrow={false} />
      </GlobalErrorBoundary>
    );

    expect(screen.getByText('Konten Aplikasi Normal')).toBeInTheDocument();
  });

  it('catches render error and displays fallback UI', () => {
    render(
      <GlobalErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </GlobalErrorBoundary>
    );

    expect(screen.getByText('Terjadi Kesalahan Tak Terduga')).toBeInTheDocument();
    expect(
      screen.getByText(/Aplikasi mengalami kendala saat memproses tampilan ini/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Muat Ulang Aplikasi/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kembali ke Rak Buku/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Salin Rincian Error/i })).toBeInTheDocument();
    expect(screen.getByText('Simulasi unhandled render error!')).toBeInTheDocument();
  });

  it('renders custom fallback if provided in props', () => {
    render(
      <GlobalErrorBoundary fallback={<div>Custom Error Fallback</div>}>
        <ProblemChild shouldThrow={true} />
      </GlobalErrorBoundary>
    );

    expect(screen.getByText('Custom Error Fallback')).toBeInTheDocument();
  });

  it('copies error details to clipboard when copy button is clicked', async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextSpy,
      },
    });

    render(
      <GlobalErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </GlobalErrorBoundary>
    );

    const copyBtn = screen.getByRole('button', { name: /Salin Rincian Error/i });
    fireEvent.click(copyBtn);

    expect(writeTextSpy).toHaveBeenCalledWith(expect.stringContaining('[MyShelf Crash Report]'));
    expect(writeTextSpy).toHaveBeenCalledWith(
      expect.stringContaining('Simulasi unhandled render error!')
    );
  });
});
