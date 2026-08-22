import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyAccess } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export const GET = requireCompanyAccess(async (req: NextRequest, user, companyId) => {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(req.url);

    const status = searchParams.get('status') || '';
    const requestedBy = searchParams.get('requester_id');
    
    let query = supabase.from('access_requests').select('*').order('created_at', { ascending: false });

    // Enforce Company Isolation
    query = query.eq('company_id', companyId);

    // Role-based visibility
    const role = user.role?.toUpperCase() || '';
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(role);

    if (!isAdmin) {
      if (role === 'MANAGER') {
        // Managers see requests from their direct reports (plus their own)
        const { data: teamIds } = await supabase
          .from('users')
          .select('id')
          .eq('manager_id', user.id)
          .eq('company_id', companyId);
        const ids = [...new Set([...(teamIds || []).map((t: any) => t.id), user.id])];
        if (ids.length > 0) {
          query = query.in('requester_id', ids);
        } else {
          query = query.eq('requester_id', user.id);
        }
      } else {
        // Employees only see their own requests
        query = query.eq('requester_id', user.id);
      }
    }

    if (requestedBy) query = query.eq('requester_id', requestedBy);
    if (status) query = query.eq('status', status.toUpperCase());

    const { data, error } = await query;
    if (error) throw error;

    // Fetch users manually to bypass schema cache relationship errors
    const userIds = [...new Set(data.map((r: any) => r.requester_id).filter(Boolean))];
    let usersMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: usersData } = await supabase.from('users').select('id, full_name, email, department').in('id', userIds);
      if (usersData) {
        usersData.forEach(u => {
          usersMap[u.id] = u;
        });
      }
    }

    const enrichedData = data.map((req: any) => {
       const u = usersMap[req.requester_id] || {};
       return {
         ...req,
         user_name: u.full_name || 'Unknown User',
         email: u.email || '',
         department: u.department || ''
       };
    });

    return NextResponse.json({ data: enrichedData, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch access requests', success: false }, { status: 500 });
  }
});

export const POST = requireCompanyAccess(async (req: NextRequest, user, companyId) => {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await req.json();
    
    if (!body.module || !body.reason) {
      return NextResponse.json({ error: 'Missing required fields: module, reason', success: false }, { status: 400 });
    }

    // Check for duplicate pending requests
    const { data: existingPending, error: pendingCheckError } = await supabase
      .from('access_requests')
      .select('id')
      .eq('requester_id', user.id)
      .eq('company_id', companyId)
      .eq('module', body.module)
      .eq('status', 'PENDING')
      .maybeSingle();

    if (existingPending) {
        return NextResponse.json({ error: 'You already have a pending request for this module.', success: false }, { status: 409 });
    }

    const newRequest = {
      requester_id: user.id,
      company_id: companyId,
      module: body.module,
      reason: body.reason,
      duration_hours: body.duration_hours || null,
      status: 'PENDING'
    };

    const { data, error } = await supabase.from('access_requests').insert([newRequest]).select().single();
    if (error) throw error;

    await logAuditEvent(user.id, companyId, {
        action: 'ACCESS_REQUEST_CREATED',
        resource: 'access_requests',
        entity_id: data.id,
        details: { module: body.module }
    }, req);

    return NextResponse.json({ data, success: true }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to submit request', success: false }, { status: 500 });
  }
});
