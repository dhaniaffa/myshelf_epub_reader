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
    <div className="pointer-events-none fixed right-5 bottom-5 z-50 flex w-full max-w-sm flex-col gap-2 p-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="bg-surface-container-highest text-on-surface border-outline-variant/30 animate-slide-up pointer-events-auto flex items-center gap-3 rounded-2xl border p-3.5 text-sm font-medium shadow-lg"
        >
          {icons[t.type]}
          <div className="flex-1 leading-snug">{t.message}</div>
          <button
            onClick={() => removeToast(t.id)}
            className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-full p-1"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
