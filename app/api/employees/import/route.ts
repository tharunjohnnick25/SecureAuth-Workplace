import { createServerSupabaseClient } from '@/lib/supabase/server';
import { MockEmployees, hashPassword, isMockMode } from '@/lib/mock-employees';
import { NextRequest, NextResponse } from 'next/server';

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let input = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Strip BOM if present
  if (input.charCodeAt(0) === 0xFEFF) {
    input = input.slice(1);
  }

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      field = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    if (row.some((c) => c.trim() !== '')) rows.push(row);
  }
  return rows;
}

import { requireCompanyAccess } from '@/lib/auth';

export const POST = requireCompanyAccess(async (req: NextRequest, user, companyId) => {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) return NextResponse.json({ error: 'No file provided', success: false }, { status: 400 });

    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length < 2) {
      return NextResponse.json({ error: 'File must have header row and at least one data row', success: false }, { status: 400 });
    }

    const headers = rows[0].map((h) => h.trim().toLowerCase());
    const col = (name: string) => headers.indexOf(name);
    const emailIdx = col('email');
    const passwordIdx = col('password');
    const fullNameIdx = col('full_name') !== -1 ? col('full_name') : col('name');
    const employeeIdIdx = col('employee_id') !== -1 ? col('employee_id') : col('id');
    const roleIdx = col('role');
    const departmentIdx = col('department');
    const designationIdx = col('designation');
    const statusIdx = col('status');
    const employmentTypeIdx = col('employment_type') !== -1 ? col('employment_type') : col('type');
    const phoneIdx = col('phone');

    if (emailIdx === -1) {
      return NextResponse.json({ error: 'Missing required column: email', success: false }, { status: 400 });
    }

    const result = { total: rows.length - 1, imported: 0, skipped: 0, errors: [] as { row: number; message: string }[] };
    const mock = isMockMode();
    const supabase = mock ? null : await createServerSupabaseClient();
    
    // Dynamic import to avoid edge runtime issues if supabase-admin uses Node internals
    const { supabaseAdmin } = await import('@/lib/supabase-admin');

    const adminDomain = user.email ? user.email.split('@')[1]?.toLowerCase() : '';

    for (let i = 1; i < rows.length; i++) {
      const values = rows[i];
      const get = (idx: number) => (idx >= 0 ? (values[idx] || '').trim() : '');

      const email = get(emailIdx);
      const password = get(passwordIdx) || `Temp@${Math.random().toString(36).slice(-8)}`;
      const full_name = get(fullNameIdx) || email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const employee_id = get(employeeIdIdx);
      const role = get(roleIdx) || 'EMPLOYEE';
      const status = get(statusIdx) || 'Active';
      const department = get(departmentIdx);
      const designation = get(designationIdx);
      const employment_type = get(employmentTypeIdx) || 'Full-time';
      const phone = get(phoneIdx);

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        result.skipped++;
        result.errors.push({ row: i + 1, message: `Invalid or missing email: "${email}"` });
        continue;
      }

      const empDomain = email.split('@')[1]?.toLowerCase();
      if (adminDomain && !['test', 'test.com'].includes(adminDomain) && empDomain !== adminDomain) {
        result.skipped++;
        result.errors.push({ row: i + 1, message: `Email domain (@${empDomain}) does not match your company domain (@${adminDomain})` });
        continue;
      }

      if (mock) {
        if (MockEmployees.findByEmail(email)) {
          result.skipped++;
          result.errors.push({ row: i + 1, message: `Duplicate email: ${email}` });
          continue;
        }
        MockEmployees.add({ full_name, email, employee_id, role, status, department, designation, employment_type, phone, password });
        result.imported++;
        continue;
      }

      const { data: existing } = await supabase!.from('users').select('id').eq('email', email).maybeSingle();
      if (existing) {
        result.skipped++;
        result.errors.push({ row: i + 1, message: `Duplicate email: ${email}` });
        continue;
      }

      // 1. Create auth.users via Admin API
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: password,
        email_confirm: true,
        user_metadata: { full_name }
      });

      if (authError || !authData.user) {
        result.skipped++;
        result.errors.push({ row: i + 1, message: 'Auth creation failed: ' + (authError?.message || 'Unknown') });
        continue;
      }

      // 2. Update public.users profile securely
      const { error } = await (supabaseAdmin as any).from('users').update({
        id: authData.user.id,
        full_name,
        employee_id: employee_id || undefined,
        role: role.toLowerCase(),
        status,
        department: department || null,
        designation: designation || null,
        employment_type,
        phone: phone || null,
        company_id: companyId
      }).eq('id', authData.user.id);

      if (error) {
        result.skipped++;
        result.errors.push({ row: i + 1, message: error.message });
      } else {
        result.imported++;
      }
    }

    return NextResponse.json({ data: result, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Import failed', success: false }, { status: 500 });
  }
});
