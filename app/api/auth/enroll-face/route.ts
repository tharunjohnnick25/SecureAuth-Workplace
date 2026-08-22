import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserSession } from '@/lib/auth';

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8001';
const PYTHON_API_KEY = process.env.PYTHON_API_KEY || 'face-api-key-secure-2026';

export async function POST(req: NextRequest) {
  try {
    const { employeeId, image } = await req.json();

    if (!employeeId || !image) {
      return NextResponse.json({ error: 'Missing employeeId or face image' }, { status: 400 });
    }

    const { user: currentUser } = await getUserSession();
    const role = (currentUser?.role || '').toUpperCase();
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'ORGANIZATION_ADMIN', 'ORGANIZATION_OWNER'].includes(role);
    if (!currentUser || !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Only admins can enroll faces' }, { status: 403 });
    }

    // Call Python Face Auth Service to extract the embedding from the image
    const pythonRes = await fetch(`${PYTHON_API_URL}/api/v1/face/enroll`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PYTHON_API_KEY}`
      },
      body: JSON.stringify({
        captured_image_base64: image,
        require_liveness: false // Admins uploading static photos shouldn't fail liveness checks
      })
    });

    const data = await pythonRes.json();

    if (!pythonRes.ok) {
      return NextResponse.json({ error: data.detail || data.error || 'Failed to extract face embedding' }, { status: pythonRes.status });
    }

    if (data.error) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    const masterEmbedding = data.embedding;
    if (!masterEmbedding || !Array.isArray(masterEmbedding) || masterEmbedding.length === 0) {
      return NextResponse.json({ error: 'Invalid embedding received from face service' }, { status: 500 });
    }

    const { createClient } = require('@supabase/supabase-js');
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Save the embedding to the database using the Service Role Key to bypass RLS
    const { data: updateData, error } = await adminClient.from('users').update({
      face_enrolled: true,
      face_enrolled_at: new Date().toISOString(),
      face_embedding_version: 2, // Upgraded version for python backend
    }).eq('id', employeeId).select();

    if (!error && updateData && updateData.length > 0) {
      // Delete existing embeddings to prevent constraint issues, then insert the new one
      await adminClient.from('face_embeddings').delete().eq('user_id', employeeId);

      const { error: embeddingError } = await adminClient.from('face_embeddings').insert({
        user_id: employeeId,
        embedding: JSON.stringify(masterEmbedding),
        embedding_vector: `[${masterEmbedding.join(',')}]`,
        model: 'yolov8_custom',
        is_active: true
      });
      
      if (embeddingError) {
        console.error("Face Embedding Insert Error:", embeddingError);
        return NextResponse.json({ error: 'Database error: ' + embeddingError.message }, { status: 500 });
      }
    }

    if (error) {
      console.error("Supabase Update Error:", error);
      throw error;
    }

    if (!updateData || updateData.length === 0) {
      return NextResponse.json({ error: 'Employee not found or update blocked.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Face enrolled successfully', success: true });
  } catch (err: any) {
    console.error("Enrollment Catch Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
