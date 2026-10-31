import { isTauri } from '@tauri-apps/api/core';

/**
 * Platform Detection Utilities
 */

/**
 * Returns true if running inside the Android Native Tauri application
 * (detected via native AndroidBackupBridge or Tauri Android user agent).
 */
export function isAndroidNative(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.AndroidBackupBridge) return true;
  return isTauri() && typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
}

/**
 * Returns true if running as a native desktop Tauri app (Linux, Windows, macOS).
 */
export function isDesktopTauri(): boolean {
  if (typeof window === 'undefined') return false;
  return isTauri() && typeof navigator !== 'undefined' && !/android/i.test(navigator.userAgent);
}

/**
 * Returns true if running inside a standard Web Browser (PWA or Desktop/Mobile browser).
 */
export function isWebBrowser(): boolean {
  return !isAndroidNative() && !isDesktopTauri();
}
