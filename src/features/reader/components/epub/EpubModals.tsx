import React from 'react';

import { DictionaryDialog } from '@/features/reader/DictionaryDialog';
import { FollowLinkPopover } from '@/features/reader/FollowLinkPopover';
import { FootnoteDialog } from '@/features/reader/FootnoteDialog';
import { ImageViewerDialog } from '@/features/reader/ImageViewerDialog';
import { NoteDialog } from '@/features/reader/NoteDialog';
import { Panels } from '@/features/reader/panels';
import { SettingsSheet } from '@/features/reader/settings';

import type { EditingNoteState } from '@/features/reader/hooks/useReaderSelectionManager';
import type { PanelTab } from '@/features/reader/panels';
import type {
  Annotation,
  Book,
  Bookmark,
  FollowLinkData,
  FootnoteData,
  HighlightColor,
  ImageViewData,
  SearchResult,
  TocItem,
} from '@/types';

export interface EpubModalsProps {
  // Settings sheet
  settingsOpen: boolean;
  onCloseSettings: () => void;
  onFlashRefresh?: () => void;

  // Panels drawer (TOC, Search, Bookmarks, Annotations)
  panelsOpen: boolean;
  onClosePanels: () => void;
  activePanelTab: PanelTab;
  bookData: Book | null;
  toc: TocItem[];
  bookmarks: Bookmark[];
  annotations: Annotation[];
  chapterTitle?: string;
  onGoTo: (target: string) => void;
  onDeleteBookmark: (id: string) => Promise<void>;
  onEditAnnotationFromPanels: (annotation: Annotation) => void;
  onDeleteAnnotation: (id: string) => Promise<void> | void;
  onSearch: (query: string, onResult: (res: SearchResult) => void, onDone: () => void) => void;

  // Note dialog
  editingNoteFor: EditingNoteState | null;
  activeAnnotation: Annotation | null;
  onCloseNote: () => void;
  onSaveNote: (note: string, color: HighlightColor) => Promise<void>;
  onDeleteNote: () => Promise<void>;

  // Footnote dialog
  activeFootnote: FootnoteData | null;
  onCloseFootnote: () => void;

  // Image viewer lightbox
  activeImage: ImageViewData | null;
  onCloseImage: () => void;
  isDark: boolean;

  // Follow link popover
  activeFollowLink: FollowLinkData | null;
  onCloseFollowLink: () => void;

  // Dictionary dialog
  dictionaryWord: string | null;
  onCloseDictionary: () => void;
}

export const EpubModals: React.FC<EpubModalsProps> = ({
  settingsOpen,
  onCloseSettings,
  onFlashRefresh,
  panelsOpen,
  onClosePanels,
  activePanelTab,
  bookData,
  toc,
  bookmarks,
  annotations,
  chapterTitle,
  onGoTo,
  onDeleteBookmark,
  onEditAnnotationFromPanels,
  onDeleteAnnotation,
  onSearch,
  editingNoteFor,
  activeAnnotation,
  onCloseNote,
  onSaveNote,
  onDeleteNote,
  activeFootnote,
  onCloseFootnote,
  activeImage,
  onCloseImage,
  isDark,
  activeFollowLink,
  onCloseFollowLink,
  dictionaryWord,
  onCloseDictionary,
}) => {
  return (
    <>
      {/* NOTE EDIT DIALOG (FOR NEW OR EXISTING HIGHLIGHT) */}
      <NoteDialog
        open={Boolean(editingNoteFor) || Boolean(activeAnnotation)}
        onClose={onCloseNote}
        quoteText={
          editingNoteFor?.quoteText ||
          editingNoteFor?.annotation?.text ||
          activeAnnotation?.text ||
          ''
        }
        initialNote={editingNoteFor?.annotation?.note || activeAnnotation?.note || ''}
        initialColor={editingNoteFor?.annotation?.color || activeAnnotation?.color || 'yellow'}
        isExisting={Boolean(editingNoteFor?.isExisting) || Boolean(activeAnnotation)}
        onSave={onSaveNote}
        onDelete={onDeleteNote}
      />

      {/* SETTINGS SHEET */}
      <SettingsSheet
        open={settingsOpen}
        onClose={onCloseSettings}
        onFlashRefresh={onFlashRefresh}
        format="epub"
      />

      {/* PANELS SHEET (TOC, SEARCH, BOOKMARKS, ANNOTATIONS) */}
      {bookData && (
        <Panels
          open={panelsOpen}
          onClose={onClosePanels}
          initialTab={activePanelTab}
          book={bookData}
          toc={toc}
          bookmarks={bookmarks}
          annotations={annotations}
          activeChapter={chapterTitle}
          onJumpToCfi={onGoTo}
          onJumpToHref={onGoTo}
          onDeleteBookmark={onDeleteBookmark}
          onEditAnnotation={onEditAnnotationFromPanels}
          onDeleteAnnotation={onDeleteAnnotation}
          onSearch={onSearch}
        />
      )}

      {/* FOOTNOTE LIGHT-DISMISS DIALOG */}
      <FootnoteDialog footnote={activeFootnote} onClose={onCloseFootnote} onJumpToSource={onGoTo} />

      {/* IMAGE VIEWER LIGHTBOX */}
      <ImageViewerDialog image={activeImage} onClose={onCloseImage} isDark={isDark} />

      {/* FOLLOW LINK FLOATING POPOVER */}
      <FollowLinkPopover
        linkData={activeFollowLink}
        onClose={onCloseFollowLink}
        onFollow={onGoTo}
      />

      {/* DICTIONARY & TRANSLATION DIALOG (HYBRID) */}
      <DictionaryDialog word={dictionaryWord} onClose={onCloseDictionary} />
    </>
  );
};
