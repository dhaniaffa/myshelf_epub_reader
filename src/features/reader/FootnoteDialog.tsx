import React from 'react';
import { Bookmark, ExternalLink } from 'lucide-react';

import { Button, Dialog } from '@/components/ui';

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
  if (!footnote) return null;

  return (
    <Dialog
      open={!!footnote}
      onClose={onClose}
      title={
        <div className="text-primary flex items-center gap-2 font-semibold">
          <Bookmark size={18} className="shrink-0" />
          <span>{footnote.title || 'Catatan Kaki'}</span>
        </div>
      }
      actions={
        <div className="flex w-full items-center justify-between">
          {footnote.targetHref && onJumpToSource ? (
            <Button
              variant="tonal"
              size="sm"
              icon={<ExternalLink size={14} />}
              onClick={() => {
                onClose();
                onJumpToSource(footnote.targetHref!);
              }}
            >
              Buka di Sumber
            </Button>
          ) : (
            <div />
          )}
          <Button variant="filled" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </div>
      }
    >
      <div className="space-y-3 py-1">
        <div
          className="text-on-surface max-h-[50vh] overflow-y-auto pr-1 text-sm leading-relaxed select-text"
          dangerouslySetInnerHTML={{ __html: footnote.content }}
        />
      </div>
    </Dialog>
  );
};
