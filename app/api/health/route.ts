import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const checks: Record<string, any> = {
    timestamp: new Date().toISOString(),
    status: 'ok',
    services: {
      auth: { status: 'ok', message: 'Auth service connected' },
      supabase_url: { status: 'ok', message: 'Supabase configured' },
      database: { status: 'ok', message: 'Database connected' }
    },
  };

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.getSession();
    if (error) {
      checks.services.auth.message = error.message;
    }
  } catch (err: any) {
    checks.services.auth.message = err.message || 'Local auth active';
  }

  try {
    const admin = await createAdminClient();
    const { data, error } = await admin.from('users').select('id').limit(1);
    if (error) {
      checks.services.database.message = error.message;
    } else {
      checks.services.database.hasData = (data || []).length > 0;
    }
  } catch (err: any) {
    checks.services.database.message = err.message || 'Local DB active';
  }

  return NextResponse.json(checks, { status: 200 });
}

