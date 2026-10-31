import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

import { registerBackHandler } from '@/lib/backHandler';
import { IconButton } from './IconButton';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Sheet: React.FC<SheetProps> = ({ open, onClose, title, children, footer }) => {
  useEffect(() => {
    if (!open) return;

    const unregisterBack = registerBackHandler(() => {
      onClose();
      return true;
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      unregisterBack();
    };
  }, [open, onClose]);

  if (!open) return null;

  const sheetContent = (
    <div className="fixed inset-0 z-70 overflow-hidden">
      {/* Backdrop */}
      <div
        className="animate-fade-in fixed inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity"
        onClick={onClose}
      />

      {/* Mobile: Bottom Sheet | Desktop: Side Sheet */}
      <div className="bg-surface-container border-outline-variant/30 animate-slide-up fixed inset-x-0 bottom-0 flex h-[82vh] max-h-[85vh] flex-col rounded-t-[28px] border-t shadow-2xl transition-transform md:inset-x-auto md:top-0 md:right-0 md:bottom-0 md:h-full md:max-h-full md:w-105 md:rounded-t-none md:rounded-l-[28px] md:border-t-0 md:border-l lg:w-115">
        {/* Mobile drag handle */}
        <div className="bg-outline-variant mx-auto my-2 h-1 w-10 shrink-0 rounded-full md:hidden" />

        {/* Sheet Header */}
        <div className="border-outline-variant/20 flex shrink-0 items-center justify-between border-b px-4 py-3 sm:px-6">
          <div className="text-on-surface text-base font-semibold">{title}</div>
          <IconButton size="sm" onClick={onClose} aria-label="Tutup Panel">
            <X size={18} />
          </IconButton>
        </div>

        {/* Sheet Body */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">{children}</div>

        {/* Sheet Footer */}
        {footer && (
          <div className="border-outline-variant/20 bg-surface-container-high/50 border-t p-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(sheetContent, document.body) : sheetContent;
};
