import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'default_secure_secret_for_dev_only_2026'
);

const COOKIE_NAME = 'secureauth_assurance_level';

export interface StepUpTokenPayload {
    sub: string; // user id
    type: 'face' | 'webauthn' | 'totp';
    exp?: number;
}

/**
 * Issues a short-lived step-up token when a custom strong factor is verified.
 */
export async function issueStepUpToken(userId: string, type: 'face' | 'webauthn' | 'totp', expiresInSecs: number = 900) {
    const token = await new SignJWT({ sub: userId, type })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(`${expiresInSecs}s`)
        .sign(JWT_SECRET);
        
    (await cookies()).set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: expiresInSecs,
        path: '/'
    });
}

/**
 * Clears the step-up token.
 */
export async function clearStepUpToken() {
    (await cookies()).delete(COOKIE_NAME);
}

/**
 * Verifies if the request possesses a valid custom step-up token.
 * Should be used alongside Supabase native AAL2 checks.
 */
export async function verifyStepUpToken(token: string): Promise<StepUpTokenPayload | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as unknown as StepUpTokenPayload;
    } catch {
        return null;
    }
}
