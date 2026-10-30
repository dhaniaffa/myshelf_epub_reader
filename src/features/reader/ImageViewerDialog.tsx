import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Contrast, RotateCcw, RotateCw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { createPortal } from 'react-dom';

import { triggerHaptic } from './utils/swipePhysics';

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
  const [isInteracting, setIsInteracting] = useState(false);
  const [usePlateBackground, setUsePlateBackground] = useState(isDark);

  const imageRef = useRef<HTMLImageElement>(null);

  // Mouse drag refs
  const mouseDragStartRef = useRef({ x: 0, y: 0 });

  // Touch gesture refs
  const touchStartDistRef = useRef(0);
  const touchStartScaleRef = useRef(1);
  const touchStartPosRef = useRef({ x: 0, y: 0 });
  const touchStartCenterRef = useRef({ x: 0, y: 0 });
  const isPinchingRef = useRef(false);
  const lastTapRef = useRef({ time: 0, x: 0, y: 0 });

  // Esc keyboard shortcut to close, +/- zoom, 0 reset
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        setScale((s) => Math.min(5, s + 0.25));
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

  const handleZoomIn = () => setScale((s) => Math.min(5, Math.round((s + 0.25) * 100) / 100));
  const handleZoomOut = () => setScale((s) => Math.max(0.5, Math.round((s - 0.25) * 100) / 100));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setScale((s) => Math.min(5, Math.round((s + 0.15) * 100) / 100));
    } else {
      setScale((s) => Math.max(0.5, Math.round((s - 0.15) * 100) / 100));
    }
  };

  // --- Mouse Drag Handling ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsInteracting(true);
    mouseDragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isInteracting || isPinchingRef.current) return;
      setPosition({
        x: e.clientX - mouseDragStartRef.current.x,
        y: e.clientY - mouseDragStartRef.current.y,
      });
    },
    [isInteracting]
  );

  const handleMouseUp = () => setIsInteracting(false);

  // --- Touch Gesture Handling (Pinch-to-Zoom, 1-Finger Pan, Double-Tap) ---
  const getTouchDistance = (
    t1: { clientX: number; clientY: number },
    t2: { clientX: number; clientY: number }
  ) => {
    return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
  };

  const getTouchCenter = (
    t1: { clientX: number; clientY: number },
    t2: { clientX: number; clientY: number }
  ) => {
    return {
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2,
    };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Start 2-Finger Pinch
      isPinchingRef.current = true;
      setIsInteracting(true);
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      touchStartDistRef.current = getTouchDistance(t1, t2);
      touchStartScaleRef.current = scale;
      touchStartPosRef.current = { ...position };
      touchStartCenterRef.current = getTouchCenter(t1, t2);
    } else if (e.touches.length === 1) {
      // 1 Touch: Check Double-Tap or Pan
      const touch = e.touches[0];
      const now = Date.now();
      const dist = Math.hypot(
        touch.clientX - lastTapRef.current.x,
        touch.clientY - lastTapRef.current.y
      );

      if (now - lastTapRef.current.time < 300 && dist < 30) {
        // Double-Tap Detected: Toggle between 1x and 2.5x
        triggerHaptic(15);
        lastTapRef.current.time = 0;
        if (scale > 1.05) {
          setScale(1);
          setPosition({ x: 0, y: 0 });
        } else {
          setScale(2.5);
          // Center zoom around the tap position
          const offsetX = (window.innerWidth / 2 - touch.clientX) * 0.7;
          const offsetY = (window.innerHeight / 2 - touch.clientY) * 0.7;
          setPosition({ x: offsetX, y: offsetY });
        }
        return;
      }

      lastTapRef.current = { time: now, x: touch.clientX, y: touch.clientY };

      if (scale > 1) {
        setIsInteracting(true);
        mouseDragStartRef.current = {
          x: touch.clientX - position.x,
          y: touch.clientY - position.y,
        };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && isPinchingRef.current) {
      // 2-Finger Pinch in progress
      if ('cancelable' in e && e.cancelable) {
        e.preventDefault();
      }
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = getTouchDistance(t1, t2);
      if (touchStartDistRef.current <= 0) return;

      const scaleFactor = currentDist / touchStartDistRef.current;
      const nextScale = Math.min(5.0, Math.max(0.4, touchStartScaleRef.current * scaleFactor));
      setScale(Math.round(nextScale * 100) / 100);

      // Pan with touch center movement
      const currentCenter = getTouchCenter(t1, t2);
      const deltaX = currentCenter.x - touchStartCenterRef.current.x;
      const deltaY = currentCenter.y - touchStartCenterRef.current.y;
      setPosition({
        x: touchStartPosRef.current.x + deltaX,
        y: touchStartPosRef.current.y + deltaY,
      });
    } else if (e.touches.length === 1 && scale > 1 && isInteracting && !isPinchingRef.current) {
      // 1-Finger Pan when zoomed in
      if ('cancelable' in e && e.cancelable) {
        e.preventDefault();
      }
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - mouseDragStartRef.current.x,
        y: touch.clientY - mouseDragStartRef.current.y,
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2 && isPinchingRef.current) {
      isPinchingRef.current = false;
      setIsInteracting(false);

      // Spring Snap-Back: If pinched smaller than 1.0, snap back to 1.0 and center
      if (scale < 1.0) {
        triggerHaptic(10);
        setScale(1);
        setPosition({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 0) {
      setIsInteracting(false);
      if (scale < 1.0) {
        triggerHaptic(10);
        setScale(1);
        setPosition({ x: 0, y: 0 });
      }
    }
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Penampil Gambar"
      style={{ touchAction: 'none' }}
      className="animate-fade-in fixed inset-0 z-70 flex items-center justify-center bg-black/85 backdrop-blur-md select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget && scale === 1) {
          onClose();
        }
      }}
      onWheel={handleWheel}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Close Button in Top Corner */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-50 cursor-pointer rounded-full bg-black/50 p-2.5 text-white/90 transition-colors hover:bg-black/75 hover:text-white active:scale-95"
        title="Tutup (Esc)"
        aria-label="Tutup"
      >
        <X size={22} />
      </button>

      {/* Interactive Image Container */}
      <div
        className={`relative flex max-h-[85vh] max-w-[92vw] items-center justify-center overflow-hidden ${
          scale > 1 ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
        onMouseDown={handleMouseDown}
      >
        <img
          ref={imageRef}
          src={image.src}
          alt={image.alt || 'Gambar Buku'}
          draggable={false}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            transition: isInteracting ? 'none' : 'transform 0.22s cubic-bezier(0.2, 0, 0, 1)',
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
          disabled={scale >= 5}
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

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export const ImageViewerDialog: React.FC<ImageViewerDialogProps> = ({ image, onClose, isDark }) => {
  if (!image) return null;
  return <ImageViewerModal key={image.src} image={image} onClose={onClose} isDark={isDark} />;
};
