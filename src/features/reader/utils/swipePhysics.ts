/**
 * Physics-based native swipe controller for e-book page turns.
 * Engineered for 60/120 FPS buttery-smooth performance on mobile WebViews:
 * - RequestAnimationFrame (rAF) hardware-synchronized transforms
 * - Zero alpha blending re-rasterization during drag
 * - Iframe pointer-events isolation to eliminate hit-test overhead
 * - Ultra-responsive flick (0.18 px/ms) and low distance threshold (36px)
 * - Thumb-arc diagonal tolerance (up to 55 degrees)
 * - Fast snappy spring slide transitions (150ms / 130ms)
 */

export interface NativeSwipeOptions {
  getContainer: () => HTMLElement | null;
  onNext: () => void;
  onPrev: () => void;
  canSwipe: () => boolean;
  isAtStart?: () => boolean;
  isAtEnd?: () => boolean;
  isEink?: () => boolean;
  onSwipeStateChange?: (isSwiping: boolean) => void;
}

export interface NativeSwipeHandler {
  handleTouchStart: (e: TouchEvent | React.TouchEvent) => void;
  handleTouchMove: (e: TouchEvent | React.TouchEvent) => void;
  handleTouchEnd: (e: TouchEvent | React.TouchEvent) => void;
  handleTouchCancel: () => void;
  wasSwipeGesture: () => boolean;
  isDragging: () => boolean;
  cancel: () => void;
}

export function triggerHaptic(duration = 12): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(duration);
    } catch {
      // ignore
    }
  }
}

export function createNativeSwipeHandler(options: NativeSwipeOptions): NativeSwipeHandler {
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let lastX = 0;
  let lastTime = 0;
  let velocity = 0;

  let isDragging = false;
  let directionLocked = false;
  let wasSwipe = false;
  let isAnimating = false;
  let cleanupTimeout: number | undefined;

  let rafId: number | null = null;
  let pendingTranslateX = 0;

  const setIframePointerEvents = (container: HTMLElement, enable: boolean) => {
    try {
      const iframes = container.querySelectorAll('iframe');
      iframes.forEach((ifr) => {
        ifr.style.pointerEvents = enable ? '' : 'none';
      });
    } catch {
      // ignore
    }
  };

  const resetStyles = (container: HTMLElement) => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    setIframePointerEvents(container, true);
    container.style.transition = '';
    container.style.transform = '';
    container.style.opacity = '';
    container.style.willChange = '';
  };

  const scheduleTransform = (container: HTMLElement, x: number) => {
    pendingTranslateX = x;
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        rafId = null;
        container.style.transform = `translate3d(${pendingTranslateX}px, 0, 0)`;
      });
    }
  };

  const cancel = () => {
    if (cleanupTimeout) {
      window.clearTimeout(cleanupTimeout);
      cleanupTimeout = undefined;
    }
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    const container = options.getContainer();
    if (container) {
      resetStyles(container);
    }
    isDragging = false;
    directionLocked = false;
    isAnimating = false;
    options.onSwipeStateChange?.(false);
  };

  const handleTouchStart = (e: TouchEvent | React.TouchEvent) => {
    if (isAnimating) {
      cancel();
    }

    if (!options.canSwipe() || e.touches.length !== 1) {
      return;
    }

    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    startTime = Date.now();
    lastX = startX;
    lastTime = startTime;
    velocity = 0;

    isDragging = false;
    directionLocked = false;

    const container = options.getContainer();
    if (container) {
      container.style.transition = 'none';
      container.style.willChange = 'transform';
    }
  };

  const handleTouchMove = (e: TouchEvent | React.TouchEvent) => {
    if (isAnimating || !options.canSwipe() || e.touches.length !== 1) {
      return;
    }

    const touch = e.touches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Fast, natural thumb-arc direction locking (within first 6px)
    if (!directionLocked) {
      // Abort only if unmistakably a vertical scroll gesture
      if (absY > 12 && absY > absX * 1.4) {
        directionLocked = true;
        isDragging = false;
        const container = options.getContainer();
        if (container) resetStyles(container);
        return;
      }

      // Natural thumb arc tolerance: allows horizontal swipe angle up to ~57 degrees
      if (absX >= 6 && absX >= absY * 0.65) {
        directionLocked = true;
        isDragging = true;
        wasSwipe = true;
        const container = options.getContainer();
        if (container) {
          setIframePointerEvents(container, false);
        }
        options.onSwipeStateChange?.(true);
      }
    }

    if (!isDragging) return;

    // Prevent Chromium WebView horizontal back/forward navigation
    if (e.cancelable && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }

    // Measure instantaneous velocity
    const now = Date.now();
    const dt = now - lastTime;
    if (dt > 0) {
      velocity = (touch.clientX - lastX) / dt;
    }
    lastX = touch.clientX;
    lastTime = now;

    // Check if dragging against confirmed boundaries
    const isAtStart = options.isAtStart?.() ?? false;
    const isAtEnd = options.isAtEnd?.() ?? false;
    const isTryingPrev = deltaX > 0;
    const isTryingNext = deltaX < 0;
    const isHittingBoundary = (isTryingPrev && isAtStart) || (isTryingNext && isAtEnd);

    const container = options.getContainer();
    if (container) {
      if (isHittingBoundary) {
        // Elastic rubber-band tension at verified boundary
        const sign = deltaX > 0 ? 1 : -1;
        const stretch = Math.min(45, Math.pow(absX, 0.7) * 1.4);
        scheduleTransform(container, sign * stretch);
        return;
      }

      // Direct 1:1 hardware-accelerated tracking without expensive opacity recalculation
      const screenWidth = window.innerWidth || 360;
      const maxFree = screenWidth * 0.45;
      let tx = deltaX;

      if (absX > maxFree) {
        const extra = absX - maxFree;
        const sign = deltaX > 0 ? 1 : -1;
        tx = sign * (maxFree + extra * 0.3);
      }

      scheduleTransform(container, tx);
    }
  };

  const handleTouchEnd = (e: TouchEvent | React.TouchEvent) => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    if (!isDragging) {
      const container = options.getContainer();
      if (container) resetStyles(container);
      return;
    }

    isDragging = false;
    directionLocked = false;

    const touch = e.changedTouches?.[0];
    const deltaX = touch ? touch.clientX - startX : lastX - startX;
    const absX = Math.abs(deltaX);
    const screenWidth = window.innerWidth || 360;

    const isAtStart = options.isAtStart?.() ?? false;
    const isAtEnd = options.isAtEnd?.() ?? false;
    const isTryingPrev = deltaX > 0;
    const isTryingNext = deltaX < 0;
    const isHittingBoundary = (isTryingPrev && isAtStart) || (isTryingNext && isAtEnd);

    const container = options.getContainer();
    const isEink = options.isEink?.() ?? false;

    // Handle boundary rebound with tactile micro-tick
    if (isHittingBoundary) {
      triggerHaptic(8);
      if (container && !isEink) {
        isAnimating = true;
        container.style.transition = 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)';
        container.style.transform = 'translate3d(0, 0, 0)';

        cleanupTimeout = window.setTimeout(() => {
          resetStyles(container);
          isAnimating = false;
          options.onSwipeStateChange?.(false);
          cleanupTimeout = undefined;
        }, 200);
      } else {
        if (container) resetStyles(container);
        options.onSwipeStateChange?.(false);
      }
      return;
    }

    // Highly responsive thresholds:
    // 1. Effortless flick: velocity >= 0.18 px/ms with as little as 15px motion
    // 2. Short static drag: only 36px or 10% of screen width
    const isFlick = Math.abs(velocity) >= 0.18 && absX >= 15;
    const isFarEnough = absX >= Math.min(36, screenWidth * 0.1);
    const shouldTurn = isFlick || isFarEnough;

    if (shouldTurn) {
      triggerHaptic(12);
      const isNext = deltaX < 0;

      // E-Ink optimization: instantaneous flash turn
      if (isEink || !container) {
        if (container) resetStyles(container);
        if (isNext) options.onNext();
        else options.onPrev();
        options.onSwipeStateChange?.(false);
        return;
      }

      // Snappy, silky 60/120 FPS slide transition (150ms slide-out + 130ms slide-in)
      isAnimating = true;
      const slideOutX = isNext ? '-100%' : '100%';
      const slideInStartX = isNext ? '30px' : '-30px';

      container.style.transition = 'transform 150ms cubic-bezier(0.16, 1, 0.3, 1)';
      container.style.transform = `translate3d(${slideOutX}, 0, 0)`;

      cleanupTimeout = window.setTimeout(() => {
        if (isNext) {
          options.onNext();
        } else {
          options.onPrev();
        }

        // Reposition on entrance side with zero transition delay
        container.style.transition = 'none';
        container.style.transform = `translate3d(${slideInStartX}, 0, 0)`;

        // Force synchronous layout reflow
        void container.offsetWidth;

        // Slide into resting position
        container.style.transition = 'transform 130ms cubic-bezier(0.16, 1, 0.3, 1)';
        container.style.transform = 'translate3d(0, 0, 0)';

        cleanupTimeout = window.setTimeout(() => {
          resetStyles(container);
          isAnimating = false;
          options.onSwipeStateChange?.(false);
          cleanupTimeout = undefined;
        }, 130);
      }, 150);
    } else {
      // Light snap-back to origin if gesture was cancelled (< 36px)
      if (container && !isEink) {
        isAnimating = true;
        container.style.transition = 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)';
        container.style.transform = 'translate3d(0, 0, 0)';

        cleanupTimeout = window.setTimeout(() => {
          resetStyles(container);
          isAnimating = false;
          options.onSwipeStateChange?.(false);
          cleanupTimeout = undefined;
        }, 180);
      } else {
        if (container) resetStyles(container);
        options.onSwipeStateChange?.(false);
      }
    }
  };

  const handleTouchCancel = () => {
    cancel();
  };

  const wasSwipeGesture = () => {
    const prev = wasSwipe;
    wasSwipe = false;
    return prev;
  };

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
    wasSwipeGesture,
    isDragging: () => isDragging,
    cancel,
  };
}
