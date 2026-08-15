/**
 * AdaptiveTrustEngine
 * 
 * Calculates trust scores based on behavioral metrics, location, device, and face verification.
 * Determines the final Trust Score (0-100) and Trust Level (LOW, MEDIUM, HIGH).
 */

export interface TrustSignals {
  userId: string;
  sessionId: string;
  faceConfidence?: number; // 0-100
  typingSpeed?: number; // WPM
  typingVariance?: number;
  location?: {
    city?: string;
    country?: string;
    ip?: string;
  };
  deviceFingerprint?: string;
  loginTime?: Date;
  mfaPassed: boolean;
}

export type TrustLevel = 'HIGH_TRUST' | 'MEDIUM_TRUST' | 'LOW_TRUST';

export interface TrustScoreResult {
  score: number;
  level: TrustLevel;
  factors: Record<string, 'normal' | 'anomalous' | 'unverified'>;
}

export class AdaptiveTrustEngine {
  
  /**
   * Calculates the initial trust score right after MFA is completed.
   */
  static async calculateInitialScore(signals: TrustSignals): Promise<TrustScoreResult> {
    let score = 100;
    const factors: Record<string, 'normal' | 'anomalous' | 'unverified'> = {};

    // 1. Face Verification Evaluation
    if (signals.faceConfidence !== undefined) {
      if (signals.faceConfidence < 70) {
        score -= 40; // Very low confidence
        factors.face = 'anomalous';
      } else if (signals.faceConfidence < 90) {
        score -= 10; // Medium confidence
        factors.face = 'anomalous';
      } else {
        factors.face = 'normal';
      }
    } else {
      score -= 20; // Face not provided
      factors.face = 'unverified';
    }

    // 2. Behavioral / Typing Evaluation
    // (In a real scenario, we'd fetch the baseline from `behavioral_features` DB table)
    if (signals.typingSpeed) {
      // Mock logic: assuming 50 WPM is baseline. If it deviates heavily, deduct points.
      const baselineSpeed = 50; 
      const deviation = Math.abs(signals.typingSpeed - baselineSpeed) / baselineSpeed;
      if (deviation > 0.4) {
        score -= 15;
        factors.typing = 'anomalous';
      } else {
        factors.typing = 'normal';
      }
    }

    // 3. Time Evaluation
    if (signals.loginTime) {
      const hour = signals.loginTime.getHours();
      // Assume normal working hours are 8 AM to 6 PM
      if (hour < 6 || hour > 20) {
        score -= 15;
        factors.time = 'anomalous';
      } else {
        factors.time = 'normal';
      }
    }

    // 4. Device and Location Evaluation
    // (In a real scenario, query `devices` and `behavioral_features.usual_locations`)
    if (signals.deviceFingerprint) {
      // We will assume for now that if it's provided, we check if it's a known device.
      // E.g., deduct 20 points if it's a completely new device footprint.
      factors.device = 'normal'; 
    }
    
    if (signals.location) {
      factors.location = 'normal';
    }

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    // Determine Level
    let level: TrustLevel = 'HIGH_TRUST';
    if (score < 50) level = 'LOW_TRUST';
    else if (score < 80) level = 'MEDIUM_TRUST';

    return { score, level, factors };
  }

  /**
   * Adjusts the trust score during a session based on new activities (e.g. downloading sensitive file)
   */
  static async adjustScoreForActivity(currentScore: number, activitySeverity: 'low' | 'medium' | 'high'): Promise<TrustScoreResult> {
    let newScore = currentScore;
    
    switch (activitySeverity) {
      case 'low': newScore -= 2; break;
      case 'medium': newScore -= 10; break;
      case 'high': newScore -= 25; break;
    }

    newScore = Math.max(0, Math.min(100, newScore));
    
    let level: TrustLevel = 'HIGH_TRUST';
    if (newScore < 50) level = 'LOW_TRUST';
    else if (newScore < 80) level = 'MEDIUM_TRUST';

    return { score: newScore, level, factors: { activity: 'anomalous' } };
  }
}
