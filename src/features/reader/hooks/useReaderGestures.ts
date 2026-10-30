import React, { useRef, useState } from 'react';

import type { FollowLinkData, ReaderFlowMode } from '@/types';

export interface UseReaderGesturesOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  flowMode: ReaderFlowMode;
  hasSelection: boolean;
  activeFollowLink: FollowLinkData | null;
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
  handleStageTouchEnd: (e: React.TouchEvent<HTMLDivElement>) => void;
  handleStageClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

/**
 * Custom hook to handle swipe gestures, dynamic cursor, and margin click zones on the reader stage.
 */
export function useReaderGestures({
  containerRef,
  flowMode,
  hasSelection,
  activeFollowLink,
  onClearSelection,
  onDismissFollowLink,
  onToggleBars,
  next,
  prev,
}: UseReaderGesturesOptions): UseReaderGesturesReturn {
  const [stageCursor, setStageCursor] = useState<'default' | 'pointer'>('default');

  const stageTouchRef = useRef<{ startX: number; startY: number; startTime: number }>({
    startX: 0,
    startY: 0,
    startTime: 0,
  });

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
    if (e.touches.length !== 1) return;
    stageTouchRef.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      startTime: Date.now(),
    };
  };

  const handleStageTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.changedTouches[0];
    if (!touch) return;
    const deltaX = touch.clientX - stageTouchRef.current.startX;
    const deltaY = touch.clientY - stageTouchRef.current.startY;
    const elapsed = Date.now() - stageTouchRef.current.startTime;

    if (
      flowMode === 'paginated' &&
      Math.abs(deltaX) >= 40 &&
      Math.abs(deltaX) > Math.abs(deltaY) * 1.2 &&
      elapsed <= 500
    ) {
      if (deltaX < 0) {
        next();
      } else {
        prev();
      }
    }
  };

  const handleStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
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
    handleStageTouchEnd,
    handleStageClick,
  };
}
