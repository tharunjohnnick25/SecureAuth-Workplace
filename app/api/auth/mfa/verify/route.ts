import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { verifyTotp } from '@/services/auth/mfa';
import crypto from 'crypto';
import { SignJWT } from 'jose';
import { createServerClient } from '@supabase/ssr';

export async function POST(req: NextRequest) {
  try {
    const { code, mfaMethod, photo } = await req.json();

    if (mfaMethod !== 'face' && (!code || String(code).replace(/\D/g, '').length !== 6)) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }

    const pendingSessionFace = req.cookies.get('temp_auth_token')?.value;
    const pendingSessionPwd = req.cookies.get('mfa_pending_session')?.value;
    
    if (!pendingSessionFace && !pendingSessionPwd) {
       return NextResponse.json({ error: 'No pending authentication session found. Please log in again.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

    let userId = null;
    let email = null;
    let isPasswordLogin = false;
    let sessionData: any = null;

    if (pendingSessionPwd) {
       try {
           sessionData = JSON.parse(pendingSessionPwd);
           userId = sessionData.user?.id;
           email = sessionData.user?.email;
           isPasswordLogin = true;
       } catch(e) {}
    } else if (pendingSessionFace) {
       try {
           sessionData = JSON.parse(pendingSessionFace);
           userId = sessionData.userId;
           email = sessionData.email;
       } catch(e) {}
    }

    if (!userId || !email) {
       return NextResponse.json({ error: 'Invalid session data.' }, { status: 400 });
    }

    const { data: userRecord, error: userError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

    if (userError || !userRecord) {
       return NextResponse.json({ error: 'User record not found.' }, { status: 400 });
    }

    let isValid = false;

    if (mfaMethod === 'face' && photo) {
        const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8001';
        const PYTHON_API_KEY = process.env.PYTHON_API_KEY || 'face-api-key-secure-2026';
        
        const { data: embeddingRecord } = await supabaseAdmin
          .from('face_embeddings')
          .select('embedding')
          .eq('user_id', userId)
          .eq('is_active', true)
          .maybeSingle();

        if (embeddingRecord?.embedding) {
            let storedEmbedding = typeof embeddingRecord.embedding === 'string' ? JSON.parse(embeddingRecord.embedding) : embeddingRecord.embedding;
            const pythonRes = await fetch(`${PYTHON_API_URL}/api/v1/face/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PYTHON_API_KEY}` },
              body: JSON.stringify({ captured_image_base64: photo, enrolled_embedding: storedEmbedding, require_liveness: false })
            });
            const data = await pythonRes.json();
            if (pythonRes.ok && data.verified) {
                isValid = true;
            } else {
                return NextResponse.json({ error: data.error || data.detail || 'Face verification failed' }, { status: 401 });
            }
        } else {
            return NextResponse.json({ error: 'Face template not found' }, { status: 404 });
        }
    }

    // Use Native Supabase MFA for TOTP
    if (!isValid && sessionData && sessionData.access_token && sessionData.refresh_token) {
       const authClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
           auth: { persistSession: false }
       });
       
       await authClient.auth.setSession({
           access_token: sessionData.access_token,
           refresh_token: sessionData.refresh_token
       });
       
       const { data: factors, error: factorsError } = await authClient.auth.mfa.listFactors();
       const totpFactor = factors?.totp?.[0];

       if (totpFactor && totpFactor.status === 'verified') {
           const { data: challenge, error: challengeError } = await authClient.auth.mfa.challenge({ factorId: totpFactor.id });
           if (!challengeError && challenge) {
               const { data: verifyData, error: verifyError } = await authClient.auth.mfa.verify({
                   factorId: totpFactor.id,
                   challengeId: challenge.id,
                   code: String(code)
               });
               
               if (!verifyError) {
                   isValid = true;
                   
                   // Fetch the upgraded AAL2 session
                   const { data: sessionResponse } = await authClient.auth.getSession();
                   if (sessionResponse?.session) {
                       sessionData.access_token = sessionResponse.session.access_token;
                       sessionData.refresh_token = sessionResponse.session.refresh_token;
                   }
               }
           }
       }
    }
    
    // Fallback to custom otplib (for existing users who set it up before migration)
    if (!isValid && userRecord.mfa_secret) {
        isValid = verifyTotp(userRecord.mfa_secret, String(code));
    }
      
    if (!isValid) {
        await supabaseAdmin.from('login_history').insert({
            user_id: userId,
            ip_address: req.headers.get('x-forwarded-for') || '127.0.0.1',
            status: 'failed',
            failure_reason: 'Invalid MFA verification code',
        });
        return NextResponse.json({ error: 'Incorrect verification code. Please try again.' }, { status: 400 });
    }

    // Success! Log it
    await supabaseAdmin.from('login_logs').insert({
        user_id: userId,
        ip_address: req.headers.get('x-forwarded-for') || '127.0.0.1',
        status: 'SUCCESS',
        risk_level: 'LOW',
    });

    const response = NextResponse.json({ 
       success: true,
       user: {
          id: userRecord.id,
          email: userRecord.email,
          role: userRecord.role,
          first_name: userRecord.first_name,
          last_name: userRecord.last_name,
       },
       message: 'MFA verified successfully.'
    });

    const JWT_SECRET = new TextEncoder().encode(process.env.SUPABASE_SERVICE_ROLE_KEY || 'default_secure_secret_for_dev_only_2026');
    const aal2Token = await new SignJWT({ aal: 'aal2', sub: userId })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('2h')
        .sign(JWT_SECRET);
        
    response.cookies.set('secureauth_assurance_level', aal2Token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7200,
        path: '/'
    });

    const ssrClient = createServerClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        getAll() { return [] },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        }
      }
    });

    if (isPasswordLogin && sessionData.access_token) {
        await ssrClient.auth.setSession({
            access_token: sessionData.access_token,
            refresh_token: sessionData.refresh_token
        });
        
        // Clear pending
        response.cookies.delete('mfa_pending_session');
    } else {
        // Face login -> Magic Link Trick
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: email,
        });

        if (!linkError && linkData?.properties?.action_link) {
            try {
                const fetchRes = await fetch(linkData.properties.action_link, { redirect: 'manual' });
                const loc = fetchRes.headers.get('location');
                if (loc && loc.includes('access_token=')) {
                    const params = new URLSearchParams(loc.split('#')[1]);
                    if (params.get('access_token') && params.get('refresh_token')) {
                         await ssrClient.auth.setSession({
                             access_token: params.get('access_token') as string,
                             refresh_token: params.get('refresh_token') as string
                         });
                    }
                }
            } catch(e) {}
        }
        // Clear pending
        response.cookies.delete('temp_auth_token');
    }

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
