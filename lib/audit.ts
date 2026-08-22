import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

export interface AuditEventPayload {
  action: string;
  resource: string;
  details?: any;
  entity_type?: string;
  entity_id?: string;
  changes?: any;
}

export interface SecurityEventPayload {
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details?: any;
  metadata?: any;
}

/**
 * Helper to safely extract IP and User Agent from the NextRequest
 */
function getRequestMetadata(req?: NextRequest) {
  if (!req) return { ip: null, userAgent: null };
  // NextRequest provides ip directly in some host environments
  const ip = (req as any).ip || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  return { ip, userAgent };
}

/**
 * Standardized function to log an Audit Event.
 * Does not throw errors to prevent interrupting primary operations.
 */
export async function logAuditEvent(
  userId: string | null,
  companyId: string | null,
  payload: AuditEventPayload,
  req?: NextRequest
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { ip } = getRequestMetadata(req);

    await supabase.from('audit_logs').insert({
      user_id: userId || null,
      company_id: companyId || null,
      action: payload.action,
      resource: payload.resource,
      details: payload.details || null,
      entity_type: payload.entity_type || null,
      entity_id: payload.entity_id || null,
      changes: payload.changes || null,
      ip_address: ip,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('[Audit Log Error]', err);
  }
}

/**
 * Standardized function to log a Security Event.
 * Does not throw errors to prevent interrupting primary operations.
 */
export async function logSecurityEvent(
  userId: string | null,
  companyId: string | null,
  payload: SecurityEventPayload,
  req?: NextRequest
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { ip, userAgent } = getRequestMetadata(req);

    const mergedMetadata = {
      ...(payload.metadata || {}),
      user_agent: userAgent
    };

    await supabase.from('security_events').insert({
      user_id: userId || null,
      company_id: companyId || null,
      event_type: payload.event_type,
      severity: payload.severity,
      details: payload.details || null,
      metadata: mergedMetadata,
      ip_address: ip,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('[Security Event Error]', err);
  }
}
