import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await (supabase.from('departments') as any)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message, success: false }, { status: 500 });
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
  try {
    const { name, head } = await req.json();
    const trimmedName = name ? String(name).trim() : '';

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
