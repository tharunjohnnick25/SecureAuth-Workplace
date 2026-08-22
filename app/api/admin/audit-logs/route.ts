import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse, NextRequest } from 'next/server';
import { requireCompanyAccess, requireRole } from '@/lib/auth';

export const GET = requireRole(['admin', 'super_admin', 'manager'], requireCompanyAccess(async (req: NextRequest, user, companyId) => {
  try {
    const supabase = await createAdminClient();
    const url = new URL(req.url);
    
    // Pagination parameters
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    const maxLimit = Math.min(limit, 1000); // hard cap

    const { data, error } = await supabase
      .from('audit_logs')
      .select('*, users(email)')
      .eq('company_id', companyId) // Explicit check even though RLS is active
      .order('created_at', { ascending: false })
      .range(offset, offset + maxLimit - 1);

    if (error) throw error;

    return NextResponse.json({ data: data || [], success: true });
  } catch (error: any) {
    console.error('[Admin API] Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Server error', success: false }, { status: 500 });
  }
}));
