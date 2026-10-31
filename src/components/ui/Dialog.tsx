import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

import { registerBackHandler } from '@/lib/backHandler';
import { IconButton } from './IconButton';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg';
}

export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  children,
  actions,
  maxWidth = 'md',
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';

    const unregisterBack = registerBackHandler(() => {
      onClose();
      return true;
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
      unregisterBack();
    };
  }, [open, onClose]);

  if (!open) return null;

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-xl',
  }[maxWidth];

  const dialogContent = (
    <div
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
      }}
      className="fixed inset-0 z-70 flex items-center justify-center p-3.5 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="animate-fade-in fixed inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      {/* Surface Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        className={`relative z-10 w-full ${maxWidthClass} bg-surface-container-high border-outline-variant/30 animate-slide-up flex max-h-[calc(100dvh-2.5rem)] flex-col rounded-[24px] border p-4.5 shadow-2xl sm:max-h-[88vh] sm:rounded-[28px] sm:p-6`}
      >
        {title && (
          <div className="mb-2 flex shrink-0 items-center justify-between pb-3">
            <h3 className="text-on-surface text-lg font-bold tracking-tight sm:text-xl">{title}</h3>
            <IconButton size="sm" onClick={onClose} aria-label="Tutup">
              <X size={18} />
            </IconButton>
          </div>
        )}
        <div className="text-on-surface-variant flex-1 overflow-y-auto pr-1 text-sm">
          {children}
        </div>
        {actions && (
          <div className="border-outline-variant/20 mt-3 flex shrink-0 items-center justify-end gap-2 border-t pt-4">
            {actions}
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(dialogContent, document.body)
    : dialogContent;
};
