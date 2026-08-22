import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('*, device:devices(*)')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .order('last_active', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ sessions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { sessionId } = await request.json();
    const supabase = await createServerSupabaseClient();
    
    // Verify ownership
    const { data: sessionData, error: fetchError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
      
    if (fetchError || !sessionData || sessionData.user_id !== (await supabase.auth.getUser()).data.user?.id) {
       return NextResponse.json({ error: 'Unauthorized or session not found' }, { status: 403 });
    }

    const { error } = await supabase
      .from('sessions')
      .update({ is_active: false })
      .eq('id', sessionId);

    if (error) throw error;

    // Audit log
    const { createClient } = await import('@supabase/supabase-js');
    const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    
    await adminClient.from('audit_logs').insert({
        actor_id: sessionData.user_id,
        action: 'SESSION_REVOKED',
        entity_type: 'session',
        entity_id: sessionId,
        metadata: { device_id: sessionData.device_id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
