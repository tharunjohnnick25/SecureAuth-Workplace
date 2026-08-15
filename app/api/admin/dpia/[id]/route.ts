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

type Params = { params: Promise<{ id: string }> };

/** GET /api/admin/dpia/[id] — fetch one DPIA record including answers. */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;

    if (isMockMode()) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    const admin = await createAdminClient();
    const { data, error } = await admin.from('dpia_records').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    reportError('dpia-get', err);
    return NextResponse.json({ error: 'Failed to load DPIA record' }, { status: 500 });
  }
}

/** PUT /api/admin/dpia/[id] — update answers, status, and recompute risk. */
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    let body: DpiaBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const risk = computeDpiaRisk(body);
    const status = body.status ?? 'DRAFT';
    const patch: Record<string, unknown> = {
      answers: (body.answers ?? {}) as Record<string, unknown>,
      risk_level: risk.riskLevel,
      status,
    };
    if (status === 'APPROVED') patch.approved_at = new Date().toISOString();
    if (body.employeeScope) patch.employee_scope = body.employeeScope;

    const admin = await createAdminClient();
    const { data, error } = await admin
      .from('dpia_records')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data: { ...data, score: risk.score } });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    reportError('dpia-update', err);
    return NextResponse.json({ error: 'Failed to update DPIA record' }, { status: 500 });
  }
}

/** DELETE /api/admin/dpia/[id] — remove a DPIA record. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;

    const admin = await createAdminClient();
    const { error } = await admin.from('dpia_records').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    reportError('dpia-delete', err);
    return NextResponse.json({ error: 'Failed to delete DPIA record' }, { status: 500 });
  }
}
