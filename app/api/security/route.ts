import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse, NextRequest } from 'next/server';
import { requireCompanyAccess, requireRole } from '@/lib/auth';

export const GET = requireRole(['admin', 'super_admin'], requireCompanyAccess(async (req: NextRequest, user, companyId) => {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Explicitly add company filter for defense-in-depth on top of RLS
    const [securityEvents, threatLogs, failedLogins] = await Promise.all([
      supabase.from('security_events').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(100),
      // Assuming threatLogs and login_logs also have company_id per phase 4
      supabase.from('threat_logs').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(100),
      supabase.from('login_history').select('*').eq('company_id', companyId).eq('status', 'FAILURE').order('created_at', { ascending: false }).limit(50),
    ]);

    return NextResponse.json({
      securityEvents: securityEvents.data || [],
      threatLogs: threatLogs.data || [],
      failedLogins: failedLogins.data || [],
      summary: {
        totalEvents: (securityEvents.data || []).length,
        totalThreats: (threatLogs.data || []).length,
        failedLogins: (failedLogins.data || []).length,
      }
    });
  } catch (error: any) {
    console.error('[Security API] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}));
