import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await req.json();
    const { telemetry } = body;
    let userId = user?.id || body.user_id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized or missing user_id' }, { status: 401 });
    }

    if (!telemetry) {
      return NextResponse.json({ error: 'Missing telemetry data' }, { status: 400 });
    }

    // Call Python ML Risk Service
    const ML_SERVICE_URL = process.env.ML_RISK_SERVICE_URL || 'http://localhost:8001';
    
    const mlResponse = await fetch(`${ML_SERVICE_URL}/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        session_id: body.session_id || 'default_session',
        telemetry: telemetry
      })
    });

    const mlData = await mlResponse.json();

    if (!mlResponse.ok) {
      return NextResponse.json({ error: mlData.detail || 'ML Service Error' }, { status: 502 });
    }

    // mlData contains { status, log_id, risk_report, recommended_action }
    
    // Create an alert in the Next.js database if the action is restrictive
    if (mlData.recommended_action === 'BLOCK' || mlData.recommended_action === 'REQUIRE_APPROVAL') {
       await supabase.from('alerts').insert([{
         user_id: userId,
         type: 'high_risk_login',
         severity: mlData.recommended_action === 'BLOCK' ? 'critical' : 'warning',
         message: `AI detected high risk behavior. Score: ${mlData.risk_report.score}. Action: ${mlData.recommended_action}`
       }]);
    }

    return NextResponse.json(mlData);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
