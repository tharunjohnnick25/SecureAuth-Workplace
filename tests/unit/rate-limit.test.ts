import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/lib/mock-mode', () => ({ isMockMode: () => true }));

import {
  checkFaceRateLimit,
  recordMockAttempt,
  __resetMockRateLimits,
  getClientIp,
} from '@/lib/face/rate-limit';

describe('rate limiting (mock mode, in-memory windows)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-11T12:00:00Z'));
    __resetMockRateLimits();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows attempts below the hourly cap', async () => {
    const r1 = await checkFaceRateLimit('10.0.0.1');
    expect(r1.allowed).toBe(true);
  });

  it('blocks the 6th attempt within an hour', async () => {
    for (let i = 0; i < 5; i++) {
      recordMockAttempt('10.0.0.2', i % 2 === 0);
    }
    const r = await checkFaceRateLimit('10.0.0.2');
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('HOURLY_LIMIT');
  });

  it('blocks an IP after 10 failures in the window', async () => {
    for (let i = 0; i < 10; i++) {
      recordMockAttempt('10.0.0.3', false);
    }
    const r = await checkFaceRateLimit('10.0.0.3');
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('FAILURE_BLOCK');
  });

  it('forgives attempts that fall outside the 60-minute window', async () => {
    for (let i = 0; i < 5; i++) {
      recordMockAttempt('10.0.0.4', true);
    }
    vi.advanceTimersByTime(60 * 60 * 1000 + 1000);
    const r = await checkFaceRateLimit('10.0.0.4');
    expect(r.allowed).toBe(true);
  });

  it('extracts the first X-Forwarded-For entry and falls back to x-real-ip', () => {
    expect(getClientIp('203.0.113.7, 10.0.0.1', '127.0.0.1')).toBe('203.0.113.7');
    expect(getClientIp(null, '127.0.0.1')).toBe('127.0.0.1');
    expect(getClientIp('', '')).toBe('unknown');
  });
});
