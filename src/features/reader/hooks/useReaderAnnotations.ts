import { useCallback, useEffect, useState } from 'react';

import { db } from '@/lib/db';
import { HIGHLIGHT_COLORS } from '@/lib/theme';

import type { Annotation, HighlightColor } from '@/types';
import type { Rendition } from 'epubjs';

interface UseReaderAnnotationsOptions {
  bookId: string;
  renditionRef: React.RefObject<Rendition | null>;
  isReady: boolean;
  onAnnotationClick?: (ann: Annotation) => void;
  onAnnotationRemoved?: () => void;
}

export function useReaderAnnotations({
  bookId,
  renditionRef,
  isReady,
  onAnnotationClick,
  onAnnotationRemoved,
}: UseReaderAnnotationsOptions) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  // Load annotations from IndexedDB
  useEffect(() => {
    db.annotations
      .where('bookId')
      .equals(bookId)
      .toArray()
      .then((anns) => {
        setAnnotations(anns);
      });
  }, [bookId]);

  // Apply annotations to epubjs rendition
  useEffect(() => {
    if (!renditionRef.current || !isReady) return;
    const rendition = renditionRef.current;

    // Clear existing highlights
    annotations.forEach((ann) => {
      try {
        rendition.annotations.remove(ann.cfiRange, 'highlight');
      } catch {
        // ignore
      }
    });

    // Re-add highlights
    annotations.forEach((ann) => {
      try {
        const colorConfig = HIGHLIGHT_COLORS[ann.color] || HIGHLIGHT_COLORS.yellow;
        rendition.annotations.add(
          'highlight',
          ann.cfiRange,
          { id: ann.id },
          () => {
            onAnnotationClick?.(ann);
          },
          `highlight-${ann.color}`,
          { fill: colorConfig.fill }
        );
      } catch {
        // ignore
      }
    });
  }, [annotations, isReady, renditionRef, onAnnotationClick]);

  // Add new highlight (or update existing if selection overlaps/matches)
  const addHighlight = useCallback(
    async (
      color: HighlightColor,
      note?: string,
      selection?: { cfiRange: string; text: string } | null,
      chapterTitle?: string
    ) => {
      if (!selection) return;
      const { cfiRange, text } = selection;
      const trimmedText = text.trim();

      // Check if an annotation already exists with matching cfiRange or text
      const existing = annotations.find(
        (a) =>
          a.cfiRange === cfiRange ||
          (a.text.trim() === trimmedText && (!a.chapter || !chapterTitle || a.chapter === chapterTitle))
      );

      if (existing) {
        const updated: Annotation = {
          ...existing,
          color,
          note: note !== undefined ? (note || null) : existing.note,
          updatedAt: Date.now(),
        };

        await db.annotations.put(updated);
        setAnnotations((prev) => prev.map((a) => (a.id === existing.id ? updated : a)));
        return updated;
      }

      const newAnnotation: Annotation = {
        id: Math.random().toString(36).substring(2, 10),
        bookId,
        cfiRange,
        text,
        color,
        note: note || null,
        chapter: chapterTitle || null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await db.annotations.put(newAnnotation);
      setAnnotations((prev) => [...prev, newAnnotation]);
      return newAnnotation;
    },
    [bookId, annotations]
  );

  // Update note on an annotation
  const updateAnnotation = useCallback(async (id: string, note: string, color?: HighlightColor) => {
    const existing = await db.annotations.get(id);
    if (!existing) return;

    const updated: Annotation = {
      ...existing,
      note,
      color: color || existing.color,
      updatedAt: Date.now(),
    };

    await db.annotations.put(updated);
    setAnnotations((prev) => prev.map((a) => (a.id === id ? updated : a)));
  }, []);

  // Remove an annotation
  const removeAnnotation = useCallback(
    async (id: string) => {
      const existing = await db.annotations.get(id);
      if (existing) {
        try {
          renditionRef.current?.annotations.remove(existing.cfiRange, 'highlight');
        } catch {
          // ignore
        }
        await db.annotations.delete(id);
        setAnnotations((prev) => prev.filter((a) => a.id !== id));
        onAnnotationRemoved?.();
      }
    },
    [renditionRef, onAnnotationRemoved]
  );

  return {
    annotations,
    addHighlight,
    updateAnnotation,
    removeAnnotation,
  };
}
