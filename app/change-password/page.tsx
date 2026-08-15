'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'ADMIN']);

export default function ChangePasswordPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let resolvedEmail = '';
      const pendingRaw = sessionStorage.getItem('pendingAuthUser');
      if (pendingRaw) {
        try {
          const pending = JSON.parse(pendingRaw);
          if (pending?.email) resolvedEmail = pending.email;
        } catch {
          // Ignore corrupt pending state; fall through to session lookup.
        }
      }
      if (!resolvedEmail) {
        try {
          const res = await fetch('/api/auth/change-password');
          const data = await res.json();
          resolvedEmail = data.user?.email || '';
        } catch {
          // Session lookup is best-effort.
        }
      }
      if (!cancelled && resolvedEmail) setEmail(resolvedEmail);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const requirements = [
    { label: 'At least 12 characters', pass: newPassword.length >= 12 },
    { label: 'One uppercase letter', pass: /[A-Z]/.test(newPassword) },
    { label: 'One lowercase letter', pass: /[a-z]/.test(newPassword) },
    { label: 'One number', pass: /[0-9]/.test(newPassword) },
    { label: 'One special character (!@#$%^&*)', pass: /[^A-Za-z0-9]/.test(newPassword) },
  ];
  const allMet = requirements.every((r) => r.pass);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (!allMet) {
      toast.error('Password does not meet the security requirements');
      return;
    }
    if (newPassword === currentPassword) {
      toast.error('New password must be different from your current password');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');

      toast.success('Password updated successfully');
      if (data.user) setUser(data.user);
      sessionStorage.removeItem('pendingAuthUser');
      sessionStorage.removeItem('pendingAuthToken');
      sessionStorage.removeItem('pendingSecuritySignals');

      const role = String(data.user?.role || '').toUpperCase();
      const isAdmin = ADMIN_ROLES.has(role);
      router.push(isAdmin ? '/admin/dashboard' : '/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a16]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" style={{ animationDelay: '1s' }} />
      </div>

      <Card className="w-full max-w-md relative bg-[#0f0f23] border border-white/10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mb-4 border border-purple-500/30">
            <KeyRound className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">Set a new password</h1>
          <p className="text-gray-400 text-center text-sm">
            For your security, you must change the default password before continuing.
            {email && (
              <span className="block mt-1 text-purple-300 font-semibold">{email}</span>
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-2 text-sm text-gray-300">Current password</label>
            <Input
              type="password"
              placeholder="Default password used to sign in"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              icon={<KeyRound className="w-4 h-4" />}
              autoFocus
            />
          </div>

          <div>
            <label className="block mb-2 text-sm text-gray-300">New password</label>
            <Input
              type="password"
              placeholder="Create a strong new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              icon={<ShieldCheck className="w-4 h-4" />}
            />
          </div>

          <div>
            <label className="block mb-2 text-sm text-gray-300">Confirm new password</label>
            <Input
              type="password"
              placeholder="Re-enter your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              icon={<ShieldCheck className="w-4 h-4" />}
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="mt-1 text-xs text-red-400">Passwords do not match</p>
            )}
          </div>

          <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-1.5">
            <p className="text-xs text-gray-400 mb-1.5 font-semibold">Password requirements</p>
            {requirements.map((req) => (
              <div key={req.label} className="flex items-center gap-2 text-xs">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  req.pass ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-gray-500'
                }`}>
                  {req.pass ? '✓' : '•'}
                </span>
                <span className={req.pass ? 'text-emerald-300' : 'text-gray-400'}>{req.label}</span>
              </div>
            ))}
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={loading || !allMet || !currentPassword || !confirmPassword}
            className="w-full bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-400 hover:to-purple-600 text-white font-semibold shadow-lg shadow-purple-500/20"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Change password & continue'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
