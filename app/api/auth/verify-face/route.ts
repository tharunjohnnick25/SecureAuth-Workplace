import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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

    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

    try {
      const response = await fetch(`${pythonServiceUrl}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: employeeId,
          images: images
        }),
      });

      const data = await response.json();

      if (!response.ok || data.status === 'failed') {
        // Increment attempts
        userLock.attempts += 1;
        
        let errorMessage = data.detail || data.message || 'Verification failed';
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

      if (data.status === 'success') {
        // Reset attempts on success
        delete lockouts[employeeId];
        saveLockouts(lockouts);

        return NextResponse.json({
          verified: true,
          confidence: data.confidence,
          livenessPassed: true,
          message: data.message
        });
      }

    } catch (fetchError: any) {
      console.error("Python Service Error:", fetchError);
      return NextResponse.json({ 
        error: "Face AI Service Unreachable. Please ensure the Python server is running on port 8000." 
      }, { status: 503 });
    }

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
