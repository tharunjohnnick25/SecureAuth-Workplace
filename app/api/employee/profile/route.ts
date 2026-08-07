import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    // Fetch profile
    const { data: employee, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, status, department, designation, phone, address, date_of_joining, date_of_birth, gender, emergency_contact, blood_group, reporting_manager, work_location, employment_type, company_branch, shift, work_schedule')
      .eq('id', user.id)
      .single();

    if (error) {
       return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: employee });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { id, ...updates } = body;
    
    if (id !== user.id) {
       return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    
    // Sensitive fields trigger an approval workflow instead of direct update
    const sensitiveFields = ['department', 'designation', 'salary'];
    const hasSensitive = Object.keys(updates).some(k => sensitiveFields.includes(k));
    
    if (hasSensitive) {
      // Create an approval request
      const { error: approvalError } = await supabase
        .from('approvals')
        .insert([{
           type: 'PROFILE_UPDATE',
           requester_id: user.id,
           data_payload: updates,
           status: 'PENDING'
        }]);
        
      if (approvalError) throw approvalError;

      // Optional: Add a notification trigger here if required
      
      return NextResponse.json({ success: true, message: 'Approval requested for sensitive changes.' });
    }
    
    // Non-sensitive updates are applied directly
    const { data: updatedEmployee, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    
    return NextResponse.json({ success: true, data: updatedEmployee });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
