import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';

import { Button, Dialog } from '@/components/ui';
import { HIGHLIGHT_COLORS } from '@/lib/theme';

import type { HighlightColor } from '@/types';

interface NoteDialogProps {
  open: boolean;
  onClose: () => void;
  quoteText: string;
  initialNote?: string;
  initialColor?: HighlightColor;
  onSave: (note: string, color: HighlightColor) => void;
  onDelete?: () => void;
  isExisting?: boolean;
}

const NoteDialogInner: React.FC<{
  quoteText: string;
  initialNote: string;
  initialColor: HighlightColor;
  onSave: (note: string, color: HighlightColor) => void;
  onDelete?: () => void;
  onClose: () => void;
  isExisting: boolean;
}> = ({ quoteText, initialNote, initialColor, onSave, onDelete, onClose, isExisting }) => {
  const [note, setNote] = useState(initialNote);
  const [color, setColor] = useState<HighlightColor>(initialColor);

  const handleSave = () => {
    onSave(note, color);
    onClose();
  };

  const colors: HighlightColor[] = ['yellow', 'green', 'blue', 'pink'];

  return (
    <div className="space-y-4 py-1">
      {/* Quote preview */}
      <div className="bg-surface-container border-primary text-on-surface max-h-32 overflow-y-auto rounded-2xl border-l-4 p-3.5 text-xs leading-relaxed italic">
        "{quoteText}"
      </div>

      {/* Color Picker */}
      <div>
        <label className="text-on-surface-variant mb-1.5 block text-xs font-semibold">
          Warna Sorotan
        </label>
        <div className="flex items-center gap-3">
          {colors.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`h-8 w-8 cursor-pointer rounded-full border-2 transition-transform ${
                color === c
                  ? 'border-primary scale-115 shadow-sm'
                  : 'border-transparent opacity-70 hover:opacity-100'
              }`}
              style={{ backgroundColor: HIGHLIGHT_COLORS[c].border }}
              title={HIGHLIGHT_COLORS[c].label}
            />
          ))}
        </div>
      </div>

      {/* Note Textarea */}
      <div>
        <label className="text-on-surface-variant mb-1.5 block text-xs font-semibold">
          Catatan Pribadi
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Tuliskan gagasan, pemikiran, atau pertanyaan Anda di sini..."
          rows={4}
          className="bg-surface-container text-on-surface border-outline-variant/40 focus:border-primary w-full resize-none rounded-2xl border p-3 text-sm transition-colors focus:outline-none"
        />
      </div>

      {/* Action Footer */}
      <div className="border-outline-variant/20 flex items-center justify-end gap-2 border-t pt-4">
        {isExisting && onDelete && (
          <Button
            variant="text"
            size="sm"
            icon={<Trash2 size={16} />}
            onClick={() => {
              onDelete();
              onClose();
            }}
            className="text-error mr-auto"
          >
            Hapus Sorotan
          </Button>
        )}
        <Button variant="text" size="sm" onClick={onClose}>
          Batal
        </Button>
        <Button variant="filled" size="sm" onClick={handleSave}>
          Simpan
        </Button>
      </div>
    </div>
  );
};

export const NoteDialog: React.FC<NoteDialogProps> = ({
  open,
  onClose,
  quoteText,
  initialNote = '',
  initialColor = 'yellow',
  onSave,
  onDelete,
  isExisting = false,
}) => {
  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isExisting ? 'Edit Sorotan & Catatan' : 'Tambah Catatan pada Sorotan'}
      maxWidth="md"
    >
      <NoteDialogInner
        quoteText={quoteText}
        initialNote={initialNote}
        initialColor={initialColor}
        onSave={onSave}
        onDelete={onDelete}
        onClose={onClose}
        isExisting={isExisting}
      />
    </Dialog>
  );
};
