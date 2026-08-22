import type { SupabaseClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { sendNotification } from '@/lib/notify';

const DEFAULT_ANNUAL_LEAVE = 20;

export const LEAVE_STATUS = {
  PENDING: 'PENDING',
  MANAGER_APPROVED: 'MANAGER_APPROVED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  INFO_REQUESTED: 'INFO_REQUESTED',
} as const;

export type LeaveStatusValue = (typeof LEAVE_STATUS)[keyof typeof LEAVE_STATUS];

export const ACTION_TARGETS: readonly string[] = [
  LEAVE_STATUS.MANAGER_APPROVED,
  LEAVE_STATUS.APPROVED,
  LEAVE_STATUS.REJECTED,
  LEAVE_STATUS.INFO_REQUESTED,
];

const ADMIN_ROLES = new Set(['admin', 'super_admin']);
const MANAGER_ROLES = new Set(['manager']);
const EMPLOYEE_ROLES = new Set(['employee']);

export interface UserProfile {
  id: string;
  company_id: string | null;
  role: string;
  manager_id: string | null;
}

export interface LeaveRow {
  id: string;
  user_id: string;
  company_id: string | null;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  document_url: string | null;
  status: string;
  admin_remarks: string | null;
  created_at: string;
  updated_at: string;
}

export class LeaveServiceError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 500, code?: string) {
    super(message);
    this.name = 'LeaveServiceError';
    this.status = status;
    this.code = code;
  }
}

export function normalizeRole(role?: string | null): string {
  return (role || '').trim().toLowerCase();
}

export function isAdminRole(role?: string | null): boolean {
  return ADMIN_ROLES.has(normalizeRole(role));
}

export function isManagerRole(role?: string | null): boolean {
  return MANAGER_ROLES.has(normalizeRole(role));
}

export function isEmployeeRole(role?: string | null): boolean {
  return EMPLOYEE_ROLES.has(normalizeRole(role));
}

export async function fetchProfile(admin: SupabaseClient, userId: string): Promise<UserProfile | null> {
  const { data } = await admin
    .from('users')
    .select('id, company_id, role, manager_id')
    .eq('id', userId)
    .maybeSingle();
  return (data as UserProfile) || null;
}

/**
 * Server-side approver derivation (never trust the client):
 * - employees are approved by their assigned manager (users.manager_id)
 * - managers/admins are approved by an administrator of the same company
 */
export async function resolveApprover(admin: SupabaseClient, requester: UserProfile): Promise<UserProfile> {
  if (!requester.company_id) {
    throw new LeaveServiceError('Company not configured for user', 403, 'COMPANY_NOT_CONFIGURED');
  }

  if (isEmployeeRole(requester.role)) {
    if (!requester.manager_id) {
      throw new LeaveServiceError('No manager assigned to your account', 409, 'NO_APPROVER_CONFIGURED');
    }
    const { data: manager } = await admin
      .from('users')
      .select('id, company_id, role, manager_id')
      .eq('id', requester.manager_id)
      .maybeSingle();
    if (!manager) {
      throw new LeaveServiceError('Assigned manager no longer exists', 409, 'NO_APPROVER_CONFIGURED');
    }
    return manager as UserProfile;
  }

  const { data: admins } = await admin
    .from('users')
    .select('id, company_id, role, manager_id')
    .eq('company_id', requester.company_id)
    .in('role', ['admin', 'super_admin']);

  const candidates = (admins || []).filter((a) => a.id !== requester.id) as UserProfile[];
  if (candidates.length === 0) {
    throw new LeaveServiceError('No administrator available to approve this request', 409, 'NO_APPROVER_CONFIGURED');
  }
  return candidates[0];
}

export function computeTotalDays(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

async function ensureLeaveBalance(
  admin: SupabaseClient,
  userId: string,
  leaveType: string,
  year: number
): Promise<void> {
  try {
    const { data: balance } = await admin
      .from('leave_balances')
      .select('id')
      .eq('employee_id', userId)
      .eq('leave_type', leaveType)
      .eq('year', year)
      .maybeSingle();

    if (!balance) {
      await admin.from('leave_balances').insert({
        id: randomUUID(),
        employee_id: userId,
        leave_type: leaveType,
        total_days: DEFAULT_ANNUAL_LEAVE,
        used_days: 0,
        pending_days: 0,
        year,
      });
    }
  } catch (err) {
    console.error('[Leave Balance Init Error]', err);
  }
}

async function adjustLeaveBalance(
  admin: SupabaseClient,
  userId: string,
  leaveType: string,
  year: number,
  pendingDelta: number,
  usedDelta = 0
): Promise<void> {
  try {
    await ensureLeaveBalance(admin, userId, leaveType, year);
    const { data: balance } = await admin
      .from('leave_balances')
      .select('id, pending_days, used_days')
      .eq('employee_id', userId)
      .eq('leave_type', leaveType)
      .eq('year', year)
      .maybeSingle();

    if (balance) {
      const pending = Math.max(0, Number(balance.pending_days || 0) + pendingDelta);
      const used = Math.max(0, Number(balance.used_days || 0) + usedDelta);
      await admin
        .from('leave_balances')
        .update({ pending_days: pending, used_days: used, updated_at: new Date().toISOString() })
        .eq('id', balance.id);
    }
  } catch (err) {
    console.error('[Leave Balance Adjust Error]', err);
  }
}

async function recordApprovalRequest(
  admin: SupabaseClient,
  leave: { id: string; user_id: string; leave_type: string },
  approverId: string,
  target: string,
  remarks?: string | null
): Promise<void> {
  try {
    await admin.from('approval_requests').insert({
      id: randomUUID(),
      type: 'LEAVE',
      requester_id: leave.user_id,
      approver_id: approverId,
      data_payload: {
        leave_request_id: leave.id,
        leave_type: leave.leave_type,
        action: target,
      },
      status: target === LEAVE_STATUS.INFO_REQUESTED ? LEAVE_STATUS.PENDING : target,
      comments: remarks || null,
    });
  } catch (err) {
    console.error('[Approval Request Record Error]', err);
  }
}

function getClientIp(req?: NextRequest): string | null {
  if (!req) return null;
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  return real ? real.trim() : null;
}

export interface AuditEntry {
  action: string;
  resource: string;
  entity_type?: string;
  entity_id?: string;
  details?: Record<string, unknown>;
  changes?: Record<string, unknown>;
}

export async function insertAudit(
  admin: SupabaseClient,
  userId: string | null,
  companyId: string | null,
  entry: AuditEntry,
  req?: NextRequest
): Promise<void> {
  try {
    await admin.from('audit_logs').insert({
      user_id: userId,
      company_id: companyId,
      action: entry.action,
      resource: entry.resource,
      details: entry.details || null,
      entity_type: entry.entity_type || null,
      entity_id: entry.entity_id || null,
      changes: entry.changes || null,
      ip_address: getClientIp(req),
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Leave Audit Error]', err);
  }
}

export interface CreateLeaveInput {
  leave_type?: string;
  start_date?: string;
  end_date?: string;
  total_days?: number;
  reason?: string;
  document_url?: string | null;
}

export async function createLeave(
  admin: SupabaseClient,
  caller: UserProfile,
  input: CreateLeaveInput,
  req?: NextRequest
): Promise<LeaveRow> {
  const { leave_type, start_date, end_date, reason, document_url } = input;

  if (!leave_type || !start_date || !end_date) {
    throw new LeaveServiceError('Missing required fields', 400, 'MISSING_FIELDS');
  }

  const start = new Date(`${start_date}T00:00:00Z`);
  const end = new Date(`${end_date}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    throw new LeaveServiceError('Invalid leave dates', 400, 'INVALID_DATES');
  }

  const totalDays = computeTotalDays(start_date, end_date);
  const approver = await resolveApprover(admin, caller);

  const { data, error } = await admin
    .from('leave_requests')
    .insert({
      user_id: caller.id,
      company_id: caller.company_id,
      leave_type,
      start_date,
      end_date,
      total_days: totalDays,
      reason: reason?.trim() || 'No reason provided',
      document_url: document_url || null,
      status: LEAVE_STATUS.PENDING,
    })
    .select('*')
    .single();

  if (error) {
    throw new LeaveServiceError(error.message, 500, 'INSERT_FAILED');
  }

  const leaveYear = new Date(`${start_date}T00:00:00Z`).getUTCFullYear();
  await Promise.all([
    adjustLeaveBalance(admin, caller.id, leave_type, leaveYear, totalDays),
    insertAudit(admin, caller.id, caller.company_id, {
      action: 'LEAVE_REQUESTED',
      resource: 'leave_request',
      entity_type: 'leave_request',
      entity_id: data.id,
      details: { leave_type, start_date, end_date, total_days: totalDays, approver_id: approver.id },
    }, req),
  ]);

  await sendNotification(admin, {
    user_id: approver.id,
    type: 'SYSTEM_ALERT',
    title: 'New Leave Request',
    message: `A new ${leave_type} request (${start_date} to ${end_date}) requires your approval.`,
    action_url: '/admin/leave-management',
  });

  return data as LeaveRow;
}

export interface ActionPlan {
  allowed: boolean;
  expectedCurrent?: string;
  status?: number;
  code?: string;
  message?: string;
}

/**
 * Decides whether `caller` may move `leave` to `target`.
 * Returns the current status that must be enforced atomically for the
 * transition (prevents double-approval / already-processed requests).
 */
export function planTransition(
  caller: UserProfile,
  requester: UserProfile,
  leave: LeaveRow,
  target: string
): ActionPlan {
  if (requester.id === caller.id) {
    return {
      allowed: false,
      status: 403,
      code: 'CANNOT_APPROVE_OWN_LEAVE',
      message: 'You cannot approve your own leave request',
    };
  }

  const callerRole = normalizeRole(caller.role);
  const requesterRole = normalizeRole(requester.role);
  const current = leave.status;

  if (isManagerRole(callerRole)) {
    if (!isEmployeeRole(requesterRole)) {
      return {
        allowed: false,
        status: 403,
        code: 'FORBIDDEN',
        message: 'Managers may only act on leave requests from their direct reports',
      };
    }
    if (requester.manager_id !== caller.id) {
      return {
        allowed: false,
        status: 403,
        code: 'NOT_DIRECT_REPORT',
        message: 'This leave request does not belong to a direct report',
      };
    }
    if (target !== LEAVE_STATUS.MANAGER_APPROVED && target !== LEAVE_STATUS.REJECTED) {
      return {
        allowed: false,
        status: 403,
        code: 'INVALID_TRANSITION',
        message: 'Managers may only mark requests as Manager Approved or Rejected',
      };
    }
    if (current !== LEAVE_STATUS.PENDING) {
      return {
        allowed: false,
        status: 409,
        code: 'ALREADY_PROCESSED',
        message: 'Leave request has already been processed',
      };
    }
    return { allowed: true, expectedCurrent: LEAVE_STATUS.PENDING };
  }

  if (isAdminRole(callerRole)) {
    if (isEmployeeRole(requesterRole)) {
      if (target === LEAVE_STATUS.APPROVED) {
        if (current !== LEAVE_STATUS.MANAGER_APPROVED) {
          return {
            allowed: false,
            status: 409,
            code: 'MANAGER_APPROVAL_REQUIRED',
            message: 'Leave request must first be approved by the manager',
          };
        }
        return { allowed: true, expectedCurrent: LEAVE_STATUS.MANAGER_APPROVED };
      }
      // REJECTED / INFO_REQUESTED may be actioned while PENDING or MANAGER_APPROVED
      if (current !== LEAVE_STATUS.PENDING && current !== LEAVE_STATUS.MANAGER_APPROVED) {
        return {
          allowed: false,
          status: 409,
          code: 'ALREADY_PROCESSED',
          message: 'Leave request has already been processed',
        };
      }
      return { allowed: true, expectedCurrent: current };
    }

    // Requester is a manager/admin/super_admin: the admin is the designated approver.
    if (current !== LEAVE_STATUS.PENDING) {
      return {
        allowed: false,
        status: 409,
        code: 'ALREADY_PROCESSED',
        message: 'Leave request has already been processed',
      };
    }
    return { allowed: true, expectedCurrent: LEAVE_STATUS.PENDING };
  }

  return {
    allowed: false,
    status: 403,
    code: 'FORBIDDEN',
    message: 'Only managers and admins can approve leave requests',
  };
}

export interface ActionLeaveInput {
  leave_id: string;
  status: string;
  admin_remarks?: string | null;
}

export async function actionLeave(
  admin: SupabaseClient,
  caller: UserProfile,
  input: ActionLeaveInput,
  req?: NextRequest
): Promise<LeaveRow> {
  const { leave_id, status, admin_remarks } = input;

  if (!leave_id) {
    throw new LeaveServiceError('Missing leave_id', 400, 'MISSING_FIELDS');
  }

  const target = String(status || '').toUpperCase();
  if (!ACTION_TARGETS.includes(target)) {
    throw new LeaveServiceError('Invalid status', 400, 'INVALID_STATUS');
  }

  const { data: leave } = await admin
    .from('leave_requests')
    .select('*')
    .eq('id', leave_id)
    .maybeSingle();

  if (!leave) {
    throw new LeaveServiceError('Leave request not found', 404, 'NOT_FOUND');
  }

  const requester = await fetchProfile(admin, leave.user_id);
  if (!requester) {
    throw new LeaveServiceError('Leave request owner no longer exists', 404, 'NOT_FOUND');
  }

  if (!caller.company_id || !requester.company_id || caller.company_id !== requester.company_id) {
    throw new LeaveServiceError('Cross-company approval is not allowed', 403, 'CROSS_COMPANY_FORBIDDEN');
  }

  const plan = planTransition(caller, requester, leave as LeaveRow, target);
  if (!plan.allowed || !plan.expectedCurrent) {
    throw new LeaveServiceError(plan.message || 'Action not allowed', plan.status || 403, plan.code);
  }

  const { data: updated, error } = await admin
    .from('leave_requests')
    .update({
      status: target,
      admin_remarks: admin_remarks || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', leave.id)
    .eq('status', plan.expectedCurrent)
    .select('*')
    .maybeSingle();

  if (error) {
    throw new LeaveServiceError(error.message, 500, 'UPDATE_FAILED');
  }

  if (!updated) {
    throw new LeaveServiceError('Leave request has already been processed', 409, 'ALREADY_PROCESSED');
  }

  const leaveYear = new Date(`${leave.start_date}T00:00:00Z`).getUTCFullYear();
  const pendingDelta = target === LEAVE_STATUS.APPROVED || target === LEAVE_STATUS.REJECTED ? -leave.total_days : 0;
  const usedDelta = target === LEAVE_STATUS.APPROVED ? leave.total_days : 0;

  await Promise.all([
    adjustLeaveBalance(admin, requester.id, leave.leave_type, leaveYear, pendingDelta, usedDelta),
    recordApprovalRequest(admin, leave, caller.id, target, admin_remarks),
    insertAudit(admin, caller.id, caller.company_id, {
      action: `LEAVE_${target}`,
      resource: 'leave_request',
      entity_type: 'leave_request',
      entity_id: leave.id,
      details: { status: target, admin_remarks: admin_remarks || null },
      changes: { from: leave.status, to: target },
    }, req),
  ]);

  await sendNotification(admin, {
    user_id: requester.id,
    type: 'SYSTEM_ALERT',
    title: `Leave Request ${target.replace('_', ' ')}`,
    message: `Your leave request for ${leave.start_date} to ${leave.end_date} has been ${target.toLowerCase().replace('_', ' ')}. Remarks: ${admin_remarks || 'None'}`,
  });

  return updated as LeaveRow;
}

export async function cancelLeave(
  admin: SupabaseClient,
  caller: UserProfile,
  leaveId: string,
  req?: NextRequest
): Promise<void> {
  if (!leaveId) {
    throw new LeaveServiceError('Missing leave_id', 400, 'MISSING_FIELDS');
  }

  const { data: leave } = await admin
    .from('leave_requests')
    .select('id, user_id, company_id, status, total_days, leave_type, start_date')
    .eq('id', leaveId)
    .maybeSingle();

  if (!leave) {
    throw new LeaveServiceError('Leave request not found', 404, 'NOT_FOUND');
  }

  if (leave.user_id !== caller.id) {
    throw new LeaveServiceError('Forbidden: Cannot cancel another user\'s leave request', 403, 'FORBIDDEN');
  }

  if (leave.status !== LEAVE_STATUS.PENDING) {
    throw new LeaveServiceError('Only pending requests can be cancelled', 400, 'ALREADY_PROCESSED');
  }

  const { data: deleted, error } = await admin
    .from('leave_requests')
    .delete()
    .eq('id', leave.id)
    .eq('status', LEAVE_STATUS.PENDING)
    .select('id');

  if (error) {
    throw new LeaveServiceError(error.message, 500, 'DELETE_FAILED');
  }

  if (!deleted || deleted.length === 0) {
    throw new LeaveServiceError('Leave request has already been processed', 409, 'ALREADY_PROCESSED');
  }

  const leaveYear = new Date(`${leave.start_date}T00:00:00Z`).getUTCFullYear();
  await Promise.all([
    adjustLeaveBalance(admin, caller.id, leave.leave_type, leaveYear, -leave.total_days),
    insertAudit(admin, caller.id, caller.company_id, {
      action: 'LEAVE_CANCELLED',
      resource: 'leave_request',
      entity_type: 'leave_request',
      entity_id: leave.id,
      details: { status: 'CANCELLED' },
      changes: { from: leave.status, to: 'CANCELLED' },
    }, req),
  ]);
}

export interface EnrichedLeave extends LeaveRow {
  user_name: string;
  user_email: string;
  user_role: string;
  requester_manager_id: string | null;
}

export interface ListLeaveFilters {
  userId?: string | null;
  includeSelfForManager?: boolean;
}

export async function fetchLeaveRequests(
  admin: SupabaseClient,
  caller: UserProfile,
  filters: ListLeaveFilters = {}
): Promise<EnrichedLeave[]> {
  const callerRole = normalizeRole(caller.role);

  const enrich = (rows: unknown[]): EnrichedLeave[] =>
    rows.map((r) => {
      const row = r as LeaveRow & {
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
        user_name: row.users?.full_name || 'Unknown User',
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
    let q = admin.from('leave_requests').select(select).order('created_at', { ascending: false });
    if (caller.company_id) q = q.eq('users.company_id', caller.company_id);
    if (filters.userId) q = q.eq('user_id', filters.userId);
    const { data, error } = await q;
    if (error) throw new LeaveServiceError(error.message, 500, 'FETCH_FAILED');
    rows = data || [];
  } else if (isManagerRole(callerRole)) {
    let q = admin.from('leave_requests').select(select).order('created_at', { ascending: false });
    if (caller.company_id) q = q.eq('users.company_id', caller.company_id);
    if (filters.userId) {
      q = q.eq('user_id', filters.userId);
    } else {
      q = q.eq('users.manager_id', caller.id);
    }
    const { data, error } = await q;
    if (error) throw new LeaveServiceError(error.message, 500, 'FETCH_FAILED');
    rows = data || [];

    if (filters.includeSelfForManager && !filters.userId) {
      let own = admin.from('leave_requests').select(select).order('created_at', { ascending: false });
      if (caller.company_id) own = own.eq('users.company_id', caller.company_id);
      own = own.eq('user_id', caller.id);
      const { data: ownData, error: ownError } = await own;
      if (ownError) throw new LeaveServiceError(ownError.message, 500, 'FETCH_FAILED');
      rows = [...(ownData || []), ...rows];
    }
  } else {
    let q = admin.from('leave_requests').select(select).order('created_at', { ascending: false });
    if (caller.company_id) q = q.eq('users.company_id', caller.company_id);
    q = q.eq('user_id', caller.id);
    const { data, error } = await q;
    if (error) throw new LeaveServiceError(error.message, 500, 'FETCH_FAILED');
    rows = data || [];
  }

  return enrich(rows);
}
