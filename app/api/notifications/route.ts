import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sendNotification } from '@/lib/notify';

export async function POST(req: NextRequest) {
  try {
    const { userId, title, message, type } = await req.json();

    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    // Only allow admins to send arbitrary notifications or allow the system internally
    const { data: currentUser } = await supabase.from('users').select('role, company_id').eq('id', session.user.id).single();
    if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Verify tenant
    if (currentUser.company_id) {
       const { data: targetUser } = await supabase.from('users').select('company_id').eq('id', userId).single();
       if (targetUser?.company_id !== currentUser.company_id) {
           return NextResponse.json({ success: false, error: 'Forbidden: Different organization' }, { status: 403 });
       }
    }

    const result = await sendNotification(supabase, { user_id: userId, title, message, type: type || 'INFO' });

    if (!result.suppressed && result.error) throw result.error;
    return NextResponse.json({ success: true, suppressed: result.suppressed });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
