import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Simplistic scoring weights
const WEIGHTS = {
  FAILED_LOGIN: -10,
  IMPOSSIBLE_TRAVEL: -30,
  NEW_DEVICE: -15,
  SUCCESSFUL_LOGIN: +2,
  MFA_PASSED: +5
};

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // Admins or system services could call this. For now, allow authenticated users 
    // to have their own score updated, or allow Admins to force update.
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { target_user_id, event_type, details } = body;
    const userId = target_user_id || user.id;

    // Get current score
    const { data: currentScoreRecord, error: fetchError } = await supabase
      .from('trust_scores')
      .select('*')
      .eq('user_id', userId)
      .single();

    let currentScore = 100;
    let factors = [];
    
    if (currentScoreRecord) {
       currentScore = currentScoreRecord.score;
       factors = currentScoreRecord.factors || [];
    }

    // Apply weight
    const change = WEIGHTS[event_type as keyof typeof WEIGHTS] || 0;
    let newScore = currentScore + change;
    
    // Clamp between 0 and 100
    if (newScore > 100) newScore = 100;
    if (newScore < 0) newScore = 0;

    // Determine Risk Level
    let risk_level = 'LOW';
    if (newScore < 40) risk_level = 'CRITICAL';
    else if (newScore < 70) risk_level = 'HIGH';
    else if (newScore < 90) risk_level = 'MEDIUM';

    // Log the factor
    factors.unshift({
        event: event_type,
        change,
        details,
        timestamp: new Date().toISOString()
    });
    
    // Keep only last 10 factors to avoid bloat
    factors = factors.slice(0, 10);

    // Upsert the score
    const { data: updatedScore, error: upsertError } = await supabase
      .from('trust_scores')
      .upsert({
         user_id: userId,
         score: newScore,
         risk_level,
         factors,
         updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select().single();

    if (upsertError) throw upsertError;

    return NextResponse.json({ success: true, data: updatedScore });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
