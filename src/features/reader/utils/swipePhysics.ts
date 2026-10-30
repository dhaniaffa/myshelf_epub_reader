/**
 * Physics-based native swipe controller for e-book page turns.
 * Provides 60/120 FPS hardware-accelerated continuous drag tracking,
 * flick/velocity detection, spring snap-back, smooth slide page transitions,
 * and subtle tactile haptic feedback.
 */

export interface NativeSwipeOptions {
  getContainer: () => HTMLElement | null;
  onNext: () => void;
  onPrev: () => void;
  canSwipe: () => boolean;
  isEink?: () => boolean;
  onSwipeStateChange?: (isSwiping: boolean) => void;
}

export interface NativeSwipeHandler {
  handleTouchStart: (e: TouchEvent | React.TouchEvent) => void;
  handleTouchMove: (e: TouchEvent | React.TouchEvent) => void;
  handleTouchEnd: (e: TouchEvent | React.TouchEvent) => void;
  handleTouchCancel: (e: TouchEvent | React.TouchEvent) => void;
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

  const resetStyles = (container: HTMLElement) => {
    container.style.transition = '';
    container.style.transform = '';
    container.style.opacity = '';
    container.style.willChange = '';
  };

  const cancel = () => {
    if (cleanupTimeout) {
      window.clearTimeout(cleanupTimeout);
      cleanupTimeout = undefined;
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

    // Disambiguate horizontal swipe from vertical scroll/selection in first 10px
    if (!directionLocked) {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (absY > 8 && absY > absX) {
        // Vertical gesture intent: abort swipe tracking
        directionLocked = true;
        isDragging = false;
        const container = options.getContainer();
        if (container) resetStyles(container);
        return;
      }

      if (absX > 8 && absX > absY * 1.15) {
        // Horizontal swipe intent confirmed
        directionLocked = true;
        isDragging = true;
        wasSwipe = true;
        options.onSwipeStateChange?.(true);
      }
    }

    if (!isDragging) return;

    // Prevent default browser swipe-back navigation when dragging
    if (e.cancelable && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }

    // Measure velocity
    const now = Date.now();
    const dt = now - lastTime;
    if (dt > 0) {
      velocity = (touch.clientX - lastX) / dt;
    }
    lastX = touch.clientX;
    lastTime = now;

    // Apply continuous interactive transform with elastic resistance on overdrag
    const container = options.getContainer();
    if (container) {
      const screenWidth = window.innerWidth || 360;
      const maxFree = screenWidth * 0.45;
      let tx = deltaX;

      if (Math.abs(deltaX) > maxFree) {
        const extra = Math.abs(deltaX) - maxFree;
        const sign = deltaX > 0 ? 1 : -1;
        tx = sign * (maxFree + extra * 0.35);
      }

      const opacity = Math.max(0.65, 1 - (Math.abs(tx) / screenWidth) * 0.35);
      container.style.transform = `translate3d(${tx}px, 0, 0)`;
      container.style.opacity = `${opacity}`;
    }
  };

  const handleTouchEnd = (e: TouchEvent | React.TouchEvent) => {
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

    // Turn threshold: flick velocity >= 0.35 px/ms OR dragged >= 20% of screen width
    const isFlick = Math.abs(velocity) >= 0.35 && absX >= 25;
    const isFarEnough = absX >= Math.min(120, screenWidth * 0.2);
    const shouldTurn =
      (isFlick || isFarEnough) && (deltaX * (velocity || deltaX) >= 0 || absX > 60);

    const container = options.getContainer();
    const isEink = options.isEink?.() ?? false;

    if (shouldTurn) {
      triggerHaptic(12);
      const isNext = deltaX < 0;

      // E-Ink optimization: instantaneous turn without slide animations (prevents e-ink ghosting)
      if (isEink || !container) {
        if (container) resetStyles(container);
        if (isNext) options.onNext();
        else options.onPrev();
        options.onSwipeStateChange?.(false);
        return;
      }

      // Modern smooth slide-out and slide-in physics
      isAnimating = true;
      const slideOutX = isNext ? '-100%' : '100%';
      const slideInStartX = isNext ? '40px' : '-40px';

      container.style.transition =
        'transform 200ms cubic-bezier(0.2, 0.8, 0.25, 1), opacity 200ms ease-out';
      container.style.transform = `translate3d(${slideOutX}, 0, 0)`;
      container.style.opacity = '0.4';

      cleanupTimeout = window.setTimeout(() => {
        if (isNext) {
          options.onNext();
        } else {
          options.onPrev();
        }

        // Position on opposite entrance side without transition
        container.style.transition = 'none';
        container.style.transform = `translate3d(${slideInStartX}, 0, 0)`;
        container.style.opacity = '0.6';

        // Force synchronous DOM reflow
        void container.offsetWidth;

        // Slide into final resting place smoothly
        container.style.transition =
          'transform 180ms cubic-bezier(0.25, 1, 0.5, 1), opacity 180ms ease-out';
        container.style.transform = 'translate3d(0, 0, 0)';
        container.style.opacity = '1';

        cleanupTimeout = window.setTimeout(() => {
          resetStyles(container);
          isAnimating = false;
          options.onSwipeStateChange?.(false);
          cleanupTimeout = undefined;
        }, 180);
      }, 200);
    } else {
      // Snap back to original position with spring easing
      if (container && !isEink) {
        isAnimating = true;
        container.style.transition =
          'transform 220ms cubic-bezier(0.2, 0.9, 0.3, 1), opacity 220ms ease-out';
        container.style.transform = 'translate3d(0, 0, 0)';
        container.style.opacity = '1';

        cleanupTimeout = window.setTimeout(() => {
          resetStyles(container);
          isAnimating = false;
          options.onSwipeStateChange?.(false);
          cleanupTimeout = undefined;
        }, 220);
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
