import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ImageViewerDialog } from './ImageViewerDialog';

describe('ImageViewerDialog (src/features/reader/ImageViewerDialog.tsx)', () => {
  it('returns null when image is null', () => {
    const { container } = render(
      <ImageViewerDialog image={null} onClose={vi.fn()} isDark={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders image dialog when image data is provided', () => {
    render(
      <ImageViewerDialog
        image={{ src: 'https://example.com/sample.jpg', alt: 'Contoh Gambar' }}
        onClose={vi.fn()}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();

    const img = screen.getByAltText('Contoh Gambar');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/sample.jpg');
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();

    render(
      <ImageViewerDialog
        image={{ src: 'https://example.com/sample.jpg', alt: 'Contoh Gambar' }}
        onClose={onClose}
      />
    );

    const closeBtn = screen.getByTitle('Tutup (Esc)');
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('zooms in and zooms out when toolbar buttons are clicked', () => {
    render(
      <ImageViewerDialog
        image={{ src: 'https://example.com/sample.jpg', alt: 'Contoh Gambar' }}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('100%')).toBeInTheDocument();

    const zoomInBtn = screen.getByTitle('Perbesar (+)');
    fireEvent.click(zoomInBtn);
    expect(screen.getByText('125%')).toBeInTheDocument();

    const zoomOutBtn = screen.getByTitle('Perkecil (-)');
    fireEvent.click(zoomOutBtn);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});
