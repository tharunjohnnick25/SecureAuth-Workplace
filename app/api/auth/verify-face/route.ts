import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8001';
const PYTHON_API_KEY = process.env.PYTHON_API_KEY || 'face-api-key-secure-2026';

// Helper to manage lockouts on the server side
const LOCKOUT_FILE = path.join(process.cwd(), '.data', 'lockouts.json');
const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function getLockouts() {
  try {
    if (!fs.existsSync(path.dirname(LOCKOUT_FILE))) {
      fs.mkdirSync(path.dirname(LOCKOUT_FILE), { recursive: true });
    }
    if (!fs.existsSync(LOCKOUT_FILE)) return {};
    return JSON.parse(fs.readFileSync(LOCKOUT_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveLockouts(data: any) {
  try {
    fs.writeFileSync(LOCKOUT_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Failed to save lockouts', e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { images, tempToken, employeeId } = await req.json();

    if (!images || images.length === 0 || !tempToken || !employeeId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check Lockout Status
    const lockouts = getLockouts();
    const userLock = lockouts[employeeId] || { attempts: 0, lockedUntil: 0 };
    
    if (userLock.lockedUntil && Date.now() < userLock.lockedUntil) {
      const remainingMinutes = Math.ceil((userLock.lockedUntil - Date.now()) / 60000);
      return NextResponse.json({ 
        error: `Account temporarily locked due to multiple failed face verification attempts. Try again in ${remainingMinutes} minutes.` 
      }, { status: 423 });
    }

    // 1. Fetch user's basic info
    const { data: user, error: dbError } = await adminClient
      .from('users')
      .select('face_enrolled')
      .eq('id', employeeId)
      .single();

    if (dbError || !user || !user.face_enrolled) {
      return NextResponse.json({ error: 'Face not enrolled for this user' }, { status: 404 });
    }

    // Fetch the actual embedding from the face_embeddings table
    const { data: embeddingRecord, error: embeddingError } = await adminClient
      .from('face_embeddings')
      .select('embedding')
      .eq('user_id', employeeId)
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

    // 2. Send image and enrolled embedding to Python AI Service
    try {
      const response = await fetch(`${PYTHON_API_URL}/api/v1/face/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PYTHON_API_KEY}`
        },
        body: JSON.stringify({
          captured_image_base64: images[images.length - 1], // Take most recent frame
          enrolled_embedding: storedEmbedding,
          require_liveness: true
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.verified) {
        // Increment attempts
        userLock.attempts += 1;
        
        let errorMessage = data.detail || data.error || 'Verification failed';
        let statusToReturn = 401;
        
        if (userLock.attempts >= MAX_ATTEMPTS) {
          userLock.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
          errorMessage = 'Account temporarily locked due to multiple failed face verification attempts. Try again in 15 minutes.';
          statusToReturn = 423;
        } else {
          errorMessage = `${errorMessage} (${userLock.attempts}/${MAX_ATTEMPTS} attempts)`;
        }
        
        lockouts[employeeId] = userLock;
        saveLockouts(lockouts);

        return NextResponse.json({ error: errorMessage }, { status: statusToReturn });
      }

      // Reset attempts on success
      delete lockouts[employeeId];
      saveLockouts(lockouts);

      return NextResponse.json({
        verified: true,
        confidence: data.confidence,
        livenessPassed: data.liveness,
        message: 'Face verified securely'
      });

    } catch (fetchError: any) {
      console.error("Python Service Error:", fetchError);
      return NextResponse.json({ 
        error: "Face AI Service Unreachable. Please ensure the Python server is running on port 8001." 
      }, { status: 503 });
    }

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
