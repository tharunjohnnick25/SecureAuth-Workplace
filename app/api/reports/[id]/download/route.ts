import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const authClient = createClient(rawSupabaseUrl, rawAnonKey, {
      global: { headers: { cookie: req.headers.get('cookie') || '' } },
    });

    const { data: { session } } = await authClient.auth.getSession();
    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 });
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
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Lookup report
    const { data: report } = await adminClient
      .from('generated_reports')
      .select('*')
      .eq('id', id)
      .eq('company_id', profile.company_id)
      .single();

    if (!report) {
      return new NextResponse('Report not found', { status: 404 });
    }
    
    if (report.status !== 'COMPLETED' || !report.file_path) {
      return new NextResponse('Report is not completed or missing data', { status: 400 });
    }

    // Decode CSV string from file_path (base64)
    const csvData = Buffer.from(report.file_path, 'base64').toString('utf8');

    // Audit log for sensitive export
    await adminClient.from('audit_logs').insert({
       company_id: profile.company_id,
       user_id: session.user.id,
       action: 'REPORT_EXPORTED',
       resource: 'generated_reports',
       entity_id: report.id,
       details: {
         report_type: report.report_type
       }
    });

    // Send as CSV file attachment
    const headers = new Headers();
    headers.set('Content-Type', 'text/csv; charset=utf-8');
    headers.set('Content-Disposition', `attachment; filename="${report.report_type}_${new Date().getTime()}.csv"`);

    return new NextResponse(csvData, { status: 200, headers });

  } catch (error) {
    console.error('Error downloading report:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
