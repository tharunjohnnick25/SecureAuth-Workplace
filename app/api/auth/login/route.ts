import { NextRequest, NextResponse } from 'next/server';
import { MockEmployees, verifyPassword } from '@/lib/mock-employees';

export async function POST(req: NextRequest) {
  try {
    const { email, employee_id, password, company_id, company_name, company_domain, company_country } = await req.json();

    const company = company_id
      ? { company_id, company_name, company_domain, company_country }
      : {};

    // Handle specific admin credentials explicitly requested by user
    if (email === 'admin@test') {
      if (password !== 'tharun26') {
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
      }
      return NextResponse.json({
        user: {
          id: crypto.randomUUID(),
          email: 'admin@test',
          role: 'ADMIN',
          first_name: 'Admin',
          last_name: 'User',
          employee_id: 'EMP-ADMIN01',
          ...company,
        },
        session: { access_token: 'mock-token', refresh_token: 'mock-refresh' },
        riskReport: { score: 0, level: 'LOW', action: 'ALLOW', factors: [], recommendations: [] }
      });
    }

    // Since Docker/Supabase is down, ALWAYS verify against the persisted mock employee store
    // This file acts as our real backend since it reads/writes to .data/mock-employees.json
    const record = MockEmployees.findForLogin(email, employee_id);
    
    if (!record || !record.password_hash || !verifyPassword(password || '', record.password_hash)) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: record.id,
        email: record.email,
        role: record.role || 'EMPLOYEE',
        first_name: (record.full_name || email || 'User').split(' ')[0],
        last_name: (record.full_name || '').split(' ').slice(1).join(' ') || 'User',
        employee_id: record.employee_id,
        ...company,
      },
      session: { access_token: 'mock-token', refresh_token: 'mock-refresh' },
      riskReport: { score: 0, level: 'LOW', action: 'ALLOW', factors: [], recommendations: [] }
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


