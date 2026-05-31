import { supabase } from '@/lib/supabase/client';

export class MfaService {
  static async enrollTotp(userId: string): Promise<{ secret: string; qrCodeUrl: string }> {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Authenticator App',
    });

    if (error || !data) throw new Error(error?.message || 'Failed to enroll TOTP');
    return {
      secret: data.totp?.secret || '',
      qrCodeUrl: data.totp?.qr_code || '',
    };
  }

  static async verifyTotp(userId: string, factorId: string, code: string): Promise<boolean> {
    const { data, error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });
    if (error) return false;
    return !!data;
  }

  static async sendEmailOtp(email: string): Promise<void> {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (error) throw new Error(error.message);
  }

  static async verifyEmailOtp(email: string, otp: string): Promise<boolean> {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    });
    if (error) return false;
    return !!data.user;
  }

  static async generateRecoveryCodes(): Promise<string[]> {
    const codes = Array.from({ length: 8 }, () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 12; i++) {
        if (i > 0 && i % 4 === 0) code += '-';
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      return code;
    });
    return codes;
  }
}
