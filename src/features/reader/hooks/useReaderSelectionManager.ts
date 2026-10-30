import { useCallback, useEffect, useMemo, useState } from 'react';

import { toast } from '@/store/toast';

import type { Annotation, HighlightColor } from '@/types';

export interface EditingNoteState {
  annotation?: Annotation;
  quoteText: string;
  cfiRange?: string;
  selection?: { cfiRange: string; text: string };
  isExisting: boolean;
}

export interface UseReaderSelectionManagerOptions {
  selection: { cfiRange: string; text: string } | null;
  activeAnnotation: Annotation | null;
  annotations: Annotation[];
  chapterTitle?: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  showTTSBar: boolean;
  isSpeakingSelection?: boolean;
  getCurrentPageText: () => string;
  clearSelection: () => void;
  clearActiveAnnotation: () => void;
  addHighlight: (
    color: HighlightColor,
    note?: string,
    selection?: { cfiRange: string; text: string }
  ) => Promise<void>;
  updateAnnotation: (id: string, note: string, color?: HighlightColor) => Promise<void>;
  removeAnnotation: (id: string) => Promise<void>;
  onResetTTSSentences?: (sentences: string[]) => void;
  splitIntoSentences?: (text: string) => string[];
}

export function useReaderSelectionManager({
  selection,
  activeAnnotation,
  annotations,
  chapterTitle,
  containerRef,
  showTTSBar,
  isSpeakingSelection,
  getCurrentPageText,
  clearSelection,
  clearActiveAnnotation,
  addHighlight,
  updateAnnotation,
  removeAnnotation,
  onResetTTSSentences,
  splitIntoSentences,
}: UseReaderSelectionManagerOptions) {
  const [editingNoteFor, setEditingNoteFor] = useState<EditingNoteState | null>(null);

  // Clear selection and ensure TTS state is reset if playing selection
  const handleClearSelection = useCallback(() => {
    clearSelection();
    if (isSpeakingSelection && onResetTTSSentences && splitIntoSentences) {
      const pageText = getCurrentPageText();
      const sentences = splitIntoSentences(pageText);
      onResetTTSSentences(sentences);
    }
  }, [
    clearSelection,
    isSpeakingSelection,
    onResetTTSSentences,
    splitIntoSentences,
    getCurrentPageText,
  ]);

  // Listener to automatically close selection toolbar when clicking outside
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        selection &&
        target &&
        !target.closest('.selection-bar-container') &&
        !target.closest('.tts-player-bar-container') &&
        !target.closest('dialog') &&
        !target.closest('.modal-container') &&
        !target.closest('[role="dialog"]') &&
        !containerRef.current?.contains(target)
      ) {
        if (!showTTSBar) {
          handleClearSelection();
        }
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [selection, showTTSBar, handleClearSelection, containerRef]);

  // Check if active selection overlaps or matches an existing highlight
  const findMatchingAnnotation = useCallback(
    (targetSelection: { cfiRange: string; text: string } | null): Annotation | null => {
      if (!targetSelection || annotations.length === 0) return null;
      const trimmedText = targetSelection.text.trim();
      if (!trimmedText) return null;

      // 1. Exact CFI range match
      const byCfi = annotations.find((a) => a.cfiRange === targetSelection.cfiRange);
      if (byCfi) return byCfi;

      // 2. Exact text match in the current chapter
      const byText = annotations.find(
        (a) =>
          a.text.trim() === trimmedText &&
          (!a.chapter || !chapterTitle || a.chapter === chapterTitle)
      );
      if (byText) return byText;

      // 3. Substring match for highlighted range
      const bySub = annotations.find((a) => {
        const aText = a.text.trim();
        const sameChap = !a.chapter || !chapterTitle || a.chapter === chapterTitle;
        if (!sameChap) return false;
        return (
          (aText.length > 5 && trimmedText.includes(aText)) ||
          (trimmedText.length > 5 && aText.includes(trimmedText))
        );
      });
      return bySub || null;
    },
    [annotations, chapterTitle]
  );

  const matchingAnnotation = useMemo(() => {
    return findMatchingAnnotation(selection);
  }, [findMatchingAnnotation, selection]);

  const handleOpenNote = useCallback(() => {
    if (!selection) return;
    if (matchingAnnotation) {
      setEditingNoteFor({
        annotation: matchingAnnotation,
        quoteText: matchingAnnotation.text || selection.text,
        selection,
        cfiRange: matchingAnnotation.cfiRange,
        isExisting: true,
      });
    } else {
      setEditingNoteFor({
        quoteText: selection.text,
        selection,
        cfiRange: selection.cfiRange,
        isExisting: false,
      });
    }
  }, [selection, matchingAnnotation]);

  const handleSaveNote = useCallback(
    async (note: string, color: HighlightColor) => {
      const targetAnn = editingNoteFor?.annotation || activeAnnotation;
      if (targetAnn) {
        await updateAnnotation(targetAnn.id, note, color);
        toast.success('Catatan berhasil diperbarui');
      } else {
        const targetSelection = editingNoteFor?.selection || selection;
        if (targetSelection) {
          const existing = findMatchingAnnotation(targetSelection);
          if (existing) {
            await updateAnnotation(existing.id, note, color);
            toast.success('Catatan berhasil diperbarui');
          } else {
            await addHighlight(color, note, targetSelection);
            toast.success('Sorotan & catatan berhasil disimpan');
          }
        }
      }
      setEditingNoteFor(null);
      clearActiveAnnotation();
      handleClearSelection();
    },
    [
      editingNoteFor,
      activeAnnotation,
      selection,
      findMatchingAnnotation,
      updateAnnotation,
      addHighlight,
      clearActiveAnnotation,
      handleClearSelection,
    ]
  );

  const handleDeleteHighlight = useCallback(async () => {
    const targetId = editingNoteFor?.annotation?.id || activeAnnotation?.id;
    if (targetId) {
      await removeAnnotation(targetId);
      toast.info('Sorotan dihapus');
    }
    setEditingNoteFor(null);
    clearActiveAnnotation();
    handleClearSelection();
  }, [
    editingNoteFor?.annotation?.id,
    activeAnnotation?.id,
    removeAnnotation,
    clearActiveAnnotation,
    handleClearSelection,
  ]);

  const handleSelectColor = useCallback(
    async (color: HighlightColor) => {
      if (matchingAnnotation) {
        await updateAnnotation(matchingAnnotation.id, matchingAnnotation.note || '', color);
        toast.success('Warna sorotan diperbarui');
        handleClearSelection();
      } else {
        await addHighlight(color);
      }
    },
    [matchingAnnotation, updateAnnotation, handleClearSelection, addHighlight]
  );

  return {
    editingNoteFor,
    setEditingNoteFor,
    matchingAnnotation,
    handleClearSelection,
    handleOpenNote,
    handleSaveNote,
    handleDeleteHighlight,
    handleSelectColor,
  };
}
