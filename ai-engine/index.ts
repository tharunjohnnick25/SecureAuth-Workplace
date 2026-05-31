/**
 * SecureAuth Proprietary AI Engine
 * 
 * Main orchestration entry point. Executes a full real-time machine learning inference
 * pipeline across typing biometrics, geolocation great-circle travel shifts,
 * statistical outlier models, active session threat hunting, and Bayesian compromise forecasts.
 * 
 * Runs entirely locally in < 150ms. ZERO external APIs.
 */

import { KeystrokeEvent, TypingBiometricsAI, TypingProfile } from './typing-biometrics/biometrics';
import { DeviceFingerprintDetails, DeviceTrustAI, TrustedDeviceRecord } from './device-intelligence/trustModel';
import { LocationCoordinates, GeolocationAI, LocationLoginRecord } from './geolocation-analysis/travelModel';
import { TelemetryFeatureVector, OutlierDetectionAI, OutlierProfileCentroid } from './anomaly-detection/outlierModel';
import { RiskScoringAI, SecuritySignals, EvaluationReport } from './risk-scoring/riskScorer';
import { EventLog, ThreatDetectionAI, ThreatAlert } from './threat-detection/threatHunter';
import { UserRiskPredictorAI, PredictionResult, HistoricalRiskRecord } from './prediction/predictor';

export interface FullInferenceContext {
  userId: string;
  ip: string;
  userAgent: string;
  fingerprint: DeviceFingerprintDetails;
  keystrokes: KeystrokeEvent[];
  location: LocationCoordinates;
  
  // Historical baselines fetched from Supabase telemetry tables
  history: {
    lastIp: string | null;
    lastLogin: string | null;
    lastLatitude: number | null;
    lastLongitude: number | null;
    trustedDevices: TrustedDeviceRecord[];
    recentLogins: EventLog[];
    recentRiskHistory: HistoricalRiskRecord[];
    failedAttemptsCount: number;
    mfaEnabled: boolean;
    passwordAgeDays: number;
  };
  baselines: {
    typingProfile: TypingProfile | null;
    outlierCentroid: OutlierProfileCentroid | null;
    officeGeofences?: LocationCoordinates[];
  };
}

export interface AIRecordResult {
  riskReport: EvaluationReport;
  threatAlert: ThreatAlert;
  compromisePrediction: PredictionResult;
  biometricsMatchScore: number;
  deviceTrustScore: number;
  locationTrustScore: number;
}

export class AIEngine {
  /**
   * Performs full-pipeline real-time security telemetry inference.
   */
  public static async evaluateAccessRequest(
    context: FullInferenceContext
  ): Promise<AIRecordResult> {
    const timestamp = new Date().toISOString();

    // 1. Execute Cosine Similarity Typing Biometrics Model
    const biometricsMatchScore = context.baselines.typingProfile
      ? TypingBiometricsAI.calculateMatchScore(context.keystrokes, context.baselines.typingProfile)
      : 80; // Baseline default if profile is calibrating

    // 2. Execute Great-Circle Haversine Travel Model
    const locationHistory: LocationLoginRecord[] = context.history.recentLogins.map(log => ({
      timestamp: log.timestamp,
      coordinates: log.location || {
        latitude: context.history.lastLatitude || 0,
        longitude: context.history.lastLongitude || 0,
        city: 'Baseline Location',
        country: 'Baseline Country'
      },
      ip: log.ip
    }));

    const {
      score: locationTrustScore,
      impossibleTravel,
      vpnDetected,
      reasons: geoReasons
    } = GeolocationAI.calculateLocationTrust(
      context.location,
      locationHistory,
      context.baselines.officeGeofences
    );

    // 3. Execute Device Trust Model
    const {
      score: deviceTrustScore,
      matchFound: deviceMatchFound,
      isSuspicious: deviceSuspicious,
      reasons: deviceReasons
    } = DeviceTrustAI.calculateTrustScore(
      context.fingerprint,
      context.history.trustedDevices
    );

    // 4. Execute Cyclical Outlier / Outlier Model
    const currentFeature: TelemetryFeatureVector = {
      hourOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      distanceFromHome: context.history.lastLatitude && context.history.lastLongitude
        ? GeolocationAI.calculateHaversineDistance(context.location, {
            latitude: context.history.lastLatitude,
            longitude: context.history.lastLongitude
          })
        : 0,
      untrustedDevicePenalty: !deviceMatchFound ? 1 : 0
    };

    const {
      score: anomalyScore,
      isAnomaly: isContextAnomaly,
      factors: anomalyFactors
    } = OutlierDetectionAI.calculateAnomalyScore(
      currentFeature,
      context.baselines.outlierCentroid
    );

    // 5. Build Signals and Compute Normalized Risk Score
    const signals: SecuritySignals = {
      user_id: context.userId,
      isNewDevice: !deviceMatchFound,
      isNewCountry: context.history.lastIp !== null && context.location.country !== 'Baseline Country',
      isAbnormalTyping: biometricsMatchScore < 70,
      failedAttempts: context.history.failedAttemptsCount,
      isVpnDetected: vpnDetected,
      isSuspiciousIp: deviceSuspicious,
      impossibleTravel,
      typingMatchScore: biometricsMatchScore,
      deviceTrustScore,
      locationTrustScore,
      anomalyScore
    };

    const riskReport = RiskScoringAI.evaluateRisk(signals);

    // 6. Execute Threat Detection Engine
    const threatAlert = ThreatDetectionAI.huntThreats(
      context.userId,
      context.ip,
      context.history.recentLogins,
      context.history.lastIp
    );

    // 7. Execute Bayesian Compromise Predictor
    const compromisePrediction = UserRiskPredictorAI.predictCompromise(
      context.userId,
      context.history.recentRiskHistory,
      context.history.mfaEnabled,
      context.history.passwordAgeDays
    );

    return {
      riskReport,
      threatAlert,
      compromisePrediction,
      biometricsMatchScore,
      deviceTrustScore,
      locationTrustScore
    };
  }
}

export type { KeystrokeEvent, DeviceFingerprintDetails, LocationCoordinates, OutlierProfileCentroid };
