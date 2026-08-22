import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8001';
const PYTHON_API_KEY = process.env.PYTHON_API_KEY || 'face-api-key-secure-2026';

export async function POST(req: NextRequest) {
  try {
    const { email, captured_image_base64 } = await req.json();

    if (!email || !captured_image_base64) {
      return NextResponse.json({ error: 'Missing email or face capture' }, { status: 400 });
    }

    if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
      return NextResponse.json({ success: true, message: 'Face matched (MOCK)' });
    }

    // 1. Get the user's basic info from DB
    const { data: user, error } = await adminClient
      .from('users')
      .select('id, face_enrolled')
      .eq('email', email)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 401 });
    }

    if (!user.face_enrolled) {
      return NextResponse.json({ error: 'Face not enrolled for this user', code: 'NOT_ENROLLED' }, { status: 404 });
    }

    // Fetch the active embedding from face_embeddings table
    const { data: embeddingRecord, error: embeddingError } = await adminClient
      .from('face_embeddings')
      .select('embedding')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (embeddingError || !embeddingRecord || !embeddingRecord.embedding) {
      return NextResponse.json({ error: 'Face template not found or inactive', code: 'NOT_ENROLLED' }, { status: 404 });
    }

    let storedEmbedding: number[];
    try {
      storedEmbedding = typeof embeddingRecord.embedding === 'string' 
        ? JSON.parse(embeddingRecord.embedding) 
        : embeddingRecord.embedding;
    } catch (e) {
      return NextResponse.json({ error: 'Stored template is corrupted' }, { status: 500 });
    }

    // 2. Send the image to the Python Face Auth Service for verification
    const pythonRes = await fetch(`${PYTHON_API_URL}/api/v1/face/verify`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PYTHON_API_KEY}`
      },
      body: JSON.stringify({
        captured_image_base64,
        enrolled_embedding: storedEmbedding,
        require_liveness: false // Disabled temporarily so the user can test with a printed photo/screen
      })
    });

    const data = await pythonRes.json();

    if (!pythonRes.ok) {
      return NextResponse.json({ error: data.detail || data.error || 'Face verification failed' }, { status: pythonRes.status });
    }

    if (data.verified) {
      return NextResponse.json({ success: true, confidence: data.confidence });
    } else {
      return NextResponse.json({ error: data.error || 'Face does not match registered template', distance: 1 - data.confidence }, { status: 401 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
