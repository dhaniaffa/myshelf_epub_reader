import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

import { useToastStore } from '@/store/toast';

import type { ToastType } from '@/store/toast';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />,
    error: <AlertCircle size={18} className="shrink-0 text-rose-500" />,
    warning: <AlertTriangle size={18} className="shrink-0 text-amber-500" />,
    info: <Info size={18} className="shrink-0 text-sky-500" />,
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] z-50 mx-auto flex w-full max-w-[calc(100vw-2rem)] flex-col items-center gap-2 px-2 transition-all duration-200 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:mx-0 sm:max-w-sm sm:items-end sm:px-0">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="bg-surface-container-highest/95 dark:bg-surface-container-highest text-on-surface border-outline-variant/30 animate-slide-up pointer-events-auto flex w-full items-center gap-3 rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-md"
        >
          {icons[t.type]}
          <div className="text-on-surface min-w-0 flex-1 text-xs leading-snug font-medium break-words sm:text-sm">
            {t.message}
          </div>
          <button
            type="button"
            onClick={() => removeToast(t.id)}
            className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high shrink-0 rounded-full p-1.5 transition-transform active:scale-95"
            aria-label="Tutup notifikasi"
          >
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
};
