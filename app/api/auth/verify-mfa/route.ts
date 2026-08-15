import { NextRequest, NextResponse } from 'next/server';
import { AdaptiveTrustEngine } from '@/services/AdaptiveTrustEngine';
import { OtpService } from '@/lib/services/otpService';
import { MockEmployees, forceReload } from '@/lib/mock-employees';

export async function POST(req: NextRequest) {
  try {
    const { mfaMethod = 'otp', otp, embedding, tempToken, user, securitySignals, phone, risk } = await req.json();

    if (!tempToken || !user) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let deliveredPhone = phone;

    if (mfaMethod === 'otp') {
      if (!otp) {
        return NextResponse.json({ error: 'Missing OTP code' }, { status: 400 });
      }
      // Verify the OTP that was sent to the user's phone
      const verification = OtpService.verify(tempToken, otp);
      if (!verification.ok) {
        return NextResponse.json({ error: verification.error || 'Invalid OTP code' }, { status: 401 });
      }

      // Persist the phone number the code was delivered to, for future logins
      deliveredPhone = OtpService.getPhone(tempToken) || phone;
      if (deliveredPhone) {
        try {
          forceReload();
          const record =
            MockEmployees.getById(user.id) ||
            MockEmployees.findByEmail(user.email) ||
            MockEmployees.findByEmployeeId(user.employee_id);
          if (record && record.phone !== deliveredPhone) {
            MockEmployees.update(record.id, { phone: deliveredPhone });
          }
        } catch {
          // Persistence is best-effort.
        }
      }
    } else if (mfaMethod === 'face') {
      if (!embedding) {
        return NextResponse.json({ error: 'Missing face embedding' }, { status: 400 });
      }
      const employeeRaw = MockEmployees.findForLogin(user.email);
      if (!employeeRaw || !employeeRaw.face_verified || !employeeRaw.face_embedding) {
          return NextResponse.json({ error: 'No face enrolled for this employee' }, { status: 401 });
      }
      
      const MATCH_THRESHOLD = 0.6;
      let distance = 0;
      for (let i = 0; i < embedding.length; i++) {
          distance += Math.pow(embedding[i] - employeeRaw.face_embedding[i], 2);
      }
      distance = Math.sqrt(distance);

      if (distance > MATCH_THRESHOLD) {
          return NextResponse.json({ error: 'Face does not match enrolled profile' }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: 'Invalid MFA method' }, { status: 400 });
    }

    // Call the Adaptive Trust Engine with the collected signals
    const trustResult = await AdaptiveTrustEngine.calculateInitialScore({
      userId: user.id,
      sessionId: crypto.randomUUID(), // New final session ID
      faceConfidence: securitySignals?.faceConfidence,
      typingSpeed: securitySignals?.typingSpeed,
      location: securitySignals?.location,
      deviceFingerprint: securitySignals?.fingerprint,
      loginTime: new Date(),
      mfaPassed: true
    });

    // In a real database, we would now insert the `attendance` record here
    // e.g. await db.attendance.insert({ userId: user.id, clock_in: new Date(), trust_score: trustResult.score })

    return NextResponse.json({
      success: true,
      user: { ...user, phone: deliveredPhone },
      session: { 
        access_token: `auth_token_${crypto.randomUUID()}`, 
        refresh_token: 'mock-refresh' 
      },
      trustReport: trustResult, // score, level, factors
      risk, // adaptive MFA risk assessment that triggered this step
    });

  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
