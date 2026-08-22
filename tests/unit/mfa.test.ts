import { describe, it, expect } from 'vitest';
import { generateSecureOtp, hashOtp, verifyOtpHash, maskPhoneNumber } from '../../lib/security/otp';
import { generateTotpSecret, verifyTotp } from '../../services/auth/mfa';
import { generateSync } from 'otplib';

describe('TOTP Authenticator & SMS OTP Security Unit Tests', () => {
  describe('Cryptographic OTP Generation', () => {
    it('should generate a 6-digit numeric string', () => {
      const otp = generateSecureOtp();
      expect(otp).toHaveLength(6);
      expect(/^\d{6}$/.test(otp)).toBe(true);
    });

    it('should NOT generate trivial or hardcoded OTPs', () => {
      const sample = Array.from({ length: 10 }, () => generateSecureOtp());
      expect(sample).not.toContain('123456');
      expect(sample).not.toContain('000000');
    });

    it('should hash OTP using SHA-256 and verify in constant time', () => {
      const otp = '849201';
      const hash = hashOtp(otp);

      expect(hash).toHaveLength(64); // Hex SHA-256
      expect(verifyOtpHash(otp, hash)).toBe(true);
      expect(verifyOtpHash('123456', hash)).toBe(false);
    });
  });

  describe('Phone Number Masking', () => {
    it('should mask mobile numbers to +91 ******1234 style', () => {
      expect(maskPhoneNumber('+91 9876541234')).toBe('+91 ******1234');
      expect(maskPhoneNumber('+1555019234')).toBe('+1 ******9234');
      expect(maskPhoneNumber(null)).toBe('Unset');
    });
  });

  describe('RFC 6238 Standard TOTP Authenticator', () => {
    it('should generate valid TOTP secret and uri', async () => {
      const res = await generateTotpSecret('employee@company.com');
      expect(res.base32).toBeDefined();
      expect(res.base32.length).toBeGreaterThanOrEqual(16);
      expect(res.otpauth_url).toContain('otpauth://totp/');
      expect(res.qrCode).toContain('data:image/png;base64');
    });

    it('should verify TOTP code generated for a secret', async () => {
      const { base32 } = await generateTotpSecret('test@company.com');
      
      const currentToken = generateSync({ secret: base32 });
      expect(verifyTotp(base32, currentToken)).toBe(true);
      expect(verifyTotp(base32, '000000')).toBe(false);
    });
  });
});
