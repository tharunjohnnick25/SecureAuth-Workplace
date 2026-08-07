import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { embedding } = body;
    
    if (!embedding || !Array.isArray(embedding)) {
       return NextResponse.json({ success: false, error: 'Invalid biometric data' }, { status: 400 });
    }

    // Upsert the user verification status
    const { data, error } = await supabase
      .from('users')
      .update({
         is_verified: true,
         face_embedding: embedding
      })
      .eq('id', user.id)
      .select().single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
