import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { AIEngine, type FullInferenceContext, type AIRecordResult } from './index';

export async function evaluateAccessRequestWithPersistence(
  context: FullInferenceContext,
  supabase: SupabaseClient<Database>
): Promise<AIRecordResult> {
  const result = await AIEngine.evaluateAccessRequest(context);

  try {
    const insertOps = [
      supabase.from('ai_risk_scores').insert({
        user_id: context.userId,
        score: result.riskReport.score,
        risk_level: result.riskReport.level,
        factors: result.riskReport.factors,
        ip_address: context.ip,
        device_id: context.fingerprint.userAgent || null,
        location: context.location,
        calculated_at: new Date().toISOString()
      }),
      supabase.from('threat_predictions').insert({
        user_id: context.userId,
        compromise_probability: result.compromisePrediction.compromiseProbability,
        vulnerability_class: result.compromisePrediction.vulnerabilityClass,
        contributing_factors: result.compromisePrediction.contributingFactors,
        recommendations: result.compromisePrediction.remediations,
        predicted_at: new Date().toISOString()
      })
    ];

    if (result.threatAlert.detected || result.riskReport.level === 'CRITICAL') {
      insertOps.push(
        supabase.from('anomaly_logs').insert({
          user_id: context.userId,
          type: result.threatAlert.type || 'SECURITY_ALERT',
          severity: result.threatAlert.severity,
          details: {
            riskReport: result.riskReport,
            threatAlert: result.threatAlert
          },
          is_resolved: false,
          created_at: new Date().toISOString()
        })
      );
    }

    if (result.riskReport.score >= 60) {
      insertOps.push(
        supabase.from('anomaly_logs').insert({
          user_id: context.userId,
          type: 'HIGH_RISK_SESSION',
          severity: result.riskReport.level,
          details: {
            riskReport: result.riskReport,
            anomalyScore: result.threatAlert.detected ? 1 : 0
          },
          is_resolved: false,
          created_at: new Date().toISOString()
        })
      );
    }

    await Promise.all(insertOps);
  } catch (err: any) {
    console.warn('AI engine persistence skipped due to error:', err?.message || err);
  }

  return result;
}
