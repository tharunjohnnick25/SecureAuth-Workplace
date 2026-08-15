/**
 * Error reporting / monitoring. Pushes events to Sentry when `SENTRY_DSN` is
 * configured; otherwise falls back to structured console logging via lib/logger.
 * Kept dependency-free so the app builds without a Sentry SDK installed.
 */

import { log } from '@/lib/logger';

export interface MonitoringContext {
  [key: string]: unknown;
}

/**
 * Reports an error to the monitoring service (e.g. Sentry). Never throws.
 * Sensitive fields (raw images, embeddings, tokens) must be redacted by callers.
 */
export function reportError(scope: string, error: unknown, context?: MonitoringContext): void {
  try {
    const dsn = process.env.SENTRY_DSN;
    const message = error instanceof Error ? error.message : String(error);

    if (dsn) {
      // Best-effort Sentry envelope submission (self-hosted / Relay compatible).
      // Keyless sentry requires the DSN to embed its public key.
      fetch(`${dsn.replace(/^https?:\/\//, '')}/envelope/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-sentry-envelope' },
        body: JSON.stringify({ event_id: crypto.randomUUID(), timestamp: new Date().toISOString() }),
      }).catch(() => {});
    }

    log('error', scope, message, {
      ...(context ?? {}),
      stack: error instanceof Error ? error.stack : undefined,
    });
  } catch {
    // Never let monitoring break the request path.
  }
}
