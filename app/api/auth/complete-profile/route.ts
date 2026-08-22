import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logAuditEvent } from '@/lib/audit';

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'ADMIN']);

export async function POST(req: NextRequest) {
  try {
    const { user, details } = await req.json();

    if (!user || !user.id || !details) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Admins never go through mandatory profile completion
    if (ADMIN_ROLES.has(String(user.role || '').toUpperCase())) {
      return NextResponse.json({ error: 'Profile completion is not required for this role' }, { status: 403 });
    }

    const { full_name, phone, department, designation, employment_type, date_of_joining, date_of_birth, gender, emergency_contact_name, emergency_contact_phone } = details;

    const required = { full_name, phone, department, designation, employment_type, date_of_joining, date_of_birth, gender, emergency_contact_name, emergency_contact_phone };
    for (const [key, value] of Object.entries(required)) {
      if (value === undefined || value === null || String(value).trim() === '') {
        return NextResponse.json({ error: `Missing required field: ${key}` }, { status: 400 });
      }
    }

    const supabase = await createServerSupabaseClient();

    // Verify authentication matches the user we're updating
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || session.user.id !== user.id) {
       return NextResponse.json({ error: 'Unauthorized to complete this profile' }, { status: 401 });
    }

    const updateData = {
      full_name: String(full_name).trim(),
      phone: String(phone).trim(),
      department: String(department).trim(),
      designation: String(designation).trim(),
      employment_type: String(employment_type).trim(),
      date_of_joining: String(date_of_joining).trim(),
      date_of_birth: String(date_of_birth).trim(),
      gender: String(gender).trim(),
      emergency_contact_name: String(emergency_contact_name).trim(),
      emergency_contact_phone: String(emergency_contact_phone).trim(),
      status: 'ACTIVE', // Move them out of the 'INVITED' state
      updated_at: new Date().toISOString()
    };

    const { data: updatedProfile, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (error || !updatedProfile) {
      console.error('[Profile Complete Error]', error);
      return NextResponse.json({ error: 'Could not save profile details' }, { status: 500 });
    }

    // Audit logging for completing onboarding
    await logAuditEvent(user.id, updatedProfile.company_id, {
      action: 'ONBOARDING_COMPLETED',
      resource: 'users',
      entity_id: user.id,
      details: { role: updatedProfile.role, new_status: 'ACTIVE' }
    }, req);

    return NextResponse.json({
      success: true,
      user: updatedProfile
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
