/**
 * Utility for cross-origin (CORS) fetching with tiered fallback strategy:
 * 1. Direct fetch attempt (if target server supports CORS).
 * 2. Local Vite dev proxy attempt (/api/proxy?url=...).
 * 3. Public CORS proxy attempt (corsproxy.io, codetabs, allorigins).
 */

const PUBLIC_CORS_PROXIES = [
  (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

/**
 * Performs fetch with automatic CORS handling
 */
export async function fetchWithCorsProxy(url: string, init?: RequestInit): Promise<Response> {
  // 1. Attempt direct fetch first
  try {
    const directResponse = await fetch(url, init);
    // If response is successful or 304, use it directly
    if (directResponse.ok) {
      return directResponse;
    }
    // If server responds with explicit 404 or 401, do not continue to proxy if not CORS
    if (directResponse.status === 404 || directResponse.status === 401) {
      return directResponse;
    }
  } catch (err) {
    // TypeError: Failed to fetch (typically CORS error in browser)
    console.warn(`Direct fetch gagal untuk ${url}, mencoba proxy...`, err);
  }

  // 2. Attempt via internal Vite dev proxy (/api/proxy?url=...)
  try {
    const localProxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
    const localResponse = await fetch(localProxyUrl, {
      ...init,
      headers: {
        ...init?.headers,
        Accept: (init?.headers as Record<string, string>)?.['Accept'] || '*/*',
      },
    });
    if (localResponse.ok) {
      return localResponse;
    }
  } catch (err) {
    console.warn(`Local proxy fetch gagal untuk ${url}:`, err);
  }

  // 3. Fallback to public CORS proxies
  let lastError: Error | null = null;
  for (const getProxyUrl of PUBLIC_CORS_PROXIES) {
    const proxyUrl = getProxyUrl(url);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const proxyResponse = await fetch(proxyUrl, {
        ...init,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (proxyResponse.ok) {
        return proxyResponse;
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`Public proxy (${proxyUrl}) gagal:`, err);
    }
  }

  throw lastError || new Error(`Gagal mengambil data dari URL (CORS / Network Error): ${url}`);
}
