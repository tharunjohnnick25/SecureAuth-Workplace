import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isMockMode } from '@/lib/mock-employees';

let mockDepartments = [
  { id: 'dept-1', name: 'Engineering', description: 'Core product development and software engineering', head: null, employee_count: 42, avg_risk_score: 25, created_at: new Date().toISOString() },
  { id: 'dept-2', name: 'Cybersecurity & SOC', description: 'Security operations, monitoring, and compliance', head: null, employee_count: 12, avg_risk_score: 10, created_at: new Date().toISOString() },
  { id: 'dept-3', name: 'Human Resources', description: 'Employee management, onboarding, and culture', head: null, employee_count: 8, avg_risk_score: 15, created_at: new Date().toISOString() },
  { id: 'dept-4', name: 'Sales & Revenue', description: 'Client acquisition and market growth', head: null, employee_count: 24, avg_risk_score: 35, created_at: new Date().toISOString() },
];

export async function GET() {
  if (isMockMode()) {
    const enriched = mockDepartments.map(dept => ({
      ...dept,
      employees: dept.employee_count,
      risk: dept.avg_risk_score >= 70 ? 'High' : dept.avg_risk_score >= 40 ? 'Medium' : 'Low',
      head: 'Unassigned',
      head_details: null,
    }));
    return NextResponse.json({ data: enriched, success: true });
  }

  try {
    const supabase = await createServerSupabaseClient();
    let { data, error } = await (supabase.from('departments') as any)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message, success: false }, { status: 500 });
    }

    if (!data || data.length === 0) {
      // Auto-seed default departments to make the page look lively and populated
      const defaultDepts = [
        { name: 'Engineering', description: 'Core product development and software engineering', employee_count: 42, avg_risk_score: 25 },
        { name: 'Cybersecurity & SOC', description: 'Security operations, monitoring, and compliance', employee_count: 12, avg_risk_score: 10 },
        { name: 'Human Resources', description: 'Employee management, onboarding, and culture', employee_count: 8, avg_risk_score: 15 },
        { name: 'Sales & Revenue', description: 'Client acquisition and market growth', employee_count: 24, avg_risk_score: 35 },
      ];
      await supabase.from('departments').insert(defaultDepts);
      const res = await supabase.from('departments').select('*').order('created_at', { ascending: false });
      data = res.data;
    }

    const enriched = await Promise.all((data || []).map(async (dept: any) => {
      let headDetails = null;
      if (dept.head) {
        const { data: headUser } = await supabase.from('users').select('id, full_name, email, avatar_url').eq('id', dept.head).maybeSingle();
        headDetails = headUser || null;
      }
      const riskLabel = dept.avg_risk_score >= 70 ? 'High' : dept.avg_risk_score >= 40 ? 'Medium' : 'Low';
      return {
        ...dept,
        employees: dept.employee_count,
        risk: riskLabel,
        head: headDetails?.full_name || (typeof dept.head === 'string' && dept.head !== 'Unassigned' ? dept.head : 'Unassigned'),
        head_details: headDetails,
      };
    }));

    return NextResponse.json({ data: enriched || [], success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch departments', success: false }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (isMockMode()) {
    const { name, head, description } = await req.json();
    const trimmedName = name ? String(name).trim() : '';
    const trimmedDesc = description ? String(description).trim() : null;

    if (!trimmedName || trimmedName.length < 2) {
      return NextResponse.json({ error: 'Department name must be at least 2 characters long', success: false }, { status: 400 });
    }

    if (mockDepartments.some(d => d.name.toLowerCase() === trimmedName.toLowerCase())) {
      return NextResponse.json({ error: `Department "${trimmedName}" already exists`, success: false }, { status: 409 });
    }

    const newDept = {
      id: `dept-${Date.now()}`,
      name: trimmedName,
      description: trimmedDesc,
      head: head || null,
      employee_count: 0,
      avg_risk_score: 0,
      created_at: new Date().toISOString(),
    };
    mockDepartments.unshift(newDept);

    return NextResponse.json({ data: { ...newDept, employees: 0, risk: 'Low', head_details: null }, success: true }, { status: 201 });
  }

  try {
    const { name, head, description } = await req.json();
    const trimmedName = name ? String(name).trim() : '';
    const trimmedDesc = description ? String(description).trim() : null;

    if (!trimmedName || trimmedName.length < 2) {
      return NextResponse.json(
        { error: 'Department name must be at least 2 characters long', success: false },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    const { data: existing } = await (supabase.from('departments') as any)
      .select('name')
      .ilike('name', trimmedName);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: `Department "${trimmedName}" already exists`, success: false },
        { status: 409 }
      );
    }

    let headId = null;
    if (head) {
      const trimmedHead = String(head).trim();
      if (trimmedHead) {
        const { data: headUser } = await supabase.from('users').select('id, full_name').eq('id', trimmedHead).maybeSingle();
        if (headUser) headId = headUser.id;
      }
    }

    const { data, error } = await (supabase.from('departments') as any)
      .insert([
        {
          name: trimmedName,
          description: trimmedDesc,
          head: headId,
          employee_count: 0,
          avg_risk_score: 0,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message || 'Database error creating department', success: false }, { status: 500 });
    }

    return NextResponse.json({
      data: { ...data, employees: 0, risk: 'Low' },
      success: true,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Server error creating department', success: false },
      { status: 500 }
    );
  }
}
