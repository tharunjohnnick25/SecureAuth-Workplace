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
    const { data: targetPolicy } = await adminClient
      .from('security_policies')
      .select('*')
      .eq('id', id)
      .eq('company_id', profile.company_id)
      .single();

    if (!targetPolicy) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    const body = await req.json();
    const updatePayload: any = {};
    const allowedFields = ['name', 'action', 'priority', 'conditions', 'decision', 'is_active'];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updatePayload[field] = body[field];
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
    }

    if (updatePayload.conditions && !Array.isArray(updatePayload.conditions)) {
      return NextResponse.json({ error: 'Conditions must be an array' }, { status: 400 });
    }

    const { data: updatedPolicy, error: updateError } = await adminClient
      .from('security_policies')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) throw updateError;

    // Audit Log
    await adminClient.from('audit_logs').insert({
       company_id: profile.company_id,
       user_id: session.user.id,
       action: 'POLICY_UPDATED',
       resource: 'security_policies',
       entity_id: id,
       details: { changes: updatePayload, original: targetPolicy }
    });

    return NextResponse.json({ success: true, data: updatedPolicy });

  } catch (error: any) {
    console.error('Error updating policy:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
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

    // Soft delete
    const { error: deleteError } = await adminClient
      .from('security_policies')
      .update({ is_active: false })
      .eq('id', id)
      .eq('company_id', profile.company_id);

    if (deleteError) throw deleteError;

    // Audit Log
    await adminClient.from('audit_logs').insert({
       company_id: profile.company_id,
       user_id: session.user.id,
       action: 'POLICY_DISABLED',
       resource: 'security_policies',
       entity_id: id
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error deleting policy:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
