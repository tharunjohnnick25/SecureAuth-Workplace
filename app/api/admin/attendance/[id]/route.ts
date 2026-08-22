import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    // Create a local client to read cookies securely
    const authClient = createClient(rawSupabaseUrl, rawAnonKey, {
      global: {
        headers: {
          cookie: req.headers.get('cookie') || '',
        },
      },
    });

    const { data: { session }, error: authError } = await authClient.auth.getSession();

    if (authError || !session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify caller is an admin
    const { data: adminProfile } = await adminClient
      .from('users')
      .select('company_id, role')
      .eq('id', session.user.id)
      .single();

    if (!adminProfile || (adminProfile.role !== 'admin' && adminProfile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Verify the target attendance record exists and belongs to the admin's company
    const { data: targetRecord } = await adminClient
      .from('attendance')
      .select('*')
      .eq('id', id)
      .eq('company_id', adminProfile.company_id)
      .single();

    if (!targetRecord) {
      return NextResponse.json({ error: 'Attendance record not found or inaccessible' }, { status: 404 });
    }

    const body = await req.json();
    const { check_in, check_out, status, reason } = body;

    if (!reason) {
      return NextResponse.json({ error: 'A reason must be provided for manual corrections' }, { status: 400 });
    }

    const updatePayload: any = {};
    if (check_in !== undefined) updatePayload.check_in = check_in;
    if (check_out !== undefined) updatePayload.check_out = check_out;
    if (status !== undefined) updatePayload.status = status;

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided for update' }, { status: 400 });
    }

    // Perform atomic update
    const { data: updatedRecord, error: updateError } = await adminClient
      .from('attendance')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Correction update error:', updateError);
      return NextResponse.json({ error: 'Failed to apply correction' }, { status: 500 });
    }

    // Explicit Audit Log for Correction
    await adminClient.from('audit_logs').insert({
       company_id: adminProfile.company_id,
       user_id: session.user.id, // The admin doing the correction
       action: 'ATTENDANCE_CORRECTED',
       resource: 'attendance',
       entity_id: id,
       details: {
         target_user_id: targetRecord.user_id,
         reason,
         changes: updatePayload,
         original: {
           check_in: targetRecord.check_in,
           check_out: targetRecord.check_out,
           status: targetRecord.status
         }
       }
    });

    return NextResponse.json({ success: true, data: updatedRecord });

  } catch (error: any) {
    console.error('Error applying attendance correction:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
