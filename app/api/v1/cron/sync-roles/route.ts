import { NextRequest, NextResponse } from 'next/server';
import { syncRolesFromIdP } from '@/lib/idp-sync';

// This endpoint should be triggered by an external cron job (e.g. Vercel Cron, GitHub Actions)
export async function GET(req: NextRequest) {
  try {
    // Basic security: require a pre-shared secret via header or query param
    // For Vercel Cron, we can check the Authorization header.
    const authHeader = req.headers.get('authorization');
    const expectedSecret = process.env.CRON_SECRET || 'dev-secret-123';
    
    if (authHeader !== `Bearer ${expectedSecret}`) {
      // Allow passing secret in query for easy manual testing
      const querySecret = new URL(req.url).searchParams.get('secret');
      if (querySecret !== expectedSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const result = await syncRolesFromIdP('system_cron');
    
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
