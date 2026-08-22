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

    const authClient = createClient(rawSupabaseUrl, rawAnonKey, {
      global: { headers: { cookie: req.headers.get('cookie') || '' } },
    });

    const { data: { session }, error: authError } = await authClient.auth.getSession();
    if (authError || !session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: profile } = await adminClient
      .from('users')
      .select('company_id, role')
      .eq('id', session.user.id)
      .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify ownership
    const { data: targetEvent } = await adminClient
      .from('security_events')
      .select('*')
      .eq('id', id)
      .eq('company_id', profile.company_id)
      .single();

    if (!targetEvent) {
      return NextResponse.json({ error: 'Security event not found' }, { status: 404 });
    }

    const body = await req.json();
    const { status, reason } = body;

    const validStatuses = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    if ((status === 'RESOLVED' || status === 'DISMISSED') && !reason) {
      return NextResponse.json({ error: 'A reason is required to resolve or dismiss an event' }, { status: 400 });
    }

    // Update using service_role to bypass RLS append-only restriction securely for admins only
    const { data: updatedEvent, error: updateError } = await adminClient
      .from('security_events')
      .update({
        status,
        resolution_reason: reason || null,
        resolved_by: session.user.id,
        resolved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) throw updateError;

    // Audit Log for SOC action
    await adminClient.from('audit_logs').insert({
       company_id: profile.company_id,
       user_id: session.user.id,
       action: 'SECURITY_EVENT_RESOLVED',
       resource: 'security_events',
       entity_id: id,
       details: {
         previous_status: targetEvent.status,
         new_status: status,
         reason: reason
       }
    });

    return NextResponse.json({ success: true, data: updatedEvent });

  } catch (error: any) {
    console.error('Error resolving security event:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
