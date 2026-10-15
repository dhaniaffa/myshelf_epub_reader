import { isTauri } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { relaunch } from '@tauri-apps/plugin-process';
import { check, type Update } from '@tauri-apps/plugin-updater';

import { APP_CONFIG } from '@/config';

export interface AppUpdateInfo {
  version: string;
  currentVersion: string;
  releaseName: string;
  releaseNotes: string;
  publishedAt?: string;
  downloadUrl?: string;
  isDesktopTauriUpdate?: boolean;
}

let activeTauriUpdate: Update | null = null;

/**
 * Checks if the current platform is Android
 */
export function isAndroidPlatform(): boolean {
  return /android/i.test(navigator.userAgent);
}

/**
 * Checks if running inside the native Tauri environment
 */
export function isNativeApp(): boolean {
  return isTauri();
}

/**
 * Compares two semver version strings (e.g., '1.0.1' > '1.0.0' or 'v1.1.0' > '1.0.0')
 */
export function isNewerVersion(remoteVersion: string, currentVersion: string): boolean {
  const cleanRemote = remoteVersion.replace(/^v/i, '').trim();
  const cleanCurrent = currentVersion.replace(/^v/i, '').trim();

  const remoteParts = cleanRemote.split('.').map((p) => parseInt(p, 10) || 0);
  const currentParts = cleanCurrent.split('.').map((p) => parseInt(p, 10) || 0);

  const len = Math.max(remoteParts.length, currentParts.length);
  for (let i = 0; i < len; i++) {
    const r = remoteParts[i] || 0;
    const c = currentParts[i] || 0;
    if (r > c) return true;
    if (r < c) return false;
  }
  return false;
}

/**
 * Checks for updates across Desktop, Android, and Web
 */
export async function checkForAppUpdate(): Promise<AppUpdateInfo | null> {
  const currentVersion = APP_CONFIG.version;

  // 1. Desktop: Try native Tauri Updater plugin first
  if (isNativeApp() && !isAndroidPlatform()) {
    try {
      const update = await check();
      if (update && update.available) {
        activeTauriUpdate = update;
        return {
          version: update.version,
          currentVersion: update.currentVersion || currentVersion,
          releaseName: `MyShelf v${update.version}`,
          releaseNotes: update.body || 'Pembaruan versi terbaru dengan perbaikan dan peningkatan.',
          publishedAt: update.date,
          isDesktopTauriUpdate: true,
        };
      }
    } catch (desktopErr) {
      console.warn('Tauri native updater check skipped or failed, falling back to GitHub API:', desktopErr);
    }
  }

  // 2. Android & Fallback (GitHub Releases API)
  try {
    const response = await fetch(APP_CONFIG.repository.releasesApi, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`GitHub API returned status ${response.status}`);
    }

    const release = await response.json();
    const remoteVersion = String(release.tag_name || release.name || '').trim();

    if (remoteVersion && isNewerVersion(remoteVersion, currentVersion)) {
      // Look for an APK asset if on Android
      let apkDownloadUrl: string | undefined;
      if (Array.isArray(release.assets)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const apkAsset = release.assets.find((a: any) =>
          typeof a.name === 'string' && a.name.toLowerCase().endsWith('.apk')
        );
        if (apkAsset && apkAsset.browser_download_url) {
          apkDownloadUrl = apkAsset.browser_download_url;
        }
      }

      return {
        version: remoteVersion.replace(/^v/i, ''),
        currentVersion,
        releaseName: release.name || `MyShelf ${remoteVersion}`,
        releaseNotes: release.body || 'Pembaruan aplikasi versi terbaru.',
        publishedAt: release.published_at,
        downloadUrl: apkDownloadUrl || release.html_url || APP_CONFIG.repository.url,
        isDesktopTauriUpdate: false,
      };
    }
  } catch (err) {
    console.error('Failed to check for updates from GitHub Releases:', err);
  }

  return null;
}

/**
 * Downloads and installs the update.
 * - On Desktop: downloads, installs, and relaunches the application.
 * - On Android / Web: launches the APK installer / release package via opener.
 */
export async function installAppUpdate(
  updateInfo: AppUpdateInfo,
  onProgress?: (percent: number) => void
): Promise<void> {
  // A. Native Desktop Updater via Tauri
  if (updateInfo.isDesktopTauriUpdate && activeTauriUpdate) {
    let downloaded = 0;
    let contentLength = 0;

    await activeTauriUpdate.downloadAndInstall((event) => {
      if (event.event === 'Started') {
        contentLength = event.data.contentLength || 0;
        onProgress?.(0);
      } else if (event.event === 'Progress') {
        downloaded += event.data.chunkLength;
        if (contentLength > 0) {
          const percent = Math.min(100, Math.round((downloaded / contentLength) * 100));
          onProgress?.(percent);
        }
      } else if (event.event === 'Finished') {
        onProgress?.(100);
      }
    });

    // Relaunch the desktop app to apply the new binary
    await relaunch();
    return;
  }

  // B. Android & Browser / Direct Download
  const targetUrl = updateInfo.downloadUrl || `${APP_CONFIG.repository.url}/releases/latest`;
  if (isNativeApp()) {
    try {
      await openUrl(targetUrl);
      return;
    } catch (openerErr) {
      console.warn('Failed to open URL using Tauri opener, opening via window.open:', openerErr);
    }
  }

  window.open(targetUrl, '_blank', 'noopener,noreferrer');
}
