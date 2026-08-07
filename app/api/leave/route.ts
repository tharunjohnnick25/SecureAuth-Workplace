import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendNotification } from '@/lib/notify';
import { isMockMode } from '@/lib/mock-employees';
import { MockDB, saveMockDB } from '@/lib/mock-db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leave_type, start_date, end_date, total_days, reason, document_url, user_id } = body;

    if (!leave_type || !start_date || !end_date || !total_days || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (isMockMode()) {
      const now = new Date().toISOString();
      const newRequest = {
        id: `lr-${Date.now()}`,
        user_id: user_id || 'mock',
        user_name: 'John Employee',
        type: leave_type,
        leave_type,
        start_date,
        end_date,
        total_days,
        reason,
        document_url: document_url || null,
        status: 'Pending',
        created_at: now,
      };
      MockDB.leave_requests = MockDB.leave_requests || [];
      MockDB.leave_requests.push(newRequest as any);
      saveMockDB();
      return NextResponse.json({ message: 'Leave request submitted successfully', data: newRequest });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    // In a real app with mock auth, we might pass the user_id in the body if session management is custom
    let userId = user?.id;
    if (!userId && body.user_id) {
      userId = body.user_id;
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('leave_requests')
      .insert([{
        user_id: userId,
        leave_type,
        start_date,
        end_date,
        total_days,
        reason,
        document_url,
        status: 'PENDING'
      }])
      .select();

    if (error) {
      throw error;
    }

    // Insert notification for admins (suppressed if the recipient is in focus mode)
    await sendNotification(supabase, {
      user_id: userId, // In reality, this should be sent to admin users
      type: 'SYSTEM_ALERT',
      title: 'New Leave Request',
      message: `A new ${leave_type} request has been submitted.`
    });

    return NextResponse.json({ message: 'Leave request submitted successfully', data: data[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');

    if (isMockMode()) {
      let requests = (MockDB.leave_requests || []).slice();
      if (userId) {
        requests = requests.filter((r: any) => r.user_id === userId);
      }
      const normalized = requests.map((r: any) => ({
        ...r,
        leave_type: r.leave_type || r.type || 'Leave',
      }));
      normalized.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return NextResponse.json({ data: normalized });
    }

    const supabase = await createServerSupabaseClient();
    let query = supabase.from('leave_requests').select('*').order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
