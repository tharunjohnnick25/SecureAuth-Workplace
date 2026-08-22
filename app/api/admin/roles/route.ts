import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await createAdminClient();
    
    const { data: userProfile } = await admin
      .from('users')
      .select('role, company_id')
      .eq('id', session.user.id)
      .single();
      
    const role = (userProfile?.role || '').toUpperCase();
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, permissions } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Role name is required' }, { status: 400 });
    }

    const { data: newRole, error } = await admin
      .from('roles')
      .insert({
        name,
        description,
        permissions: permissions || {},
        is_system: false
      })
      .select()
      .single();

    if (error) throw error;

    // Log the action to the audit logs table
    await admin.from('audit_logs').insert({
      user_id: session.user.id,
      action: 'ROLE_CREATED',
      resource: 'roles',
      details: { role_name: name, description },
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      entity_type: 'roles',
      entity_id: newRole.id,
      company_id: userProfile?.company_id || null
    });

    return NextResponse.json({ success: true, data: newRole }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating role:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await createAdminClient();
    
    // Check if user is admin or manager (depending on your visibility rules, here we allow logged in users or admins)
    // Actually, roles might need to be readable by HR or admins. Let's just fetch them.
    const { data: roles, error } = await admin
      .from('roles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data: roles });
  } catch (error: any) {
    console.error('Error fetching roles:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
