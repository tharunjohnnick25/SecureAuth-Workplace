import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const checks: Record<string, any> = {
    timestamp: new Date().toISOString(),
    status: 'ok',
    services: {},
  };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.getSession();
    checks.services.auth = {
      status: error ? 'error' : 'ok',
      message: error ? error.message : 'Auth service connected',
    };
    checks.services.supabase_url = process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing';
  } catch (err: any) {
    checks.services.auth = { status: 'error', message: err.message };
    checks.status = 'degraded';
  }

  try {
    const admin = await createAdminClient();
    const { data, error } = await admin.from('users').select('id').limit(1);
    checks.services.database = {
      status: error ? 'error' : 'ok',
      message: error ? error.message : 'Database connected',
      hasData: (data || []).length > 0,
    };
  } catch (err: any) {
    checks.services.database = { status: 'error', message: err.message };
    checks.status = 'degraded';
  }

  const allOk = Object.values(checks.services).every((s: any) => s.status === 'ok' || s.status === 'configured');
  if (!allOk) checks.status = 'degraded';

  return NextResponse.json(checks, { status: allOk ? 200 : 503 });
}
