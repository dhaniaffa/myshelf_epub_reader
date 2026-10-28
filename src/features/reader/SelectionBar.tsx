import React from 'react';
import { BookA, Copy, MessageSquarePlus, Volume2, X } from 'lucide-react';

import { HIGHLIGHT_COLORS } from '@/lib/theme';
import { toast } from '@/store/toast';

import type { HighlightColor } from '@/types';

interface SelectionBarProps {
  text: string;
  isBottomBarVisible?: boolean;
  onSelectColor: (color: HighlightColor) => void;
  onOpenNote: () => void;
  onOpenDictionary?: () => void;
  onSpeakText?: () => void;
  onClose: () => void;
}

export const SelectionBar: React.FC<SelectionBarProps> = ({
  text,
  isBottomBarVisible,
  onSelectColor,
  onOpenNote,
  onOpenDictionary,
  onSpeakText,
  onClose,
}) => {
  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      toast.success('Kutipan disalin ke clipboard');
    } catch {
      toast.error('Gagal menyalin teks');
    }
    onClose();
  };

  const colors: HighlightColor[] = ['yellow', 'green', 'blue', 'pink'];

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className={`selection-bar-container animate-slide-up fixed inset-x-4 z-50 mx-auto w-auto max-w-sm transition-all duration-200 sm:inset-x-0 sm:w-fit sm:max-w-[95vw] ${
        isBottomBarVisible
          ? 'bottom-28 sm:bottom-32'
          : 'bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:bottom-12'
      }`}
    >
      <div className="bg-surface-container-highest/95 text-on-surface border-outline-variant/40 flex flex-col gap-2 rounded-2xl border p-2 shadow-2xl backdrop-blur-md sm:flex-row sm:items-center sm:gap-3 sm:rounded-full sm:px-4 sm:py-2.5">
        {/* Tier 1: Color Choices (Centered on Mobile) + Mobile Close Button */}
        <div className="border-outline-variant/20 sm:border-outline-variant/30 relative flex items-center justify-center border-b pb-2 sm:justify-start sm:border-r sm:border-b-0 sm:pr-2 sm:pb-0">
          <div className="flex items-center justify-center gap-3 sm:gap-2">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onSelectColor(c)}
                title={HIGHLIGHT_COLORS[c].label}
                aria-label={`Sorot ${HIGHLIGHT_COLORS[c].label}`}
                className="h-7 w-7 cursor-pointer rounded-full border-2 border-white/40 shadow-xs transition-transform hover:scale-115 active:scale-95"
                style={{ backgroundColor: HIGHLIGHT_COLORS[c].border }}
              />
            ))}
          </div>

          {/* Mobile Close Button (Right Corner) */}
          <button
            type="button"
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container absolute right-0 flex h-7 w-7 items-center justify-center rounded-full transition-colors sm:hidden"
            title="Tutup"
            aria-label="Tutup toolbar seleksi"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tier 2: Text Actions (Note, Dictionary, Listen, Copy) */}
        <div className="flex w-full items-center justify-between gap-1 sm:w-auto">
          {/* Note Button */}
          <button
            type="button"
            onClick={onOpenNote}
            className="hover:bg-surface-container text-on-surface flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-semibold transition-colors sm:flex-initial sm:flex-row sm:gap-1.5 sm:rounded-full sm:text-xs"
          >
            <MessageSquarePlus size={15} className="text-primary shrink-0" />
            <span className="truncate">Catatan</span>
          </button>

          {/* Tombol Kamus (Hybrid) */}
          {onOpenDictionary && (
            <button
              type="button"
              onClick={onOpenDictionary}
              className="hover:bg-surface-container text-primary flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-semibold transition-colors sm:flex-initial sm:flex-row sm:gap-1.5 sm:rounded-full sm:text-xs"
              title="Cari Definisi & Terjemahan"
            >
              <BookA size={15} className="shrink-0" />
              <span className="truncate">Kamus</span>
            </button>
          )}

          {/* Listen Button (TTS) */}
          {onSpeakText && (
            <button
              type="button"
              onClick={onSpeakText}
              className="hover:bg-surface-container text-on-surface flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-semibold transition-colors sm:flex-initial sm:flex-row sm:gap-1.5 sm:rounded-full sm:text-xs"
              title="Dengarkan Teks"
            >
              <Volume2 size={15} className="shrink-0" />
              <span className="truncate">Dengar</span>
            </button>
          )}

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="hover:bg-surface-container text-on-surface flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-semibold transition-colors sm:flex-initial sm:flex-row sm:gap-1.5 sm:rounded-full sm:text-xs"
          >
            <Copy size={14} className="shrink-0" />
            <span className="truncate">Salin</span>
          </button>
        </div>

        {/* Desktop Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container ml-1 hidden items-center justify-center rounded-full p-1.5 transition-colors sm:flex"
          title="Tutup"
          aria-label="Tutup toolbar seleksi"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
