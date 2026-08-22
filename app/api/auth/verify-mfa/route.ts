import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { issueStepUpToken } from '@/lib/auth/step-up';
import { verifyTotp } from '@/services/auth/mfa';
import { verifyOtpChallenge, maskPhoneNumber } from '@/lib/security/otp';
import { logAuditEvent } from '@/lib/audit';

const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const rawSupabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const { mfaMethod = 'otp', otp, photo } = await req.json();

    if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
      const mockCookie = req.cookies.get('sb-qbeulfmjmmwcbxuzocdv-auth-token')?.value;
      if (!mockCookie) {
        return NextResponse.json({ error: 'Session expired' }, { status: 401 });
      }
      
      const parsed = JSON.parse(mockCookie);
      const userId = parsed.user?.id || 'mock-user-id';
      
      await issueStepUpToken(userId, mfaMethod);
      
      return NextResponse.json({
        success: true,
        user: { id: userId, email: parsed.user?.email },
        session: { access_token: parsed.access_token }
      });
    }

    const ssrClient = await createServerSupabaseClient();
    const { data: { session }, error: sessionError } = await ssrClient.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session expired or missing. Please login again.' }, { status: 401 });
    }

    const userId = session.user.id;
    const adminClient = createClient(rawSupabaseUrl, rawSupabaseKey);

    const { data: userData, error: dbError } = await adminClient
      .from('users')
      .select('company_id, status, mfa_secret, phone, phone_verified, totp_enabled, face_embedding')
      .eq('id', userId)
      .single();

    if (dbError || !userData) {
      return NextResponse.json({ error: 'User account not found' }, { status: 400 });
    }

    if (userData.status === 'SUSPENDED') {
      return NextResponse.json({ error: 'Account suspended' }, { status: 403 });
    }

    if (mfaMethod === 'otp' || mfaMethod === 'totp') {
      if (!otp || String(otp).trim().length !== 6) {
        return NextResponse.json({ error: 'Missing or invalid 6-digit TOTP code' }, { status: 400 });
      }

      if (!userData.mfa_secret) {
        return NextResponse.json({ error: 'Authenticator App is not configured on this account.' }, { status: 400 });
      }

      const isValid = verifyTotp(userData.mfa_secret, String(otp).trim());

      if (!isValid) {
        await logAuditEvent(
          userId,
          userData.company_id || null,
          {
            action: 'TOTP_FAILED',
            resource: 'auth.mfa.totp',
            details: { reason: 'Incorrect code' },
          },
          req
        );
        return NextResponse.json({ error: 'Incorrect verification code. Please try again.' }, { status: 401 });
      }
      
      await issueStepUpToken(userId, 'totp');

      await logAuditEvent(
        userId,
        userData.company_id || null,
        {
          action: 'TOTP_VERIFIED',
          resource: 'auth.mfa.totp',
          details: { factor_type: 'totp' },
        },
        req
      );

    } else if (mfaMethod === 'sms') {
      if (!otp || String(otp).trim().length !== 6) {
        return NextResponse.json({ error: 'Missing or invalid 6-digit SMS OTP code' }, { status: 400 });
      }

      if (!userData.phone || !userData.phone_verified) {
        return NextResponse.json({ error: 'Mobile number is not verified' }, { status: 400 });
      }

      const verifyResult = await verifyOtpChallenge({
        userId,
        companyId: userData.company_id,
        otp: String(otp).trim(),
        purpose: 'SMS_MFA',
      });

      if (!verifyResult.success) {
        await logAuditEvent(
          userId,
          userData.company_id || null,
          {
            action: 'SMS_OTP_FAILED',
            resource: 'auth.mfa.sms',
            details: { error: verifyResult.error },
          },
          req
        );
        return NextResponse.json({ error: verifyResult.error || 'Incorrect verification code.' }, { status: 401 });
      }

      await issueStepUpToken(userId, 'sms' as any);

      await logAuditEvent(
        userId,
        userData.company_id || null,
        {
          action: 'SMS_OTP_VERIFIED',
          resource: 'auth.mfa.sms',
          details: { phone_masked: maskPhoneNumber(userData.phone) },
        },
        req
      );

    } else if (mfaMethod === 'face') {
      if (!photo) {
        return NextResponse.json({ error: 'Missing face photo' }, { status: 400 });
      }

      if (!userData.face_embedding) {
        return NextResponse.json({ error: 'No face profile enrolled' }, { status: 401 });
      }

      try {
        const verifyResponse = await fetch('http://127.0.0.1:8000/api/v1/face/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer face-api-key-secure-2026'
          },
          body: JSON.stringify({
            captured_image_base64: photo,
            enrolled_embedding: userData.face_embedding,
            require_liveness: true
          }),
        });

        if (!verifyResponse.ok) {
          return NextResponse.json({ error: 'Face verification failed server-side' }, { status: 401 });
        }
        
        const verifyData = await verifyResponse.json();
        if (!verifyData.verified) {
          return NextResponse.json({ error: verifyData.error || 'Face does not match enrolled profile' }, { status: 401 });
        }
      } catch (err) {
        console.error("Failed to reach Python Face Service", err);
        return NextResponse.json({ error: 'Biometric service unavailable' }, { status: 503 });
      }

      await issueStepUpToken(userId, 'face');

      await logAuditEvent(
        userId,
        userData.company_id || null,
        {
          action: 'MFA_COMPLETED',
          resource: 'auth.mfa.face',
          details: { factor_type: 'face' },
        },
        req
      );

    } else {
      return NextResponse.json({ error: 'Invalid MFA method' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      user: session.user,
      session
    });

  } catch (error) {
    console.error('MFA Verification error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
