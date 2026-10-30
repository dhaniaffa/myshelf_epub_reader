import React from 'react';

import { triggerHaptic } from './swipePhysics';

export interface PdfPinchOptions {
  getContainer: () => HTMLElement | null;
  getCurrentScale: () => number;
  onCommitScale: (scale: number) => void;
  onPinchStateChange?: (isPinching: boolean) => void;
  minScale?: number;
  maxScale?: number;
}

export interface PdfPinchHandler {
  handleTouchStart: (e: TouchEvent | React.TouchEvent) => void;
  handleTouchMove: (e: TouchEvent | React.TouchEvent) => void;
  handleTouchEnd: (e: TouchEvent | React.TouchEvent) => void;
  handleTouchCancel: () => void;
  wasPinching: () => boolean;
  isPinching: () => boolean;
  cancel: () => void;
}

export function createPdfPinchHandler(options: PdfPinchOptions): PdfPinchHandler {
  const minScale = options.minScale ?? 0.75;
  const maxScale = options.maxScale ?? 3.0;

  let isPinching = false;
  let wasPinch = false;
  let pinchResetTimeout: number | undefined;

  let initialDistance = 0;
  let initialScale = 1;
  let virtualScale = 1;
  let rafId: number | null = null;

  // Double-tap tracking
  let lastTapTime = 0;
  let lastTapX = 0;
  let lastTapY = 0;

  const getDistance = (
    t1: { clientX: number; clientY: number },
    t2: { clientX: number; clientY: number }
  ): number => {
    return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
  };

  const getTargetElement = (): HTMLElement | null => {
    const container = options.getContainer();
    if (!container) return null;
    // Prefer inner wrapper/content container if available
    const inner = container.querySelector<HTMLElement>(
      '#pdf-page-container, [data-page-number], .bg-surface-container'
    );
    return inner || container;
  };

  const resetTargetStyles = (el: HTMLElement) => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    el.style.transform = '';
    el.style.transformOrigin = '';
    el.style.willChange = '';
  };

  const cancel = () => {
    if (pinchResetTimeout) {
      window.clearTimeout(pinchResetTimeout);
      pinchResetTimeout = undefined;
    }
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    const target = getTargetElement();
    if (target) {
      resetTargetStyles(target);
    }
    isPinching = false;
    options.onPinchStateChange?.(false);
  };

  const handleTouchStart = (e: TouchEvent | React.TouchEvent) => {
    if (e.touches.length === 2) {
      // 2 fingers detected: initialize pinch
      isPinching = true;
      wasPinch = true;
      options.onPinchStateChange?.(true);

      const t1 = e.touches[0];
      const t2 = e.touches[1];
      initialDistance = getDistance(t1, t2);
      initialScale = options.getCurrentScale();
      virtualScale = initialScale;

      const target = getTargetElement();
      if (target) {
        target.style.willChange = 'transform';
        // Compute focal point relative to target
        const rect = target.getBoundingClientRect();
        const midX = (t1.clientX + t2.clientX) / 2 - rect.left;
        const midY = (t1.clientY + t2.clientY) / 2 - rect.top;
        target.style.transformOrigin = `${midX}px ${midY}px`;
      }
    } else if (e.touches.length === 1 && !isPinching) {
      // Check for double-tap zoom
      const touch = e.touches[0];
      const now = Date.now();
      const dist = Math.hypot(touch.clientX - lastTapX, touch.clientY - lastTapY);

      if (now - lastTapTime < 300 && dist < 30) {
        // Double-tap triggered!
        lastTapTime = 0;
        const currentScale = options.getCurrentScale();
        triggerHaptic(15);
        if (currentScale > 1.05) {
          options.onCommitScale(1.0);
        } else {
          options.onCommitScale(2.0);
        }
        wasPinch = true;
        if (pinchResetTimeout) window.clearTimeout(pinchResetTimeout);
        pinchResetTimeout = window.setTimeout(() => {
          wasPinch = false;
        }, 350);
        return;
      }

      lastTapTime = now;
      lastTapX = touch.clientX;
      lastTapY = touch.clientY;
    }
  };

  const handleTouchMove = (e: TouchEvent | React.TouchEvent) => {
    if (!isPinching || e.touches.length !== 2) return;

    // Prevent native page scrolling while pinching
    if ('cancelable' in e && e.cancelable) {
      e.preventDefault();
    }

    const t1 = e.touches[0];
    const t2 = e.touches[1];
    const currentDistance = getDistance(t1, t2);
    if (initialDistance <= 0) return;

    const ratio = currentDistance / initialDistance;
    virtualScale = Math.min(maxScale * 1.3, Math.max(minScale * 0.7, initialScale * ratio));

    const target = getTargetElement();
    if (target) {
      const transformRatio = virtualScale / initialScale;
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          target.style.transform = `scale(${transformRatio})`;
        });
      }
    }
  };

  const handleTouchEnd = (e: TouchEvent | React.TouchEvent) => {
    if (!isPinching) return;

    // When one or both fingers lift, commit the scale
    if (e.touches.length < 2) {
      isPinching = false;
      options.onPinchStateChange?.(false);

      const target = getTargetElement();
      if (target) {
        resetTargetStyles(target);
      }

      // Compute final target scale
      let finalScale = Math.min(maxScale, Math.max(minScale, Math.round(virtualScale * 20) / 20));
      // Snap to 1.0 if close
      if (Math.abs(finalScale - 1.0) < 0.08) {
        finalScale = 1.0;
      }

      triggerHaptic(12);
      options.onCommitScale(finalScale);

      // Keep wasPinch true briefly to suppress trailing click event
      if (pinchResetTimeout) window.clearTimeout(pinchResetTimeout);
      pinchResetTimeout = window.setTimeout(() => {
        wasPinch = false;
      }, 350);
    }
  };

  const handleTouchCancel = () => {
    cancel();
  };

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
    wasPinching: () => wasPinch || isPinching,
    isPinching: () => isPinching,
    cancel,
  };
}
