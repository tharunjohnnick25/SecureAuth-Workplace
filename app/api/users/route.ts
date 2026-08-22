import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = await createServerSupabaseClient();
    const { data: profile } = await adminClient.from('users').select('role').eq('id', session.user.id).single();
    
    const isAdmin = profile && ['admin', 'super_admin'].includes(profile.role);
    const query = supabase.from('users').select('*');

    if (!isAdmin) {
      query.eq('id', session.user.id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ users: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
