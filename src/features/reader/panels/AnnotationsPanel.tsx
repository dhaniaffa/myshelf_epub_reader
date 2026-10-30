import React from 'react';
import { MessageSquare, Trash2 } from 'lucide-react';

import { HIGHLIGHT_COLORS } from '@/lib/theme';

import type { Annotation } from '@/types';

interface AnnotationsPanelProps {
  annotations: Annotation[];
  onJumpToCfi: (cfi: string) => void;
  onEditAnnotation: (ann: Annotation) => void;
  onDeleteAnnotation: (id: string) => void;
  onClose: () => void;
}

export const AnnotationsPanel: React.FC<AnnotationsPanelProps> = ({
  annotations,
  onJumpToCfi,
  onEditAnnotation,
  onDeleteAnnotation,
  onClose,
}) => {
  return (
    <div className="space-y-3">
      {annotations.length === 0 ? (
        <div className="text-on-surface-variant py-8 text-center text-xs">
          Belum ada kutipan teks yang disorot. Pilih teks saat membaca untuk memberi sorotan warna
          dan menambahkan catatan pribadi.
        </div>
      ) : (
        annotations.map((ann) => {
          const colorConfig = HIGHLIGHT_COLORS[ann.color] || HIGHLIGHT_COLORS.yellow;
          return (
            <div
              key={ann.id}
              className="bg-surface-container border-outline-variant/30 space-y-2 rounded-2xl border p-3.5"
            >
              {/* Quote header & click to jump */}
              <div
                className="cursor-pointer"
                onClick={() => {
                  onJumpToCfi(ann.cfiRange);
                  onClose();
                }}
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: colorConfig.border }}
                  />
                  <span className="text-on-surface-variant line-clamp-1 text-[10px] font-semibold">
                    {ann.chapter || 'Kutipan'}
                  </span>
                </div>

                <blockquote
                  className="text-on-surface line-clamp-3 border-l-2 pl-2.5 text-xs leading-relaxed italic"
                  style={{ borderLeftColor: colorConfig.border }}
                >
                  "{ann.text}"
                </blockquote>
              </div>

              {/* Note text if any */}
              {ann.note && (
                <div
                  className="bg-surface-container-high text-on-surface flex items-start gap-2 rounded-xl border-l-2 p-2.5 text-xs leading-relaxed"
                  style={{ borderLeftColor: colorConfig.border }}
                >
                  <MessageSquare
                    size={13}
                    className="mt-0.5 shrink-0"
                    style={{ color: colorConfig.border }}
                  />
                  <div className="flex-1 whitespace-pre-wrap">{ann.note}</div>
                </div>
              )}

              {/* Footer actions */}
              <div className="border-outline-variant/20 text-on-surface-variant flex items-center justify-between border-t pt-1 text-[10px]">
                <span>
                  {new Date(ann.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEditAnnotation(ann)}
                    className="hover:bg-surface-container-highest text-primary rounded px-2 py-0.5 font-medium"
                  >
                    {ann.note ? 'Edit Catatan' : '+ Tambah Catatan'}
                  </button>
                  <button
                    onClick={() => onDeleteAnnotation(ann.id)}
                    className="hover:bg-error-container/30 text-error rounded p-1"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
