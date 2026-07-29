'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { 
  User, 
  Mail, 
  Shield, 
  Key, 
  Fingerprint, 
  Smartphone, 
  Globe, 
  Clock,
  CheckCircle,
  Camera,
  Loader2,
  Upload,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useBiometrics } from '@/hooks/useBiometrics';
import { useRealtimeData } from '@/hooks/useRealtimeData';

export function UserProfile() {
  const { user, setUser } = useAuthStore();
  const { data: dbLogins, loading: loginsLoading } = useRealtimeData('login_logs', (q) => 
    q.select('*').eq('user_id', user?.id || '').order('created_at', { ascending: false }).limit(5)
  );
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const { registerBiometrics } = useBiometrics();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();
      if (data) setProfile(data);
    } catch {}
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user?.id}/profile.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      await (supabase.from('users') as any).update({ avatar_url: publicUrl }).eq('id', user?.id);

      setProfile((prev: any) => ({ ...prev, avatar_url: publicUrl }));
      setUser({ ...user!, avatar_url: publicUrl });
      toast.success('Profile image updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const displayLogins = useMemo(() => {
    if (!dbLogins || dbLogins.length === 0) return [];
    return dbLogins.map((l: any) => ({
      location: `${l.city || 'Unknown'}, ${l.country || 'XX'}`,
      time: new Date(l.created_at).toLocaleString(),
      browser: l.user_agent?.split(' ')[0] || l.browser || 'Browser',
      os: l.os || '',
      status: l.status?.toLowerCase() || 'unknown',
    }));
  }, [dbLogins]);

  const handleRegisterBiometrics = async () => {
    setLoading(true);
    try {
      const success = await registerBiometrics(user?.email || '');
      if (success) {
        toast.success('Biometric device registered');
        await (supabase.from('users') as any).update({ biometric_enabled: true }).eq('id', user?.id);
        setProfile((prev: any) => ({ ...prev, biometric_enabled: true }));
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const avatarUrl = profile?.avatar_url || user?.avatar_url;

  return (
    <div className="min-h-screen bg-[#020617] text-white overflow-y-auto">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-semibold mb-2">User Profile</h1>
            <p className="text-muted-foreground">Manage your identity and security settings</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-6 mb-6">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center overflow-hidden">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-10 h-10 text-white" />
                        )}
                      </div>
                      <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                        {uploadingImage ? (
                          <Loader2 className="w-6 h-6 animate-spin text-white" />
                        ) : (
                          <Camera className="w-6 h-6 text-white" />
                        )}
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">{profile?.full_name || user?.first_name + ' ' + user?.last_name || 'User'}</h3>
                      <p className="text-sm text-muted-foreground">{profile?.role || user?.role || 'Employee'}</p>
                      {profile?.employee_id && (
                        <p className="text-xs text-muted-foreground mt-1">ID: {profile.employee_id}</p>
                      )}
                      {profile?.department && (
                        <p className="text-xs text-muted-foreground">Dept: {profile.department}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Full Name</label>
                      <Input 
                        placeholder="John Doe" 
                        defaultValue={profile?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`}
                        icon={<User className="w-4 h-4" />}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email Address</label>
                      <Input 
                        placeholder="user@gmail.com" 
                        defaultValue={user?.email || ''} 
                        disabled
                        icon={<Mail className="w-4 h-4" />}
                      />
                    </div>
                  </div>
                  <Button>Update Profile</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Fingerprint className="w-5 h-5 text-primary" />
                    Biometric Authentication
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <Shield className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Zero-Trust Biometrics</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Register your device's biometric sensors (TouchID, FaceID, or Windows Hello) for secure passwordless verification when suspicious activity is detected.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-input-background/30 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <Fingerprint className={`w-8 h-8 ${profile?.biometric_enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div>
                        <p className="text-sm font-medium">Main Device Biometrics</p>
                        <p className="text-xs text-muted-foreground">
                          {profile?.biometric_enabled ? 'Registered' : 'Not yet registered'}
                        </p>
                      </div>
                    </div>
                    <Button onClick={handleRegisterBiometrics} disabled={loading || profile?.biometric_enabled}>
                      {loading ? 'Processing...' : profile?.biometric_enabled ? 'Registered' : 'Register Device'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account Security</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Account Status</span>
                    <span className="text-primary font-medium">
                      {profile?.status || 'Active'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">MFA Status</span>
                    <span className={`font-medium flex items-center gap-1 ${profile?.is_mfa_enabled ? 'text-success' : 'text-muted-foreground'}`}>
                      {profile?.is_mfa_enabled ? <CheckCircle className="w-3 h-3" /> : null}
                      {profile?.is_mfa_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Biometrics</span>
                    <span className={`font-medium ${profile?.biometric_enabled ? 'text-success' : 'text-muted-foreground'}`}>
                      {profile?.biometric_enabled ? 'Registered' : 'Not Set Up'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Recent Login History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loginsLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                  ) : displayLogins.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No login history yet</p>
                  ) : (
                    displayLogins.map((login, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-input-background flex items-center justify-center shrink-0">
                          <Globe className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{login.location}</p>
                          <p className="text-[10px] text-muted-foreground">{login.time}</p>
                        </div>
                        <div className={`w-2 h-2 rounded-full mt-1.5 ${login.status === 'success' ? 'bg-success' : 'bg-destructive'}`} />
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
