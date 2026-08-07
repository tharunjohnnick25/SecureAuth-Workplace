import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { MockDB } from '@/lib/mock-db';
import { isMockMode } from '@/lib/mock-employees';
import { sendNotification } from '@/lib/notify';

export async function POST(req: NextRequest) {
  try {
    const { userId, title, message, type } = await req.json();

    if (isMockMode()) {
      const result = await sendNotification(null, { user_id: userId, title, message, type: type || 'INFO' });
      return NextResponse.json({ success: true, data: result.data, suppressed: result.suppressed });
    }

    const supabase = await createServerSupabaseClient();
    const result = await sendNotification(supabase, { user_id: userId, title, message, type: type || 'INFO' });

    if (!result.suppressed && result.error) throw result.error;
    return NextResponse.json({ success: true, suppressed: result.suppressed });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    if (isMockMode()) {
      // In mock mode, we try to get user id from query param or just return all
      // For a real implementation, we'd mock auth properly, but let's just return the mock array
      const { searchParams } = new URL(req.url);
      const userId = searchParams.get('user_id');
      
      let data = MockDB.notifications;
      if (userId) {
        data = data.filter((n) => n.user_id === userId);
      }
      data = data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      return NextResponse.json(data);
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
