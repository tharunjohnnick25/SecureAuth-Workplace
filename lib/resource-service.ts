import type { SupabaseClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { sendNotification } from '@/lib/notify';
import { normalizeRole, isAdminRole, isManagerRole, isEmployeeRole, fetchProfile, resolveApprover, type UserProfile, type AuditEntry, insertAudit } from './leave-service';

export const RESOURCE_STATUS = {
  PENDING: 'PENDING',
  MANAGER_APPROVED: 'MANAGER_APPROVED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  INFO_REQUESTED: 'INFO_REQUESTED',
} as const;

export type ResourceStatusValue = (typeof RESOURCE_STATUS)[keyof typeof RESOURCE_STATUS];

export const ACTION_TARGETS: readonly string[] = [
  RESOURCE_STATUS.MANAGER_APPROVED,
  RESOURCE_STATUS.APPROVED,
  RESOURCE_STATUS.REJECTED,
  RESOURCE_STATUS.INFO_REQUESTED,
];

export interface ResourceRow {
  id: string;
  user_id: string;
  company_id: string | null;
  resource_name: string;
  access_level: string;
  reason: string;
  status: string;
  admin_remarks: string | null;
  created_at: string;
  updated_at: string;
}

export class ResourceServiceError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 500, code?: string) {
    super(message);
    this.name = 'ResourceServiceError';
    this.status = status;
    this.code = code;
  }
}

async function recordApprovalRequest(
  admin: SupabaseClient,
  resourceReq: { id: string; user_id: string; resource_name: string },
  approverId: string,
  target: string,
  remarks?: string | null
): Promise<void> {
  try {
    await admin.from('approval_requests').insert({
      id: randomUUID(),
      type: 'RESOURCE',
      requester_id: resourceReq.user_id,
      approver_id: approverId,
      data_payload: {
        resource_request_id: resourceReq.id,
        resource_name: resourceReq.resource_name,
        action: target,
      },
      status: target === RESOURCE_STATUS.INFO_REQUESTED ? RESOURCE_STATUS.PENDING : target,
      comments: remarks || null,
    });
  } catch (err) {
    console.error('[Approval Request Record Error]', err);
  }
}

export interface CreateResourceInput {
  resource_name?: string;
  access_level?: string;
  reason?: string;
}

export async function createResourceRequest(
  admin: SupabaseClient,
  caller: UserProfile,
  input: CreateResourceInput,
  req?: NextRequest
): Promise<ResourceRow> {
  const { resource_name, access_level, reason } = input;

  if (!resource_name || !access_level) {
    throw new ResourceServiceError('Missing required fields', 400, 'MISSING_FIELDS');
  }

  const approver = await resolveApprover(admin, caller);

  const { data, error } = await admin
    .from('resource_requests')
    .insert({
      user_id: caller.id,
      company_id: caller.company_id,
      resource_name,
      access_level,
      reason: reason?.trim() || 'No reason provided',
      status: RESOURCE_STATUS.PENDING,
    })
    .select('*')
    .single();

  if (error) {
    throw new ResourceServiceError(error.message, 500, 'INSERT_FAILED');
  }

  await insertAudit(admin, caller.id, caller.company_id, {
    action: 'RESOURCE_REQUESTED',
    resource: 'resource_request',
    entity_type: 'resource_request',
    entity_id: data.id,
    details: { resource_name, access_level, approver_id: approver.id },
  }, req);

  await sendNotification(admin, {
    user_id: approver.id,
    type: 'SYSTEM_ALERT',
    title: 'New Resource Access Request',
    message: `A new request for ${resource_name} requires your approval.`,
    action_url: '/admin/resource-management',
  });

  return data as ResourceRow;
}

export interface ActionPlan {
  allowed: boolean;
  expectedCurrent?: string;
  status?: number;
  code?: string;
  message?: string;
}

export function planTransition(
  caller: UserProfile,
  requester: UserProfile,
  resourceReq: ResourceRow,
  target: string
): ActionPlan {
  if (requester.id === caller.id) {
    return {
      allowed: false,
      status: 403,
      code: 'CANNOT_APPROVE_OWN_REQUEST',
      message: 'You cannot approve your own resource request',
    };
  }

  const callerRole = normalizeRole(caller.role);
  const requesterRole = normalizeRole(requester.role);
  const current = resourceReq.status;

  if (isManagerRole(callerRole)) {
    if (!isEmployeeRole(requesterRole)) {
      return {
        allowed: false,
        status: 403,
        code: 'FORBIDDEN',
        message: 'Managers may only act on requests from their direct reports',
      };
    }
    if (requester.manager_id !== caller.id) {
      return {
        allowed: false,
        status: 403,
        code: 'NOT_DIRECT_REPORT',
        message: 'This request does not belong to a direct report',
      };
    }
    if (target !== RESOURCE_STATUS.MANAGER_APPROVED && target !== RESOURCE_STATUS.REJECTED) {
      return {
        allowed: false,
        status: 403,
        code: 'INVALID_TRANSITION',
        message: 'Managers may only mark requests as Manager Approved or Rejected',
      };
    }
    if (current !== RESOURCE_STATUS.PENDING) {
      return {
        allowed: false,
        status: 409,
        code: 'ALREADY_PROCESSED',
        message: 'Request has already been processed',
      };
    }
    return { allowed: true, expectedCurrent: RESOURCE_STATUS.PENDING };
  }

  if (isAdminRole(callerRole)) {
    if (isEmployeeRole(requesterRole)) {
      if (target === RESOURCE_STATUS.APPROVED) {
        if (current !== RESOURCE_STATUS.MANAGER_APPROVED) {
          return {
            allowed: false,
            status: 409,
            code: 'MANAGER_APPROVAL_REQUIRED',
            message: 'Request must first be approved by the manager',
          };
        }
        return { allowed: true, expectedCurrent: RESOURCE_STATUS.MANAGER_APPROVED };
      }
      if (current !== RESOURCE_STATUS.PENDING && current !== RESOURCE_STATUS.MANAGER_APPROVED) {
        return {
          allowed: false,
          status: 409,
          code: 'ALREADY_PROCESSED',
          message: 'Request has already been processed',
        };
      }
      return { allowed: true, expectedCurrent: current };
    }

    if (current !== RESOURCE_STATUS.PENDING) {
      return {
        allowed: false,
        status: 409,
        code: 'ALREADY_PROCESSED',
        message: 'Request has already been processed',
      };
    }
    return { allowed: true, expectedCurrent: RESOURCE_STATUS.PENDING };
  }

  return {
    allowed: false,
    status: 403,
    code: 'FORBIDDEN',
    message: 'Only managers and admins can approve resource requests',
  };
}

export interface ActionResourceInput {
  request_id: string;
  status: string;
  admin_remarks?: string | null;
}

export async function actionResourceRequest(
  admin: SupabaseClient,
  caller: UserProfile,
  input: ActionResourceInput,
  req?: NextRequest
): Promise<ResourceRow> {
  const { request_id, status, admin_remarks } = input;

  if (!request_id) {
    throw new ResourceServiceError('Missing request_id', 400, 'MISSING_FIELDS');
  }

  const target = String(status || '').toUpperCase();
  if (!ACTION_TARGETS.includes(target)) {
    throw new ResourceServiceError('Invalid status', 400, 'INVALID_STATUS');
  }

  const { data: resourceReq } = await admin
    .from('resource_requests')
    .select('*')
    .eq('id', request_id)
    .maybeSingle();

  if (!resourceReq) {
    throw new ResourceServiceError('Resource request not found', 404, 'NOT_FOUND');
  }

  const requester = await fetchProfile(admin, resourceReq.user_id);
  if (!requester) {
    throw new ResourceServiceError('Request owner no longer exists', 404, 'NOT_FOUND');
  }

  if (!caller.company_id || !requester.company_id || caller.company_id !== requester.company_id) {
    throw new ResourceServiceError('Cross-company approval is not allowed', 403, 'CROSS_COMPANY_FORBIDDEN');
  }

  const plan = planTransition(caller, requester, resourceReq as ResourceRow, target);
  if (!plan.allowed || !plan.expectedCurrent) {
    throw new ResourceServiceError(plan.message || 'Action not allowed', plan.status || 403, plan.code);
  }

  const { data: updated, error } = await admin
    .from('resource_requests')
    .update({
      status: target,
      admin_remarks: admin_remarks || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', resourceReq.id)
    .eq('status', plan.expectedCurrent)
    .select('*')
    .maybeSingle();

  if (error) {
    throw new ResourceServiceError(error.message, 500, 'UPDATE_FAILED');
  }

  if (!updated) {
    throw new ResourceServiceError('Request has already been processed', 409, 'ALREADY_PROCESSED');
  }

  await Promise.all([
    recordApprovalRequest(admin, resourceReq, caller.id, target, admin_remarks),
    insertAudit(admin, caller.id, caller.company_id, {
      action: `RESOURCE_${target}`,
      resource: 'resource_request',
      entity_type: 'resource_request',
      entity_id: resourceReq.id,
      details: { status: target, admin_remarks: admin_remarks || null },
      changes: { from: resourceReq.status, to: target },
    }, req),
  ]);

  await sendNotification(admin, {
    user_id: requester.id,
    type: 'SYSTEM_ALERT',
    title: `Resource Request ${target.replace('_', ' ')}`,
    message: `Your request for ${resourceReq.resource_name} has been ${target.toLowerCase().replace('_', ' ')}. Remarks: ${admin_remarks || 'None'}`,
  });

  return updated as ResourceRow;
}

export interface EnrichedResourceReq extends ResourceRow {
  user_name: string;
  user_email: string;
  user_role: string;
  requester_manager_id: string | null;
}

export interface ListResourceFilters {
  userId?: string | null;
  includeSelfForManager?: boolean;
}

export async function fetchResourceRequests(
  admin: SupabaseClient,
  caller: UserProfile,
  filters: ListResourceFilters = {}
): Promise<EnrichedResourceReq[]> {
  const callerRole = normalizeRole(caller.role);

  const enrich = (rows: unknown[]): EnrichedResourceReq[] =>
    rows.map((r) => {
      const row = r as ResourceRow & {
        users?: {
          full_name?: string | null;
          email?: string | null;
          role?: string | null;
          manager_id?: string | null;
          company_id?: string | null;
        };
      };
      return {
        ...row,
        user_name: row.users?.full_name || row.users?.email || 'Unknown User',
        user_email: row.users?.email || '',
        user_role: normalizeRole(row.users?.role),
        requester_manager_id: row.users?.manager_id || null,
      };
    });

  const select = `
    *,
    users!inner (
      id,
      full_name,
      email,
      role,
      manager_id,
      company_id
    )
  `;

  let rows: unknown[] = [];

  if (isAdminRole(callerRole)) {
    let q = admin.from('resource_requests').select(select).order('created_at', { ascending: false });
    if (caller.company_id) q = q.eq('users.company_id', caller.company_id);
    if (filters.userId) q = q.eq('user_id', filters.userId);
    const { data, error } = await q;
    if (error) throw new ResourceServiceError(error.message, 500, 'FETCH_FAILED');
    rows = data || [];
  } else if (isManagerRole(callerRole)) {
    let q = admin.from('resource_requests').select(select).order('created_at', { ascending: false });
    if (caller.company_id) q = q.eq('users.company_id', caller.company_id);
    if (filters.userId) {
      q = q.eq('user_id', filters.userId);
    } else {
      q = q.eq('users.manager_id', caller.id);
    }
    const { data, error } = await q;
    if (error) throw new ResourceServiceError(error.message, 500, 'FETCH_FAILED');
    rows = data || [];

    if (filters.includeSelfForManager && !filters.userId) {
      let own = admin.from('resource_requests').select(select).order('created_at', { ascending: false });
      if (caller.company_id) own = own.eq('users.company_id', caller.company_id);
      own = own.eq('user_id', caller.id);
      const { data: ownData, error: ownError } = await own;
      if (ownError) throw new ResourceServiceError(ownError.message, 500, 'FETCH_FAILED');
      rows = [...(ownData || []), ...rows];
    }
  } else {
    let q = admin.from('resource_requests').select(select).order('created_at', { ascending: false });
    if (caller.company_id) q = q.eq('users.company_id', caller.company_id);
    q = q.eq('user_id', caller.id);
    const { data, error } = await q;
    if (error) throw new ResourceServiceError(error.message, 500, 'FETCH_FAILED');
    rows = data || [];
  }

  return enrich(rows);
}
