import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const OTP_SECRET = process.env.OTP_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'secureauth_otp_salt_2026';
const MAX_ATTEMPTS = 5;
const OTP_EXPIRY_MINUTES = 5;
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Generate a 6-digit cryptographically secure numeric OTP.
 * Uses node crypto.randomInt (100,000 to 999,999).
 */
export function generateSecureOtp(): string {
  const code = crypto.randomInt(100000, 1000000).toString();
  return code;
}

/**
 * Compute SHA-256 hash of plaintext OTP + secret salt.
 * Plaintext OTPs are never stored in the database.
 */
export function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp + OTP_SECRET).digest('hex');
}

/**
 * Compare entered OTP against stored SHA-256 hash in constant time.
 */
export function verifyOtpHash(otp: string, storedHash: string): boolean {
  const computed = hashOtp(otp);
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(storedHash));
}

/**
 * Mask phone number for public UI display.
 * Example: "+91 9876541234" -> "+91 ******1234", "+1555019234" -> "+1 ******9234"
 */
export function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return 'Unset';
  const clean = phone.trim();
  if (clean.length <= 4) return '******';

  if (clean.startsWith('+')) {
    const spaceIdx = clean.indexOf(' ');
    if (spaceIdx > 0) {
      const prefix = clean.slice(0, spaceIdx + 1);
      const rest = clean.slice(spaceIdx + 1);
      const lastDigits = rest.slice(-4);
      return `${prefix}******${lastDigits}`;
    } else {
      const prefix = clean.slice(0, 2); // e.g. +1
      const lastDigits = clean.slice(-4);
      return `${prefix} ******${lastDigits}`;
    }
  }

  const lastDigits = clean.slice(-4);
  return `******${lastDigits}`;
}

export interface CreateOtpChallengeOptions {
  userId: string;
  companyId?: string;
  phone: string;
  purpose: 'PHONE_VERIFICATION' | 'SMS_MFA' | 'PHONE_CHANGE';
}

export interface OtpChallengeResult {
  success: boolean;
  otp?: string;
  challengeId?: string;
  error?: string;
  cooldownRemaining?: number;
}

/**
 * Create an OTP challenge record in public.otp_challenges table with 60s cooldown check.
 */
export async function createOtpChallenge({
  userId,
  companyId,
  phone,
  purpose,
}: CreateOtpChallengeOptions): Promise<OtpChallengeResult> {
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Check for recent challenge created within 60 seconds (Resend Cooldown Protection)
  const { data: recentChallenges } = await adminClient
    .from('otp_challenges')
    .select('created_at')
    .eq('user_id', userId)
    .eq('purpose', purpose)
    .is('used_at', null)
    .order('created_at', { ascending: false })
    .limit(1);

  if (recentChallenges && recentChallenges.length > 0) {
    const lastCreated = new Date(recentChallenges[0].created_at).getTime();
    const elapsedSeconds = Math.floor((Date.now() - lastCreated) / 1000);
    if (elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
      const cooldownRemaining = RESEND_COOLDOWN_SECONDS - elapsedSeconds;
      return {
        success: false,
        error: `Please wait ${cooldownRemaining} seconds before requesting a new verification code.`,
        cooldownRemaining,
      };
    }
  }

  // 2. Check maximum hourly request rate limit (max 5 OTP requests per hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: hourlyCount } = await adminClient
    .from('otp_challenges')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', oneHourAgo);

  if (hourlyCount && hourlyCount >= 5) {
    return {
      success: false,
      error: 'Maximum verification code requests exceeded for this hour. Please try again later.',
    };
  }

  // 3. Generate cryptographically secure OTP and SHA-256 hash
  const otp = generateSecureOtp();
  const otpHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

  // 4. Insert challenge into public.otp_challenges
  const { data: challenge, error: insertErr } = await adminClient
    .from('otp_challenges')
    .insert({
      user_id: userId,
      company_id: companyId || null,
      phone,
      otp_hash: otpHash,
      purpose,
      attempt_count: 0,
      max_attempts: MAX_ATTEMPTS,
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (insertErr || !challenge) {
    console.error('[OTP Service] DB Insert Failed:', insertErr);
    return {
      success: false,
      error: 'Failed to create verification challenge.',
    };
  }

  return {
    success: true,
    otp,
    challengeId: challenge.id,
  };
}

export interface VerifyOtpChallengeOptions {
  userId: string;
  companyId?: string;
  otp: string;
  purpose: 'PHONE_VERIFICATION' | 'SMS_MFA' | 'PHONE_CHANGE';
}

export interface VerifyOtpResult {
  success: boolean;
  phone?: string;
  error?: string;
}

/**
 * Verify an OTP challenge. Enforces attempt limits (<5), expiration (<5 mins), and single-use invalidation.
 */
export async function verifyOtpChallenge({
  userId,
  companyId,
  otp,
  purpose,
}: VerifyOtpChallengeOptions): Promise<VerifyOtpResult> {
  if (!otp || otp.trim().length !== 6) {
    return { success: false, error: 'Invalid verification code.' };
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let query = adminClient
    .from('otp_challenges')
    .select('*')
    .eq('user_id', userId)
    .eq('purpose', purpose)
    .is('used_at', null)
    .order('created_at', { ascending: false })
    .limit(1);

  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const { data: challenges, error: fetchErr } = await query;

  if (fetchErr || !challenges || challenges.length === 0) {
    return { success: false, error: 'No active verification code found. Please request a new code.' };
  }

  const challenge = challenges[0];

  // 1. Check expiration
  if (new Date(challenge.expires_at).getTime() < Date.now()) {
    return { success: false, error: 'Verification code has expired. Please request a new code.' };
  }

  // 2. Check attempt count
  if (challenge.attempt_count >= challenge.max_attempts) {
    return { success: false, error: 'Too many failed attempts. Please request a new code.' };
  }

  // Increment attempt count
  const newAttemptCount = challenge.attempt_count + 1;
  await adminClient
    .from('otp_challenges')
    .update({ attempt_count: newAttemptCount })
    .eq('id', challenge.id);

  // 3. Verify OTP Hash using timing-safe comparison
  const isValid = verifyOtpHash(otp.trim(), challenge.otp_hash);

  if (!isValid) {
    if (newAttemptCount >= challenge.max_attempts) {
      return { success: false, error: 'Too many failed attempts. Please request a new code.' };
    }
    return { success: false, error: 'Incorrect verification code. Please try again.' };
  }

  // 4. Mark challenge as used immediately
  await adminClient
    .from('otp_challenges')
    .update({ used_at: new Date().toISOString() })
    .eq('id', challenge.id);

  return {
    success: true,
    phone: challenge.phone,
  };
}
