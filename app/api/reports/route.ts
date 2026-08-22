import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateCsvReport } from '@/lib/reports/generator';

export async function GET(req: Request) {
  try {
    const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const authClient = createClient(rawSupabaseUrl, rawAnonKey, {
      global: { headers: { cookie: req.headers.get('cookie') || '' } },
    });

    const { data: { session } } = await authClient.auth.getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: profile } = await adminClient
      .from('users')
      .select('company_id, role')
      .eq('id', session.user.id)
      .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: reports, error } = await adminClient
      .from('generated_reports')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ data: reports });

  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const authClient = createClient(rawSupabaseUrl, rawAnonKey, {
      global: { headers: { cookie: req.headers.get('cookie') || '' } },
    });

    const { data: { session } } = await authClient.auth.getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: profile } = await adminClient
      .from('users')
      .select('company_id, role')
      .eq('id', session.user.id)
      .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { report_type, parameters } = await req.json();
    const validReportTypes = ['EMPLOYEES', 'SECURITY_EVENTS', 'ATTENDANCE'];
    if (!validReportTypes.includes(report_type)) {
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    // 1. Create a "QUEUED" report record
    const { data: report, error: insertError } = await adminClient
      .from('generated_reports')
      .insert({
        company_id: profile.company_id,
        generated_by: session.user.id,
        report_type,
        parameters: parameters || {},
        status: 'PROCESSING'
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 2. Synchronous generation for MVP (in production, offload to background worker)
    try {
      const csvData = await generateCsvReport(report_type, profile.company_id, parameters);
      
      // Store payload in file_path column temporarily instead of setting up a private S3 bucket in MVP phase
      await adminClient
        .from('generated_reports')
        .update({
           status: 'COMPLETED',
           file_path: Buffer.from(csvData).toString('base64'),
           updated_at: new Date().toISOString()
        })
        .eq('id', report.id);
        
    } catch (genError) {
      console.error('Report generation failed:', genError);
      await adminClient
        .from('generated_reports')
        .update({
           status: 'FAILED',
           updated_at: new Date().toISOString()
        })
        .eq('id', report.id);
    }

    return NextResponse.json({ success: true, data: report });

  } catch (error) {
    console.error('Error initiating report:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
