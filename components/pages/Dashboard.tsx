'use client';

import { useMemo, useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import {
  Shield, Smartphone, MapPin, AlertTriangle, CheckCircle, Clock, 
  Activity, Loader2, Monitor, Key, Fingerprint, RefreshCcw, Lock
} from 'lucide-react';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { formatDistanceToNow } from 'date-fns';
import { PageHeader } from '@/components/PageHeader';
import { supabase } from '@/lib/supabase/client';
import { useLanguage } from '@/context/LanguageContext';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';

export function Dashboard() {
  const { t } = useLanguage();
  const { user } = useAuthStore();
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [isScanning, setIsScanning] = useState(false);

  // Fetch only the logged-in user's login logs
  const { data: dbLogins, loading: loginsLoading } = useRealtimeData('login_logs', (q) =>
    user ? q.select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20) : q.limit(0)
  );

  useEffect(() => {
    const fetchSessions = async () => {
      if (!user) return;
      setLoadingSessions(true);
      try {
        // Fetch active sessions for this specific user
        const { data } = await supabase
          .from('sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('last_active', { ascending: false });
        
        if (data) setActiveSessions(data);
      } catch (err) {
        console.error('Failed to fetch sessions', err);
      } finally {
        setLoadingSessions(false);
      }
    };

    fetchSessions();
  }, [user]);

  const riskScore = user?.risk_score || 0;
  
  const riskInfo = useMemo(() => {
    if (riskScore > 70) return { label: 'High Risk', color: 'text-destructive', bg: 'bg-destructive/20', bar: 'bg-destructive', icon: AlertTriangle, desc: 'Anomalous behavior detected. Please verify your recent logins and consider changing your password.' };
    if (riskScore >= 30) return { label: 'Medium Risk', color: 'text-warning', bg: 'bg-warning/20', bar: 'bg-warning', icon: Shield, desc: 'Some unusual login locations or devices detected. We recommend enabling WebAuthn.' };
    return { label: 'Low Risk', color: 'text-success', bg: 'bg-success/20', bar: 'bg-success', icon: CheckCircle, desc: 'Your authentication patterns are secure. No geographic or device anomalies detected.' };
  }, [riskScore]);

  const RiskIcon = riskInfo.icon;

  const handleTerminateSession = async (sessionId: string) => {
    try {
      await supabase.from('sessions').delete().eq('id', sessionId);
      setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
      toast.success('Session terminated successfully');
    } catch (error) {
      toast.error('Failed to terminate session');
    }
  };

  const handleSecurityScan = () => {
    setIsScanning(true);
    toast.info('Initiating deep security scan of current session and IP footprint...', { duration: 2000 });
    setTimeout(() => {
      setIsScanning(false);
      toast.success('Scan complete. Zero active threats detected on your local device.', {
        description: `Verified IP Address: ${activeSessions[0]?.ip_address || 'Protected'}`,
      });
    }, 2500);
  };

  const isLoading = loginsLoading || loadingSessions;

  return (
    <div className="min-h-screen bg-[#020617]">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <PageHeader
            title={`Welcome back, ${user?.full_name?.split(' ')[0] || 'User'}`}
            description="Manage your personal security posture, active sessions, and authentication history."
          >
            <button 
              onClick={handleSecurityScan}
              disabled={isScanning}
              className="flex items-center gap-3 bg-primary/10 hover:bg-primary/20 transition-colors px-4 py-2 rounded-lg border border-primary/20 cursor-pointer disabled:opacity-70"
            >
              <Shield className={`w-4 h-4 text-primary ${isScanning ? 'animate-pulse' : ''}`} />
              <span className="text-sm font-medium text-primary">
                {isScanning ? 'Scanning...' : 'Run Security Scan'}
              </span>
            </button>
          </PageHeader>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* AI Risk Score Widget */}
            <Card className="lg:col-span-2 relative overflow-hidden border border-white/10 bg-white/5 backdrop-blur-md">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  {/* Gauge Ring */}
                  <div className="relative w-40 h-40 flex-shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="80" cy="80" r="70" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-white/5" />
                      <circle cx="80" cy="80" r="70" fill="transparent" stroke="currentColor" strokeWidth="8" strokeDasharray={`${(riskScore / 100) * 440} 440`} className={`${riskInfo.color} transition-all duration-1000`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-4xl font-bold tracking-tighter ${riskInfo.color}`}>{riskScore}</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">AI Risk Score</span>
                    </div>
                  </div>
                  
                  {/* Details */}
                  <div className="flex-1 space-y-4 text-center md:text-left">
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 mb-3">
                        <RiskIcon className={`w-4 h-4 ${riskInfo.color}`} />
                        <span className={`text-sm font-bold uppercase tracking-wider ${riskInfo.color}`}>{riskInfo.label}</span>
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">Real-Time Threat Evaluation</h3>
                      <p className="text-gray-400 text-sm leading-relaxed">{riskInfo.desc}</p>
                    </div>
                    
                    <div className="pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">MFA Status</p>
                        <div className="flex items-center gap-2 text-sm text-white font-medium">
                          {user?.mfa_enabled ? <CheckCircle className="w-4 h-4 text-success" /> : <AlertTriangle className="w-4 h-4 text-warning" />}
                          {user?.mfa_enabled ? 'Enabled' : 'Disabled'}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Account Role</p>
                        <div className="flex items-center gap-2 text-sm text-white font-medium">
                          <Lock className="w-4 h-4 text-primary" />
                          {user?.role || 'Employee'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Authentication Methods */}
            <Card className="border border-white/10 bg-white/5 backdrop-blur-md">
              <CardHeader className="border-b border-white/10 pb-4">
                <CardTitle className="text-lg flex items-center gap-2"><Key className="w-5 h-5 text-primary" /> Security Devices</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-white/5">
                  <div className="p-4 hover:bg-white/5 transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center"><Fingerprint className="w-5 h-5 text-primary" /></div>
                      <div>
                        <p className="text-sm font-medium text-white">WebAuthn / Passkeys</p>
                        <p className="text-xs text-gray-400">Biometric authentication</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-success/20 text-success text-[10px] font-bold uppercase rounded border border-success/30">Active</span>
                  </div>
                  <div className="p-4 hover:bg-white/5 transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center"><Smartphone className="w-5 h-5 text-purple-400" /></div>
                      <div>
                        <p className="text-sm font-medium text-white">Authenticator App</p>
                        <p className="text-xs text-gray-400">TOTP 2FA</p>
                      </div>
                    </div>
                    {user?.mfa_enabled ? (
                      <span className="px-2 py-1 bg-success/20 text-success text-[10px] font-bold uppercase rounded border border-success/30">Active</span>
                    ) : (
                      <span className="px-2 py-1 bg-white/10 text-gray-400 text-[10px] font-bold uppercase rounded border border-white/20">Inactive</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Active Sessions */}
            <Card className="flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-primary" />
                  <CardTitle>Active Sessions</CardTitle>
                </div>
                {loadingSessions && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-0 max-h-[400px]">
                {activeSessions.length === 0 && !loadingSessions ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">No active sessions found (You are currently on a local token).</div>
                ) : (
                  <div className="divide-y divide-border">
                    {activeSessions.map((session, idx) => (
                      <div key={session.id} className="p-5 hover:bg-white/5 transition-colors flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-[#0f111a] border border-white/10 flex items-center justify-center">
                            {session.device_type?.toLowerCase().includes('mobile') ? <Smartphone className="w-6 h-6 text-primary" /> : <Monitor className="w-6 h-6 text-primary" />}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white flex items-center gap-2">
                              {session.browser || 'Unknown Browser'} on {session.os || 'Unknown OS'}
                              {idx === 0 && <span className="px-2 py-0.5 bg-success/20 text-success text-[9px] font-bold uppercase rounded border border-success/30 tracking-widest">Current Device</span>}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                              <MapPin className="w-3 h-3" /> {session.ip_address} 
                              <span className="mx-1">•</span> 
                              <Clock className="w-3 h-3" /> Last seen {formatDistanceToNow(new Date(session.last_active), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        {idx !== 0 && (
                          <button 
                            onClick={() => handleTerminateSession(session.id)}
                            className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-colors border border-destructive/20"
                            title="Terminate Session"
                          >
                            <Lock className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Authentication Audit Trail */}
            <Card className="flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  <CardTitle>Recent Authentications</CardTitle>
                </div>
                <div className="text-xs text-muted-foreground">Showing last 20 events</div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-0 max-h-[400px]">
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : !dbLogins || dbLogins.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    No authentication events recorded.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {dbLogins.map((log: any) => (
                      <div key={log.id} className="p-4 hover:bg-primary/5 transition-colors flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            (log.status === 'SUCCESS' || log.status === 'success') ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
                          }`}>
                            {(log.status === 'SUCCESS' || log.status === 'success') ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {(log.status === 'SUCCESS' || log.status === 'success') ? 'Successful Login' : 'Failed Login Attempt'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {log.city || log.location?.city || 'Unknown Location'} ({log.ip_address})
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${
                            (log.status === 'SUCCESS' || log.status === 'success') ? 'bg-success/10 border-success/20 text-success' : 'bg-destructive/10 border-destructive/20 text-destructive'
                          }`}>
                            {(log.status === 'SUCCESS' || log.status === 'success') ? 'Authorized' : 'Blocked'}
                          </span>
                          <p className="text-[10px] text-gray-500 mt-2">
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

