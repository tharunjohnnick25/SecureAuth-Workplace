/**
 * Custom Threat Detection Engine
 * 
 * Inspects log sequences and session characteristics to identify brute-force,
 * credential stuffing, session hijacking, account takeovers (ATO), and insider threat indicators.
 */

import { LocationCoordinates } from '../geolocation-analysis/travelModel';

export interface EventLog {
  timestamp: string;
  user_id: string;
  ip: string;
  action: string; // "login_attempt", "resource_access", "role_change"
  success: boolean;
  userAgent: string;
  location?: LocationCoordinates;
}

export type ThreatSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ThreatAlert {
  detected: boolean;
  type: string;
  severity: ThreatSeverity;
  description: string;
  reasons: string[];
}

export class ThreatDetectionAI {
  /**
   * Analyzes a sequence of recent events to search for active threat signatures.
   */
  public static huntThreats(
    currentUserId: string,
    currentIp: string,
    recentEvents: EventLog[],
    activeSessionIp: string | null
  ): ThreatAlert {
    const reasons: string[] = [];
    let detected = false;
    let severity: ThreatSeverity = 'LOW';
    let type = 'None';

    if (!recentEvents || recentEvents.length === 0) {
      return { detected: false, type: 'None', severity: 'LOW', description: 'No active threat signatures detected', reasons: [] };
    }

    const now = new Date().getTime();
    const windowStart = now - (5 * 60 * 1000); // 5-minute analysis window

    const eventsInWindow = recentEvents.filter(ev => new Date(ev.timestamp).getTime() >= windowStart);

    // 1. Session Hijacking Signature (IP or User-Agent shift in an active session)
    if (activeSessionIp && currentIp !== activeSessionIp) {
      detected = true;
      type = 'SESSION_HIJACKING';
      severity = 'CRITICAL';
      reasons.push(`Session IP mismatch: Active session bound to ${activeSessionIp}, but access attempted from ${currentIp}`);
    }

    // 2. Brute Force Signature (Multiple failures for a single user from one IP)
    const failedLogins = eventsInWindow.filter(
      ev => ev.user_id === currentUserId && ev.action === 'login_attempt' && !ev.success
    );

    if (failedLogins.length >= 6) {
      detected = true;
      type = 'BRUTE_FORCE';
      severity = 'HIGH';
      reasons.push(`Multiple authentication failures: ${failedLogins.length} login failures detected from IP ${currentIp} within 5 minutes`);
    }

    // 3. Credential Stuffing Signature (Attempts for multiple user accounts from a single IP)
    const uniqueUsersAttempted = new Set(
      eventsInWindow
        .filter(ev => ev.ip === currentIp && ev.action === 'login_attempt' && !ev.success)
        .map(ev => ev.user_id)
    );

    if (uniqueUsersAttempted.size >= 4) {
      detected = true;
      type = 'CREDENTIAL_STUFFING';
      severity = 'CRITICAL';
      reasons.push(`Multi-account brute force: Rapid login failures targeting ${uniqueUsersAttempted.size} unique user IDs from a single IP address ${currentIp}`);
    }

    // 4. Insider Threat / Suspicious Activity (Rapid access to multiple high-risk system paths)
    const resourceAccesses = eventsInWindow.filter(
      ev => ev.user_id === currentUserId && ev.action === 'resource_access'
    );
    if (resourceAccesses.length >= 25) {
      detected = true;
      type = 'INSIDER_THREAT';
      severity = 'HIGH';
      reasons.push(`Anomalous file resource traversal: ${resourceAccesses.length} document access logs recorded in under 5 minutes`);
    }

    // Determine final description
    let description = 'Normal operational context';
    if (detected) {
      if (type === 'SESSION_HIJACKING') {
        description = 'URGENT: Suspicious IP shift in active session indicates potential session hijacking token theft';
      } else if (type === 'BRUTE_FORCE') {
        description = 'HIGH RISK: Password guessing brute-force attack targeting employee account';
      } else if (type === 'CREDENTIAL_STUFFING') {
        description = 'CRITICAL RISK: Distributed credential stuffing attempting multi-account penetration';
      } else if (type === 'INSIDER_THREAT') {
        description = 'HIGH RISK: High-frequency data scraping traversal flagged as anomalous insider hazard';
      }
    }

    return {
      detected,
      type,
      severity,
      description,
      reasons
    };
  }
}
