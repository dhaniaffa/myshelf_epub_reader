import { useEffect, useRef } from 'react';

export interface UseRubberBandScrollOptions {
  enabled?: boolean;
  maxStretch?: number;
}

/**
 * Hook to provide native-like iOS/Android 12+ elastic rubber-band overscroll
 * and pull-to-stretch effects on scrollable content containers.
 */
export function useRubberBandScroll<T extends HTMLElement = HTMLDivElement>(
  options: UseRubberBandScrollOptions = {}
) {
  const { enabled = true, maxStretch = 75 } = options;
  const containerRef = useRef<T | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !enabled) return;

    let startY = 0;
    let isTracking = false;
    let isStretching = false;
    let stretchDirection: 'top' | 'bottom' | null = null;
    let resetTimeout: number | undefined;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      if (resetTimeout) {
        window.clearTimeout(resetTimeout);
        resetTimeout = undefined;
      }
      startY = e.touches[0].clientY;
      isTracking = true;
      isStretching = false;
      stretchDirection = null;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isTracking || e.touches.length !== 1) return;
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startY;

      // Check scroll boundary
      const scrollTop =
        el.scrollTop > 0 ? el.scrollTop : window.scrollY || document.documentElement.scrollTop || 0;
      const scrollHeight = el.scrollHeight || document.documentElement.scrollHeight || 0;
      const clientHeight = el.clientHeight || window.innerHeight || 0;

      const atTop = scrollTop <= 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 2;

      if (atTop && deltaY > 0) {
        stretchDirection = 'top';
        isStretching = true;
      } else if (atBottom && deltaY < 0) {
        stretchDirection = 'bottom';
        isStretching = true;
      } else {
        if (isStretching) {
          isStretching = false;
          stretchDirection = null;
          el.style.transform = '';
        }
        return;
      }

      if (isStretching) {
        if (e.cancelable) {
          e.preventDefault();
        }

        // Logarithmic elastic damping resistance formula
        const absDelta = Math.abs(deltaY);
        const stretch = Math.min(maxStretch, Math.pow(absDelta, 0.72) * 1.9);
        const translateY = stretchDirection === 'top' ? stretch : -stretch;

        el.style.transition = 'none';
        el.style.transform = `translate3d(0, ${translateY}px, 0)`;
        el.style.willChange = 'transform';
      }
    };

    const onTouchEnd = () => {
      if (isStretching) {
        isStretching = false;
        isTracking = false;

        // Spring rebound transition with overshoot physics
        el.style.transition = 'transform 320ms cubic-bezier(0.175, 0.885, 0.32, 1.25)';
        el.style.transform = 'translate3d(0, 0, 0)';

        resetTimeout = window.setTimeout(() => {
          el.style.transition = '';
          el.style.transform = '';
          el.style.willChange = '';
          resetTimeout = undefined;
        }, 320);
      } else {
        isTracking = false;
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      if (resetTimeout) window.clearTimeout(resetTimeout);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [enabled, maxStretch]);

  return containerRef;
}
