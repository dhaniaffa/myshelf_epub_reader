import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, Check, Copy, ExternalLink, Globe, X } from 'lucide-react';

import type { FollowLinkData } from '@/types';

interface FollowLinkPopoverProps {
  linkData: FollowLinkData | null;
  onClose: () => void;
  onFollow: (href: string) => void;
}

const FollowLinkModal: React.FC<{
  linkData: FollowLinkData;
  onClose: () => void;
  onFollow: (href: string) => void;
}> = ({ linkData, onClose, onFollow }) => {
  const [copied, setCopied] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const { href } = linkData;
  const isExternal = /^https?:\/\//i.test(href) || href.startsWith('mailto:');

  const handleFollow = useCallback(() => {
    onClose();
    if (isExternal) {
      window.open(href, '_blank', 'noopener,noreferrer');
    } else {
      onFollow(href);
    }
  }, [href, isExternal, onClose, onFollow]);

  // Keyboard shortcut Esc & Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        handleFollow();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handleFollow]);

  // Click outside to dismiss
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const timer = setTimeout(() => {
      window.addEventListener('mousedown', handleClickOutside);
    }, 50);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  // Popover positioning
  const hasCoordinates = typeof linkData.x === 'number' && typeof linkData.y === 'number';
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  let style: React.CSSProperties = {};
  if (hasCoordinates && !isMobile) {
    const rawX = linkData.x!;
    const rawY = linkData.y!;
    const popoverWidth = 380;
    const clampedX = Math.max(
      popoverWidth / 2 + 16,
      Math.min(window.innerWidth - popoverWidth / 2 - 16, rawX)
    );
    const isNearTop = rawY < 95;
    const topY = isNearTop ? rawY + 28 : rawY - 48;

    style = {
      position: 'fixed',
      left: `${clampedX}px`,
      top: `${topY}px`,
      transform: 'translate(-50%, 0)',
      zIndex: 60,
    };
  }

  return (
    <div
      ref={popoverRef}
      style={style}
      className={`bg-surface-container-high/95 text-on-surface border-outline-variant/30 animate-in fade-in zoom-in-95 z-60 flex items-center gap-2 rounded-xl border p-1.5 pl-3 shadow-2xl backdrop-blur-md duration-150 select-none dark:bg-neutral-900/95 ${
        !hasCoordinates || isMobile
          ? 'fixed inset-x-4 bottom-8 mx-auto max-w-md justify-between'
          : 'w-fit max-w-105'
      }`}
    >
      {/* Icon & Label & URL */}
      <div className="mr-1 flex min-w-0 flex-1 items-center gap-2">
        {isExternal ? (
          <Globe size={15} className="text-primary shrink-0" />
        ) : (
          <BookOpen size={15} className="text-primary shrink-0" />
        )}
        <span className="text-on-surface-variant shrink-0 text-xs font-medium">Follow link:</span>
        <button
          type="button"
          onClick={handleFollow}
          className="text-primary max-w-40 cursor-pointer truncate text-left font-mono text-xs hover:underline focus:outline-hidden sm:max-w-50"
          title={href}
        >
          {href}
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={handleFollow}
          className="bg-primary text-on-primary inline-flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium shadow-xs transition-all hover:opacity-90 active:scale-95"
          title={isExternal ? 'Buka tautan di tab baru (Enter)' : 'Lompat ke bagian buku (Enter)'}
        >
          <span>{isExternal ? 'Buka' : 'Lompat'}</span>
          <ExternalLink size={12} className="shrink-0" />
        </button>

        <button
          type="button"
          onClick={handleCopy}
          className="hover:bg-surface-container-highest/60 text-on-surface-variant hover:text-on-surface cursor-pointer rounded-lg p-1.5 transition-colors"
          title="Salin alamat tautan"
        >
          {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="hover:bg-surface-container-highest/60 text-on-surface-variant hover:text-on-surface cursor-pointer rounded-lg p-1.5 transition-colors"
          title="Tutup (Esc)"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export const FollowLinkPopover: React.FC<FollowLinkPopoverProps> = ({
  linkData,
  onClose,
  onFollow,
}) => {
  if (!linkData) return null;
  return (
    <FollowLinkModal
      key={`${linkData.href}_${linkData.x}_${linkData.y}`}
      linkData={linkData}
      onClose={onClose}
      onFollow={onFollow}
    />
  );
};
