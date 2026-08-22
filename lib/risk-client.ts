/**
 * lib/risk-client.ts — Client-side routing for the Adaptive MFA flow.
 * Shared by Employee/Admin/Manager login forms so the risk decision from
 * `lib/risk.ts` maps to the correct authentication ceremony.
 */

'use client';

import { useSyncExternalStore } from 'react';
import type { MfaRequirement, RiskAssessment } from '@/lib/risk';

export interface RiskAuthResponse {
  user?: Record<string, unknown>;
  tempToken?: string;
  requiresMfa?: boolean;
  blocked?: boolean;
  risk?: RiskAssessment;
}

export interface RiskFlow {
  route: string;
  needsPending: boolean;
  completed: boolean;
}

const MFA_PENDING_PATHS: Partial<Record<MfaRequirement, string>> = {
  totp: '/verify-mfa',
  hardware_key: '/verify-mfa',
};

/**
 * Resolves the risk assessment to the correct ceremony:
 *   - low      → seamless login (passkey already satisfied the credential step)
 *   - medium   → TOTP (Google Authenticator) at /verify-mfa
 *   - high     → FIDO2 hardware key via WebAuthn, or blocked
 *   - blocked  → deny access
 */
export function resolveRiskRoute(response: RiskAuthResponse, defaultRoute: string): RiskFlow {
  const requirement = response?.risk?.mfaRequirement;

  if (response?.blocked || requirement === 'block') {
    return { route: '/login/blocked', needsPending: false, completed: false };
  }

  if (requirement === 'totp' || requirement === 'hardware_key') {
    return { route: MFA_PENDING_PATHS[requirement]!, needsPending: true, completed: false };
  }

  if (response?.requiresMfa) {
    return { route: '/verify-mfa', needsPending: true, completed: false };
  }

  return { route: defaultRoute, needsPending: false, completed: true };
}

/**
 * Stores the half-authenticated state so the next step of the ceremony can
 * finish the login. Only meaningful for medium/high risk flows.
 */
export function storePendingAuth(
  response: RiskAuthResponse,
  securitySignals: Record<string, unknown> = {}
) {
  if (response.user) sessionStorage.setItem('pendingAuthUser', JSON.stringify(response.user));
  if (response.tempToken) sessionStorage.setItem('pendingAuthToken', response.tempToken);
  sessionStorage.setItem('pendingSecuritySignals', JSON.stringify(securitySignals));
  sessionStorage.setItem('pendingRisk', JSON.stringify(response.risk || null));
}

export function clearPendingAuth() {
  sessionStorage.removeItem('pendingAuthUser');
  sessionStorage.removeItem('pendingAuthToken');
  sessionStorage.removeItem('pendingSecuritySignals');
  sessionStorage.removeItem('pendingRisk');
}

export function getPendingRisk(): RiskAssessment | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem('pendingRisk');
    return raw ? (JSON.parse(raw) as RiskAssessment) : null;
  } catch {
    return null;
  }
}

// Hydration-safe store so components can read the pending risk assessment
// without triggering the set-state-in-effect lint rule.
let pendingRiskCache: { raw: string; value: RiskAssessment | null } | null = null;

function readPendingRisk(): RiskAssessment | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem('pendingRisk');
  if (pendingRiskCache && pendingRiskCache.raw === raw) return pendingRiskCache.value;
  let value: RiskAssessment | null = null;
  try {
    value = raw ? (JSON.parse(raw) as RiskAssessment) : null;
  } catch {
    value = null;
  }
  pendingRiskCache = { raw: raw ?? '', value };
  return value;
}

/** Subscribes to the pending risk assessment stored for the current ceremony. */
export function usePendingRisk(): RiskAssessment | null {
  return useSyncExternalStore(
    () => () => {},
    readPendingRisk,
    () => null
  );
}
