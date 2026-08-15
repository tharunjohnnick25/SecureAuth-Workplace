import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isMockMode, MockEmployees, verifyPassword } from '@/lib/mock-employees';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { passwordSchema } from '@/lib/validations/auth';

/**
 * POST /api/auth/change-password
 *
 * Changes the authenticated user's password. Verifies the current password
 * first, then stores the new one and clears the `must_change_password` flag
 * that is set on first-login default-credential accounts.
 *
 * GET /api/auth/change-password
 *
 * Returns the current session user (email) so the forced change page can
 * greet the right account even when the pending-auth state was cleared.
 */

interface MockUserRecord {
  id: string;
  email: string;
  role?: string;
  full_name?: string;
  employee_id?: string;
  phone?: string;
  department?: string;
  designation?: string;
  passkey_enrolled?: boolean;
  must_change_password?: boolean;
  [key: string]: unknown;
}

function buildUser(record: MockUserRecord) {
  const fullName = String(record.full_name || record.email || 'User');
  return {
    id: record.id,
    email: record.email,
    role: record.role || 'Employee',
    full_name: fullName,
    first_name: fullName.split(' ')[0],
    last_name: fullName.split(' ').slice(1).join(' ') || 'User',
    employee_id: record.employee_id || '',
    phone: record.phone || '',
    department: record.department || '',
    designation: record.designation || '',
    profile_completed: true,
    passkey_enrolled: record.passkey_enrolled === true,
    must_change_password: Boolean(record.must_change_password),
  };
}

export async function GET() {
  try {
    if (isMockMode()) {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get('mock_session')?.value;
      if (!sessionCookie) return NextResponse.json({ user: null });

      let session: { id?: string } = {};
      try {
        session = JSON.parse(sessionCookie);
      } catch {
        return NextResponse.json({ user: null });
      }

      const record = MockEmployees.getById(String(session.id || ''));
      return NextResponse.json({ user: record ? buildUser(record as MockUserRecord) : null });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ user: null });

    return NextResponse.json({ user: { id: user.id, email: user.email || '', role: 'Employee' } });
  } catch {
    return NextResponse.json({ user: null });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword) {
      return NextResponse.json({ error: 'Current password is required' }, { status: 400 });
    }

    const validation = passwordSchema.safeParse(newPassword);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }

    if (isMockMode()) {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get('mock_session')?.value;
      if (!sessionCookie) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

      let session: { email?: string; id?: string } = {};
      try {
        session = JSON.parse(sessionCookie);
      } catch {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      }

      const record = MockEmployees.findForLogin(String(session.email || ''));
      if (!record || !record.password_hash || !verifyPassword(currentPassword, record.password_hash)) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }

      const updated = MockEmployees.update(record.id, {
        password: newPassword,
        must_change_password: false,
      });
      if (!updated) {
        return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
      }

      const fresh = MockEmployees.getById(record.id);
      
      const response = NextResponse.json({
        success: true,
        message: 'Password changed successfully',
        user: fresh ? fresh : undefined,
      });

      if (fresh) {
        response.cookies.set('mock_session', JSON.stringify(fresh), { httpOnly: true, secure: true, path: '/' });
      }

      return response;
    }

    // Supabase path: verify the current password, then update it.
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email || '',
      password: currentPassword,
    });
    if (signInError) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'Internal server error' }, { status: 500 });
  }
}
