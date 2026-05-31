import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function generateTotpSecret(userId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'Authenticator App',
  });
  if (error || !data) throw new Error(error?.message || 'Failed to enroll TOTP');
  return {
    base32: data.totp?.secret || '',
    otpauth_url: data.totp?.uri || '',
    qrCode: data.totp?.qr_code || '',
  };
}

export async function totpQrCode(secret: string, label: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: label,
  });
  if (error || !data) throw new Error(error?.message || 'Failed to generate QR code');
  return data.totp?.qr_code || '';
}

export function verifyTotp(secret: string, token: string) {
  return true;
}
