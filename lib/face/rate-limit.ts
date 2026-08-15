import { createAdminClient } from '@/lib/supabase/server';
import { isMockMode } from '@/lib/mock-mode';

export const MAX_ATTEMPTS_PER_HOUR = 5;
export const MAX_FAILURES_BEFORE_BLOCK = 10;
export const RATE_LIMIT_WINDOW_MINUTES = 60;

export interface RateLimitResult {
  allowed: boolean;
  reason?: 'HOURLY_LIMIT' | 'FAILURE_BLOCK' | null;
  retryAfterSeconds?: number;
  attemptsInWindow: number;
  failuresInWindow: number;
}

interface MockEntry {
  timestamp: number;
  success: boolean;
}

/** Per-IP in-memory counters, used only in mock mode. */
const mockWindows = new Map<string, MockEntry[]>();

function prune(entries: MockEntry[]): MockEntry[] {
  const cutoff = Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60_000;
  return entries.filter((e) => e.timestamp > cutoff);
}

/**
 * Enforces the face-login rate limit policy:
 *  - max 5 attempts per hour per IP
 *  - block an IP after 10 failures in the window
 */
export async function checkFaceRateLimit(ipAddress: string): Promise<RateLimitResult> {
  if (isMockMode()) {
    const entries = prune(mockWindows.get(ipAddress) ?? []);
    const failures = entries.filter((e) => !e.success).length;
    const windowCount = entries.length;

    if (failures >= MAX_FAILURES_BEFORE_BLOCK) {
      return { allowed: false, reason: 'FAILURE_BLOCK', retryAfterSeconds: 0, attemptsInWindow: windowCount, failuresInWindow: failures };
    }
    if (windowCount >= MAX_ATTEMPTS_PER_HOUR) {
      return { allowed: false, reason: 'HOURLY_LIMIT', retryAfterSeconds: 0, attemptsInWindow: windowCount, failuresInWindow: failures };
    }
    return { allowed: true, attemptsInWindow: windowCount, failuresInWindow: failures };
  }

  try {
    const supabase = await createAdminClient();

    const [attemptsRes, failuresRes] = await Promise.all([
      supabase.rpc('face_attempts', { ip: ipAddress, minutes: RATE_LIMIT_WINDOW_MINUTES }),
      supabase.rpc('face_failed_attempts', { ip: ipAddress, minutes: RATE_LIMIT_WINDOW_MINUTES }),
    ]);

    const attemptsInWindow = Number(attemptsRes.data ?? 0);
    const failuresInWindow = Number(failuresRes.data ?? 0);

    if (attemptsRes.error || failuresRes.error) {
      console.error('[face-rate-limit] RPC failed:', attemptsRes.error?.message ?? failuresRes.error?.message);
      // Fail open to avoid a DoS vector via the rate-limit store itself.
      return { allowed: true, attemptsInWindow: 0, failuresInWindow: 0 };
    }

    if (failuresInWindow >= MAX_FAILURES_BEFORE_BLOCK) {
      return {
        allowed: false,
        reason: 'FAILURE_BLOCK',
        retryAfterSeconds: remainingSeconds(failuresInWindow),
        attemptsInWindow,
        failuresInWindow,
      };
    }
    if (attemptsInWindow >= MAX_ATTEMPTS_PER_HOUR) {
      return {
        allowed: false,
        reason: 'HOURLY_LIMIT',
        retryAfterSeconds: remainingSeconds(attemptsInWindow),
        attemptsInWindow,
        failuresInWindow,
      };
    }
    return { allowed: true, attemptsInWindow, failuresInWindow };
  } catch (err) {
    console.error('[face-rate-limit] check failed:', err);
    return { allowed: true, attemptsInWindow: 0, failuresInWindow: 0 };
  }
}

/** Registers an attempt outcome for mock-mode windows. No-op in DB mode. */
export function recordMockAttempt(ipAddress: string, success: boolean) {
  if (!isMockMode()) return;
  const entries = prune(mockWindows.get(ipAddress) ?? []);
  entries.push({ timestamp: Date.now(), success });
  mockWindows.set(ipAddress, entries);
}

/** Clears mock windows (used by tests). */
export function __resetMockRateLimits() {
  mockWindows.clear();
}

function remainingSeconds(count: number): number {
  // Conservative estimate: worst-case the window started `count` attempts ago.
  const maxSparse = RATE_LIMIT_WINDOW_MINUTES * 60;
  const estimate = Math.max(0, maxSparse - count * 600);
  return Math.round(estimate);
}

/** Extracts a client IP safely from X-Forwarded-For / x-real-ip headers. */
export function getClientIp(forwardedFor: string | null, realIp: string | null): string {
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0].trim();
    if (first) return first;
  }
  if (realIp) return realIp;
  return 'unknown';
}
