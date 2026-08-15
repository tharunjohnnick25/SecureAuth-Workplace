/**
 * lib/risk.ts — Adaptive MFA (Risk-Based Authentication) engine.
 *
 * Implements the 2026 enterprise "smart friction" standard:
 *   1. Signal Collection   — device posture, geo/IP, time of day, behavior, network.
 *   2. Risk Scoring        — additive 0–100 score from weighted signals.
 *   3. Policy Decision     — map score to a required MFA factor.
 *   4. Authentication      — the caller performs the ceremony the policy demands.
 */

export type RiskLevel = 'low' | 'medium' | 'high';
export type MfaRequirement = 'none' | 'totp' | 'hardware_key' | 'block';

// ── Stage 1: raw signals ───────────────────────────────────────────────────

export interface DeviceSignal {
  /** MDM-enrolled / corporate-managed endpoint. */
  isManaged?: boolean;
  /** Jailbroken / rooted OS. */
  isJailbroken?: boolean;
  os?: string;
  osVersion?: string;
  fingerprintHash?: string;
}

export interface LocationSignal {
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
}

export interface NetworkSignal {
  ip?: string;
  isTor?: boolean;
  isProxy?: boolean;
  isVpn?: boolean;
  isCorporate?: boolean;
  isManaged?: boolean;
  isJailbroken?: boolean;
}

export interface BehaviorSignal {
  avgDwellTime?: number;
  avgFlightTime?: number;
  accuracy?: number;
  sampleCount?: number;
}

export interface AccountHistory {
  lastLoginAt?: string | null;
  lastIp?: string;
  lastCity?: string;
  lastCountry?: string;
  /** How long the account has existed, in days. */
  createdDaysAgo?: number;
  /** Days since the last successful login. `null` = never logged in. */
  daysSinceLastLogin?: number | null;
  /** Fingerprint hashes of devices this account has authenticated from. */
  trustedFingerprints?: string[];
}

/** Everything the risk engine consumes to make its decision. */
export interface RiskSignals {
  device?: DeviceSignal;
  location?: LocationSignal;
  network?: NetworkSignal;
  behavior?: BehaviorSignal;
  account?: AccountHistory;
  /** Server-side evaluation time. Defaults to `new Date()`. */
  time?: Date;
  // Derived booleans (populated by `collectSignals`).
  isNewDevice?: boolean;
  isUnusualLocation?: boolean;
  isOutsideWorkHours?: boolean;
  isTorOrProxy?: boolean;
  isDormantAccount?: boolean;
}

export interface RiskAssessment {
  score: number;
  level: RiskLevel;
  mfaRequirement: MfaRequirement;
  reasons: string[];
}

// ── Policy constants ────────────────────────────────────────────────────────

export const WORK_HOURS = { start: 7, end: 20 } as const;
export const DORMANT_THRESHOLD_DAYS = 30;

const POLICY_TABLE: Array<{ min: number; level: RiskLevel; mfaRequirement: MfaRequirement }> = [
  { min: 80, level: 'high', mfaRequirement: 'block' },
  { min: 61, level: 'high', mfaRequirement: 'hardware_key' },
  { min: 31, level: 'medium', mfaRequirement: 'totp' },
  { min: 0, level: 'low', mfaRequirement: 'none' },
];

// ── Stage 1 → 2: signal collection ─────────────────────────────────────────

export interface RawRiskInput {
  ip?: string;
  fingerprint?: Partial<DeviceSignal> & { hash?: string };
  typingMetrics?: { key: string; dwellTime: number; flightTime: number }[];
  location?: { latitude?: number; longitude?: number; city?: string; country?: string };
  network?: NetworkSignal;
  history?: AccountHistory;
  now?: Date;
}

export function collectSignals(raw: RawRiskInput): RiskSignals {
  const now = raw.now ?? new Date();
  const history = raw.history;

  const trusted = history?.trustedFingerprints ?? [];
  const fingerprintHash = raw.fingerprint?.hash;

  const isNewDevice = Boolean(fingerprintHash && !trusted.includes(fingerprintHash));

  // Unknown location (no GPS) is not penalized — only a *change* from a known base.
  let isUnusualLocation = false;
  if (raw.location?.city || raw.location?.country) {
    if (history?.lastCity !== undefined || history?.lastCountry !== undefined) {
      const sameCity = !raw.location.city || !history?.lastCity || raw.location.city === history.lastCity;
      const sameCountry = !raw.location.country || !history?.lastCountry || raw.location.country === history.lastCountry;
      isUnusualLocation = !(sameCity && sameCountry);
    }
  }

  const hour = now.getHours();
  const isOutsideWorkHours = hour < WORK_HOURS.start || hour >= WORK_HOURS.end;

  const isTorOrProxy =
    Boolean(raw.network?.isTor || raw.network?.isProxy) || isKnownTorIp(raw.ip);

  let isDormantAccount = false;
  let daysSinceLastLogin = history?.daysSinceLastLogin;
  if (daysSinceLastLogin === undefined) {
    if (history?.lastLoginAt) {
      daysSinceLastLogin = Math.floor((now.getTime() - new Date(history.lastLoginAt).getTime()) / (1000 * 60 * 60 * 24));
    } else if (history?.createdDaysAgo !== undefined) {
      daysSinceLastLogin = history.createdDaysAgo;
    }
  }
  if (daysSinceLastLogin !== undefined) {
    isDormantAccount = daysSinceLastLogin >= DORMANT_THRESHOLD_DAYS;
  }

  const patterns = raw.typingMetrics ?? [];
  const behavior: BehaviorSignal = {};
  if (patterns.length > 0) {
    behavior.sampleCount = patterns.length;
    behavior.avgDwellTime = patterns.reduce((sum, p) => sum + p.dwellTime, 0) / patterns.length;
    behavior.avgFlightTime = patterns.reduce((sum, p) => sum + (p.flightTime || 0), 0) / patterns.length;
  }

  return {
    device: {
      isManaged: raw.network?.isCorporate,
      isJailbroken: raw.network?.isJailbroken,
      os: raw.fingerprint?.os,
      fingerprintHash,
      ...raw.fingerprint,
    },
    location: raw.location ? { city: raw.location.city, country: raw.location.country, lat: raw.location.latitude, lng: raw.location.longitude } : undefined,
    network: raw.network,
    behavior: Object.keys(behavior).length > 0 ? behavior : undefined,
    account: history,
    time: now,
    isNewDevice,
    isUnusualLocation,
    isOutsideWorkHours,
    isTorOrProxy,
    isDormantAccount,
  };
}

// ── Stage 2: risk scoring ───────────────────────────────────────────────────

const WEIGHTS: Array<{ key: keyof RiskSignals; points: number; label: string }> = [
  { key: 'isNewDevice', points: 30, label: 'Unrecognized device' },
  { key: 'isUnusualLocation', points: 25, label: 'Unusual location' },
  { key: 'isOutsideWorkHours', points: 15, label: 'Login outside work hours' },
  { key: 'isTorOrProxy', points: 40, label: 'Tor or proxy network detected' },
  { key: 'isDormantAccount', points: 20, label: 'Dormant account' },
];

export function calculateRiskScore(signals: RiskSignals): number {
  let score = 0;
  for (const weight of WEIGHTS) {
    if (signals[weight.key]) score += weight.points;
  }
  return Math.min(score, 100);
}

export function getRiskReasons(signals: RiskSignals): string[] {
  return WEIGHTS.filter((w) => signals[w.key]).map((w) => w.label);
}

// ── Stage 3: policy decision ────────────────────────────────────────────────

export function getRiskLevel(score: number): RiskLevel {
  for (const tier of POLICY_TABLE) {
    if (score >= tier.min) return tier.level;
  }
  return 'low';
}

export function getMfaRequirement(score: number): MfaRequirement {
  for (const tier of POLICY_TABLE) {
    if (score >= tier.min) return tier.mfaRequirement;
  }
  return 'none';
}

export function evaluateRisk(signals: RiskSignals): RiskAssessment {
  const score = calculateRiskScore(signals);
  return {
    score,
    level: getRiskLevel(score),
    mfaRequirement: getMfaRequirement(score),
    reasons: getRiskReasons(signals),
  };
}

/** Convenience: raw signals in, full assessment out. */
export function assessRawRisk(raw: RawRiskInput): RiskAssessment {
  return evaluateRisk(collectSignals(raw));
}

/**
 * Kept for backward compatibility with consumers that gate biometric checks
 * on risk level. Medium and high risk require an MFA ceremony.
 */
export function shouldTriggerBiometrics(level: RiskLevel): boolean {
  return level === 'medium' || level === 'high';
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const KNOWN_TOR_IPS = new Set<string>([
  // Demo Tor exit nodes (sample addresses used for local testing).
  '185.220.101.34',
  '185.220.101.35',
  '45.61.49.12',
  '89.234.157.254',
]);

function isKnownTorIp(ip?: string): boolean {
  if (!ip) return false;
  const normalized = ip.split(',')[0].trim();
  return KNOWN_TOR_IPS.has(normalized);
}
