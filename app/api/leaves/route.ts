import { NextRequest, NextResponse } from 'next/server';
import { MockDB, saveMockDB } from '@/lib/mock-db';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { MockEmployees } from '@/lib/mock-employees';
import { resolveCompanyKey } from '@/lib/companies';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');
    const adminId = searchParams.get('admin_id');
    const managerId = searchParams.get('manager_id');
    let adminCompany = searchParams.get('company_name') || '';

    let data = MockDB.leave_requests;

    if (userId) {
      data = data.filter((l) => l.user_id === userId);
    }

    if (managerId) {
      data = data.filter((l) => {
        let mockEmp = MockEmployees.getById(l.user_id) as any;
        if (!mockEmp) mockEmp = MockDB.employees.find(e => e.id === l.user_id);
        return mockEmp?.manager_id === managerId;
      });
    }

    if (adminId) {
      // Resolve the admin's canonical company key from the query param, the
      // admin record, and (as a last resort) the Supabase user row.
      let mockAdmin = MockEmployees.getById(adminId) as any;
      if (!mockAdmin) mockAdmin = MockDB.employees.find(e => e.id === adminId);

      let adminCompanyName = adminCompany || mockAdmin?.company_name || '';
      if (!adminCompanyName) {
        const supabase = await createServerSupabaseClient();
        const { data: userData } = await supabase.from('users').select('company_name').eq('id', adminId).single();
        if (userData?.company_name) adminCompanyName = userData.company_name;
      }

      const adminKey = resolveCompanyKey({
        email: mockAdmin?.email || '',
        company_name: adminCompanyName,
      });

      if (adminKey) {
        // Fetch all Supabase users to resolve their company names
        const supabase = await createServerSupabaseClient();
        const { data: allSupabaseUsers } = await supabase.from('users').select('id, company_name');

        data = data.filter(l => {
          let mockEmp = MockEmployees.getById(l.user_id) as any;
          if (!mockEmp) mockEmp = MockDB.employees.find(e => e.id === l.user_id);

          const empEmail = mockEmp?.email || (l as any).email || '';
          const sbUser = allSupabaseUsers?.find(u => u.id === l.user_id);
          const reqKey = resolveCompanyKey({
            email: empEmail,
            company_name: mockEmp?.company_name || sbUser?.company_name || '',
          });

          if (reqKey === adminKey) {
            // Attach identity for admin visibility
            (l as any).email = empEmail;
            if (mockEmp?.full_name && l.user_name === 'JOHN User') {
               l.user_name = mockEmp.full_name;
            }
            return true;
          }
          return false;
        });
      } else {
        // Fail closed if we cannot determine the admin's company
        data = [];
      }
    }

    // Sort descending by created_at
    data = data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ data, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch leaves', success: false }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, user_name, type, start_date, end_date, reason } = body;

    if (!user_id || !start_date || !end_date) {
      return NextResponse.json({ error: 'Missing required fields', success: false }, { status: 400 });
    }

    const newRequest = {
      id: `lr-${Date.now()}`,
      user_id,
      user_name: user_name || 'Unknown Employee',
      type: type || 'Annual Leave',
      start_date,
      end_date,
      reason: reason || '',
      status: 'Pending',
      created_at: new Date().toISOString()
    };

    MockDB.leave_requests.push(newRequest);
    saveMockDB();

    return NextResponse.json({ data: newRequest, success: true }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create leave request', success: false }, { status: 500 });
  }
}
