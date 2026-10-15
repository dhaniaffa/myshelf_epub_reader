import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Contrast, RotateCcw, RotateCw, X, ZoomIn, ZoomOut } from 'lucide-react';

import type { ImageViewData } from '@/types';

interface ImageViewerDialogProps {
  image: ImageViewData | null;
  onClose: () => void;
  isDark?: boolean;
}

const ImageViewerModal: React.FC<{
  image: ImageViewData;
  onClose: () => void;
  isDark?: boolean;
}> = ({ image, onClose, isDark = false }) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [usePlateBackground, setUsePlateBackground] = useState(isDark);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

  // Esc keyboard shortcut to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        setScale((s) => Math.min(4, s + 0.25));
      } else if (e.key === '-') {
        setScale((s) => Math.max(0.5, s - 0.25));
      } else if (e.key === '0') {
        setScale(1);
        setPosition({ x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleZoomIn = () => setScale((s) => Math.min(4, s + 0.25));
  const handleZoomOut = () => setScale((s) => Math.max(0.5, s - 0.25));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setScale((s) => Math.min(4, s + 0.15));
    } else {
      setScale((s) => Math.max(0.5, s - 0.15));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    },
    [isDragging]
  );

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Penampil Gambar"
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget && scale === 1) {
          onClose();
        }
      }}
      onWheel={handleWheel}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Close Button in Top Corner */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-50 cursor-pointer rounded-full bg-black/50 p-2.5 text-white/90 transition-colors hover:bg-black/75 hover:text-white"
        title="Tutup (Esc)"
        aria-label="Tutup"
      >
        <X size={22} />
      </button>

      {/* Konten Gambar Interaktif */}
      <div
        className="relative flex max-h-[85vh] max-w-[92vw] cursor-grab items-center justify-center overflow-hidden active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <img
          ref={imageRef}
          src={image.src}
          alt={image.alt || 'Gambar Buku'}
          draggable={false}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.18s ease-out',
          }}
          className={`pointer-events-auto max-h-[80vh] max-w-[90vw] rounded-lg object-contain shadow-2xl transition-colors duration-150 ${
            usePlateBackground ? 'bg-[#F8F9FA] p-3' : ''
          }`}
        />
      </div>

      {/* Alt/Caption Text if available */}
      {image.alt && (
        <div className="pointer-events-none absolute inset-x-0 top-5 mx-auto line-clamp-1 w-fit max-w-lg rounded-full bg-black/60 px-4 py-1.5 text-center text-xs text-white/90 backdrop-blur-xs">
          {image.alt}
        </div>
      )}

      {/* Floating Toolbar Bawah */}
      <div className="absolute inset-x-0 bottom-6 z-50 mx-auto flex w-fit items-center gap-1.5 rounded-full border border-white/10 bg-neutral-900/90 px-3 py-1.5 text-white shadow-2xl backdrop-blur-md">
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={scale <= 0.5}
          className="cursor-pointer rounded-full p-2 text-white transition-colors hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-transparent"
          title="Perkecil (-)"
        >
          <ZoomOut size={17} />
        </button>

        <span className="min-w-12.5 px-2 text-center font-mono text-xs font-medium text-white/90">
          {Math.round(scale * 100)}%
        </span>

        <button
          type="button"
          onClick={handleZoomIn}
          disabled={scale >= 4}
          className="cursor-pointer rounded-full p-2 text-white transition-colors hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-transparent"
          title="Perbesar (+)"
        >
          <ZoomIn size={17} />
        </button>

        <div className="mx-1 h-4 w-px bg-white/20" />

        <button
          type="button"
          onClick={handleRotate}
          className="cursor-pointer rounded-full p-2 text-white transition-colors hover:bg-white/15"
          title="Putar 90°"
        >
          <RotateCw size={17} />
        </button>

        <button
          type="button"
          onClick={handleReset}
          className="cursor-pointer rounded-full p-2 text-white transition-colors hover:bg-white/15"
          title="Atur Ulang (100%)"
        >
          <RotateCcw size={17} />
        </button>

        <div className="mx-1 h-4 w-px bg-white/20" />

        <button
          type="button"
          onClick={() => setUsePlateBackground((prev) => !prev)}
          className={`cursor-pointer rounded-full p-2 transition-colors ${
            usePlateBackground ? 'bg-white/25 text-white' : 'text-white/70 hover:bg-white/15'
          }`}
          title={
            usePlateBackground ? 'Matikan Latar Terang Gambar' : 'Aktifkan Latar Terang Gambar'
          }
        >
          <Contrast size={17} />
        </button>
      </div>
    </div>
  );
};

export const ImageViewerDialog: React.FC<ImageViewerDialogProps> = ({ image, onClose, isDark }) => {
  if (!image) return null;
  return <ImageViewerModal key={image.src} image={image} onClose={onClose} isDark={isDark} />;
};
