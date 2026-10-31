import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './ui/Button';
import { Chip } from './ui/Chip';
import { Dialog } from './ui/Dialog';
import { IconButton } from './ui/IconButton';
import { SegmentedButton } from './ui/SegmentedButton';
import { Sheet } from './ui/Sheet';
import { Slider } from './ui/Slider';

describe('UI Primitives (src/components/ui/)', () => {
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

  describe('IconButton', () => {
    it('renders icon button and handles click event', () => {
      const handleClick = vi.fn();
      render(
        <IconButton aria-label="Favorit" onClick={handleClick}>
          <span>★</span>
        </IconButton>
      );

      const btn = screen.getByLabelText('Favorit');
      expect(btn).toBeInTheDocument();

      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('applies active variant styling properly', () => {
      render(
        <IconButton active aria-label="Aktif">
          <span>●</span>
        </IconButton>
      );

      const btn = screen.getByLabelText('Aktif');
      expect(btn.className).toContain('bg-primary/15');
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

  describe('SegmentedButton', () => {
    it('renders options and responds to option selection', () => {
      const handleChange = vi.fn();
      const options = [
        { value: 'grid', label: 'Tampilan Grid' },
        { value: 'list', label: 'Tampilan List' },
      ];

      render(<SegmentedButton options={options} value="grid" onChange={handleChange} />);

      expect(screen.getByText('Tampilan Grid')).toBeInTheDocument();
      const listBtn = screen.getByText('Tampilan List');
      fireEvent.click(listBtn);

      expect(handleChange).toHaveBeenCalledWith('list');
    });
  });

  describe('Chip', () => {
    it('renders chip with label, optional count, and handles click', () => {
      const handleClick = vi.fn();
      render(<Chip label="Semua Buku" count={12} selected={true} onClick={handleClick} />);

      expect(screen.getByText('Semua Buku')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Semua Buku'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Slider', () => {
    it('renders label and handles range value changes', () => {
      const handleChange = vi.fn();
      render(
        <Slider
          label="Ukuran Huruf"
          value={18}
          min={14}
          max={32}
          step={2}
          valueDisplay="18px"
          onChange={handleChange}
        />
      );

      expect(screen.getByText('Ukuran Huruf')).toBeInTheDocument();
      expect(screen.getByText('18px')).toBeInTheDocument();

      const sliderInput = screen.getByRole('slider');
      fireEvent.change(sliderInput, { target: { value: '24' } });

      expect(handleChange).toHaveBeenCalledWith(24);
    });
  });
});
