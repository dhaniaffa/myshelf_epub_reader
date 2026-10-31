import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { isAndroidNative, isDesktopTauri, isWebBrowser } from './platform';

describe('Platform Detection Utilities (src/lib/platform.ts)', () => {
  const originalAndroidBridge = (window as unknown as Record<string, unknown>).AndroidBackupBridge;
  const originalUserAgent = navigator.userAgent;

  beforeEach(() => {
    delete (window as unknown as Record<string, unknown>).AndroidBackupBridge;
  });

  afterEach(() => {
    if (originalAndroidBridge !== undefined) {
      (window as unknown as Record<string, unknown>).AndroidBackupBridge = originalAndroidBridge;
    } else {
      delete (window as unknown as Record<string, unknown>).AndroidBackupBridge;
    }
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true,
    });
  });

  it('detects Android Native when AndroidBackupBridge is present on window', () => {
    (window as unknown as Record<string, unknown>).AndroidBackupBridge = {
      saveFile: () => true,
    };

    expect(isAndroidNative()).toBe(true);
    expect(isWebBrowser()).toBe(false);
  });

  it('detects Web Browser when not running in Tauri and bridge is absent', () => {
    delete (window as unknown as Record<string, unknown>).AndroidBackupBridge;
    delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;

    expect(isAndroidNative()).toBe(false);
    expect(isDesktopTauri()).toBe(false);
    expect(isWebBrowser()).toBe(true);
  });
});
