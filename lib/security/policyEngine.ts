import { createClient } from '@supabase/supabase-js';

export interface PolicyContext {
  user_id?: string;
  company_id: string;
  role?: string;
  account_status?: string;
  risk_score?: number;
  device_trusted?: boolean;
  inside_geofence?: boolean;
  network_type?: string;
}

export interface PolicyResult {
  decision: 'ALLOW' | 'MFA_REQUIRED' | 'STEP_UP_REQUIRED' | 'DENY' | 'BLOCK';
  policy_id?: string;
  reason_code: string;
}

interface Condition {
  field: keyof PolicyContext;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'in';
  value: any;
}

function evaluateCondition(condition: Condition, context: PolicyContext): boolean {
  const contextValue = context[condition.field];

  if (contextValue === undefined) {
    return false; // If the field isn't in the context, condition fails securely
  }

  switch (condition.operator) {
    case 'equals':
      return contextValue === condition.value;
    case 'not_equals':
      return contextValue !== condition.value;
    case 'greater_than':
      return Number(contextValue) > Number(condition.value);
    case 'less_than':
      return Number(contextValue) < Number(condition.value);
    case 'in':
      if (Array.isArray(condition.value)) {
        return condition.value.includes(contextValue);
      }
      return false;
    default:
      return false; // Unsupported operators fail closed
  }
}

export async function evaluateSecurityPolicy(
  action: string,
  context: PolicyContext
): Promise<PolicyResult> {
  // Fail-secure defaults based on action sensitivity
  const defaultDenyActions = ['SENSITIVE_OPERATION', 'FACE_VERIFY', 'DEVICE_REGISTER'];
  const fallbackDecision = defaultDenyActions.includes(action) ? 'DENY' : 'ALLOW';
  const fallbackReason = 'POLICY_ENGINE_FALLBACK';

  try {
    if (!context.company_id) {
       return { decision: 'DENY', reason_code: 'MISSING_COMPANY_CONTEXT' };
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch active policies for this company and action, ordered by highest priority first
    const { data: policies, error } = await adminClient
      .from('security_policies')
      .select('*')
      .eq('company_id', context.company_id)
      .eq('action', action)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error) {
      console.error('Failed to fetch security policies:', error);
      return { decision: fallbackDecision as any, reason_code: 'DATABASE_ERROR' };
    }

    if (!policies || policies.length === 0) {
      return { decision: fallbackDecision as any, reason_code: 'NO_POLICY_DEFINED' };
    }

    for (const policy of policies) {
      const conditions: Condition[] = policy.conditions || [];
      
      // Assume policy matches if there are no conditions, or if ALL conditions are true
      let policyMatches = true;
      for (const cond of conditions) {
        if (!evaluateCondition(cond, context)) {
          policyMatches = false;
          break; // One condition failed, this policy doesn't match
        }
      }

      if (policyMatches) {
        return {
          decision: policy.decision,
          policy_id: policy.id,
          reason_code: `POLICY_ENFORCED_${policy.decision}`
        };
      }
    }

    // No matching policies found
    return { decision: fallbackDecision as any, reason_code: 'NO_MATCHING_POLICY' };

  } catch (err) {
    console.error('Exception in evaluateSecurityPolicy:', err);
    return { decision: fallbackDecision as any, reason_code: 'ENGINE_EXCEPTION' };
  }
}
