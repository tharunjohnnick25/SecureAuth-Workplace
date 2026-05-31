'use client';

/**
 * Capacitor bridge — provides native API support and fetch interception
 * for the SecureAuth Android app.
 *
 * When running inside Capacitor WebView:
 *   - Injects native plugin APIs (Camera, Geolocation, Push, Filesystem)
 *   - Redirects /api/* fetch calls to the deployed server
 *   - Manages offline detection and session persistence via native storage
 */

const DEPLOYED_API_URL = process.env.NEXT_PUBLIC_DEPLOYED_URL || 'https://secureauth-ai.vercel.app';

let isCapacitor: boolean | null = null;

export function isRunningInCapacitor(): boolean {
  if (isCapacitor !== null) return isCapacitor;
  if (typeof window === 'undefined') return false;
  isCapacitor = !!(window as any).Capacitor?.isNativePlatform();
  return isCapacitor;
}

export function getApiBaseUrl(): string {
  if (isRunningInCapacitor()) {
    return DEPLOYED_API_URL;
  }
  return '';
}

export function capacitorFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const base = getApiBaseUrl();
  if (base && typeof input === 'string' && input.startsWith('/api/')) {
    return fetch(`${base}${input}`, init);
  }
  return fetch(input, init);
}

export async function checkNetworkStatus(): Promise<boolean> {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

export function setupCapacitorBridge() {
  if (typeof window === 'undefined') return;

  // Intercept fetch calls for /api/* routes when in Capacitor
  if (isRunningInCapacitor()) {
    const originalFetch = window.fetch;
    window.fetch = function (input, init) {
      if (typeof input === 'string' && input.startsWith('/api/')) {
        return originalFetch(`${DEPLOYED_API_URL}${input}`, init);
      }
      if (input instanceof Request && input.url.startsWith('/api/')) {
        const url = new URL(input.url, DEPLOYED_API_URL);
        const modified = new Request(url, input);
        return originalFetch(modified, init);
      }
      return originalFetch(input, init);
    };
  }
}
