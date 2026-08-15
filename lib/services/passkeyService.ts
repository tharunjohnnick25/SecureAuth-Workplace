import { randomBytes } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface StoredPasskey {
  user_key: string;
  credential_id: string;
  public_key_hex: string;
  device_type: string;
  counter: number;
  transports?: string[];
  created_at: string;
  last_used_at?: string;
}

interface ChallengeEntry {
  user_key: string;
  type: 'registration' | 'login';
  challenge: string;
  expires_at: number;
}

interface PasskeyStore {
  challenges: ChallengeEntry[];
  passkeys: StoredPasskey[];
}

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const DATA_DIR = join(process.cwd(), '.data');
const DATA_FILE = join(DATA_DIR, 'mock-passkeys.json');

function loadStore(): PasskeyStore {
  try {
    if (existsSync(DATA_FILE)) {
      const parsed = JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
      if (parsed && typeof parsed === 'object') {
        return {
          challenges: Array.isArray(parsed.challenges) ? parsed.challenges : [],
          passkeys: Array.isArray(parsed.passkeys) ? parsed.passkeys : [],
        };
      }
    }
  } catch {
    // Corrupted or unreadable file — start fresh.
  }
  return { challenges: [], passkeys: [] };
}

const store: PasskeyStore = loadStore();

function persist() {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch {
    // Never crash the request because persistence failed.
  }
}

export function generateChallenge(): string {
  return randomBytes(32).toString('base64url');
}

export const PasskeyService = {
  saveChallenge(userKey: string, type: 'registration' | 'login', challenge: string) {
    store.challenges = store.challenges.filter(
      (c) => !(c.user_key === userKey && c.type === type)
    );
    store.challenges.push({
      user_key: userKey,
      type,
      challenge,
      expires_at: Date.now() + CHALLENGE_TTL_MS,
    });
    persist();
  },
  consumeChallenge(userKey: string, type: 'registration' | 'login'): string | undefined {
    const idx = store.challenges.findIndex(
      (c) => c.user_key === userKey && c.type === type
    );
    if (idx === -1) return undefined;
    const entry = store.challenges[idx];
    store.challenges.splice(idx, 1);
    persist();
    if (Date.now() > entry.expires_at) return undefined;
    return entry.challenge;
  },
  addPasskey(passkey: StoredPasskey) {
    store.passkeys = store.passkeys.filter((pk) => pk.credential_id !== passkey.credential_id);
    store.passkeys.push(passkey);
    persist();
  },
  listPasskeys(userKey: string): StoredPasskey[] {
    return store.passkeys.filter((pk) => pk.user_key === userKey);
  },
  getPasskey(credentialId: string): StoredPasskey | undefined {
    return store.passkeys.find((pk) => pk.credential_id === credentialId);
  },
  touchPasskey(userKey: string, credentialId: string, counter: number) {
    const pk = store.passkeys.find(
      (p) => p.credential_id === credentialId && p.user_key === userKey
    );
    if (pk) {
      pk.counter = counter;
      pk.last_used_at = new Date().toISOString();
      persist();
    }
  },
};
