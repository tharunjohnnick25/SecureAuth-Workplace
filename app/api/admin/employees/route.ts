import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { MockEmployees, isMockMode } from '@/lib/mock-employees';
import { maskPhoneNumber } from '@/lib/security/otp';

export async function GET(req: Request) {
  try {
    if (isMockMode()) {
      return NextResponse.json({ success: true, data: MockEmployees.getAll() });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify Admin Role
    const { data: currentUser } = await adminClient.from('users').select('role').eq('id', user.id).single();
    const roleUpper = (currentUser?.role || '').toUpperCase();
    if (!['ADMIN', 'SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN'].includes(roleUpper)) {
       return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Select users with MFA status flags
    const { data: employees, error } = await adminClient
      .from('users')
      .select('id, email, full_name, role, status, department, designation, phone, phone_verified, is_mfa_enabled, totp_enabled, face_enrolled, face_embedding, date_of_joining');
      
    if (error) throw error;

    // Fetch passkeys count for each user
    const { data: passkeys } = await adminClient
      .from('passkeys')
      .select('user_id');

    const passkeyCounts: Record<string, number> = {};
    if (passkeys) {
      passkeys.forEach((pk: any) => {
        passkeyCounts[pk.user_id] = (passkeyCounts[pk.user_id] || 0) + 1;
      });
    }

    // Map data securely — NEVER expose mfa_secret or face_embedding or raw secrets!
    const sanitizedEmployees = (employees || []).map((emp: any) => ({
      id: emp.id,
      email: emp.email,
      full_name: emp.full_name,
      role: emp.role,
      status: emp.status,
      department: emp.department,
      designation: emp.designation,
      masked_phone: emp.phone ? maskPhoneNumber(emp.phone) : 'Not Set',
      phone_status: emp.phone ? (emp.phone_verified ? 'Verified' : 'Unverified') : 'Not Set',
      totp_status: (emp.totp_enabled || emp.is_mfa_enabled) ? 'Enabled' : 'Disabled',
      passkey_status: (passkeyCounts[emp.id] || 0) > 0 ? `${passkeyCounts[emp.id]} Registered` : 'Not Registered',
      face_status: (emp.face_enrolled || Boolean(emp.face_embedding)) ? 'Verified' : 'Not Enrolled',
      date_of_joining: emp.date_of_joining,
    }));
    
    return NextResponse.json({ success: true, data: sanitizedEmployees });
  } catch (error: any) {
    console.error('Admin Employees GET Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
