import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Button, Dialog, Sheet } from './ui';

describe('UI Primitives (src/components/ui.tsx)', () => {
  describe('Button', () => {
    it('renders button with text and handles click event', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Klik Saya</Button>);

      const btn = screen.getByRole('button', { name: 'Klik Saya' });
      expect(btn).toBeInTheDocument();

      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('applies disabled state properly and blocks clicks', () => {
      const handleClick = vi.fn();
      render(
        <Button disabled onClick={handleClick}>
          Dinonaktifkan
        </Button>
      );

      const btn = screen.getByRole('button', { name: 'Dinonaktifkan' });
      expect(btn).toBeDisabled();

      fireEvent.click(btn);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('renders with custom icon', () => {
      render(<Button icon={<span data-testid="test-icon">icon</span>}>Tombol Berikon</Button>);
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    });
  });

  describe('Dialog', () => {
    it('does not render content when open is false', () => {
      render(
        <Dialog open={false} onClose={() => {}}>
          Konten Rahasia
        </Dialog>
      );
      expect(screen.queryByText('Konten Rahasia')).not.toBeInTheDocument();
    });

    it('renders title, children, and actions when open is true via portal', () => {
      const handleClose = vi.fn();
      render(
        <Dialog
          open={true}
          onClose={handleClose}
          title="Judul Dialog Uji"
          actions={<Button onClick={handleClose}>Simpan</Button>}
        >
          Isi Pesan Dialog
        </Dialog>
      );

      expect(screen.getByText('Judul Dialog Uji')).toBeInTheDocument();
      expect(screen.getByText('Isi Pesan Dialog')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Simpan' })).toBeInTheDocument();

      // Click close icon button
      const closeBtn = screen.getByLabelText(/tutup/i);
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Escape key is pressed', () => {
      const handleClose = vi.fn();
      render(
        <Dialog open={true} onClose={handleClose}>
          Tekan Escape
        </Dialog>
      );

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Sheet', () => {
    it('renders drawer sheet and responds to close trigger', () => {
      const handleClose = vi.fn();
      render(
        <Sheet open={true} onClose={handleClose} title="Panel Samping">
          Isi Panel Sheet
        </Sheet>
      );

      expect(screen.getByText('Panel Samping')).toBeInTheDocument();
      expect(screen.getByText('Isi Panel Sheet')).toBeInTheDocument();

      const closeBtn = screen.getByLabelText(/tutup/i);
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });
});
