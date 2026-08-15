import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { randomInt } from 'crypto';

interface OtpEntry {
  code: string;
  phone: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
}

const TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 30 * 1000;

const DATA_DIR = join(process.cwd(), '.data');
const DATA_FILE = join(DATA_DIR, 'otp-store.json');

function loadStore(): Record<string, OtpEntry> {
  try {
    if (existsSync(DATA_FILE)) {
      return JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch {
    // Corrupted store — start fresh.
  }
  return {};
}

const store: Record<string, OtpEntry> = loadStore();

function persist() {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch {
    // Never crash the request because persistence failed.
  }
}

function maskPhone(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 4) return phone;
  const tail = digits.slice(-4);
  const head = digits.slice(0, 2);
  return `+${head}******${tail}`;
}

function normalizePhone(phone: string): string {
  const cleaned = String(phone || '').trim();
  if (!cleaned) return '';
  if (/^\+[1-9]\d{7,14}$/.test(cleaned)) return cleaned;
  const digits = cleaned.replace(/\D/g, '');
  if (!digits) return '';
  return `+${digits}`;
}

export const OtpService = {
  generate(token: string, phone: string): OtpEntry {
    const code = String(randomInt(0, 1000000)).padStart(6, '0');
    const now = Date.now();
    const entry: OtpEntry = {
      code,
      phone: normalizePhone(phone),
      expiresAt: now + TTL_MS,
      attempts: 0,
      lastSentAt: now,
    };
    store[token] = entry;
    persist();
    return entry;
  },

  get(token: string): OtpEntry | undefined {
    const entry = store[token];
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      delete store[token];
      persist();
      return undefined;
    }
    return entry;
  },

  canResend(token: string): boolean {
    const entry = store[token];
    if (!entry) return true;
    return Date.now() - entry.lastSentAt >= RESEND_COOLDOWN_MS;
  },

  resendDelayMs(token: string): number {
    const entry = store[token];
    if (!entry) return 0;
    const remaining = entry.lastSentAt + RESEND_COOLDOWN_MS - Date.now();
    return remaining > 0 ? remaining : 0;
  },

  verify(token: string, code: string): { ok: boolean; error?: string } {
    const entry = store[token];
    if (!entry) {
      return { ok: false, error: 'No OTP was requested for this session' };
    }
    if (Date.now() > entry.expiresAt) {
      delete store[token];
      persist();
      return { ok: false, error: 'OTP has expired. Please request a new code.' };
    }
    if (entry.attempts >= MAX_ATTEMPTS) {
      delete store[token];
      persist();
      return { ok: false, error: 'Too many failed attempts. Please request a new code.' };
    }
    if (String(code).replace(/\D/g, '') !== entry.code) {
      entry.attempts += 1;
      persist();
      return { ok: false, error: 'Invalid OTP code' };
    }
    delete store[token];
    persist();
    return { ok: true };
  },

  getPhone(token: string): string | undefined {
    return store[token]?.phone;
  },

  maskPhone,
  normalizePhone,
};
