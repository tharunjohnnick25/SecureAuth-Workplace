import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }

    const { data, error } = await supabase.from('roles').select('*').order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message, success: false }, { status: 500 });
    }

    return NextResponse.json({ data: data || [], success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch roles', success: false }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Auth Check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }

    // Role Check
    const { data: currentUser } = await supabase.from('users').select('role').eq('id', session.user.id).single();
    if (!currentUser || !['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role?.toUpperCase() || '')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required', success: false }, { status: 403 });
    }

    const { name, description, permissions } = await req.json();
    const trimmedName = name ? String(name).trim() : '';

    if (!trimmedName || trimmedName.length < 2) {
      return NextResponse.json(
        { error: 'Role name must be at least 2 characters long', success: false },
        { status: 400 }
      );
    }

    const { data: existing } = await supabase.from('roles').select('name').ilike('name', trimmedName).maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: `Role "${trimmedName}" already exists`, success: false },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from('roles')
      .insert([
        {
          name: trimmedName,
          description: description || null,
          permissions: permissions || {},
          is_system: false,
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message || 'Database error creating role', success: false }, { status: 500 });
    }

    return NextResponse.json({ data, success: true }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Server error creating role', success: false },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Auth Check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }

    // Role Check
    const { data: currentUser } = await supabase.from('users').select('role').eq('id', session.user.id).single();
    if (!currentUser || !['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role?.toUpperCase() || '')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required', success: false }, { status: 403 });
    }

    const { id, name, description, permissions } = await req.json();
    
    if (!id) {
      return NextResponse.json({ error: 'Role ID is required', success: false }, { status: 400 });
    }

    const trimmedName = name ? String(name).trim() : '';
    if (!trimmedName || trimmedName.length < 2) {
      return NextResponse.json(
        { error: 'Role name must be at least 2 characters long', success: false },
        { status: 400 }
      );
    }

    // Check if name is already taken by another role
    const { data: existing } = await supabase.from('roles').select('id').ilike('name', trimmedName).neq('id', id).maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: `Role "${trimmedName}" already exists`, success: false },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from('roles')
      .update({
        name: trimmedName,
        description: description || null,
        permissions: permissions || {},
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message || 'Database error updating role', success: false }, { status: 500 });
    }

    return NextResponse.json({ data, success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Server error updating role', success: false },
      { status: 500 }
    );
  }
}
