import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = session.user.id;
    const { data, error } = await supabase.from('sessions').select('*').eq('user_id', userId).order('last_active', { ascending: false });
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { sessionId, action } = await req.json();
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = session.user.id;
    if (action === 'revoke' && sessionId) {
      const { error } = await supabase.from('sessions').update({ is_active: false }).eq('id', sessionId).eq('user_id', userId);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === 'revoke_all') {
      const { error } = await supabase.from('sessions').update({ is_active: false }).eq('user_id', userId);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
