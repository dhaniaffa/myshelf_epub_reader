import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bookmark, Check, Copy, ExternalLink, Square, Volume2, X } from 'lucide-react';
import { createPortal } from 'react-dom';

import { registerBackHandler } from '@/lib/backHandler';

import type { FootnoteData } from '@/types';

interface FootnoteDialogProps {
  footnote: FootnoteData | null;
  onClose: () => void;
  onJumpToSource?: (href: string) => void;
}

export const FootnoteDialog: React.FC<FootnoteDialogProps> = ({
  footnote,
  onClose,
  onJumpToSource,
}) => {
  const [copied, setCopied] = useState(false);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );

  const containerRef = useRef<HTMLDivElement>(null);

  // Resize listener to track mobile vs desktop layout
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Stop any active TTS when footnote changes or unmounts
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [footnote]);

  // Android Back Handler & ESC key
  useEffect(() => {
    if (!footnote) return;

    const unregisterBack = registerBackHandler(() => {
      onClose();
      return true;
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      unregisterBack();
    };
  }, [footnote, onClose]);

  // Light dismiss on click outside
  useEffect(() => {
    if (!footnote) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [footnote, onClose]);

  // Strip HTML tags for clean copy and TTS reading
  const getPlainText = useCallback(() => {
    if (!footnote?.content) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = footnote.content;
    return tmp.textContent || tmp.innerText || '';
  }, [footnote]);

  // Copy plain text to clipboard
  const handleCopy = async () => {
    try {
      const text = getPlainText();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Failed to copy footnote text:', err);
    }
  };

  // Toggle TTS read aloud
  const handleToggleTTS = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isPlayingTTS) {
      window.speechSynthesis.cancel();
      setIsPlayingTTS(false);
      return;
    }

    const text = getPlainText();
    if (!text.trim()) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => setIsPlayingTTS(false);
    utterance.onerror = () => setIsPlayingTTS(false);

    // Guard against GC
    (
      window as unknown as { __activeFootnoteUtterance?: SpeechSynthesisUtterance }
    ).__activeFootnoteUtterance = utterance;

    window.speechSynthesis.speak(utterance);
    setIsPlayingTTS(true);
  };

  if (!footnote) return null;

  // --- Calculate Desktop Popover Position ---
  const popoverWidth = 400;
  const padding = 16;
  const anchor = footnote.anchorRect;
  const rawX = footnote.x ?? (anchor ? anchor.left + anchor.width / 2 : window.innerWidth / 2);
  const rawY = footnote.y ?? (anchor ? anchor.bottom : window.innerHeight / 2);

  // Horizontal clamping
  const halfWidth = popoverWidth / 2;
  const clampedX = Math.max(
    halfWidth + padding,
    Math.min(window.innerWidth - halfWidth - padding, rawX)
  );

  // Decide whether to place above or below anchor
  const spaceBelow = window.innerHeight - rawY;
  const isPlaceAbove = !isMobile && spaceBelow < 250 && rawY > 250;

  const desktopStyle: React.CSSProperties = isMobile
    ? {}
    : {
        position: 'fixed',
        left: `${clampedX}px`,
        ...(isPlaceAbove
          ? {
              bottom: `${window.innerHeight - (anchor ? anchor.top : rawY) + 10}px`,
            }
          : {
              top: `${(anchor ? anchor.bottom : rawY) + 10}px`,
            }),
        transform: 'translateX(-50%)',
        width: `${popoverWidth}px`,
        maxWidth: `calc(100vw - ${padding * 2}px)`,
        zIndex: 60,
      };

  // Triangle pointer offset relative to popover center
  const arrowOffsetX = rawX - clampedX;

  const content = (
    <div className="fixed inset-0 z-70 overflow-hidden">
      {/* Light backdrop (allows reader context to be visible) */}
      <div
        className="animate-fade-in fixed inset-0 bg-black/35 backdrop-blur-[1px] transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* --- MOBILE: BOTTOM SHEET --- */}
      {isMobile ? (
        <div
          ref={containerRef}
          role="dialog"
          aria-modal="true"
          aria-label={footnote.title || 'Catatan Kaki'}
          className="bg-surface-container-high/98 text-on-surface border-outline-variant/30 animate-in slide-in-from-bottom fixed inset-x-0 bottom-0 z-60 flex max-h-[60vh] flex-col rounded-t-[28px] border-t shadow-2xl backdrop-blur-xl duration-200"
        >
          {/* Mobile Top Drag Indicator */}
          <div className="bg-outline-variant/60 mx-auto my-2.5 h-1.5 w-12 shrink-0 rounded-full" />

          {/* Header */}
          <div className="border-outline-variant/15 flex shrink-0 items-center justify-between border-b px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-semibold">
                {footnote.noteNumber || <Bookmark size={14} />}
              </span>
              <span className="text-on-surface truncate text-sm font-semibold">
                {footnote.title || 'Catatan Kaki'}
              </span>
            </div>

            {/* Quick Actions */}
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={handleToggleTTS}
                className={`cursor-pointer rounded-lg p-1.5 transition-colors ${
                  isPlayingTTS
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-highest/60 hover:text-on-surface'
                }`}
                title={isPlayingTTS ? 'Hentikan suara' : 'Dengarkan isi catatan'}
                aria-label={isPlayingTTS ? 'Hentikan suara' : 'Dengarkan isi catatan'}
              >
                {isPlayingTTS ? <Square size={16} /> : <Volume2 size={16} />}
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="text-on-surface-variant hover:bg-surface-container-highest/60 hover:text-on-surface cursor-pointer rounded-lg p-1.5 transition-colors"
                title="Salin teks catatan"
                aria-label="Salin teks catatan"
              >
                {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="text-on-surface-variant hover:bg-surface-container-highest/60 hover:text-on-surface cursor-pointer rounded-lg p-1.5 transition-colors"
                title="Tutup catatan"
                aria-label="Tutup catatan"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3.5">
            <div
              className="text-on-surface text-sm leading-relaxed select-text"
              dangerouslySetInnerHTML={{ __html: footnote.content }}
            />
          </div>

          {/* Footer Action (if source navigation available) */}
          <div className="border-outline-variant/15 bg-surface-container-high/60 flex shrink-0 items-center justify-between border-t px-4 py-2.5">
            {footnote.targetHref && onJumpToSource ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onJumpToSource(footnote.targetHref!);
                }}
                className="text-primary hover:bg-primary/10 inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
              >
                <ExternalLink size={13} />
                <span>Buka di Bab Sumber</span>
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={onClose}
              className="bg-primary text-on-primary inline-flex cursor-pointer items-center rounded-lg px-3.5 py-1.5 text-xs font-medium shadow-xs transition-opacity hover:opacity-90 active:scale-95"
            >
              Tutup
            </button>
          </div>
        </div>
      ) : (
        /* --- DESKTOP / TABLET: CONTEXTUAL FLOATING POPOVER --- */
        <div
          ref={containerRef}
          style={desktopStyle}
          role="dialog"
          aria-modal="true"
          aria-label={footnote.title || 'Catatan Kaki'}
          className="bg-surface-container-high/98 text-on-surface border-outline-variant/30 animate-in fade-in zoom-in-95 flex max-h-96 flex-col rounded-2xl border shadow-2xl backdrop-blur-xl duration-150"
        >
          {/* Arrow indicator pointing to anchor */}
          <div
            style={{
              left: `calc(50% + ${arrowOffsetX}px)`,
              ...(isPlaceAbove
                ? {
                    bottom: '-6px',
                    borderBottomWidth: 0,
                    borderRightWidth: '1px',
                    borderBottomColor: 'transparent',
                  }
                : {
                    top: '-6px',
                    borderTopWidth: 0,
                    borderLeftWidth: '1px',
                    borderTopColor: 'transparent',
                  }),
            }}
            className="bg-surface-container-high border-outline-variant/30 pointer-events-none absolute size-3 -translate-x-1/2 rotate-45 border"
            aria-hidden="true"
          />

          {/* Popover Header */}
          <div className="border-outline-variant/15 flex shrink-0 items-center justify-between border-b px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="bg-primary/10 text-primary flex size-6 shrink-0 items-center justify-center rounded-md font-mono text-xs font-semibold">
                {footnote.noteNumber || <Bookmark size={13} />}
              </span>
              <span className="text-on-surface truncate text-sm font-semibold">
                {footnote.title || 'Catatan Kaki'}
              </span>
            </div>

            {/* Quick Actions */}
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={handleToggleTTS}
                className={`cursor-pointer rounded-lg p-1.5 transition-colors ${
                  isPlayingTTS
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-highest/60 hover:text-on-surface'
                }`}
                title={isPlayingTTS ? 'Hentikan suara' : 'Dengarkan isi catatan'}
                aria-label={isPlayingTTS ? 'Hentikan suara' : 'Dengarkan isi catatan'}
              >
                {isPlayingTTS ? <Square size={14} /> : <Volume2 size={14} />}
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="text-on-surface-variant hover:bg-surface-container-highest/60 hover:text-on-surface cursor-pointer rounded-lg p-1.5 transition-colors"
                title="Salin teks catatan"
                aria-label="Salin teks catatan"
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="text-on-surface-variant hover:bg-surface-container-highest/60 hover:text-on-surface cursor-pointer rounded-lg p-1.5 transition-colors"
                title="Tutup (Esc)"
                aria-label="Tutup"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Popover Content */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            <div
              className="text-on-surface text-sm leading-relaxed select-text"
              dangerouslySetInnerHTML={{ __html: footnote.content }}
            />
          </div>

          {/* Popover Footer (optional jump to source) */}
          {footnote.targetHref && onJumpToSource && (
            <div className="border-outline-variant/15 bg-surface-container-high/40 flex shrink-0 items-center justify-between border-t px-4 py-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onJumpToSource(footnote.targetHref!);
                }}
                className="text-on-surface-variant hover:text-primary inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium transition-colors"
              >
                <ExternalLink size={12} />
                <span>Buka di Bab Sumber</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="bg-primary text-on-primary inline-flex cursor-pointer items-center rounded-lg px-2.5 py-1 text-xs font-medium shadow-xs transition-opacity hover:opacity-90 active:scale-95"
              >
                Tutup
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};
