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

// Mock ResizeObserver if not implemented in JSDOM
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Mock HTMLImageElement image loading in JSDOM
if (typeof window !== 'undefined') {
  const imgValueMap = new WeakMap<HTMLImageElement, string>();
  Object.defineProperty(globalThis.Image.prototype, 'src', {
    get(this: HTMLImageElement) {
      return imgValueMap.get(this) || this.getAttribute('src') || '';
    },
    set(this: HTMLImageElement, val: string) {
      imgValueMap.set(this, val);
      this.setAttribute('src', val);
      setTimeout(() => {
        Object.defineProperty(this, 'width', { value: 300, configurable: true });
        Object.defineProperty(this, 'height', { value: 450, configurable: true });
        if (typeof this.onload === 'function') {
          this.onload(new Event('load') as never);
        }
      }, 0);
    },
    configurable: true,
  });
}
