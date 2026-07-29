import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Auth Check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('login_logs')
      .select('*, users(email)')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    const formattedData = (data || []).map((log: any) => ({
      id: log.id,
      user: log.users?.email || 'Unknown',
      action: log.status === 'SUCCESS' || log.status === 'success' ? 'Login successful' : 'Login failed',
      timestamp: log.created_at,
      status: log.status === 'SUCCESS' || log.status === 'success' ? 'success' : 'danger',
      ip: log.ip_address,
    }));

    return NextResponse.json({ data: formattedData, success: true });
  } catch (error: any) {
    console.error('Error fetching recent activities:', error);
    return NextResponse.json({ error: error.message || 'Server error', success: false }, { status: 500 });
  }
}
