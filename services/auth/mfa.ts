import { createServerSupabaseClient } from '@/lib/supabase/server';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';

export async function generateTotpSecret(userId: string) {
  const secret = speakeasy.generateSecret({ length: 20 });
  // store encrypted secret via RPC or server-side only
  return secret;
}

export async function totpQrCode(secret: string, label: string) {
  const uri = speakeasy.otpauthURL({ secret, label, encoding: 'base32' });
  return qrcode.toDataURL(uri);
}

export function verifyTotp(secret: string, token: string) {
  return speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 1 });
}
