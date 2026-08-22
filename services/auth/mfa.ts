import { generateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';

export interface TotpSetupResult {
  base32: string;
  otpauth_url: string;
  qrCode: string;
}

/**
 * Generates standard RFC 6238 TOTP secret, uri, and QR code Data URL for enrollment.
 */
export async function generateTotpSecret(email: string, issuer = 'SecureAuth'): Promise<TotpSetupResult> {
  const secret = generateSecret();
  const uri = generateURI({ label: email || 'user@company.com', issuer, secret });
  const qrCode = await QRCode.toDataURL(uri);

  return {
    base32: secret,
    otpauth_url: uri,
    qrCode,
  };
}

/**
 * Generates QR code Data URL from existing TOTP secret and label.
 */
export async function totpQrCode(secret: string, label: string, issuer = 'SecureAuth'): Promise<string> {
  const uri = generateURI({ label, issuer, secret });
  return QRCode.toDataURL(uri);
}

/**
 * Real RFC 6238 TOTP code verification using otplib.
 */
export function verifyTotp(secret: string, token: string): boolean {
  if (!secret || !token || token.trim().length !== 6) return false;
  const result = verifySync({ token: token.trim(), secret: secret.trim() });
  return Boolean(result && result.valid);
}
