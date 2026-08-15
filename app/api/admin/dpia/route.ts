import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, HttpError } from '@/lib/face/auth';
import { computeDpiaRisk, type DpiaSubmission } from '@/lib/face/dpia';
import { reportError } from '@/lib/face/monitoring';
import { isMockMode } from '@/lib/mock-employees';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface DpiaBody extends DpiaSubmission {
  status?: 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED';
}

/** GET /api/admin/dpia — list DPIA records (metadata only). */
export async function GET() {
  try {
    await requireAdmin();

    if (isMockMode()) {
      return NextResponse.json({ success: true, data: [] });
    }

    const admin = await createAdminClient();
    const { data, error } = await admin
      .from('dpia_records')
      .select('id, employee_scope, risk_level, status, approved_at, created_at, updated_at, created_by')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    reportError('dpia-list', err);
    return NextResponse.json({ error: 'Failed to list DPIA records' }, { status: 500 });
  }
}

/** POST /api/admin/dpia — create a new DPIA assessment with computed risk. */
export async function POST(req: NextRequest) {
  try {
    const adminProfile = await requireAdmin();
    let body: DpiaBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const risk = computeDpiaRisk(body);
    const status = body.status ?? 'DRAFT';

    if (isMockMode()) {
      return NextResponse.json({
        success: true,
        data: {
          id: crypto.randomUUID(),
          employee_scope: body.employeeScope ?? 'ALL_EMPLOYEES',
          risk_level: risk.riskLevel,
          score: risk.score,
          status,
          created_by: adminProfile.id,
        },
      });
    }

    const admin = await createAdminClient();
    const { data, error } = await admin
      .from('dpia_records')
      .insert({
        created_by: adminProfile.id,
        employee_scope: body.employeeScope ?? 'ALL_EMPLOYEES',
        answers: (body.answers ?? {}) as Record<string, unknown>,
        risk_level: risk.riskLevel,
        status,
      })
      .select('id, employee_scope, risk_level, status, approved_at, created_at, updated_at, created_by')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: { ...data, score: risk.score } });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    reportError('dpia-create', err);
    return NextResponse.json({ error: 'Failed to save DPIA record' }, { status: 500 });
  }
}
