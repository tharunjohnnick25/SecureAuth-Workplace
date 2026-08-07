import { NextRequest, NextResponse } from 'next/server';
import { MockDB, saveMockDB } from '@/lib/mock-db';
import { createAdminClient } from '@/lib/supabase/server';

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
      let updatedCount = 0;
      MockDB.notifications.forEach((n: any) => {
        if (n.user_id === userId && !n.is_read) {
          n.is_read = true;
          updatedCount++;
        }
      });
      saveMockDB();
      return NextResponse.json({ success: true, updated: updatedCount });
    }

    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .select();

    if (error) throw error;
    
    return NextResponse.json({ success: true, updated: data?.length || 0 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
