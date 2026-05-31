'use client';

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

export function createCapacitorAwareFetch(): typeof fetch {
  return function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    if (typeof window === 'undefined' || !isRunningInCapacitor()) {
      return fetch(input, init);
    }
    const base = DEPLOYED_API_URL;
    if (typeof input === 'string') {
      if (input.startsWith('/')) {
        return fetch(`${base}${input}`, { ...init, credentials: 'include' });
      }
      const url = new URL(input);
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        return fetch(`${base}${url.pathname}${url.search}`, { ...init, credentials: 'include' });
      }
    }
    if (input instanceof Request) {
      const url = new URL(input.url);
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        const modified = new Request(`${base}${url.pathname}${url.search}`, input);
        return fetch(modified, { ...init, credentials: 'include' });
      }
    }
    return fetch(input, init);
  };
}

export function setupCapacitorBridge() {
  if (typeof window === 'undefined') return;

  if (isRunningInCapacitor()) {
    const originalFetch = window.fetch;
    window.fetch = function (input, init) {
      if (typeof input === 'string') {
        if (input.startsWith('/')) {
          return originalFetch(`${DEPLOYED_API_URL}${input}`, { ...init, credentials: 'include' });
        }
        const url = new URL(input);
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
          return originalFetch(`${DEPLOYED_API_URL}${url.pathname}${url.search}`, { ...init, credentials: 'include' });
        }
      }
      if (input instanceof Request) {
        const url = new URL(input.url);
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
          const modified = new Request(`${DEPLOYED_API_URL}${url.pathname}${url.search}`, input);
          return originalFetch(modified, init);
        }
      }
      return originalFetch(input, init);
    };
  }
}
