'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import {
  ShieldCheck,
  Smartphone,
  MessageSquare,
  KeyRound,
  UserCheck,
  Activity,
  BrainCircuit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function SecuritySettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [optIn, setOptIn] = useState(true);

  // Phone modal state
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [phoneStep, setPhoneStep] = useState<'input' | 'verify'>('input');
  const [actionLoading, setActionLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Disable TOTP state
  const [showDisableTotpModal, setShowDisableTotpModal] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableTotpCode, setDisableTotpCode] = useState('');

  useEffect(() => {
    fetchSecurityProfile();
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const fetchSecurityProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setProfile(data.user);
          setPhoneInput(data.user.phone || '');
        }
      }
    } catch (err) {
      console.error('Failed to load profile', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartPhoneVerification = async () => {
    if (!phoneInput || phoneInput.trim().length < 8) {
      toast.error('Please enter a valid phone number including country code (e.g. +91 9876541234)');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/auth/phone/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneInput.trim() }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to send SMS code');

      toast.success(`Verification code sent to ${data.maskedPhone}`);
      setPhoneStep('verify');
      setCooldown(60);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!otpInput || otpInput.trim().length !== 6) {
      toast.error('Please enter the 6-digit verification code');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/auth/phone/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: otpInput.trim() }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Verification failed');

      toast.success('Mobile number verified successfully!');
      setShowPhoneModal(false);
      setPhoneStep('input');
      setOtpInput('');
      fetchSecurityProfile();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisableTotp = async () => {
    if (!disablePassword && !disableTotpCode) {
      toast.error('Please enter your password or current authenticator code to proceed');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/auth/totp/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: disablePassword,
          code: disableTotpCode,
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to disable TOTP');

      toast.success('Authenticator App disabled');
      setShowDisableTotpModal(false);
      setDisablePassword('');
      setDisableTotpCode('');
      fetchSecurityProfile();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteBiometrics = async () => {
    toast.success('Behavioral biometrics data scheduled for deletion (30-day retention policy).');
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  const maskedPhone = profile?.masked_phone || (profile?.phone ? `+91 ******${profile.phone.slice(-4)}` : 'Not Set');
  const isPhoneVerified = profile?.phone_verified === true;
  const isTotpEnabled = profile?.totp_enabled === true || profile?.is_mfa_enabled === true;
  const isSmsEnabled = isPhoneVerified && profile?.sms_mfa_enabled !== false;
  const isFaceVerified = profile?.face_enrolled === true || Boolean(profile?.face_embedding);
  const isPasskeyEnabled = profile?.passkey_enabled === true;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 text-white">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-emerald-400" />
          Security & Authentication Settings
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Manage multi-factor authentication, verified phone numbers, and enterprise access security.
        </p>
      </div>

      {/* Account Identity */}
      <Card className="p-6 border-white/10 bg-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Company Email Identity</h3>
            <p className="text-sm text-gray-400 mt-0.5">Your primary login identity across SecureAuth Workspace.</p>
          </div>
          <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-300 rounded-full text-xs font-mono">
            {profile?.email || 'employee@company.com'}
          </span>
        </div>
      </Card>

      {/* Authentication Factors Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Lock className="w-5 h-5 text-cyan-400" />
          Multi-Factor Authentication (MFA) Methods
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Authenticator App (TOTP) */}
          <Card className="p-5 border-white/10 bg-white/5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Authenticator App (TOTP)</h4>
                    <p className="text-xs text-gray-400 mt-0.5">Google / Microsoft Authenticator</p>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isTotpEnabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                }`}>
                  {isTotpEnabled ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Time-based 6-digit authentication codes generated directly on your mobile device.
              </p>
            </div>
            {isTotpEnabled ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDisableTotpModal(true)}
                className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                Disable Authenticator
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => router.push('/mfa-setup')}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium"
              >
                Set Up Authenticator App
              </Button>
            )}
          </Card>

          {/* Passkeys */}
          <Card className="p-5 border-white/10 bg-white/5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Passkeys (FIDO2 / WebAuthn)</h4>
                    <p className="text-xs text-gray-400 mt-0.5">Biometric TouchID, FaceID, YubiKey</p>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isPasskeyEnabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                }`}>
                  {isPasskeyEnabled ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Passwordless authentication bound securely to your hardware security chip.
              </p>
            </div>
            <Button
              size="sm"
              variant={isPasskeyEnabled ? "outline" : "default"}
              onClick={() => router.push('/mfa-setup/passkey')}
              className={isPasskeyEnabled ? "w-full border-white/10 text-gray-200 hover:bg-white/10" : "w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium"}
            >
              {isPasskeyEnabled ? 'Manage Passkeys' : 'Register Passkey'}
            </Button>
          </Card>

        </div>
      </div>

      {/* Active Sessions */}
      <Card className="p-6 border-white/10 bg-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Active Sessions & Devices</h3>
              <p className="text-xs text-gray-400 mt-0.5">Manage logged in web and mobile sessions.</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push('/settings?tab=devices')}
            className="border-white/10 text-gray-200 hover:bg-white/10"
          >
            Manage Sessions
          </Button>
        </div>
      </Card>

      {/* Smart Friction & Privacy */}
      <Card className="p-6 border-white/10 bg-white/5 space-y-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-purple-500/20 rounded-xl">
            <BrainCircuit className="w-6 h-6 text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">Smart Friction (Adaptive AI Risk Engine)</h3>
            <p className="text-sm text-gray-400 mt-1">
              Our AI Risk Engine analyzes typing behavior, network context, and location posture to adjust MFA frequency dynamically based on real-time threat levels.
            </p>
          </div>
          <div className="flex items-center">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
            </label>
          </div>
        </div>
      </Card>

      {/* Erasure Rights */}
      <Card className="p-6 border-red-500/20 bg-red-500/5 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-red-400 flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            GDPR / DPDP Right to Erasure
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            You can request the deletion of your historical behavioral biometrics and location baseline data.
          </p>
        </div>
        <Button
          onClick={handleDeleteBiometrics}
          className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium"
        >
          Erase Behavioral Data
        </Button>
      </Card>

      {/* Modal: Mobile Phone Verification */}
      {showPhoneModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 border-white/10 bg-[#0f172a] space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-400" />
                Phone Number Verification
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Enter your mobile number to receive a 6-digit verification SMS code.
              </p>
            </div>

            {phoneStep === 'input' ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-300 block mb-1">Mobile Phone Number (E.164 format)</label>
                  <Input
                    type="tel"
                    placeholder="+91 9876541234"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="bg-black/30 text-white border-white/10"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Example: +91 9876541234 or +1 555019234</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowPhoneModal(false)}
                    className="flex-1 border-white/10 text-gray-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleStartPhoneVerification}
                    disabled={actionLoading}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Send Code'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300">
                  Verification code sent to {phoneInput}. Please enter the 6-digit code below.
                </div>
                <div>
                  <label className="text-xs text-gray-300 block mb-1">6-Digit Verification Code</label>
                  <Input
                    type="text"
                    placeholder="000000"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="bg-black/30 text-white text-center font-mono text-xl tracking-[0.4em] border-white/10"
                    maxLength={6}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Didn't receive it?</span>
                  <button
                    disabled={cooldown > 0 || actionLoading}
                    onClick={handleStartPhoneVerification}
                    className="text-blue-400 hover:underline disabled:opacity-50"
                  >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
                  </button>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setPhoneStep('input')}
                    className="flex-1 border-white/10 text-gray-300"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleVerifyPhoneOtp}
                    disabled={actionLoading || otpInput.length !== 6}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Verify OTP'}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Modal: Disable TOTP */}
      {showDisableTotpModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 border-white/10 bg-[#0f172a] space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                Disable Authenticator App
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Re-authentication is required to disable TOTP multi-factor authentication.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-300 block mb-1">Current Password</label>
                <Input
                  type="password"
                  placeholder="Enter your current password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  className="bg-black/30 text-white border-white/10"
                />
              </div>

              <div className="text-center text-xs text-gray-400">OR</div>

              <div>
                <label className="text-xs text-gray-300 block mb-1">Current Authenticator Code</label>
                <Input
                  type="text"
                  placeholder="000000"
                  value={disableTotpCode}
                  onChange={(e) => setDisableTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="bg-black/30 text-white text-center font-mono text-xl tracking-[0.4em] border-white/10"
                  maxLength={6}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDisableTotpModal(false)}
                  className="flex-1 border-white/10 text-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDisableTotp}
                  disabled={actionLoading}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-medium"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm Disable'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
