import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { MockEmployees, isMockMode } from '@/lib/mock-employees';

export async function GET(req: Request) {
  try {
    if (isMockMode()) {
      return NextResponse.json({ success: true, data: MockEmployees.getAll() });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    // Verify Admin Role
    const { data: currentUser } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'super_admin') {
       return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { data: employees, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, status, department, designation, phone, address, date_of_joining');
      
    if (error) throw error;
    
    return NextResponse.json({ success: true, data: employees });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
