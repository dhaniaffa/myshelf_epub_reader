/**
 * Safe LocalStorage abstraction with in-memory fallback.
 * Prevents QuotaExceededError or SecurityError/DOMException crashes
 * in Incognito/Private mode or environments where Storage is disabled.
 */
class SafeStorage {
  private memoryFallback = new Map<string, string>();

  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch {
      // Fallback to memory
    }
    return this.memoryFallback.get(key) ?? null;
  }

  setItem(key: string, value: string): boolean {
    this.memoryFallback.set(key, value);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return true;
      }
    } catch (err) {
      console.warn(
        `SafeStorage: failed to set "${key}" in localStorage, using memory fallback:`,
        err
      );
    }
    return false;
  }

  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // ignore
    }
    this.memoryFallback.delete(key);
  }

  clear(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch {
      // ignore
    }
    this.memoryFallback.clear();
  }
}

export const safeStorage = new SafeStorage();
