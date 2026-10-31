import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { safeStorage } from './storage';

describe('SafeStorage (src/lib/storage.ts)', () => {
  beforeEach(() => {
    safeStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads and writes to window.localStorage in normal environment', () => {
    safeStorage.setItem('test_key', 'test_value');
    expect(safeStorage.getItem('test_key')).toBe('test_value');
    expect(localStorage.getItem('test_key')).toBe('test_value');
  });

  it('removes keys cleanly from both localStorage and memory fallback', () => {
    safeStorage.setItem('key_to_remove', 'hello');
    expect(safeStorage.getItem('key_to_remove')).toBe('hello');

    safeStorage.removeItem('key_to_remove');
    expect(safeStorage.getItem('key_to_remove')).toBeNull();
    expect(localStorage.getItem('key_to_remove')).toBeNull();
  });

  it('returns null for non-existent keys', () => {
    expect(safeStorage.getItem('random_nonexistent')).toBeNull();
  });

  it('falls back to memory store if localStorage.setItem throws (e.g. QuotaExceededError or Incognito)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });

    const result = safeStorage.setItem('quota_key', 'fallback_data');
    expect(result).toBe(false);

    // Reading should still work via memory fallback
    expect(safeStorage.getItem('quota_key')).toBe('fallback_data');
  });

  it('falls back to memory store if localStorage.getItem throws (e.g. SecurityError)', () => {
    safeStorage.setItem('security_key', 'secret_val');

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Access denied', 'SecurityError');
    });

    // Should return from memory fallback without throwing error
    expect(safeStorage.getItem('security_key')).toBe('secret_val');
  });
});
