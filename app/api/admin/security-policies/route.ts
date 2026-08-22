import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
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

    const { data: policies, error } = await adminClient
      .from('security_policies')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('priority', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ data: policies });

  } catch (error: any) {
    console.error('Error fetching policies:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
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

    const body = await req.json();
    const { name, action, priority, conditions, decision, is_active } = body;

    if (!name || !action || !decision) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const validActions = ['LOGIN', 'FACE_VERIFY', 'DEVICE_REGISTER', 'ATTENDANCE_CHECK_IN', 'ATTENDANCE_CHECK_OUT', 'SENSITIVE_OPERATION'];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const validDecisions = ['ALLOW', 'MFA_REQUIRED', 'STEP_UP_REQUIRED', 'DENY', 'BLOCK'];
    if (!validDecisions.includes(decision)) {
      return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
    }

    // Basic validation of conditions schema
    if (conditions && !Array.isArray(conditions)) {
      return NextResponse.json({ error: 'Conditions must be an array' }, { status: 400 });
    }

    const { data: newPolicy, error: insertError } = await adminClient
      .from('security_policies')
      .insert({
        company_id: profile.company_id,
        name,
        action,
        priority: priority || 10,
        conditions: conditions || [],
        decision,
        is_active: is_active ?? true
      })
      .select('*')
      .single();

    if (insertError) throw insertError;

    // Audit Log
    await adminClient.from('audit_logs').insert({
       company_id: profile.company_id,
       user_id: session.user.id,
       action: 'POLICY_CREATED',
       resource: 'security_policies',
       entity_id: newPolicy.id,
       details: newPolicy
    });

    return NextResponse.json({ success: true, data: newPolicy });

  } catch (error: any) {
    console.error('Error creating policy:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
