import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isMockMode } from '@/lib/mock-employees';
import { MockDB, saveMockDB } from '@/lib/mock-db';

export async function GET() {
  try {
    if (isMockMode()) {
      return NextResponse.json({ data: MockDB.integrations || [], success: true });
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from('integrations').select('*').order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ data: data || [], success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch integrations', success: false }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, type, target_url, secret_key } = await req.json();

    if (!name || !type) {
      return NextResponse.json({ error: 'Name and Type are required', success: false }, { status: 400 });
    }

    if (isMockMode()) {
      const newIntegration = {
        id: `int-${Date.now()}`,
        name,
        type,
        status: 'Active',
        target_url: target_url || '',
        secret_key: secret_key || '',
        last_sync: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      MockDB.integrations = MockDB.integrations || [];
      MockDB.integrations.unshift(newIntegration);
      saveMockDB();
      return NextResponse.json({ data: newIntegration, success: true }, { status: 201 });
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from('integrations').insert([{
      name,
      type,
      status: 'Active',
      target_url,
      secret_key,
      last_sync: new Date().toISOString()
    }]).select().single();

    if (error) throw error;
    return NextResponse.json({ data, success: true }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create integration', success: false }, { status: 500 });
  }
}
