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
      .from('security_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    const formattedData = (data || []).map((alert: any) => ({
      id: alert.id,
      type: alert.event_type?.replace(/_/g, '') || 'Alert',
      message: alert.details?.message || `Security event detected`,
      severity: alert.severity?.toLowerCase() || 'medium',
      time: alert.created_at
    }));

    return NextResponse.json({ data: formattedData, success: true });
  } catch (error: any) {
    console.error('Error fetching security alerts:', error);
    return NextResponse.json({ error: error.message || 'Server error', success: false }, { status: 500 });
  }
}
