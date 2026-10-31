import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { initDesktopScrollFix } from './desktopScrollFix';

describe('Desktop Scroll Fix (src/lib/desktopScrollFix.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes without throwing', () => {
    expect(() => initDesktopScrollFix()).not.toThrow();
  });

  it('falls back to window.scrollBy when native scroll does not happen', async () => {
    // Mock scrollHeight > innerHeight
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      value: 2000,
      configurable: true,
    });
    Object.defineProperty(window, 'innerHeight', {
      value: 800,
      configurable: true,
    });
    Object.defineProperty(window, 'scrollY', {
      value: 0,
      writable: true,
      configurable: true,
    });

    const scrollBySpy = vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
    initDesktopScrollFix();

    // Dispatch wheel event
    const wheelEvent = new WheelEvent('wheel', {
      deltaY: 100,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(wheelEvent);

    // Wait for requestAnimationFrame
    await new Promise((r) => requestAnimationFrame(r));

    expect(scrollBySpy).toHaveBeenCalledWith({
      top: 100,
      left: 0,
      behavior: 'auto',
    });
  });

  it('does not scroll when window already scrolled natively', async () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      value: 2000,
      configurable: true,
    });
    Object.defineProperty(window, 'innerHeight', {
      value: 800,
      configurable: true,
    });
    Object.defineProperty(window, 'scrollY', {
      value: 0,
      writable: true,
      configurable: true,
    });

    const scrollBySpy = vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
    initDesktopScrollFix();

    const wheelEvent = new WheelEvent('wheel', {
      deltaY: 100,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(wheelEvent);

    // Simulate native scroll changing scrollY before rAF
    window.scrollY = 100;

    await new Promise((r) => requestAnimationFrame(r));

    // scrollBy should NOT be called because native scroll succeeded
    expect(scrollBySpy).not.toHaveBeenCalled();
  });
});
