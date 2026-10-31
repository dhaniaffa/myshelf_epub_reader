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
