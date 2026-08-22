import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const isMock = process.env.NEXT_PUBLIC_MOCK_AUTH === 'true';
    let userId = req.nextUrl.searchParams.get('user_id');

    if (!isMock) {
      const supabase = await createServerSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
      userId = session.user.id;

      const adminClient = await createAdminClient();
      const { data, error } = await adminClient
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return NextResponse.json({ success: true, data: data || [] });
    } else {
      // Mock Auth Fallback
      if (!userId) return NextResponse.json({ success: false, error: 'user_id required' }, { status: 400 });
      const { MockEmployees } = await import('@/lib/mock-employees');
      const user = MockEmployees.getById(userId);
      return NextResponse.json({ success: true, data: (user?.notes as any[]) || [] });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const isMock = process.env.NEXT_PUBLIC_MOCK_AUTH === 'true';
    let userId = body.user_id;

    if (!isMock) {
      const supabase = await createServerSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
      userId = session.user.id;

      if (!body.title && !body.content) {
        return NextResponse.json({ success: false, error: 'Note must have a title or content' }, { status: 400 });
      }

      const adminClient = await createAdminClient();
      const { data, error } = await adminClient
        .from('notes')
        .insert({
          user_id: userId,
          title: body.title || '',
          content: body.content || '',
          color: body.color || 'bg-white/5',
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data }, { status: 201 });
    } else {
      // Mock Auth Fallback
      if (!userId) return NextResponse.json({ success: false, error: 'user_id required' }, { status: 400 });
      const { MockEmployees } = await import('@/lib/mock-employees');
      const user = MockEmployees.getById(userId);
      const notes = (user?.notes as any[]) || [];
      const newNote = {
        id: `nt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        user_id: userId,
        title: body.title || '',
        content: body.content || '',
        color: body.color || 'bg-white/5',
        is_pinned: false,
        created_at: new Date().toISOString()
      };
      notes.unshift(newNote);
      MockEmployees.update(userId, { notes });
      return NextResponse.json({ success: true, data: newNote }, { status: 201 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}
