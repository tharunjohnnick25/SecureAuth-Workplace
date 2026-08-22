import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyAccess } from '@/lib/auth';

export const GET = requireCompanyAccess(async (req: NextRequest, user, companyId) => {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(req.url);

    const activeOnly = searchParams.get('active_only') === 'true';
    
    let query = supabase.from('user_permissions').select(`
        *,
        users!user_id (
           full_name,
           email,
           department
        )
    `).order('created_at', { ascending: false });

    // Enforce Company Isolation
    query = query.eq('company_id', companyId);

    // Role-based visibility
    const role = user.role?.toUpperCase() || '';
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(role);

    if (!isAdmin) {
       // Employees only see their own grants
       query = query.eq('user_id', user.id);
    }

    if (activeOnly) {
       query = query.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;

    const enrichedData = data.map((grant: any) => ({
       ...grant,
       user_name: grant.users?.full_name || 'Unknown User',
       email: grant.users?.email || '',
       department: grant.users?.department || ''
    }));

    return NextResponse.json({ data: enrichedData, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch access grants', success: false }, { status: 500 });
  }
});
