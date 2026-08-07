import { NextRequest, NextResponse } from 'next/server';
import { MockEmployees } from '@/lib/mock-employees';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Check if user already exists in our local database
    const existing = MockEmployees.findByEmail(email);
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
    }

    const domain = email.split('@')[1];
    if (!domain) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const allUsers = MockEmployees.getAll();
    const existingCompanyUsers = allUsers.filter(u => String(u.email || '').toLowerCase().endsWith(`@${domain.toLowerCase()}`));
    
    // Check if the company already has an admin
    const hasAdmin = existingCompanyUsers.some(u => {
      const r = String(u.role || '').toUpperCase();
      return r === 'ADMIN' || r === 'SUPER_ADMIN' || r === 'SECURITY ADMIN' || r.includes('ADMIN');
    });
    
    const assignedRole = hasAdmin ? 'EMPLOYEE' : 'ADMIN';

    // Add user to local JSON database (.data/mock-employees.json)
    // This perfectly persists the user without needing Docker/Supabase!
    const newUser = MockEmployees.add({
      email,
      password, // MockEmployees.add automatically hashes this securely!
      full_name: name || 'New User',
      role: assignedRole
    });

    return NextResponse.json({
      message: 'Account created successfully in local database. You can now log in.',
      user: newUser,
    }, { status: 201 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
