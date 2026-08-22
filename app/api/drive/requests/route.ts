import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const adminClient = await createAdminClient();
    const { data: requests, error } = await adminClient
      .from('drive_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, data: requests || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    const isMock = process.env.NEXT_PUBLIC_MOCK_AUTH === 'true';
    if (!session && !isMock) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { user_id, user_name, file_id, file_name, reason } = body;
    
    if (!user_id || !file_id) return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 });

    const adminClient = await createAdminClient();
    const { data, error } = await adminClient
      .from('drive_requests')
      .insert([{ user_id, user_name, file_id, file_name, reason, status: 'PENDING' }])
      .select().single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    const isMock = process.env.NEXT_PUBLIC_MOCK_AUTH === 'true';
    if (!session && !isMock) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { request_id, status, admin_id } = body;

    const adminClient = await createAdminClient();
    const { data, error } = await adminClient
      .from('drive_requests')
      .update({ status, admin_id })
      .eq('id', request_id)
      .select().single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  // Option to delete requests if needed
  return NextResponse.json({ success: true });
}
