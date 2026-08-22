import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminClient = await createAdminClient();
    const { data: profile } = await adminClient
      .from('users')
      .select('id, company_id, role')
      .eq('id', session.user.id)
      .single();

    if (!profile || !profile.company_id) return NextResponse.json({ error: 'Company association required' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const owner = searchParams.get('owner');

    const isAdmin = ['admin', 'super_admin'].includes(profile.role);

    let query = adminClient.from('calendar_events').select('*');

    if (isAdmin && owner) {
      query = query.eq('user_id', owner);
    } else if (isAdmin) {
      const { data: companyUsers } = await adminClient.from('users').select('id').eq('company_id', profile.company_id);
      const ids = (companyUsers || []).map(u => u.id);
      query = query.in('user_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
    } else {
      query = query.eq('user_id', profile.id);
    }

    const { data: events, error } = await query.order('start_time', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ events: events || [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminClient = await createAdminClient();
    const data = await req.json();

    if (!data.title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let startTime = data.start || data.start_time;
    let endTime = data.end || data.end_time;

    if (data.date && (!startTime || !endTime)) {
      startTime = startTime || `${data.date}T09:00:00`;
      endTime = endTime || `${data.date}T17:00:00`;
    }

    if (!startTime || !endTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: newEvent, error } = await adminClient.from('calendar_events').insert({
      user_id: session.user.id,
      title: data.title,
      description: data.description || '',
      start_time: startTime,
      end_time: endTime,
      type: data.type || 'EVENT',
      color: data.color || 'bg-blue-500',
    }).select().single();

    if (error) throw error;

    return NextResponse.json({ event: newEvent }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminClient = await createAdminClient();
    const { data: profile } = await adminClient
      .from('users')
      .select('id, company_id, role')
      .eq('id', session.user.id)
      .single();

    if (!profile || !profile.company_id) return NextResponse.json({ error: 'Company association required' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    const { data: existingEvent } = await adminClient.from('calendar_events').select('id, user_id').eq('id', id).single();
    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const isAdmin = ['admin', 'super_admin'].includes(profile.role);
    if (!isAdmin && existingEvent.user_id !== profile.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await adminClient.from('calendar_events').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}
