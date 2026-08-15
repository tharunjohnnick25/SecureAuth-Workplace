import { NextResponse } from 'next/server';
import { MockDB, saveMockDB } from '@/lib/mock-db';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { MockEmployees } from '@/lib/mock-employees';
import { resolveCompanyKey } from '@/lib/companies';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');
  const adminId = searchParams.get('admin_id');
  const managerId = searchParams.get('manager_id');
  let adminCompany = searchParams.get('company_name') || '';
  
  if (!(MockDB as any).employee_requests) {
    (MockDB as any).employee_requests = [];
  }

  let requests = userId 
    ? (MockDB as any).employee_requests.filter((r: any) => r.user_id === userId)
    : (MockDB as any).employee_requests;

  if (managerId) {
    requests = requests.filter((r: any) => {
      let mockEmp = MockEmployees.getById(r.user_id) as any;
      if (!mockEmp) mockEmp = MockDB.employees.find((e: any) => e.id === r.user_id);
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
      const supabase = await createServerSupabaseClient();
      const { data: allSupabaseUsers } = await supabase.from('users').select('id, company_name');

      requests = requests.filter((r: any) => {
        let mockEmp = MockEmployees.getById(r.user_id) as any;
        if (!mockEmp) mockEmp = MockDB.employees.find(e => e.id === r.user_id);

        const empEmail = mockEmp?.email || r.email || '';
        const sbUser = allSupabaseUsers?.find(u => u.id === r.user_id);
        const reqKey = resolveCompanyKey({
          email: empEmail,
          company_name: mockEmp?.company_name || sbUser?.company_name || '',
        });

        if (reqKey === adminKey) {
          r.email = empEmail;
          if (mockEmp?.full_name && !r.user_name) {
             r.user_name = mockEmp.full_name;
          }
          return true;
        }
        return false;
      });
    } else {
      requests = [];
    }
  }

  return NextResponse.json({ success: true, data: requests });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!(MockDB as any).employee_requests) {
      (MockDB as any).employee_requests = [];
    }

    const newRequest = {
      id: `req-${Date.now()}`,
      user_id: body.user_id || 'mock',
      email: body.email || '',
      user_name: body.user_name || '',
      reason: body.reason,
      status: body.status || 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    (MockDB as any).employee_requests.push(newRequest);
    saveMockDB();

    return NextResponse.json({ success: true, data: newRequest });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to process request' }, { status: 500 });
  }
}
