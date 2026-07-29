import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) return NextResponse.json({ error: 'No file provided', success: false }, { status: 400 });

    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) return NextResponse.json({ error: 'File must have header row and at least one data row', success: false }, { status: 400 });

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const requiredFields = ['full_name', 'email'];
    const missingFields = requiredFields.filter(f => !headers.includes(f));
    if (missingFields.length > 0) {
      return NextResponse.json({ error: `Missing required columns: ${missingFields.join(', ')}`, success: false }, { status: 400 });
    }

    const result = { total: lines.length - 1, imported: 0, skipped: 0, errors: [] as { row: number; message: string }[] };

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

      if (!row.full_name || !row.email) {
        result.skipped++;
        result.errors.push({ row: i + 1, message: 'Missing full_name or email' });
        continue;
      }

      const { data: existing } = await supabase.from('users').select('id').eq('email', row.email).maybeSingle();
      if (existing) {
        result.skipped++;
        result.errors.push({ row: i + 1, message: `Duplicate email: ${row.email}` });
        continue;
      }

      const employeeData: Record<string, any> = { ...row, status: row.status || 'Active', employment_type: row.employment_type || 'Full-time' };
      const { error } = await supabase.from('users').insert([employeeData]);

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
}
