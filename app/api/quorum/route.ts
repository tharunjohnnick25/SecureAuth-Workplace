import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const { action_type } = body;

    const { data, error } = await supabase
      .from('quorum_requests')
      .insert({
        requester_id: session.user.id,
        action_type: action_type || 'HIGH_RISK_SESSION',
        status: 'PENDING'
      })
      .select()
      .single();

    if (error) throw error;
    
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    // If ID is provided, fetch specific request status (used for polling by requester)
    if (id) {
      const { data, error } = await supabase
        .from('quorum_requests')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      return NextResponse.json({ data });
    }
    
    // Otherwise fetch all pending requests for the admin dashboard
    // In a real app, you would verify if the user is an admin here
    const { data, error } = await supabase
      .from('quorum_requests')
      .select('*, users!quorum_requests_requester_id_fkey(full_name, email)')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('quorum_requests')
      .update({
        status,
        approver_id: session.user.id
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
