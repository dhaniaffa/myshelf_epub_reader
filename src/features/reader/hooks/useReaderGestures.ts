import React, { useEffect, useRef, useState } from 'react';

import { createNativeSwipeHandler } from '../utils/swipePhysics';

import type { FollowLinkData, ReaderFlowMode } from '@/types';
import type { NativeSwipeHandler } from '../utils/swipePhysics';

export interface UseReaderGesturesOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  flowMode: ReaderFlowMode;
  hasSelection: boolean;
  activeFollowLink: FollowLinkData | null;
  isEink?: boolean;
  isAtStart?: () => boolean;
  isAtEnd?: () => boolean;
  onClearSelection: () => void;
  onDismissFollowLink: () => void;
  onToggleBars: () => void;
  next: () => void;
  prev: () => void;
}

export interface UseReaderGesturesReturn {
  stageCursor: 'default' | 'pointer';
  handleStageMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleStageTouchStart: (e: React.TouchEvent<HTMLDivElement>) => void;
  handleStageTouchMove: (e: React.TouchEvent<HTMLDivElement>) => void;
  handleStageTouchEnd: (e: React.TouchEvent<HTMLDivElement>) => void;
  handleStageTouchCancel: (e: React.TouchEvent<HTMLDivElement>) => void;
  handleStageClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

/**
 * Custom hook to handle native-like physics swipe gestures, dynamic cursor,
 * and margin click zones on the reader stage.
 */
export function useReaderGestures({
  containerRef,
  flowMode,
  hasSelection,
  activeFollowLink,
  isEink = false,
  isAtStart,
  isAtEnd,
  onClearSelection,
  onDismissFollowLink,
  onToggleBars,
  next,
  prev,
}: UseReaderGesturesOptions): UseReaderGesturesReturn {
  const [stageCursor, setStageCursor] = useState<'default' | 'pointer'>('default');
  const swipeHandlerRef = useRef<NativeSwipeHandler | null>(null);

  useEffect(() => {
    swipeHandlerRef.current = createNativeSwipeHandler({
      getContainer: () => containerRef.current,
      canSwipe: () => flowMode === 'paginated' && !hasSelection,
      isAtStart,
      isAtEnd,
      isEink: () => isEink,
      onNext: next,
      onPrev: prev,
    });
    return () => {
      swipeHandlerRef.current?.cancel();
    };
  }, [containerRef, flowMode, hasSelection, isAtStart, isAtEnd, isEink, next, prev]);

  const handleStageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (flowMode !== 'paginated') {
      if (stageCursor !== 'default') setStageCursor('default');
      return;
    }
    const cRect = containerRef.current?.getBoundingClientRect();
    if (!cRect) {
      if (stageCursor !== 'default') setStageCursor('default');
      return;
    }

    // Only set pointer cursor when hovered over the empty margin outside the book content container
    const isLeftEmptySpace = e.clientX < cRect.left;
    const isRightEmptySpace = e.clientX > cRect.right;

    const nextCursor = isLeftEmptySpace || isRightEmptySpace ? 'pointer' : 'default';
    if (stageCursor !== nextCursor) {
      setStageCursor(nextCursor);
    }
  };

  const handleStageTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    swipeHandlerRef.current?.handleTouchStart(e);
  };

  const handleStageTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    swipeHandlerRef.current?.handleTouchMove(e);
  };

  const handleStageTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    swipeHandlerRef.current?.handleTouchEnd(e);
  };

  const handleStageTouchCancel = () => {
    swipeHandlerRef.current?.handleTouchCancel();
  };

  const handleStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // If a horizontal swipe drag just occurred, suppress click event completely
    if (swipeHandlerRef.current?.wasSwipeGesture()) {
      return;
    }

    if (activeFollowLink) {
      onDismissFollowLink();
    }

    // If text is currently selected, clicking dismisses the selection
    if (hasSelection) {
      onClearSelection();
      return;
    }

    const winSel = window.getSelection();
    if (winSel && !winSel.isCollapsed && winSel.toString().trim().length > 0) return;

    const isPaginated = flowMode === 'paginated';
    if (!isPaginated) {
      onToggleBars();
      return;
    }

    const cRect = containerRef.current?.getBoundingClientRect();
    if (!cRect) {
      onToggleBars();
      return;
    }

    // Strictly check if click occurred in the empty space outside the book container
    const isLeftEmptySpace = e.clientX < cRect.left;
    const isRightEmptySpace = e.clientX > cRect.right;

    if (isLeftEmptySpace) {
      prev();
    } else if (isRightEmptySpace) {
      next();
    } else {
      // Clicked inside content container: toggle UI bars, NEVER flip page!
      onToggleBars();
    }
  };

  return {
    stageCursor,
    handleStageMouseMove,
    handleStageTouchStart,
    handleStageTouchMove,
    handleStageTouchEnd,
    handleStageTouchCancel,
    handleStageClick,
  };
}
