import '@testing-library/jest-dom/vitest';

// Mock window.matchMedia if not implemented in JSDOM
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// Mock window.scrollTo if not implemented in JSDOM
if (typeof window !== 'undefined' && !window.scrollTo) {
  window.scrollTo = () => {};
}

// Mock HTMLImageElement image loading in JSDOM
if (typeof window !== 'undefined') {
  Object.defineProperty(globalThis.Image.prototype, 'src', {
    set(this: HTMLImageElement) {
      setTimeout(() => {
        Object.defineProperty(this, 'width', { value: 300, configurable: true });
        Object.defineProperty(this, 'height', { value: 450, configurable: true });
        if (typeof this.onload === 'function') {
          this.onload(new Event('load') as never);
        }
      }, 0);
    },
  });
}
