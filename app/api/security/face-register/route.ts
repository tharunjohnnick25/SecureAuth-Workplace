import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { image_base64 } = body;
    
    if (!image_base64 || typeof image_base64 !== 'string') {
       return NextResponse.json({ success: false, error: 'Invalid or missing image data' }, { status: 400 });
    }

    // Call FastAPI to extract embedding
    const faceApiRes = await fetch('http://127.0.0.1:8000/api/v1/face/enroll', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer face-api-key-secure-2026'
        },
        body: JSON.stringify({
            captured_image_base64: image_base64,
            require_liveness: true
        })
    });

    if (!faceApiRes.ok) {
        const errData = await faceApiRes.json().catch(() => ({}));
        return NextResponse.json({ success: false, error: errData.detail || errData.error || 'Face enrollment failed upstream' }, { status: faceApiRes.status });
    }

    const faceData = await faceApiRes.json();
    const embedding = faceData.embedding;

    if (!embedding || !Array.isArray(embedding)) {
        return NextResponse.json({ success: false, error: 'Face API returned invalid embedding' }, { status: 500 });
    }

    // Fetch user to get company_id for audit logging
    const { data: profile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

    // Upsert the user verification status and securely store embedding
    const { data, error } = await supabase
      .from('users')
      .update({
         is_verified: true,
         face_enrolled: true,
         face_consent_given: true,
         face_embedding: embedding
      })
      .eq('id', user.id)
      .select().single();

    if (error) throw error;

    // Log the enrollment event
    await logAuditEvent(user.id, profile?.company_id, {
        action: 'FACE_ENROLLMENT_COMPLETED',
        resource: 'face_profiles',
        entity_id: user.id,
        details: { status: 'SUCCESS' }
    }, req as any);

    return NextResponse.json({ success: true, data: { is_verified: data.is_verified } });
  } catch (error: any) {
    console.error('Face Register API Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
