import { NextRequest, NextResponse } from 'next/server';
import { MockEmployees, forceReload, ADMIN_ROLES } from '@/lib/mock-employees';

export async function POST(req: NextRequest) {
  try {
    forceReload();
    const { user, details } = await req.json();

    if (!user || !details) {
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

    let record =
      MockEmployees.getById(user.id) ||
      MockEmployees.findByEmail(user.email) ||
      MockEmployees.findByEmployeeId(user.employee_id);

    if (!record) {
      // Persist an ad-hoc account (e.g. test accounts) so details are saved
      record = MockEmployees.add({
        email: user.email,
        full_name: String(full_name || '').trim(),
        role: String(user.role || 'EMPLOYEE'),
        employee_id: user.employee_id,
      });
    }

    const updated = MockEmployees.update(record.id, {
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
      profile_completed: true,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Could not save profile details' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updated.id,
        email: updated.email,
        role: updated.role,
        first_name: updated.full_name?.split(' ')[0] || '',
        last_name: updated.full_name?.split(' ').slice(1).join(' ') || '',
        full_name: updated.full_name,
        employee_id: updated.employee_id,
        phone: updated.phone || '',
        department: updated.department || '',
        designation: updated.designation || '',
        employment_type: updated.employment_type || '',
        date_of_joining: updated.date_of_joining || '',
        date_of_birth: updated.date_of_birth || '',
        gender: updated.gender || '',
        emergency_contact_name: updated.emergency_contact_name || '',
        emergency_contact_phone: updated.emergency_contact_phone || '',
        profile_completed: true,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
